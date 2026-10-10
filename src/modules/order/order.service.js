const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllOrders = async () => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, email: true } },
    },
  });

  return orders;
};

const getOrderDetail = async (id) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true } },
      orderDetails: true,
    },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.status = 404;
    throw error;
  }

  return order;
};

const updateOrderStatus = async (id, data) => {
  // 1. Kéo đơn hàng lên trước để đối chiếu
  const order = await getOrderDetail(id);

  // 2. Kiểm tra nghiệp vụ: READY_FOR_PICKUP chỉ dành cho đơn lấy tại cửa hàng
  if (
    data.orderStatus === "READY_FOR_PICKUP" &&
    order.deliveryType !== "PICKUP"
  ) {
    const error = new Error(
      "Trạng thái Chờ nhận tại cửa hàng chỉ áp dụng cho đơn PICKUP",
    );
    error.status = 400; // Bad Request
    throw error;
  }

  // 3. Hợp lệ thì tiến hành cập nhật DB
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: data,
  });

  return updatedOrder;
};

const updatePaymentStatus = async (id, paymentStatus) => {
  // Kéo lên để đảm bảo ID có thật
  await getOrderDetail(id);

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { paymentStatus },
  });

  return updatedOrder;
};

// ==========================================
// NHÓM 2: DÀNH CHO CUSTOMER
// ==========================================

const createOrder = async (customerId, data) => {
  // Dùng transaction để đảm bảo toàn vẹn dữ liệu: Tính tiền -> Tạo đơn -> Xóa giỏ hàng
  return await prisma.$transaction(async (tx) => {
    // 1. Kiểm tra giỏ hàng của user
    const cart = await tx.cart.findUnique({
      where: { userId: customerId },
      include: {
        cartItems: {
          include: {
            variant: { include: { product: true } },
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      const error = new Error("Giỏ hàng của bạn đang trống");
      error.status = 400;
      throw error;
    }

    // 2. Tính toán tiền từ DB để chống fake giá từ frontend
    let totalAmount = 0;
    const orderDetailsData = [];

    for (const item of cart.cartItems) {
      const variant = item.variant;
      const unitPrice = variant.price;
      const subTotal = unitPrice * item.quantity;
      totalAmount += subTotal;

      orderDetailsData.push({
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        classification: variant.variantName,
        unitPrice: unitPrice,
        quantity: item.quantity,
        subTotal: subTotal,
      });
    }

    // Cộng phí ship (giả sử shipping = 50k, pickup = 0)
    const shippingFee = data.deliveryType === "SHIPPING" ? 50000 : 0;
    totalAmount += shippingFee;

    // 3 & 4. Tạo Order và Snapshot vào OrderDetail
    const orderCode = `ORD-${Date.now()}`;
    const newOrder = await tx.order.create({
      data: {
        orderCode: orderCode,
        customerId: customerId,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        deliveryType: data.deliveryType,
        deliveryAddress: data.deliveryAddress,
        paymentMethod: data.paymentMethod,
        shippingFee: shippingFee,
        totalAmount: totalAmount,
        orderDetails: {
          create: orderDetailsData,
        },
      },
      include: { orderDetails: true },
    });

    // 5. Xóa sạch item trong giỏ hàng (giữ lại vỏ Cart)
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Trả về đơn hàng vừa tạo
    return newOrder;
  });
};

const getMyOrders = async (customerId, query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const total = await prisma.order.count({ where: { customerId } });

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getMyOrderDetail = async (id, customerId) => {
  const order = await prisma.order.findFirst({
    where: { id, customerId },
    include: { orderDetails: true },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.status = 404;
    throw error;
  }

  return order;
};

const cancelMyOrder = async (id, customerId) => {
  const order = await getMyOrderDetail(id, customerId);

  // Logic chặn: Tàm thời chỉ cho phép hủy khi đang PENDING tương lai có duyệt hủy đơn ở status khác
  if (order.orderStatus !== "PENDING") {
    const error = new Error(
      "Bạn chỉ có thể hủy đơn hàng khi trạng thái là Chờ xác nhận (PENDING)",
    );
    error.status = 400;
    throw error;
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      orderStatus: "CANCELED",
      cancelReason: "Khách hàng tự hủy đơn",
    },
  });

  // Tương lai: Gọi hàm cộng lại tồn kho ở đây

  return updatedOrder;
};

module.exports = {
  // Admin
  getAllOrders,
  getOrderDetail,
  updateOrderStatus,
  updatePaymentStatus,
  // Customer
  createOrder,
  getMyOrders,
  getMyOrderDetail,
  cancelMyOrder,
};

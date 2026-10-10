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
// DÀNH CHO KHÁCH HÀNG (CUSTOMER)
// ==========================================
const getMyOrders = async (userId, query = {}) => {
  const { search, orderStatus, paymentStatus } = query;
  const where = { customerId: userId };

  if (orderStatus) {
    where.orderStatus = orderStatus;
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  // Tìm kiếm theo mã đơn hàng HOẶC tên món hàng đã mua
  if (search && search.trim() !== "") {
    const keyword = search.trim();
    where.OR = [
      { orderCode: { contains: keyword, mode: "insensitive" } },
      {
        orderDetails: {
          some: {
            productName: { contains: keyword, mode: "insensitive" },
          },
        },
      },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      orderDetails: {
        include: {
          variant: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return orders;
};

const getMyOrderDetail = async (userId, orderId) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: userId, // Chỉ cho phép xem đơn của chính mình
    },
    include: {
      orderDetails: {
        include: {
          variant: {
            include: {
              images: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.status = 404;
    throw error;
  }

  return order;
};

module.exports = {
  getAllOrders,
  getOrderDetail,
  updateOrderStatus,
  updatePaymentStatus,
  getMyOrders,
  getMyOrderDetail,
};

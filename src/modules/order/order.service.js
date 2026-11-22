const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllOrders = async () => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, email: true } },
      orderDetails: {
        include: {
          product: { select: { id: true, name: true, isReturnable: true } },
          variant: {
            include: {
              images: {
                orderBy: [
                  { isPrimary: "desc" },
                  { displayOrder: "asc" },
                ],
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

const getOrderDetail = async (id) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true } },
      orderDetails: {
        include: {
          product: { select: { id: true, name: true, isReturnable: true } },
          variant: {
            include: {
              images: {
                orderBy: [
                  { isPrimary: "desc" },
                  { displayOrder: "asc" },
                ],
                take: 1,
              },
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

const updateOrderStatus = async (id, data) => {
  // 1. Kéo đơn hàng lên trước để đối chiếu
  const order = await getOrderDetail(id);

  // Terminal state: Không cho phép đổi trạng thái nếu đơn đã COMPLETED hoặc CANCELED
  if (order.orderStatus === "COMPLETED" || order.orderStatus === "CANCELED") {
    const error = new Error(
      `Đơn hàng đã ở trạng thái ${order.orderStatus === "COMPLETED" ? "Đã hoàn thành" : "Đã hủy"}, không thể thay đổi trạng thái nữa`
    );
    error.status = 400;
    throw error;
  }

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

  // 3. Tự động gán mốc thời gian chuyển đổi tương ứng nếu chưa có
  const updateData = { ...data };
  if (data.orderStatus === "SHIPPING" && !order.shippedAt) {
    updateData.shippedAt = new Date();
  } else if (data.orderStatus === "COMPLETED") {
    if (!order.completedAt) {
      updateData.completedAt = new Date();
    }
    // Nghiệp vụ: Giao hàng thành công / nhận tại showroom -> Tự động đánh dấu PAID
    updateData.paymentStatus = "PAID";
  } else if (data.orderStatus === "CANCELED" && !order.canceledAt) {
    updateData.canceledAt = new Date();
  }

  // 4. Hợp lệ thì tiến hành cập nhật DB
  return await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: updateData,
    });

    // Nếu đơn hàng bị hủy (CANCELED), hoàn trả tồn kho nếu trước đó chưa ở trạng thái CANCELED
    if (data.orderStatus === "CANCELED" && order.orderStatus !== "CANCELED") {
      if (order.orderDetails && order.orderDetails.length > 0) {
        for (const detail of order.orderDetails) {
          if (detail.variantId) {
            await tx.productVariant.update({
              where: { id: detail.variantId },
              data: {
                stockQuantity: {
                  increment: detail.quantity,
                },
              },
            });
          }
        }
      }
    }

    return updatedOrder;
  });
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

    // 2. Kiểm tra tồn kho & Tính toán tiền từ DB để chống fake giá từ frontend
    let totalAmount = 0;
    const orderDetailsData = [];

    for (const item of cart.cartItems) {
      const variant = item.variant;
      if (!variant) {
        const error = new Error("Phân loại sản phẩm không tồn tại");
        error.status = 404;
        throw error;
      }

      // Kiểm tra tồn kho nghiêm ngặt
      if (variant.stockQuantity < item.quantity || variant.stockQuantity <= 0) {
        const error = new Error(
          `Tác phẩm '${variant.product.name}' chỉ còn ${variant.stockQuantity} sản phẩm trong kho, không đủ số lượng để đặt hàng.`
        );
        error.status = 400;
        throw error;
      }

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
    // Nếu phương thức thanh toán là Online (PAYOS) thì ghi nhận PAID, còn lại (COD) là UNPAID
    const initialPaymentStatus = data.paymentMethod === "PAYOS" ? "PAID" : "UNPAID";
    const newOrder = await tx.order.create({
      data: {
        orderCode: orderCode,
        customerId: customerId,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        deliveryType: data.deliveryType,
        deliveryAddress: data.deliveryAddress,
        paymentMethod: data.paymentMethod,
        paymentStatus: initialPaymentStatus,
        shippingFee: shippingFee,
        totalAmount: totalAmount,
        orderDetails: {
          create: orderDetailsData,
        },
      },
      include: { orderDetails: true },
    });

    // 5. Cập nhật giảm tồn kho cho từng biến thể một cách an toàn (Atomic decrement)
    for (const item of cart.cartItems) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    // 5. Tự động lưu địa chỉ giao hàng vào Sổ địa chỉ (UserAddress) nếu chưa tồn tại
    if (data.deliveryType === "SHIPPING" && data.deliveryAddress && data.deliveryAddress.trim()) {
      try {
        const trimmedAddress = data.deliveryAddress.trim();
        const existingAddress = await tx.userAddress.findFirst({
          where: {
            userId: customerId,
            addressDetail: trimmedAddress,
          },
        });

        if (!existingAddress) {
          const count = await tx.userAddress.count({
            where: { userId: customerId },
          });

          await tx.userAddress.create({
            data: {
              userId: customerId,
              receiverName: data.receiverName || "Quý khách",
              receiverPhone: data.receiverPhone || "",
              addressDetail: trimmedAddress,
              isDefault: count === 0, // Địa chỉ đầu tiên sẽ là mặc định
            },
          });
        }
      } catch (addrErr) {
        console.warn("Không thể tự động lưu UserAddress khi tạo đơn:", addrErr?.message);
      }
    }

    // 6. Xóa sạch item trong giỏ hàng (giữ lại vỏ Cart)
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Trả về đơn hàng vừa tạo
    return newOrder;
  });
};

const getMyOrders = async (userId, query = {}) => {
  const { search, orderStatus, paymentStatus } = query;

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(query.limit, 10) || 10, 1);
  const skip = (page - 1) * limit;

  const where = { customerId: userId };

  if (orderStatus) {
    where.orderStatus = orderStatus;
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (search && search.trim() !== "") {
    const keyword = search.trim();

    where.OR = [
      {
        orderCode: {
          contains: keyword,
          mode: "insensitive",
        },
      },
      {
        orderDetails: {
          some: {
            productName: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        orderDetails: {
          include: {
            product: { select: { id: true, name: true, isReturnable: true } },
            review: true,
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
    }),
    prisma.order.count({ where }),
  ]);

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

const getMyOrderDetail = async (userId, orderId) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: userId,
    },
    include: {
      orderDetails: {
        include: {
          product: { select: { id: true, name: true, isReturnable: true } },
          review: true,
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

const cancelMyOrder = async (id, customerId) => {
  const order = await getMyOrderDetail(customerId, id);

  // Logic chặn: Tàm thời chỉ cho phép hủy khi đang PENDING tương lai có duyệt hủy đơn ở status khác
  if (order.orderStatus !== "PENDING") {
    const error = new Error(
      "Bạn chỉ có thể hủy đơn hàng khi trạng thái là Chờ xác nhận (PENDING)",
    );
    error.status = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        orderStatus: "CANCELED",
        cancelReason: "Khách hàng tự hủy đơn",
        canceledAt: new Date(),
      },
    });

    // Cộng hoàn trả lại số lượng tồn kho tương ứng
    if (order.orderDetails && order.orderDetails.length > 0) {
      for (const detail of order.orderDetails) {
        if (detail.variantId) {
          await tx.productVariant.update({
            where: { id: detail.variantId },
            data: {
              stockQuantity: {
                increment: detail.quantity,
              },
            },
          });
        }
      }
    }

    return updatedOrder;
  });
};

// ==========================================
// THỐNG KÊ TỔNG QUAN HỆ THỐNG (DASHBOARD STATS)
// ==========================================
const getDashboardStats = async () => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [
    totalOrders,
    pendingOrders,
    shippingOrders,
    pickupOrders,
    completedOrders,
    revenueThisWeekAgg,
    refundThisWeekAgg,
    totalProducts,
    activeProducts,
    totalCategories,
    totalReviews,
    totalUsers,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: "PENDING" } }),
    prisma.order.count({ where: { orderStatus: "SHIPPING" } }),
    prisma.order.count({ where: { deliveryType: "PICKUP" } }),
    prisma.order.count({ where: { orderStatus: "COMPLETED" } }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: oneWeekAgo },
        OR: [
          { orderStatus: "COMPLETED" },
          { paymentStatus: "PAID" },
        ],
      },
    }),
    prisma.refund.aggregate({
      _sum: { refundAmount: true },
      where: {
        createdAt: { gte: oneWeekAgo },
      },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.review.count(),
    prisma.user.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        receiverName: true,
        totalAmount: true,
        orderStatus: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
  ]);

  const grossRevenue = revenueThisWeekAgg._sum?.totalAmount || 0;
  const totalRefunded = refundThisWeekAgg._sum?.refundAmount || 0;
  const netRevenue = Math.max(0, grossRevenue - totalRefunded);

  return {
    revenueThisWeek: netRevenue,
    grossRevenueThisWeek: grossRevenue,
    refundThisWeek: totalRefunded,
    totalOrders,
    completedOrders,
    pendingOrders,
    shippingOrders,
    pickupOrders,
    totalProducts,
    activeProducts,
    totalCategories,
    totalReviews,
    totalUsers,
    recentOrders,
  };
};

module.exports = {
  // Admin
  getAllOrders,
  getOrderDetail,
  updateOrderStatus,
  updatePaymentStatus,
  getDashboardStats,
  // Customer
  createOrder,
  getMyOrders,
  getMyOrderDetail,
  cancelMyOrder,
};

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAdminOrders = async () => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, email: true } },
    },
  });

  return orders;
};

const getAdminOrderById = async (id) => {
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

const updateAdminOrderStatus = async (id, data) => {
  // 1. Kéo đơn hàng lên trước để đối chiếu
  const order = await getAdminOrderById(id);

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

const updateAdminPaymentStatus = async (id, paymentStatus) => {
  // Kéo lên để đảm bảo ID có thật
  await getAdminOrderById(id);

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { paymentStatus },
  });

  return updatedOrder;
};

module.exports = {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  updateAdminPaymentStatus,
};

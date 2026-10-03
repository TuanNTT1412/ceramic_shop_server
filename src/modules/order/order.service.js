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

module.exports = {
  getAdminOrders,
  getAdminOrderById,
};

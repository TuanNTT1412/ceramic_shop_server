const orderService = require("./order.service");

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAllOrders();

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

const getOrderDetail = async (req, res, next) => {
  try {
    const order = await orderService.getOrderDetail(req.params.id);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.body,
    );
    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    const order = await orderService.updatePaymentStatus(
      req.params.id,
      paymentStatus,
    );
    res.status(200).json({
      success: true,
      message: "Cập nhật thanh toán thành công",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DÀNH CHO KHÁCH HÀNG (CUSTOMER)
// ==========================================
const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const orders = await orderService.getMyOrders(userId, req.query);

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

const getMyOrderDetail = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const order = await orderService.getMyOrderDetail(
      userId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderDetail,
  updateOrderStatus,
  updatePaymentStatus,
  getMyOrders,
  getMyOrderDetail,
};

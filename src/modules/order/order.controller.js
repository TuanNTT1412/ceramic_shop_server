const orderService = require("./order.service");

const getAdminOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAdminOrders();

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminOrderDetails = async (req, res, next) => {
  try {
    const order = await orderService.getAdminOrderById(req.params.id);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateAdminOrderStatus(
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

const updateAdminPaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    const order = await orderService.updateAdminPaymentStatus(
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

module.exports = {
  getAdminOrders,
  getAdminOrderDetails,
  updateAdminOrderStatus,
  updateAdminPaymentStatus,
};

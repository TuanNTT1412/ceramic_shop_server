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

module.exports = {
  getAdminOrders,
  getAdminOrderDetails,
};

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


const createOrder = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    
    // Ném xuống Service để xử lý tạo đơn, truyền payload sạch từ Zod (req.body)
    const order = await orderService.createOrder(customerId, req.body);
    
    // Trả về kèm chuỗi giả lập link PayOS nếu phương thức là PAYOS
    let checkoutUrl = null;
    if (req.body.paymentMethod === "PAYOS") {
      checkoutUrl = `https://pay.payos.vn/mock-checkout-link-${order.id}`;
    }

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: {
        order,
        checkoutUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const orders = await orderService.getMyOrders(customerId);
    
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
    const customerId = req.user.id;
    const order = await orderService.getMyOrderDetail(req.params.id, customerId);
    
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const cancelMyOrder = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const order = await orderService.cancelMyOrder(req.params.id, customerId);
    
    res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công",
      data: order,
    });
  } catch (error) {
    next(error);
  }
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

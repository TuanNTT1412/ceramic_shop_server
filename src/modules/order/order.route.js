const express = require("express");
const orderController = require("./order.controller");
const validate = require("../../middlewares/validate.middleware");
const orderValidation = require("./order.validation");
const { authenticate, authorize } = require("../../middlewares/auth.middleware");
const { Role } = require("@prisma/client");

const router = express.Router();

// ==========================================
// NHÓM 1: DÀNH CHO ADMIN & STAFF
// ==========================================
const adminAuth = [authenticate, authorize(Role.STAFF, Role.ADMIN)];

router.get("/admin", adminAuth, orderController.getAllOrders);
router.get("/admin/:id", adminAuth, orderController.getOrderDetail);

router.patch(
  "/admin/:id/status",
  adminAuth,
  validate(orderValidation.updateOrderStatusSchema),
  orderController.updateOrderStatus,
);

router.patch(
  "/admin/:id/payment",
  adminAuth,
  validate(orderValidation.updatePaymentStatusSchema),
  orderController.updatePaymentStatus,
);

// ==========================================
// NHÓM 2: DÀNH CHO CUSTOMER (KHÁCH HÀNG)
// ==========================================
const customerAuth = [authenticate, authorize(Role.CUSTOMER)];

// Khách hàng đặt đơn mới
router.post(
  "/",
  customerAuth,
  validate(orderValidation.createOrderSchema),
  orderController.createOrder
);

// Khách hàng xem danh sách đơn của mình
router.get("/", customerAuth, orderController.getMyOrders);

// Khách hàng xem chi tiết 1 đơn của mình
router.get("/:id", customerAuth, orderController.getMyOrderDetail);

// Khách hàng tự hủy đơn
router.patch("/:id/cancel", customerAuth, orderController.cancelMyOrder);

module.exports = router;

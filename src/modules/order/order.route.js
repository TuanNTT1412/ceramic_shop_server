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
// NHÓM 2: DÀNH CHO KHÁCH HÀNG (CUSTOMER)
// ==========================================
router.get("/my-orders", authenticate, orderController.getMyOrders);
router.get("/my-orders/:id", authenticate, orderController.getMyOrderDetail);

module.exports = router;

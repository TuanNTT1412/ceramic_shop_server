const express = require("express");
const orderController = require("./order.controller");

const validate = require("../../middlewares/validate.middleware");
const orderValidation = require("./order.validation");

const router = express.Router();

router.get("/", orderController.getAdminOrders);
router.get("/:id", orderController.getAdminOrderDetails);

router.patch(
  "/:id/status",
  validate(orderValidation.updateOrderStatusSchema),
  orderController.updateAdminOrderStatus,
);
// PATCH: Cập nhật Thanh toán
router.patch(
  "/:id/payment",
  validate(orderValidation.updatePaymentStatusSchema),
  orderController.updateAdminPaymentStatus,
);

module.exports = router;

const express = require("express");
const rateLimit = require("express-rate-limit");
const authRoute = require("../modules/auth/auth.route");
const adminOrderRoute = require("../modules/order/order.admin.route");

const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Quá nhiều request, thử lại sau" },
});

router.use("/auth", authLimiter, authRoute);
router.use(
  "/admin/orders",
  authenticate,
  authorize("STAFF", "ADMIN"),
  adminOrderRoute,
);

module.exports = router;

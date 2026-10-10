const express = require("express");
const rateLimit = require("express-rate-limit");
const authRoute = require("../modules/auth/auth.route");
const orderRoute = require("../modules/order/order.route");
const productRoute = require("../modules/product/product.route");
const categoryRoute = require("../modules/category/category.route");
const cartRoute = require("../modules/cart/cart.route");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Quá nhiều request, thử lại sau" },
});

router.use("/auth", authLimiter, authRoute);
router.use("/orders", orderRoute);
router.use("/products", productRoute);
router.use("/categories", categoryRoute);
router.use("/cart", cartRoute);

module.exports = router;

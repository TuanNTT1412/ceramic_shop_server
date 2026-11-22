const express = require("express");
const rateLimit = require("express-rate-limit");
const authRoute = require("../modules/auth/auth.route");
const orderRoute = require("../modules/order/order.route");
const productRoute = require("../modules/product/product.route");
const categoryRoute = require("../modules/category/category.route");
const cartRoute = require("../modules/cart/cart.route");
const userRoute = require("../modules/user/user.route");
const reviewRoute = require("../modules/review/review.route");
const returnRoute = require("../modules/return/return.route");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Quá nhiều request, thử lại sau" },
});

router.use("/auth", authLimiter, authRoute);
router.use("/users", userRoute);
router.use("/orders", orderRoute);
router.use("/products", productRoute);
router.use("/categories", categoryRoute);
router.use("/cart", cartRoute);
router.use("/reviews", reviewRoute);
router.use("/returns", returnRoute);

module.exports = router;

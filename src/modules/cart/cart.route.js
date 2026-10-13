const express = require("express");
const cartController = require("./cart.controller");
const validate = require("../../middlewares/validate.middleware");
const cartValidation = require("./cart.validation");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = express.Router();

// ROUTE GIỎ HÀNG YÊU CẦU ĐĂNG NHẬP
router.use(authenticate);

// 1. Lấy thông tin giỏ hàng
router.get("/", cartController.getMyCart);

// 2. Thêm sản phẩm vào giỏ
router.post(
    "/items",
    validate(cartValidation.addToCartSchema),
    cartController.addToCart,
);

// 3. Xóa tất cả sản phẩm không khả dụng (đặt trước /items/:itemId)
router.delete("/unavailable", cartController.clearUnavailableCartItems);

// 4. Cập nhật số lượng sản phẩm trong giỏ
router.patch(
    "/items/:itemId",
    validate(cartValidation.updateCartItemSchema),
    cartController.updateCartItem,
);

// 5. Xóa 1 sản phẩm khỏi giỏ
router.delete("/items/:itemId", cartController.removeCartItem);

// 6. Xóa sạch giỏ hàng
router.delete("/", cartController.clearCart);

module.exports = router;

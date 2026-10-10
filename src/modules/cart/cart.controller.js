const cartService = require("./cart.service");

// Helper lấy ID người dùng từ token (hỗ trợ cả req.user.userId và req.user.id)
const getUserId = (req) => req.user.userId || req.user.id;

const getMyCart = async (req, res, next) => {
    try {
        const cart = await cartService.getMyCart(getUserId(req));
        res.status(200).json({
            success: true,
            data: cart,
        });
    } catch (error) {
        next(error);
    }
};

const addToCart = async (req, res, next) => {
    try {
        const item = await cartService.addToCart(getUserId(req), req.body);
        res.status(200).json({
            success: true,
            message: "Thêm sản phẩm vào giỏ hàng thành công",
            data: item,
        });
    } catch (error) {
        next(error);
    }
};

const updateCartItem = async (req, res, next) => {
    try {
        const result = await cartService.updateCartItem(
            getUserId(req),
            req.params.itemId,
            req.body,
        );
        res.status(200).json({
            success: true,
            message: "Cập nhật giỏ hàng thành công",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const removeCartItem = async (req, res, next) => {
    try {
        const result = await cartService.removeCartItem(
            getUserId(req),
            req.params.itemId,
        );
        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

const clearUnavailableCartItems = async (req, res, next) => {
    try {
        const result = await cartService.clearUnavailableCartItems(getUserId(req));
        res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const clearCart = async (req, res, next) => {
    try {
        const result = await cartService.clearCart(getUserId(req));
        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearUnavailableCartItems,
    clearCart,
};

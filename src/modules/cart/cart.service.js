const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

//Tìm hoặc tự động tạo giỏ hàng cho người dùng 
const findOrCreateCart = async (userId) => {
    let cart = await prisma.cart.findUnique({
        where: { userId },
    });

    if (!cart) {
        cart = await prisma.cart.create({
            data: { userId },
        });
    }

    return cart;
};

// 1. LẤY GIỎ HÀNG CỦA NGƯỜI DÙNG HIỆN TẠI
const getMyCart = async (userId) => {
    const cart = await findOrCreateCart(userId);

    const cartWithItems = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: {
            cartItems: {
                orderBy: { createdAt: "desc" },
                include: {
                    variant: {
                        include: {
                            product: true,
                            images: {
                                where: { isPrimary: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });

    let totalPrice = 0;
    let totalItems = 0;
    let totalAvailableItems = 0;

    const items = (cartWithItems.cartItems || []).map((item) => {
        const variant = item.variant;
        const product = variant?.product;
        const isProductActive = product ? product.isActive : false;
        const stock = variant ? variant.stockQuantity : 0;
        const price = variant ? variant.price : 0;
        const primaryImage = variant?.images?.[0]?.imageUrl || null;

        let isAvailable = false;
        let unavailableReason = null;

        if (!product || !isProductActive) {
            isAvailable = false;
            unavailableReason = "INACTIVE"; // Sản phẩm đã ngừng bán hoặc bị ẩn
        } else if (stock === 0) {
            isAvailable = false;
            unavailableReason = "OUT_OF_STOCK"; // Hết hàng trong kho
        } else if (stock < item.quantity) {
            isAvailable = false;
            unavailableReason = "EXCEEDS_STOCK"; // Số lượng trong giỏ vượt quá tồn kho hiện tại
        } else {
            isAvailable = true;
        }

        // Chỉ tính tiền của sản phẩm khả dụng
        const itemTotal = isAvailable ? price * item.quantity : 0;

        if (isAvailable) {
            totalPrice += itemTotal;
            totalAvailableItems += 1;
        }
        totalItems += 1;

        return {
            id: item.id,
            variantId: item.variantId,
            productId: product?.id || null,
            productName: product?.name || "Sản phẩm không tồn tại",
            variantName: variant?.variantName || "Phân loại mặc định",
            price,
            quantity: item.quantity,
            stockQuantity: stock,
            primaryImage,
            itemTotal,
            isAvailable,
            unavailableReason,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    });

    return {
        cartId: cart.id,
        items,
        totalItems,
        totalAvailableItems,
        totalPrice,
    };
};

// 2. THÊM SẢN PHẨM VÀO GIỎ HÀNG
const addToCart = async (userId, data) => {
    const { variantId, quantity = 1 } = data;

    //Kiểm tra biến thể và sản phẩm cha có đang hoạt động không
    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
    });

    if (!variant) {
        const error = new Error("Không tìm thấy phân loại sản phẩm");
        error.status = 404;
        throw error;
    }

    if (!variant.product.isActive) {
        const error = new Error("Sản phẩm đã ngừng kinh doanh hoặc đang bị ẩn");
        error.status = 400;
        throw error;
    }

    const cart = await findOrCreateCart(userId);

    //Kiểm tra sản phẩm đã có trong giỏ chưa để tính tổng số lượng
    const existingItem = await prisma.cartItem.findUnique({
        where: {
            cartId_variantId: {
                cartId: cart.id,
                variantId,
            },
        },
    });

    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQuantity + quantity;

    //Ràng buộc tồn kho
    if (newQuantity > variant.stockQuantity) {
        const error = new Error(
            `Số lượng yêu cầu (${newQuantity}) vượt quá số lượng còn lại trong kho (${variant.stockQuantity})`,
        );
        error.status = 400;
        throw error;
    }

    //Chèn dữ liệu an toàn (cộng dồn nếu đã có, tạo mới nếu chưa)
    const cartItem = await prisma.cartItem.upsert({
        where: {
            cartId_variantId: {
                cartId: cart.id,
                variantId,
            },
        },
        update: {
            quantity: newQuantity,
        },
        create: {
            cartId: cart.id,
            variantId,
            quantity,
        },
        include: {
            variant: {
                include: {
                    product: { select: { id: true, name: true, isActive: true } },
                },
            },
        },
    });

    return cartItem;
};

// 3. CẬP NHẬT SỐ LƯỢNG MÓN HÀNG TRONG GIỎ
const updateCartItem = async (userId, itemId, data) => {
    const { quantity } = data;

    // Kiểm tra quyền sở hữu giỏ hàng
    const item = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: {
            cart: true,
            variant: {
                include: { product: true },
            },
        },
    });

    if (!item || item.cart.userId !== userId) {
        const error = new Error("Không tìm thấy sản phẩm trong giỏ hàng");
        error.status = 404;
        throw error;
    }

    // Nếu số lượng giảm về 0: Tự động xóa khỏi giỏ hàng
    if (quantity <= 0) {
        await prisma.cartItem.delete({
            where: { id: itemId },
        });
        return {
            message: "Đã xóa sản phẩm khỏi giỏ hàng",
            deleted: true,
        };
    }

    // Kiểm tra sản phẩm có bị ẩn không
    if (!item.variant.product.isActive) {
        const error = new Error("Sản phẩm đã ngừng kinh doanh hoặc đang bị ẩn");
        error.status = 400;
        throw error;
    }

    // Kiểm tra tồn kho
    if (quantity > item.variant.stockQuantity) {
        const error = new Error(
            `Số lượng yêu cầu (${quantity}) vượt quá số lượng còn lại trong kho (${item.variant.stockQuantity})`,
        );
        error.status = 400;
        throw error;
    }

    const updatedItem = await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
    });

    return updatedItem;
};

// 4. XÓA 1 MÓN KHỎI GIỎ HÀNG
const removeCartItem = async (userId, itemId) => {
    const item = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: { cart: true },
    });

    if (!item || item.cart.userId !== userId) {
        const error = new Error("Không tìm thấy sản phẩm trong giỏ hàng");
        error.status = 404;
        throw error;
    }

    await prisma.cartItem.delete({
        where: { id: itemId },
    });

    return { message: "Đã xóa sản phẩm khỏi giỏ hàng thành công" };
};

// 5. XÓA TẤT CẢ SẢN PHẨM KHÔNG KHẢ DỤNG KHỎI GIỎ
const clearUnavailableCartItems = async (userId) => {
    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            cartItems: {
                include: {
                    variant: {
                        include: { product: true },
                    },
                },
            },
        },
    });

    if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
        return { deletedCount: 0, message: "Không có sản phẩm nào trong giỏ hàng" };
    }

    // Lọc các item bị ẩn hoặc hết hàng / không đủ hàng
    const unavailableItemIds = cart.cartItems
        .filter((item) => {
            const isInactive = !item.variant?.product?.isActive;
            const isOutOfStock = !item.variant || item.variant.stockQuantity < item.quantity;
            return isInactive || isOutOfStock;
        })
        .map((item) => item.id);

    if (unavailableItemIds.length > 0) {
        await prisma.cartItem.deleteMany({
            where: {
                id: { in: unavailableItemIds },
            },
        });
    }

    return {
        deletedCount: unavailableItemIds.length,
        message: `Đã xóa ${unavailableItemIds.length} sản phẩm không khả dụng khỏi giỏ hàng`,
    };
};

// 6. XÓA TOÀN BỘ GIỎ HÀNG (LÀM TRỐNG GIỎ)
const clearCart = async (userId) => {
    const cart = await prisma.cart.findUnique({
        where: { userId },
    });

    if (cart) {
        await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        });
    }

    return { message: "Đã làm trống giỏ hàng thành công" };
};

module.exports = {
    getMyCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearUnavailableCartItems,
    clearCart,
};



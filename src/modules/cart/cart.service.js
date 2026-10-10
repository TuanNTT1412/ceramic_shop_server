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
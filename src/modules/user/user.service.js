const bcrypt = require('bcryptjs')
const prisma = require('../../config/db')

const getProfileUser = async (userId) => {
    return await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
        }
    });
};

const updateProfileUser = async (userId, data) => {
    return await prisma.user.update({
        where: { id: userId },
        data: {
            name: data.name,
            avatar: data.avatar,
        },
        select: { 
            id: true,
            name: true, 
            email: true,
            avatar: true, 
            createdAt: true }
    });
};

const changePasswordUser = async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        const error = new Error('Người dùng không tồn tại');
        error.status = 404;
        throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        const error = new Error('Mật khẩu hiện tại không chính xác');
        error.status = 400;
        throw error;
    }

    if (currentPassword === newPassword) {
        const error = new Error('Mật khẩu mới phải khác mật khẩu hiện tại');
        error.status = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });

    return true;

};

const getUserAddresses = async (userId) => {
    const addresses = await prisma.userAddress.findMany({
        where: { userId },
        orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    // Nếu sổ địa chỉ rỗng, tự động truy hồi địa chỉ từ đơn hàng gần nhất (nếu có)
    if (addresses.length === 0) {
        try {
            const lastOrder = await prisma.order.findFirst({
                where: {
                    customerId: userId,
                    deliveryAddress: { not: null }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (lastOrder && lastOrder.deliveryAddress && lastOrder.deliveryAddress.trim()) {
                const autoSaved = await prisma.userAddress.create({
                    data: {
                        userId,
                        receiverName: lastOrder.receiverName || 'Quý khách',
                        receiverPhone: lastOrder.receiverPhone || '',
                        addressDetail: lastOrder.deliveryAddress.trim(),
                        isDefault: true
                    }
                });
                return [autoSaved];
            }
        } catch (err) {
            console.warn('Lỗi tự động phục hồi UserAddress từ đơn hàng cũ:', err?.message);
        }
    }

    return addresses;
}   

const createUserAddress = async (userId, data) => {
    const count = await prisma.userAddress.count({
        where: { userId }
    });

    const isDefault = count === 0 ? true : data.isDefault || false;

    if (isDefault) {
        await prisma.userAddress.updateMany({
            where: { userId },
            data: { isDefault: false }
        });
    }

    return await prisma.userAddress.create({
        data: {
            userId,
            receiverName: data.receiverName,
            receiverPhone: data.receiverPhone,
            addressDetail: data.addressDetail,
            isDefault
        }
    });
}

const updateUserAddress = async (userId, addressId, data) => {
    const existingAddress = await prisma.userAddress.findFirst({
        where: { id: addressId , userId }
    });

    if (!existingAddress) {
        const error = new Error('Địa chỉ không tồn tại');
        error.status = 404;
        throw error;
    }

    if (data.isDefault) {
        await prisma.userAddress.updateMany({
            where: { userId },
            data: { isDefault: false }
        });
    }

    return await prisma.userAddress.update({
        where: { id: addressId },
        data
    });

};

const deleteUserAddress = async (userId, addressId) => {
    const existingAddress = await prisma.userAddress.findFirst({
        where: { id: addressId, userId }
    });

    if (!existingAddress) {
        const error = new Error('Địa chỉ không tồn tại');
        error.status = 404;
        throw error;
    }

    return await prisma.userAddress.delete({
        where: { id: addressId }
    });
};

const setDefaultUserAddress = async (userId, addressId) => {
    return await updateUserAddress(userId, addressId, { isDefault: true });
}

// ==========================================
// DÀNH CHO ADMIN
// ==========================================

// 1. Tra cứu danh sách người dùng quản trị (Hỗ trợ phân trang, tìm kiếm và thống kê thực tế)
const getUsersForAdmin = async (query = {}) => {
    const { search, role, isActive } = query;

    const hasSearch = search && search.trim() !== "";
    const hasRole = Boolean(role);
    const hasStatus = isActive !== undefined && isActive !== null && isActive !== "";

    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const where = {};

    if (hasRole) {
        where.role = role;
    }

    if (hasStatus) {
        where.isActive = isActive === "true" || isActive === true;
    }

    if (hasSearch) {
        const keyword = search.trim();
        where.OR = [
            { name: { contains: keyword, mode: "insensitive" } },
            { email: { contains: keyword, mode: "insensitive" } },
        ];
    }

    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                addresses: {
                    select: {
                        receiverPhone: true,
                        addressDetail: true,
                        isDefault: true,
                    },
                    orderBy: { isDefault: "desc" },
                    take: 1,
                },
                orders: {
                    select: {
                        id: true,
                        totalAmount: true,
                        orderStatus: true,
                        createdAt: true,
                        orderDetails: {
                            take: 1,
                            select: {
                                classification: true,
                                variant: {
                                    select: {
                                        variantName: true,
                                        product: { select: { name: true } },
                                        images: { take: 1, select: { imageUrl: true } },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                },
                _count: {
                    select: {
                        orders: true,
                        reviews: true,
                        addresses: true,
                    },
                },
            },
        }),
        prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((u) => {
        const primaryAddress = u.addresses?.[0] || null;
        const recentOrderRaw = u.orders?.[0] || null;

        // Tính tổng chi tiêu của các đơn hoàn tất/đã thanh toán
        const accumulatedSpend = (u.orders || []).reduce((sum, ord) => {
            const isCompleted = ord.orderStatus === "DELIVERED" || ord.orderStatus === "COMPLETED";
            return isCompleted ? sum + (ord.totalAmount || 0) : sum;
        }, 0);

        let recentOrder = null;
        if (recentOrderRaw) {
            const firstDetail = recentOrderRaw.orderDetails?.[0] || null;
            const productName = firstDetail?.variant?.product?.name || "Tác phẩm gốm sứ nghệ thuật";
            const spec = firstDetail?.variant?.variantName || firstDetail?.classification || "Tiêu chuẩn";
            const image = firstDetail?.variant?.images?.[0]?.imageUrl || "/images/hero-vase.jpg";

            recentOrder = {
                code: `#ORD-${recentOrderRaw.id.slice(-6).toUpperCase()}`,
                status: recentOrderRaw.orderStatus === "COMPLETED" ? "Đã hoàn tất" : recentOrderRaw.orderStatus,
                productName,
                spec,
                amount: recentOrderRaw.totalAmount,
                image,
            };
        }

        return {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: primaryAddress?.receiverPhone || null,
            role: u.role,
            avatar: u.avatar,
            isActive: u.isActive,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            address: primaryAddress?.addressDetail || null,
            accumulatedSpend,
            recentOrder,
            _count: u._count,
        };
    });

    return {
        users: formattedUsers,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

// 2. Khóa / Mở khóa tài khoản người dùng
const updateUserStatus = async (adminId, targetUserId, isActive) => {
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
    });

    if (!targetUser) {
        const error = new Error("Người dùng không tồn tại");
        error.status = 404;
        throw error;
    }

    // Ràng buộc 1: Admin không được tự khóa chính mình
    if (adminId === targetUserId && isActive === false) {
        const error = new Error("Bạn không thể tự khóa tài khoản của chính mình");
        error.status = 400;
        throw error;
    }

    // Ràng buộc 2: Không được phép khóa tài khoản Admin khác
    if (targetUser.role === "ADMIN" && isActive === false) {
        const error = new Error("Không được phép khóa tài khoản Quản trị viên (ADMIN)");
        error.status = 400;
        throw error;
    }

    const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { isActive },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            updatedAt: true,
        },
    });

    return updatedUser;
};


module.exports = {
    // Customer
    getProfileUser,
    updateProfileUser,
    changePasswordUser,
    getUserAddresses,
    createUserAddress,
    updateUserAddress,
    deleteUserAddress,
    setDefaultUserAddress,
    // Admin
    getUsersForAdmin,
    updateUserStatus,
};
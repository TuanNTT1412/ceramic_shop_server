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
    return await prisma.userAddress.findMany({
        where: { userId },
        orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' }
        ]
    });
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

// 1. Tra cứu danh sách người dùng (Search-first: Phải có tìm kiếm hoặc lọc mới hiện)
const getUsersForAdmin = async (query = {}) => {
    const { search, role, isActive } = query;

    const hasSearch = search && search.trim() !== "";
    const hasRole = Boolean(role);
    const hasStatus = isActive !== undefined && isActive !== null && isActive !== "";

    // Nếu không có bất kỳ tiêu chí tìm kiếm hoặc bộ lọc nào -> Trả về rỗng để tối ưu hiệu năng
    if (!hasSearch && !hasRole && !hasStatus) {
        return {
            users: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            },
            message: "Vui lòng nhập từ khóa tìm kiếm (tên, email) hoặc chọn bộ lọc để tra cứu người dùng",
        };
    }

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
            },
        }),
        prisma.user.count({ where }),
    ]);

    return {
        users,
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
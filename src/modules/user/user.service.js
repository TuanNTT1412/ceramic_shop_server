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

module.exports = { getProfileUser, updateProfileUser, changePasswordUser, getUserAddresses, createUserAddress, updateUserAddress, deleteUserAddress, setDefaultUserAddress };
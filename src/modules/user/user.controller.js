const userService = require('./user.service');

const getProfileUser = async (req, res, next) => {
    try {
        const user = await userService.getProfileUser(req.user.userId);
        res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

const updateProfileUser = async (req, res, next) => {
    try {
        const user = await userService.updateProfileUser(req.user.userId, req.body);
        res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

const changePasswordUser = async (req, res, next) => {
    try {
        await userService.changePasswordUser(req.user.userId, req.body.currentPassword, req.body.newPassword);
        res.json({ success: true, message: 'Mật khẩu đã được thay đổi thành công' });
    } catch (err) {
        next(err);
    }
};

const getUserAddresses = async (req, res, next) => {
    try {
        const addresses = await userService.getUserAddresses(req.user.userId);
        res.json({ success: true, data: addresses });
    } catch (err) {
        next(err);
    }
};

const createUserAddress = async (req, res, next) => {
    try {
        const address = await userService.createUserAddress(req.user.userId, req.body);
        res.status(201).json({ success: true, message: 'Địa chỉ đã được tạo thành công', data: address });
    } catch (err) {
        next(err);
    }
};

const updateUserAddress = async (req, res, next) => {
    try {
        const address = await userService.updateUserAddress(req.user.userId, req.params.id, req.body);
        res.json({ success: true, message: 'Địa chỉ đã được cập nhật thành công', data: address });
    } catch (err) {
        next(err);
    }
};

const deleteUserAddress = async (req, res, next) => {
    try {
        await userService.deleteUserAddress(req.user.userId, req.params.id);
        res.json({ success: true, message: 'Địa chỉ đã được xóa thành công' });
    } catch (err) {
        next(err);
    }
};

const setDefaultUserAddress = async (req, res, next) => {
    try {
        await userService.setDefaultUserAddress(req.user.userId, req.params.id);
        res.json({ success: true, message: 'Địa chỉ mặc định đã được cập nhật' });
    } catch (err) {
        next(err);
    }
};

// ==========================================
// DÀNH CHO ADMIN
// ==========================================
const getUsersForAdmin = async (req, res, next) => {
    try {
        const result = await userService.getUsersForAdmin(req.query);
        res.status(200).json({
            success: true,
            data: result.users,
            pagination: result.pagination,
            message: result.message,
        });
    } catch (err) {
        next(err);
    }
};

const updateUserStatus = async (req, res, next) => {
    try {
        const adminId = req.user.userId || req.user.id;
        const targetUserId = req.params.id;
        const { isActive } = req.body;
        const updatedUser = await userService.updateUserStatus(adminId, targetUserId, isActive);
        res.status(200).json({
            success: true,
            message: isActive ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công',
            data: updatedUser,
        });
    } catch (err) {
        next(err);
    }
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
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

module.exports = { getProfileUser, updateProfileUser, changePasswordUser, getUserAddresses, createUserAddress, updateUserAddress, deleteUserAddress, setDefaultUserAddress };
const router = require('express').Router();
const userController = require('./user.controller');
const validate = require('../../middlewares/validate.middleware');
const {
    updateUserSchema,
    changePasswordSchema,
    createUserAddressSchema,
    updateUserAddressSchema,
    updateUserStatusSchema,
    createStaffSchema,
} = require('./user.validation');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { Role } = require('@prisma/client');

router.use(authenticate);

// ==========================================
// NHÓM 1: DÀNH CHO ADMIN
// ==========================================
const adminAuth = [authorize(Role.ADMIN)];

router.get('/admin', adminAuth, userController.getUsersForAdmin);
router.patch('/admin/:id/status', adminAuth, validate(updateUserStatusSchema), userController.updateUserStatus);
router.post('/admin/staff', adminAuth, validate(createStaffSchema), userController.createStaff);

// ==========================================
// NHÓM 2: DÀNH CHO CUSTOMER (HỒ SƠ CÁ NHÂN)
// ==========================================
router.get('/profile', userController.getProfileUser);
router.put('/profile', validate(updateUserSchema), userController.updateProfileUser);
router.put('/change-password', validate(changePasswordSchema), userController.changePasswordUser);
router.get('/addresses', userController.getUserAddresses);
router.post('/addresses', validate(createUserAddressSchema), userController.createUserAddress);
router.put('/addresses/:id', validate(updateUserAddressSchema), userController.updateUserAddress);
router.delete('/addresses/:id', userController.deleteUserAddress);
router.patch('/addresses/:id/default', userController.setDefaultUserAddress);

module.exports = router;
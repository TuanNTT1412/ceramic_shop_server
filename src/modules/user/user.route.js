const router = require('express').Router();
const userController = require('./user.controller');
const validate  = require('../../middlewares/validate.middleware');
const { updateUserSchema, changePasswordSchema, createUserAddressSchema, updateUserAddressSchema } = require('./user.validation');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/profile', userController.getProfileUser);
router.put('/profile', validate(updateUserSchema), userController.updateProfileUser);
router.put('/change-password', validate(changePasswordSchema), userController.changePasswordUser);
router.get('/addresses', userController.getUserAddresses);
router.post('/addresses', validate(createUserAddressSchema), userController.createUserAddress);
router.put('/addresses/:id', validate(updateUserAddressSchema), userController.updateUserAddress);
router.delete('/addresses/:id', userController.deleteUserAddress);
router.patch('/addresses/:id/default', userController.setDefaultUserAddress);

module.exports = router;
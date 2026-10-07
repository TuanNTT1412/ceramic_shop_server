const express = require("express");
const categoryController = require('./category.controller');
const  validate  = require('../../middlewares/validate.middleware');
const {authenticate, authorize} = require('../../middlewares/auth.middleware');
const { createCategorySchema, updateCategorySchema } = require('./category.validation');
const { Role } = require("@prisma/client");

const router = express.Router();

const adminAuth = [authenticate, authorize(Role.STAFF, Role.ADMIN)];

// Any unauthenticated user can view categories
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryDetail);

// Only authenticated users can create, update, or delete categories
router.post('/', adminAuth, validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', adminAuth, validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', adminAuth, categoryController.deleteCategory);

module.exports = router;

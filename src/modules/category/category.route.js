const express = require("express");
const categoryController = require('./category.controller');
const  validate  = require('../../middlewares/validate.middleware');
const {authenticate, authorize} = require('../../middlewares/auth.middleware');
const { createCategorySchema, updateCategorySchema } = require('./category.validation');
const { Role } = require("@prisma/client");

const router = express.Router();

const adminAuth = [authenticate, authorize(Role.STAFF, Role.ADMIN)];

// Any unauthenticated user can view categories
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getByCategoryId);

// Only authenticated users can create, update, or delete categories
router.post('/', authenticate, adminAuth, validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', authenticate, adminAuth, validate(updateCategorySchema), categoryController.updateByCategoryId);
router.delete('/:id', authenticate, adminAuth, categoryController.removeCategory);

module.exports = router;

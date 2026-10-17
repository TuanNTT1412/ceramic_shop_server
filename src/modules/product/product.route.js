const express = require('express')
const productController = require('./product.controller')
const validate = require('../../middlewares/validate.middleware')
const productValidation = require('./product.validation')
const { authenticate, authorize } = require('../../middlewares/auth.middleware')
const { Role } = require('@prisma/client')
const reviewRoute = require('../review/review.route')

const router = express.Router()

// ==========================================
// NHÓM: DÀNH CHO ADMIN & STAFF
// ==========================================
const adminAuth = [authenticate, authorize(Role.STAFF, Role.ADMIN)]

// ==========================================
// 1. PUBLIC ROUTES (DÀNH CHO KHÁCH HÀNG & TẤT CẢ MỌI NGƯỜI)
// ==========================================
// Khách hàng chỉ xem sản phẩm đang kinh doanh
router.get('/', productController.getProducts)
// ==========================================
// 2. PROTECTED ROUTES (DÀNH CHO ADMIN & STAFF)
// ==========================================
// Admin & Staff xem toàn bộ sản phẩm (kèm bộ lọc trạng thái ẩn/hiện)
router.get('/admin', adminAuth, productController.getProductsForAdmin)

router.get('/:id', productController.getProductDetail)

router.post(
    '/',
    adminAuth,
    validate(productValidation.createProductSchema),
    productController.createProduct
)

router.patch(
    '/:id',
    adminAuth,
    validate(productValidation.updateProductSchema),
    productController.updateProduct
)

router.post(
    '/:id/variants',
    adminAuth,
    validate(productValidation.createVariantSchema),
    productController.createVariant
)

router.patch(
    '/variants/:variantId',
    adminAuth,
    validate(productValidation.updateVariantSchema),
    productController.updateVariant
)

router.post(
    '/variants/:variantId/images',
    adminAuth,
    validate(productValidation.createImageSchema),
    productController.createVariantImage
)

router.patch(
    '/images/:imageId',
    adminAuth,
    validate(productValidation.updateImageSchema),
    productController.updateVariantImage
)

// ==========================================
// 3. ĐÁNH GIÁ SẢN PHẨM (Sub-route)
// ==========================================
// GET  /products/:productId/reviews         ← Lấy danh sách đánh giá
// POST /products/:productId/reviews         ← Khách hàng gửi đánh giá (cũng dùng reviewRoute riêng tại /reviews)
router.use('/:productId/reviews', reviewRoute)

module.exports = router

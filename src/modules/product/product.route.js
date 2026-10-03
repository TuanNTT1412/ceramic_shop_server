const router = require('express').Router()
const productController = require('./product.controller')
const validate = require('../../middlewares/validate.middleware')
const { authenticate, authorize } = require('../../middlewares/auth.middleware')
const {
    createProductSchema,
    updateProductSchema,
    createVariantSchema,
    updateVariantSchema,
    createImageSchema,
    updateImageSchema
} = require('./product.validation')

// Route xem danh sách sản phẩm
router.get('/', productController.getProducts)

// Các route liên quan đến chức năng  sản phẩm 
router.post(
    '/',
    authenticate,
    authorize('ADMIN', 'STAFF'),
    validate(createProductSchema),
    productController.createProduct
)

router.patch(
    '/:id',
    authenticate,
    authorize('ADMIN', 'STAFF'),
    validate(updateProductSchema),
    productController.updateProduct
)

router.post(
    '/:id/variants',
    authenticate,
    authorize('ADMIN', 'STAFF'),
    validate(createVariantSchema),
    productController.createVariant
)

router.patch(
    '/variants/:variantId',
    authenticate,
    authorize('ADMIN', 'STAFF'),
    validate(updateVariantSchema),
    productController.updateVariant
)

router.post(
    '/variants/:variantId/images',
    authenticate,
    authorize('ADMIN', 'STAFF'),
    validate(createImageSchema),
    productController.createVariantImage
)

router.patch(
    '/images/:imageId',
    authenticate,
    authorize('ADMIN', 'STAFF'),
    validate(updateImageSchema),
    productController.updateVariantImage
)

module.exports = router

const productService = require('./product.service')

const createProduct = async (req, res, next) => {
    try {
        const product = await productService.createProduct(req.body)
        res.status(201).json({ success: true, data: product })
    } catch (err) {
        next(err)
    }
}

const updateProduct = async (req, res, next) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body)
        res.json({ success: true, data: product })
    } catch (err) {
        next(err)
    }
}

const createVariant = async (req, res, next) => {
    try {
        const variant = await productService.createVariant(req.params.id, req.body)
        res.status(201).json({ success: true, data: variant })
    } catch (err) {
        next(err)
    }
}

const updateVariant = async (req, res, next) => {
    try {
        const variant = await productService.updateVariant(req.params.variantId, req.body)
        res.json({ success: true, data: variant })
    } catch (err) {
        next(err)
    }
}

const createVariantImage = async (req, res, next) => {
    try {
        const image = await productService.createVariantImage(req.params.variantId, req.body)
        res.status(201).json({ success: true, data: image })
    } catch (err) {
        next(err)
    }
}

const updateVariantImage = async (req, res, next) => {
    try {
        const image = await productService.updateVariantImage(req.params.imageId, req.body)
        res.json({ success: true, data: image })
    } catch (err) {
        next(err)
    }
}

const getProducts = async (req, res, next) => {
    try {
        const result = await productService.getProducts(req.query)
        res.json({ success: true, data: result })
    } catch (err) {
        next(err)
    }
}

const getProductsForAdmin = async (req, res, next) => {
    try {
        const result = await productService.getProductsForAdmin(req.query)
        res.json({ success: true, data: result })
    } catch (err) {
        next(err)
    }
}

module.exports = {
    createProduct,
    updateProduct,
    createVariant,
    updateVariant,
    createVariantImage,
    updateVariantImage,
    getProducts,
    getProductsForAdmin
}


const prisma = require("../../config/db")

// 1.Thêm 1 sản phẩm mới(kèm 1 phân loại và 1 ảnh ban đầu)
const createProduct = async (data) => {
    const { name, description, categoryId, initialVariant } = data

    // Kiểm tra danh mục tồn tại
    const category = await prisma.category.findUnique({
        where: { id: categoryId }
    })
    if (!category) {
        const error = new Error('Danh mục không tồn tại')
        error.status = 404
        throw error
    }

    // Thêm sản phẩm mới 
    const product = await prisma.product.create({
        data: {
            name,
            description,
            categoryId,
            variants: {
                create: {
                    variantName: initialVariant.variantName,
                    price: initialVariant.price,
                    stockQuantity: initialVariant.stockQuantity ?? 0,
                    images: {
                        create: {
                            imageUrl: initialVariant.initialImage.imageUrl,
                            isPrimary: initialVariant.initialImage.isPrimary ?? true,
                            displayOrder: initialVariant.initialImage.displayOrder ?? 0
                        }
                    }
                }
            }
        }
    })

    return product
}

// 2.Cập nhật thông tin chung 1 sản phẩm
const updateProduct = async (id, data) => {
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
        const error = new Error('Không tìm thấy sản phẩm')
        error.status = 404
        throw error
    }

    if (data.categoryId) {
        const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
        if (!category) {
            const error = new Error('Danh mục không tồn tại')
            error.status = 404
            throw error
        }
    }

    const updated = await prisma.product.update({
        where: { id },
        data,
        include: {
            category: { select: { id: true, name: true } },
            variants: {
                include: { images: true }
            }
        }
    })

    return updated
}

// 3.Thêm mới 1 phân loại cho sản phẩm đã có
const createVariant = async (productId, data) => {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
        const error = new Error('Không tìm thấy sản phẩm')
        error.status = 404
        throw error
    }

    const variantData = {
        productId,
        variantName: data.variantName,
        price: data.price,
        stockQuantity: data.stockQuantity ?? 0
    }

    if (data.initialImage) {
        variantData.images = {
            create: {
                imageUrl: data.initialImage.imageUrl,
                isPrimary: data.initialImage.isPrimary ?? false,
                displayOrder: data.initialImage.displayOrder ?? 0
            }
        }
    }

    const variant = await prisma.productVariant.create({
        data: variantData,
        include: { images: true }
    })

    return variant
}

// 4.Chỉnh sửa thông tin phân loại sản phẩm
const updateVariant = async (variantId, data) => {
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } })
    if (!existing) {
        const error = new Error('Không tìm thấy phân loại sản phẩm')
        error.status = 404
        throw error
    }

    const updated = await prisma.productVariant.update({
        where: { id: variantId },
        data,
        include: { images: true }
    })

    return updated
}

module.exports = {
    createProduct,
    updateProduct,
    createVariant,
    updateVariant
}

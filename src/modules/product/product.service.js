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

module.exports = {
    createProduct,
    updateProduct
}

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

module.exports = {
    createProduct
}

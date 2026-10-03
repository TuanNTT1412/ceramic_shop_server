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

// 5.Thêm mới ảnh cho phân loại sản phẩm
const createVariantImage = async (variantId, data) => {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } })
    if (!variant) {
        const error = new Error('Không tìm thấy phân loại sản phẩm')
        error.status = 404
        throw error
    }

    // Nếu ảnh mới là ảnh chính, cập nhật các ảnh khác cùng variant này về false
    if (data.isPrimary) {
        await prisma.variantImage.updateMany({
            where: { variantId },
            data: { isPrimary: false }
        })
    }

    const newImage = await prisma.variantImage.create({
        data: {
            variantId,
            imageUrl: data.imageUrl,
            isPrimary: data.isPrimary ?? false,
            displayOrder: data.displayOrder ?? 0
        }
    })

    return newImage
}

// 6.Thay thế ảnh cho phân loại
const updateVariantImage = async (imageId, data) => {
    const existing = await prisma.variantImage.findUnique({ where: { id: imageId } })
    if (!existing) {
        const error = new Error('Không tìm thấy hình ảnh')
        error.status = 404
        throw error
    }

    // Nếu cập nhật thành ảnh chính, chuyển các ảnh khác cùng variant về false
    if (data.isPrimary) {
        await prisma.variantImage.updateMany({
            where: { variantId: existing.variantId },
            data: { isPrimary: false }
        })
    }

    const updated = await prisma.variantImage.update({
        where: { id: imageId },
        data
    })

    return updated
}

// 7.Tìm kiếm theo tên / mã sản phẩm và bộ lọc danh mục để hiển thị danh sách sản phẩm
const getProducts = async (query) => {
    const { search, categoryId, isActive } = query
    const page = Math.max(1, parseInt(query.page, 10) || 1)
    const limit = Math.max(1, parseInt(query.limit, 10) || 10)
    const skip = (page - 1) * limit

    const where = {}

    // Tìm kiếm theo tên HOẶC mã sản phẩm 
    if (search && search.trim() !== '') {
        where.OR = [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { id: { equals: search.trim() } }
        ]
    }

    // Lọc theo danh mục
    if (categoryId && categoryId.trim() !== '') {
        where.categoryId = categoryId.trim()
    }

    // Lọc theo trạng thái kinh doanh(trạng thái hiển thị)
    if (isActive !== undefined && isActive !== '') {
        where.isActive = isActive === 'true' || isActive === true
    }

    const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
            where,
            skip,
            take: limit,
            include: {
                category: {
                    select: { id: true, name: true }
                },
                variants: {
                    include: {
                        images: {
                            orderBy: { displayOrder: 'asc' }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    ])

    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        products
    }
}

module.exports = {
    createProduct,
    updateProduct,
    createVariant,
    updateVariant,
    createVariantImage,
    updateVariantImage,
    getProducts
}

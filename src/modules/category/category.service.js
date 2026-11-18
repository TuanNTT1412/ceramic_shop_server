const prisma = require('../../config/db');

// 1. Create a new category
const createCategory    = async (data) => {
    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) {
        const error = new Error('Tên danh mục đã tồn tại');
        error.status = 409;
        throw error;
    }
    return await prisma.category.create({ data });
}

// 2. Get all categories
const getCategories = async () => {
    return await prisma.category.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { products: true }
            }
        }
    });
}

// 3. Get a category by ID
const getCategoryDetail = async (id) => {
    const category = await prisma.category.findUnique({
        where: { id },
        include: {
            _count: {
                select: { products: true }
            }
        }
    });
    if (!category) {
        const error = new Error('Danh mục không tồn tại');
        error.status = 404;
        throw error;
    }
    return category;
};

// 4. Update a category by ID
const updateCategory = async (id, data) => {
    await getCategoryDetail(id); // Check if category exists
    return await prisma.category.update({
        where: { id },
        data
    });
}

// 5. Delete a category by ID with Referential Integrity Constraint
const deleteCategory = async (id) => {
    const category = await getCategoryDetail(id);
    const productsCount = category._count?.products || 0;
    if (productsCount > 0) {
        const error = new Error(
            `Không thể xóa danh mục "${category.name}" vì đang có ${productsCount} sản phẩm liên kết. Vui lòng chuyển hoặc xóa sản phẩm trước.`
        );
        error.status = 400;
        throw error;
    }
    return await prisma.category.delete({ where: { id } });
}
module.exports = { createCategory, getCategories, getCategoryDetail, updateCategory, deleteCategory };
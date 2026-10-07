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
const getAllCategories = async () => {
    return await prisma.category.findMany({
        orderBy: { createdAt: 'desc' }
    });
}

// 3. Get a category by ID
const getByCategoryId = async (id) => {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
        const error = new Error('Danh mục không tồn tại');
        error.status = 404;
        throw error;
    }
    return category;
};

// 4. Update a category by ID
const updateByCategoryId = async (id, data) => {
    await getByCategoryId(id); // Check if category exists
    return await prisma.category.update({
        where: { id },
        data
    });
}

// 5. Delete a category by ID
const removeCategory = async (id) => {
    await getByCategoryId(id); // Check if category exists
    return await prisma.category.delete({ where: { id } });
}
module.exports = { createCategory, getAllCategories, getByCategoryId, updateByCategoryId, removeCategory };
const  categoryService = require('./category.service');

const createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({ success: true, data: category })
    } catch (err) {
        next(err);
    }
}

const getCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getCategories();
        res.json({ success: true, data: categories });
    } catch (err) {
        next(err);
    }
}

const getCategoryDetail = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryDetail(req.params.id);
        res.json({ success: true, data: category });
    } catch (err) {
        next(err);
    }
}

const updateCategory = async (req, res, next) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);
        res.json({ success: true, data: category });
    } catch (err) {
        next(err);
    }
}

const deleteCategory = async (req, res, next) => {
    try {
        await categoryService.deleteCategory(req.params.id);
        res.json({ success: true, message: 'Danh mục đã được xóa' });
    } catch (err) {
        next(err);
    }
}

module.exports = { createCategory, getCategories, getCategoryDetail, updateCategory, deleteCategory };
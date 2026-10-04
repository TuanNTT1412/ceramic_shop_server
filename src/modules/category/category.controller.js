const  categoryService = require('./category.service');

const createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({ success: true, data: category })
    } catch (err) {
        next(err);
    }
}

const getAllCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.json({ success: true, data: categories });
    } catch (err) {
        next(err);
    }
}

const getByCategoryId = async (req, res, next) => {
    try {
        const category = await categoryService.getByCategoryId(req.params.id);
        res.json({ success: true, data: category });
    } catch (err) {
        next(err);
    }
}

const updateByCategoryId = async (req, res, next) => {
    try {
        const category = await categoryService.updateByCategoryId(req.params.id, req.body);
        res.json({ success: true, data: category });
    } catch (err) {
        next(err);
    }
}

const removeCategory = async (req, res, next) => {
    try {
        await categoryService.removeCategory(req.params.id);
        res.json({ success: true, message: 'Danh mục đã được xóa' });
    } catch (err) {
        next(err);
    }
}

module.exports = { createCategory, getAllCategories, getByCategoryId, updateByCategoryId, removeCategory };
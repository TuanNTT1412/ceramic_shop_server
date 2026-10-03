const { z } = require('zod')

// Schema tạo sản phẩm: thông tin sản phẩm kèm 1 phân loại và 1 ảnh ban đầu
const createProductSchema = z.object({
    name: z.string().min(1, 'Tên sản phẩm không được để trống'),
    description: z.string().optional(),
    categoryId: z.string().uuid('ID danh mục không hợp lệ'),
    initialVariant: z.object({
        variantName: z.string().min(1, 'Tên phân loại không được để trống'),
        price: z.number().int('Giá phải là số nguyên').min(0, 'Giá không thể âm'),
        stockQuantity: z.number().int('Số lượng tồn là số nguyên').min(0, 'Số lượng tồn không thể âm'),
        initialImage: z.object({
            imageUrl: z.string().url('URL hình ảnh không hợp lệ'),
            isPrimary: z.boolean().default(true),
            displayOrder: z.number().int().default(0)
        })
    })
})

// Schema cập nhật thông tin sản phẩm
const updateProductSchema = z.object({
    name: z.string().min(1, 'Tên sản phẩm không được để trống').optional(),
    description: z.string().nullable().optional(),
    categoryId: z.string().uuid('ID danh mục không hợp lệ').optional(),
    isActive: z.boolean().optional()
})

// Schema thêm mới phân loại sản phẩm
const createVariantSchema = z.object({
    variantName: z.string().min(1, 'Tên phân loại không được để trống'),
    price: z.number().int('Giá phải là số nguyên').min(0, 'Giá không được âm'),
    stockQuantity: z.number().int('Số lượng phải là số nguyên').min(0, 'Số lượng tồn không được âm').default(0),
    initialImage: z.object({
        imageUrl: z.string().url('URL hình ảnh không hợp lệ'),
        isPrimary: z.boolean().default(false),
        displayOrder: z.number().int().default(0)
    }).optional()
})

// Schema chỉnh sửa thông tin phân loại sản phẩm
const updateVariantSchema = z.object({
    variantName: z.string().min(1, 'Tên phân loại không được để trống').optional(),
    price: z.number().int('Giá phải là số nguyên').min(0, 'Giá không được âm').optional(),
    stockQuantity: z.number().int('Số lượng phải là số nguyên').min(0, 'Số lượng tồn không được âm').optional()
})

// Schema thêm mới ảnh cho phân loại
const createImageSchema = z.object({
    imageUrl: z.string().url('URL hình ảnh không hợp lệ'),
    isPrimary: z.boolean().default(false),
    displayOrder: z.number().int().default(0)
})

// Schema thay thế ảnh cho phân loại
const updateImageSchema = z.object({
    imageUrl: z.string().url('URL hình ảnh không hợp lệ').optional(),
    isPrimary: z.boolean().optional(),
    displayOrder: z.number().int().optional()
})

module.exports = {
    createProductSchema,
    updateProductSchema,
    createVariantSchema,
    updateVariantSchema,
    createImageSchema,
    updateImageSchema
}
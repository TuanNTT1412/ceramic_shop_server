const { z } = require("zod");

// 1. Kiểm tra khi Thêm sản phẩm vào giỏ
const addToCartSchema = z.object({
  variantId: z
    .string({ required_error: "variantId là bắt buộc" })
    .uuid("ID phân loại sản phẩm phải là định dạng UUID hợp lệ"),
  quantity: z
    .number({ invalid_type_error: "Số lượng phải là số" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng thêm vào giỏ phải lớn hơn hoặc bằng 1")
    .max(999, "Số lượng thêm mỗi lần tối đa là 999")
    .optional()
    .default(1),
});

// 2. Kiểm tra khi Cập nhật số lượng trong giỏ
const updateCartItemSchema = z.object({
  quantity: z
    .number({
      required_error: "Số lượng là bắt buộc",
      invalid_type_error: "Số lượng phải là số",
    })
    .int("Số lượng phải là số nguyên")
    .min(0, "Số lượng không được âm")
    .max(999, "Số lượng không được vượt quá 999"),
});

module.exports = {
  addToCartSchema,
  updateCartItemSchema,
};

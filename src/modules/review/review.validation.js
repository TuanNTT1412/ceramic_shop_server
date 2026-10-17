const { z } = require("zod");

// 1. Kiểm tra khi Khách hàng gửi đánh giá
const createMyReviewSchema = z.object({
  orderDetailId: z
    .string({ required_error: "orderDetailId là bắt buộc" })
    .uuid("orderDetailId phải là định dạng UUID hợp lệ"),

  rating: z
    .number({
      required_error: "Số sao là bắt buộc",
      invalid_type_error: "Số sao phải là số",
    })
    .int("Số sao phải là số nguyên")
    .min(1, "Phải đánh giá ít nhất 1 sao")
    .max(5, "Số sao tối đa là 5"),

  comment: z
    .string()
    .max(500, "Nội dung đánh giá tối đa 500 ký tự")
    .optional()
    .nullable(),

  images: z
    .array(z.string().url("Mỗi ảnh phải là một URL hợp lệ"))
    .max(5, "Chỉ được tải lên tối đa 5 ảnh")
    .optional()
    .default([]),
});

// 2. Kiểm tra khi Admin/Staff phản hồi đánh giá
const replyReviewSchema = z.object({
  adminReply: z
    .string({ required_error: "Nội dung phản hồi là bắt buộc" })
    .min(1, "Nội dung phản hồi không được để trống")
    .max(500, "Nội dung phản hồi tối đa 500 ký tự"),
});

module.exports = {
  createMyReviewSchema,
  replyReviewSchema,
};

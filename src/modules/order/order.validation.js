const { z } = require("zod");

// 1. Kiểm tra khi Cập nhật tiến độ đơn
const updateOrderStatusSchema = z.object({
  body: z
    .object({
      orderStatus: z.enum(
        [
          "PENDING",
          "PROCESSING",
          "SHIPPING",
          "READY_FOR_PICKUP",
          "COMPLETED",
          "CANCELED",
        ],
        { required_error: "Trạng thái đơn hàng không hợp lệ" },
      ),
      shippingProvider: z
        .enum(["GHTK", "VTP", "VNPOST", "AHAMOVE"])
        .optional()
        .nullable(),
      trackingCode: z.string().optional().nullable(),
      cancelReason: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
      // Nếu chọn Đang giao, bắt buộc phải có thông tin vận chuyển
      if (data.orderStatus === "SHIPPING") {
        if (!data.shippingProvider || !data.trackingCode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Phải chọn hãng vận chuyển và nhập mã vận đơn",
            path: ["shippingProvider"], // Báo lỗi ở trường này
          });
        }
      }
      // Nếu Hủy đơn, bắt buộc phải có lý do
      if (data.orderStatus === "CANCELED") {
        if (!data.cancelReason || data.cancelReason.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Phải ghi rõ lý do hủy đơn hàng",
            path: ["cancelReason"],
          });
        }
      }
    }),
});

// 2. Kiểm tra khi Xác nhận thanh toán
const updatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(["UNPAID", "PAID"], {
      required_error: "Trạng thái thanh toán không hợp lệ",
    }),
  }),
});

module.exports = {
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
};

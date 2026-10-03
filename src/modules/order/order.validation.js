const { z } = require("zod");
const { OrderStatus, ShippingProvider, PaymentStatus } = require("@prisma/client");

// 1. Kiểm tra khi Cập nhật tiến độ đơn
const updateOrderStatusSchema = z.object({
  body: z
    .object({
      orderStatus: z.nativeEnum(OrderStatus, { 
        required_error: "Trạng thái đơn hàng không hợp lệ",
        invalid_type_error: "Trạng thái đơn hàng không hợp lệ"
      }),
      shippingProvider: z.nativeEnum(ShippingProvider).optional().nullable(),
      trackingCode: z.string().optional().nullable(),
      cancelReason: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
      // Nếu chọn Đang giao, bắt buộc phải có thông tin vận chuyển
      if (data.orderStatus === OrderStatus.SHIPPING) {
        if (!data.shippingProvider || !data.trackingCode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Phải chọn hãng vận chuyển và nhập mã vận đơn",
            path: ["shippingProvider"], // Báo lỗi ở trường này
          });
        }
      }
      // Nếu Hủy đơn, bắt buộc phải có lý do
      if (data.orderStatus === OrderStatus.CANCELED) {
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
    paymentStatus: z.nativeEnum(PaymentStatus, {
      required_error: "Trạng thái thanh toán không hợp lệ",
      invalid_type_error: "Trạng thái thanh toán không hợp lệ",
    }),
  }),
});

module.exports = {
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
};

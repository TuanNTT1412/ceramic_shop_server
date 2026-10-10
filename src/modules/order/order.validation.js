const { z } = require("zod");
const { OrderStatus, ShippingProvider, PaymentStatus, DeliveryType, PaymentMethod } = require("@prisma/client");

// 1. Kiểm tra khi Cập nhật tiến độ đơn
const updateOrderStatusSchema = z
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
  });

// 2. Kiểm tra khi Xác nhận thanh toán
const updatePaymentStatusSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus, {
    required_error: "Trạng thái thanh toán không hợp lệ",
    invalid_type_error: "Trạng thái thanh toán không hợp lệ",
  }),
});

// 3. Kiểm tra khi Khách hàng đặt đơn (Checkout)
const createOrderSchema = z
  .object({
    receiverName: z.string().min(1, "Vui lòng nhập tên người nhận"),
    receiverPhone: z.string().min(9, "Số điện thoại không hợp lệ"),
    deliveryType: z.nativeEnum(DeliveryType, {
      required_error: "Vui lòng chọn hình thức nhận hàng",
      invalid_type_error: "Hình thức nhận hàng không hợp lệ",
    }),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      required_error: "Vui lòng chọn phương thức thanh toán",
      invalid_type_error: "Phương thức thanh toán không hợp lệ",
    }),
    deliveryAddress: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Nếu chọn Giao hàng tận nơi, bắt buộc phải có địa chỉ
    if (data.deliveryType === DeliveryType.SHIPPING) {
      if (!data.deliveryAddress || data.deliveryAddress.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vui lòng cung cấp địa chỉ giao hàng cụ thể",
          path: ["deliveryAddress"],
        });
      }
    }
  });

module.exports = {
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  createOrderSchema,
};

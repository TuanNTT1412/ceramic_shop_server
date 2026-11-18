const { z } = require("zod");
const {
  ReturnReason,
  ReturnStatus,
  // CustomerFinalDecision,
} = require("@prisma/client");

// ==========================================
// 1. DÀNH CHO KHÁCH HÀNG (CUSTOMER)
// ==========================================

// Khách khởi tạo yêu cầu trả hàng
const initiateReturnSchema = z.object({
  orderId: z.string().uuid("ID đơn hàng không hợp lệ"),
  orderDetailId: z.string().uuid("ID chi tiết đơn hàng không hợp lệ"),
  reason: z.nativeEnum(ReturnReason, {
    required_error: "Vui lòng chọn lý do trả hàng",
    invalid_type_error: "Lý do trả hàng không hợp lệ",
  }),
  customerNote: z.string().optional().nullable(),
});

// Khách nộp kết quả Module 4 AI và phản hồi sơ bộ (Chốt gửi ticket cho shop)
const submitAiInspectionSchema = z.object({
  captureSessionId: z.string().optional().nullable(),
  capturedImages: z
    .object({
      truoc: z.string().optional().nullable(),
      sau: z.string().optional().nullable(),
      trai: z.string().optional().nullable(),
      phai: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  aiDetectedDamage: z.boolean().default(false),
  aiDamageScore: z
    .number()
    .min(0, "Điểm thiệt hại phải từ 0.0 đến 1.0")
    .max(1, "Điểm thiệt hại phải từ 0.0 đến 1.0")
    .default(0.0),
  aiDefectType: z.string().optional().nullable(),
  customerAgreedWithAi: z.boolean({
    required_error:
      "Khách hàng phải xác nhận đồng ý hoặc không đồng ý với mức AI ước lượng",
  }),
  customerRejectReason: z.string().optional().nullable(),
  defectDetails: z.any().optional().nullable(),
  resultImages: z.any().optional().nullable(),
});

// // Khách hàng đưa ra quyết định cuối cùng sau khi nhân viên kho soi bình
// const customerFinalDecisionSchema = z
//   .object({
//     decision: z.nativeEnum(CustomerFinalDecision, {
//       required_error:
//         "Vui lòng chọn quyết định: ACCEPT_REFUND (nhận tiền) hoặc RETRIEVE_ITEM (nhận lại bình)",
//     }),
//     customerBankName: z.string().optional().nullable(),
//     customerAccountNumber: z.string().optional().nullable(),
//     customerAccountName: z.string().optional().nullable(),
//     customerBankQrUrl: z.string().optional().nullable(),
//   })
//   .superRefine((data, ctx) => {
//     if (data.decision === CustomerFinalDecision.ACCEPT_REFUND) {
//       if (!data.customerBankName || data.customerBankName.trim() === "") {
//         ctx.addIssue({
//           code: z.ZodIssueCode.custom,
//           message: "Vui lòng nhập tên ngân hàng nhận tiền",
//           path: ["customerBankName"],
//         });
//       }
//       if (!data.customerAccountNumber || data.customerAccountNumber.trim() === "") {
//         ctx.addIssue({
//           code: z.ZodIssueCode.custom,
//           message: "Vui lòng nhập số tài khoản ngân hàng",
//           path: ["customerAccountNumber"],
//         });
//       }
//       if (!data.customerAccountName || data.customerAccountName.trim() === "") {
//         ctx.addIssue({
//           code: z.ZodIssueCode.custom,
//           message: "Vui lòng nhập tên chủ tài khoản",
//           path: ["customerAccountName"],
//         });
//       }
//     }
//   });

// ==========================================
// 2. DÀNH CHO NHÂN VIÊN & KHO (STAFF / ADMIN)
// ==========================================

// // Staff cập nhật trạng thái tiến độ
// const staffUpdateStatusSchema = z.object({
//   status: z.nativeEnum(ReturnStatus, {
//     required_error: "Vui lòng chọn trạng thái hợp lệ",
//   }),
//   note: z.string().optional().nullable(),
// });

// // Nhân viên kho nộp kết quả soi bình thực tế
// const warehouseVerifySchema = z.object({
//   matchesAiImages: z.boolean({
//     required_error:
//       "Bắt buộc xác nhận hàng nhận về có khớp ảnh AI online hay không",
//   }),
//   finalRefundOffer: z
//     .number({
//       required_error: "Vui lòng nhập số tiền shop chốt hoàn",
//     })
//     .min(0, "Số tiền chốt hoàn không thể âm"),
//   warehouseNote: z.string().optional().nullable(),
// });

// // Kế toán/Staff xác nhận đã chuyển tiền và đính kèm ảnh biên lai
// const completeRefundSchema = z.object({
//   proofImageUrl: z
//     .string({
//       required_error: "Bắt buộc phải có ảnh chụp màn hình biên lai chuyển khoản",
//     })
//     .min(1, "Ảnh biên lai không được để trống"),
//   refundAmount: z.number().positive("Số tiền hoàn phải lớn hơn 0").optional(),
// });

module.exports = {
  initiateReturnSchema,
  submitAiInspectionSchema,
  // customerFinalDecisionSchema,
  // staffUpdateStatusSchema,
  // warehouseVerifySchema,
  // completeRefundSchema,
};

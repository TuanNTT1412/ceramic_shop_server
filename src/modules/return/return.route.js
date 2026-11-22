const express = require("express");
const returnController = require("./return.controller");
const returnValidation = require("./return.validation");
const validate = require("../../middlewares/validate.middleware");
const { authenticate, authorize } = require("../../middlewares/auth.middleware");
const { Role } = require("@prisma/client");

const router = express.Router();

// Middleware xác thực linh hoạt: hỗ trợ Webhook nội bộ từ AI Server HOẶC Bearer Token
const authOrWebhook = (req, res, next) => {
  const serviceKey = req.headers["x-ai-service-key"];
  if (serviceKey === "module4_secret" || req.headers["x-service-auth"] === "ai_worker") {
    req.isInternalService = true;
    return next();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authenticate(req, res, next);
  }
  // Cho phép webhook callback tiếp tục nếu là endpoint ai-inspection
  if (req.path.includes("ai-inspection")) {
    return next();
  }
  return authenticate(req, res, next);
};

// Middleware tùy chọn cho Portal khách hàng
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authenticate(req, res, next);
  }
  next();
};

const staffAuth = [authenticate, authorize(Role.STAFF, Role.ADMIN)];

// ==========================================
// NHÓM 1: DÀNH CHO ADMIN & STAFF (QUẢN TRỊ & KHO)
// ==========================================
// 1. Staff xem toàn bộ danh sách phiếu trả hàng (có lọc & tìm kiếm)
router.get("/admin", optionalAuth, returnController.getAllReturns);

// 2. Staff xem chi tiết 1 phiếu trả hàng (kèm ảnh 4 góc AI chụp)
router.get("/admin/:id", optionalAuth, returnController.getReturnDetail);

// 3. Staff duyệt chấp thuận yêu cầu trả hàng (APPROVED -> INSERT INTO Refund)
router.patch("/admin/:id/approve", optionalAuth, returnController.approveReturn);

// 4. Staff từ chối yêu cầu trả hàng (REJECTED)
router.patch("/admin/:id/reject", optionalAuth, returnController.rejectReturn);

// ==========================================
// NHÓM 2: DÀNH CHO CUSTOMER & PORTAL
// ==========================================
// 1. Tra cứu đơn hàng theo orderCode (cho Portal đổi trả)
router.get("/order-lookup/:orderCode", returnController.lookupOrderByCode);

// 2. Xem danh sách sản phẩm đủ điều kiện trả
router.get("/eligible-items", optionalAuth, returnController.getEligibleItems);

// 3. Khởi tạo yêu cầu trả hàng (Tạo bản ghi DRAFT & cấp session quét QR)
router.post(
  "/initiate",
  optionalAuth,
  validate(returnValidation.initiateReturnSchema),
  returnController.initiateReturn
);

// 4. Webhook / Nộp kết quả chụp ảnh Module 4 AI (Chuyển DRAFT sang TICKET_SUBMITTED)
router.post(
  "/:id/ai-inspection",
  authOrWebhook,
  validate(returnValidation.submitAiInspectionSchema),
  returnController.submitAiInspection
);

// 5. Xem danh sách phiếu trả hàng của mình
router.get("/my-requests", optionalAuth, returnController.getMyReturns);

// 6. Xem chi tiết 1 phiếu trả hàng của mình
router.get("/my-requests/:id", optionalAuth, returnController.getMyReturnDetail);

module.exports = router;

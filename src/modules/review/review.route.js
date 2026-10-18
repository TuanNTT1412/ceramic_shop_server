const express = require("express");
const reviewController = require("./review.controller");
const validate = require("../../middlewares/validate.middleware");
const reviewValidation = require("./review.validation");
const { authenticate, authorize } = require("../../middlewares/auth.middleware");
const { Role } = require("@prisma/client");

const router = express.Router({ mergeParams: true }); // mergeParams để nhận productId từ route cha

// ==========================================
// NHÓM 1: PUBLIC (Ai cũng xem được)
// ==========================================

// Lấy danh sách đánh giá theo sản phẩm
// Được mount ở 2 nơi:
//   GET /products/:productId/reviews  (từ product.route.js)
//   GET /reviews?productId=...        (tùy chọn nếu cần)
router.get("/", reviewController.getReviews);

// ==========================================
// NHÓM 2: DÀNH CHO CUSTOMER
// ==========================================
const customerAuth = [authenticate, authorize(Role.CUSTOMER)];

// Khách hàng gửi đánh giá
router.post(
  "/",
  customerAuth,
  validate(reviewValidation.createMyReviewSchema),
  reviewController.createMyReview
);

// ==========================================
// NHÓM 3: DÀNH CHO ADMIN / STAFF
// ==========================================
const adminAuth = [authenticate, authorize(Role.ADMIN, Role.STAFF)];

// Admin/Staff phản hồi một đánh giá
router.post(
  "/:id/reply",
  adminAuth,
  validate(reviewValidation.replyReviewSchema),
  reviewController.replyReviewForAdmin
);

module.exports = router;

const reviewService = require("./review.service");

// ==========================================
// DÀNH CHO KHÁCH HÀNG (CUSTOMER)
// ==========================================

const createMyReview = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const review = await reviewService.createMyReview(userId, req.body);

    res.status(201).json({
      success: true,
      message: "Gửi đánh giá thành công",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PUBLIC
// ==========================================

const getReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getReviews(
      req.params.productId,
      req.query
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DÀNH CHO ADMIN / STAFF
// ==========================================

const replyReviewForAdmin = async (req, res, next) => {
  try {
    const review = await reviewService.replyReviewForAdmin(
      req.params.id,
      req.body.adminReply
    );

    res.status(200).json({
      success: true,
      message: "Phản hồi đánh giá thành công",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMyReview,
  getReviews,
  replyReviewForAdmin,
};

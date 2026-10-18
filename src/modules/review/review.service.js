const prisma = require("../../config/db");

// ==========================================
// DÀNH CHO KHÁCH HÀNG (CUSTOMER)
// ==========================================

const createMyReview = async (userId, data) => {
  const { orderDetailId, rating, comment, images } = data;

  // Bước 1: Truy vấn OrderDetail kéo theo Order để kiểm tra
  const orderDetail = await prisma.orderDetail.findUnique({
    where: { id: orderDetailId },
    include: {
      order: true,
    },
  });

  if (!orderDetail) {
    const error = new Error("Không tìm thấy dòng chi tiết đơn hàng");
    error.status = 404;
    throw error;
  }

  // Bước 2: Kiểm tra quyền - Đơn hàng có thuộc về user này không
  if (orderDetail.order.customerId !== userId) {
    const error = new Error("Bạn không có quyền đánh giá món hàng này");
    error.status = 403;
    throw error;
  }

  // Bước 3: Kiểm tra trạng thái đơn hàng - Chỉ cho đánh giá khi COMPLETED
  if (orderDetail.order.orderStatus !== "COMPLETED") {
    const error = new Error(
      "Bạn chỉ có thể đánh giá sau khi đơn hàng đã hoàn thành"
    );
    error.status = 400;
    throw error;
  }

  // Bước 4: Lưu đánh giá vào Database
  // Nếu đã đánh giá rồi, ràng buộc @unique của orderDetailId sẽ tự ném lỗi
  try {
    const review = await prisma.review.create({
      data: {
        userId,
        productId: orderDetail.productId,
        orderDetailId,
        rating,
        comment,
        images: images || [],
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        orderDetail: { select: { classification: true } },
      },
    });

    return review;
  } catch (err) {
    // Bắt lỗi unique constraint của Prisma (P2002) khi đánh giá trùng
    if (err.code === "P2002") {
      const error = new Error("Bạn đã đánh giá món hàng này rồi");
      error.status = 409;
      throw error;
    }
    throw err;
  }
};

// ==========================================
// PUBLIC (AI CÁI MỌI NGƯỜI ĐỀU THẤY)
// ==========================================

const getReviews = async (productId, query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(query.limit, 10) || 10, 1);
  const skip = (page - 1) * limit;

  // Lọc theo số sao nếu có
  const where = { productId };
  if (query.rating) {
    where.rating = parseInt(query.rating, 10);
  }

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        // Lấy tên và avatar của người đánh giá
        user: { select: { id: true, name: true, avatar: true } },
        // Lấy thông tin phân loại sản phẩm đã mua (VD: "Men rạn - Size L")
        orderDetail: { select: { classification: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ==========================================
// DÀNH CHO ADMIN / STAFF
// ==========================================

const replyReviewForAdmin = async (reviewId, adminReply) => {
  // Kiểm tra review tồn tại
  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!existing) {
    const error = new Error("Không tìm thấy đánh giá");
    error.status = 404;
    throw error;
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      adminReply,
      replyAt: new Date(),
    },
  });

  return updated;
};

module.exports = {
  createMyReview,
  getReviews,
  replyReviewForAdmin,
};

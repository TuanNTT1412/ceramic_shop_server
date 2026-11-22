const {
  PrismaClient,
  OrderStatus,
  ReturnStatus,
  // CustomerFinalDecision,
} = require("@prisma/client");
const QRCode = require("qrcode");
const prisma = new PrismaClient();

// ==========================================
// PHẦN 1: DÀNH CHO KHÁCH HÀNG (CUSTOMER)
// ==========================================

/**
 * 1. Lấy danh sách các sản phẩm mà khách đủ điều kiện yêu cầu trả hàng
 * Điều kiện: Đơn hàng COMPLETED trong vòng 7 ngày, chưa có yêu cầu trả hàng đang xử lý
 */
const getEligibleItemsForReturn = async (customerId) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const eligibleOrders = await prisma.order.findMany({
    where: {
      customerId,
      orderStatus: OrderStatus.COMPLETED,
      updatedAt: { gte: sevenDaysAgo },
    },
    include: {
      orderDetails: {
        include: {
          product: {
            select: { isReturnable: true },
          },
          variant: {
            include: {
              images: { take: 1 },
            },
          },
          returnRequests: {
            select: {
              id: true,
              returnCode: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const eligibleItems = [];

  for (const order of eligibleOrders) {
    for (const detail of order.orderDetails) {
      // 1. Chỉ cho phép đổi trả với sản phẩm có isReturnable === true
      if (!detail.product?.isReturnable) {
        continue;
      }

      const activeReturn = detail.returnRequests.find(
        (req) => req.status !== ReturnStatus.CANCELLED_BY_CUSTOMER
      );

      if (!activeReturn) {
        eligibleItems.push({
          orderId: order.id,
          orderCode: order.orderCode,
          orderDate: order.createdAt,
          orderDetailId: detail.id,
          productId: detail.productId,
          productName: detail.productName,
          classification: detail.classification,
          unitPrice: detail.unitPrice,
          quantity: detail.quantity,
          subTotal: detail.subTotal,
          thumbnail: detail.variant?.images?.[0]?.imageUrl || null,
        });
      }
    }
  }

  return eligibleItems;
};

/**
 * 2. Khách bấm chọn sản phẩm để tạo yêu cầu trả hàng (Khởi tạo DRAFT)
 */
const initiateReturn = async (customerId, data) => {
  const { orderId, orderDetailId, reason, customerNote } = data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, ...(customerId ? { customerId } : {}) },
    include: {
      orderDetails: {
        where: { id: orderDetailId },
        include: {
          product: {
            select: { isReturnable: true, name: true },
          },
        },
      },
    },
  });

  if (!order) {
    const error = new Error("Đơn hàng không tồn tại hoặc không thuộc về bạn");
    error.status = 404;
    throw error;
  }

  if (order.orderStatus !== OrderStatus.COMPLETED) {
    const error = new Error(
      "Chỉ có thể yêu cầu trả hàng đối với đơn hàng đã giao thành công"
    );
    error.status = 400;
    throw error;
  }

  const orderDetail = order.orderDetails[0];
  if (!orderDetail) {
    const error = new Error("Sản phẩm không thuộc đơn hàng này");
    error.status = 400;
    throw error;
  }

  // Kiểm tra cờ isReturnable của sản phẩm
  if (!orderDetail.product?.isReturnable) {
    const error = new Error(
      "Sản phẩm này không thuộc danh mục áp dụng chính sách đổi trả của shop"
    );
    error.status = 400;
    throw error;
  }

  const existingActiveReturn = await prisma.returnRequest.findFirst({
    where: {
      orderDetailId,
      status: {
        notIn: [ReturnStatus.CANCELLED_BY_CUSTOMER],
      },
    },
  });

  if (existingActiveReturn) {
    const error = new Error(
      `Sản phẩm này đã có yêu cầu trả hàng đang xử lý (Mã: ${existingActiveReturn.returnCode})`
    );
    error.status = 400;
    throw error;
  }

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const returnCode = `RET-${todayStr}-${randomSuffix}`;
  const captureSessionId = `SESSION-${Date.now()}-${randomSuffix}`;

  const newReturnRequest = await prisma.returnRequest.create({
    data: {
      returnCode,
      orderId,
      customerId: customerId || order.customerId,
      orderDetailId,
      reason,
      customerNote,
      status: ReturnStatus.DRAFT_INSPECTING,
    },
    include: {
      orderDetail: true,
    },
  });

  // Xác định mã sản phẩm để AI Server nạp đúng ảnh bóng mờ (ghost overlay: B1, B2...)
  const codeMatch = orderDetail.product?.name?.match(/\b(B\d{1,2})\b/i);
  const productCode =
    data.productCode || (codeMatch ? codeMatch[1].toUpperCase() : "B1");

  // Ghép link tới giao diện chụp ảnh Mobile của AI Server
  const aiBaseUrl = process.env.AI_CAPTURE_BASE_URL || "http://localhost:8000";
  const captureUrl = `${aiBaseUrl}/capture/${captureSessionId}?returnId=${newReturnRequest.id}&productCode=${productCode}`;

  // Sinh mã QR Base64 Data URI để trả về cho Client hiển thị
  const qrCode = await QRCode.toDataURL(captureUrl, {
    width: 320,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return {
    returnRequest: newReturnRequest,
    captureSessionId,
    captureUrl,
    productCode,
    qrCode,
    message:
      "Khởi tạo thành công. Vui lòng quét mã QR để chụp ảnh 4 góc giám định AI.",
  };
};

/**
 * 3. Tiếp nhận kết quả Module 4 AI và Phản hồi sơ bộ của khách
 */
const submitAiInspection = async (customerId, returnRequestId, aiData) => {
  const returnRequest = await prisma.returnRequest.findFirst({
    where: { id: returnRequestId, ...(customerId ? { customerId } : {}) },
    include: { orderDetail: true, aiInspection: true },
  });

  if (!returnRequest) {
    const error = new Error("Không tìm thấy yêu cầu trả hàng của bạn");
    error.status = 404;
    throw error;
  }

  if (returnRequest.status !== ReturnStatus.DRAFT_INSPECTING) {
    const error = new Error(
      `Hồ sơ này đang ở trạng thái '${returnRequest.status}', không thể nộp giám định AI nữa`
    );
    error.status = 400;
    throw error;
  }

  if (returnRequest.aiInspection) {
    const error = new Error("Yêu cầu trả hàng này đã được thực hiện giám định AI");
    error.status = 400;
    throw error;
  }

  const itemTotal =
    returnRequest.orderDetail.subTotal ||
    returnRequest.orderDetail.unitPrice * returnRequest.orderDetail.quantity;

  let estimatedRefundAmount = 0;
  if (aiData.aiDetectedDamage) {
    estimatedRefundAmount = Math.round(itemTotal * (aiData.aiDamageScore || 0));
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.aiInspection.create({
      data: {
        returnRequestId: returnRequest.id,
        captureSessionId: aiData.captureSessionId,
        capturedImages: aiData.capturedImages,
        aiDetectedDamage: aiData.aiDetectedDamage,
        aiDamageScore: aiData.aiDamageScore,
        aiDefectType: aiData.aiDefectType,
        estimatedRefundAmount,
        customerAgreedWithAi: aiData.customerAgreedWithAi,
        customerRejectReason: aiData.customerRejectReason,
        defectDetails: aiData.defectDetails,
        resultImages: aiData.resultImages,
      },
    });

    let newStatus = ReturnStatus.CANCELLED_BY_CUSTOMER;
    let message = "";

    if (aiData.customerAgreedWithAi === true) {
      newStatus = ReturnStatus.TICKET_SUBMITTED;
      message =
        "Bạn đã đồng ý với mức ước lượng AI. Phiếu yêu cầu đã được gửi đến shop.";
    } else {
      newStatus = ReturnStatus.CANCELLED_BY_CUSTOMER;
      message =
        "Bạn đã từ chối mức ước lượng AI. Quy trình trả hàng đã dừng lại.";
    }

    const updatedReturnRequest = await tx.returnRequest.update({
      where: { id: returnRequest.id },
      data: { status: newStatus },
      include: {
        aiInspection: true,
        orderDetail: true,
      },
    });

    return { updatedReturnRequest, message };
  });

  return result;
};

/**
 * 4. Khách hàng xem danh sách các yêu cầu trả hàng của mình
 */
const getMyReturns = async (customerId) => {
  return await prisma.returnRequest.findMany({
    where: { customerId },
    include: {
      order: { select: { orderCode: true } },
      orderDetail: {
        select: {
          productName: true,
          classification: true,
          unitPrice: true,
          quantity: true,
          subTotal: true,
        },
      },
      aiInspection: true,
      // warehouseVerification: true,
      // refund: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * 5. Khách hàng xem chi tiết một phiếu trả hàng
 */
const getMyReturnDetail = async (customerId, id) => {
  const detail = await prisma.returnRequest.findFirst({
    where: { id, customerId },
    include: {
      order: {
        select: {
          orderCode: true,
          createdAt: true,
          receiverName: true,
          receiverPhone: true,
        },
      },
      orderDetail: true,
      aiInspection: true,
      // warehouseVerification: true,
      // refund: true,
    },
  });

  if (!detail) {
    const error = new Error("Không tìm thấy thông tin phiếu trả hàng");
    error.status = 404;
    throw error;
  }

  return detail;
};

/**
 * 6. Khách hàng đưa ra quyết định cuối cùng sau khi nhân viên kho soi bình
 * - Nếu chọn ACCEPT_REFUND: Chuyển sang AWAITING_REFUND + Lưu thông tin STK/QR ngân hàng
 * - Nếu chọn RETRIEVE_ITEM: Chuyển sang RETURNING_TO_CUSTOMER (Shop đóng gói gửi trả bình)
 */
/* const submitFinalDecision = async (customerId, id, data) => {
  const returnRequest = await prisma.returnRequest.findFirst({
    where: { id, customerId },
    include: { warehouseVerification: true, refund: true },
  });

  if (!returnRequest) {
    const error = new Error("Không tìm thấy thông tin phiếu trả hàng của bạn");
    error.status = 404;
    throw error;
  }

  if (!returnRequest.warehouseVerification) {
    const error = new Error(
      "Shop chưa hoàn thành kiểm định thực tế tại kho cho sản phẩm này"
    );
    error.status = 400;
    throw error;
  }

  if (returnRequest.warehouseVerification.customerFinalDecision) {
    const error = new Error("Bạn đã đưa ra quyết định cho yêu cầu trả hàng này rồi");
    error.status = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Cập nhật quyết định của khách vào WarehouseVerification
    await tx.warehouseVerification.update({
      where: { returnRequestId: id },
      data: {
        customerFinalDecision: data.decision,
      },
    });

    let nextStatus = ReturnStatus.AWAITING_REFUND;
    let message = "";

    if (data.decision === CustomerFinalDecision.ACCEPT_REFUND) {
      nextStatus = ReturnStatus.AWAITING_REFUND;
      message =
        "Bạn đã đồng ý với mức hoàn tiền của shop. Shop sẽ tiến hành chuyển khoản sớm nhất.";

      // Khởi tạo trước bản ghi Refund với thông tin tài khoản của khách
      await tx.refund.upsert({
        where: { returnRequestId: id },
        update: {
          customerBankName: data.customerBankName,
          customerAccountNumber: data.customerAccountNumber,
          customerAccountName: data.customerAccountName,
          customerBankQrUrl: data.customerBankQrUrl || null,
          refundAmount:
            returnRequest.warehouseVerification.finalRefundOffer || 0,
        },
        create: {
          returnRequestId: id,
          customerBankName: data.customerBankName,
          customerAccountNumber: data.customerAccountNumber,
          customerAccountName: data.customerAccountName,
          customerBankQrUrl: data.customerBankQrUrl || null,
          refundAmount:
            returnRequest.warehouseVerification.finalRefundOffer || 0,
          proofImageUrl: "",
          performedBy: "",
        },
      });
    } else {
      nextStatus = ReturnStatus.RETURNING_TO_CUSTOMER;
      message =
        "Bạn đã chọn nhận lại sản phẩm. Shop sẽ đóng gói và gửi trả lại chiếc bình cho bạn.";
    }

    const updated = await tx.returnRequest.update({
      where: { id },
      data: { status: nextStatus },
      include: {
        // warehouseVerification: true,
      // refund: true,
        aiInspection: true,
      },
    });

    return { updated, message };
  });
};

// ==========================================
// PHẦN 2: DÀNH CHO NHÂN VIÊN & KHO (STAFF / ADMIN)
// ==========================================

/**
 * 7. Staff xem danh sách toàn bộ phiếu trả hàng (có lọc & tìm kiếm)
 */
const getAllReturns = async (query = {}) => {
  const { status, search } = query;
  const where = {};

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { returnCode: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { order: { orderCode: { contains: search, mode: "insensitive" } } },
    ];
  }

  return await prisma.returnRequest.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, email: true } },
      order: { select: { orderCode: true } },
      orderDetail: {
        select: { productName: true, unitPrice: true, quantity: true },
      },
      aiInspection: true,
      refund: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * 8. Staff xem chi tiết 1 phiếu trả hàng
 */
const getReturnDetail = async (id) => {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, email: true, addresses: true },
      },
      order: true,
      orderDetail: {
        include: {
          variant: { include: { images: true } },
        },
      },
      aiInspection: true,
      refund: true,
    },
  });

  if (!returnRequest) {
    const error = new Error("Không tìm thấy phiếu yêu cầu trả hàng");
    error.status = 404;
    throw error;
  }

  return returnRequest;
};

/**
 * 9. Staff duyệt yêu cầu trả hàng (APPROVED) -> INSERT INTO bảng Refund (Ghi vết dòng tiền âm)
 */
const approveReturn = async (id, staffId, data = {}) => {
  const returnRequest = await getReturnDetail(id);

  if (returnRequest.status === ReturnStatus.APPROVED) {
    const error = new Error("Phiếu yêu cầu trả hàng này đã được duyệt trước đó");
    error.status = 400;
    throw error;
  }

  if (returnRequest.status === ReturnStatus.REJECTED) {
    const error = new Error("Phiếu yêu cầu trả hàng này đã bị từ chối trước đó");
    error.status = 400;
    throw error;
  }

  // Xác định số tiền hoàn: Ưu tiên tiền truyền lên, hoặc lấy từ AiInspection, hoặc lấy toàn bộ giá trị orderDetail
  const finalAmount = data.refundAmount !== undefined && data.refundAmount !== null
    ? Number(data.refundAmount)
    : (returnRequest.aiInspection?.estimatedRefundAmount || returnRequest.orderDetail?.subTotal || 0);

  return await prisma.$transaction(async (tx) => {
    // 1. Cập nhật trạng thái phiếu sang APPROVED
    const updatedRequest = await tx.returnRequest.update({
      where: { id },
      data: {
        status: ReturnStatus.APPROVED,
        reviewedBy: staffId,
        reviewedAt: new Date(),
        adminNote: data.adminNote || "Đã duyệt yêu cầu hoàn trả",
      },
    });

    // 2. INSERT INTO bảng Refund (Ghi vết dòng tiền âm, không sửa Order cũ)
    const refundRecord = await tx.refund.upsert({
      where: { returnRequestId: id },
      update: {
        refundAmount: finalAmount,
        adminNote: data.adminNote || "Đã duyệt yêu cầu hoàn trả",
        performedBy: staffId,
        createdAt: new Date(),
      },
      create: {
        returnRequestId: id,
        refundAmount: finalAmount,
        adminNote: data.adminNote || "Đã duyệt yêu cầu hoàn trả",
        performedBy: staffId,
        createdAt: new Date(),
      },
    });

    return {
      returnRequest: updatedRequest,
      refund: refundRecord,
      message: "Duyệt yêu cầu trả hàng và ghi nhận hoàn tiền thành công",
    };
  });
};

/**
 * 10. Staff từ chối yêu cầu trả hàng (REJECTED)
 */
const rejectReturn = async (id, staffId, data = {}) => {
  const returnRequest = await getReturnDetail(id);

  if (returnRequest.status === ReturnStatus.APPROVED) {
    const error = new Error("Phiếu yêu cầu này đã được duyệt, không thể từ chối");
    error.status = 400;
    throw error;
  }

  const updatedRequest = await prisma.returnRequest.update({
    where: { id },
    data: {
      status: ReturnStatus.REJECTED,
      reviewedBy: staffId,
      reviewedAt: new Date(),
      adminNote: data.adminNote || "Từ chối yêu cầu đổi trả",
    },
    include: {
      aiInspection: true,
      refund: true,
    },
  });

  return {
    returnRequest: updatedRequest,
    message: "Đã từ chối yêu cầu trả hàng thành công",
  };
};

/**
 * 9. Staff cập nhật trạng thái tiến độ (WAITING_FOR_PICKUP, WAREHOUSE_INSPECTING, RETURNING_TO_CUSTOMER, ITEM_RETURNED_TO_CUSTOMER, REJECTED)
 */
/* const updateReturnStatus = async (id, staffId, data) => {
  const { status } = data;
  await getReturnDetail(id);

  return await prisma.returnRequest.update({
    where: { id },
    data: { status },
    include: {
      aiInspection: true,
      // warehouseVerification: true,
      // refund: true,
    },
  });
};

/**
 * 10. Nhân viên kho nộp kết quả soi bình thực tế (Warehouse Verification)
 * Trạng thái vẫn là WAREHOUSE_INSPECTING hoặc giữ nguyên, chờ khách bấm quyết định (customerFinalDecision)
 */
const verifyWarehouse = async (id, inspectorId, data) => {
  const returnRequest = await getReturnDetail(id);

  if (returnRequest.status !== ReturnStatus.WAREHOUSE_INSPECTING) {
    const error = new Error(
      "Phiếu trả hàng phải ở trạng thái WAREHOUSE_INSPECTING mới có thể thực hiện kiểm định tại kho"
    );
    error.status = 400;
    throw error;
  }

  if (returnRequest.warehouseVerification) {
    const error = new Error("Phiếu này đã được ghi nhận kiểm định kho trước đó");
    error.status = 400;
    throw error;
  }

  const verification = await prisma.warehouseVerification.create({
    data: {
      returnRequestId: id,
      inspectorId,
      matchesAiImages: data.matchesAiImages,
      finalRefundOffer: data.finalRefundOffer,
      warehouseNote: data.warehouseNote,
      customerFinalDecision: null, // Đang chờ khách hàng quyết định
    },
  });

  return {
    verification,
    message:
      "Đã ghi nhận kết quả kiểm định kho thành công. Đang chờ khách hàng phản hồi quyết định cuối cùng.",
  };
};

/**
 * 11. Kế toán/Staff xác nhận đã chuyển tiền + Upload ảnh bill biên lai -> Hoàn tất (COMPLETED)
 */
const completeRefund = async (id, staffId, refundData) => {
  const returnRequest = await getReturnDetail(id);

  if (returnRequest.status !== ReturnStatus.AWAITING_REFUND) {
    const error = new Error(
      "Hồ sơ trả hàng phải ở trạng thái AWAITING_REFUND mới có thể xác nhận hoàn tiền"
    );
    error.status = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const refundRecord = await tx.refund.upsert({
      where: { returnRequestId: id },
      update: {
        proofImageUrl: refundData.proofImageUrl,
        refundAmount:
          refundData.refundAmount ||
          returnRequest.warehouseVerification?.finalRefundOffer ||
          0,
        performedBy: staffId,
        transferredAt: new Date(),
      },
      create: {
        returnRequestId: id,
        proofImageUrl: refundData.proofImageUrl,
        refundAmount:
          refundData.refundAmount ||
          returnRequest.warehouseVerification?.finalRefundOffer ||
          0,
        performedBy: staffId,
        transferredAt: new Date(),
      },
    });

    const completedRequest = await tx.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.COMPLETED },
      include: {
        refund: true,
        warehouseVerification: true,
        aiInspection: true,
      },
    });

    return {
      completedRequest,
      refundRecord,
      message: "Hoàn tiền thành công. Hồ sơ trả hàng đã hoàn tất.",
    };
  });
};


const lookupOrderByCode = async (orderCode) => {
  return await prisma.order.findFirst({
    where: { orderCode: { equals: orderCode, mode: 'insensitive' } },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      orderDetails: {
        include: {
          product: { select: { id: true, name: true, isReturnable: true } },
          variant: { include: { images: { take: 1 } } },
          returnRequests: { select: { id: true, returnCode: true, status: true } },
        },
      },
    },
  });
};

module.exports = {
  lookupOrderByCode,
  // Customer methods
  getEligibleItemsForReturn,
  initiateReturn,
  submitAiInspection,
  getMyReturns,
  getMyReturnDetail,
  // submitFinalDecision,

  // Staff / Admin methods
  getAllReturns,
  getReturnDetail,
  approveReturn,
  rejectReturn,
  // updateReturnStatus,
  // verifyWarehouse,
  // completeRefund,

  // Aliases for compatibility
  getMyReturnRequests: getMyReturns,
  // submitCustomerFinalDecision: submitFinalDecision,
  getAllReturnRequestsForStaff: getAllReturns,
  getReturnDetailForStaff: getReturnDetail,
  approveReturnForStaff: approveReturn,
  rejectReturnForStaff: rejectReturn,
  // staffUpdateReturnStatus: updateReturnStatus,
  // submitWarehouseVerification: verifyWarehouse,
};

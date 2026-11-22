const returnService = require("./return.service");

// ==========================================
// 1. DÀNH CHO ADMIN & STAFF (QUẢN TRỊ & KHO)
// ==========================================

// Staff xem danh sách toàn bộ phiếu trả hàng
const getAllReturns = async (req, res, next) => {
  try {
    const list = await returnService.getAllReturns(req.query);
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

// Staff xem chi tiết 1 phiếu trả hàng
const getReturnDetail = async (req, res, next) => {
  try {
    const detail = await returnService.getReturnDetail(req.params.id);
    res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};

// Staff duyệt yêu cầu trả hàng (APPROVED) -> INSERT INTO Refund
const approveReturn = async (req, res, next) => {
  try {
    const staffId = req.user?.userId || req.user?.id || 'STAFF_DIRECT';
    const result = await returnService.approveReturn(req.params.id, staffId, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Staff từ chối yêu cầu trả hàng (REJECTED)
const rejectReturn = async (req, res, next) => {
  try {
    const staffId = req.user?.userId || req.user?.id || 'STAFF_DIRECT';
    const result = await returnService.rejectReturn(req.params.id, staffId, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// // Staff cập nhật trạng thái tiến độ (TẠM ĐÓNG)
// const updateReturnStatus = async (req, res, next) => {
//   try {
//     const staffId = req.user.userId || req.user.id;
//     const updated = await returnService.updateReturnStatus(
//       req.params.id,
//       staffId,
//       req.body
//     );
//     res.status(200).json({
//       success: true,
//       message: "Cập nhật trạng thái phiếu trả hàng thành công",
//       data: updated,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Nhân viên kho nộp kết quả soi bình thực tế (TẠM ĐÓNG)
// const verifyWarehouse = async (req, res, next) => {
//   try {
//     const inspectorId = req.user.userId || req.user.id;
//     const result = await returnService.verifyWarehouse(
//       req.params.id,
//       inspectorId,
//       req.body
//     );
//     res.status(200).json({
//       success: true,
//       message: result.message,
//       data: result.verification,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // Kế toán/Staff xác nhận hoàn tiền thành công + tải ảnh bill (TẠM ĐÓNG)
// const completeRefund = async (req, res, next) => {
//   try {
//     const staffId = req.user.userId || req.user.id;
//     const result = await returnService.completeRefund(
//       req.params.id,
//       staffId,
//       req.body
//     );
//     res.status(200).json({
//       success: true,
//       message: result.message,
//       data: result.completedRequest,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// ==========================================
// 2. DÀNH CHO CUSTOMER (KHÁCH HÀNG)
// ==========================================

// Khách xem các món đủ điều kiện trả
const getEligibleItems = async (req, res, next) => {
  try {
    const customerId = req.user.userId || req.user.id;
    const items = await returnService.getEligibleItemsForReturn(customerId);
    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// Khách bấm tạo yêu cầu trả hàng
const initiateReturn = async (req, res, next) => {
  try {
    const customerId = req.user?.userId || req.user?.id || req.body?.customerId || null;
    const result = await returnService.initiateReturn(customerId, req.body);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Khách nộp kết quả Module 4 AI + Quyết định sơ bộ
const submitAiInspection = async (req, res, next) => {
  try {
    const customerId = req.user?.userId || req.user?.id || req.body?.customerId || null;
    const result = await returnService.submitAiInspection(
      customerId,
      req.params.id,
      req.body
    );
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.updatedReturnRequest,
    });
  } catch (error) {
    next(error);
  }
};

// // Khách đưa ra quyết định cuối cùng sau khi xem kết quả kiểm định kho (TẠM ĐÓNG)
// const submitFinalDecision = async (req, res, next) => {
//   try {
//     const customerId = req.user.userId || req.user.id;
//     const result = await returnService.submitFinalDecision(
//       customerId,
//       req.params.id,
//       req.body
//     );
//     res.status(200).json({
//       success: true,
//       message: result.message,
//       data: result.updated,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// Khách xem danh sách phiếu trả hàng của mình
const getMyReturns = async (req, res, next) => {
  try {
    const customerId = req.user.userId || req.user.id;
    const list = await returnService.getMyReturns(customerId);
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

// Khách xem chi tiết 1 phiếu trả hàng của mình
const getMyReturnDetail = async (req, res, next) => {
  try {
    const customerId = req.user.userId || req.user.id;
    const detail = await returnService.getMyReturnDetail(
      customerId,
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};


const lookupOrderByCode = async (req, res, next) => {
  try {
    const order = await returnService.lookupOrderByCode(req.params.orderCode);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Khong tim thay don hang' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  lookupOrderByCode,
  // Admin / Staff
  getAllReturns,
  getReturnDetail,
  approveReturn,
  rejectReturn,
  // updateReturnStatus,
  // verifyWarehouse,
  // completeRefund,

  // Customer (Đến bước submit ticket)
  getEligibleItems,
  initiateReturn,
  submitAiInspection,
  // submitFinalDecision,
  getMyReturns,
  getMyReturnDetail,

  // Aliases for backward compatibility
  getAllReturnRequestsForStaff: getAllReturns,
  getReturnDetailForStaff: getReturnDetail,
  // staffUpdateReturnStatus: updateReturnStatus,
  // submitWarehouseVerification: verifyWarehouse,
  // submitCustomerFinalDecision: submitFinalDecision,
  getMyReturnRequests: getMyReturns,
};

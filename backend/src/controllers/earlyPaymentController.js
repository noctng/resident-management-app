/**
 * earlyPaymentController — MỎNG (Clean Architecture).
 *
 * Chỉ: parse req → gọi service → format res.
 * KHÔNG import prisma/pg trực tiếp.
 * logActivity là util logger (không phải DB client) → giữ ở controller.
 */
const svc = require('../services/earlyPaymentService');
const { logActivity } = require('../utils/logger');

exports.processEarlyPayment = async (req, res) => {
  try {
    const { id } = req.params; // contract_id
    const { discountPercent } = req.body;

    const result = await svc.processEarlyPayment(id, { discountPercent }, req.user);

    await logActivity(
      req.user,
      'THANH_TOÁN_SỚM',
      'CONTRACT',
      id,
      result.contractCode,
      `Thanh toán sớm toàn bộ dư nợ. Tổng thu: ${result.finalPaid.toLocaleString('vi-VN')}`
    );

    res.json({
      message: 'Thanh toán sớm thành công',
      details: {
        originalTotal: result.originalTotal,
        discount: result.discount,
        finalPaid: result.finalPaid,
      },
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ khi xử lý thanh toán sớm' });
  }
};

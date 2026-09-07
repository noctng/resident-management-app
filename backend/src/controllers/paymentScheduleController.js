/**
 * paymentScheduleController — MỎNG (Clean Architecture).
 *
 * Chỉ parse req → gọi service → format res.
 * KHÔNG import prisma/pg trực tiếp.
 */
const svc = require('../services/paymentScheduleService');
const { logActivity } = require('../utils/logger');

exports.listByContract = async (req, res) => {
  try {
    const schedules = await svc.listByContract(req.params.contractId);
    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy lịch thanh toán' });
  }
};

exports.markPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const paidAt = body.paid_at ? new Date(body.paid_at) : new Date();

    const updated = await svc.markSchedulePaid(id, {
      paidAmount: body.paid_amount,
      paidAt,
      paymentMethod: body.payment_method || 'MANUAL',
      transactionRef: body.transaction_ref,
      userId: req.user?.id,
    });

    await logActivity(
      req.user,
      'CONFIRM_PAYMENT',
      'PAYMENT_SCHEDULE',
      id,
      updated.scheduleName || id,
      `Xác nhận thanh toán lịch đợt: ${Number(body.paid_amount || 0).toLocaleString('vi-VN')} VNĐ`
    );

    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ khi cập nhật thanh toán' });
  }
};

exports.reconcile = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const matched = await svc.reconcilePayment(id, {
      referenceCode: body.reference_code,
      gateway: body.gateway,
      amount: body.amount,
      transactionDate: body.transaction_date ? new Date(body.transaction_date) : new Date(),
    });

    if (!matched) {
      return res.status(404).json({ message: 'Không tìm thấy đợt thanh toán phù hợp để đối soát' });
    }

    await logActivity(
      req.user,
      'RECONCILE_PAYMENT',
      'PAYMENT_SCHEDULE',
      matched.id,
      matched.scheduleName || id,
      `Đối soát thanh toán từ SePay ${matched.gateway || ''} ${Number(matched.amount || 0).toLocaleString('vi-VN')} VNĐ`
    );

    res.json({ message: 'Đối soát thành công', matched });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ khi đối soát thanh toán' });
  }
};

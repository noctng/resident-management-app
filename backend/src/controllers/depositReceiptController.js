const { logActivity } = require('../utils/logger');
const svc = require('../services/depositReceiptService');

// Controller MỎNG: parse req → gọi service → format res.
// KHÔNG truy cập DB trực tiếp (Clean Architecture: chỉ qua service/repo).
// Giữ NGUYÊN response shape / status code / route path / auth của các endpoint cũ.

/**
 * 1. Get All Deposit Receipts (PDC)
 */
exports.getDeposits = async (req, res) => {
  try {
    const { phase, status = 'ALL', search } = req.query;
    const result = await svc.getDeposits({ phase, status, search });
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy danh sách phiếu đặt cọc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Deposit Receipt (PDC) - Sale initiates
 */
exports.createDepositReceipt = async (req, res) => {
  try {
    const result = await svc.createDepositReceipt(req.body, req.user);

    const da = Number(req.body.deposit_amount || 100000000).toLocaleString('vi-VN');
    await logActivity(
      req.user,
      'LẬP_PHIẾU_ĐẶT_CỌC',
      'DEPOSIT',
      result.id,
      result.deposit_code,
      `Lập phiếu đặt cọc ${result.deposit_code} cho căn ${result.apartments?.code} (${da} VNĐ)`
    );

    res.status(201).json({
      success: true,
      message: `Lập phiếu đặt cọc thành công: ${result.deposit_code}`,
      deposit: result,
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('Lỗi lập phiếu đặt cọc:', err);
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 3. Confirm Deposit Payment (Kế toán xác nhận tiền về)
 */
exports.confirmPayment = async (req, res) => {
  try {
    const updated = await svc.confirmPayment(req.params.id, req.body, req.user);

    const newPaid = req.body.paid_amount
      ? Number(req.body.paid_amount)
      : Number(updated.deposit_amount);
    const confirmedBy = req.user?.username || req.user?.name || 'Kế toán';
    await logActivity(
      req.user,
      'XÁC_NHẬN_TIỀN_CỌC',
      'DEPOSIT',
      updated.id,
      updated.deposit_code,
      `Kế toán ${confirmedBy} xác nhận đã thu đủ tiền cọc ${newPaid.toLocaleString(
        'vi-VN'
      )} VNĐ cho căn ${updated.apartments?.code}`
    );

    res.json({
      success: true,
      message: `Đã xác nhận thu đủ tiền cọc cho phiếu ${updated.deposit_code}`,
      deposit: updated,
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('Lỗi xác nhận tiền cọc:', err);
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 4. Transfer Deposit to another unit (Cọc chuyển căn)
 */
exports.transferDeposit = async (req, res) => {
  try {
    const { oldAptCode, newAptCode } = await svc.transferDeposit(req.params.id, req.body);

    const transferReason = req.body.transfer_reason || 'Chuyển căn';
    await logActivity(
      req.user,
      'CHUYỂN_CỌC_BĐS',
      'DEPOSIT',
      req.params.id,
      req.body.deposit_code || '',
      `Chuyển tiền cọc từ căn ${oldAptCode} sang căn ${newAptCode}. Lý do: ${transferReason}`
    );

    res.json({
      success: true,
      message: `Đã chuyển tiền cọc thành công từ căn ${oldAptCode} sang căn ${newAptCode}`,
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('Lỗi chuyển cọc:', err);
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 5. Refund or Forfeit Deposit (Duyệt Hoàn cọc / Tịch cọc)
 */
exports.resolveDepositOutcome = async (req, res) => {
  try {
    const { action, depositCode, apartmentCode } = await svc.resolveDepositOutcome(
      req.params.id,
      req.body,
      req.user
    );

    const approvedBy = req.user?.username || req.user?.name || 'Ban Lãnh Đạo';
    await logActivity(
      req.user,
      action === 'REFUND' ? 'HOÀN_TIỀN_CỌC' : 'TỊCH_THU_CỌC',
      'DEPOSIT',
      req.params.id,
      depositCode,
      `${action === 'REFUND' ? 'Hoàn cọc' : 'Tịch cọc'} phiếu ${depositCode} căn ${apartmentCode}. Duyệt bởi: ${approvedBy}`
    );

    res.json({
      success: true,
      message: `Đã thực hiện ${
        action === 'REFUND' ? 'hoàn cọc' : 'tịch cọc'
      } và giải phóng căn ${apartmentCode} về trạng thái Sẵn bán`,
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('Lỗi giải quyết kết quả cọc:', err);
    res.status(status).json({ success: false, message: err.message });
  }
};

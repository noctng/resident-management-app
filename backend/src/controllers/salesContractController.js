const svc = require('../services/salesContractService');
const { logActivity } = require('../utils/logger');

// Controller MỎNG: parse req → gọi service → res.
// KHÔNG import prisma (Clean Architecture rule). Mọi truy vấn DB nằm ở repository/service.
// Giữ NGUYÊN response shape, status code, route path/method/auth của controller gốc.

/**
 * 1. Create Standard Sales Contract (HĐMB 18 Điều + LTT 10 Đợt Chuẩn)
 */
exports.createStandardContract = async (req, res) => {
  try {
    const result = await svc.createStandardContract(req.body);

    await logActivity(
      req.user,
      'KÝ_HỢP_ĐỒNG_MUA_BÁN',
      'CONTRACT',
      result.contract.id,
      result.contract.contract_code,
      `Ký HĐMB ${result.contract.contract_code} cho khách ${result.customerName} căn ${result.unitCode}. Giá trị: ${result.contract.total_value.toLocaleString('vi-VN')} VNĐ`
    );

    res.status(201).json({
      success: true,
      message: `Lập Hợp đồng Mua Bán thành công: ${result.contract.contract_code}`,
      contract: result.contract,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

/**
 * 2. Get Full Contract Details (18 Articles + 3 Annexes + 10 Installments)
 */
exports.getContractFull = async (req, res) => {
  try {
    const result = await svc.getContractFull(req.params.id);

    res.json({
      success: true,
      contract: result,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

/**
 * 3. Transfer Contract (Chuyển nhượng kế thừa 100% LTT theo Luật KDBĐS 2023)
 */
exports.transferContract = async (req, res) => {
  try {
    const result = await svc.transferContract({ id: req.params.id, ...req.body });

    await logActivity(
      req.user,
      'CHUYỂN_NHƯỢNG_HĐMB',
      'CONTRACT',
      result.contractId,
      result.contractCode,
      `Chuyển nhượng HĐMB ${result.contractCode} từ ${result.oldCustomerName} sang ${result.customerName}. Kế thừa ${result.inheritedPaid.toLocaleString('vi-VN')} VNĐ đã đóng.`
    );

    res.json({
      success: true,
      message: `Chuyển nhượng hợp đồng thành công sang khách hàng ${result.customerName}! Toàn bộ LTT được kế thừa nguyên vẹn.`,
      transfer: result.transfer,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

const svc = require('../services/commissionService');

// Controller MỎNG: chỉ parse req → gọi service → format res.
// KHÔNG import prisma (mọi truy vấn DB đã chuyển vào repository/service).
// Giữ nguyên response shape / status code / route path so với controller cũ.

/**
 * 1. Get Commission Policies
 */
exports.getPolicies = async (req, res) => {
  try {
    const { beneficiary_type, status } = req.query;
    const result = await svc.getPolicies({ beneficiary_type, status });
    res.json({ success: true, policies: result.policies, totalCount: result.totalCount });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Commission Policy
 */
exports.createPolicy = async (req, res) => {
  try {
    const result = await svc.createPolicy(req.body, req.user);
    res.status(201).json({ success: true, message: result.message, policy: result.policy });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 3. Get Commissions (Bảng kê hoa hồng theo HĐMB)
 */
exports.getCommissions = async (req, res) => {
  try {
    const { beneficiary_type, status, search } = req.query;
    const result = await svc.getCommissions({ beneficiary_type, status, search });
    res.json({
      success: true,
      commissions: result.commissions,
      totalCount: result.totalCount,
      stats: result.stats,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 4. Generate Commission for a Contract (Tự động hoặc thủ công)
 */
exports.generateCommission = async (req, res) => {
  try {
    const result = await svc.generateCommission(req.body, req.user);
    res.status(201).json({ success: true, message: result.message, commission: result.commission });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 5. Approve Commission (Duyệt chi hoa hồng)
 */
exports.approveCommission = async (req, res) => {
  try {
    const result = await svc.approveCommission(req.params.id, req.body, req.user);
    res.json({ success: true, message: result.message, commission: result.commission });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 6. Create Commission Payout (Giải ngân chi trả hoa hồng)
 */
exports.createPayout = async (req, res) => {
  try {
    const result = await svc.createPayout(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      message: result.message,
      payout: result.payout,
      updatedCommission: result.updatedCommission,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

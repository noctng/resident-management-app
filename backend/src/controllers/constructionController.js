const svc = require('../services/constructionService');

// Controller MỎNG: chỉ parse req → gọi service → format res.
// KHÔNG import prisma (mọi truy vấn DB đã chuyển vào repository/service).
// Giữ nguyên response shape / status code / route path so với controller cũ.

/**
 * 1. Get Construction Registrations & Financial Deposit Stats
 */
exports.getRegistrations = async (req, res) => {
  try {
    const { phase, status, deposit_status, search } = req.query;
    const result = await svc.getRegistrations({ phase, status, deposit_status, search });
    res.json({
      success: true,
      registrations: result.registrations,
      stats: result.stats,
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách hồ sơ thi công:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Construction Registration (Enforces 6-month rule & 100M deposit)
 */
exports.createRegistration = async (req, res) => {
  try {
    const result = await svc.createRegistration(req.body, req.user);
    res.status(201).json({
      success: true,
      message: result.message,
      registration: result.registration,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 3. Confirm Deposit Receipt (100,000,000 VND)
 */
exports.confirmDeposit = async (req, res) => {
  try {
    const result = await svc.confirmDeposit(req.params.id, req.body, req.user);
    res.json({
      success: true,
      message: result.message,
      registration: result.registration,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 4. Record Construction Violation & Deduct Deposit (Rule E.5.6)
 */
exports.createViolation = async (req, res) => {
  try {
    const result = await svc.createViolation(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      message: result.message,
      violation: result.violation,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 5. Add Worker & Issue Temporary Pass
 */
exports.addWorker = async (req, res) => {
  try {
    const result = await svc.addWorker(req.params.id, req.body);
    res.status(201).json({
      success: true,
      message: result.message,
      worker: result.worker,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 6. Settle Registration & Refund Deposit
 */
exports.settleRegistration = async (req, res) => {
  try {
    const result = await svc.settleRegistration(req.params.id, req.body, req.user);
    res.json({
      success: true,
      message: result.message,
      registration: result.registration,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

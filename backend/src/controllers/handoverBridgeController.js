/**
 * handoverBridgeController — MỎNG: parse req → gọi service → res.
 * KHÔNG import prisma/pg trực tiếp.
 * logActivity được gọi trong service (cross-module side-effect, giữ nguyên).
 */
const svc = require('../services/handoverBridgeService');

/** 1. Get Handover & Snag List for a Contract / Apartment */
exports.getHandoverDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await svc.getHandoverDetails(id);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/** 2. Add Snag Item (Biên bản ghi nhận lỗi kỹ thuật) */
exports.addSnagItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await svc.addSnagItem(id, req.body);
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/** 3. Resolve Snag Item (Xác nhận sửa xong lỗi) */
exports.resolveSnagItem = async (req, res) => {
  try {
    const { snagId } = req.params;
    const result = await svc.resolveSnagItem(snagId, req.body);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/** 4. COMPLETE HANDOVER & ACTIVATE AUTOMATIC OPERATIONS BRIDGE (B.9) */
exports.completeHandoverBridge = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await svc.completeHandoverBridge(id, req.body, req.user);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/** 5. EXECUTIVE CRM & BUSINESS KPI METRICS (B.10) */
exports.getExecutiveKpiMetrics = async (req, res) => {
  try {
    const result = await svc.getExecutiveKpiMetrics();
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

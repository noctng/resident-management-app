const svc = require('../services/approvalLimitService');

exports.getApprovalLimits = async (req, res) => {
  try {
    const limits = await svc.getApprovalLimits();
    res.json({ success: true, limits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateApprovalLimits = async (req, res) => {
  try {
    const { limits } = req.body;
    const updated = await svc.updateApprovalLimits(limits);
    res.json({ success: true, message: 'Đã cập nhật hạn mức phê duyệt', limits: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkRequirement = async (req, res) => {
  try {
    const { role, discount_pct } = req.query;
    const result = svc.checkApprovalRequirement(role, Number(discount_pct || 0));
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.requestPromotionApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { requested_discount_pct } = req.body;
    const result = await svc.requestPromotionApproval(id, requested_discount_pct, req.user);
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

exports.approvePromotionRequest = async (req, res) => {
  try {
    const { approvalId } = req.params;
    const result = await svc.approvePromotionRequest(approvalId, req.user);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

exports.rejectPromotionRequest = async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { reason } = req.body;
    const result = await svc.rejectPromotionRequest(approvalId, reason, req.user);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

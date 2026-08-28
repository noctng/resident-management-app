const svc = require('../services/warrantyService');

/**
 * Controller MỎNG (Clean Architecture): chỉ parse req → gọi service → format res.
 * KHÔNG import prisma trực tiếp (mọi I/O DB nằm ở repository/service).
 */

// 1. Get Warranty Claims & 4 KPI Stats
exports.getWarrantyClaims = async (req, res) => {
  try {
    const result = await svc.getWarrantyClaims(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

// 2. Create Warranty Claim
exports.createWarrantyClaim = async (req, res) => {
  try {
    const result = await svc.createWarrantyClaim(req.body, {
      user: req.user,
      resident: req.resident,
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

// 3. Assign Contractor & Schedule Repair
exports.assignContractor = async (req, res) => {
  try {
    const result = await svc.assignContractor(req.params.id, req.body, { user: req.user });
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

// 4. Complete Warranty Claim (Acceptance & Rating)
exports.completeWarrantyClaim = async (req, res) => {
  try {
    const result = await svc.completeWarrantyClaim(req.params.id, req.body, { user: req.user });
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

// 5. Get Contractors Directory & Quality Score
exports.getContractors = async (req, res) => {
  try {
    const result = await svc.getContractors();
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

// 6. Create Contractor
exports.createContractor = async (req, res) => {
  try {
    const result = await svc.createContractor(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

// 7. Update Contractor
exports.updateContractor = async (req, res) => {
  try {
    const result = await svc.updateContractor(req.params.id, req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

// 8. Delete / Deactivate Contractor
exports.deleteContractor = async (req, res) => {
  try {
    const result = await svc.deleteContractor(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ' });
  }
};

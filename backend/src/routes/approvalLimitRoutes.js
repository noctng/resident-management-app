const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/approvalLimitController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

// GET /api/crm/approval-limits — danh sách hạn mức
router.get('/', auth, ctrl.getApprovalLimits);

// PUT /api/crm/approval-limits — cập nhật hạn mức
router.put('/', auth, ctrl.updateApprovalLimits);

// GET /api/crm/approval-limits/check — kiểm tra điều kiện cần duyệt
router.get('/check', auth, ctrl.checkRequirement);

// POST /api/crm/promotions/:id/request-approval — tạo yêu cầu duyệt chiết khấu
router.post('/promotions/:id/request-approval', auth, ctrl.requestPromotionApproval);

// POST /api/crm/approval-limits/promotions/:approvalId/approve — duyệt
router.post('/promotions/approvals/:approvalId/approve', auth, ctrl.approvePromotionRequest);

// POST /api/crm/approval-limits/promotions/:approvalId/reject — từ chối
router.post('/promotions/approvals/:approvalId/reject', auth, ctrl.rejectPromotionRequest);

module.exports = router;

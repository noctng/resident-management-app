const express = require('express');
const router = express.Router();
const warrantyController = require('../controllers/warrantyController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { auditLog } = require('../middleware/auditLogMiddleware');

// Admin/Staff routes — require permission 'operations' or fallback to 'residents'
const adminAuth = [authenticateToken, checkPermission(['operations', 'residents'])];

// Resident Portal & Admin: GET warranty claims (filtered by apartment for residents, full for staff)
router.get('/', authenticateToken, warrantyController.getWarrantyClaims);

// Resident Portal & Admin: POST new warranty claim
router.post(
  '/',
  [
    authenticateToken,
    auditLog('CREATE_WARRANTY_CLAIM', 'WarrantyClaim', (req, resBody) => ({
      targetId: resBody?.claim?.id,
      targetName: resBody?.claim?.claim_code,
      details: `Tạo yêu cầu bảo hành ${resBody?.claim?.claim_code} (${req.body?.category})`,
    })),
  ],
  warrantyController.createWarrantyClaim
);

// Admin-only: Assign contractor
router.patch(
  '/:id/assign',
  [
    adminAuth,
    auditLog('ASSIGN_WARRANTY_CONTRACTOR', 'WarrantyClaim', (req, resBody) => ({
      targetId: req.params.id,
      details: `Điều phối nhà thầu xử lý bảo hành (Claim ID: ${req.params.id})`,
    })),
  ],
  warrantyController.assignContractor
);

// Resident & Admin: Complete warranty claim (acceptance & rating)
router.patch(
  '/:id/complete',
  [
    authenticateToken,
    auditLog('COMPLETE_WARRANTY_CLAIM', 'WarrantyClaim', (req, resBody) => ({
      targetId: req.params.id,
      details: `Nghiệm thu & hoàn thành bảo hành (Claim ID: ${req.params.id}, Đánh giá: ${req.body?.customer_rating || 5} sao)`,
    })),
  ],
  warrantyController.completeWarrantyClaim
);

// Contractor management — admin/operations staff
router.get('/contractors', adminAuth, warrantyController.getContractors);
router.post('/contractors', adminAuth, warrantyController.createContractor);
router.put('/contractors/:id', adminAuth, warrantyController.updateContractor);
router.delete('/contractors/:id', adminAuth, warrantyController.deleteContractor);

module.exports = router;

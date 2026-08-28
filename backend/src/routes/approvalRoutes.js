const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

// Create approval request
router.post(
    '/',
    [authenticateToken, checkPermission('crm')],
    approvalController.createApprovalRequest
);

// Get pending approvals
router.get(
    '/pending',
    [authenticateToken, checkPermission('crm_approve')],
    approvalController.getPendingApprovals
);

// Get approvals for a contract
router.get('/contract/:contractId', authenticateToken, approvalController.getContractApprovals);

// Approve request
router.post(
    '/:id/approve',
    [authenticateToken, checkPermission('crm_approve')],
    approvalController.approveRequest
);

// Reject request
router.post(
    '/:id/reject',
    [authenticateToken, checkPermission('crm_approve')],
    approvalController.rejectRequest
);

module.exports = router;

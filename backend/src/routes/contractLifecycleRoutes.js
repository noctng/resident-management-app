const express = require('express');
const router = express.Router();
const lifecycleController = require('../controllers/contractLifecycleController');
const handoverController = require('../controllers/handoverController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

/**
 * Contract Lifecycle Routes
 */

// Deposit
router.post(
    '/:id/lifecycle/deposit',
    [authenticateToken, checkPermission('crm')],
    lifecycleController.recordDeposit
);

// Sign contract
router.post(
    '/:id/lifecycle/sign',
    [authenticateToken, checkPermission('crm')],
    lifecycleController.signContract
);

// Create amendment
router.post(
    '/:id/lifecycle/amend',
    [authenticateToken, checkPermission('crm')],
    lifecycleController.createAmendment
);

// Complete contract
router.post(
    '/:id/lifecycle/complete',
    [authenticateToken, checkPermission('crm')],
    lifecycleController.completeContract
);

// Cancel contract
router.post(
    '/:id/lifecycle/cancel',
    [authenticateToken, checkPermission('crm')],
    lifecycleController.cancelContract
);

// Get lifecycle history
router.get('/:id/lifecycle/history', authenticateToken, lifecycleController.getLifecycleHistory);

/**
 * Handover Routes
 */

// Create handover checklist
router.post(
    '/:id/handover/checklist',
    [authenticateToken, checkPermission('crm')],
    handoverController.createHandoverChecklist
);

// Get handover checklist
router.get('/:id/handover/checklist', authenticateToken, handoverController.getHandoverChecklist);

// Update checklist item
router.put(
    '/handover/checklist/:itemId',
    [authenticateToken, checkPermission('crm')],
    handoverController.updateChecklistItem
);

// Check handover eligibility
router.get(
    '/:id/handover/eligibility',
    authenticateToken,
    handoverController.checkHandoverEligibility
);

// Complete handover
router.post(
    '/:id/handover/complete',
    [authenticateToken, checkPermission('crm')],
    handoverController.completeHandover
);

module.exports = router;

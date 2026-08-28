const express = require('express');
const router = express.Router();
const constructionController = require('../controllers/constructionController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

// Admin/Staff routes — require permission 'operations' or fallback to 'residents'
const adminAuth = [authenticateToken, checkPermission(['operations', 'residents'])];

// Resident Portal: GET own registrations + POST new registration
// (authenticated resident OR staff — both need to be able to submit)
router.get('/', authenticateToken, constructionController.getRegistrations);
router.post('/', authenticateToken, constructionController.createRegistration);

// Admin-only operations: confirm deposit, violations, workers, settlement
router.post('/:id/deposit-confirm', adminAuth, constructionController.confirmDeposit);
router.post('/:id/violations', adminAuth, constructionController.createViolation);
router.post('/:id/workers', authenticateToken, constructionController.addWorker); // resident can add workers to own reg
router.post('/:id/settlement', adminAuth, constructionController.settleRegistration);

module.exports = router;

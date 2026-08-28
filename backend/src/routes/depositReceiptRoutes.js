const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositReceiptController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/', auth, depositController.getDeposits);
router.post('/', auth, depositController.createDepositReceipt);
router.post('/:id/confirm', auth, depositController.confirmPayment);
router.post('/:id/transfer', auth, depositController.transferDeposit);
router.post('/:id/outcome', auth, depositController.resolveDepositOutcome);

module.exports = router;

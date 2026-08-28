const express = require('express');
const router = express.Router();
const propertyTransferController = require('../controllers/propertyTransferController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/check-eligibility/:contractId', auth, propertyTransferController.checkEligibility);
router.get('/', auth, propertyTransferController.getTransfers);
router.get('/:id', auth, propertyTransferController.getTransferDetail);
router.post('/', auth, propertyTransferController.createTransfer);
router.get('/apartment-chain/:apartmentId', auth, propertyTransferController.getApartmentTransferChain);

module.exports = router;

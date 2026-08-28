const express = require('express');
const router = express.Router();
const salesContractController = require('../controllers/salesContractController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.post('/standard', auth, salesContractController.createStandardContract);
router.get('/:id/full', auth, salesContractController.getContractFull);
router.post('/:id/transfer-inherit', auth, salesContractController.transferContract);

module.exports = router;

const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/policies', auth, commissionController.getPolicies);
router.post('/policies', auth, commissionController.createPolicy);
router.get('/', auth, commissionController.getCommissions);
router.post('/generate', auth, commissionController.generateCommission);
router.post('/:id/approve', auth, commissionController.approveCommission);
router.post('/:id/payout', auth, commissionController.createPayout);

module.exports = router;

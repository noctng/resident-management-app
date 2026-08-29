const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  createCommissionPolicySchema,
  generateCommissionSchema,
  approveCommissionSchema,
  createPayoutSchema,
} = require('../schemas/commissionSchemas');

const auth = [authenticateToken, checkPermission('crm')];

// Commission Policies
router.get('/policies', auth, commissionController.getPolicies);
router.post('/policies', auth, validate(createCommissionPolicySchema), commissionController.createPolicy);

// Commissions
router.get('/', auth, commissionController.getCommissions);
router.post('/generate', auth, validate(generateCommissionSchema), commissionController.generateCommission);
router.post('/:id/approve', auth, validate(approveCommissionSchema), commissionController.approveCommission);
router.post('/:id/payout', auth, validate(createPayoutSchema), commissionController.createPayout);

module.exports = router;

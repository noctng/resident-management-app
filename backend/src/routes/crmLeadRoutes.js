const express = require('express');
const router = express.Router();
const leadController = require('../controllers/crmLeadController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/', auth, leadController.getLeads);
router.post('/', auth, leadController.createLead);
router.put('/:id', auth, leadController.updateLead);
router.post('/:id/convert', auth, leadController.convertLead);
router.delete('/:id', auth, leadController.deleteLead);

module.exports = router;

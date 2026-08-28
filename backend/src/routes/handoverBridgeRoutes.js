const express = require('express');
const router = express.Router();
const handoverBridgeController = require('../controllers/handoverBridgeController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/:id', auth, handoverBridgeController.getHandoverDetails);
router.post('/:id/snags', auth, handoverBridgeController.addSnagItem);
router.post('/snags/:snagId/resolve', auth, handoverBridgeController.resolveSnagItem);
router.post('/:id/complete-bridge', auth, handoverBridgeController.completeHandoverBridge);
router.get('/analytics/executive-kpis', auth, handoverBridgeController.getExecutiveKpiMetrics);

module.exports = router;

const express = require('express');
const router = express.Router();
const executiveAnalyticsController = require('../controllers/executiveAnalyticsController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Executive analytics is admin-only (sensitive financial KPI data)
const auth = [authenticateToken, isAdmin];

router.get('/overview', auth, executiveAnalyticsController.getOverview);
router.get('/sales-funnel', auth, executiveAnalyticsController.getSalesFunnel);
router.get('/financial-aging', auth, executiveAnalyticsController.getFinancialAging);
router.get('/operations-sla', auth, executiveAnalyticsController.getOperationsSla);
router.get('/community-occupancy', auth, executiveAnalyticsController.getCommunityOccupancy);
router.get('/export-excel', auth, executiveAnalyticsController.exportExecutiveReport);

module.exports = router;

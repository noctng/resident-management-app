const express = require('express');
const router = express.Router();
const debtDashboardController = require('../controllers/debtDashboardController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authenticateToken);
router.use(isAdmin);

// Get apartment debt summary
router.get('/apartment-debt', debtDashboardController.getApartmentDebtSummary);

// Get monthly revenue summary
router.get('/monthly-revenue', debtDashboardController.getMonthlyRevenueSummary);

// Get overall statistics
router.get('/stats', debtDashboardController.getOverallStats);

// Get top debtors
router.get('/top-debtors', debtDashboardController.getTopDebtors);

// Get payment trends
router.get('/payment-trends', debtDashboardController.getPaymentTrends);

// Get debt heatmap
router.get('/debt-heatmap', debtDashboardController.getDebtHeatmap);

// Get recent payments
router.get('/recent-payments', debtDashboardController.getRecentPayments);

module.exports = router;

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

// Residents Report
router.get(
    '/residents',
    [authenticateToken, checkPermission('residents')],
    reportController.exportResidents
);

// Apartments Report
router.get(
    '/apartments',
    [authenticateToken, checkPermission('apartments')],
    reportController.exportApartments
);

// Utility Report
router.get(
    '/utility',
    [authenticateToken, checkPermission('utilities')],
    reportController.exportUtility
);

// Unified Billing Report
router.get(
    '/unified-billing',
    [authenticateToken, checkPermission('utilities')],
    reportController.exportUnifiedBilling
);

// Contracts Report
router.get(
    '/contracts',
    [authenticateToken, checkPermission('crm')],
    reportController.exportContracts
);

// Revenue Report Routes
router.get('/revenue', authenticateToken, reportController.getRevenueReport);
router.post(
    '/revenue/export',
    [authenticateToken, checkPermission('crm')],
    reportController.exportRevenueReport
);

module.exports = router;

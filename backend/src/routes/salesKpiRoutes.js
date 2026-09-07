const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesKpiController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

// GET /api/reports/sales/conversion-funnel
router.get('/conversion-funnel', auth, ctrl.getConversionFunnel);

// GET /api/reports/sales/employee-kpi
router.get('/employee-kpi', auth, ctrl.getEmployeeKpiReport);

// GET /api/reports/sales/export
router.get('/export', auth, ctrl.exportSalesKpiExcel);

module.exports = router;

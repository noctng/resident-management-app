/**
 * paymentScheduleRoutes — lịch thanh toán + reconcile đợt thanh toán.
 *
 * Thêm mới, không đổi contractRoutes/earlyPaymentRoutes hiện có.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentScheduleController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// GET /api/contracts/:contractId/payment-schedules
router.get('/contracts/:contractId/payment-schedules', ctrl.listByContract);

// PUT /api/payment-schedules/:id/mark-paid
router.put('/payment-schedules/:id/mark-paid', ctrl.markPaid);

// POST /api/payment-schedules/:id/reconcile
router.post('/payment-schedules/:id/reconcile', ctrl.reconcile);

module.exports = router;

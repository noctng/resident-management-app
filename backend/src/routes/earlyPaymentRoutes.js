/**
 * earlyPaymentRoutes — định tuyến thanh toán sớm.
 *
 * Tách ra từ contractRoutes để tuân thủ route → controller → service → repository.
 * Giữ NGUYÊN path / method / auth của route gốc:
 *   POST /api/contracts/:id/payments/early-payment
 *   POST /api/crm/contracts/:id/payments/early-payment
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/earlyPaymentController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

// Early Payment — xử lý thanh toán sớm toàn bộ dư nợ
router.post('/:id/payments/early-payment', auth, ctrl.processEarlyPayment);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    getUnifiedBilling,
    getUnifiedBillingHistory,
    sendCombinedBillNotification,
    sendBulkCombinedBillNotification,
    generateBatchCombinedQRCodeZip,
    previewCombinedBillNotification,
    updateCombinedPaymentStatus,
} = require('../controllers/unifiedBillingController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { auditLog } = require('../middleware/auditLogMiddleware');

const staffAuth = [authenticateToken, checkPermission('unified_billing')];

// Get unified billing history for a specific apartment (accessible by both resident & admin)
router.get('/history/:apartment_id', authenticateToken, getUnifiedBillingHistory);

// Staff/Admin routes
router.get('/', staffAuth, getUnifiedBilling);
router.post(
    '/notify',
    [
        staffAuth,
        auditLog('SEND_UNIFIED_BILL_NOTIFICATION', 'UnifiedBill', (req) => ({
            details: `Gửi thông báo hóa đơn tổng hợp cho căn hộ ID: ${req.body?.apartment_id}`,
        })),
    ],
    sendCombinedBillNotification
);
router.post(
    '/notify/bulk',
    [
        staffAuth,
        auditLog('SEND_BULK_BILL_NOTIFICATION', 'UnifiedBill', (req) => ({
            details: `Gửi thông báo hóa đơn hàng loạt (${req.body?.items?.length || 0} căn hộ)`,
        })),
    ],
    sendBulkCombinedBillNotification
);
router.post('/batch-qr-zip', staffAuth, generateBatchCombinedQRCodeZip);
router.post('/notify/preview', staffAuth, previewCombinedBillNotification);
router.put(
    '/payment-status',
    [
        staffAuth,
        auditLog('UPDATE_UNIFIED_PAYMENT_STATUS', 'UnifiedBill', (req) => ({
            details: `Cập nhật trạng thái thanh toán hóa đơn tổng hợp (${req.body?.type}): Căn hộ ${req.body?.apartment_id} → ${req.body?.status}`,
        })),
    ],
    updateCombinedPaymentStatus
);

module.exports = router;

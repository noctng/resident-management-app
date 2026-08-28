const express = require('express');
const router = express.Router();
const managementFeeController = require('../controllers/managementFeeController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const { auditLog } = require('../middleware/auditLogMiddleware');

const staffAuth = [authenticateToken, checkPermission(['unified_billing', 'utilities'])];

// Get management fees with filters
router.get('/', staffAuth, managementFeeController.getFees);

// Get summary statistics
router.get('/summary', staffAuth, managementFeeController.getSummary);

// Get fee by ID
router.get('/:id', staffAuth, managementFeeController.getFeeById);

// Export invoice to PDF
router.get('/:id/pdf', staffAuth, managementFeeController.exportToPDF);

// Generate management fee for single apartment
router.post(
    '/generate',
    [
        staffAuth,
        auditLog('GENERATE_MANAGEMENT_FEE', 'ManagementFee', (req, resBody) => ({
            targetId: resBody?.id,
            details: `Tạo phí quản lý cho căn hộ ${req.body?.apartment_id}`,
        })),
    ],
    managementFeeController.generateFee
);

// Bulk generate management fees for all apartments
router.post(
    '/bulk-generate',
    [
        staffAuth,
        auditLog('BULK_GENERATE_MANAGEMENT_FEES', 'ManagementFee', (req, resBody) => ({
            details: `Tạo phí quản lý hàng loạt tháng ${req.body?.month}/${req.body?.year}`,
        })),
    ],
    managementFeeController.bulkGenerateFees
);

// Update payment status
router.put(
    '/:id/payment',
    [
        staffAuth,
        auditLog('UPDATE_MANAGEMENT_FEE_PAYMENT', 'ManagementFee', (req, resBody) => ({
            targetId: req.params.id,
            details: `Cập nhật thanh toán phí quản lý (ID: ${req.params.id}) thành ${req.body?.is_paid ? 'Đã thanh toán' : 'Chưa thanh toán'}`,
        })),
    ],
    managementFeeController.updatePaymentStatus
);

// Delete management fee (Admin only)
router.delete(
    '/:id',
    [
        authenticateToken,
        checkPermission('unified_billing'),
        auditLog('DELETE_MANAGEMENT_FEE', 'ManagementFee', (req) => ({
            targetId: req.params.id,
            details: `Xóa phí quản lý (ID: ${req.params.id})`,
        })),
    ],
    managementFeeController.deleteFee
);

module.exports = router;

const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');
const { authenticateToken, checkPermission, isAdmin, requireAction, requireAnyRole } = require('../middleware/authMiddleware');
const { enforceSoD, makeSoD } = require('../middleware/sodMiddleware');
const validate = require('../middleware/validate');
const { utilityRecordSchema, pricingConfigSchema } = require('../schemas/featureSchemas');
const upload = require('../middleware/uploadMiddleware');

const coerceUtilityRecordNumbers = (req, res, next) => {
    if (req.body) {
        if (req.body.month !== undefined) req.body.month = Number(req.body.month);
        if (req.body.year !== undefined) req.body.year = Number(req.body.year);
        if (req.body.newElectricityReading !== undefined) req.body.newElectricityReading = Number(req.body.newElectricityReading);
        if (req.body.newWaterReading !== undefined) req.body.newWaterReading = Number(req.body.newWaterReading);
    }
    next();
};

// Utility Records
router.get('/utility-records', authenticateToken, utilityController.getAllUtilityRecords);
router.get(
    '/utility-records/apartment/:apartmentId',
    authenticateToken,
    utilityController.getUtilityRecordsByApartment
);
router.post(
    '/utility-records',
    [
        authenticateToken,
        // RBAC GĐ2: chỉ role có quyền ghi chỉ số (PMS-BILL, PMS-TECH, MANAGER, ADMIN)
        requireAction('meter_reading', 'C'),
        checkPermission(['utilities', 'meter_reading']), // compat cũ
        upload.single('meterImage'),
        coerceUtilityRecordNumbers,
        validate(utilityRecordSchema),
    ],
    utilityController.addUtilityRecord
);
router.post(
    '/utility-records/analyze-meter',
    [
        authenticateToken,
        checkPermission(['utilities', 'meter_reading']),
        upload.single('meterImage'),
    ],
    utilityController.analyzeMeterImage
);

router.put(
    '/utility-records/:id/payment-status',
    [authenticateToken, checkPermission('utilities')],
    utilityController.updatePaymentStatus
);
router.post(
    '/utility-records/:id/notify',
    [authenticateToken, checkPermission('utilities')],
    utilityController.sendBillNotification
);
router.post(
    '/utility-records/bulk-notify',
    [authenticateToken, checkPermission('utilities')],
    utilityController.sendBulkBillNotification
);
router.post(
    '/utility-records/batch-qr-zip',
    [authenticateToken, checkPermission('utilities')],
    utilityController.generateBatchQRZip
);
router.post(
    '/utility-records/:id/notify/preview',
    [authenticateToken, checkPermission('utilities')],
    utilityController.previewBillNotification
);

// Pricing Configuration
router.get('/config/pricing', authenticateToken, utilityController.getPricingConfig);
router.put(
    '/config/pricing',
    [authenticateToken, isAdmin, validate(pricingConfigSchema)],
    utilityController.updatePricingConfig
);
router.get(
    '/config/pricing/history',
    [authenticateToken, isAdmin],
    utilityController.getPricingHistory
);

// Recalculate utility costs for existing records
// RBAC GĐ2: chỉ PMS-BILL (hoặc ADMIN/MANAGER) được chốt kỳ (A), + SoD demo
router.post(
    '/utility-records/recalculate',
    [
        authenticateToken,
        requireAction('utilities', 'A'),
        // SoD: người chốt kỳ phải khác người ghi chỉ số (giả lập owner kỳ trước = user khác)
        (req, res, next) => {
            req.sodContext = makeSoD('utilities', 'A', 'prev_meter_reader_id');
            next();
        },
        enforceSoD,
        isAdmin,
    ],
    utilityController.recalculateUtilityCosts
);

module.exports = router;

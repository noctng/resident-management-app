const express = require('express');
const router = express.Router();
const amenityController = require('../controllers/amenityController');
const configController = require('../controllers/configController');
const { authenticateToken, isManagerOrAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { amenityBookingSchema, updateBookingStatusSchema, updateAmenityBookingSchema } = require('../schemas/featureSchemas');

// Public endpoint for residents to read amenity limits
router.get('/amenity-limits', authenticateToken, configController.getAmenityLimitsPublic);

const { auditLog } = require('../middleware/auditLogMiddleware');

// Export amenity usage report (Excel)
router.get(
    '/amenity-usage/export',
    [authenticateToken, isManagerOrAdmin],
    amenityController.exportAmenityUsage
);

router.get('/amenity-usage', authenticateToken, amenityController.getAmenityUsage);
router.post(
    '/amenity-usage',
    [
        authenticateToken,
        validate(amenityBookingSchema),
        auditLog('CREATE_AMENITY_BOOKING', 'AmenityUsage', (req, resBody) => ({
            targetId: resBody?.id,
            targetName: resBody?.bookingCode,
            details: `Đặt lịch tiện ích ${resBody?.amenity} (Mã: ${resBody?.bookingCode})`,
        })),
    ],
    amenityController.createAmenityBooking
);
router.put(
    '/amenity-usage/:id/status',
    [
        authenticateToken,
        validate(updateBookingStatusSchema),
        auditLog('UPDATE_AMENITY_STATUS', 'AmenityUsage', (req, resBody) => ({
            targetId: req.params.id,
            targetName: resBody?.bookingCode,
            details: `${req.resident ? 'Cư dân' : 'BQL'} cập nhật trạng thái đặt lịch ${resBody?.bookingCode || req.params.id} thành ${resBody?.status || req.body?.status}`,
        })),
    ],
    amenityController.updateBookingStatus
);
router.put(
    '/amenity-usage/:id',
    [authenticateToken, isManagerOrAdmin, validate(updateAmenityBookingSchema)],
    amenityController.updateAmenityBooking
);
router.delete(
    '/amenity-usage/:id',
    [authenticateToken, isManagerOrAdmin],
    amenityController.deleteAmenityBooking
);

module.exports = router;

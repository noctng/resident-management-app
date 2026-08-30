/**
 * residentPortalRoutes.js — Cổng cư dân (Resident Portal)
 *
 * Tất cả route yêu cầu token cư dân (JWT_RESIDENT_SECRET) qua authenticateResident,
 * và enforce quyền RESIDENT role qua requireResidentPerm(module, action).
 * Resident token chứa: { type:'resident', residentId, apartmentId, unitCode }.
 *
 * Quyền RESIDENT (Blueprint A.4): xem HĐ, thanh toán, phản ánh, đặt tiện ích,
 * đăng ký xe/thi công, cập nhật thông tin cá nhân.
 */
const express = require('express');
const router = express.Router();
const {
    authenticateResident,
    requireResidentPerm,
} = require('../middleware/authMiddleware');
const unifiedBillingService = require('../services/unifiedBillingService');
const feedbackService = require('../services/feedbackService');
const vehicleService = require('../services/vehicleService');
const amenityService = require('../services/amenityService');
const constructionService = require('../services/constructionService');
const residentService = require('../services/residentService');

// Helper: lấy apartmentCode từ token cư dân (dùng cho unified_billing)
const aptCode = (req) => req.resident && (req.resident.apartmentCode || req.resident.unit_code || req.resident.unitCode);

// --- Hóa đơn / Thanh toán (unified_billing) ---
router.get(
    '/billing',
    [authenticateResident, requireResidentPerm('unified_billing', 'R')],
    async (req, res) => {
        try {
            const data = await unifiedBillingService.getUnifiedBilling({ apartment_code: aptCode(req) });
            res.json(data);
        } catch (e) {
            console.error('[ResidentPortal] getBilling error:', e);
            res.status(500).json({ message: 'Lỗi tải hóa đơn.' });
        }
    }
);

router.post(
    '/billing/pay',
    [authenticateResident, requireResidentPerm('unified_billing', 'U')],
    async (req, res) => {
        try {
            const payload = { ...req.body, apartment_id: aptCode(req) };
            const result = await unifiedBillingService.updateCombinedPaymentStatus(
                payload,
                { type: 'resident', id: req.resident.residentId }
            );
            res.json(result);
        } catch (e) {
            console.error('[ResidentPortal] payBilling error:', e);
            res.status(500).json({ message: 'Lỗi thanh toán.' });
        }
    }
);

// --- Phản ánh (feedback) ---
router.get(
    '/feedback',
    [authenticateResident, requireResidentPerm('feedback', 'R')],
    async (req, res) => {
        try {
            const data = await feedbackService.getFeedbackByApartment(aptCode(req));
            res.json(data);
        } catch (e) {
            console.error('[ResidentPortal] getFeedback error:', e);
            res.status(500).json({ message: 'Lỗi tải phản ánh.' });
        }
    }
);

router.post(
    '/feedback',
    [authenticateResident, requireResidentPerm('feedback', 'C')],
    async (req, res) => {
        try {
            const payload = {
                ...req.body,
                apartment_id: aptCode(req),
                resident_id: req.resident.residentId,
                source: 'RESIDENT_PORTAL',
            };
            const created = await feedbackService.createFeedback(payload);
            res.status(201).json(created);
        } catch (e) {
            console.error('[ResidentPortal] createFeedback error:', e);
            res.status(500).json({ message: 'Lỗi gửi phản ánh.' });
        }
    }
);

// --- Đăng ký xe (vehicles) ---
router.get(
    '/vehicles',
    [authenticateResident, requireResidentPerm('vehicles', 'R')],
    async (req, res) => {
        try {
            const data = await vehicleService.getVehiclesByApartment(aptCode(req));
            res.json(data);
        } catch (e) {
            console.error('[ResidentPortal] getVehicles error:', e);
            res.status(500).json({ message: 'Lỗi tải xe.' });
        }
    }
);

router.post(
    '/vehicles',
    [authenticateResident, requireResidentPerm('vehicles', 'C')],
    async (req, res) => {
        try {
            const payload = {
                ...req.body,
                apartment_id: aptCode(req),
                registered_by: req.resident.residentId,
            };
            const created = await vehicleService.registerResidentVehicle(payload);
            res.status(201).json(created);
        } catch (e) {
            console.error('[ResidentPortal] registerVehicle error:', e);
            res.status(500).json({ message: 'Lỗi đăng ký xe.' });
        }
    }
);

// --- Đặt tiện ích (amenities) ---
router.post(
    '/amenities/booking',
    [authenticateResident, requireResidentPerm('amenities', 'C')],
    async (req, res) => {
        try {
            const payload = {
                ...req.body,
                apartment_id: aptCode(req),
                resident_id: req.resident.residentId,
                source: 'RESIDENT_PORTAL',
            };
            const created = await amenityService.createAmenityBooking(payload);
            res.status(201).json(created);
        } catch (e) {
            console.error('[ResidentPortal] bookAmenity error:', e);
            res.status(500).json({ message: 'Lỗi đặt tiện ích.' });
        }
    }
);

// --- Đăng ký thi công (construction) ---
router.post(
    '/construction/register',
    [authenticateResident, requireResidentPerm('construction', 'C')],
    async (req, res) => {
        try {
            const payload = {
                ...req.body,
                apartment_id: aptCode(req),
                resident_id: req.resident.residentId,
                source: 'RESIDENT_PORTAL',
            };
            const created = await constructionService.createRegistration(
                payload,
                { type: 'resident', id: req.resident.residentId }
            );
            res.status(201).json(created);
        } catch (e) {
            console.error('[ResidentPortal] registerConstruction error:', e);
            res.status(500).json({ message: 'Lỗi đăng ký thi công.' });
        }
    }
);

// --- Cập nhật thông tin cá nhân (residents) ---
router.put(
    '/profile',
    [authenticateResident, requireResidentPerm('residents', 'U')],
    async (req, res) => {
        try {
            const updated = await residentService.updateResident(
                req.resident.residentId,
                req.body || {}
            );
            res.json(updated);
        } catch (e) {
            console.error('[ResidentPortal] updateProfile error:', e);
            res.status(500).json({ message: 'Lỗi cập nhật thông tin.' });
        }
    }
);

module.exports = router;

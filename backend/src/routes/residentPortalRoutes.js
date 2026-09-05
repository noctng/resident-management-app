/**
 * residentPortalRoutes.js — Cổng cư dân (Resident Portal)
 *
 * Tất cả route yêu cầu token cư dân (JWT_RESIDENT_SECRET) qua authenticateResident,
 * và enforce quyền RESIDENT role qua requireResidentPerm(module, action).
 *
 * Token cư dân thực tế (authService.buildResidentToken) chỉ chứa:
 *   { id, name, type: 'resident' }
 * → apartmentId được frontend truyền kèm (nó đã có selectedApartment.id),
 *   và route xác thực cư dân THỰC SỰ thuộc căn hộ đó (occupancies) trước khi trả data.
 *
 * Quyền RESIDENT (Blueprint A.4): xem HĐ, thanh toán, phản ánh, đặt tiện ích,
 * đăng ký xe/thi công, cập nhật thông tin cá nhân.
 */
const express = require('express');
const router = express.Router();
const { authenticateResident, requireResidentPerm } = require('../middleware/authMiddleware');
const prisma = require('../config/prisma');
const unifiedBillingService = require('../services/unifiedBillingService');
const feedbackService = require('../services/feedbackService');
const vehicleService = require('../services/vehicleService');
const amenityService = require('../services/amenityService');
const constructionService = require('../services/constructionService');
const upload = require('../middleware/uploadMiddleware');

// Xác thực cư dân thực sự thuộc căn hộ (chống truy cập chéo)
async function assertOwnsApartment(residentId, apartmentId) {
  if (!residentId || !apartmentId) return false;
  const occ = await prisma.occupancies.findFirst({
    where: { resident_id: residentId, apartment_id: apartmentId },
    select: { apartment_id: true },
  });
  return !!occ;
}

// Helper lấy apartmentId từ query/body
const aptId = (req) => req.query.apartmentId || (req.body && req.body.apartmentId);

// --- Hóa đơn / Thanh toán (unified_billing) ---
router.get(
  '/billing',
  [authenticateResident, requireResidentPerm('unified_billing', 'R')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const data = await unifiedBillingService.getUnifiedBillingHistory(apartmentId, 24);
      res.json(data);
    } catch (e) {
      console.error('[ResidentPortal] getBilling error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi tải hóa đơn.' });
    }
  }
);

router.post(
  '/billing/pay',
  [authenticateResident, requireResidentPerm('unified_billing', 'U')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const { month, year, status } = req.body || {};
      const result = await unifiedBillingService.updateCombinedPaymentStatus(
        { apartment_id: apartmentId, month, year, status },
        { type: 'resident', id: req.resident.id }
      );
      res.json(result);
    } catch (e) {
      console.error('[ResidentPortal] payBilling error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi thanh toán.' });
    }
  }
);

// --- Phản ánh (feedback) ---
router.get(
  '/feedback',
  [authenticateResident, requireResidentPerm('feedback', 'R')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const data = await feedbackService.getFeedbackByApartment(apartmentId);
      res.json(data);
    } catch (e) {
      console.error('[ResidentPortal] getFeedback error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi tải phản ánh.' });
    }
  }
);

router.post(
  '/feedback',
  [authenticateResident, requireResidentPerm('feedback', 'C'), upload.array('imageData', 5)],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const payload = {
        ...req.body,
        apartment_id: apartmentId,
        resident_id: req.resident.id,
        source: 'RESIDENT_PORTAL',
      };
      const created = await feedbackService.createFeedback(payload, req.files);
      res.status(201).json(created);
    } catch (e) {
      console.error('[ResidentPortal] createFeedback error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi gửi phản ánh.' });
    }
  }
);

// --- Đăng ký xe (vehicles) ---
router.get(
  '/vehicles',
  [authenticateResident, requireResidentPerm('vehicles', 'R')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const data = await vehicleService.getVehiclesByApartment(apartmentId);
      res.json(data);
    } catch (e) {
      console.error('[ResidentPortal] getVehicles error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi tải xe.' });
    }
  }
);

router.post(
  '/vehicles',
  [authenticateResident, requireResidentPerm('vehicles', 'C')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const payload = {
        ...req.body,
        apartment_id: apartmentId,
        registered_by: req.resident.id,
      };
      const created = await vehicleService.registerResidentVehicle(payload);
      res.status(201).json(created);
    } catch (e) {
      console.error('[ResidentPortal] registerVehicle error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi đăng ký xe.' });
    }
  }
);

// --- Đặt tiện ích (amenities) ---
router.get(
  '/amenities',
  [authenticateResident, requireResidentPerm('amenities', 'R')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const all = await amenityService.getAmenityUsage();
      const data = all.filter((u) => u.apartmentId === apartmentId);
      res.json(data);
    } catch (e) {
      console.error('[ResidentPortal] getAmenities error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi tải tiện ích.' });
    }
  }
);

router.post(
  '/amenities/booking',
  [authenticateResident, requireResidentPerm('amenities', 'C')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const payload = {
        ...req.body,
        apartment_id: apartmentId,
        resident_id: req.resident.id,
        source: 'RESIDENT_PORTAL',
      };
      const created = await amenityService.createAmenityBooking(payload);
      res.status(201).json(created);
    } catch (e) {
      console.error('[ResidentPortal] bookAmenity error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi đặt tiện ích.' });
    }
  }
);

// --- Đăng ký thi công (construction) ---
router.get(
  '/construction',
  [authenticateResident, requireResidentPerm('construction', 'R')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const data = await constructionService.getRegistrations({ apartment_id: apartmentId });
      res.json(data || []);
    } catch (e) {
      console.error('[ResidentPortal] getConstruction error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi tải thi công.' });
    }
  }
);

router.post(
  '/construction/register',
  [authenticateResident, requireResidentPerm('construction', 'C')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const payload = {
        ...req.body,
        apartment_id: apartmentId,
        resident_id: req.resident.id,
        source: 'RESIDENT_PORTAL',
      };
      const created = await constructionService.createRegistration(payload, {
        type: 'resident',
        id: req.resident.id,
      });
      res.status(201).json(created);
    } catch (e) {
      console.error('[ResidentPortal] registerConstruction error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi đăng ký thi công.' });
    }
  }
);

// --- Bảo hành / Bảo trì (warranty) ---
router.get(
  '/warranty',
  [authenticateResident, requireResidentPerm('warranty', 'R')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const result = await require('../services/warrantyService').getWarrantyClaims({ apartment_id: apartmentId });
      res.json(result.claims || []);
    } catch (e) {
      console.error('[ResidentPortal] getWarranty error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi tải bảo hành.' });
    }
  }
);

router.post(
  '/warranty',
  [authenticateResident, requireResidentPerm('warranty', 'C')],
  async (req, res) => {
    const apartmentId = aptId(req);
    try {
      if (!(await assertOwnsApartment(req.resident.id, apartmentId))) {
        return res.status(403).json({ error: 'Forbidden', message: 'Bạn không thuộc căn hộ này.' });
      }
      const payload = {
        ...req.body,
        apartment_id: apartmentId,
        resident_id: req.resident.id,
        source: 'RESIDENT_PORTAL',
      };
      const created = await require('../services/warrantyService').createWarrantyClaim(payload);
      res.status(201).json(created);
    } catch (e) {
      console.error('[ResidentPortal] createWarranty error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi gửi yêu cầu bảo hành.' });
    }
  }
);

// --- Cập nhật thông tin cá nhân (residents) ---
router.put(
  '/profile',
  [authenticateResident, requireResidentPerm('residents', 'U')],
  async (req, res) => {
    try {
      const updated = await residentService.updateResident(req.resident.id, req.body || {});
      res.json(updated);
    } catch (e) {
      console.error('[ResidentPortal] updateProfile error:', e);
      res.status(e.status || 500).json({ message: e.message || 'Lỗi cập nhật thông tin.' });
    }
  }
);

module.exports = router;

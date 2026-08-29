import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/logger', () => ({ logActivity: vi.fn() }));

describe('productInventory', () => {
  let controller;
  let service;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/productInventoryController');
    service = require('../../src/services/productInventoryService');
  });

  describe('getSalesMatrix', () => {
    it('trả về matrix + stats', async () => {
      const mockResult = {
        success: true,
        stats: { total: 1, available: 1, booked: 0, deposited: 0, contracted: 0, handedOver: 0, locked: 0 },
        matrix: { TESLA: {}, CANTATA: {}, NOXH: {} },
        units: [{ id: 'a1', code: 'A101', phase_code: 'CANTATA' }],
        totalUnits: 1,
      };
      vi.spyOn(service, 'getSalesMatrix').mockResolvedValue(mockResult);
      const res = { json: vi.fn() };
      await controller.getSalesMatrix({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getProductDetail', () => {
    it('trả về 404 nếu không tìm thấy', async () => {
      vi.spyOn(service, 'getProductDetail').mockResolvedValue({ success: false, message: 'Không tìm thấy sản phẩm' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.getProductDetail({ params: { id: 'x' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('trả về unit + priceBreakdown', async () => {
      const mockUnit = { id: 'a1', code: 'A101', land_price_before_vat: 100, construction_price_before_vat: 100, vat_rate: 8 };
      vi.spyOn(service, 'getProductDetail').mockResolvedValue({ success: true, unit: mockUnit });
      const res = { json: vi.fn() };
      await controller.getProductDetail({ params: { id: 'a1' } }, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, unit: mockUnit });
    });
  });

  describe('createProductUnit', () => {
    it('trả về 400 nếu thiếu code', async () => {
      vi.spyOn(service, 'createProductUnit').mockResolvedValue({ success: false, message: 'Vui lòng nhập Mã Căn / Lô' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createProductUnit({ body: {}, user: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('tạo thành công (201)', async () => {
      const unit = { id: 'a1', code: 'A101' };
      vi.spyOn(service, 'createProductUnit').mockResolvedValue({ success: true, unit });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createProductUnit({ body: { code: 'A101' }, user: {} }, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateProductUnit', () => {
    it('trả về 404 nếu không tìm thấy', async () => {
      vi.spyOn(service, 'updateProductUnit').mockResolvedValue({ success: false, message: 'Không tìm thấy sản phẩm' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.updateProductUnit({ params: { id: 'x' }, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteProductUnit', () => {
    it('trả về 400 nếu có hợp đồng', async () => {
      vi.spyOn(service, 'deleteProductUnit').mockResolvedValue({ success: false, message: 'Không thể xóa căn vì đã phát sinh Hợp Đồng' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.deleteProductUnit({ params: { id: 'a1' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('xóa thành công', async () => {
      vi.spyOn(service, 'deleteProductUnit').mockResolvedValue({ success: true, message: 'Đã xóa' });
      const res = { json: vi.fn() };
      await controller.deleteProductUnit({ params: { id: 'a1' }, user: {} }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('batchUpdateStatus', () => {
    it('trả về 400 nếu thiếu params', async () => {
      vi.spyOn(service, 'batchUpdateStatus').mockResolvedValue({ success: false, message: 'Vui lòng chọn danh sách căn và trạng thái' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.batchUpdateStatus({ body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('computeEffectiveStatus (pure logic)', () => {
    it('AVAILABLE khi không có contract/booking', () => {
      const status = service.computeEffectiveStatus({ sales_status: 'AVAILABLE', contracts: [], sales_bookings: [] });
      expect(status).toBe('AVAILABLE');
    });

    it('CONTRACTED khi có SIGNED contract', () => {
      const status = service.computeEffectiveStatus({ sales_status: 'AVAILABLE', contracts: [{ status: 'SIGNED' }], sales_bookings: [] });
      expect(status).toBe('CONTRACTED');
    });

    it('HANDED_OVER khi COMPLETED', () => {
      const status = service.computeEffectiveStatus({ sales_status: 'AVAILABLE', contracts: [{ status: 'COMPLETED' }], sales_bookings: [] });
      expect(status).toBe('HANDED_OVER');
    });

    it('BOOKED khi chỉ có booking active', () => {
      const status = service.computeEffectiveStatus({ sales_status: 'AVAILABLE', contracts: [], sales_bookings: [{ status: 'ACTIVE' }] });
      expect(status).toBe('BOOKED');
    });
  });

  describe('computePriceBreakdown (pure logic)', () => {
    it('tính đúng VAT 8% + maintenance 2%', () => {
      const pb = service.computePriceBreakdown({ land_price_before_vat: 100, construction_price_before_vat: 100, vat_rate: 8 });
      expect(pb.subtotal).toBe(200);
      expect(pb.vatAmount).toBe(16);
      expect(pb.maintenanceFee2Pct).toBe(4);
      expect(pb.grandTotal).toBe(220);
    });
  });
});

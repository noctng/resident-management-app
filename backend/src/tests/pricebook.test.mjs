import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/logger', () => ({ logActivity: vi.fn() }));

describe('pricebook', () => {
  let controller;
  let service;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/pricebookController');
    service = require('../../src/services/pricebookService');
  });

  describe('getPricebooks', () => {
    it('trả về danh sách', async () => {
      vi.spyOn(service, 'getPricebooks').mockResolvedValue({ success: true, pricebooks: [{ id: 'pb1' }], totalCount: 1 });
      const res = { json: vi.fn() };
      await controller.getPricebooks({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, totalCount: 1 }));
    });
  });

  describe('getPricebookById', () => {
    it('trả về 404 nếu không tìm thấy', async () => {
      vi.spyOn(service, 'getPricebookById').mockResolvedValue({ success: false, message: 'Không tìm thấy bảng giá' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.getPricebookById({ params: { id: 'x' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('trả về pricebook nếu tìm thấy', async () => {
      const pb = { id: 'pb1', code: 'PB-ALL-202401-v1' };
      vi.spyOn(service, 'getPricebookById').mockResolvedValue({ success: true, pricebook: pb });
      const res = { json: vi.fn() };
      await controller.getPricebookById({ params: { id: 'pb1' } }, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, pricebook: pb });
    });
  });

  describe('createPricebook', () => {
    it('trả về 400 nếu thiếu tên/ngày', async () => {
      vi.spyOn(service, 'createPricebook').mockResolvedValue({ success: false, message: 'Thiếu' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createPricebook({ body: {}, user: { username: 'a' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('tạo thành công (201)', async () => {
      const pb = { id: 'pb1', code: 'PB-ALL-202401-v1' };
      vi.spyOn(service, 'createPricebook').mockResolvedValue({ success: true, pricebook: pb });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createPricebook({ body: { name: 'T', effective_from: '2024-01-01' }, user: { username: 'a' } }, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updatePricebook', () => {
    it('trả về 400 nếu ARCHIVED', async () => {
      vi.spyOn(service, 'updatePricebook').mockResolvedValue({ success: false, message: 'Bảng giá đã lưu trữ không được chỉnh sửa' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.updatePricebook({ params: { id: 'pb1' }, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('cập nhật thành công', async () => {
      vi.spyOn(service, 'updatePricebook').mockResolvedValue({ success: true, message: 'Cập nhật bảng giá thành công' });
      const res = { json: vi.fn() };
      await controller.updatePricebook({ params: { id: 'pb1' }, body: {} }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('approvePricebook', () => {
    it('trả về 404 nếu không tìm thấy', async () => {
      vi.spyOn(service, 'approvePricebook').mockResolvedValue({ success: false, message: 'Không tìm thấy bảng giá' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.approvePricebook({ params: { id: 'x' }, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('phê duyệt thành công', async () => {
      vi.spyOn(service, 'approvePricebook').mockResolvedValue({ success: true, message: 'Đã phê duyệt' });
      const res = { json: vi.fn() };
      await controller.approvePricebook({ params: { id: 'pb1' }, body: { activate_now: true }, user: {} }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('deletePricebook', () => {
    it('trả về 400 nếu đang ACTIVE', async () => {
      vi.spyOn(service, 'deletePricebook').mockResolvedValue({ success: false, message: 'Không thể xóa bảng giá đang kích hoạt chính thức' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.deletePricebook({ params: { id: 'pb1' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('xóa thành công', async () => {
      vi.spyOn(service, 'deletePricebook').mockResolvedValue({ success: true, message: 'Đã xóa bảng giá thành công' });
      const res = { json: vi.fn() };
      await controller.deletePricebook({ params: { id: 'pb1' } }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('computePriceComponents (pure logic)', () => {
    it('tính đúng VAT 8% và maintenance 2%', () => {
      const { beforeVat, afterVat, maint } = service.computePriceComponents(100, 100, 8);
      expect(beforeVat).toBe(200);
      expect(afterVat).toBe(216); // 200 + 8% = 216
      expect(maint).toBe(4); // 200 * 2% = 4
    });
  });
});

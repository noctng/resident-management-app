import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/logger', () => ({ logActivity: vi.fn() }));

describe('promotion', () => {
  let controller;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/promotionController');
    repo = require('../../src/repositories/promotionRepository');
  });

  describe('getPromotions', () => {
    it('trả về danh sách promotions', async () => {
      const mockData = [{ id: 'p1', code: 'KM-2024-AA' }];
      vi.spyOn(repo, 'findAll').mockResolvedValue(mockData);
      const res = { json: vi.fn() };
      await controller.getPromotions({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, promotions: mockData, totalCount: 1 }));
    });
  });

  describe('createPromotion', () => {
    it('trả về 400 nếu thiếu name/start_date', async () => {
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createPromotion({ body: {}, user: { username: 'admin' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('tạo promotion thành công (201)', async () => {
      const promo = { id: 'prm_x', code: 'KM-2024-AA', name: 'Test' };
      vi.spyOn(repo, 'create').mockResolvedValue(promo);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createPromotion(
        { body: { name: 'Test', start_date: '2024-01-01' }, user: { username: 'admin' } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, promotion: promo }));
    });
  });

  describe('togglePromotionStatus', () => {
    it('trả về 404 nếu không tìm thấy', async () => {
      vi.spyOn(repo, 'findById').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.togglePromotionStatus({ params: { id: 'x' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('chuyển ACTIVE -> INACTIVE', async () => {
      const updated = { id: 'p1', status: 'INACTIVE' };
      vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'p1', status: 'ACTIVE' });
      vi.spyOn(repo, 'updateStatus').mockResolvedValue(updated);
      const res = { json: vi.fn() };
      await controller.togglePromotionStatus({ params: { id: 'p1' } }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, promotion: updated }));
    });
  });

  describe('calculateDiscount business logic', () => {
    it('trả về 400 nếu base_price <= 0', async () => {
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.calculateDiscount({ body: { base_price: 0 } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('tính đúng chiết khấu PERCENTAGE', async () => {
      const active = [{ id: 'p1', code: 'KM', name: 'T1', discount_type: 'PERCENTAGE', discount_value: 10, gift_description: null }];
      vi.spyOn(repo, 'findActiveByIds').mockResolvedValue(active);
      const res = { json: vi.fn() };
      await controller.calculateDiscount({ body: { base_price: 100000000, promotion_ids: ['p1'] } }, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total_discount_amount: 10000000,
          final_price: 90000000,
          discount_percent: 10,
          requires_approval: true,
          exceeds_cap: false,
        })
      );
    });

    it('phát hiện vượt cap 10%', async () => {
      const active = [{ id: 'p1', code: 'KM', name: 'T1', discount_type: 'PERCENTAGE', discount_value: 15, gift_description: null }];
      vi.spyOn(repo, 'findActiveByIds').mockResolvedValue(active);
      const res = { json: vi.fn() };
      await controller.calculateDiscount({ body: { base_price: 100000000, promotion_ids: ['p1'] } }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ discount_percent: 15, exceeds_cap: true }));
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

describe('debtDashboard', () => {
  let controller;
  let service;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/debtDashboardController');
    service = require('../../src/services/debtDashboardService');
    repo = require('../../src/repositories/debtDashboardRepository');
  });

  describe('getApartmentDebtSummary', () => {
    it('trả về rows từ service', async () => {
      vi.spyOn(service, 'getApartmentDebtSummary').mockResolvedValue([{ apartment_code: 'A1', debt_amount: 500 }]);
      const res = { json: vi.fn() };
      await controller.getApartmentDebtSummary({ query: { limit: '50' } }, res);
      expect(service.getApartmentDebtSummary).toHaveBeenCalledWith('50');
      expect(res.json).toHaveBeenCalledWith([{ apartment_code: 'A1', debt_amount: 500 }]);
    });
    it('500 nếu lỗi', async () => {
      vi.spyOn(service, 'getApartmentDebtSummary').mockRejectedValue(new Error('x'));
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.getApartmentDebtSummary({ query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMonthlyRevenueSummary', () => {
    it('gọi service với limit mặc định', async () => {
      vi.spyOn(service, 'getMonthlyRevenueSummary').mockResolvedValue([]);
      const res = { json: vi.fn() };
      await controller.getMonthlyRevenueSummary({ query: {} }, res);
      expect(service.getMonthlyRevenueSummary).toHaveBeenCalledWith(12);
    });
  });

  describe('getOverallStats', () => {
    it('map numeric đúng', async () => {
      vi.spyOn(repo, 'getOverallStats').mockResolvedValue({ rows: [{ total_apartments: '10', collection_rate: '85.5', debt_amount: null }] });
      const res = { json: vi.fn() };
      await controller.getOverallStats({}, res);
      expect(res.json).toHaveBeenCalledWith({
        total_apartments: 10,
        total_invoices: 0,
        paid_invoices: 0,
        pending_invoices: 0,
        overdue_invoices: 0,
        total_amount: 0,
        collected_amount: 0,
        debt_amount: 0,
        collection_rate: 85.5,
      });
    });
  });

  describe('getTopDebtors', () => {
    it('gọi service.getTopDebtors', async () => {
      vi.spyOn(service, 'getTopDebtors').mockResolvedValue([{ apartment_code: 'A2' }]);
      const res = { json: vi.fn() };
      await controller.getTopDebtors({ query: { limit: '5' } }, res);
      expect(service.getTopDebtors).toHaveBeenCalledWith('5');
    });
  });

  describe('getPaymentTrends', () => {
    it('gọi service.getPaymentTrends', async () => {
      vi.spyOn(service, 'getPaymentTrends').mockResolvedValue([]);
      const res = { json: vi.fn() };
      await controller.getPaymentTrends({}, res);
      expect(service.getPaymentTrends).toHaveBeenCalled();
    });
  });

  describe('getDebtHeatmap', () => {
    it('map numeric đúng', async () => {
      vi.spyOn(repo, 'getDebtHeatmap').mockResolvedValue({ rows: [{ house_type: 'CANTATA', floor: 1, total_fees: '3', unpaid_count: '1', debt_amount: '200' }] });
      const res = { json: vi.fn() };
      await controller.getDebtHeatmap({}, res);
      expect(res.json).toHaveBeenCalledWith([{ house_type: 'CANTATA', floor: 1, total_fees: 3, unpaid_count: 1, debt_amount: 200 }]);
    });
  });

  describe('getRecentPayments', () => {
    it('gọi service.getRecentPayments', async () => {
      vi.spyOn(service, 'getRecentPayments').mockResolvedValue([]);
      const res = { json: vi.fn() };
      await controller.getRecentPayments({ query: {} }, res);
      expect(service.getRecentPayments).toHaveBeenCalledWith(20);
    });
  });
});

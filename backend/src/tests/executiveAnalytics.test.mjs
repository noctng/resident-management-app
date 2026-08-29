import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

describe('executiveAnalytics', () => {
  let controller;
  let service;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/executiveAnalyticsController');
    service = require('../../src/services/executiveAnalyticsService');
  });

  describe('getOverview', () => {
    it('gọi service.getOverview + trả về success envelope', async () => {
      vi.spyOn(service, 'getOverview').mockResolvedValue({ totalContractValue: 100 });
      const res = { json: vi.fn() };
      await controller.getOverview({ query: { phase: 'ALL' } }, res);
      expect(service.getOverview).toHaveBeenCalledWith('ALL', expect.any(Number));
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { totalContractValue: 100 } });
    });

    it('trả về 500 nếu service lỗi', async () => {
      vi.spyOn(service, 'getOverview').mockRejectedValue(new Error('db'));
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.getOverview({ query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSalesFunnel', () => {
    it('trả về funnel data', async () => {
      vi.spyOn(service, 'getSalesFunnel').mockResolvedValue({ funnel: [], phaseRevenue: [], commissions: {} });
      const res = { json: vi.fn() };
      await controller.getSalesFunnel({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, funnel: [], phaseRevenue: [], commissions: {} });
    });
  });

  describe('getFinancialAging', () => {
    it('trả về aging data', async () => {
      vi.spyOn(service, 'getFinancialAging').mockResolvedValue({ aging: {}, forecast: {} });
      const res = { json: vi.fn() };
      await controller.getFinancialAging({ query: { phase: 'CANTATA' } }, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, aging: {}, forecast: {} });
    });
  });

  describe('getOperationsSla', () => {
    it('trả về operations data', async () => {
      vi.spyOn(service, 'getOperationsSla').mockResolvedValue({ pareto: [] });
      const res = { json: vi.fn() };
      await controller.getOperationsSla({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, pareto: [] });
    });
  });

  describe('getCommunityOccupancy', () => {
    it('trả về community data', async () => {
      vi.spyOn(service, 'getCommunityOccupancy').mockResolvedValue({ community: {} });
      const res = { json: vi.fn() };
      await controller.getCommunityOccupancy({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, community: {} });
    });
  });

  describe('exportExecutiveReport', () => {
    it('gọi service.exportExecutiveReport', async () => {
      vi.spyOn(service, 'exportExecutiveReport').mockResolvedValue();
      const res = {};
      await controller.exportExecutiveReport({}, res);
      expect(service.exportExecutiveReport).toHaveBeenCalledWith(res);
    });
  });
});

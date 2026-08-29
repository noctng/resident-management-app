import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

describe('report', () => {
  let controller;
  let service;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/reportController');
    service = require('../../src/services/reportService');
    repo = require('../../src/repositories/reportRepository');
  });

  describe('exportUnifiedBilling', () => {
    it('trả về 400 nếu thiếu month/year', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.exportUnifiedBilling({ query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('gọi service exportUnifiedBilling', async () => {
      vi.spyOn(service, 'exportUnifiedBilling').mockResolvedValue();
      const res = {};
      await controller.exportUnifiedBilling({ query: { month: '1', year: '2026' } }, res);
      expect(service.exportUnifiedBilling).toHaveBeenCalledWith(res, '1', '2026');
    });
  });

  describe('exportResidents', () => {
    it('gọi service exportResidents', async () => {
      vi.spyOn(service, 'exportResidents').mockResolvedValue();
      const res = {};
      await controller.exportResidents({}, res);
      expect(service.exportResidents).toHaveBeenCalledWith(res);
    });
  });

  describe('exportApartments', () => {
    it('gọi service exportApartments', async () => {
      vi.spyOn(service, 'exportApartments').mockResolvedValue();
      const res = {};
      await controller.exportApartments({}, res);
      expect(service.exportApartments).toHaveBeenCalledWith(res);
    });
  });

  describe('exportUtility', () => {
    it('trả về 400 nếu thiếu month/year', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.exportUtility({ query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('gọi service exportUtility', async () => {
      vi.spyOn(service, 'exportUtility').mockResolvedValue();
      const res = {};
      await controller.exportUtility({ query: { month: '1', year: '2026' } }, res);
      expect(service.exportUtility).toHaveBeenCalledWith(res, '1', '2026');
    });
  });

  describe('exportContracts', () => {
    it('gọi service exportContracts', async () => {
      vi.spyOn(service, 'exportContracts').mockResolvedValue();
      const res = {};
      await controller.exportContracts({}, res);
      expect(service.exportContracts).toHaveBeenCalledWith(res);
    });
  });

  describe('getRevenueReport', () => {
    it('trả về 400 nếu thiếu period/year', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.getRevenueReport({ query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('trả về 400 nếu period không hợp lệ', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.getRevenueReport({ query: { period: 'day', year: '2026' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('trả về 400 nếu month thiếu', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.getRevenueReport({ query: { period: 'month', year: '2026' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('gọi service getRevenueReport', async () => {
      vi.spyOn(service, 'getRevenueReport').mockResolvedValue({ period: '2026-01' });
      const res = { json: vi.fn() };
      await controller.getRevenueReport({ query: { period: 'month', year: '2026', month: '1' } }, res);
      expect(service.getRevenueReport).toHaveBeenCalledWith('month', '2026', '1', undefined);
      expect(res.json).toHaveBeenCalledWith({ period: '2026-01' });
    });
  });

  describe('exportRevenueReport', () => {
    it('trả về 400 nếu thiếu period/year', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.exportRevenueReport({ body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('gọi service exportRevenueReport', async () => {
      vi.spyOn(service, 'exportRevenueReport').mockResolvedValue();
      const res = {};
      await controller.exportRevenueReport({ body: { period: 'year', year: '2026' } }, res);
      expect(service.exportRevenueReport).toHaveBeenCalledWith(res, 'year', '2026', undefined, undefined);
    });
  });
});

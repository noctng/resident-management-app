import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/helpers', () => ({ generateRandomId: () => 'abc123' }));

describe('activityLog', () => {
  let controller;
  let service;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/activityLogController');
    service = require('../../src/services/activityLogService');
    repo = require('../../src/repositories/activityLogRepository');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllLogs', () => {
    it('trả về logs + pagination', async () => {
      vi.spyOn(service, 'getAllLogs').mockResolvedValue({ logs: [{ id: '1' }], totalCount: 1, hasMore: false, offset: 0, limit: 30 });
      const res = { json: vi.fn() };
      await controller.getAllLogs({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ logs: [{ id: '1' }], totalCount: 1, hasMore: false, offset: 0, limit: 30 });
    });
    it('500 nếu lỗi', async () => {
      vi.spyOn(service, 'getAllLogs').mockRejectedValue(new Error('x'));
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.getAllLogs({ query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getLogFilters', () => {
    it('trả về users/actions/targetTypes', async () => {
      vi.spyOn(service, 'getLogFilters').mockResolvedValue({ users: [], actions: ['A'], targetTypes: ['T'] });
      const res = { json: vi.fn() };
      await controller.getLogFilters({}, res);
      expect(res.json).toHaveBeenCalledWith({ users: [], actions: ['A'], targetTypes: ['T'] });
    });
  });

  describe('createLog', () => {
    it('tạo log + 201', async () => {
      vi.spyOn(service, 'createLog').mockResolvedValue({ message: 'Log saved' });
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.createLog({ body: { action: 'X' }, user: { id: 'u1' }, headers: {} }, res);
      expect(service.createLog).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('extractIp bỏ ::ffff: prefix', async () => {
      const spy = vi.spyOn(repo, 'createLog').mockImplementation(async (data) => {
        spy._captured = data;
        return {};
      });
      const reqObj = {
        body: { action: 'X' },
        method: 'POST',
        headers: { 'x-forwarded-for': '::ffff:1.2.3.4' },
        url: '/api/logs',
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.createLog(reqObj, res);
      expect(spy._captured.ip_address).toBe('1.2.3.4');
    });
  });
});

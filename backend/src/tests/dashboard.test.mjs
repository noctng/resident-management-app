import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

describe('dashboard', () => {
  let controller;
  let service;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/dashboardController');
    service = require('../../src/services/dashboardService');
  });

  it('trả về tổng hợp thống kê dashboard', async () => {
    vi.spyOn(service, 'getDashboardStats').mockResolvedValue({
      apartmentCount: 10,
      residentCount: 5,
      occupancyCount: 4,
      feedback: { pending: 2, resolved: 1 },
    });
    const res = { json: vi.fn() };
    await controller.getDashboardStats({}, res);
    expect(res.json).toHaveBeenCalledWith({
      apartmentCount: 10,
      residentCount: 5,
      occupancyCount: 4,
      feedback: { pending: 2, resolved: 1 },
    });
  });

  it('trả về 500 nếu service lỗi', async () => {
    vi.spyOn(service, 'getDashboardStats').mockRejectedValue(new Error('db down'));
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await controller.getDashboardStats({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi lấy dữ liệu dashboard' });
  });
});

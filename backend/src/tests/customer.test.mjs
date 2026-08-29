import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/logger', () => ({ logActivity: vi.fn() }));
vi.mock('../utils/helpers', () => ({ generateRandomId: () => 'testid123' }));

describe('customer', () => {
  let controller;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/customerController');
    repo = require('../../src/repositories/customerRepository');
  });

  describe('getAllCustomers', () => {
    it('trả về danh sách customers', async () => {
      const mockData = [{ id: 'c1', name: 'A' }, { id: 'c2', name: 'B' }];
      vi.spyOn(repo, 'findAll').mockResolvedValue(mockData);
      const res = { json: vi.fn() };
      await controller.getAllCustomers({}, res);
      expect(res.json).toHaveBeenCalledWith(mockData);
    });

    it('xử lý lỗi 500', async () => {
      vi.spyOn(repo, 'findAll').mockRejectedValue(new Error('db fail'));
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.getAllCustomers({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCustomerById', () => {
    it('trả về 404 nếu không tìm thấy', async () => {
      vi.spyOn(repo, 'findById').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.getCustomerById({ params: { id: 'x' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('trả về customer nếu tìm thấy', async () => {
      const mockCustomer = { id: 'c1', name: 'A', contracts: [] };
      vi.spyOn(repo, 'findById').mockResolvedValue(mockCustomer);
      const res = { json: vi.fn() };
      await controller.getCustomerById({ params: { id: 'c1' } }, res);
      expect(res.json).toHaveBeenCalledWith(mockCustomer);
    });
  });

  describe('createCustomer', () => {
    it('tạo customer thành công (201)', async () => {
      const newCust = { id: 'cust_testid123', name: 'New' };
      vi.spyOn(repo, 'create').mockResolvedValue(newCust);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createCustomer({ body: { name: 'New' }, user: { id: 'u1' } }, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newCust);
    });
  });

  describe('updateCustomer', () => {
    it('trả về 404 nếu customer không tồn tại', async () => {
      vi.spyOn(repo, 'findRawById').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.updateCustomer({ params: { id: 'x' }, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('cập nhật thành công', async () => {
      const oldC = { id: 'c1', name: 'Old' };
      const updC = { id: 'c1', name: 'New' };
      vi.spyOn(repo, 'findRawById').mockResolvedValue(oldC);
      vi.spyOn(repo, 'update').mockResolvedValue(updC);
      const res = { json: vi.fn() };
      await controller.updateCustomer({ params: { id: 'c1' }, body: { name: 'New' }, user: { id: 'u1' } }, res);
      expect(res.json).toHaveBeenCalledWith(updC);
    });
  });

  describe('convertToResident business rules', () => {
    it('yêu cầu hợp đồng hoàn thành', async () => {
      const prisma = require('../config/prisma');
      vi.spyOn(prisma.customers, 'findUnique').mockResolvedValue({ id: 'c1', contracts: [] });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.convertToResident({ params: { id: 'c1' }, body: {}, user: { id: 'u1' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requiresCompletedContract: true }));
    });

    it('yêu cầu CMND/CCCD', async () => {
      const prisma = require('../config/prisma');
      vi.spyOn(prisma.customers, 'findUnique').mockResolvedValue({
        id: 'c1',
        id_number: '',
        contracts: [{ id: 'ct1', status: 'COMPLETED', apartment_id: 'a1', apartments: { occupancies: [] } }],
      });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.convertToResident({ params: { id: 'c1' }, body: {}, user: { id: 'u1' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ missingIdNumber: true }));
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

describe('push', () => {
  let controller;
  let service;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/pushController');
    service = require('../../src/services/pushService');
    repo = require('../../src/repositories/pushRepository');
  });

  afterEach(() => vi.restoreAllMocks());

  describe('getVapidPublicKey', () => {
    it('trả về publicKey từ env', () => {
      process.env.VAPID_PUBLIC_KEY = 'pk-test';
      const res = { json: vi.fn() };
      controller.getVapidPublicKey({}, res);
      expect(res.json).toHaveBeenCalledWith({ publicKey: 'pk-test' });
    });
  });

  describe('subscribe', () => {
    it('401 nếu không có userId', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.subscribe({ body: { endpoint: 'e' }, user: null, resident: null }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('400 nếu thiếu endpoint', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.subscribe({ body: {}, user: { id: 'u1' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('tạo mới nếu chưa tồn tại', async () => {
      vi.spyOn(repo, 'findByEndpoint').mockResolvedValue(null);
      vi.spyOn(repo, 'create').mockResolvedValue({});
      const res = { json: vi.fn() };
      await controller.subscribe({ body: { endpoint: 'e', p256dh: 'p', auth: 'a' }, user: { id: 'u1' } }, res);
      expect(repo.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Đăng ký nhận thông báo thành công' });
    });

    it('update nếu đã tồn tại', async () => {
      vi.spyOn(repo, 'findByEndpoint').mockResolvedValue({ endpoint: 'e', apartment_id: 'old' });
      vi.spyOn(repo, 'update').mockResolvedValue({});
      const res = { json: vi.fn() };
      await controller.subscribe({ body: { endpoint: 'e', p256dh: 'p', auth: 'a', apartmentId: 'new' }, user: { id: 'u1' } }, res);
      expect(repo.update).toHaveBeenCalledWith('e', expect.objectContaining({ apartment_id: 'new' }));
    });
  });

  describe('unsubscribe', () => {
    it('400 nếu thiếu endpoint', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.unsubscribe({ body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('xóa thành công', async () => {
      vi.spyOn(repo, 'deleteMany').mockResolvedValue({});
      const res = { json: vi.fn() };
      await controller.unsubscribe({ body: { endpoint: 'e' } }, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hủy đăng ký thông báo thành công' });
    });
  });

  describe('getStatus', () => {
    it('401 nếu không có userId', async () => {
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.getStatus({ user: null, resident: null }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('trả về subscribed true nếu count>0', async () => {
      vi.spyOn(repo, 'countByUser').mockResolvedValue(2);
      const res = { json: vi.fn() };
      await controller.getStatus({ user: { id: 'u1' } }, res);
      expect(res.json).toHaveBeenCalledWith({ subscribed: true, count: 2 });
    });
  });
});

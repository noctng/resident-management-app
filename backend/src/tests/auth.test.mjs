import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/serverLogger', () => ({ logAudit: vi.fn() }));
vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn().mockResolvedValue('hashed'),
}));
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('fake-token'),
}));

describe('auth', () => {
  let controller;
  let service;
  let repo;
  let bcrypt;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/authController');
    service = require('../../src/services/authService');
    repo = require('../../src/repositories/authRepository');
    bcrypt = require('bcrypt');
  });

  describe('login', () => {
    it('trả về 401 nếu user không tồn tại', async () => {
      vi.spyOn(repo, 'findUserByUsername').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), cookie: vi.fn() };
      await controller.login({ body: { username: 'x', password: 'y' }, user: {} }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('trả về 401 nếu sai mật khẩu', async () => {
      vi.spyOn(repo, 'findUserByUsername').mockResolvedValue({ id: 'u1', username: 'a', password_hash: 'h', role: 1, permissions: [] });
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), cookie: vi.fn() };
      await controller.login({ body: { username: 'a', password: 'wrong' }, user: {} }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('login thành công (200) + set cookie', async () => {
      vi.spyOn(repo, 'findUserByUsername').mockResolvedValue({ id: 'u1', username: 'a', password_hash: 'h', role: 0, permissions: ['x'] });
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), cookie: vi.fn() };
      await controller.login({ body: { username: 'a', password: 'right' }, user: {} }, res);
      expect(res.cookie).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Đăng nhập thành công.' }));
    });
  });

  describe('logout', () => {
    it('clear cookie + 200', () => {
      const res = { clearCookie: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
      controller.logout({ user: { id: 'u1' } }, res);
      expect(res.clearCookie).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getSession', () => {
    it('trả về 404 nếu không có user/resident', async () => {
      vi.spyOn(service, 'getSession').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.getSession({ user: null, resident: null }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('trả về session nếu có user', async () => {
      vi.spyOn(service, 'getSession').mockResolvedValue({ user: { id: 'u1' }, userType: 'admin' });
      const res = { json: vi.fn() };
      await controller.getSession({ user: { id: 'u1' }, resident: null }, res);
      expect(res.json).toHaveBeenCalledWith({ user: { id: 'u1' }, userType: 'admin' });
    });
  });

  describe('residentLogin', () => {
    it('trả về 401 nếu resident không tồn tại', async () => {
      vi.spyOn(repo, 'findResidentByPhone').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), cookie: vi.fn() };
      await controller.residentLogin({ body: { phoneNumber: '090', password: 'x' } }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('trả về 403 nếu không có occupancies', async () => {
      vi.spyOn(repo, 'findResidentByPhone').mockResolvedValue({ id: 'r1', is_active: true });
      vi.spyOn(repo, 'findResidentAccount').mockResolvedValue({ password_hash: 'h' });
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      vi.spyOn(repo, 'findOccupancies').mockResolvedValue([]);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis(), cookie: vi.fn() };
      await controller.residentLogin({ body: { phoneNumber: '090', password: 'x' } }, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('changeResidentPassword', () => {
    it('trả về 403 nếu không đúng resident', async () => {
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.changeResidentPassword(
        { params: { residentId: 'r2' }, body: {}, resident: { id: 'r1' } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('trả về 404 nếu không có account', async () => {
      vi.spyOn(repo, 'findResidentAccount').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.changeResidentPassword(
        { params: { residentId: 'r1' }, body: { currentPassword: 'a', newPassword: 'b' }, resident: { id: 'r1' } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('đổi thành công', async () => {
      vi.spyOn(repo, 'findResidentAccount').mockResolvedValue({ password_hash: 'h' });
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      vi.spyOn(repo, 'updateResidentPassword').mockResolvedValue({});
      const res = { json: vi.fn() };
      await controller.changeResidentPassword(
        { params: { residentId: 'r1' }, body: { currentPassword: 'a', newPassword: 'b' }, resident: { id: 'r1' } },
        res
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Đổi mật khẩu thành công.' }));
    });
  });

  describe('changeUserPassword', () => {
    it('trả về 404 nếu không tìm thấy user', async () => {
      vi.spyOn(repo, 'findUserByIdRaw').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.changeUserPassword(
        { body: { currentPassword: 'a', newPassword: 'b' }, user: { id: 'u1', username: 'x' } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('đổi thành công', async () => {
      vi.spyOn(repo, 'findUserByIdRaw').mockResolvedValue({ id: 'u1', username: 'x' });
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      vi.spyOn(repo, 'updateUserPassword').mockResolvedValue({});
      const res = { json: vi.fn() };
      await controller.changeUserPassword(
        { body: { currentPassword: 'a', newPassword: 'b' }, user: { id: 'u1', username: 'x' } },
        res
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Đổi mật khẩu thành công.' }));
    });
  });
});

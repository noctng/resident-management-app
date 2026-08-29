import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/serverLogger', () => ({ logAudit: vi.fn() }));

describe('user', () => {
  let controller;
  let service;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/userController');
    service = require('../../src/services/userService');
    repo = require('../../src/repositories/userRepository');
  });

  describe('getAllUsers', () => {
    it('trả về danh sách users', async () => {
      vi.spyOn(repo, 'findAll').mockResolvedValue([{ id: 'u1', username: 'a' }]);
      const res = { json: vi.fn() };
      await controller.getAllUsers({}, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 'u1', username: 'a' }]);
    });
  });

  describe('createUser', () => {
    it('trả về 400 nếu username tồn tại', async () => {
      vi.spyOn(repo, 'findByUsername').mockResolvedValue({ id: 'u1' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createUser({ body: { username: 'a', password: 'x' }, user: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('tạo user thành công (201)', async () => {
      vi.spyOn(repo, 'findByUsername').mockResolvedValue(null);
      vi.spyOn(repo, 'create').mockResolvedValue({ id: 'u1', username: 'a', role: 1 });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.createUser({ body: { username: 'a', password: 'x' }, user: {} }, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateUser', () => {
    it('trả về 400 nếu tự hạ quyền admin', async () => {
      const currentUser = { id: 'u1', role: 0 };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.updateUser({ params: { id: 'u1' }, body: { role: 1 }, user: currentUser }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('trả về 404 nếu không tìm thấy', async () => {
      vi.spyOn(repo, 'findById').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.updateUser({ params: { id: 'x' }, body: {}, user: { id: 'u1', role: 0 } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('cập nhật thành công', async () => {
      vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u2', role: 1 });
      vi.spyOn(repo, 'update').mockResolvedValue({ id: 'u2', username: 'b', role: 1 });
      const res = { json: vi.fn() };
      await controller.updateUser({ params: { id: 'u2' }, body: { role: 1 }, user: { id: 'u1', role: 0 } }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'u2' }));
    });
  });

  describe('deleteUser', () => {
    it('trả về 400 nếu tự xóa', async () => {
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.deleteUser({ params: { id: 'u1' }, user: { id: 'u1' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('xóa thành công (204)', async () => {
      vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u2' });
      vi.spyOn(repo, 'delete').mockResolvedValue({});
      const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      await controller.deleteUser({ params: { id: 'u2' }, user: { id: 'u1' } }, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('resetPassword', () => {
    it('trả về 404 nếu không tìm thấy', async () => {
      vi.spyOn(repo, 'findByIdRaw').mockResolvedValue(null);
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.resetPassword({ params: { id: 'x' }, user: {} }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('trả về 403 nếu là admin', async () => {
      vi.spyOn(repo, 'findByIdRaw').mockResolvedValue({ id: 'u1', username: 'admin' });
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      await controller.resetPassword({ params: { id: 'u1' }, user: {} }, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('reset thành công', async () => {
      vi.spyOn(repo, 'findByIdRaw').mockResolvedValue({ id: 'u1', username: 'staff' });
      vi.spyOn(repo, 'updatePassword').mockResolvedValue({});
      const res = { json: vi.fn() };
      await controller.resetPassword({ params: { id: 'u1' }, user: {} }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('reset') }));
    });
  });
});

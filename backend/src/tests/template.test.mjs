import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

describe('template', () => {
  let controller;
  let service;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/templateController');
    service = require('../../src/services/templateService');
    repo = require('../../src/repositories/templateRepository');
  });

  afterEach(() => vi.restoreAllMocks());

  describe('getAllTemplates', () => {
    it('trả về danh sách templates', async () => {
      vi.spyOn(repo, 'findAll').mockResolvedValue([{ code: 'A', subject: 's' }]);
      const res = { json: vi.fn() };
      await controller.getAllTemplates({}, res);
      expect(res.json).toHaveBeenCalledWith([{ code: 'A', subject: 's' }]);
    });
    it('500 nếu lỗi', async () => {
      vi.spyOn(repo, 'findAll').mockRejectedValue(new Error('x'));
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.getAllTemplates({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateTemplate', () => {
    it('cập nhật template', async () => {
      vi.spyOn(repo, 'update').mockResolvedValue({ code: 'A', subject: 'new' });
      const res = { json: vi.fn() };
      await controller.updateTemplate({ params: { code: 'A' }, body: { subject: 'new', body: 'b' } }, res);
      expect(repo.update).toHaveBeenCalledWith('A', { subject: 'new', body: 'b' });
      expect(res.json).toHaveBeenCalledWith({ code: 'A', subject: 'new' });
    });
    it('500 nếu lỗi', async () => {
      vi.spyOn(repo, 'update').mockRejectedValue(new Error('x'));
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.updateTemplate({ params: { code: 'A' }, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

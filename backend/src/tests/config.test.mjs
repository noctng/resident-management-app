import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/logger', () => ({ logActivity: vi.fn() }));

describe('config', () => {
  let controller;
  let service;
  let repo;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/configController');
    service = require('../../src/services/configService');
    repo = require('../../src/repositories/configRepository');
  });

  describe('getEmailConfig', () => {
    it('trả về config + mask SMTP_PASS', async () => {
      vi.spyOn(service, 'getEmailConfig').mockResolvedValue({ SMTP_HOST: 'smtp.x', SMTP_PASS: '********' });
      const res = { json: vi.fn() };
      await controller.getEmailConfig({}, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ SMTP_HOST: 'smtp.x', SMTP_PASS: '********' }));
    });
  });

  describe('updateEmailConfig', () => {
    it('gọi service update', async () => {
      vi.spyOn(service, 'updateEmailConfig').mockResolvedValue({ message: 'Cập nhật thành công' });
      const res = { json: vi.fn() };
      await controller.updateEmailConfig({ body: { SMTP_HOST: 'h' }, user: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Cập nhật thành công' });
    });
  });

  describe('getQRConfig / Public', () => {
    it('getQRConfig trả về map', async () => {
      vi.spyOn(service, 'getQRConfig').mockResolvedValue({ QR_BANK_ACCOUNT: '123' });
      const res = { json: vi.fn() };
      await controller.getQRConfig({}, res);
      expect(res.json).toHaveBeenCalledWith({ QR_BANK_ACCOUNT: '123' });
    });

    it('getQRConfigPublic trả về map', async () => {
      vi.spyOn(service, 'getQRConfigPublic').mockResolvedValue({ QR_BANK_CODE: 'ABC' });
      const res = { json: vi.fn() };
      await controller.getQRConfigPublic({}, res);
      expect(res.json).toHaveBeenCalledWith({ QR_BANK_CODE: 'ABC' });
    });
  });

  describe('Amenity limits', () => {
    it('getAmenityLimits trả về object', async () => {
      vi.spyOn(service, 'getAmenityLimits').mockResolvedValue({ GYM: { monthlyLimit: 5 } });
      const res = { json: vi.fn() };
      await controller.getAmenityLimits({}, res);
      expect(res.json).toHaveBeenCalledWith({ GYM: { monthlyLimit: 5 } });
    });

    it('getAmenityLimitsPublic trả về object', async () => {
      vi.spyOn(service, 'getAmenityLimitsPublic').mockResolvedValue({ YOGA: { monthlyLimit: 3 } });
      const res = { json: vi.fn() };
      await controller.getAmenityLimitsPublic({}, res);
      expect(res.json).toHaveBeenCalledWith({ YOGA: { monthlyLimit: 3 } });
    });

    it('updateAmenityLimits gọi service', async () => {
      vi.spyOn(service, 'updateAmenityLimits').mockResolvedValue({ message: 'ok' });
      const res = { json: vi.fn() };
      await controller.updateAmenityLimits({ body: { GYM: { monthlyLimit: 5 } } }, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
    });
  });

  describe('AI config', () => {
    it('getAIConfig mask key', async () => {
      vi.spyOn(service, 'getAIConfig').mockResolvedValue({ AI_BASE_URL: 'x', AI_API_KEY: '********', AI_HAS_KEY: true });
      const res = { json: vi.fn() };
      await controller.getAIConfig({}, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ AI_API_KEY: '********', AI_HAS_KEY: true }));
    });

    it('updateAIConfig gọi service', async () => {
      vi.spyOn(service, 'updateAIConfig').mockResolvedValue({ message: 'xong' });
      const res = { json: vi.fn() };
      await controller.updateAIConfig({ body: { AI_MODEL: 'gpt' }, user: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'xong' });
    });
  });

  describe('Sepay config', () => {
    it('getSepayConfig trả về config', async () => {
      vi.spyOn(service, 'getSepayConfig').mockResolvedValue({ SEPAY_ENABLED: true, SEPAY_API_KEY: '********' });
      const res = { json: vi.fn() };
      await controller.getSepayConfig({}, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ SEPAY_ENABLED: true }));
    });

    it('updateSepayConfig gọi service', async () => {
      vi.spyOn(service, 'updateSepayConfig').mockResolvedValue({ message: 'ok' });
      const res = { json: vi.fn() };
      await controller.updateSepayConfig({ body: {}, user: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
    });
  });

  describe('Handbook', () => {
    it('getHandbookInfo gọi service với exists=false', async () => {
      vi.spyOn(service, 'getHandbookInfo').mockResolvedValue({ title: 'T', exists: false });
      // Mock fs.existsSync to false for both paths
      const fs = require('fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const res = { json: vi.fn() };
      await controller.getHandbookInfo({}, res);
      expect(res.json).toHaveBeenCalledWith({ title: 'T', exists: false });
    });

    it('updateHandbookSettings gọi service', async () => {
      vi.spyOn(service, 'updateHandbookSettings').mockResolvedValue({ message: 'ok' });
      const res = { json: vi.fn() };
      await controller.updateHandbookSettings({ body: { title: 'T' }, user: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
    });
  });

  describe('buildAmenityLimits (pure logic)', () => {
    it('tạo default limits từ AMENITY_TYPES', () => {
      const { getAmenityTypes } = service;
      const types = getAmenityTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('GYM');
    });
  });
});

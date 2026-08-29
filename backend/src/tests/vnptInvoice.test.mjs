import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

vi.mock('../utils/logger', () => ({ logActivity: vi.fn() }));

describe('vnptInvoice', () => {
  let controller;
  let service;
  let repo;
  let vnptSvc;

  beforeEach(() => {
    vi.resetModules();
    controller = require('../../src/controllers/vnptInvoiceController');
    service = require('../../src/services/vnptInvoiceApiService');
    repo = require('../../src/repositories/vnptInvoiceRepository');
    vnptSvc = require('../../src/services/vnptInvoiceService');
  });

  afterEach(() => vi.restoreAllMocks());

  describe('getVnptConfig', () => {
    it('mask password fields', async () => {
      const res = { json: vi.fn() };
      await controller.getVnptConfig({}, res);
      const out = res.json.mock.calls[0][0];
      if (out.VNPT_SERVICE_PASSWORD) expect(out.VNPT_SERVICE_PASSWORD).toBe('********');
      if (out.VNPT_ADMIN_PASSWORD) expect(out.VNPT_ADMIN_PASSWORD).toBe('********');
    });
  });

  describe('updateVnptConfig', () => {
    it('upsert các setting', async () => {
      const spy = vi.spyOn(repo, 'upsertSetting').mockResolvedValue({});
      const res = { json: vi.fn() };
      await controller.updateVnptConfig({ body: { VNPT_SERVICE_URL: 'http://x', VNPT_AUTO_ISSUE_ENABLED: true } }, res);
      expect(spy).toHaveBeenCalledWith('VNPT_SERVICE_URL', 'http://x', 'VNPT Invoice Config');
      expect(spy).toHaveBeenCalledWith('VNPT_AUTO_ISSUE_ENABLED', 'true', 'VNPT Auto Issue Config');
      expect(res.json).toHaveBeenCalledWith({ message: 'Cập nhật cấu hình HĐĐT VNPT thành công' });
    });

    it('không upsert password nếu là ********', async () => {
      const spy = vi.spyOn(repo, 'upsertSetting').mockResolvedValue({});
      const res = { json: vi.fn() };
      await controller.updateVnptConfig({ body: { VNPT_SERVICE_PASSWORD: '********' } }, res);
      const passwordCalls = spy.mock.calls.filter((c) => c[0] === 'VNPT_SERVICE_PASSWORD');
      expect(passwordCalls.length).toBe(0);
    });
  });

  describe('previewXml', () => {
    it('trả về xml preview', async () => {
      vi.spyOn(service, 'previewXml').mockResolvedValue({ fkey: 'F1', invoiceXml: '<x/>' });
      const res = { json: vi.fn() };
      await controller.previewXml({ body: { type: 'utility' } }, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, fkey: 'F1', invoiceXml: '<x/>' });
    });
  });

  describe('getInvoiceView', () => {
    it('trả về html view', async () => {
      vi.spyOn(service, 'getInvoiceView').mockResolvedValue({ fkey: 'F1', html: '<html/>' });
      const res = { json: vi.fn() };
      await controller.getInvoiceView({ query: {} }, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, fkey: 'F1', html: '<html/>' });
    });
  });

  describe('downloadInvoicePdf', () => {
    it('set header pdf + end buffer', async () => {
      vi.spyOn(service, 'downloadInvoicePdf').mockResolvedValue({ buffer: Buffer.from('PDF'), filename: 'a.pdf' });
      const res = { setHeader: vi.fn(), end: vi.fn() };
      await controller.downloadInvoicePdf({ query: {} }, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.end).toHaveBeenCalledWith(Buffer.from('PDF'));
    });
  });

  describe('downloadInvoiceXml', () => {
    it('set header xml + send', async () => {
      vi.spyOn(service, 'downloadInvoiceXml').mockResolvedValue({ xml: '<xml/>', filename: 'a.xml' });
      const res = { setHeader: vi.fn(), send: vi.fn() };
      await controller.downloadInvoiceXml({ query: {} }, res);
      expect(res.send).toHaveBeenCalledWith('<xml/>');
    });
  });

  describe('publishInvoice', () => {
    it('phát hành + log activity', async () => {
      vi.spyOn(service, 'publishInvoice').mockResolvedValue({
        invData: { fkey: 'F1', type: 'utility', apartmentCode: 'A', month: 8, year: 2026 },
        realInvoiceNo: 'INV1', realMccqt: 'M1', isSimulated: false,
      });
      const res = { json: vi.fn() };
      await controller.publishInvoice({ body: {}, user: { id: 'u1' } }, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, fkey: 'F1', invoiceNumber: 'INV1' }));
    });
  });

  describe('testConnection', () => {
    it('400 nếu thiếu URL', async () => {
      vi.spyOn(service, 'testConnection').mockResolvedValue({ status: 400, body: { success: false, message: 'thiếu' } });
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.testConnection({}, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('200 nếu có kết quả', async () => {
      vi.spyOn(service, 'testConnection').mockResolvedValue({ status: 200, body: { success: true } });
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await controller.testConnection({}, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

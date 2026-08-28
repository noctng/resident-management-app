import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const fb = realPrisma.resident_feedback;
const fileHelpers = require('../utils/fileHelpers');
const pushService = require('../services/pushService');

describe('feedbackService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('getAllFeedback returns mapped array preserving DTO shape', async () => {
    vi.spyOn(fb, 'findMany').mockResolvedValue([
      {
        id: 'feedback_1', resident_id: 'r1', apartment_id: 'a1', content: 'C',
        image_data: ['x.png'], status: 'PENDING', submitted_at: new Date(),
        admin_response_content: null, admin_response_image_data: [], resolved_at: null,
        residents: { name: 'Nguyen Van A' },
        apartments: { code: 'A101' },
        users: { username: 'admin' },
      },
    ]);
    const svc = require('../services/feedbackService');
    const r = await svc.getAllFeedback();
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].id).toBe('feedback_1');
    expect(r[0].residentId).toBe('r1');
    expect(r[0].residentName).toBe('Nguyen Van A');
    expect(r[0].apartmentId).toBe('a1');
    expect(r[0].apartmentCode).toBe('A101');
    expect(r[0].content).toBe('C');
    expect(r[0].imageData).toEqual(['x.png']);
    expect(r[0].status).toBe('PENDING');
    expect(r[0].adminResponseContent).toBe(null);
    expect(r[0].adminResponseImageData).toEqual([]);
    expect(r[0].resolvedByUsername).toBe('admin');
    expect(r[0].resolvedAt).toBe(null);
  });

  it('getFeedbackByApartment filters by apartment and maps', async () => {
    vi.spyOn(fb, 'findMany').mockResolvedValue([
      {
        id: 'feedback_2', resident_id: 'r2', apartment_id: 'a1', content: 'Hi',
        image_data: [], status: 'RESOLVED', submitted_at: new Date(),
        admin_response_content: 'done', admin_response_image_data: [],
        resolved_at: new Date(),
        residents: null, apartments: { code: 'A101' }, users: null,
      },
    ]);
    const svc = require('../services/feedbackService');
    const r = await svc.getFeedbackByApartment('a1');
    expect(r).toHaveLength(1);
    expect(r[0].apartmentId).toBe('a1');
    // relation nullable → null (không crash)
    expect(r[0].residentName).toBe(null);
    expect(r[0].resolvedByUsername).toBe(null);
    expect(fb.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { apartment_id: 'a1' },
    }));
  });

  it('createFeedback builds id, saves no images when no files, returns DTO', async () => {
    vi.spyOn(fb, 'create').mockImplementation((d) => Promise.resolve({
      ...d.data,
      image_data: d.data.image_data,
      status: 'PENDING', submitted_at: new Date(),
      residents: { name: 'Nguyen Van A' }, apartments: { code: 'A101' },
    }));
    const svc = require('../services/feedbackService');
    const r = await svc.createFeedback(
      { residentId: 'r1', apartmentId: 'a1', content: 'Phan anh' },
      undefined
    );
    expect(r.id.startsWith('feedback_')).toBe(true);
    expect(r.residentId).toBe('r1');
    expect(r.apartmentId).toBe('a1');
    expect(r.content).toBe('Phan anh');
    expect(r.imageData).toEqual([]);
    expect(fb.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        resident_id: 'r1', apartment_id: 'a1', content: 'Phan anh', image_data: [],
      }),
    }));
  });

  it('createFeedback saves one image per uploaded file', async () => {
    const saveSpy = vi.spyOn(fileHelpers, 'saveImg').mockReturnValue('feedback_9-pic01.png');
    vi.spyOn(fb, 'create').mockImplementation((d) => Promise.resolve({
      ...d.data, status: 'PENDING', submitted_at: new Date(),
      residents: { name: 'X' }, apartments: { code: 'A101' },
    }));
    const svc = require('../services/feedbackService');
    await svc.createFeedback(
      { residentId: 'r1', apartmentId: 'a1', content: 'Có ảnh' },
      [{ buffer: Buffer.from('x'), mimetype: 'image/png' }]
    );
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(fb.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ image_data: ['feedback_9-pic01.png'] }),
    }));
  });

  it('resolveFeedback updates record, fires push, returns DTO', async () => {
    const pushSpy = vi.spyOn(pushService, 'sendPushToApartment').mockResolvedValue();
    vi.spyOn(fb, 'update').mockImplementation((d) => Promise.resolve({
      id: 'feedback_1', apartment_id: 'a1', content: 'Góp ý',
      status: 'RESOLVED', admin_response_content: 'Đã xử lý',
      admin_response_image_data: [], resolved_by_user_id: 'u1', resolved_at: new Date(),
      residents: { name: 'Nguyen Van A' }, apartments: { code: 'A101' },
      users: { username: 'admin' },
    }));
    const svc = require('../services/feedbackService');
    const r = await svc.resolveFeedback('feedback_1', { adminResponseContent: 'Đã xử lý' }, undefined, 'u1');
    expect(r.status).toBe('RESOLVED');
    expect(r.adminResponseContent).toBe('Đã xử lý');
    expect(r.resolvedByUsername).toBe('admin');
    expect(fb.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'feedback_1' },
      data: expect.objectContaining({
        status: 'RESOLVED', admin_response_content: 'Đã xử lý',
        resolved_by_user_id: 'u1',
      }),
    }));
    await new Promise((res) => setImmediate(res)); // chờ push fire-and-forget resolve
    expect(pushSpy).toHaveBeenCalledWith('a1', expect.objectContaining({
      title: '📢 Phản ánh của bạn đã được xử lý',
      tag: 'feedback-feedback_1',
      url: '/?tab=feedback',
    }));
  });

  it('resolveFeedback saves admin response images when provided', async () => {
    vi.spyOn(pushService, 'sendPushToApartment').mockResolvedValue();
    const saveSpy = vi.spyOn(fileHelpers, 'saveImg').mockReturnValue('feedback_1-res01.png');
    vi.spyOn(fb, 'update').mockImplementation((d) => Promise.resolve({
      id: 'feedback_1', apartment_id: 'a1', content: 'Góp ý',
      status: 'RESOLVED', admin_response_content: 'ok',
      admin_response_image_data: d.data.admin_response_image_data, resolved_by_user_id: 'u1',
      resolved_at: new Date(), residents: null, apartments: { code: 'A101' }, users: null,
    }));
    const svc = require('../services/feedbackService');
    await svc.resolveFeedback(
      'feedback_1', { adminResponseContent: 'ok' },
      [{ buffer: Buffer.from('y'), mimetype: 'image/jpeg' }], 'u1'
    );
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(fb.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ admin_response_image_data: ['feedback_1-res01.png'] }),
    }));
  });
});

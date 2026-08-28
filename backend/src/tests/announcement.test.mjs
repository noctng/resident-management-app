import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const pushService = require('../services/pushService');

const a = realPrisma.announcements;

describe('announcementService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('listPublished returns {data,total}', async () => {
    vi.spyOn(a, 'findMany').mockResolvedValue([{ id: '1' }]);
    const svc = require('../services/announcementService');
    const r = await svc.listPublished({ limit: 10, offset: 0 });
    expect(r.data).toHaveLength(1);
    expect(r.total).toBe(1);
    expect(a.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { is_published: true } }));
  });

  it('getById throws 404 when not found', async () => {
    vi.spyOn(a, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/announcementService');
    await expect(svc.getById('x')).rejects.toMatchObject({ status: 404 });
  });

  it('getById throws 404 when unpublished & not admin', async () => {
    vi.spyOn(a, 'findUnique').mockResolvedValue({ is_published: false });
    const svc = require('../services/announcementService');
    await expect(svc.getById('x', false)).rejects.toMatchObject({ status: 404 });
  });

  it('getById returns post for admin even if unpublished', async () => {
    vi.spyOn(a, 'findUnique').mockResolvedValue({ is_published: false, id: 'x' });
    const svc = require('../services/announcementService');
    const p = await svc.getById('x', true);
    expect(p.id).toBe('x');
  });

  it('create saves cover & media images and calls prisma.create', async () => {
    vi.spyOn(a, 'create').mockImplementation((d) => Promise.resolve(d.data));
    const svc = require('../services/announcementService');
    const post = await svc.create(
      { title: 'T', content: 'C', cover_image_base64: 'data:image/png;base64,AAA', media_base64_list: ['data:image/png;base64,BBB'] },
      'user-1'
    );
    expect(post.cover_image).toMatch(/^\/news\/images\//);
    expect(post.media_urls).toHaveLength(1);
    expect(a.create).toHaveBeenCalled();
  });

  it('update merges fields and keeps media', async () => {
    vi.spyOn(a, 'findUnique').mockResolvedValue({ title: 'old', media_urls: ['a'], cover_image: null });
    vi.spyOn(a, 'update').mockImplementation((d) => Promise.resolve(d.data));
    const svc = require('../services/announcementService');
    const r = await svc.update('id1', { title: 'new' }, { title: 'old', media_urls: ['a'], cover_image: null });
    expect(r.title).toBe('new');
    expect(r.media_urls).toContain('a');
  });

  it('publish sets published and fires push', async () => {
    vi.spyOn(a, 'findUnique').mockResolvedValue({ id: 'id1', category: 'urgent', title: 'Fire', summary: 'now' });
    vi.spyOn(a, 'update').mockResolvedValue({ id: 'id1', is_published: true });
    const sendSpy = vi.spyOn(pushService, 'sendPushToAllResidents').mockResolvedValue();
    const svc = require('../services/announcementService');
    const r = await svc.publish('id1');
    expect(r.is_published).toBe(true);
    await new Promise((res) => setImmediate(res)); // chờ push fire-and-forget resolve
    expect(sendSpy).toHaveBeenCalled();
  });

  it('publish throws 404 if missing', async () => {
    vi.spyOn(a, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/announcementService');
    await expect(svc.publish('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('unpublish sets unpublished', async () => {
    vi.spyOn(a, 'update').mockResolvedValue({ is_published: false });
    const svc = require('../services/announcementService');
    const r = await svc.unpublish('id1');
    expect(r.is_published).toBe(false);
  });

  it('uploadMedia returns url for valid base64', async () => {
    const svc = require('../services/announcementService');
    const r = await svc.uploadMedia('data:image/png;base64,ABC');
    expect(r.url).toMatch(/^\/news\/images\//);
  });

  it('uploadMedia throws 400 for empty', async () => {
    const svc = require('../services/announcementService');
    await expect(svc.uploadMedia()).rejects.toMatchObject({ status: 400 });
  });

  it('remove calls prisma.delete', async () => {
    vi.spyOn(a, 'delete').mockResolvedValue({});
    const svc = require('../services/announcementService');
    await svc.remove('id1');
    expect(a.delete).toHaveBeenCalledWith({ where: { id: 'id1' } });
  });
});

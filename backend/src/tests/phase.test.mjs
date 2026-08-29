import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này.
const realPrisma = require('../config/prisma');
const ph = realPrisma.project_phases;
const apt = realPrisma.apartments;
const logger = require('../utils/logger');

describe('phaseService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // logActivity là side-effect DB → mock no-op để test không đụng DB thật.
    vi.spyOn(logger, 'logActivity').mockResolvedValue(undefined);
  });

  it('getPhases returns {success:true, phases} enriched with apartment_count', async () => {
    vi.spyOn(ph, 'findMany').mockResolvedValue([
      { phase_code: 'A', phase_name: 'Khu A', display_order: 1, is_active: true },
      { phase_code: 'B', phase_name: 'Khu B', display_order: 2, is_active: true },
    ]);
    vi.spyOn(apt, 'groupBy').mockResolvedValue([
      { phase_code: 'a', _count: { id: 5 } },
      { phase_code: 'b', _count: { id: 3 } },
    ]);
    const svc = require('../services/phaseService');
    const r = await svc.getPhases();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(2);
    expect(r[0].apartment_count).toBe(5);
    expect(r[1].apartment_count).toBe(3);
  });

  it('getPhases handles missing phase_code (countMap null-safe)', async () => {
    vi.spyOn(ph, 'findMany').mockResolvedValue([
      { phase_code: 'A', phase_name: 'Khu A', display_order: 1, is_active: true },
    ]);
    vi.spyOn(apt, 'groupBy').mockResolvedValue([{ phase_code: null, _count: { id: 2 } }]);
    const svc = require('../services/phaseService');
    const r = await svc.getPhases();
    expect(r[0].apartment_count).toBe(0);
  });

  it('createPhase throws 400 when missing phase_code or phase_name', async () => {
    const svc = require('../services/phaseService');
    await expect(svc.createPhase({ phase_name: 'Khu A' }, { id: 'u1' }))
      .rejects.toMatchObject({ status: 400 });
    await expect(svc.createPhase({ phase_code: 'A' }, { id: 'u1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('createPhase throws 400 on duplicate phase_code', async () => {
    vi.spyOn(ph, 'findUnique').mockResolvedValue({ id: 'existing', phase_code: 'A' });
    const svc = require('../services/phaseService');
    await expect(svc.createPhase({ phase_code: ' a ', phase_name: 'Khu A' }, { id: 'u1' }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining('A') });
  });

  it('createPhase normalizes code (trim+upper+underscore) and creates', async () => {
    vi.spyOn(ph, 'findUnique').mockResolvedValue(null);
    vi.spyOn(ph, 'create').mockImplementation((d) => Promise.resolve({
      id: 'phase_1', phase_code: 'KHU_A', phase_name: 'Khu A', is_active: true,
    }));
    const svc = require('../services/phaseService');
    const r = await svc.createPhase({ phase_code: ' khu a ', phase_name: '  Khu A ' }, { id: 'u1' });
    expect(r.id).toBe('phase_1');
    expect(ph.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phase_code: 'KHU_A',
        phase_name: 'Khu A',
        is_active: true,
      }),
    });
    expect(logger.logActivity).toHaveBeenCalled();
  });

  it('updatePhase throws 404 when phase not found', async () => {
    vi.spyOn(ph, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/phaseService');
    await expect(svc.updatePhase('id1', { phase_name: 'X' }, { id: 'u1' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('updatePhase updates only provided fields and logs', async () => {
    vi.spyOn(ph, 'findUnique').mockResolvedValue({
      id: 'id1', phase_code: 'A', phase_name: 'Old', description: 'd', display_order: 1, is_active: true,
    });
    vi.spyOn(ph, 'update').mockImplementation((d) => Promise.resolve({
      id: 'id1', phase_code: 'A', phase_name: 'New', description: 'd', display_order: 1, is_active: true,
    }));
    const svc = require('../services/phaseService');
    const r = await svc.updatePhase('id1', { phase_name: 'New' }, { id: 'u1' });
    expect(r.phase_name).toBe('New');
    expect(ph.update).toHaveBeenCalledWith({
      where: { id: 'id1' },
      data: expect.objectContaining({
        phase_name: 'New',
        description: 'd',
        updated_at: expect.any(Date),
      }),
    });
    expect(logger.logActivity).toHaveBeenCalled();
  });

  it('deletePhase throws 404 when phase not found', async () => {
    vi.spyOn(ph, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/phaseService');
    await expect(svc.deletePhase('id1', { id: 'u1' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('deletePhase throws 400 when apartments still belong to phase', async () => {
    vi.spyOn(ph, 'findUnique').mockResolvedValue({ id: 'id1', phase_code: 'A', phase_name: 'Khu A' });
    vi.spyOn(apt, 'count').mockResolvedValue(4);
    vi.spyOn(ph, 'delete').mockResolvedValue({}); // spy để assert không được gọi
    const svc = require('../services/phaseService');
    await expect(svc.deletePhase('id1', { id: 'u1' }))
      .rejects.toMatchObject({ status: 400, message: expect.stringContaining('4') });
    expect(ph.delete).not.toHaveBeenCalled();
  });

  it('deletePhase removes phase and logs when no apartments', async () => {
    vi.spyOn(ph, 'findUnique').mockResolvedValue({ id: 'id1', phase_code: 'A', phase_name: 'Khu A' });
    vi.spyOn(apt, 'count').mockResolvedValue(0);
    vi.spyOn(ph, 'delete').mockResolvedValue({});
    const svc = require('../services/phaseService');
    const r = await svc.deletePhase('id1', { id: 'u1' });
    expect(r.id).toBe('id1');
    expect(ph.delete).toHaveBeenCalledWith({ where: { id: 'id1' } });
    expect(logger.logActivity).toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const o = realPrisma.occupancies;

describe('occupancyService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('getOccupancies maps entity → DTO { apartmentId, residentId }', async () => {
    vi.spyOn(o, 'findMany').mockResolvedValue([
      { apartment_id: 'a1', resident_id: 'r1' },
      { apartment_id: 'a2', resident_id: 'r2' },
    ]);
    const svc = require('../services/occupancyService');
    const r = await svc.getOccupancies();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ apartmentId: 'a1', residentId: 'r1' });
    expect(r[1]).toEqual({ apartmentId: 'a2', residentId: 'r2' });
  });

  it('addOccupancy calls prisma.create with mapped data (success)', async () => {
    vi.spyOn(o, 'create').mockResolvedValue({ apartment_id: 'a1', resident_id: 'r1' });
    const svc = require('../services/occupancyService');
    await svc.addOccupancy({ apartmentId: 'a1', residentId: 'r1' });
    expect(o.create).toHaveBeenCalledWith({
      data: { apartment_id: 'a1', resident_id: 'r1' },
    });
  });

  it('addOccupancy throws 400 when missing apartmentId/residentId', async () => {
    const svc = require('../services/occupancyService');
    await expect(svc.addOccupancy({})).rejects.toMatchObject({ status: 400 });
    await expect(svc.addOccupancy({ apartmentId: 'a1' })).rejects.toMatchObject({ status: 400 });
    await expect(svc.addOccupancy({ residentId: 'r1' })).rejects.toMatchObject({ status: 400 });
  });

  it('addOccupancy propagates repository error', async () => {
    vi.spyOn(o, 'create').mockRejectedValue(new Error('DB down'));
    const svc = require('../services/occupancyService');
    await expect(svc.addOccupancy({ apartmentId: 'a1', residentId: 'r1' }))
      .rejects.toThrow('DB down');
  });

  it('removeOccupancy calls prisma.delete with composite key (success)', async () => {
    vi.spyOn(o, 'delete').mockResolvedValue({});
    const svc = require('../services/occupancyService');
    await svc.removeOccupancy('a1', 'r1');
    expect(o.delete).toHaveBeenCalledWith({
      where: { apartment_id_resident_id: { apartment_id: 'a1', resident_id: 'r1' } },
    });
  });

  it('removeOccupancy propagates repository error', async () => {
    vi.spyOn(o, 'delete').mockRejectedValue(new Error('not found'));
    const svc = require('../services/occupancyService');
    await expect(svc.removeOccupancy('a1', 'r1')).rejects.toThrow('not found');
  });
});

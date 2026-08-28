import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const u = realPrisma.utility_records;

describe('utilityService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('getAllUtilityRecords returns mapped DTO array', async () => {
    vi.spyOn(u, 'findMany').mockResolvedValue([
      {
        id: 'rec1', apartment_id: 'a1', month: 5, year: 2025,
        electricity_old_reading: 100, electricity_new_reading: 150,
        water_old_reading: 10, water_new_reading: 20,
        electricity_cost: 100000, water_cost: 50000,
        payment_status: 'UNPAID', paid_date: null, email_sent_at: null,
        pricing_snapshot: null,
      },
    ]);
    const svc = require('../services/utilityService');
    const r = await svc.getAllUtilityRecords();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('rec1');
    expect(r[0].apartmentId).toBe('a1');
    expect(r[0].month).toBe(5);
    expect(r[0].year).toBe(2025);
    expect(r[0].electricity.consumption).toBe(50);
    expect(r[0].water.consumption).toBe(10);
    expect(r[0].paymentStatus).toBe('UNPAID');
    expect(r[0].paidDate).toBe(null);
  });

  it('getUtilityRecordsByApartment returns mapped DTO array filtered by apartment', async () => {
    vi.spyOn(u, 'findMany').mockResolvedValue([
      {
        id: 'rec2', apartment_id: 'a2', month: 6, year: 2025,
        electricity_old_reading: 0, electricity_new_reading: 0,
        water_old_reading: 0, water_new_reading: 0,
        electricity_cost: 0, water_cost: 0,
        payment_status: 'PAID', paid_date: new Date('2025-06-10T00:00:00Z'),
        email_sent_at: null, pricing_snapshot: null,
      },
    ]);
    const svc = require('../services/utilityService');
    const r = await svc.getUtilityRecordsByApartment('a2');
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(1);
    expect(r[0].apartmentId).toBe('a2');
    expect(r[0].paymentStatus).toBe('PAID');
    expect(r[0].paidDate).toBe('2025-06-10');
  });

  it('recalculateUtilityCosts skips records with no consumption (branch error / no-op)', async () => {
    vi.spyOn(u, 'findMany').mockResolvedValue([
      {
        id: 'rec3', apartment_id: 'a3', month: 5, year: 2025,
        electricity_old_reading: 100, electricity_new_reading: 100,
        water_old_reading: 10, water_new_reading: 10,
        electricity_cost: 0, water_cost: 0,
        apartments: { electricity_type: 'RESIDENTIAL' },
      },
    ]);
    const updateSpy = vi.spyOn(u, 'update').mockResolvedValue({});
    const svc = require('../services/utilityService');
    const r = await svc.recalculateUtilityCosts();
    expect(r.updatedCount).toBe(0);
    expect(r.details).toHaveLength(0);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('recalculateUtilityCosts updates records whose cost changed', async () => {
    vi.spyOn(u, 'findMany').mockResolvedValue([
      {
        id: 'rec4', apartment_id: 'a4', month: 5, year: 2025,
        electricity_old_reading: 0, electricity_new_reading: 100,
        water_old_reading: 0, water_new_reading: 20,
        electricity_cost: 0, water_cost: 0,
        apartments: { electricity_type: 'RESIDENTIAL' },
      },
    ]);
    const updateSpy = vi.spyOn(u, 'update').mockResolvedValue({});
    const svc = require('../services/utilityService');
    const r = await svc.recalculateUtilityCosts();
    expect(r.updatedCount).toBe(1);
    expect(r.details).toHaveLength(1);
    expect(r.details[0].id).toBe('rec4');
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rec4' },
        data: expect.objectContaining({
          electricity_cost: expect.any(Number),
          water_cost: expect.any(Number),
          pricing_snapshot: expect.any(Object),
        }),
      })
    );
  });

  it('formatUtilityRecord reverse-calculates tax from tax-inclusive cost', async () => {
    const svc = require('../services/utilityService');
    const dto = svc.formatUtilityRecord({
      id: 'x', apartment_id: 'a', month: 1, year: 2025,
      electricity_old_reading: 0, electricity_new_reading: 100,
      water_old_reading: 0, water_new_reading: 10,
      electricity_cost: 110000, water_cost: 52500,
      payment_status: 'UNPAID', paid_date: null, email_sent_at: null,
      // snapshot makes VAT deterministic regardless of pricing.json
      pricing_snapshot: {
        vat: { electricity: 8, water: 5 },
        water: {}, residentialElectricity: [], businessElectricity: {},
      },
    });
    // water: 52500/1.05 = 50000 => tax 2500 (exact)
    expect(dto.water.tax).toBe(2500);
    // electricity: 110000 - 110000/1.08 = 8148 (rounded)
    expect(dto.electricity.tax).toBe(8148);
    expect(dto.electricity.consumption).toBe(100);
  });
});

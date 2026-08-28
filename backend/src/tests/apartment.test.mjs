import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const apt = realPrisma.apartments;
const logs = realPrisma.activity_logs;

describe('apartmentService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('getApartments returns mapped list with derived pricing & residentCount', async () => {
    vi.spyOn(apt, 'findMany').mockResolvedValue([
      {
        id: 'apt1', house_type: 'SHOPHOUSE', code: 'CAN01-01', floor: 1, area: 100,
        electricity_type: 'RESIDENTIAL', phase_code: 'CANTATA', block_code: 'CAN01',
        lot_number: 'Lô 01', land_area: 110, land_price_before_vat: 100,
        construction_area: 130, construction_price_before_vat: 200, vat_rate: 8,
        maintenance_fee_2pct: 6, usable_area: 120, certificate_area: 110,
        direction: 'Đông Nam', view_description: '', bedroom_count: 3, bathroom_count: 3,
        sales_status: 'HANDED_OVER', occupancies: [], contracts: [],
      },
    ]);
    const svc = require('../services/apartmentService');
    const r = await svc.getApartments({});
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('apt1');
    expect(r[0].code).toBe('CAN01-01');
    expect(r[0].phaseCode).toBe('CANTATA');
    expect(r[0].blockCode).toBe('CAN01');
    expect(r[0].landPrice).toBe(100);
    expect(r[0].constructionPrice).toBe(200);
    expect(r[0].residentCount).toBe(0);
    expect(typeof r[0].grandTotal).toBe('number');
  });

  it('getApartments builds where from query filters', async () => {
    const spy = vi.spyOn(apt, 'findMany').mockResolvedValue([]);
    const svc = require('../services/apartmentService');
    await svc.getApartments({ phase: 'CANTATA', status: 'HANDED_OVER', search: '01' });
    expect(spy).toHaveBeenCalled();
    const where = spy.mock.calls[0][0].where;
    expect(where.phase_code).toBe('CANTATA');
    expect(where.sales_status).toBe('HANDED_OVER');
    expect(where.OR).toHaveLength(3);
  });

  it('createApartment throws 400 on duplicate code', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue({ id: 'existing', code: 'CAN01-01' });
    const svc = require('../services/apartmentService');
    await expect(svc.createApartment({ code: 'CAN01-01' }, { id: 'u', username: 'a' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('createApartment throws 400 when code missing', async () => {
    const svc = require('../services/apartmentService');
    await expect(svc.createApartment({}, { id: 'u', username: 'a' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('createApartment returns slim DTO + logs activity on success', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue(null);
    vi.spyOn(apt, 'create').mockImplementation((d) => Promise.resolve({
      id: 'apt1', house_type: 'SHOPHOUSE', code: 'CAN01-02', floor: 1, area: 110,
      electricity_type: 'RESIDENTIAL', phase_code: 'CANTATA', sales_status: 'HANDED_OVER',
    }));
    vi.spyOn(logs, 'create').mockResolvedValue({});
    const svc = require('../services/apartmentService');
    const r = await svc.createApartment({ code: 'CAN01-02', houseType: 'SHOPHOUSE' }, { id: 'u', username: 'a' });
    expect(r.id).toBe('apt1');
    expect(r.code).toBe('CAN01-02');
    expect(r.houseType).toBe('SHOPHOUSE');
    expect(r.phase_code).toBe('CANTATA');
    expect(r.sales_status).toBe('HANDED_OVER');
    expect(apt.create).toHaveBeenCalled();
    const createArgs = apt.create.mock.calls[0][0].data;
    expect(createArgs.code).toBe('CAN01-02');
    expect(createArgs.phase_code).toBe('CANTATA');
    expect(logs.create).toHaveBeenCalled();
  });

  it('updateApartment throws 404 when not found', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/apartmentService');
    await expect(svc.updateApartment('id1', {}, { id: 'u', username: 'a' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('updateApartment returns slim DTO + logs activity on success', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue({
      id: 'id1', land_area: 110, construction_area: 130,
      land_price_before_vat: 100, construction_price_before_vat: 200,
    });
    vi.spyOn(apt, 'update').mockImplementation((d) => Promise.resolve({
      id: 'id1', house_type: 'VILLA', code: 'CAN01-01', floor: 1, area: 110,
      electricity_type: 'RESIDENTIAL', phase_code: 'CANTATA', sales_status: 'HANDED_OVER',
    }));
    vi.spyOn(logs, 'create').mockResolvedValue({});
    const svc = require('../services/apartmentService');
    const r = await svc.updateApartment('id1', { houseType: 'VILLA' }, { id: 'u', username: 'a' });
    expect(r.id).toBe('id1');
    expect(r.houseType).toBe('VILLA');
    expect(r.code).toBe('CAN01-01');
    expect(apt.update).toHaveBeenCalled();
    expect(logs.create).toHaveBeenCalled();
  });

  it('deleteApartment throws 404 when not found', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/apartmentService');
    await expect(svc.deleteApartment('id1', { id: 'u', username: 'a' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('deleteApartment throws 400 when apartment has residents', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue({
      id: 'id1', code: 'CAN01-01', occupancies: [{ id: 'o1' }], contracts: [],
    });
    const svc = require('../services/apartmentService');
    await expect(svc.deleteApartment('id1', { id: 'u', username: 'a' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('deleteApartment throws 400 when apartment has contracts', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue({
      id: 'id1', code: 'CAN01-01', occupancies: [], contracts: [{ id: 'c1' }],
    });
    const svc = require('../services/apartmentService');
    await expect(svc.deleteApartment('id1', { id: 'u', username: 'a' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('deleteApartment removes + returns message + logs activity on success', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue({
      id: 'id1', code: 'CAN01-01', occupancies: [], contracts: [],
    });
    vi.spyOn(apt, 'delete').mockResolvedValue({});
    vi.spyOn(logs, 'create').mockResolvedValue({});
    const svc = require('../services/apartmentService');
    const r = await svc.deleteApartment('id1', { id: 'u', username: 'a' });
    expect(r.message).toContain('Đã xóa căn hộ CAN01-01');
    expect(apt.delete).toHaveBeenCalledWith({ where: { id: 'id1' } });
    expect(logs.create).toHaveBeenCalled();
  });
});

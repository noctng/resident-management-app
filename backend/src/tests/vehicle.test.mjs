import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const v = realPrisma.vehicles;

describe('vehicleService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('getVehicles returns mapped array with owner info', async () => {
    vi.spyOn(v, 'findMany').mockResolvedValue([
      {
        id: 'v1', apartment_id: 'a1', vehicle_type: 'CAR', license_plate: '51A-123',
        created_at: new Date(), updated_at: new Date(),
        apartments: {
          code: 'A101',
          occupancies: [
            { residents: { name: 'Nguyen Van A', phone_number: '0901000000', relationship_status: 'OWNER' } },
          ],
        },
      },
    ]);
    const svc = require('../services/vehicleService');
    const r = await svc.getVehicles();
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].id).toBe('v1');
    expect(r[0].apartmentCode).toBe('A101');
    expect(r[0].ownerName).toBe('Nguyen Van A');
    expect(r[0].ownerPhone).toBe('0901000000');
    expect(r[0].licensePlate).toBe('51A-123');
  });

  it('createVehicle throws 400 on duplicate license plate', async () => {
    vi.spyOn(v, 'findUnique').mockResolvedValue({ id: 'existing' });
    const svc = require('../services/vehicleService');
    await expect(svc.createVehicle({ apartmentId: 'a1', vehicleType: 'CAR', licensePlate: '51A-1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('createVehicle returns 201 DTO on success', async () => {
    vi.spyOn(v, 'findUnique').mockResolvedValue(null);
    vi.spyOn(v, 'create').mockImplementation((d) => Promise.resolve({
      id: 'v1', apartment_id: 'a1', vehicle_type: 'CAR', license_plate: '51A-1',
      created_at: new Date(), updated_at: new Date(),
    }));
    const svc = require('../services/vehicleService');
    const r = await svc.createVehicle({ apartmentId: 'a1', vehicleType: 'CAR', licensePlate: '51A-1' });
    expect(r.id).toBe('v1');
    expect(r.apartmentId).toBe('a1');
    expect(r.vehicleType).toBe('CAR');
    expect(r.licensePlate).toBe('51A-1');
    expect(v.create).toHaveBeenCalledWith({
      data: { apartment_id: 'a1', vehicle_type: 'CAR', license_plate: '51A-1' },
    });
  });

  it('updateVehicle throws 400 on duplicate license plate', async () => {
    vi.spyOn(v, 'findFirst').mockResolvedValue({ id: 'other' });
    const svc = require('../services/vehicleService');
    await expect(svc.updateVehicle('id1', { licensePlate: '51A-1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('updateVehicle returns 200 DTO on success', async () => {
    vi.spyOn(v, 'findFirst').mockResolvedValue(null);
    vi.spyOn(v, 'update').mockImplementation((d) => Promise.resolve({
      id: 'id1', apartment_id: 'a2', vehicle_type: 'MOTORBIKE', license_plate: '51B-2',
      created_at: new Date(), updated_at: new Date(),
    }));
    const svc = require('../services/vehicleService');
    const r = await svc.updateVehicle('id1', { apartmentId: 'a2', vehicleType: 'MOTORBIKE', licensePlate: '51B-2' });
    expect(r.id).toBe('id1');
    expect(r.apartmentId).toBe('a2');
    expect(v.update).toHaveBeenCalled();
  });

  it('deleteVehicle calls prisma.delete', async () => {
    vi.spyOn(v, 'delete').mockResolvedValue({});
    const svc = require('../services/vehicleService');
    await svc.deleteVehicle('id1');
    expect(v.delete).toHaveBeenCalledWith({ where: { id: 'id1' } });
  });

  it('getVehiclesByApartment returns {success:true, vehicles}', async () => {
    vi.spyOn(v, 'findMany').mockResolvedValue([
      { id: 'v1', apartment_id: 'a1', vehicle_type: 'CAR', license_plate: '51A-1', created_at: new Date(), updated_at: new Date() },
    ]);
    const svc = require('../services/vehicleService');
    const r = await svc.getVehiclesByApartment('a1');
    expect(r.success).toBe(true);
    expect(r.vehicles).toHaveLength(1);
    expect(r.vehicles[0].id).toBe('v1');
  });

  it('registerResidentVehicle throws 400 when missing fields', async () => {
    const svc = require('../services/vehicleService');
    await expect(svc.registerResidentVehicle({ apartment_id: 'a1' }))
      .rejects.toMatchObject({ status: 400 });
    await expect(svc.registerResidentVehicle({ license_plate: '51A-1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('registerResidentVehicle throws 400 on duplicate', async () => {
    vi.spyOn(v, 'findUnique').mockResolvedValue({ id: 'existing' });
    const svc = require('../services/vehicleService');
    await expect(svc.registerResidentVehicle({ apartment_id: 'a1', license_plate: '51a-1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('registerResidentVehicle normalizes plate and returns vehicle', async () => {
    vi.spyOn(v, 'findUnique').mockResolvedValue(null);
    vi.spyOn(v, 'create').mockImplementation((d) => Promise.resolve({
      id: 'v1', apartment_id: 'a1', vehicle_type: 'MOTORBIKE', license_plate: '51A-1',
      created_at: new Date(), updated_at: new Date(),
    }));
    const svc = require('../services/vehicleService');
    // không truyền vehicle_type → service mặc định MOTORBIKE; biển số được trim+upper
    const r = await svc.registerResidentVehicle({ apartment_id: 'a1', license_plate: ' 51a-1 ' });
    expect(r.license_plate).toBe('51A-1');
    expect(r.apartment_id).toBe('a1');
    expect(v.create).toHaveBeenCalledWith({
      data: { apartment_id: 'a1', vehicle_type: 'MOTORBIKE', license_plate: '51A-1' },
    });
  });
});

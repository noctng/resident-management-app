import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const pushService = require('../services/pushService');

const au = realPrisma.amenity_usage;
const residents = realPrisma.residents;
const apartments = realPrisma.apartments;

const sampleUsage = (over = {}) => ({
  id: 'amenity_1',
  apartment_id: 'a1',
  resident_id: 'r1',
  amenity: 'GYM',
  usage_date: new Date('2026-01-15'),
  start_time: new Date('2026-01-15T08:00:00'),
  end_time: new Date('2026-01-15T09:00:00'),
  booking_code: 'BK-GYM-ABC',
  status: 'PENDING',
  residents: { name: 'Nguyen Van A' },
  ...over,
});

describe('amenityService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getAmenityUsage returns mapped DTO array (shape preserved)', async () => {
    vi.spyOn(au, 'findMany').mockResolvedValue([sampleUsage()]);
    const svc = require('../services/amenityService');
    const r = await svc.getAmenityUsage();
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].id).toBe('amenity_1');
    expect(r[0].apartmentId).toBe('a1');
    expect(r[0].residentId).toBe('r1');
    expect(r[0].residentName).toBe('Nguyen Van A');
    expect(r[0].amenity).toBe('GYM');
    expect(r[0].bookingCode).toBe('BK-GYM-ABC');
    expect(r[0].status).toBe('PENDING');
    // usageDate is yyyy-mm-dd
    expect(r[0].usageDate).toBe('2026-01-15');
    // startTime/endTime are HH:mm (en-GB)
    expect(r[0].startTime).toBe('08:00');
    expect(r[0].endTime).toBe('09:00');
  });

  it('createAmenityBooking throws 403 when resident not allowed', async () => {
    vi.spyOn(residents, 'findUnique').mockResolvedValue({ can_use_amenities: false, name: 'X' });
    const svc = require('../services/amenityService');
    await expect(
      svc.createAmenityBooking({ apartmentId: 'a1', residentId: 'r1', amenity: 'GYM', usageDate: '2026-01-15', startTime: '08:00', endTime: '09:00' })
    ).rejects.toMatchObject({ status: 403, message: 'Cư dân không được phép đặt.' });
  });

  it('createAmenityBooking throws 403 when resident not found', async () => {
    vi.spyOn(residents, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/amenityService');
    await expect(
      svc.createAmenityBooking({ apartmentId: 'a1', residentId: 'r1', amenity: 'GYM', usageDate: '2026-01-15', startTime: '08:00', endTime: '09:00' })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('createAmenityBooking success → DTO PENDING + create called + push fired', async () => {
    vi.spyOn(residents, 'findUnique').mockResolvedValue({ can_use_amenities: true, name: 'Nguyen Van A' });
    vi.spyOn(au, 'create').mockImplementation((d) => Promise.resolve({ ...d.data, residents: { name: 'Nguyen Van A' } }));
    const sendSpy = vi.spyOn(pushService, 'sendPushToApartment').mockResolvedValue();
    const svc = require('../services/amenityService');

    const r = await svc.createAmenityBooking({
      apartmentId: 'a1',
      residentId: 'r1',
      amenity: 'GYM',
      usageDate: '2026-01-15',
      startTime: '08:00',
      endTime: '09:00',
    });

    expect(r.status).toBe('PENDING');
    expect(r.apartmentId).toBe('a1');
    expect(r.residentId).toBe('r1');
    expect(r.bookingCode).toMatch(/^BK-GYM-/);

    const callData = au.create.mock.calls[0][0].data;
    expect(callData.apartment_id).toBe('a1');
    expect(callData.resident_id).toBe('r1');
    expect(callData.amenity).toBe('GYM');
    expect(callData.status).toBe('PENDING');
    expect(callData.id).toMatch(/^amenity_/);

    await new Promise((res) => setImmediate(res)); // chờ push fire-and-forget
    expect(sendSpy).toHaveBeenCalled();
    const [aptId, payload] = sendSpy.mock.calls[0];
    expect(aptId).toBe('a1');
    expect(payload.title).toBe('Đặt lịch tiện ích thành công');
  });

  it('createAmenityBooking without residentId skips permission check', async () => {
    vi.spyOn(au, 'create').mockImplementation((d) => Promise.resolve({ ...d.data, residents: null }));
    vi.spyOn(pushService, 'sendPushToApartment').mockResolvedValue();
    const svc = require('../services/amenityService');
    const r = await svc.createAmenityBooking({
      apartmentId: 'a1',
      amenity: 'GYM',
      usageDate: '2026-01-15',
      startTime: '08:00',
      endTime: '09:00',
    });
    expect(r.residentId).toBeNull();
    expect(au.create).toHaveBeenCalled();
  });

  it('updateBookingStatus throws 404 when not found', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/amenityService');
    await expect(svc.updateBookingStatus('missing', 'CANCELLED', { isResident: false, userRole: 0 }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('updateBookingStatus resident can ONLY cancel → 403 on other status', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(sampleUsage());
    const svc = require('../services/amenityService');
    await expect(svc.updateBookingStatus('amenity_1', 'CONFIRMED', { isResident: true, residentId: 'r1' }))
      .rejects.toMatchObject({ status: 403, message: 'Cư dân chỉ có quyền hủy đặt chỗ.' });
  });

  it('updateBookingStatus resident 403 when not owner', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(
      sampleUsage({ resident_id: 'r2', apartments: { occupancies: [{ resident_id: 'other' }] } })
    );
    const svc = require('../services/amenityService');
    await expect(svc.updateBookingStatus('amenity_1', 'CANCELLED', { isResident: true, residentId: 'r1' }))
      .rejects.toMatchObject({ status: 403, message: 'Bạn không có quyền thao tác trên đặt lịch này.' });
  });

  it('updateBookingStatus resident owner CANCELLED success + push', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(
      sampleUsage({ apartments: { occupancies: [{ resident_id: 'r1' }] } })
    );
    vi.spyOn(au, 'update').mockImplementation((d) => Promise.resolve({ ...d.data, residents: { name: 'Nguyen Van A' } }));
    const sendSpy = vi.spyOn(pushService, 'sendPushToApartment').mockResolvedValue();
    const svc = require('../services/amenityService');

    const r = await svc.updateBookingStatus('amenity_1', 'CANCELLED', { isResident: true, residentId: 'r1' });
    expect(r.status).toBe('CANCELLED');
    expect(au.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'CANCELLED' } }));

    await new Promise((res) => setImmediate(res));
    expect(sendSpy).toHaveBeenCalled();
  });

  it('updateBookingStatus manager role 0 updates successfully', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(sampleUsage());
    vi.spyOn(au, 'update').mockImplementation((d) => Promise.resolve({ ...d.data, residents: { name: 'Nguyen Van A' } }));
    vi.spyOn(pushService, 'sendPushToApartment').mockResolvedValue();
    const svc = require('../services/amenityService');
    const r = await svc.updateBookingStatus('amenity_1', 'CONFIRMED', { isResident: false, userRole: 0 });
    expect(r.status).toBe('CONFIRMED');
  });

  it('updateBookingStatus manager 403 when role not 0/1', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(sampleUsage());
    const svc = require('../services/amenityService');
    await expect(svc.updateBookingStatus('amenity_1', 'CONFIRMED', { isResident: false, userRole: 5 }))
      .rejects.toMatchObject({ status: 403, message: 'Quyền truy cập bị từ chối.' });
  });

  it('updateAmenityBooking throws 404 when not found', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/amenityService');
    await expect(svc.updateAmenityBooking('missing', { status: 'USED' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('updateAmenityBooking builds updateData for provided fields', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(sampleUsage());
    vi.spyOn(au, 'update').mockImplementation((d) => Promise.resolve({ ...d.data, residents: { name: 'Nguyen Van A' } }));
    const svc = require('../services/amenityService');
    const r = await svc.updateAmenityBooking('amenity_1', { amenity: 'YOGA', status: 'USED' });
    expect(r.amenity).toBe('YOGA');
    expect(r.status).toBe('USED');
    const callData = au.update.mock.calls[0][0].data;
    expect(callData.amenity).toBe('YOGA');
    expect(callData.status).toBe('USED');
    // unspecified fields must NOT be present
    expect(callData.apartment_id).toBeUndefined();
    expect(callData.start_time).toBeUndefined();
  });

  it('deleteAmenityBooking throws 404 when not found', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/amenityService');
    await expect(svc.deleteAmenityBooking('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('deleteAmenityBooking success returns message', async () => {
    vi.spyOn(au, 'findUnique').mockResolvedValue(sampleUsage());
    vi.spyOn(au, 'delete').mockResolvedValue({});
    const svc = require('../services/amenityService');
    const r = await svc.deleteAmenityBooking('amenity_1');
    expect(r).toEqual({ message: 'Đã xóa đặt lịch thành công.' });
    expect(au.delete).toHaveBeenCalledWith({ where: { id: 'amenity_1' } });
  });

  it('getExportData throws 400 on invalid month', async () => {
    const svc = require('../services/amenityService');
    await expect(svc.getExportData('bad')).rejects.toMatchObject({ status: 400 });
    await expect(svc.getExportData(null)).rejects.toMatchObject({ status: 400 });
  });

  it('getExportData fetches usages + apartments for valid month', async () => {
    vi.spyOn(au, 'findMany').mockResolvedValue([]);
    vi.spyOn(apartments, 'findMany').mockResolvedValue([{ id: 'a1', code: 'A101' }]);
    const svc = require('../services/amenityService');
    const r = await svc.getExportData('2026-01');
    expect(r.year).toBe(2026);
    expect(r.monthNum).toBe(1);
    expect(r.apartments).toHaveLength(1);
    expect(au.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usage_date: { gte: expect.any(Date), lt: expect.any(Date) } } })
    );
  });
});

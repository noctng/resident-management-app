import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Singleton thật (CJS) để spyOn — service require cùng instance này.
// managementFee dùng pg Pool (raw SQL) → spy ở lớp repository.
const repo = require('../repositories/managementFeeRepository');
const feeConfigRepo = require('../repositories/feeConfigRepository');
const notificationService = require('../services/notificationService');
const svc = require('../services/managementFeeService');

const CONFIG = {
    management_fee_per_sqm: '10000',
    internet_fee: '200000',
    cable_tv_fee: '100000',
    parking_car_fee: '1200000',
    parking_motorbike_fee: '100000',
    security_fee: '50000',
    cleaning_fee: '50000',
    enabled_fees: {},
};

const USER = { id: 'u1', username: 'admin' };

afterAll(async () => {
    await repo.pool.end();
    if (feeConfigRepo.pool && feeConfigRepo.pool.end) await feeConfigRepo.pool.end();
});

describe('managementFeeService — calculateFeeBreakdown (pure)', () => {
    it('tính đúng tổng khi mọi khoản bật', () => {
        const r = svc.calculateFeeBreakdown(100, CONFIG, {
            parking_car_quantity: 0,
            parking_motorbike_quantity: 0,
            has_internet: true,
            has_cable_tv: true,
        });
        // 100*10000 + 200000 + 100000 + 50000 + 50000 = 1,400,000
        expect(r.management_fee).toBe(1000000);
        expect(r.total_amount).toBe(1400000);
    });

    it('tắt internet/cable_tv và cộng phí gửi xe', () => {
        const r = svc.calculateFeeBreakdown(100, CONFIG, {
            parking_car_quantity: 1,
            parking_motorbike_quantity: 2,
            has_internet: false,
            has_cable_tv: false,
        });
        expect(r.internet_fee).toBe(0);
        expect(r.cable_tv_fee).toBe(0);
        expect(r.parking_car_fee).toBe(1200000);
        expect(r.parking_motorbike_fee).toBe(200000);
        expect(r.total_amount).toBe(1000000 + 1200000 + 200000 + 50000 + 50000);
    });
});

describe('managementFeeService — generateFee', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('tạo thành công 1 fee (PENDING, created_by=user)', async () => {
        vi.spyOn(repo, 'findExisting').mockResolvedValue(null);
        vi.spyOn(feeConfigRepo, 'findCurrent').mockResolvedValue(CONFIG);
        vi.spyOn(repo, 'getApartmentArea').mockResolvedValue(100);
        const insertSpy = vi.spyOn(repo, 'insertFee').mockResolvedValue({ id: 'fee1' });
        vi.spyOn(repo, 'getApartmentCode').mockResolvedValue('A101');
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);

        const r = await svc.generateFee(
            { apartment_id: 'a1', month: 6, year: 2026, has_internet: true },
            USER
        );
        expect(r).toEqual({ id: 'fee1' });
        const vals = insertSpy.mock.calls[0][0];
        expect(vals[16]).toBe('PENDING'); // status
        expect(vals[18]).toBe('u1'); // created_by
    });

    it('throws 400 khi thiếu apartment_id/month/year', async () => {
        await expect(
            svc.generateFee({ month: 6, year: 2026 }, USER)
        ).rejects.toMatchObject({ status: 400, message: 'apartment_id, month, and year are required' });
    });

    it('throws 400 khi month ngoài 1-12', async () => {
        await expect(
            svc.generateFee({ apartment_id: 'a1', month: 13, year: 2026 }, USER)
        ).rejects.toMatchObject({ status: 400, message: 'Month must be between 1 and 12' });
    });

    it('throws 400 khi fee đã tồn tại', async () => {
        vi.spyOn(repo, 'findExisting').mockResolvedValue({ id: 'x' });
        await expect(
            svc.generateFee({ apartment_id: 'a1', month: 6, year: 2026 }, USER)
        ).rejects.toMatchObject({ status: 400, message: 'Management fee for this apartment and month already exists' });
    });

    it('throws 400 khi chưa có cấu hình phí', async () => {
        vi.spyOn(repo, 'findExisting').mockResolvedValue(null);
        vi.spyOn(feeConfigRepo, 'findCurrent').mockResolvedValue(null);
        await expect(
            svc.generateFee({ apartment_id: 'a1', month: 6, year: 2026 }, USER)
        ).rejects.toMatchObject({ status: 400, message: 'No fee configuration found. Please configure fees first.' });
    });

    it('throws (500) khi không tìm thấy căn hộ', async () => {
        vi.spyOn(repo, 'findExisting').mockResolvedValue(null);
        vi.spyOn(feeConfigRepo, 'findCurrent').mockResolvedValue(CONFIG);
        vi.spyOn(repo, 'getApartmentArea').mockResolvedValue(null);
        await expect(
            svc.generateFee({ apartment_id: 'a1', month: 6, year: 2026 }, USER)
        ).rejects.toThrow('Apartment not found');
    });
});

describe('managementFeeService — bulkGenerateFees', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('tạo hàng loạt thành công', async () => {
        vi.spyOn(feeConfigRepo, 'findCurrent').mockResolvedValue(CONFIG);
        vi.spyOn(repo, 'getAllApartments').mockResolvedValue([
            { id: 'a1', code: 'A1', area: '80' },
            { id: 'a2', code: 'A2', area: '120' },
        ]);
        vi.spyOn(repo, 'findExisting').mockResolvedValue(null);
        vi.spyOn(repo, 'insertFeeBulk').mockResolvedValue({ id: 'feeX' });
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);

        const r = await svc.bulkGenerateFees({ month: 6, year: 2026 }, USER);
        expect(r.success).toHaveLength(2);
        expect(r.failed).toHaveLength(0);
        expect(r.skipped).toHaveLength(0);
    });

    it('skipped khi fee đã tồn tại', async () => {
        vi.spyOn(feeConfigRepo, 'findCurrent').mockResolvedValue(CONFIG);
        vi.spyOn(repo, 'getAllApartments').mockResolvedValue([
            { id: 'a1', code: 'A1', area: '80' },
        ]);
        vi.spyOn(repo, 'findExisting').mockResolvedValue({ id: 'old' });
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);

        const r = await svc.bulkGenerateFees({ month: 6, year: 2026 }, USER);
        expect(r.skipped).toHaveLength(1);
        expect(r.success).toHaveLength(0);
    });

    it('failed khi insert lỗi (vẫn tiếp tục căn hộ khác)', async () => {
        vi.spyOn(feeConfigRepo, 'findCurrent').mockResolvedValue(CONFIG);
        vi.spyOn(repo, 'getAllApartments').mockResolvedValue([
            { id: 'a1', code: 'A1', area: '80' },
        ]);
        vi.spyOn(repo, 'findExisting').mockResolvedValue(null);
        vi.spyOn(repo, 'insertFeeBulk').mockRejectedValue(new Error('db down'));
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);

        const r = await svc.bulkGenerateFees({ month: 6, year: 2026 }, USER);
        expect(r.failed).toHaveLength(1);
        expect(r.failed[0].error).toBe('db down');
    });

    it('throws 400 khi thiếu month/year', async () => {
        await expect(
            svc.bulkGenerateFees({ year: 2026 }, USER)
        ).rejects.toMatchObject({ status: 400, message: 'month and year are required' });
    });
});

describe('managementFeeService — getFees / getFeeById', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('getFees trả đúng shape {data, pagination}', async () => {
        vi.spyOn(repo, 'listFees').mockResolvedValue({
            data: [{ id: 'f1' }],
            pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        });
        const r = await svc.getFees({ month: 6, year: 2026 });
        expect(r.data).toHaveLength(1);
        expect(r.pagination.total).toBe(1);
    });

    it('getFeeById trả row', async () => {
        vi.spyOn(repo, 'getFeeById').mockResolvedValue({ id: 'f1' });
        const r = await svc.getFeeById('f1');
        expect(r.id).toBe('f1');
    });

    it('getFeeById throws 404 khi không có', async () => {
        vi.spyOn(repo, 'getFeeById').mockResolvedValue(null);
        await expect(svc.getFeeById('missing')).rejects.toMatchObject({
            status: 404,
            message: 'Management fee not found',
        });
    });
});

describe('managementFeeService — updatePaymentStatus', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('cập nhật thành công và gửi notify khi PAID', async () => {
        vi.spyOn(repo, 'updatePaymentStatus').mockResolvedValue({
            id: 'f1',
            apartment_id: 'a1',
            month: 6,
            year: 2026,
            total_amount: '500000',
        });
        vi.spyOn(repo, 'getApartmentCode').mockResolvedValue('A1');
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);
        const notifySpy = vi
            .spyOn(notificationService, 'sendPaymentThankYou')
            .mockResolvedValue(undefined);

        const r = await svc.updatePaymentStatus('f1', { status: 'PAID' }, USER);
        expect(r.id).toBe('f1');
        await new Promise((res) => setImmediate(res)); // chờ fire-and-forget
        expect(notifySpy).toHaveBeenCalledWith(
            expect.objectContaining({ apartmentId: 'a1', amount: 500000, month: 6 })
        );
    });

    it('throws 400 khi status không hợp lệ', async () => {
        await expect(
            svc.updatePaymentStatus('f1', { status: 'BAD' }, USER)
        ).rejects.toMatchObject({ status: 400, message: 'Invalid status' });
    });

    it('throws 404 khi không tìm thấy fee', async () => {
        vi.spyOn(repo, 'updatePaymentStatus').mockResolvedValue(null);
        await expect(
            svc.updatePaymentStatus('f1', { status: 'PAID' }, USER)
        ).rejects.toMatchObject({ status: 404, message: 'Management fee not found' });
    });
});

describe('managementFeeService — deleteFee / getSummary / getFeeForPdf', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('deleteFee thành công', async () => {
        vi.spyOn(repo, 'getFeeById').mockResolvedValue({
            apartment_code: 'A1',
            month: 6,
            year: 2026,
            total_amount: '100000',
        });
        const removeSpy = vi.spyOn(repo, 'remove').mockResolvedValue(undefined);
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);

        const r = await svc.deleteFee('f1', USER);
        expect(r).toEqual({ message: 'Management fee deleted successfully' });
        expect(removeSpy).toHaveBeenCalledWith('f1');
    });

    it('deleteFee throws 404 khi không có', async () => {
        vi.spyOn(repo, 'getFeeById').mockResolvedValue(null);
        await expect(svc.deleteFee('f1', USER)).rejects.toMatchObject({
            status: 404,
            message: 'Management fee not found',
        });
    });

    it('getSummary trả row', async () => {
        vi.spyOn(repo, 'getSummary').mockResolvedValue({ total_invoices: '5' });
        const r = await svc.getSummary({ month: 6, year: 2026 });
        expect(r.total_invoices).toBe('5');
    });

    it('getSummary throws 400 khi thiếu month/year', async () => {
        await expect(svc.getSummary({ month: 6 })).rejects.toMatchObject({
            status: 400,
            message: 'month and year are required',
        });
    });

    it('getFeeForPdf trả fee', async () => {
        vi.spyOn(repo, 'getFeeForPdf').mockResolvedValue({ id: 'f1' });
        const r = await svc.getFeeForPdf('f1');
        expect(r.id).toBe('f1');
    });

    it('getFeeForPdf throws 404 khi không có', async () => {
        vi.spyOn(repo, 'getFeeForPdf').mockResolvedValue(null);
        await expect(svc.getFeeForPdf('f1')).rejects.toMatchObject({
            status: 404,
            message: 'Management fee not found',
        });
    });
});

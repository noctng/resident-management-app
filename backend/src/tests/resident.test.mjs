import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const R = realPrisma.residents;
const A = realPrisma.resident_accounts;

const row = (over = {}) => ({
    id: 'res_1',
    name: 'Nguyen Van A',
    dob: new Date('1990-01-01'),
    id_number: '0790001',
    zalo_id: null,
    phone_number: '0901000000',
    is_active: true,
    email: 'a@example.com',
    relationship_status: 'FAMILY',
    can_use_amenities: true,
    company_name: null,
    buyer_name: null,
    tax_code: null,
    invoice_address: null,
    ...over,
});

describe('residentService', () => {
    beforeEach(() => { vi.restoreAllMocks(); });

    it('getAllResidents maps entities to camelCase DTO', async () => {
        vi.spyOn(R, 'findMany').mockResolvedValue([row()]);
        const svc = require('../services/residentService');
        const r = await svc.getAllResidents();
        expect(r).toHaveLength(1);
        expect(r[0].idNumber).toBe('0790001');
        expect(r[0].phoneNumber).toBe('0901000000');
        expect(r[0].relationshipStatus).toBe('FAMILY');
        expect(r[0].canUseAmenities).toBe(true);
        expect(r[0].id_number).toBeUndefined();
    });

    it('createResident creates resident + account when phone provided', async () => {
        vi.spyOn(R, 'create').mockResolvedValue(row());
        vi.spyOn(A, 'create').mockResolvedValue({});
        const svc = require('../services/residentService');
        const r = await svc.createResident({
            name: 'Nguyen Van A', dob: '1990-01-01', idNumber: '0790001',
            phoneNumber: '0901000000', companyName: '  ACME  ',
        });
        expect(r.id).toBe('res_1');
        expect(R.create).toHaveBeenCalled();
        const data = R.create.mock.calls[0][0].data;
        expect(data.id).toMatch(/^res_/);
        expect(data.relationship_status).toBe('FAMILY');
        expect(data.is_active).toBe(true);
        expect(data.company_name).toBe('ACME');
        expect(A.create).toHaveBeenCalled();
    });

    it('createResident skips account when no phone', async () => {
        vi.spyOn(R, 'create').mockResolvedValue(row({ phone_number: null }));
        vi.spyOn(A, 'create').mockResolvedValue({});
        const svc = require('../services/residentService');
        await svc.createResident({ name: 'X', isActive: false, canUseAmenities: false });
        expect(A.create).not.toHaveBeenCalled();
        const data = R.create.mock.calls[0][0].data;
        expect(data.is_active).toBe(false);
        expect(data.can_use_amenities).toBe(false);
    });

    it('createResident tolerates duplicate account error', async () => {
        vi.spyOn(R, 'create').mockResolvedValue(row());
        vi.spyOn(A, 'create').mockRejectedValue(new Error('duplicate'));
        const svc = require('../services/residentService');
        const r = await svc.createResident({ name: 'A', phoneNumber: '0901000000' });
        expect(r.id).toBe('res_1');
    });

    it('updateResident cleans fields and returns DTO', async () => {
        vi.spyOn(R, 'update').mockResolvedValue(row({ name: 'Bee' }));
        vi.spyOn(A, 'create').mockResolvedValue({});
        const svc = require('../services/residentService');
        const r = await svc.updateResident('res_1', {
            name: '  Bee  ', idNumber: ' 123 ', email: '   ', taxCode: ' T1 ',
        });
        expect(r.name).toBe('Bee');
        const data = R.update.mock.calls[0][0].data;
        expect(data.name).toBe('Bee');
        expect(data.id_number).toBe('123');
        expect(data.email).toBeNull();
        expect(data.tax_code).toBe('T1');
        expect(data.buyer_name).toBeUndefined();
    });

    it('updateResident propagates prisma P2025 error', async () => {
        const e = new Error('not found');
        e.code = 'P2025';
        vi.spyOn(R, 'update').mockRejectedValue(e);
        const svc = require('../services/residentService');
        await expect(svc.updateResident('nope', { name: 'A' })).rejects.toMatchObject({ code: 'P2025' });
    });

    it('updateResidentStatus returns selected fields (activate/deactivate)', async () => {
        const spy = vi.spyOn(R, 'update').mockResolvedValue({ id: 'res_1', is_active: false });
        const svc = require('../services/residentService');
        const r = await svc.updateResidentStatus('res_1', false);
        expect(r).toEqual({ id: 'res_1', is_active: false });
        expect(spy.mock.calls[0][0].data).toEqual({ is_active: false });
    });

    it('updateAmenityAccess returns selected fields', async () => {
        const spy = vi.spyOn(R, 'update').mockResolvedValue({ id: 'res_1', can_use_amenities: true });
        const svc = require('../services/residentService');
        const r = await svc.updateAmenityAccess('res_1', true);
        expect(r).toEqual({ id: 'res_1', can_use_amenities: true });
        expect(spy.mock.calls[0][0].data).toEqual({ can_use_amenities: true });
    });

    it('getAllResidentAccounts filters inactive/no-phone residents', async () => {
        vi.spyOn(A, 'findMany').mockResolvedValue([
            { residents: { id: 'r1', name: 'A', phone_number: '0901', is_active: true } },
            { residents: { id: 'r2', name: 'B', phone_number: null, is_active: true } },
            { residents: { id: 'r3', name: 'C', phone_number: '0903', is_active: false } },
            { residents: null },
        ]);
        const svc = require('../services/residentService');
        const r = await svc.getAllResidentAccounts();
        expect(r).toEqual([{ id: 'r1', name: 'A', phoneNumber: '0901' }]);
    });

    it('syncResidentAccounts returns message when no candidates', async () => {
        vi.spyOn(R, 'findMany').mockResolvedValue([]);
        const createMany = vi.spyOn(A, 'createMany').mockResolvedValue({ count: 0 });
        const svc = require('../services/residentService');
        const r = await svc.syncResidentAccounts();
        expect(r.message).toBe('Không có cư dân nào cần tạo tài khoản.');
        expect(createMany).not.toHaveBeenCalled();
    });

    it('syncResidentAccounts creates accounts with skipDuplicates', async () => {
        vi.spyOn(R, 'findMany').mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
        const createMany = vi.spyOn(A, 'createMany').mockResolvedValue({ count: 2 });
        const svc = require('../services/residentService');
        const r = await svc.syncResidentAccounts();
        expect(r.message).toBe('Đồng bộ xong. Đã tạo 2 tài khoản.');
        const arg = createMany.mock.calls[0][0];
        expect(arg.skipDuplicates).toBe(true);
        expect(arg.data).toHaveLength(2);
    });

    it('resetResidentPassword updates password hash', async () => {
        const spy = vi.spyOn(A, 'update').mockResolvedValue({});
        const svc = require('../services/residentService');
        const r = await svc.resetResidentPassword('res_1');
        expect(r).toEqual({ message: 'Đã reset mật khẩu.' });
        expect(spy.mock.calls[0][0].where).toEqual({ resident_id: 'res_1' });
    });

    it('deleteResident throws 404 when resident missing', async () => {
        vi.spyOn(R, 'findUnique').mockResolvedValue(null);
        const svc = require('../services/residentService');
        await expect(svc.deleteResident('nope')).rejects.toMatchObject({ status: 404 });
    });

    it('deleteResident throws 400 when resident is OWNER', async () => {
        vi.spyOn(R, 'findUnique').mockResolvedValue(row({ relationship_status: 'OWNER' }));
        const svc = require('../services/residentService');
        await expect(svc.deleteResident('res_1')).rejects.toMatchObject({ status: 400 });
    });

    it('deleteResident creates dummy resident then runs transaction', async () => {
        vi.spyOn(R, 'findUnique')
            .mockResolvedValueOnce(row())      // target resident
            .mockResolvedValueOnce(null);      // dummy not exists
        const create = vi.spyOn(R, 'create').mockResolvedValue({});
        const tx = vi.spyOn(realPrisma, '$transaction').mockResolvedValue([]);
        vi.spyOn(realPrisma.resident_feedback, 'updateMany').mockReturnValue({});
        vi.spyOn(realPrisma.amenity_usage, 'updateMany').mockReturnValue({});
        vi.spyOn(A, 'deleteMany').mockReturnValue({});
        vi.spyOn(realPrisma.occupancies, 'deleteMany').mockReturnValue({});
        vi.spyOn(R, 'delete').mockReturnValue({});

        const svc = require('../services/residentService');
        const r = await svc.deleteResident('res_1');
        expect(r).toEqual({ message: 'Đã xóa cư dân thành công.' });
        expect(create.mock.calls[0][0].data.id).toBe('res_deleted');
        expect(tx).toHaveBeenCalled();
    });

    it('deleteResident skips dummy creation when it exists', async () => {
        vi.spyOn(R, 'findUnique')
            .mockResolvedValueOnce(row())
            .mockResolvedValueOnce({ id: 'res_deleted' });
        const create = vi.spyOn(R, 'create').mockResolvedValue({});
        vi.spyOn(realPrisma, '$transaction').mockResolvedValue([]);
        vi.spyOn(realPrisma.resident_feedback, 'updateMany').mockReturnValue({});
        vi.spyOn(realPrisma.amenity_usage, 'updateMany').mockReturnValue({});
        vi.spyOn(A, 'deleteMany').mockReturnValue({});
        vi.spyOn(realPrisma.occupancies, 'deleteMany').mockReturnValue({});
        vi.spyOn(R, 'delete').mockReturnValue({});

        const svc = require('../services/residentService');
        await svc.deleteResident('res_1');
        expect(create).not.toHaveBeenCalled();
    });
});

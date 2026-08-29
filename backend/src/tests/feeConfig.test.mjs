import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — service require cùng instance này.
// GHI CHÚ: module feeConfig dùng pg Pool (raw SQL), không dùng Prisma → spy ở lớp repository.
const repo = require('../repositories/feeConfigRepository');

const ROW = {
    id: 1,
    management_fee_per_sqm: '10000.00',
    internet_fee: '200000.00',
    cable_tv_fee: '100000.00',
    parking_car_fee: '1200000.00',
    parking_motorbike_fee: '100000.00',
    security_fee: '50000.00',
    cleaning_fee: '50000.00',
    effective_from: new Date('2026-01-01'),
    created_by: 'u1',
    enabled_fees: {},
};

const PAYLOAD = {
    management_fee_per_sqm: 10000,
    internet_fee: 200000,
    cable_tv_fee: 100000,
    parking_car_fee: 1200000,
    parking_motorbike_fee: 100000,
    security_fee: 50000,
    cleaning_fee: 50000,
    effective_from: '2026-01-01',
    enabled_fees: { internet: true },
};

const USER = { id: 'u1', username: 'admin' };

describe('feeConfigService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('getCurrentConfig returns the latest row', async () => {
        vi.spyOn(repo, 'findCurrent').mockResolvedValue(ROW);
        const svc = require('../services/feeConfigService');
        const r = await svc.getCurrentConfig();
        expect(r).toBe(ROW);
        expect(repo.findCurrent).toHaveBeenCalled();
    });

    it('getCurrentConfig throws 404 when no config exists', async () => {
        vi.spyOn(repo, 'findCurrent').mockResolvedValue(null);
        const svc = require('../services/feeConfigService');
        await expect(svc.getCurrentConfig()).rejects.toMatchObject({
            status: 404,
            message: 'No fee configuration found',
        });
    });

    it('getConfigHistory returns array from repository', async () => {
        vi.spyOn(repo, 'findHistory').mockResolvedValue([
            { ...ROW, created_by_username: 'admin' },
        ]);
        const svc = require('../services/feeConfigService');
        const r = await svc.getConfigHistory();
        expect(Array.isArray(r)).toBe(true);
        expect(r[0].created_by_username).toBe('admin');
    });

    it('getConfigAtDate passes the given date to repository', async () => {
        vi.spyOn(repo, 'findEffectiveAt').mockResolvedValue(ROW);
        const svc = require('../services/feeConfigService');
        const r = await svc.getConfigAtDate('2026-06-01');
        expect(r).toBe(ROW);
        expect(repo.findEffectiveAt).toHaveBeenCalledWith('2026-06-01');
    });

    it('getConfigAtDate defaults to now when date missing', async () => {
        vi.spyOn(repo, 'findEffectiveAt').mockResolvedValue(ROW);
        const svc = require('../services/feeConfigService');
        await svc.getConfigAtDate(undefined);
        expect(repo.findEffectiveAt.mock.calls[0][0]).toBeInstanceOf(Date);
    });

    it('getConfigAtDate throws 404 when nothing effective at date', async () => {
        vi.spyOn(repo, 'findEffectiveAt').mockResolvedValue(null);
        const svc = require('../services/feeConfigService');
        await expect(svc.getConfigAtDate('2000-01-01')).rejects.toMatchObject({
            status: 404,
            message: 'No fee configuration found for the specified date',
        });
    });

    it('updateConfig throws 400 on negative fee', async () => {
        const createSpy = vi.spyOn(repo, 'create');
        const svc = require('../services/feeConfigService');
        await expect(
            svc.updateConfig({ ...PAYLOAD, internet_fee: -1 }, USER)
        ).rejects.toMatchObject({ status: 400, message: 'Fee amounts must be non-negative' });
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('updateConfig creates config and logs activity', async () => {
        vi.spyOn(repo, 'create').mockResolvedValue(ROW);
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);
        const svc = require('../services/feeConfigService');
        const r = await svc.updateConfig(PAYLOAD, USER);
        expect(r).toBe(ROW);

        const values = repo.create.mock.calls[0][0];
        expect(values).toHaveLength(10);
        expect(values[0]).toBe(10000);
        expect(values[7]).toBe('2026-01-01');
        expect(values[8]).toBe('u1');
        expect(values[9]).toEqual({ internet: true });

        expect(repo.logActivity).toHaveBeenCalled();
        const log = repo.logActivity.mock.calls[0][0];
        expect(log.userId).toBe('u1');
        expect(log.username).toBe('admin');
        expect(log.id).toMatch(/^log_\d+$/);
        expect(log.details).toContain('Updated fee configuration');
    });

    it('updateConfig defaults effective_from and enabled_fees', async () => {
        vi.spyOn(repo, 'create').mockResolvedValue(ROW);
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);
        const svc = require('../services/feeConfigService');
        await svc.updateConfig(
            { ...PAYLOAD, effective_from: undefined, enabled_fees: undefined },
            USER
        );
        const values = repo.create.mock.calls[0][0];
        expect(values[7]).toBeInstanceOf(Date);
        expect(values[9]).toEqual({});
    });
});

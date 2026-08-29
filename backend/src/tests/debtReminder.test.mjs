import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — service require cùng instance này.
// GHI CHÚ: module debtReminder dùng pg Pool (raw SQL), không dùng Prisma → spy ở lớp repository.
const repo = require('../repositories/debtReminderRepository');
const emailService = require('../services/emailService');
const tmpl = require('../templates/debtReminderEmail');

const FEE = {
    id: 'fee_1',
    apartment_id: 'apt_1',
    apartment_code: 'A-101',
    house_type: 'CAN_HO',
    resident_id: 'res_1',
    resident_name: 'Nguyen Van A',
    resident_email: 'a@example.com',
    month: 8,
    year: 2026,
    total_amount: '1500000.00',
    management_fee: '1000000.00',
    internet_fee: '200000.00',
    cable_tv_fee: '0',
    security_fee: '100000.00',
    cleaning_fee: '50000.00',
    parking_car_fee: '0',
    parking_motorbike_fee: '100000.00',
    parking_car_quantity: 0,
    parking_motorbike_quantity: 1,
    area: 80,
    status: 'OVERDUE',
};

const USER = { id: 'u1', username: 'admin' };

const svc = () => require('../services/debtReminderService');

describe('debtReminderService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('sendDebtReminder returns success shape and logs activity', async () => {
        vi.spyOn(repo, 'findFeeById').mockResolvedValue(FEE);
        vi.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true, mock: true });
        vi.spyOn(repo, 'logActivity').mockResolvedValue(undefined);
        const tmplSpy = vi
            .spyOn(tmpl, 'generateDebtReminderEmail')
            .mockReturnValue('<html></html>');

        const r = await svc().sendDebtReminder('fee_1', USER);

        expect(r.success).toBe(true);
        expect(r.message).toBe('Debt reminder email sent successfully');
        expect(r.recipient).toBe('a@example.com');
        expect(r.mock).toBe(true);
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            'a@example.com',
            expect.any(String),
            '<html></html>'
        );
        expect(tmplSpy).toHaveBeenCalled();
        expect(repo.logActivity).toHaveBeenCalled();
        const log = repo.logActivity.mock.calls[0][0];
        expect(log.targetId).toBe('fee_1');
        expect(log.username).toBe('admin');
        expect(log.details).toContain('Sent debt reminder email to a@example.com');
    });

    it('sendDebtReminder throws 404 when fee missing', async () => {
        vi.spyOn(repo, 'findFeeById').mockResolvedValue(null);
        await expect(svc().sendDebtReminder('fee_x', USER)).rejects.toMatchObject({
            status: 404,
            message: 'Management fee not found',
        });
    });

    it('sendDebtReminder throws 400 when resident has no email', async () => {
        vi.spyOn(repo, 'findFeeById').mockResolvedValue({ ...FEE, resident_email: null });
        await expect(svc().sendDebtReminder('fee_1', USER)).rejects.toMatchObject({
            status: 400,
            message: 'Resident email not found. Please update resident contact information.',
        });
    });

    it('sendBulkDebtReminders sends to pending fees, skips missing email, logs', async () => {
        vi.spyOn(repo, 'findPendingFees').mockResolvedValue([
            FEE,
            { ...FEE, apartment_code: 'B-202', resident_email: null },
        ]);
        vi.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true });
        vi.spyOn(repo, 'logBulkActivity').mockResolvedValue(undefined);

        const r = await svc().sendBulkDebtReminders({ month: 8, year: 2026 }, USER);

        expect(r.success).toBe(true);
        expect(r.results.success).toHaveLength(1);
        expect(r.results.success[0].apartment_code).toBe('A-101');
        expect(r.results.skipped).toHaveLength(1);
        expect(r.results.skipped[0].apartment_code).toBe('B-202');
        expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
        expect(repo.logBulkActivity).toHaveBeenCalled();
        const log = repo.logBulkActivity.mock.calls[0][0];
        expect(log.details).toContain('1 success, 0 failed, 1 skipped');
    });

    it('sendBulkDebtReminders records failed sends', async () => {
        vi.spyOn(repo, 'findPendingFees').mockResolvedValue([FEE]);
        vi.spyOn(emailService, 'sendEmail').mockRejectedValue(new Error('SMTP down'));
        vi.spyOn(repo, 'logBulkActivity').mockResolvedValue(undefined);

        const r = await svc().sendBulkDebtReminders({}, USER);

        expect(r.results.failed).toHaveLength(1);
        expect(r.results.failed[0].apartment_code).toBe('A-101');
        expect(r.results.failed[0].error).toBe('SMTP down');
    });

    it('getEmailHistory returns data and pagination', async () => {
        vi.spyOn(repo, 'getEmailHistory').mockResolvedValue([
            { id: 'log_1', details: 'Sent debt reminder email to a@example.com' },
        ]);
        vi.spyOn(repo, 'countEmailHistory').mockResolvedValue(1);

        const r = await svc().getEmailHistory({ page: '1', limit: '50' });

        expect(Array.isArray(r.data)).toBe(true);
        expect(r.data).toHaveLength(1);
        expect(r.pagination.total).toBe(1);
        expect(r.pagination.page).toBe(1);
        expect(r.pagination.limit).toBe(50);
        expect(r.pagination.totalPages).toBe(1);
        expect(repo.getEmailHistory).toHaveBeenCalledWith({ limit: '50', offset: 0 });
    });
});

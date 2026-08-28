import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton prisma thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const reg = realPrisma.construction_registrations;
const contract = realPrisma.contracts;
const violation = realPrisma.construction_violations;
const worker = realPrisma.construction_workers;

// logger side-effect — mock để không chạm DB trong test
const logger = require('../utils/logger');

describe('constructionService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logger, 'logActivity').mockResolvedValue(undefined);
  });

  // ---------- 1. getRegistrations (+ stats) ----------
  it('getRegistrations returns registrations + computed stats', async () => {
    vi.spyOn(reg, 'findMany').mockResolvedValue([
      {
        id: 'r1', status: 'CONSTRUCTING', deposit_status: 'DEPOSITED',
        deposit_amount: 100000000, construction_workers: [{ status: 'ACTIVE' }],
        construction_violations: [{ fine_amount: 2000000 }],
      },
      {
        id: 'r2', status: 'PENDING_REVIEW', deposit_status: 'PENDING_DEPOSIT',
        deposit_amount: 0, construction_workers: [], construction_violations: [],
      },
    ]);
    const svc = require('../services/constructionService');
    const r = await svc.getRegistrations({ status: 'ALL' });
    expect(r.registrations).toHaveLength(2);
    expect(r.stats.totalRegs).toBe(2);
    expect(r.stats.activeConstructing).toBe(1); // r1
    expect(r.stats.totalDepositHeld).toBe(100000000);
    expect(r.stats.totalWorkers).toBe(1);
    expect(r.stats.totalViolationsFine).toBe(2000000);
  });

  // ---------- 2. createRegistration validation ----------
  it('createRegistration throws 400 when missing apartment_id', async () => {
    const svc = require('../services/constructionService');
    await expect(svc.createRegistration({ contractor_name: 'Cty A', start_date: '2026-01-01', end_date: '2026-06-01' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('createRegistration throws 400 when missing contractor_name', async () => {
    const svc = require('../services/constructionService');
    await expect(svc.createRegistration({ apartment_id: 'a1', start_date: '2026-01-01', end_date: '2026-06-01' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('createRegistration throws 400 when missing start_date', async () => {
    const svc = require('../services/constructionService');
    await expect(svc.createRegistration({ apartment_id: 'a1', contractor_name: 'Cty A', end_date: '2026-06-01' }))
      .rejects.toMatchObject({ status: 400 });
  });

  // ---------- 3. createRegistration success ----------
  it('createRegistration returns DTO with generated reg_code + 100M deposit', async () => {
    vi.spyOn(contract, 'findFirst').mockResolvedValue(null); // không có contract
    vi.spyOn(reg, 'count').mockResolvedValue(0); // số 1
    const createSpy = vi.spyOn(reg, 'create').mockResolvedValue({
      id: 'reg_x', reg_code: 'TC-TPCP-2026-0001', apartments: { code: 'A-101' },
    });
    const svc = require('../services/constructionService');
    const r = await svc.createRegistration({
      apartment_id: 'a1', contractor_name: 'Cty A', start_date: '2026-01-01', end_date: '2026-06-01',
    });
    expect(r.registration.reg_code).toMatch(/^TC-TPCP-\d{4}-0001$/);
    expect(r.message).toMatch(/thành công/);
    const data = createSpy.mock.calls[0][0].data;
    expect(data.deposit_amount).toBe(100000000.0);
    expect(data.deposit_status).toBe('PENDING_DEPOSIT');
    expect(data.status).toBe('PENDING_REVIEW');
    expect(data.id).toMatch(/^reg_/);
  });

  // ---------- 4. confirmDeposit ----------
  it('confirmDeposit sets DEPOSITED + CONSTRUCTING and returns message', async () => {
    const updSpy = vi.spyOn(reg, 'update').mockResolvedValue({
      id: 'r1', reg_code: 'TC-TPCP-2026-0001', apartments: { code: 'A-101' },
    });
    const svc = require('../services/constructionService');
    const r = await svc.confirmDeposit('r1', { deposit_payment_ref: 'UNC-1' }, { username: 'ketoan' });
    expect(r.message).toMatch(/ký quỹ/);
    expect(updSpy.mock.calls[0][0].data.deposit_status).toBe('DEPOSITED');
    expect(updSpy.mock.calls[0][0].data.status).toBe('CONSTRUCTING');
    expect(updSpy.mock.calls[0][0].data.approved_by).toBe('ketoan');
  });

  // ---------- 5. createViolation (standard fine) ----------
  it('createViolation applies default fine for SAI_HANG_MUC and returns code', async () => {
    vi.spyOn(violation, 'count').mockResolvedValue(0);
    const createSpy = vi.spyOn(violation, 'create').mockResolvedValue({
      id: 'viol_x', violation_code: 'VP-TC-2026-0001',
    });
    const svc = require('../services/constructionService');
    const r = await svc.createViolation('r1', { violation_type: 'SAI_HANG_MUC' }, { username: 'baovel' });
    expect(r.message).toMatch(/biên bản/);
    expect(createSpy.mock.calls[0][0].data.fine_amount).toBe(2000000); // DEFAULT_FINES
    expect(createSpy.mock.calls[0][0].data.violation_code).toMatch(/^VP-TC-\d{4}-0001$/);
  });

  // ---------- 6. addWorker validation ----------
  it('addWorker throws 400 when missing full_name', async () => {
    const svc = require('../services/constructionService');
    await expect(svc.addWorker('r1', {})).rejects.toMatchObject({ status: 400 });
  });

  it('addWorker returns worker with generated pass_code', async () => {
    const createSpy = vi.spyOn(worker, 'create').mockResolvedValue({ id: 'wrk_x', pass_code: 'THE-TC-123456' });
    const svc = require('../services/constructionService');
    const r = await svc.addWorker('r1', { full_name: 'Nguyễn Văn A' });
    expect(r.message).toMatch(/Cấp thẻ/);
    expect(r.worker.id).toMatch(/^wrk_/);
    expect(createSpy.mock.calls[0][0].data.status).toBe('ACTIVE');
  });

  // ---------- 7. settleRegistration not found ----------
  it('settleRegistration throws 404 when registration missing', async () => {
    vi.spyOn(reg, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/constructionService');
    await expect(svc.settleRegistration('nope', {})).rejects.toMatchObject({ status: 404 });
  });

  // ---------- 8. settleRegistration success (refund = deposit - fines) ----------
  it('settleRegistration computes refund = deposit - totalFines and expires workers', async () => {
    vi.spyOn(reg, 'findUnique').mockResolvedValue({
      id: 'r1', deposit_amount: 100000000, construction_violations: [{ fine_amount: 2000000 }],
    });
    const updSpy = vi.spyOn(reg, 'update').mockResolvedValue({ id: 'r1', reg_code: 'TC-TPCP-2026-0001' });
    const expireSpy = vi.spyOn(worker, 'updateMany').mockResolvedValue({ count: 3 });
    const svc = require('../services/constructionService');
    const r = await svc.settleRegistration('r1', {}, { username: 'bqld' });
    expect(r.message).toMatch(/hoàn công/);
    expect(updSpy.mock.calls[0][0].data.status).toBe('SETTLED');
    expect(updSpy.mock.calls[0][0].data.refund_amount).toBe(98000000); // 100M - 2M
    expect(updSpy.mock.calls[0][0].data.deposit_status).toBe('PARTIAL_REFUNDED');
    expect(expireSpy.mock.calls[0][0]).toEqual({ where: { registration_id: 'r1' }, data: { status: 'EXPIRED' } });
  });
});

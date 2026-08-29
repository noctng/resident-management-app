import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton prisma thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const policies = realPrisma.commission_policies;
const commissions = realPrisma.commissions;
const payouts = realPrisma.commission_payouts;
const contracts = realPrisma.contracts;

// logger side-effect — mock để không chạm DB trong test
const logger = require('../utils/logger');

// Helper: mock $transaction để callback chạy với chính realPrisma (model methods đã spy)
function mockTx() {
  return vi
    .spyOn(realPrisma, '$transaction')
    .mockImplementation(async (fn) => fn(realPrisma));
}

describe('commissionService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logger, 'logActivity').mockResolvedValue(undefined);
  });

  // ================= 1. getPolicies =================
  describe('getPolicies', () => {
    it('returns { policies, totalCount }', async () => {
      vi.spyOn(policies, 'findMany').mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      const svc = require('../services/commissionService');
      const r = await svc.getPolicies({});
      expect(r.policies).toHaveLength(2);
      expect(r.totalCount).toBe(2);
      expect(policies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { created_at: 'desc' } })
      );
    });

    it('builds where filter from beneficiary_type + status', async () => {
      vi.spyOn(policies, 'findMany').mockResolvedValue([]);
      const svc = require('../services/commissionService');
      await svc.getPolicies({ beneficiary_type: 'AGENCY', status: 'ACTIVE' });
      const call = policies.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ beneficiary_type: 'AGENCY', status: 'ACTIVE' });
    });

    it('excludes ALL filters from where', async () => {
      vi.spyOn(policies, 'findMany').mockResolvedValue([]);
      const svc = require('../services/commissionService');
      await svc.getPolicies({ beneficiary_type: 'ALL', status: 'ALL' });
      const call = policies.findMany.mock.calls[0][0];
      expect(call.where).toEqual({});
    });
  });

  // ================= 2. createPolicy =================
  describe('createPolicy', () => {
    it('creates policy with generated code + id and calls logActivity', async () => {
      const createSpy = vi
        .spyOn(policies, 'create')
        .mockImplementation(({ data }) => Promise.resolve({ ...data }));

      const svc = require('../services/commissionService');
      const r = await svc.createPolicy({ policy_name: 'Chính sách A' }, { username: 'admin1' });

      expect(r.message).toMatch(/thành công/);
      expect(r.policy.id).toMatch(/^pol_/);
      expect(r.policy.policy_code).toMatch(/^CS-HH-INT-\d{4}-[0-9A-F]{4}$/);
      const created = createSpy.mock.calls[0][0];
      expect(created.data.id).toMatch(/^pol_/);
      expect(created.data.policy_name).toBe('Chính sách A');
      expect(created.data.commission_rate).toBe(1.5);
      expect(created.data.commission_fixed_amount).toBe(0);
      expect(created.data.trigger_milestone).toBe('ON_CONTRACT_SIGNED');
      expect(created.data.status).toBe('ACTIVE');
      expect(logger.logActivity).toHaveBeenCalled();
    });

    it('applies provided overrides (rate, fixed amount, phase, milestone)', async () => {
      const createSpy = vi
        .spyOn(policies, 'create')
        .mockImplementation(({ data }) => Promise.resolve({ ...data }));
      const svc = require('../services/commissionService');
      await svc.createPolicy(
        {
          policy_name: 'P',
          beneficiary_type: 'AGENCY',
          phase_code: 'P1',
          commission_rate: 3.2,
          commission_fixed_amount: 500,
          trigger_milestone: 'ON_HANDOVER',
          description: 'desc',
        },
        { username: 'u' }
      );
      const created = createSpy.mock.calls[0][0];
      expect(created.data.beneficiary_type).toBe('AGENCY');
      expect(created.data.phase_code).toBe('P1');
      expect(created.data.commission_rate).toBe(3.2);
      expect(created.data.commission_fixed_amount).toBe(500);
      expect(created.data.trigger_milestone).toBe('ON_HANDOVER');
      expect(created.data.description).toBe('desc');
      expect(created.data.created_by).toBe('u');
    });

    it('throws 400 when policy_name missing', async () => {
      const svc = require('../services/commissionService');
      await expect(svc.createPolicy({}, { username: 'u' })).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  // ================= 3. getCommissions =================
  describe('getCommissions', () => {
    it('returns commissions + computed stats', async () => {
      vi.spyOn(commissions, 'findMany').mockResolvedValue([
        { total_commission_amount: 1000, paid_amount: 400, remaining_amount: 600, status: 'PARTIALLY_PAID' },
        { total_commission_amount: 500, paid_amount: 0, remaining_amount: 500, status: 'PENDING_APPROVAL' },
      ]);
      const svc = require('../services/commissionService');
      const r = await svc.getCommissions({});
      expect(r.commissions).toHaveLength(2);
      expect(r.totalCount).toBe(2);
      expect(r.stats.totalCommission).toBe(1500);
      expect(r.stats.totalPaid).toBe(400);
      expect(r.stats.totalPending).toBe(1100);
      expect(r.stats.pendingApprovalCount).toBe(1);
    });

    it('builds where filters + search OR (3 clauses) and excludes ALL', async () => {
      vi.spyOn(commissions, 'findMany').mockResolvedValue([]);
      const svc = require('../services/commissionService');
      await svc.getCommissions({ beneficiary_type: 'AGENCY', status: 'ALL', search: 'abc' });
      const call = commissions.findMany.mock.calls[0][0];
      expect(call.where.beneficiary_type).toBe('AGENCY');
      expect(call.where.status).toBeUndefined();
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR.length).toBe(3);
    });
  });

  // ================= 4. generateCommission =================
  describe('generateCommission', () => {
    it('uses default 1.5% rate when contract found but no policy/custom rate', async () => {
      vi.spyOn(contracts, 'findUnique').mockResolvedValue({
        contract_code: 'CT-001',
        total_value: 20000,
      });
      const createSpy = vi
        .spyOn(commissions, 'create')
        .mockImplementation(({ data }) => Promise.resolve({ ...data }));

      const svc = require('../services/commissionService');
      const r = await svc.generateCommission({ contract_id: 'c1' }, { username: 'sale' });

      expect(r.commission.id).toMatch(/^cms_/);
      expect(r.commission.commission_rate).toBe(1.5);
      expect(r.commission.total_commission_amount).toBe(300); // 20000 * 1.5 / 100
      expect(r.commission.remaining_amount).toBe(300);
      expect(r.commission.status).toBe('PENDING_APPROVAL');
      expect(r.commission.policy_id).toBeNull();
      const created = createSpy.mock.calls[0][0];
      expect(created.data.contract_id).toBe('c1');
      expect(created.data.beneficiary_name).toBe('NV Kinh Doanh');
      expect(logger.logActivity).toHaveBeenCalled();
    });

    it('uses custom_commission_rate when provided', async () => {
      vi.spyOn(contracts, 'findUnique').mockResolvedValue({ contract_code: 'CT-001', total_value: 10000 });
      vi.spyOn(commissions, 'create').mockImplementation(({ data }) => Promise.resolve({ ...data }));
      const svc = require('../services/commissionService');
      const r = await svc.generateCommission(
        { contract_id: 'c1', custom_commission_rate: 5 },
        { username: 'sale' }
      );
      expect(r.commission.commission_rate).toBe(5);
      expect(r.commission.total_commission_amount).toBe(500);
    });

    it('uses policy commission_rate when policy_id given (no custom rate)', async () => {
      vi.spyOn(contracts, 'findUnique').mockResolvedValue({ contract_code: 'CT-001', total_value: 10000 });
      vi.spyOn(policies, 'findUnique').mockResolvedValue({ commission_rate: 7.5 });
      vi.spyOn(commissions, 'create').mockImplementation(({ data }) => Promise.resolve({ ...data }));
      const svc = require('../services/commissionService');
      const r = await svc.generateCommission(
        { contract_id: 'c1', policy_id: 'pol_abc' },
        { username: 'sale' }
      );
      expect(r.commission.commission_rate).toBe(7.5);
      expect(r.commission.policy_id).toBe('pol_abc');
      expect(policies.findUnique).toHaveBeenCalledWith({ where: { id: 'pol_abc' } });
    });

    it('throws 404 when contract not found', async () => {
      vi.spyOn(contracts, 'findUnique').mockResolvedValue(null);
      const svc = require('../services/commissionService');
      await expect(
        svc.generateCommission({ contract_id: 'nope' }, { username: 'sale' })
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ================= 5. approveCommission =================
  describe('approveCommission', () => {
    it('sets APPROVED with notes + approver and calls logActivity', async () => {
      vi.spyOn(commissions, 'findUnique').mockResolvedValue({ id: 'cms_1' });
      const updateSpy = vi
        .spyOn(commissions, 'update')
        .mockImplementation(({ data }) => Promise.resolve({ id: 'cms_1', ...data }));

      const svc = require('../services/commissionService');
      const r = await svc.approveCommission('cms_1', { notes: 'OK' }, { username: 'gd' });

      expect(r.message).toMatch(/thành công/);
      const upd = updateSpy.mock.calls[0][0];
      expect(upd.where).toEqual({ id: 'cms_1' });
      expect(upd.data.status).toBe('APPROVED');
      expect(upd.data.approval_notes).toBe('OK');
      expect(upd.data.approved_by).toBe('gd');
      expect(upd.data.approved_at).toBeInstanceOf(Date);
      expect(logger.logActivity).toHaveBeenCalled();
    });

    it('throws 404 when commission not found', async () => {
      vi.spyOn(commissions, 'findUnique').mockResolvedValue(null);
      const svc = require('../services/commissionService');
      await expect(svc.approveCommission('x', { notes: 'n' }, { username: 'u' })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ================= 6. createPayout =================
  describe('createPayout', () => {
    it('creates payout + marks COMPLETED when fully paid', async () => {
      vi.spyOn(commissions, 'findUnique').mockResolvedValue({
        id: 'cms_1',
        paid_amount: 200,
        total_commission_amount: 800,
        beneficiary_name: 'NV A',
      });
      mockTx();
      vi.spyOn(payouts, 'create').mockImplementation(({ data }) => Promise.resolve(data));
      vi.spyOn(commissions, 'update').mockImplementation(({ data }) => Promise.resolve({ id: 'cms_1', ...data }));

      const svc = require('../services/commissionService');
      const r = await svc.createPayout('cms_1', { amount: 800 }, { username: 'kt' });

      // payout created with generated code + id
      const payoutCreate = payouts.create.mock.calls[0][0].data;
      expect(payoutCreate.id).toMatch(/^pout_/);
      expect(payoutCreate.payout_code).toMatch(/^PC-HH-\d{6}-[0-9A-F]{4}$/);
      expect(payoutCreate.amount).toBe(800);
      expect(payoutCreate.commission_id).toBe('cms_1');

      // commission updated to COMPLETED
      const cmsUpdate = commissions.update.mock.calls[0][0];
      expect(cmsUpdate.where).toEqual({ id: 'cms_1' });
      expect(cmsUpdate.data.paid_amount).toBe(1000);
      expect(cmsUpdate.data.remaining_amount).toBe(0);
      expect(cmsUpdate.data.status).toBe('COMPLETED');

      expect(r.payout.payout_code).toMatch(/^PC-HH-/);
      expect(r.updatedCommission.status).toBe('COMPLETED');
      expect(logger.logActivity).toHaveBeenCalled();
    });

    it('marks PARTIALLY_PAID when remainder remains', async () => {
      vi.spyOn(commissions, 'findUnique').mockResolvedValue({
        id: 'cms_1',
        paid_amount: 0,
        total_commission_amount: 1000,
        beneficiary_name: 'NV A',
      });
      mockTx();
      vi.spyOn(payouts, 'create').mockImplementation(({ data }) => Promise.resolve({ ...data }));
      vi.spyOn(commissions, 'update').mockResolvedValue({});
      const svc = require('../services/commissionService');
      await svc.createPayout('cms_1', { amount: 300 }, { username: 'kt' });
      const cmsUpdate = commissions.update.mock.calls[0][0].data;
      expect(cmsUpdate.paid_amount).toBe(300);
      expect(cmsUpdate.remaining_amount).toBe(700);
      expect(cmsUpdate.status).toBe('PARTIALLY_PAID');
    });

    it('throws 404 when commission not found', async () => {
      vi.spyOn(commissions, 'findUnique').mockResolvedValue(null);
      const svc = require('../services/commissionService');
      await expect(svc.createPayout('x', { amount: 100 }, { username: 'u' })).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws 400 when amount <= 0', async () => {
      vi.spyOn(commissions, 'findUnique').mockResolvedValue({ id: 'cms_1', paid_amount: 0, total_commission_amount: 1000, beneficiary_name: 'NV A' });
      const svc = require('../services/commissionService');
      await expect(svc.createPayout('cms_1', { amount: 0 }, { username: 'u' })).rejects.toMatchObject({
        status: 400,
      });
    });
  });
});

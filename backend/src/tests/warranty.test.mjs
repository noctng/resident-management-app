import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const claim = realPrisma.warranty_claims;
const contract = realPrisma.contracts;
const contractor = realPrisma.contractors;

// logger side-effect — mock để không chạm DB trong test
const logger = require('../utils/logger');

describe('warrantyService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logger, 'logActivity').mockResolvedValue(undefined);
  });

  // ---------- 1. getWarrantyClaims (+ KPI stats) ----------
  it('getWarrantyClaims returns claims + computed KPI stats', async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86400000);
    const past = new Date(now.getTime() - 86400000);
    vi.spyOn(claim, 'findMany').mockResolvedValue([
      { id: 'c1', status: 'REPORTED', sla_deadline: future, customer_rating: null },
      { id: 'c2', status: 'IN_PROGRESS', sla_deadline: future },
      { id: 'c3', status: 'COMPLETED', sla_deadline: past, customer_rating: 4 },
      { id: 'c4', status: 'COMPLETED', sla_deadline: past, customer_rating: 5 },
      { id: 'c5', status: 'COMPLETED', sla_deadline: past }, // không có rating
      { id: 'c6', status: 'CANCELLED', sla_deadline: past }, // loại khỏi overdue
      { id: 'c7', status: 'REPORTED', sla_deadline: past }, // quá hạn
    ]);
    const svc = require('../services/warrantyService');
    const r = await svc.getWarrantyClaims({ status: 'ALL' });
    expect(r.claims).toHaveLength(7);
    expect(r.stats.totalClaims).toBe(7);
    expect(r.stats.inProgressCount).toBe(1); // chỉ c2
    expect(r.stats.overdueSlaCount).toBe(1); // chỉ c7
    expect(r.stats.avgRating).toBe('4.5'); // (4+5)/2
  });

  // ---------- 2. createWarrantyClaim validation ----------
  it('createWarrantyClaim throws 400 when missing apartment_id', async () => {
    const svc = require('../services/warrantyService');
    await expect(svc.createWarrantyClaim({ description: 'rò rỉ' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('createWarrantyClaim throws 400 when missing description', async () => {
    const svc = require('../services/warrantyService');
    await expect(svc.createWarrantyClaim({ apartment_id: 'a1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  // ---------- 3. createWarrantyClaim success ----------
  it('createWarrantyClaim returns 201-ish DTO with generated claim_code (REPORTED)', async () => {
    vi.spyOn(contract, 'findFirst').mockResolvedValue(null); // không có contract
    vi.spyOn(claim, 'findFirst').mockResolvedValue(null); // chưa có claim nào → số 1
    const createSpy = vi.spyOn(claim, 'create').mockResolvedValue({
      id: 'claim_x', claim_code: 'BH-TPCP-2026-0001', apartment_id: 'a1',
    });
    const svc = require('../services/warrantyService');
    const r = await svc.createWarrantyClaim({ apartment_id: 'a1', description: 'nứt tường' });
    expect(r.claim.claim_code).toMatch(/^BH-TPCP-\d{4}-0001$/);
    expect(r.message).toMatch(/thành công/);
    const data = createSpy.mock.calls[0][0].data;
    expect(data.status).toBe('REPORTED'); // không có contractor_id
    expect(data.is_under_warranty).toBe(true);
    expect(data.sla_deadline).toBeInstanceOf(Date);
    expect(data.id).toMatch(/^claim_/);
  });

  // ---------- 4. createWarrantyClaim warranty eligibility ----------
  it('createWarrantyClaim marks is_under_warranty=false when handover > 24 months', async () => {
    vi.spyOn(contract, 'findFirst').mockResolvedValue({
      id: 'ct1', handover_date: '2015-01-15', // > 10 năm → quá hạn
    });
    vi.spyOn(claim, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(claim, 'create').mockResolvedValue({ id: 'claim_x', claim_code: 'X' });
    const svc = require('../services/warrantyService');
    await svc.createWarrantyClaim({ apartment_id: 'a1', description: 'thấm', category: 'KY_THUAT' });
    expect(createSpy.mock.calls[0][0].data.is_under_warranty).toBe(false);
  });

  // ---------- 5. assignContractor ----------
  it('assignContractor returns message + claim with status IN_PROGRESS', async () => {
    const updateSpy = vi.spyOn(claim, 'update').mockResolvedValue({
      id: 'c1', status: 'IN_PROGRESS', contractors: { name: 'Cty A' },
    });
    const svc = require('../services/warrantyService');
    const r = await svc.assignContractor('c1', { contractor_id: 'ctr1', scheduled_at: '2026-09-01T10:00:00Z' });
    expect(r.message).toMatch(/điều phối/i);
    expect(r.claim.status).toBe('IN_PROGRESS');
    expect(updateSpy.mock.calls[0][0].data.status).toBe('IN_PROGRESS');
  });

  // ---------- 6. completeWarrantyClaim ----------
  it('completeWarrantyClaim updates contractor rating and returns claim', async () => {
    vi.spyOn(claim, 'update').mockResolvedValue({ id: 'c1', status: 'COMPLETED', contractor_id: 'ctr1' });
    vi.spyOn(claim, 'findMany').mockResolvedValue([{ customer_rating: 4 }, { customer_rating: 5 }]);
    const ratingSpy = vi.spyOn(contractor, 'update').mockResolvedValue({});
    const svc = require('../services/warrantyService');
    const r = await svc.completeWarrantyClaim('c1', { customer_rating: 5 });
    expect(r.message).toMatch(/Nghiệm thu/);
    expect(r.claim.status).toBe('COMPLETED');
    // avg(4,5)=4.5 → 4.50 → Number = 4.5
    expect(ratingSpy.mock.calls[0][0].data.rating).toBe(4.5);
  });

  // ---------- 7. getContractors ----------
  it('getContractors returns active contractors list', async () => {
    vi.spyOn(contractor, 'findMany').mockResolvedValue([{ id: 'ctr1', name: 'Cty A', rating: 4.5 }]);
    const svc = require('../services/warrantyService');
    const r = await svc.getContractors();
    expect(r.contractors).toHaveLength(1);
    expect(r.contractors[0].name).toBe('Cty A');
  });

  // ---------- 8. createContractor ----------
  it('createContractor returns created contractor', async () => {
    vi.spyOn(contractor, 'create').mockResolvedValue({ id: 'ctr_x', name: 'Cty Mới' });
    const svc = require('../services/warrantyService');
    const r = await svc.createContractor({ name: 'Cty Mới', trade_type: 'PLUMBING' });
    expect(r.contractor.name).toBe('Cty Mới');
    expect(r.contractor.id).toMatch(/^ctr_/);
  });

  // ---------- 9. updateContractor not found ----------
  it('updateContractor throws 404 when contractor missing', async () => {
    vi.spyOn(contractor, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/warrantyService');
    await expect(svc.updateContractor('nope', { name: 'X' }))
      .rejects.toMatchObject({ status: 404 });
  });

  // ---------- 10. updateContractor success ----------
  it('updateContractor trims & returns updated contractor', async () => {
    vi.spyOn(contractor, 'findUnique').mockResolvedValue({ id: 'ctr1', name: 'Old', is_active: true });
    const updSpy = vi.spyOn(contractor, 'update').mockResolvedValue({ id: 'ctr1', name: 'New' });
    const svc = require('../services/warrantyService');
    const r = await svc.updateContractor('ctr1', { name: '  New  ' });
    expect(r.contractor.name).toBe('New');
    expect(updSpy.mock.calls[0][0].data.name).toBe('New'); // đã trim
  });

  // ---------- 11. deleteContractor not found ----------
  it('deleteContractor throws 404 when contractor missing', async () => {
    vi.spyOn(contractor, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/warrantyService');
    await expect(svc.deleteContractor('nope')).rejects.toMatchObject({ status: 404 });
  });

  // ---------- 12. deleteContractor soft-deactivate (có ticket) ----------
  it('deleteContractor soft-deactivates when contractor has claims', async () => {
    vi.spyOn(contractor, 'findUnique').mockResolvedValue({
      id: 'ctr1', name: 'Cty A', _count: { warranty_claims: 3 },
    });
    const deactSpy = vi.spyOn(contractor, 'update').mockResolvedValue({});
    const svc = require('../services/warrantyService');
    const r = await svc.deleteContractor('ctr1');
    expect(r.message).toMatch(/vô hiệu hóa/);
    expect(deactSpy.mock.calls[0][0]).toEqual({ where: { id: 'ctr1' }, data: { is_active: false } });
  });

  // ---------- 13. deleteContractor hard-delete (không ticket) ----------
  it('deleteContractor hard-deletes when contractor has no claims', async () => {
    vi.spyOn(contractor, 'findUnique').mockResolvedValue({
      id: 'ctr1', name: 'Cty A', _count: { warranty_claims: 0 },
    });
    const delSpy = vi.spyOn(contractor, 'delete').mockResolvedValue({});
    const svc = require('../services/warrantyService');
    const r = await svc.deleteContractor('ctr1');
    expect(r.message).toMatch(/xóa/);
    expect(delSpy.mock.calls[0][0]).toEqual({ where: { id: 'ctr1' } });
  });
});

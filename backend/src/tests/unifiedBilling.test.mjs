import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Spy ở lớp repository (đã tách prisma query) — KHÔNG vi.mock
const repo = require('../repositories/unifiedBillingRepository');
const logger = require('../utils/logger');

describe('unifiedBillingService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logger, 'logActivity').mockResolvedValue(undefined);
  });

  // ---------- 1. getUnifiedBilling validation ----------
  it('getUnifiedBilling throws 400 when missing month/year', async () => {
    const svc = require('../services/unifiedBillingService');
    await expect(svc.getUnifiedBilling({})).rejects.toMatchObject({ status: 400 });
  });

  // ---------- 2. getUnifiedBilling builds rows + summary ----------
  it('getUnifiedBilling returns combined data + summary', async () => {
    vi.spyOn(repo, 'listApartments').mockResolvedValue([
      { id: 'a1', code: 'A-101', house_type: 'Căn hộ', floor: 1, area: 80 },
    ]);
    vi.spyOn(repo, 'listUtilityRecordsByPeriod').mockResolvedValue([
      { apartment_id: 'a1', electricity_cost: 100, water_cost: 50, payment_status: 'PAID', paid_date: new Date() },
    ]);
    vi.spyOn(repo, 'listManagementFeesByPeriod').mockResolvedValue([
      { apartment_id: 'a1', total_amount: 200, status: 'PAID', payment_date: new Date(), management_fee: '200' },
    ]);
    const svc = require('../services/unifiedBillingService');
    const r = await svc.getUnifiedBilling({ month: '6', year: '2026' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0].combined_status).toBe('PAID');
    expect(r.data[0].grand_total).toBe(350); // 100+50+200
    expect(r.summary.total_invoices).toBe(1);
    expect(r.summary.paid_count).toBe(1);
  });

  // ---------- 3. getUnifiedBillingHistory 404 ----------
  it('getUnifiedBillingHistory throws 404 when apartment missing', async () => {
    vi.spyOn(repo, 'listApartments').mockResolvedValue([]); // getApartmentById -> undefined
    vi.spyOn(repo, 'getApartmentById').mockResolvedValue(null);
    const svc = require('../services/unifiedBillingService');
    await expect(svc.getUnifiedBillingHistory('nope')).rejects.toMatchObject({ status: 404 });
  });

  // ---------- 4. getUnifiedBillingHistory merges utility + fee ----------
  it('getUnifiedBillingHistory merges utility & management fee by month-year', async () => {
    vi.spyOn(repo, 'getApartmentById').mockResolvedValue({ id: 'a1', code: 'A-101' });
    vi.spyOn(repo, 'listUtilityRecordsByApartment').mockResolvedValue([
      { month: 5, year: 2026, apartment_id: 'a1', electricity_cost: 10, water_cost: 5, payment_status: 'PAID' },
    ]);
    vi.spyOn(repo, 'listManagementFeesByApartment').mockResolvedValue([
      { month: 5, year: 2026, apartment_id: 'a1', total_amount: 100, status: 'PAID' },
    ]);
    const svc = require('../services/unifiedBillingService');
    const r = await svc.getUnifiedBillingHistory('a1', '12');
    expect(r.data).toHaveLength(1);
    expect(r.data[0].combined_status).toBe('PAID');
    expect(r.data[0].grand_total).toBe(115);
  });

  // ---------- 5. updateCombinedPaymentStatus validation ----------
  it('updateCombinedPaymentStatus throws 400 on invalid status', async () => {
    const svc = require('../services/unifiedBillingService');
    await expect(svc.updateCombinedPaymentStatus({ apartment_id: 'a1', month: '6', year: '2026', status: 'WEIRD' }, {}))
      .rejects.toMatchObject({ status: 400 });
  });

  // ---------- 6. updateCombinedPaymentStatus PAID updates both + logs ----------
  it('updateCombinedPaymentStatus PAID updates utility+fee and logs activity', async () => {
    vi.spyOn(repo, 'findUtilityRecord').mockResolvedValue({ id: 'u1', electricity_cost: 100, water_cost: 50 });
    const updUtil = vi.spyOn(repo, 'updateUtilityRecord').mockResolvedValue({});
    vi.spyOn(repo, 'findManagementFee').mockResolvedValue({ id: 'm1', total_amount: 200 });
    const updFee = vi.spyOn(repo, 'updateManagementFee').mockResolvedValue({});
    vi.spyOn(repo, 'getApartmentById').mockResolvedValue({ code: 'A-101' });
    const svc = require('../services/unifiedBillingService');
    const r = await svc.updateCombinedPaymentStatus({ apartment_id: 'a1', month: '6', year: '2026', status: 'PAID' }, { username: 'acc' });
    expect(r.message).toBe('Update success');
    expect(updUtil.mock.calls[0][1]).toMatchObject({ payment_status: 'PAID' });
    expect(updFee.mock.calls[0][1]).toMatchObject({ status: 'PAID' });
    expect(r.totalPaid).toBe(350);
  });

  // ---------- 7. updateCombinedPaymentStatus UNPAID ----------
  it('updateCombinedPaymentStatus UNPAID sets fee PENDING', async () => {
    vi.spyOn(repo, 'findUtilityRecord').mockResolvedValue({ id: 'u1', electricity_cost: 0, water_cost: 0 });
    vi.spyOn(repo, 'updateUtilityRecord').mockResolvedValue({});
    vi.spyOn(repo, 'findManagementFee').mockResolvedValue({ id: 'm1', total_amount: 0 });
    const updFee = vi.spyOn(repo, 'updateManagementFee').mockResolvedValue({});
    vi.spyOn(repo, 'getApartmentById').mockResolvedValue({ code: 'A-101' });
    const svc = require('../services/unifiedBillingService');
    await svc.updateCombinedPaymentStatus({ apartment_id: 'a1', month: '6', year: '2026', status: 'UNPAID' }, {});
    expect(updFee.mock.calls[0][1].status).toBe('PENDING');
  });

  // ---------- 8. determineCombinedStatus helper ----------
  it('determineCombinedStatus returns PARTIAL when one paid one not', async () => {
    const svc = require('../services/unifiedBillingService');
    expect(svc.determineCombinedStatus({ payment_status: 'PAID' }, { status: 'PENDING' })).toBe('PARTIAL');
    expect(svc.determineCombinedStatus(null, null)).toBe('NO_DATA');
  });
});

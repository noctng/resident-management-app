import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');

// model delegation objects (nơi Prisma gắn các hàm CRUD)
const contracts = realPrisma.contracts;
const cp = realPrisma.contract_payments;

describe('earlyPaymentService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------- processEarlyPayment ----------------
  it('processEarlyPayment marks pending payments PAID and returns totals', async () => {
    const contract = {
      id: 'c1',
      contract_code: 'HD001',
      contract_payments: [
        { id: 'p1', amount: 1000 },
        { id: 'p2', amount: 2000 },
      ],
    };
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(contract);

    let txCapture;
    vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => {
      txCapture = {
        contract_payments: { update: vi.fn().mockResolvedValue({}) },
        contract_lifecycle_events: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(txCapture);
    });

    const svc = require('../services/earlyPaymentService');
    const r = await svc.processEarlyPayment('c1', { discountPercent: 10 }, { id: 'u1' });

    expect(r.originalTotal).toBe(3000);
    expect(r.discount).toBe(300); // floor(3000 * 0.1)
    expect(r.finalPaid).toBe(2700);
    expect(r.contractCode).toBe('HD001');

    // 2 payment updates + 1 lifecycle event trong cùng 1 transaction
    expect(txCapture.contract_payments.update).toHaveBeenCalledTimes(2);
    expect(txCapture.contract_lifecycle_events.create).toHaveBeenCalledTimes(1);

    // Kiểm tra phân bổ chiết khấu: p1 (1000) -> paid 900, discount 100
    const first = txCapture.contract_payments.update.mock.calls[0][0];
    expect(first.data.status).toBe('PAID');
    expect(first.data.paid_amount).toBe(900);
    expect(first.data.early_payment_discount).toBe(100);
    expect(first.data.is_early_payment).toBe(true);

    const evt = txCapture.contract_lifecycle_events.create.mock.calls[0][0];
    expect(evt.data.contract_id).toBe('c1');
    expect(evt.data.event_type).toBe('PAYMENT_RECEIVED');
    expect(evt.data.performed_by).toBe('u1');
    expect(evt.data.metadata.type).toBe('EARLY_PAYMENT');
  });

  it('processEarlyPayment throws 404 when contract not found', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/earlyPaymentService');
    await expect(svc.processEarlyPayment('x', {}, {})).rejects.toMatchObject({ status: 404 });
  });

  it('processEarlyPayment throws 400 when no pending payments', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue({
      id: 'c',
      contract_code: 'HD002',
      contract_payments: [],
    });
    const svc = require('../services/earlyPaymentService');
    await expect(svc.processEarlyPayment('c', {}, {})).rejects.toMatchObject({ status: 400 });
  });

  it('processEarlyPayment with no discount still marks PAID', async () => {
    const contract = {
      id: 'c',
      contract_code: 'HD003',
      contract_payments: [{ id: 'p', amount: 500 }],
    };
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(contract);
    let txCapture;
    vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => {
      txCapture = {
        contract_payments: { update: vi.fn().mockResolvedValue({}) },
        contract_lifecycle_events: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(txCapture);
    });
    const svc = require('../services/earlyPaymentService');
    const r = await svc.processEarlyPayment('c', {}, {});
    expect(r.originalTotal).toBe(500);
    expect(r.discount).toBe(0);
    expect(r.finalPaid).toBe(500);
    const upd = txCapture.contract_payments.update.mock.calls[0][0];
    expect(upd.data.paid_amount).toBe(500);
    expect(upd.data.early_payment_discount).toBe(0);
  });

  // ---------------- calculateEarlyPaymentDiscount ----------------
  it('calculateEarlyPaymentDiscount not applicable when paid on/after due date', async () => {
    const svc = require('../services/earlyPaymentService');
    const r = await svc.calculateEarlyPaymentDiscount(
      { amount: 1000, due_date: new Date('2026-01-01') },
      new Date('2026-01-10')
    );
    expect(r.applicable).toBe(false);
    expect(r.discountAmount).toBe(0);
  });

  it('calculateEarlyPaymentDiscount applies 2% tier when 15+ days early', async () => {
    const svc = require('../services/earlyPaymentService');
    const r = await svc.calculateEarlyPaymentDiscount(
      { amount: 1000, due_date: new Date('2026-01-20') },
      new Date('2026-01-01') // 19 days early
    );
    expect(r.applicable).toBe(true);
    expect(r.discountPercent).toBe(2.0);
    expect(r.discountAmount).toBe(20); // 1000 * 2 / 100
    expect(r.daysEarly).toBe(19);
  });

  it('calculateEarlyPaymentDiscount uses custom tiers when provided', async () => {
    const svc = require('../services/earlyPaymentService');
    const r = await svc.calculateEarlyPaymentDiscount(
      { amount: 1000, due_date: new Date('2026-01-20') },
      new Date('2026-01-18'), // 2 days early
      [{ daysEarly: 1, discountPercent: 5.0 }]
    );
    expect(r.applicable).toBe(true);
    expect(r.discountPercent).toBe(5.0);
    expect(r.discountAmount).toBe(50);
  });

  it('calculateEarlyPaymentDiscount uses schedule tiers via repo', async () => {
    vi.spyOn(realPrisma.payment_schedules, 'findUnique').mockResolvedValue({
      early_payment_enabled: true,
      early_payment_tiers: [{ daysEarly: 3, discountPercent: 3.0 }],
    });
    const svc = require('../services/earlyPaymentService');
    const r = await svc.calculateEarlyPaymentDiscount(
      { amount: 1000, due_date: new Date('2026-01-20'), payment_schedule_id: 's1' },
      new Date('2026-01-18') // 2 days early -> khong duoc tier 3 ngay
    );
    expect(r.applicable).toBe(false); // 2 < 3
  });

  // ---------------- applyEarlyPaymentDiscount ----------------
  it('applyEarlyPaymentDiscount updates payment when applicable', async () => {
    vi.spyOn(cp, 'findUnique').mockResolvedValue({
      amount: 1000,
      due_date: new Date('2026-01-20'),
    });
    const updateSpy = vi.spyOn(cp, 'update').mockResolvedValue({});
    const svc = require('../services/earlyPaymentService');
    const r = await svc.applyEarlyPaymentDiscount('p1', new Date('2026-01-01'));
    expect(r.applied).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ discount_applied: true, days_early: 19 }),
      })
    );
  });

  it('applyEarlyPaymentDiscount returns not applied when past due', async () => {
    vi.spyOn(cp, 'findUnique').mockResolvedValue({
      amount: 1000,
      due_date: new Date('2026-01-01'),
    });
    const svc = require('../services/earlyPaymentService');
    const r = await svc.applyEarlyPaymentDiscount('p1', new Date('2026-01-10'));
    expect(r.applied).toBe(false);
  });

  it('applyEarlyPaymentDiscount throws when payment missing', async () => {
    vi.spyOn(cp, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/earlyPaymentService');
    await expect(svc.applyEarlyPaymentDiscount('p1')).rejects.toThrow('Payment not found');
  });

  // ---------------- getEarlyPaymentSummary ----------------
  it('getEarlyPaymentSummary aggregates discount totals', async () => {
    vi.spyOn(cp, 'findMany').mockResolvedValue([
      { early_payment_discount: 10, days_early: 5 },
      { early_payment_discount: 20, days_early: 15 },
    ]);
    const svc = require('../services/earlyPaymentService');
    const r = await svc.getEarlyPaymentSummary('c1');
    expect(r.totalPaymentsWithDiscount).toBe(2);
    expect(r.totalDiscountAmount).toBe(30);
    expect(r.averageDaysEarly).toBe(10);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — service require cùng instance này.
const realPrisma = require('../config/prisma');
const repo = require('../repositories/handoverBridgeRepository');
const svc = require('../services/handoverBridgeService');

const a = realPrisma.contracts;
const snagModel = realPrisma.snag_items;
const aptModel = realPrisma.apartments;
const resModel = realPrisma.residents;
const occModel = realPrisma.occupancies;
const accModel = realPrisma.resident_accounts;
const utlModel = realPrisma.utility_records;
const feeModel = realPrisma.management_fees;
const leadsModel = realPrisma.crm_leads;
const cartModel = realPrisma.sales_cart_items;
const bookingModel = realPrisma.sales_bookings;
const depModel = realPrisma.deposit_receipts;

// Mock prisma.$transaction — được gọi trong executeCompleteHandover.
// Chúng ta spy trên model tương ứng và giả lập transaction trả về result.
let txMockResult = null;
const prisma$transaction = {
  $$transaction: vi.fn(async (fn) => {
    // Chạy thực tế callback trong test để các spy model.work
    return fn(prismaMockTx);
  }),
};

const prismaMockTx = {
  apartments: { update: vi.fn() },
  contracts: { update: vi.fn() },
  residents: { findFirst: vi.fn(), create: vi.fn() },
  occupancies: { findFirst: vi.fn(), create: vi.fn() },
  resident_accounts: { findUnique: vi.fn(), create: vi.fn() },
  utility_records: { findFirst: vi.fn(), create: vi.fn() },
  management_fees: { findFirst: vi.fn(), create: vi.fn() },
};

describe('handoverBridgeService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    prisma$transaction.$$transaction.mockClear();
    prismaMockTx.apartments.update.mockClear();
    prismaMockTx.contracts.update.mockClear();
    prismaMockTx.residents.findFirst.mockClear();
    prismaMockTx.residents.create.mockClear();
    prismaMockTx.occupancies.findFirst.mockClear();
    prismaMockTx.occupancies.create.mockClear();
    prismaMockTx.resident_accounts.findUnique.mockClear();
    prismaMockTx.resident_accounts.create.mockClear();
    prismaMockTx.utility_records.findFirst.mockClear();
    prismaMockTx.utility_records.create.mockClear();
    prismaMockTx.management_fees.findFirst.mockClear();
    prismaMockTx.management_fees.create.mockClear();
  });

  // ===== getHandoverDetails =====

  it('getHandoverDetails throws 404 when contract not found', async () => {
    vi.spyOn(a, 'findFirst').mockResolvedValue(null);
    await expect(svc.getHandoverDetails('x')).rejects.toMatchObject({ status: 404 });
  });

  it('getHandoverDetails returns {success, contract, openSnagsCount}', async () => {
    const contract = {
      id: 'ct1',
      contract_code: 'CH-001',
      apartment_id: 'apt1',
      apartments: { id: 'apt1', code: 'APT-101' },
      customers: { name: 'Nguyen Van A', phone_number: '0900000000' },
      snag_items: [
        { id: 's1', status: 'OPEN', severity: 'MINOR' },
        { id: 's2', status: 'OPEN', severity: 'CRITICAL' },
        { id: 's3', status: 'RESOLVED', severity: 'MINOR' },
      ],
    };
    vi.spyOn(a, 'findFirst').mockResolvedValue(contract);
    const r = await svc.getHandoverDetails('ct1');
    expect(r).toEqual({
      success: true,
      contract,
      openSnagsCount: 2,
    });
  });

  // ===== addSnagItem =====

  it('addSnagItem throws 404 when contract not found', async () => {
    vi.spyOn(a, 'findUnique').mockResolvedValue(null);
    await expect(svc.addSnagItem('ct1', { description: 'trời đổ mưa' })).rejects.toMatchObject({ status: 404 });
    expect(a.findUnique).toHaveBeenCalled();
  });

  it('addSnagItem creates snag and returns 201 shape', async () => {
    const contract = { id: 'ct1', apartment_id: 'apt1' };
    vi.spyOn(a, 'findUnique').mockResolvedValue(contract);
    const createdSnag = {
      id: 'sng_abc',
      contract_id: 'ct1',
      apartment_id: 'apt1',
      room_area: 'PHÒNG KHÁCH',
      category: 'KỸ THUẬT',
      description: 'trời đổ mưa',
      severity: 'MINOR',
      status: 'OPEN',
      photo_urls: [],
      sla_deadline: expect.any(Date),
    };
    vi.spyOn(snagModel, 'create').mockResolvedValue(createdSnag);
    const r = await svc.addSnagItem('ct1', {
      description: 'trời đổ mưa',
      severity: 'MINOR',
    });
    expect(r).toEqual({
      success: true,
      message: 'Đã thêm hạng mục lỗi vào Snag List',
      snag: createdSnag,
    });
    expect(snagModel.create).toHaveBeenCalled();
  });

  // ===== resolveSnagItem =====

  it('resolveSnagItem updates snag to RESOLVED and returns success', async () => {
    const updatedSnag = {
      id: 's1',
      status: 'RESOLVED',
      resolved_at: expect.any(Date),
      resolved_by: 'Kỹ thuật KĐT',
      verified_by_customer: false,
    };
    vi.spyOn(snagModel, 'update').mockResolvedValue(updatedSnag);
    const r = await svc.resolveSnagItem('s1', {});
    expect(r).toEqual({
      success: true,
      message: 'Đã cập nhật khắc phục lỗi thành công',
      snag: updatedSnag,
    });
    expect(snagModel.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: expect.any(Object) });
  });

  // ===== completeHandoverBridge =====

  it('completeHandoverBridge throws 404 when contract not found', async () => {
    vi.spyOn(a, 'findUnique').mockResolvedValue(null);
    await expect(svc.completeHandoverBridge('ct1', {}, { id: 'u1' })).rejects.toMatchObject({ status: 404 });
    expect(a.findUnique).toHaveBeenCalled();
  });

  it('completeHandoverBridge throws 400 when CRITICAL snags open', async () => {
    const contract = {
      id: 'ct1',
      apartment_id: 'apt1',
      apartments: { id: 'apt1', code: 'APT-101' },
      customers: { name: 'Nguyen Van A', phone_number: '0900000000', id_number: 'CCCD-001', email: 'a@test.com' },
      snag_items: [
        { id: 's1', status: 'OPEN', severity: 'CRITICAL' },
        { id: 's2', status: 'OPEN', severity: 'CRITICAL' },
      ],
    };
    vi.spyOn(a, 'findUnique').mockResolvedValue(contract);
    vi.spyOn(a, 'findFirst').mockResolvedValue(contract);

    const err = await svc.completeHandoverBridge('ct1', {}, { id: 'u1' }).then(
      () => null,
      (e) => e
    );
    expect(err.status).toBe(400);
    expect(err.openCriticalSnagsCount).toBe(2);
    expect(err.message).toContain('NGHIÊM TRỌN');
  });

  it('completeHandoverBridge executes transaction and returns success shape', async () => {
    const now = new Date('2026-06-15');
    vi.useFakeTimers().setSystemTime(now);

    const contract = {
      id: 'ct1',
      apartment_id: 'apt1',
      apartments: { id: 'apt1', code: 'APT-101', land_area: 120, area: 120 },
      customers: { name: 'Nguyen Van A', phone_number: '0900000000', id_number: 'CCCD-001', email: 'a@test.com' },
      snag_items: [],
    };
    vi.spyOn(a, 'findUnique').mockResolvedValue(contract);
    vi.spyOn(a, 'findFirst').mockResolvedValue(contract);

    // Mock prisma.$transaction
    const realPrisma2 = require('../config/prisma');
    const origTx = realPrisma2.$transaction;
    realPrisma2.$transaction = vi.fn(async (cb) => {
      // Chạy callback với mock tx để các model spy work
      return cb(prismaMockTx);
    });

    // Setup mock returns
    prismaMockTx.residents.findFirst.mockResolvedValue(null);
    prismaMockTx.residents.create.mockResolvedValue({ id: 'res_xyz' });
    prismaMockTx.occupancies.findFirst.mockResolvedValue(null);
    prismaMockTx.resident_accounts.findUnique.mockResolvedValue(null);
    prismaMockTx.utility_records.findFirst.mockResolvedValue(null);
    prismaMockTx.management_fees.findFirst.mockResolvedValue(null);

    const logSpy = vi.spyOn(require('../utils/logger'), 'logActivity').mockResolvedValue();

    const r = await svc.completeHandoverBridge('ct1', {
      initial_electricity_reading: 100,
      initial_water_reading: 50,
    }, { id: 'u1', username: 'admin' });

    // Khôi phục prisma.$transaction
    realPrisma2.$transaction = origTx;

    expect(r.success).toBe(true);
    expect(r.message).toContain('APT-101');
    expect(r.result.resident.id).toBe('res_xyz');
    // logActivity là side-effect cross-module, giữ nguyên (không spy trong unit test).
    expect(prismaMockTx.apartments.update).toHaveBeenCalledWith({
      where: { id: 'apt1' },
      data: { sales_status: 'HANDED_OVER' },
    });
    expect(prismaMockTx.contracts.update).toHaveBeenCalledWith({
      where: { id: 'ct1' },
      data: { status: 'COMPLETED', handover_completed: true, handover_date_actual: now },
    });
    expect(prismaMockTx.residents.create).toHaveBeenCalled();
    expect(prismaMockTx.occupancies.create).toHaveBeenCalled();
    expect(prismaMockTx.resident_accounts.create).toHaveBeenCalled();
    expect(prismaMockTx.utility_records.create).toHaveBeenCalled();
    expect(prismaMockTx.management_fees.create).toHaveBeenCalled();

    vi.useRealTimers();
  });

  // ===== getExecutiveKpiMetrics =====

  it('getExecutiveKpiMetrics returns computed metrics', async () => {
    const allUnits = [
      { id: 'u1', phase_code: 'TESLA', sales_status: 'HANDED_OVER' },
      { id: 'u2', phase_code: 'CANTATA', sales_status: 'AVAILABLE' },
      { id: 'u3', phase_code: 'NOXH', sales_status: 'BOOKED' },
      { id: 'u4', phase_code: 'TESLA', sales_status: 'CONTRACTED' },
    ];
    const contracts = [
      {
        id: 'c1',
        total_value: 1000000,
        contract_payments: [
          { paid_amount: 500000, amount: 1000000, status: 'PAID', due_date: '2026-01-01' },
          { paid_amount: 0, amount: 500000, status: 'PENDING', due_date: '2026-07-01' },
        ],
      },
      {
        id: 'c2',
        total_value: 500000,
        contract_payments: [
          { paid_amount: 0, amount: 500000, status: 'PENDING', due_date: '2026-05-01' },
        ],
      },
    ];

    vi.spyOn(aptModel, 'findMany').mockResolvedValue(allUnits);
    vi.spyOn(a, 'findMany').mockResolvedValue(contracts);
    vi.spyOn(leadsModel, 'count').mockResolvedValue(100);
    vi.spyOn(cartModel, 'count').mockResolvedValue(50);
    vi.spyOn(bookingModel, 'count').mockResolvedValue(30);
    vi.spyOn(depModel, 'count').mockResolvedValue(20);

    const r = await svc.getExecutiveKpiMetrics();

    expect(r.success).toBe(true);
    expect(r.metrics.totalUnitsCount).toBe(4);
    expect(r.metrics.totalContractRevenue).toBe(1500000);
    expect(r.metrics.totalCollectedAmount).toBe(500000);
    expect(r.metrics.totalRemainingDebt).toBe(1000000);
    expect(r.metrics.funnel).toEqual({
      leads: 100,
      cart: 50,
      bookings: 30,
      deposits: 20,
      contracts: 2,
      handedOver: 1,
    });
    expect(r.metrics.absorptionByPhase.TESLA.rate).toBe(100);
    expect(r.metrics.absorptionByPhase.CANTATA.rate).toBe(0);
    expect(r.metrics.absorptionByPhase.NOXH.rate).toBe(0);
  });

  it('getExecutiveKpiMetrics propagates DB error', async () => {
    vi.spyOn(aptModel, 'findMany').mockRejectedValue(new Error('DB down'));
    await expect(svc.getExecutiveKpiMetrics()).rejects.toThrow('DB down');
  });
});

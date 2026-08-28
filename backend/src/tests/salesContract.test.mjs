import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const contracts = realPrisma.contracts;
const payments = realPrisma.contract_payments;
const apartments = realPrisma.apartments;
const customers = realPrisma.customers;
const depositReceipts = realPrisma.deposit_receipts;
const transfers = realPrisma.contract_transfers;

describe('salesContractService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ============ 1. createStandardContract ============
  it('createStandardContract throws 400 when missing apartment/customer', async () => {
    const svc = require('../services/salesContractService');
    await expect(svc.createStandardContract({})).rejects.toMatchObject({ status: 400 });
    await expect(
      svc.createStandardContract({ apartment_id: 'a1' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('createStandardContract throws 404 when apartment not found', async () => {
    vi.spyOn(apartments, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/salesContractService');
    await expect(
      svc.createStandardContract({ apartment_id: 'a1', customer_id: 'c1' })
    ).rejects.toMatchObject({ status: 404, message: 'Không tìm thấy căn hộ' });
  });

  it('createStandardContract throws 404 when customer not found', async () => {
    vi.spyOn(apartments, 'findUnique').mockResolvedValue({
      id: 'a1',
      code: 'A101',
      land_price_before_vat: 0,
      construction_price_before_vat: 0,
      vat_rate: 0,
    });
    vi.spyOn(customers, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/salesContractService');
    await expect(
      svc.createStandardContract({ apartment_id: 'a1', customer_id: 'c1' })
    ).rejects.toMatchObject({ status: 404, message: 'Không tìm thấy khách hàng' });
  });

  it('createStandardContract computes pricing + 10 installments + marks apartment CONTRACTED', async () => {
    vi.spyOn(apartments, 'findUnique').mockResolvedValue({
      id: 'a1',
      code: 'A101',
      phase_code: 'CANTATA',
      land_price_before_vat: 0,
      construction_price_before_vat: 0,
      vat_rate: 0,
    });
    vi.spyOn(customers, 'findUnique').mockResolvedValue({ id: 'c1', name: 'Nguyen' });

    // transaction: gọi callback với realPrisma làm tx để spy được các model method
    vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => fn(realPrisma));
    vi.spyOn(contracts, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ id: data.id, contract_code: data.contract_code, total_value: data.total_value })
    );
    vi.spyOn(payments, 'create').mockResolvedValue({});
    vi.spyOn(apartments, 'update').mockResolvedValue({});
    vi.spyOn(depositReceipts, 'update').mockResolvedValue({});

    const svc = require('../services/salesContractService');
    const r = await svc.createStandardContract({ apartment_id: 'a1', customer_id: 'c1' });

    // Pricing: land 4.5e9 + construction 2.5e9 = 7e9; VAT 8% = 5.6e8; total 7.56e9
    expect(r.contract.total_value).toBe(7560000000);
    expect(r.customerName).toBe('Nguyen');
    expect(r.unitCode).toBe('A101');

    const createCall = contracts.create.mock.calls[0][0];
    expect(createCall.data.contract_type).toBe('FUTURE_HOUSING');
    expect(createCall.data.status).toBe('SIGNED');
    expect(createCall.data.vat_rate).toBe(8);
    expect(createCall.data.vat_amount).toBe(560000000);
    expect(createCall.data.maintenance_fee).toBe(140000000);
    expect(createCall.data.deposit_deducted_amount).toBe(0);

    // 10 đợt thanh toán
    expect(payments.create).toHaveBeenCalledTimes(10);
    // Căn hộ chuyển sang CONTRACTED
    expect(apartments.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { sales_status: 'CONTRACTED' },
    });
    // Không có deposit_receipt_id → không update phiếu cọc
    expect(depositReceipts.update).not.toHaveBeenCalled();
  });

  it('createStandardContract applies active deposit deduction + marks receipt CONVERTED_CONTRACT', async () => {
    vi.spyOn(apartments, 'findUnique').mockResolvedValue({
      id: 'a1',
      code: 'A101',
      phase_code: 'CANTATA',
      land_price_before_vat: 0,
      construction_price_before_vat: 0,
      vat_rate: 0,
    });
    vi.spyOn(customers, 'findUnique').mockResolvedValue({ id: 'c1', name: 'Nguyen' });
    vi.spyOn(depositReceipts, 'findUnique').mockResolvedValue({
      id: 'dep1',
      status: 'ACTIVE',
      paid_amount: 1000000,
      deposit_amount: 0,
    });

    vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => fn(realPrisma));
    vi.spyOn(contracts, 'create').mockImplementation(({ data }) => Promise.resolve(data));
    vi.spyOn(payments, 'create').mockResolvedValue({});
    vi.spyOn(apartments, 'update').mockResolvedValue({});
    vi.spyOn(depositReceipts, 'update').mockResolvedValue({});

    const svc = require('../services/salesContractService');
    const r = await svc.createStandardContract({
      apartment_id: 'a1',
      customer_id: 'c1',
      deposit_receipt_id: 'dep1',
    });

    expect(r.contract.deposit_deducted_amount).toBe(1000000);
    expect(depositReceipts.update).toHaveBeenCalledWith({
      where: { id: 'dep1' },
      data: { status: 'CONVERTED_CONTRACT' },
    });
  });

  // ============ 2. getContractFull ============
  it('getContractFull throws 404 when not found', async () => {
    vi.spyOn(contracts, 'findFirst').mockResolvedValue(null);
    const svc = require('../services/salesContractService');
    await expect(svc.getContractFull('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('getContractFull computes late penalties + clause18 alert', async () => {
    const past = new Date('2020-01-01T00:00:00Z');
    vi.spyOn(contracts, 'findFirst').mockResolvedValue({
      id: 'c1',
      contract_code: 'HDMB1',
      clause_18_deadline: new Date('2020-06-01T00:00:00Z'),
      contract_payments: [
        {
          installment: 1,
          status: 'PENDING',
          amount: 100,
          paid_amount: 0,
          due_date: past,
        },
      ],
      contract_transfers: [],
    });

    const svc = require('../services/salesContractService');
    const r = await svc.getContractFull('c1');

    expect(Array.isArray(r.contract_payments)).toBe(true);
    expect(r.contract_payments[0].lateDays).toBeGreaterThan(0);
    expect(typeof r.contract_payments[0].latePenalty).toBe('number');
    expect(r.clause18Alert).not.toBeNull();
    expect(r.clause18Alert.violated).toBe(true);
    expect(contracts.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: 'c1' }, { contract_code: 'c1' }] },
      include: expect.any(Object),
    });
  });

  // ============ 3. transferContract ============
  it('transferContract throws 404 when contract missing', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/salesContractService');
    await expect(
      svc.transferContract({ id: 'c1', new_customer_phone: '0901' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('transferContract throws 400 on overdue payment', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue({
      id: 'c1',
      contract_code: 'HDMB1',
      customer_id: 'cu1',
      total_value: 100,
      contract_payments: [{ status: 'PENDING', due_date: new Date('2020-01-01T00:00:00Z') }],
      customers: { name: 'Old' },
    });
    const svc = require('../services/salesContractService');
    await expect(
      svc.transferContract({ id: 'c1', new_customer_phone: '0901' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('transferContract succeeds with existing customer (no customer create)', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue({
      id: 'c1',
      contract_code: 'HDMB1',
      customer_id: 'cu1',
      total_value: 1000,
      contract_payments: [{ status: 'PAID', due_date: new Date(), paid_amount: 1000 }],
      customers: { name: 'Old' },
    });
    vi.spyOn(customers, 'findFirst').mockResolvedValue({ id: 'cu2', name: 'New' });

    vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => fn(realPrisma));
    vi.spyOn(transfers, 'create').mockImplementation(({ data }) => Promise.resolve(data));
    vi.spyOn(contracts, 'update').mockResolvedValue({});
    vi.spyOn(customers, 'create').mockResolvedValue({ id: 'cu2' });

    const svc = require('../services/salesContractService');
    const r = await svc.transferContract({
      id: 'c1',
      new_customer_name: 'New',
      new_customer_phone: '0901',
    });

    expect(r.transfer).toBeTruthy();
    expect(r.customerName).toBe('New');
    expect(transfers.create).toHaveBeenCalled();
    expect(contracts.update).toHaveBeenCalled();
    // Khách hàng đã tồn tại → không tạo mới
    expect(customers.create).not.toHaveBeenCalled();
  });

  it('transferContract succeeds with new customer (creates customer in tx)', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue({
      id: 'c1',
      contract_code: 'HDMB1',
      customer_id: 'cu1',
      total_value: 1000,
      contract_payments: [{ status: 'PAID', due_date: new Date(), paid_amount: 1000 }],
      customers: { name: 'Old' },
    });
    vi.spyOn(customers, 'findFirst').mockResolvedValue(null); // chưa có

    vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => fn(realPrisma));
    vi.spyOn(transfers, 'create').mockImplementation(({ data }) => Promise.resolve(data));
    vi.spyOn(contracts, 'update').mockResolvedValue({});
    vi.spyOn(customers, 'create').mockImplementation(({ data }) => Promise.resolve(data));

    const svc = require('../services/salesContractService');
    const r = await svc.transferContract({
      id: 'c1',
      new_customer_name: 'BrandNew',
      new_customer_phone: '0902',
      new_customer_id_number: 'ID123',
      new_customer_address: 'Addr',
    });

    expect(r.customerName).toBe('BrandNew');
    expect(customers.create).toHaveBeenCalled();
    const createCall = customers.create.mock.calls[0][0];
    expect(createCall.data.phone_number).toBe('0902');
    expect(createCall.data.name).toBe('BrandNew');
  });
});

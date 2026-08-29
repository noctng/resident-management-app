import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const dr = realPrisma.deposit_receipts;
const apt = realPrisma.apartments;
const cust = realPrisma.customers;
const books = realPrisma.sales_bookings;

const svc = require('../services/depositReceiptService');

// Helper: mock $transaction để callback chạy với chính realPrisma (model methods đã spy)
function mockTx() {
  return vi
    .spyOn(realPrisma, '$transaction')
    .mockImplementation(async (fn) => fn(realPrisma));
}

describe('depositReceiptService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. getDeposits
  it('getDeposits returns { success, deposits, totalCount }', async () => {
    vi.spyOn(dr, 'findMany').mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);
    const r = await svc.getDeposits({});
    expect(r.success).toBe(true);
    expect(r.deposits).toHaveLength(2);
    expect(r.totalCount).toBe(2);
    expect(dr.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { apartments: true } })
    );
  });

  it('getDeposits builds status / phase / search filters', async () => {
    vi.spyOn(dr, 'findMany').mockResolvedValue([]);
    await svc.getDeposits({ status: 'ACTIVE', phase: 'P1', search: 'abc' });
    const call = dr.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('ACTIVE');
    expect(call.where.apartments).toEqual({ phase_code: 'P1' });
    expect(call.where.OR).toBeDefined();
    expect(call.where.OR.length).toBe(4);
  });

  // 2. createDepositReceipt
  it('createDepositReceipt creates receipt, locks unit DEPOSITED, converts booking when direct-paid', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue({ id: 'a1', code: 'A101' });
    mockTx();
    vi.spyOn(dr, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: data.id, apartments: { code: 'A101' } })
    );
    vi.spyOn(apt, 'update').mockResolvedValue({});
    vi.spyOn(books, 'update').mockResolvedValue({});

    const r = await svc.createDepositReceipt(
      {
        apartment_id: 'a1',
        customer_id: 'c1',
        customer_name: 'Nguyễn',
        customer_phone: '0901',
        deposit_amount: 100,
        paid_amount: 100,
        booking_id: 'b1',
      },
      { username: 'sale1' }
    );

    expect(r.deposit_code).toMatch(/^PDC-A101-/);
    expect(dr.create).toHaveBeenCalled();
    const created = dr.create.mock.calls[0][0];
    expect(created.data.status).toBe('ACTIVE'); // direct paid
    expect(created.data.sales_person_id).toBe('sale1');
    expect(created.data.payment_confirmed_by).toBe('sale1');
    expect(apt.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { sales_status: 'DEPOSITED' },
    });
    expect(books.update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { status: 'CONVERTED_DEPOSIT' },
    });
  });

  it('createDepositReceipt ensures customer by phone (create) and locks BOOKED when not direct-paid', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue({ id: 'a1', code: 'A101' });
    vi.spyOn(cust, 'findFirst').mockResolvedValue(null);
    vi.spyOn(cust, 'create').mockImplementation(({ data }) => Promise.resolve({ ...data }));
    mockTx();
    vi.spyOn(dr, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ ...data, apartments: {} })
    );
    vi.spyOn(apt, 'update').mockResolvedValue({});

    const r = await svc.createDepositReceipt(
      {
        apartment_id: 'a1',
        customer_name: 'Lê',
        customer_phone: '0902',
        deposit_amount: 100,
        paid_amount: 0,
      },
      { name: 'sale2' }
    );

    expect(cust.findFirst).toHaveBeenCalledWith({ where: { phone_number: '0902' } });
    expect(cust.create).toHaveBeenCalled();
    const created = dr.create.mock.calls[0][0];
    expect(created.data.customer_id).toMatch(/^cust_/);
    expect(created.data.status).toBe('PENDING_PAYMENT');
    expect(apt.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { sales_status: 'BOOKED' },
    });
  });

  it('createDepositReceipt throws 400 when missing required fields', async () => {
    await expect(svc.createDepositReceipt({ customer_name: 'x' }, {})).rejects.toMatchObject({
      status: 400,
    });
  });

  it('createDepositReceipt throws 404 when apartment missing', async () => {
    vi.spyOn(apt, 'findUnique').mockResolvedValue(null);
    await expect(
      svc.createDepositReceipt(
        { apartment_id: 'a1', customer_name: 'x', customer_phone: 'y', customer_id: 'c1' },
        {}
      )
    ).rejects.toMatchObject({ status: 404 });
  });

  // 3. confirmPayment
  it('confirmPayment sets ACTIVE, confirms, locks unit DEPOSITED', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue({
      id: 'd1',
      apartment_id: 'a1',
      deposit_amount: 100,
      apartments: { code: 'A101' },
      notes: '',
    });
    mockTx();
    vi.spyOn(dr, 'update').mockImplementation(({ data }) =>
      Promise.resolve({ id: 'd1', deposit_code: 'PDC1', apartments: { code: 'A101' }, ...data })
    );
    vi.spyOn(apt, 'update').mockResolvedValue({});

    const r = await svc.confirmPayment('d1', { paid_amount: 100, notes: 'ok' }, { username: 'acc' });
    expect(r.status).toBe('ACTIVE');
    const upd = dr.update.mock.calls[0][0];
    expect(upd.data.status).toBe('ACTIVE');
    expect(upd.data.payment_confirmed_by).toBe('acc');
    expect(upd.data.notes).toContain('[Kế toán xác nhận]');
    expect(apt.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { sales_status: 'DEPOSITED' },
    });
  });

  it('confirmPayment throws 404 when deposit missing', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue(null);
    await expect(svc.confirmPayment('x', {}, {})).rejects.toMatchObject({ status: 404 });
  });

  // 4. transferDeposit
  it('transferDeposit releases old, locks new, updates receipt notes', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue({
      id: 'd1',
      apartment_id: 'old',
      apartments: { code: 'OLD' },
    });
    vi.spyOn(apt, 'findUnique').mockResolvedValue({
      id: 'new',
      code: 'NEW',
      sales_status: 'AVAILABLE',
    });
    mockTx();
    vi.spyOn(apt, 'update').mockResolvedValue({});
    vi.spyOn(dr, 'update').mockResolvedValue({});

    const r = await svc.transferDeposit('d1', { new_apartment_id: 'new', transfer_reason: 'r' });
    expect(r.oldAptCode).toBe('OLD');
    expect(r.newAptCode).toBe('NEW');
    expect(apt.update).toHaveBeenCalledWith({
      where: { id: 'old' },
      data: { sales_status: 'AVAILABLE' },
    });
    expect(apt.update).toHaveBeenCalledWith({
      where: { id: 'new' },
      data: { sales_status: 'DEPOSITED' },
    });
    const rc = dr.update.mock.calls[0][0];
    expect(rc.data.apartment_id).toBe('new');
    expect(rc.data.transferred_to_apt_id).toBe('new');
    expect(rc.data.notes).toContain('Chuyển cọc từ căn OLD sang căn NEW');
  });

  it('transferDeposit throws 400 when new_apartment_id missing', async () => {
    await expect(svc.transferDeposit('d1', {})).rejects.toMatchObject({ status: 400 });
  });

  it('transferDeposit throws 404 when deposit missing', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue(null);
    await expect(svc.transferDeposit('x', { new_apartment_id: 'new' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('transferDeposit throws 404 when new unit missing', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue({
      id: 'd1',
      apartment_id: 'old',
      apartments: { code: 'OLD' },
    });
    vi.spyOn(apt, 'findUnique').mockResolvedValue(null);
    await expect(svc.transferDeposit('d1', { new_apartment_id: 'new' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('transferDeposit throws 400 when new unit not AVAILABLE', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue({
      id: 'd1',
      apartment_id: 'old',
      apartments: { code: 'OLD' },
    });
    vi.spyOn(apt, 'findUnique').mockResolvedValue({
      id: 'new',
      code: 'NEW',
      sales_status: 'BOOKED',
    });
    await expect(svc.transferDeposit('d1', { new_apartment_id: 'new' })).rejects.toMatchObject({
      status: 400,
    });
  });

  // 5. resolveDepositOutcome
  it('resolveDepositOutcome REFUND sets REFUNDED and releases unit', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue({
      id: 'd1',
      apartment_id: 'a1',
      deposit_code: 'PDC1',
      apartments: { code: 'A101' },
    });
    mockTx();
    vi.spyOn(dr, 'update').mockResolvedValue({});
    vi.spyOn(apt, 'update').mockResolvedValue({});

    const r = await svc.resolveDepositOutcome('d1', { action: 'REFUND', reason: 'r' }, { username: 'boss' });
    expect(r.action).toBe('REFUND');
    expect(r.depositCode).toBe('PDC1');
    const upd = dr.update.mock.calls[0][0];
    expect(upd.data.status).toBe('REFUNDED');
    expect(upd.data.refund_approved_by).toBe('boss');
    expect(apt.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { sales_status: 'AVAILABLE' },
    });
  });

  it('resolveDepositOutcome FORFEIT sets FORFEITED', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue({
      id: 'd1',
      apartment_id: 'a1',
      deposit_code: 'PDC1',
      apartments: {},
    });
    mockTx();
    vi.spyOn(dr, 'update').mockResolvedValue({});
    vi.spyOn(apt, 'update').mockResolvedValue({});

    const r = await svc.resolveDepositOutcome('d1', { action: 'FORFEIT', reason: 'r' }, {});
    const upd = dr.update.mock.calls[0][0];
    expect(upd.data.status).toBe('FORFEITED');
    expect(r.action).toBe('FORFEIT');
  });

  it('resolveDepositOutcome throws 404 when deposit missing', async () => {
    vi.spyOn(dr, 'findUnique').mockResolvedValue(null);
    await expect(svc.resolveDepositOutcome('x', { action: 'REFUND' }, {})).rejects.toMatchObject({
      status: 404,
    });
  });
});

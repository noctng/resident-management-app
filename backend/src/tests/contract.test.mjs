import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const contracts = realPrisma.contracts;
const payments = realPrisma.contract_payments;

describe('contractService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getAllContracts returns list with customer + apartment info', async () => {
    vi.spyOn(contracts, 'findMany').mockResolvedValue([
      { id: 'c1', contract_code: 'C1', customers: { name: 'Nguyen' }, apartments: { code: 'A101' } },
    ]);
    const svc = require('../services/contractService');
    const r = await svc.getAllContracts();
    expect(Array.isArray(r)).toBe(true);
    expect(r[0].contract_code).toBe('C1');
    expect(r[0].customers.name).toBe('Nguyen');
    expect(r[0].apartments.code).toBe('A101');
    expect(contracts.findMany).toHaveBeenCalled();
  });

  it('getContractById throws 404 when missing', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/contractService');
    await expect(svc.getContractById('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('getContractById returns contract with relations', async () => {
    const full = {
      id: 'c1',
      contract_code: 'C1',
      customers: { name: 'Nguyen' },
      apartments: { code: 'A101' },
      contract_payments: [{ installment: 1 }],
      contract_documents: [],
    };
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(full);
    const svc = require('../services/contractService');
    const r = await svc.getContractById('c1');
    expect(r.id).toBe('c1');
    expect(contracts.findUnique).toHaveBeenCalledWith({
      where: { id: 'c1' },
      include: expect.any(Object),
    });
  });

  it('createContract creates contract with generated id + payment schedule', async () => {
    const spyTx = vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => fn(realPrisma));
    vi.spyOn(contracts, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ id: data.id, ...data })
    );
    vi.spyOn(payments, 'createMany').mockResolvedValue({ count: 2 });

    const svc = require('../services/contractService');
    const r = await svc.createContract({
      contract_code: 'C1',
      customer_id: 'cu1',
      apartment_id: 'a1',
      total_value: 100,
      vat_amount: 8,
      maintenance_fee: 2,
      status: 'SIGNED',
      payment_schedule: [
        { installment: 1, description: 'Dot 1', due_date: '2026-01-01', amount: 50 },
      ],
    });

    expect(r.contract_code).toBe('C1');
    expect(typeof r.id).toBe('string');
    expect(r.id.startsWith('cont_')).toBe(true);
    expect(r.status).toBe('SIGNED');
    expect(r.vat_amount).toBe(8);
    expect(r.maintenance_fee).toBe(2);
    expect(contracts.create).toHaveBeenCalled();
    expect(payments.createMany).toHaveBeenCalled();
    const pmCall = payments.createMany.mock.calls[0][0];
    expect(pmCall.data).toHaveLength(1);
    expect(pmCall.data[0].contract_id).toBe(r.id);
    expect(pmCall.data[0].installment).toBe(1);
    expect(pmCall.data[0].status).toBe('PENDING');
    expect(pmCall.data[0].paid_amount).toBe(0);
    spyTx.mockRestore();
  });

  it('createContract uses defaults and skips payments when no schedule', async () => {
    vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => fn(realPrisma));
    vi.spyOn(contracts, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ id: data.id, ...data })
    );
    vi.spyOn(payments, 'createMany').mockResolvedValue({ count: 0 });

    const svc = require('../services/contractService');
    const r = await svc.createContract({
      contract_code: 'C2',
      customer_id: 'cu1',
      apartment_id: 'a1',
      total_value: 100,
    });

    expect(r.status).toBe('DEPOSIT'); // default
    expect(r.vat_amount).toBe(0); // default 0
    expect(r.maintenance_fee).toBe(0); // default 0
    // original controller only calls createMany when payment_schedule is provided
    expect(payments.createMany).not.toHaveBeenCalled();
  });

  it('createContract sets dates to null when not provided', async () => {
    vi.spyOn(realPrisma, '$transaction').mockImplementation(async (fn) => fn(realPrisma));
    let captured;
    vi.spyOn(contracts, 'create').mockImplementation(({ data }) => {
      captured = data;
      return Promise.resolve({ id: data.id, ...data });
    });
    vi.spyOn(payments, 'createMany').mockResolvedValue({ count: 0 });

    const svc = require('../services/contractService');
    await svc.createContract({
      contract_code: 'C3',
      customer_id: 'cu1',
      apartment_id: 'a1',
      total_value: 100,
    });
    expect(captured.signed_date).toBeNull();
    expect(captured.handover_date).toBeNull();
  });

  it('updateContract throws 404 when missing', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/contractService');
    await expect(svc.updateContract('missing', { status: 'SIGNED' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('updateContract returns old + updated and sets updated_at', async () => {
    const old = { id: 'c1', contract_code: 'C1', status: 'DEPOSIT' };
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(old);
    vi.spyOn(contracts, 'update').mockImplementation(({ data }) =>
      Promise.resolve({ ...old, ...data })
    );

    const svc = require('../services/contractService');
    const r = await svc.updateContract('c1', { status: 'SIGNED', signed_date: '2026-01-01' });

    expect(r.oldContract).toEqual(old);
    expect(r.updatedContract.status).toBe('SIGNED');
    expect(contracts.update).toHaveBeenCalled();
    const updCall = contracts.update.mock.calls[0][0];
    expect(updCall.data.updated_at).toBeInstanceOf(Date);
    expect(updCall.data.signed_date).toBeInstanceOf(Date);
    expect(updCall.data.handover_date).toBeUndefined();
  });

  it('updateContract leaves dates undefined when not provided', async () => {
    const old = { id: 'c1', contract_code: 'C1' };
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(old);
    vi.spyOn(contracts, 'update').mockImplementation(({ data }) =>
      Promise.resolve({ ...old, ...data })
    );

    const svc = require('../services/contractService');
    await svc.updateContract('c1', {});
    const updCall = contracts.update.mock.calls[0][0];
    expect(updCall.data.signed_date).toBeUndefined();
    expect(updCall.data.handover_date).toBeUndefined();
  });
});

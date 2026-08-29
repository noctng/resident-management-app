import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

// CJS test context trong Vitest ESM.
// handoverService lazy-require('../services/paymentScheduleService').getContractPaymentSummary
// → spy trực tiếp trên module thật (require trả cùng instance đã cache).
const req = createRequire(import.meta.url);
const SERVICE_PATH = req.resolve('../services/handoverService');
const PAYMENT_PATH = req.resolve('../services/paymentScheduleService');

const spyPaymentSummary = (value) =>
  vi.spyOn(req(PAYMENT_PATH), 'getContractPaymentSummary').mockResolvedValue(value);

beforeEach(() => {
  vi.restoreAllMocks();
  delete req.cache[SERVICE_PATH];
});

describe('handoverService', () => {
  // ===== 1. createHandoverChecklist - contract not found =====
  it('createHandoverChecklist throws 404 when contract missing', async () => {
    const repo = req('../repositories/handoverRepository');
    vi.spyOn(repo, 'findContract').mockResolvedValue(null);
    const svc = req('../services/handoverService');
    await expect(svc.createHandoverChecklist('nope')).rejects.toMatchObject({ status: 404 });
  });

  // ===== 2. createHandoverChecklist - success creates 6 items =====
  it('createHandoverChecklist creates 6 default checklist items', async () => {
    const repo = req('../repositories/handoverRepository');
    vi.spyOn(repo, 'findContract').mockResolvedValue({ id: 'ct1', contract_code: 'HD-001' });
    const createSpy = vi.spyOn(repo, 'createManyChecklistItems').mockResolvedValue({});
    const svc = req('../services/handoverService');
    const r = await svc.createHandoverChecklist('ct1');
    expect(r.itemsCreated).toBe(6);
    expect(createSpy).toHaveBeenCalled();
    expect(createSpy.mock.calls[0][0]).toHaveLength(6);
  });

  // ===== 3. getHandoverChecklist =====
  it('getHandoverChecklist returns checklist items ordered', async () => {
    const repo = req('../repositories/handoverRepository');
    vi.spyOn(repo, 'findChecklistByContractId').mockResolvedValue([
      { id: 'chk1', contract_id: 'ct1', item_name: 'A', item_order: 1, is_required: true, is_completed: false },
      { id: 'chk2', contract_id: 'ct1', item_name: 'B', item_order: 2, is_required: true, is_completed: true },
    ]);
    const svc = req('../services/handoverService');
    const r = await svc.getHandoverChecklist('ct1');
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(2);
  });

  // ===== 4. updateChecklistItem - not found =====
  it('updateChecklistItem throws 404 when item missing', async () => {
    const repo = req('../repositories/handoverRepository');
    vi.spyOn(repo, 'findChecklistItem').mockResolvedValue(null);
    const svc = req('../services/handoverService');
    await expect(svc.updateChecklistItem('nope', true, 'x', 'u1')).rejects.toMatchObject({ status: 404 });
  });

  // ===== 5. updateChecklistItem - success =====
  it('updateChecklistItem marks completed with actor id', async () => {
    const repo = req('../repositories/handoverRepository');
    vi.spyOn(repo, 'findChecklistItem').mockResolvedValue({
      id: 'chk1', contracts: { contract_code: 'HD-001' }, item_name: 'A', is_completed: false, notes: '',
    });
    const updSpy = vi.spyOn(repo, 'updateChecklistItem').mockResolvedValue({});
    const svc = req('../services/handoverService');
    const r = await svc.updateChecklistItem('chk1', true, 'done', 'u1');
    expect(r.message).toBe('Đã cập nhật checklist');
    expect(updSpy).toHaveBeenCalledWith('chk1', expect.objectContaining({
      is_completed: true, completed_by: 'u1', completed_at: expect.any(Date),
    }));
  });

  // ===== 6. checkHandoverEligibility - contract not found =====
  it('checkHandoverEligibility throws 404 when contract missing', async () => {
    const repo = req('../repositories/handoverRepository');
    vi.spyOn(repo, 'findContractFull').mockResolvedValue(null);
    const svc = req('../services/handoverService');
    await expect(svc.checkHandoverEligibility('nope')).rejects.toMatchObject({ status: 404 });
  });

  // ===== 7. checkHandoverEligibility - eligible true =====
  it('checkHandoverEligibility returns eligible=true when conditions met', async () => {
    const repo = req('../repositories/handoverRepository');
    spyPaymentSummary({ paymentPercentage: '97' });
    vi.spyOn(repo, 'findContractFull').mockResolvedValue({
      id: 'ct1', status: 'ACTIVE',
      handover_checklists: [
        { is_required: true, is_completed: true },
        { is_required: true, is_completed: true },
      ],
      snag_items: [],
    });
    const svc = req('../services/handoverService');
    const r = await svc.checkHandoverEligibility('ct1');
    expect(r.eligible).toBe(true);
    expect(r.message).toBe('Đủ điều kiện bàn giao');
    expect(r.conditions.paymentComplete).toBe(true);
    expect(r.conditions.noCriticalSnags).toBe(true);
    expect(r.conditions.checklistComplete).toBe(true);
  });

  // ===== 8. checkHandoverEligibility - not eligible (missing payment) =====
  it('checkHandoverEligibility returns eligible=false when payment < 95%', async () => {
    const repo = req('../repositories/handoverRepository');
    spyPaymentSummary({ paymentPercentage: '80' });
    vi.spyOn(repo, 'findContractFull').mockResolvedValue({
      id: 'ct1', status: 'ACTIVE',
      handover_checklists: [{ is_required: true, is_completed: true }],
      snag_items: [],
    });
    const svc = req('../services/handoverService');
    const r = await svc.checkHandoverEligibility('ct1');
    expect(r.eligible).toBe(false);
    expect(r.message).toMatch(/Chưa đủ/);
  });

  // ===== 9. checkHandoverEligibility - not eligible (critical snag) =====
  it('checkHandoverEligibility fails when critical snag OPEN', async () => {
    const repo = req('../repositories/handoverRepository');
    spyPaymentSummary({ paymentPercentage: '98' });
    vi.spyOn(repo, 'findContractFull').mockResolvedValue({
      id: 'ct1', status: 'ACTIVE',
      handover_checklists: [{ is_required: true, is_completed: true }],
      snag_items: [{ status: 'OPEN', severity: 'CRITICAL' }],
    });
    const svc = req('../services/handoverService');
    const r = await svc.checkHandoverEligibility('ct1');
    expect(r.eligible).toBe(false);
    expect(r.message).toMatch(/CRITICAL/);
  });

  // ===== 10. completeHandover - not eligible (400) =====
  it('completeHandover throws 400 when not eligible', async () => {
    const repo = req('../repositories/handoverRepository');
    spyPaymentSummary({ paymentPercentage: '50' });
    vi.spyOn(repo, 'findContractFull').mockResolvedValue({
      id: 'ct1', status: 'ACTIVE', handover_checklists: [],
      snag_items: [],
    });
    const svc = req('../services/handoverService');
    await expect(svc.completeHandover('ct1', '2026-06-01', '', { id: 'u1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  // ===== 11. completeHandover - success (new resident chain) =====
  it('completeHandover updates contract + creates resident + account + occupancy + lifecycle event', async () => {
    const bcrypt = req('bcrypt');
    const repo = req('../repositories/handoverRepository');
    spyPaymentSummary({ paymentPercentage: '100' });
    vi.spyOn(repo, 'findContractFull').mockResolvedValue({
      id: 'ct1', status: 'ACTIVE', apartment_id: 'apt1',
      handover_checklists: [{ is_required: true, is_completed: true }],
      snag_items: [],
      customers: {
        identity_card: '123', phone: '090', name: 'Nguyen Van A',
        email: 'a@b', date_of_birth: '1990', gender: 'M',
      },
    });
    const updContract = vi.spyOn(repo, 'updateContract').mockResolvedValue({ id: 'ct1', handover_completed: true });
    vi.spyOn(repo, 'findResidentByCriteria').mockResolvedValue(null);
    const createResident = vi.spyOn(repo, 'createResident').mockResolvedValue({ id: 'res1', phone_number: '090' });
    vi.spyOn(repo, 'findResidentAccount').mockResolvedValue(null);
    const hashSpy = vi.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$10$fakehash');
    const createAccount = vi.spyOn(repo, 'createResidentAccount').mockResolvedValue({});
    vi.spyOn(repo, 'findOccupancy').mockResolvedValue(null);
    const createOccupancy = vi.spyOn(repo, 'createOccupancy').mockResolvedValue({});
    vi.spyOn(repo, 'createLifecycleEvent').mockResolvedValue({});
    const svc = req('../services/handoverService');
    await svc.completeHandover('ct1', '2026-06-01', 'test notes', { id: 'u1' });
    expect(updContract).toHaveBeenCalledWith('ct1', expect.objectContaining({
      handover_completed: true, status: 'PAYING',
    }));
    expect(createResident).toHaveBeenCalled();
    expect(hashSpy).toHaveBeenCalled();
    expect(createAccount).toHaveBeenCalled();
    expect(vi.spyOn(repo, 'findOccupancy')).toHaveBeenCalledWith('apt1', 'res1', 'RESIDING');
    expect(createOccupancy).toHaveBeenCalled();
    expect(vi.spyOn(repo, 'createLifecycleEvent')).toHaveBeenCalled();
  });

  // ===== 12. completeHandover - existing resident, phone null → update → create account + occupancy + lifecycle =====
  it('completeHandover updates existing resident phone if missing, creates account + occupancy + lifecycle event', async () => {
    const bcrypt = req('bcrypt');
    const repo = req('../repositories/handoverRepository');
    spyPaymentSummary({ paymentPercentage: '100' });
    vi.spyOn(repo, 'findContractFull').mockResolvedValue({
      id: 'ct1', status: 'ACTIVE', apartment_id: 'apt1',
      handover_checklists: [{ is_required: true, is_completed: true }],
      snag_items: [],
      customers: {
        identity_card: '123', phone: '090', name: 'Nguyen Van A',
        email: 'a@b', date_of_birth: '1990', gender: 'M',
      },
    });
    vi.spyOn(repo, 'updateContract').mockResolvedValue({});
    vi.spyOn(repo, 'findResidentByCriteria').mockResolvedValue({ id: 'res1', phone_number: null });
    const updateResident = vi.spyOn(repo, 'updateResident').mockResolvedValue({ id: 'res1', phone_number: '090' });
    const findResidentAccountSpy = vi.spyOn(repo, 'findResidentAccount').mockResolvedValue(null);
    const hashSpy = vi.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$10$fakehash');
    const createAccount = vi.spyOn(repo, 'createResidentAccount').mockResolvedValue({});
    vi.spyOn(repo, 'findOccupancy').mockResolvedValue(null);
    const createOccupancy = vi.spyOn(repo, 'createOccupancy').mockResolvedValue({});
    vi.spyOn(repo, 'createLifecycleEvent').mockResolvedValue({});
    const svc = req('../services/handoverService');
    await svc.completeHandover('ct1', '2026-06-01', '', { id: 'u1' });
    expect(updateResident).toHaveBeenCalledWith('res1', { phone_number: '090' });
    expect(findResidentAccountSpy).toHaveBeenCalledWith('res1');
    expect(hashSpy).toHaveBeenCalled();
    expect(createAccount).toHaveBeenCalled();
    expect(vi.spyOn(repo, 'findOccupancy')).toHaveBeenCalledWith('apt1', 'res1', 'RESIDING');
    expect(createOccupancy).toHaveBeenCalled();
    expect(vi.spyOn(repo, 'createLifecycleEvent')).toHaveBeenCalled();
  });
});

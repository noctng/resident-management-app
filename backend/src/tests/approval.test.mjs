import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton prisma thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const wf = realPrisma.approval_workflows;
const contracts = realPrisma.contracts;
const payments = realPrisma.contract_payments;
const events = realPrisma.contract_lifecycle_events;

// logger side-effect — mock để không chạm DB trong test
const logger = require('../utils/logger');

const actor = { id: 'u1', name: 'Admin' };

describe('approvalService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(logger, 'logActivity').mockResolvedValue(undefined);
  });

  // ---------- 1. createApprovalRequest ----------
  it('createApprovalRequest throws 400 khi requestType không hợp lệ', async () => {
    const svc = require('../services/approvalService');
    await expect(svc.createApprovalRequest({ requestType: 'FOO' }, actor)).rejects.toMatchObject({
      status: 400,
      message: 'Loại yêu cầu không hợp lệ',
    });
  });

  it('createApprovalRequest throws 404 khi contract không tồn tại', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/approvalService');
    await expect(
      svc.createApprovalRequest({ requestType: 'DISCOUNT', contractId: 'c1' }, actor)
    ).rejects.toMatchObject({ status: 404, message: 'Hợp đồng không tồn tại' });
  });

  it('createApprovalRequest success → PENDING + log activity', async () => {
    vi.spyOn(contracts, 'findUnique').mockResolvedValue({ id: 'c1', total_value: '100' });
    const createSpy = vi
      .spyOn(wf, 'create')
      .mockResolvedValue({ id: 'appr_1', status: 'PENDING', request_type: 'EXTENSION' });
    const svc = require('../services/approvalService');
    const r = await svc.createApprovalRequest(
      { requestType: 'EXTENSION', contractId: 'c1', requestData: { paymentId: 'p1' } },
      actor
    );
    expect(r.message).toBe('Đã tạo yêu cầu phê duyệt');
    expect(r.approval.id).toBe('appr_1');
    const data = createSpy.mock.calls[0][0].data;
    expect(data.status).toBe('PENDING');
    expect(data.requested_by).toBe('u1');
    expect(data.id).toMatch(/^appr_/);
    expect(logger.logActivity).toHaveBeenCalled();
  });

  it('createApprovalRequest không check contract khi contractId rỗng', async () => {
    const findSpy = vi.spyOn(contracts, 'findUnique').mockResolvedValue(null);
    vi.spyOn(wf, 'create').mockResolvedValue({ id: 'appr_2' });
    const svc = require('../services/approvalService');
    const r = await svc.createApprovalRequest({ requestType: 'TRANSFER' }, actor);
    expect(r.approval.id).toBe('appr_2');
    expect(findSpy).not.toHaveBeenCalled();
  });

  // ---------- 2. getPendingApprovals ----------
  it('getPendingApprovals trả danh sách PENDING', async () => {
    const spy = vi.spyOn(wf, 'findMany').mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
    const svc = require('../services/approvalService');
    const r = await svc.getPendingApprovals();
    expect(r).toHaveLength(2);
    expect(spy.mock.calls[0][0].where).toEqual({ status: 'PENDING' });
  });

  // ---------- 3. getContractApprovals ----------
  it('getContractApprovals filter theo contract_id', async () => {
    const spy = vi.spyOn(wf, 'findMany').mockResolvedValue([{ id: 'a1' }]);
    const svc = require('../services/approvalService');
    const r = await svc.getContractApprovals('c9');
    expect(r).toHaveLength(1);
    expect(spy.mock.calls[0][0].where).toEqual({ contract_id: 'c9' });
  });

  // ---------- 4. approveRequest ----------
  it('approveRequest throws 404 khi không tìm thấy yêu cầu', async () => {
    vi.spyOn(wf, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/approvalService');
    await expect(svc.approveRequest('x', {}, actor)).rejects.toMatchObject({
      status: 404,
      message: 'Yêu cầu không tồn tại',
    });
  });

  it('approveRequest throws 400 khi yêu cầu đã xử lý', async () => {
    vi.spyOn(wf, 'findUnique').mockResolvedValue({ id: 'a1', status: 'APPROVED' });
    const svc = require('../services/approvalService');
    await expect(svc.approveRequest('a1', {}, actor)).rejects.toMatchObject({
      status: 400,
      message: 'Yêu cầu đã được xử lý',
    });
  });

  it('approveRequest EXTENSION → gia hạn due_date của payment', async () => {
    vi.spyOn(wf, 'findUnique').mockResolvedValue({
      id: 'a1',
      status: 'PENDING',
      request_type: 'EXTENSION',
      contract_id: 'c1',
      request_data: { paymentId: 'p1', newDueDate: '2026-12-31' },
    });
    const updWf = vi.spyOn(wf, 'update').mockResolvedValue({});
    const updPay = vi.spyOn(payments, 'update').mockResolvedValue({});
    const svc = require('../services/approvalService');
    const r = await svc.approveRequest('a1', { notes: 'ok' }, actor);
    expect(r).toEqual({ message: 'Đã phê duyệt yêu cầu' });
    expect(updWf.mock.calls[0][0].data.status).toBe('APPROVED');
    expect(updWf.mock.calls[0][0].data.approver_id).toBe('u1');
    expect(updPay.mock.calls[0][0].where).toEqual({ id: 'p1' });
    expect(updPay.mock.calls[0][0].data.due_date).toBeInstanceOf(Date);
  });

  it('approveRequest DISCOUNT → trừ total_value của hợp đồng', async () => {
    vi.spyOn(wf, 'findUnique').mockResolvedValue({
      id: 'a2',
      status: 'PENDING',
      request_type: 'DISCOUNT',
      contract_id: 'c1',
      request_data: { discountAmount: '20' },
    });
    vi.spyOn(wf, 'update').mockResolvedValue({});
    vi.spyOn(contracts, 'findUnique').mockResolvedValue({ id: 'c1', total_value: '100' });
    const updC = vi.spyOn(contracts, 'update').mockResolvedValue({});
    const svc = require('../services/approvalService');
    await svc.approveRequest('a2', {}, actor);
    expect(updC.mock.calls[0][0].data.total_value).toBe(80);
  });

  it('approveRequest CANCELLATION → huỷ hợp đồng + tạo lifecycle event', async () => {
    vi.spyOn(wf, 'findUnique').mockResolvedValue({
      id: 'a3',
      status: 'PENDING',
      request_type: 'CANCELLATION',
      contract_id: 'c1',
      request_data: {},
    });
    vi.spyOn(wf, 'update').mockResolvedValue({});
    const updC = vi.spyOn(contracts, 'update').mockResolvedValue({});
    const evSpy = vi.spyOn(events, 'create').mockResolvedValue({});
    const svc = require('../services/approvalService');
    await svc.approveRequest('a3', {}, actor);
    expect(updC.mock.calls[0][0].data).toEqual({ status: 'CANCELLED' });
    const ev = evSpy.mock.calls[0][0].data;
    expect(ev.event_type).toBe('CANCELLED');
    expect(ev.metadata).toEqual({ approvalId: 'a3' });
  });

  // ---------- 5. rejectRequest ----------
  it('rejectRequest throws 404 khi không tìm thấy', async () => {
    vi.spyOn(wf, 'findUnique').mockResolvedValue(null);
    const svc = require('../services/approvalService');
    await expect(svc.rejectRequest('x', { reason: 'no' }, actor)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('rejectRequest throws 400 khi đã xử lý', async () => {
    vi.spyOn(wf, 'findUnique').mockResolvedValue({ id: 'a1', status: 'REJECTED' });
    const svc = require('../services/approvalService');
    await expect(svc.rejectRequest('a1', { reason: 'no' }, actor)).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rejectRequest success → REJECTED + rejection_reason', async () => {
    vi.spyOn(wf, 'findUnique').mockResolvedValue({
      id: 'a1',
      status: 'PENDING',
      request_type: 'DISCOUNT',
    });
    const upd = vi.spyOn(wf, 'update').mockResolvedValue({});
    const svc = require('../services/approvalService');
    const r = await svc.rejectRequest('a1', { reason: 'Không đủ điều kiện' }, actor);
    expect(r).toEqual({ message: 'Đã từ chối yêu cầu' });
    expect(upd.mock.calls[0][0].data.status).toBe('REJECTED');
    expect(upd.mock.calls[0][0].data.rejection_reason).toBe('Không đủ điều kiện');
    expect(logger.logActivity).toHaveBeenCalled();
  });
});

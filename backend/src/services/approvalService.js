const repo = require('../repositories/approvalRepository');
const { generateRandomId } = require('../utils/helpers');
const logger = require('../utils/logger'); // dùng object để test spyOn được

// Service layer: toàn bộ logic nghiệp vụ approval workflow.
// KHÔNG prisma query trực tiếp → gọi repo.*
// Throw lỗi kèm err.status để controller format response (giữ nguyên status/message cũ).

const VALID_REQUEST_TYPES = ['EXTENSION', 'DISCOUNT', 'TRANSFER', 'CANCELLATION'];

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ===== 1. Create approval request =====
async function createApprovalRequest(dto, actor) {
  const { requestType, contractId, requestData, notes } = dto || {};

  if (!VALID_REQUEST_TYPES.includes(requestType)) {
    throw httpError('Loại yêu cầu không hợp lệ', 400);
  }

  if (contractId) {
    const contract = await repo.findContractById(contractId);
    if (!contract) {
      throw httpError('Hợp đồng không tồn tại', 404);
    }
  }

  const approval = await repo.createApproval({
    id: `appr_${generateRandomId()}`,
    request_type: requestType,
    contract_id: contractId,
    requested_by: actor.id,
    status: 'PENDING',
    request_data: requestData || {},
  });

  await logger.logActivity(
    actor,
    'CREATE',
    'APPROVAL',
    approval.id,
    `${requestType} Request`,
    notes || `Tạo yêu cầu phê duyệt: ${requestType}`
  );

  return { message: 'Đã tạo yêu cầu phê duyệt', approval };
}

// ===== 2. Pending approvals =====
async function getPendingApprovals() {
  return repo.findPending();
}

// ===== 3. Approval history của 1 hợp đồng =====
async function getContractApprovals(contractId) {
  return repo.findByContractId(contractId);
}

// ===== 4. Approve =====
async function approveRequest(id, { notes } = {}, actor) {
  const approval = await repo.findApprovalWithContract(id);
  if (!approval) throw httpError('Yêu cầu không tồn tại', 404);
  if (approval.status !== 'PENDING') throw httpError('Yêu cầu đã được xử lý', 400);

  await repo.updateApproval(id, {
    status: 'APPROVED',
    approver_id: actor.id,
    approved_at: new Date(),
  });

  await executeApprovedAction(approval);

  await logger.logActivity(
    actor,
    'APPROVE',
    'APPROVAL',
    id,
    `${approval.request_type} Request`,
    notes || `Phê duyệt yêu cầu: ${approval.request_type}`
  );

  return { message: 'Đã phê duyệt yêu cầu' };
}

// ===== 5. Reject =====
async function rejectRequest(id, { reason } = {}, actor) {
  const approval = await repo.findApprovalById(id);
  if (!approval) throw httpError('Yêu cầu không tồn tại', 404);
  if (approval.status !== 'PENDING') throw httpError('Yêu cầu đã được xử lý', 400);

  await repo.updateApproval(id, {
    status: 'REJECTED',
    approver_id: actor.id,
    approved_at: new Date(),
    rejection_reason: reason,
  });

  await logger.logActivity(
    actor,
    'REJECT',
    'APPROVAL',
    id,
    `${approval.request_type} Request`,
    `Từ chối yêu cầu: ${reason}`
  );

  return { message: 'Đã từ chối yêu cầu' };
}

// ===== 6. Thực thi hành động sau khi phê duyệt (cross-module) =====
async function executeApprovedAction(approval) {
  const { request_type, contract_id, request_data } = approval;
  const data = request_data || {};

  switch (request_type) {
    case 'EXTENSION':
      if (data.paymentId && data.newDueDate) {
        await repo.updateContractPaymentDueDate(data.paymentId, new Date(data.newDueDate));
      }
      break;

    case 'DISCOUNT':
      if (data.discountAmount && contract_id) {
        const contract = await repo.findContractById(contract_id);
        await repo.updateContract(contract_id, {
          total_value: parseFloat(contract.total_value) - parseFloat(data.discountAmount),
        });
      }
      break;

    case 'CANCELLATION':
      if (contract_id) {
        await repo.updateContract(contract_id, { status: 'CANCELLED' });
        await repo.createLifecycleEvent({
          id: `evt_${generateRandomId()}`,
          contract_id: contract_id,
          event_type: 'CANCELLED',
          notes: 'Hợp đồng bị hủy sau phê duyệt',
          metadata: { approvalId: approval.id },
        });
      }
      break;

    case 'TRANSFER':
      // Transfer được xử lý riêng qua luồng transfer hiện có
      break;
  }
}

module.exports = {
  createApprovalRequest,
  getPendingApprovals,
  getContractApprovals,
  approveRequest,
  rejectRequest,
  executeApprovedAction,
};

const prisma = require('../config/prisma');

// Repository layer: CHỈ chứa prisma query cho module approval.
// KHÔNG chứa logic nghiệp vụ.

// ===== approval_workflows =====
async function findContractById(id) {
  return prisma.contracts.findUnique({ where: { id } });
}

async function createApproval(data) {
  return prisma.approval_workflows.create({ data });
}

async function findPending() {
  return prisma.approval_workflows.findMany({
    where: { status: 'PENDING' },
    include: {
      contracts: {
        include: {
          customers: true,
          apartments: true,
        },
      },
    },
    orderBy: { requested_at: 'desc' },
  });
}

async function findByContractId(contractId) {
  return prisma.approval_workflows.findMany({
    where: { contract_id: contractId },
    orderBy: { requested_at: 'desc' },
  });
}

async function findApprovalWithContract(id) {
  return prisma.approval_workflows.findUnique({
    where: { id },
    include: { contracts: true },
  });
}

async function findApprovalById(id) {
  return prisma.approval_workflows.findUnique({ where: { id } });
}

async function updateApproval(id, data) {
  return prisma.approval_workflows.update({ where: { id }, data });
}

// ===== side effects khi thực thi hành động đã phê duyệt =====
async function updateContractPaymentDueDate(paymentId, dueDate) {
  return prisma.contract_payments.update({
    where: { id: paymentId },
    data: { due_date: dueDate },
  });
}

async function updateContract(id, data) {
  return prisma.contracts.update({ where: { id }, data });
}

async function createLifecycleEvent(data) {
  return prisma.contract_lifecycle_events.create({ data });
}

module.exports = {
  findContractById,
  createApproval,
  findPending,
  findByContractId,
  findApprovalWithContract,
  findApprovalById,
  updateApproval,
  updateContractPaymentDueDate,
  updateContract,
  createLifecycleEvent,
};

const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Models: commission_policies, commissions, commission_payouts (+ contracts lookup).
// Transaction (tạo payout + cập nhật commission) nằm ở đây để giữ tính nguyên tử.

// ===== Commission Policies =====
async function listPolicies(where = {}) {
  return prisma.commission_policies.findMany({
    where,
    include: {
      _count: {
        select: { commissions: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

async function createCommissionPolicy(data) {
  return prisma.commission_policies.create({ data });
}

async function getPolicyById(id) {
  return prisma.commission_policies.findUnique({ where: { id } });
}

// ===== Commissions =====
async function listCommissions(where = {}) {
  return prisma.commissions.findMany({
    where,
    include: {
      contracts: {
        include: {
          apartments: true,
          customers: true,
        },
      },
      commission_policies: true,
      commission_payouts: {
        orderBy: { payout_date: 'desc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

async function getCommissionById(id) {
  return prisma.commissions.findUnique({ where: { id } });
}

async function createCommission(data) {
  return prisma.commissions.create({ data });
}

async function updateCommission(id, data) {
  return prisma.commissions.update({ where: { id }, data });
}

// ===== Contract lookup (dùng khi generate commission) =====
async function getContractById(id) {
  return prisma.contracts.findUnique({
    where: { id },
    include: { apartments: true },
  });
}

// ===== Payout (transactional) =====
// Tạo phiếu chi + cập nhật commission trong 1 giao dịch để đảm bảo atomicity.
async function createPayoutTx({ commissionId, payoutData, commissionUpdateData }) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.commission_payouts.create({ data: payoutData });
    const updatedCommission = await tx.commissions.update({
      where: { id: commissionId },
      data: commissionUpdateData,
    });
    return { payout, updatedCommission };
  });
}

module.exports = {
  listPolicies,
  createCommissionPolicy,
  getPolicyById,
  listCommissions,
  getCommissionById,
  createCommission,
  updateCommission,
  getContractById,
  createPayoutTx,
};

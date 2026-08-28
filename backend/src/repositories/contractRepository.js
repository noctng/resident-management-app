const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Model chính: `contracts`. Các query liên quan (contract_payments) nằm trong
// transaction createWithPayments để tạo hợp đồng + lịch thanh toán nguyên tử.
// KHÔNG đổi behavior / response shape của các endpoint hiện có.

// GET /api/contracts — list với customer + apartment info
async function listAll() {
  return prisma.contracts.findMany({
    include: {
      customers: { select: { name: true } },
      apartments: { select: { code: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

// GET /api/contracts/:id — detail kèm relations (giữ nguyên include cũ)
async function getById(id) {
  return prisma.contracts.findUnique({
    where: { id },
    include: {
      customers: true,
      apartments: true,
      contract_payments: { orderBy: { installment: 'asc' } },
      contract_documents: true,
    },
  });
}

// Tìm contract thuần (không include) — dùng cho existence check + change tracking
async function findById(id) {
  return prisma.contracts.findUnique({ where: { id } });
}

// Tạo hợp đồng + (tuỳ chọn) lịch thanh toán trong 1 transaction
async function createWithPayments(contractData, payments) {
  return prisma.$transaction(async (tx) => {
    const contract = await tx.contracts.create({ data: contractData });
    if (payments && payments.length > 0) {
      await tx.contract_payments.createMany({ data: payments });
    }
    return contract;
  });
}

async function update(id, data) {
  return prisma.contracts.update({ where: { id }, data });
}

module.exports = {
  listAll,
  getById,
  findById,
  createWithPayments,
  update,
};

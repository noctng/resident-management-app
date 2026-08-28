const prisma = require('../config/prisma');

// Repository layer — CHỈ chứa prisma query thuần (Clean Architecture rule).
// KHÔNG chứa logic nghiệp vụ, KHÔNG tính toán KPI/rating.

// ---------- Warranty claims ----------

// GET danh sách claims (đã build where ở service)
async function listClaims(where = {}) {
  return prisma.warranty_claims.findMany({
    where,
    include: {
      apartments: true,
      contracts: { include: { customers: true } },
      contractors: true,
    },
    orderBy: { created_at: 'desc' },
  });
}

// Lấy contract mới nhất của 1 căn hộ (để kiểm tra thời hạn bảo hành)
async function findContractByApartment(apartmentId, contractId) {
  return prisma.contracts.findFirst({
    where: {
      apartment_id: apartmentId,
      ...(contractId ? { id: contractId } : {}),
    },
    orderBy: { created_at: 'desc' },
  });
}

// Lấy claim cuối cùng trong năm để sinh mã BH-TPCP-YYYY-NNNN
async function findLastClaimByYear(year) {
  return prisma.warranty_claims.findFirst({
    where: { claim_code: { startsWith: `BH-TPCP-${year}-` } },
    orderBy: { claim_code: 'desc' },
    select: { claim_code: true },
  });
}

// Tạo claim (kèm include apartments + contractors)
async function createClaim(data) {
  return prisma.warranty_claims.create({
    data,
    include: { apartments: true, contractors: true },
  });
}

// Cập nhật claim (kèm include apartments + contractors)
async function updateClaim(id, data) {
  return prisma.warranty_claims.update({
    where: { id },
    data,
    include: { apartments: true, contractors: true },
  });
}

// Lấy các claim COMPLETED của 1 nhà thầu (tính rating trung bình)
async function findCompletedClaimsByContractor(contractorId) {
  return prisma.warranty_claims.findMany({
    where: { contractor_id: contractorId, status: 'COMPLETED' },
    select: { customer_rating: true },
  });
}

// ---------- Contractors ----------

// GET danh sách nhà thầu đang hoạt động kèm số lượng ticket
async function listActiveContractors() {
  return prisma.contractors.findMany({
    where: { is_active: true },
    include: { _count: { select: { warranty_claims: true } } },
    orderBy: { rating: 'desc' },
  });
}

// Lấy 1 nhà thầu (tùy chọn kèm _count warranty_claims)
async function findContractorById(id, withCount = false) {
  return prisma.contractors.findUnique({
    where: { id },
    ...(withCount
      ? { include: { _count: { select: { warranty_claims: true } } } }
      : {}),
  });
}

async function createContractor(data) {
  return prisma.contractors.create({ data });
}

async function updateContractor(id, data) {
  return prisma.contractors.update({ where: { id }, data });
}

async function deactivateContractor(id) {
  return prisma.contractors.update({
    where: { id },
    data: { is_active: false },
  });
}

async function deleteContractor(id) {
  return prisma.contractors.delete({ where: { id } });
}

// Cập nhật rating trung bình của nhà thầu
async function updateContractorRating(id, rating) {
  return prisma.contractors.update({
    where: { id },
    data: { rating },
  });
}

module.exports = {
  listClaims,
  findContractByApartment,
  findLastClaimByYear,
  createClaim,
  updateClaim,
  findCompletedClaimsByContractor,
  listActiveContractors,
  findContractorById,
  createContractor,
  updateContractor,
  deactivateContractor,
  deleteContractor,
  updateContractorRating,
};

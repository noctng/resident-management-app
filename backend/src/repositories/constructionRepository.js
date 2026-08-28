const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Mọi hàm trả về dữ liệu từ model construction_registrations / contracts /
// construction_violations / construction_workers.

const registrationInclude = {
  apartments: true,
  contracts: { include: { customers: true } },
  construction_workers: true,
  construction_violations: true,
};

// GET /api/construction — list đăng ký thi công kèm include đầy đủ
async function findRegistrations(where = {}) {
  return prisma.construction_registrations.findMany({
    where,
    include: registrationInclude,
    orderBy: { created_at: 'desc' },
  });
}

// Tìm hợp đồng của căn hộ (để tính handover_date / deadline 6 tháng)
async function findContractForApartment(apartmentId, contractId) {
  return prisma.contracts.findFirst({
    where: {
      apartment_id: apartmentId,
      ...(contractId ? { id: contractId } : {}),
    },
    orderBy: { created_at: 'desc' },
  });
}

async function countRegistrations() {
  return prisma.construction_registrations.count();
}

async function createRegistration(data) {
  return prisma.construction_registrations.create({
    data,
    include: { apartments: true },
  });
}

async function updateRegistration(id, data) {
  return prisma.construction_registrations.update({
    where: { id },
    data,
    include: { apartments: true },
  });
}

// Dùng trong settleRegistration để tính tổng phạt từ violations
async function getRegistrationWithViolations(id) {
  return prisma.construction_registrations.findUnique({
    where: { id },
    include: { construction_violations: true },
  });
}

async function countViolations() {
  return prisma.construction_violations.count();
}

async function createViolation(data) {
  return prisma.construction_violations.create({ data });
}

async function createWorker(data) {
  return prisma.construction_workers.create({ data });
}

// Settle: thu hồi toàn bộ thẻ công nhân của hồ sơ
async function expireWorkersByRegistration(registrationId) {
  return prisma.construction_workers.updateMany({
    where: { registration_id: registrationId },
    data: { status: 'EXPIRED' },
  });
}

module.exports = {
  findRegistrations,
  findContractForApartment,
  countRegistrations,
  createRegistration,
  updateRegistration,
  getRegistrationWithViolations,
  countViolations,
  createViolation,
  createWorker,
  expireWorkersByRegistration,
};

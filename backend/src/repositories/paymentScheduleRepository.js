const prisma = require('../config/prisma');

/**
 * paymentScheduleRepository — CHỈ query thuần (Prisma).
 * KHÔNG chứa logic nghiệp vụ.
 */

async function listByContract(contractId) {
  return prisma.payment_schedules.findMany({
    where: { contract_id: contractId },
    include: {
      contract_payments: {
        orderBy: { installment: 'asc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

async function getById(id) {
  return prisma.payment_schedules.findUnique({
    where: { id },
    include: {
      contract_payments: { orderBy: { installment: 'asc' } },
    },
  });
}

async function create(data) {
  return prisma.payment_schedules.create({ data });
}

async function update(id, data) {
  return prisma.payment_schedules.update({ where: { id }, data });
}

async function listUnpaidByApartment(apartmentId) {
  return prisma.payment_schedules.findMany({
    where: {
      contracts: { apartment_id: apartmentId },
      contract_payments: {
        some: { status: { not: 'PAID' } },
      },
    },
    include: {
      contract_payments: {
        where: { status: { not: 'PAID' } },
        orderBy: { installment: 'asc' },
      },
      contracts: true,
    },
  });
}

module.exports = {
  listByContract,
  getById,
  create,
  update,
  listUnpaidByApartment,
};

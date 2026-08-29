const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ.
// Model: handover_checklists, contracts, residents, resident_accounts, occupancies,
// contract_lifecycle_events.

// ===== Handover Checklist =====
async function findChecklistByContractId(contractId) {
  return prisma.handover_checklists.findMany({
    where: { contract_id: contractId },
    orderBy: { item_order: 'asc' },
  });
}

async function findChecklistItem(itemId) {
  return prisma.handover_checklists.findUnique({
    where: { id: itemId },
    include: { contracts: true },
  });
}

async function updateChecklistItem(itemId, data) {
  return prisma.handover_checklists.update({
    where: { id: itemId },
    data,
  });
}

async function createManyChecklistItems(items) {
  return prisma.handover_checklists.createMany({ data: items });
}

async function countChecklistItems(contractId) {
  return prisma.handover_checklists.count({ where: { contract_id: contractId } });
}

// ===== Contracts =====
async function findContract(id) {
  return prisma.contracts.findUnique({
    where: { id },
  });
}

async function findContractFull(id) {
  return prisma.contracts.findUnique({
    where: { id },
    include: {
      handover_checklists: true,
      snag_items: true,
      customers: true,
    },
  });
}

async function updateContract(id, data) {
  return prisma.contracts.update({
    where: { id },
    data,
  });
}

async function findResidentByCriteria(criteria) {
  return prisma.residents.findFirst({
    where: {
      OR: [
        { id_number: criteria.id_number },
        { identity_card: criteria.id_number },
        { phone_number: criteria.phone },
      ],
    },
  });
}

async function createResident(data) {
  return prisma.residents.create({ data });
}

async function updateResident(id, data) {
  return prisma.residents.update({
    where: { id },
    data,
  });
}

async function findResidentAccount(residentId) {
  return prisma.resident_accounts.findUnique({
    where: { resident_id: residentId },
  });
}

async function createResidentAccount(data) {
  return prisma.resident_accounts.create({ data });
}

async function findOccupancy(apartmentId, residentId, status) {
  return prisma.occupancies.findFirst({
    where: {
      apartment_id: apartmentId,
      resident_id: residentId,
      status,
    },
  });
}

async function createOccupancy(data) {
  return prisma.occupancies.create({ data });
}

async function createLifecycleEvent(data) {
  return prisma.contract_lifecycle_events.create({ data });
}

module.exports = {
  findChecklistByContractId,
  findChecklistItem,
  updateChecklistItem,
  createManyChecklistItems,
  countChecklistItems,
  findContract,
  findContractFull,
  updateContract,
  findResidentByCriteria,
  createResident,
  updateResident,
  findResidentAccount,
  createResidentAccount,
  findOccupancy,
  createOccupancy,
  createLifecycleEvent,
};

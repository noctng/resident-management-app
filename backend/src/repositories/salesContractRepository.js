const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Model chính: `contracts`, liên quan: `contract_payments`, `apartments`,
// `customers`, `deposit_receipts`, `contract_transfers`.
// Các nghiệp vụ (tính giá, sinh lịch thanh toán, phạt chậm, Điều 18) nằm ở service.
// KHÔNG đổi behavior / response shape của các endpoint hiện có.

// --- Lookups (dùng cho validation + tính toán giá trong service) ---
async function getApartmentById(id) {
  return prisma.apartments.findUnique({ where: { id } });
}

async function getCustomerById(id) {
  return prisma.customers.findUnique({ where: { id } });
}

async function getDepositReceiptById(id) {
  return prisma.deposit_receipts.findUnique({ where: { id } });
}

async function findCustomerByPhone(phone) {
  return prisma.customers.findFirst({ where: { phone_number: phone } });
}

// --- CREATE HĐMB chuẩn + 10 đợt LTT + cập nhật căn hộ/phiếu cọc (1 transaction) ---
// data đã được service tính toán & chuẩn bị sẵn (contractData, payments, flags).
async function createStandardContractTx({
  contractData,
  payments,
  apartmentId,
  depositReceiptId,
}) {
  return prisma.$transaction(async (tx) => {
    const createdContract = await tx.contracts.create({ data: contractData });

    for (const p of payments) {
      await tx.contract_payments.create({ data: p });
    }

    await tx.apartments.update({
      where: { id: apartmentId },
      data: { sales_status: 'CONTRACTED' },
    });

    // Chỉ đánh dấu phiếu cọc đã chuyển đổi khi có liên kết (giữ nguyên behavior gốc)
    if (depositReceiptId) {
      await tx.deposit_receipts.update({
        where: { id: depositReceiptId },
        data: { status: 'CONVERTED_CONTRACT' },
      });
    }

    return createdContract;
  });
}

// --- GET chi tiết HĐMB (tìm theo id hoặc contract_code) + relations ---
async function getContractFullByCodeOrId(id) {
  return prisma.contracts.findFirst({
    where: { OR: [{ id }, { contract_code: id }] },
    include: {
      apartments: true,
      customers: true,
      contract_payments: {
        orderBy: { installment: 'asc' },
      },
      contract_transfers: {
        include: {
          old_customer: true,
          new_customer: true,
        },
      },
    },
  });
}

// --- GET hợp đồng cho transfer (relations cần thiết) ---
async function getContractByIdWithRelations(id) {
  return prisma.contracts.findUnique({
    where: { id },
    include: {
      customers: true,
      apartments: true,
      contract_payments: true,
    },
  });
}

// --- TRANSFER HĐMB (1 transaction): find-or-create customer + transfer record + connect contract ---
// customerOp: { mode: 'existing', customerId } | { mode: 'create', data }
async function transferContractTx({ contractId, customerOp, transferData }) {
  return prisma.$transaction(async (tx) => {
    let newCustomer;
    if (customerOp.mode === 'create') {
      newCustomer = await tx.customers.create({ data: customerOp.data });
    } else {
      newCustomer = { id: customerOp.customerId };
    }

    const transferRec = await tx.contract_transfers.create({ data: transferData });

    await tx.contracts.update({
      where: { id: contractId },
      data: { customers: { connect: { id: newCustomer.id } } },
    });

    return { transferRec, newCustomerId: newCustomer.id };
  });
}

module.exports = {
  getApartmentById,
  getCustomerById,
  getDepositReceiptById,
  findCustomerByPhone,
  createStandardContractTx,
  getContractFullByCodeOrId,
  getContractByIdWithRelations,
  transferContractTx,
};

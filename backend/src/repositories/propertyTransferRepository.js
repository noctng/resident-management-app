const prisma = require('../config/prisma');

/**
 * PropertyTransfer Repository
 * Chỉ chứa Prisma query thuần — KHÔNG logic nghiệp vụ.
 * Invoice query được nhóm mẫu feeConfig/raw SQL.
 */

// Tìm contract kèm payments, customer, apartment kèm transfers
const findContractWithDetails = async (contractId) => {
  return prisma.contracts.findUnique({
    where: { id: contractId },
    include: {
      customers: true,
      apartments: true,
      contract_payments: { orderBy: { installment: 'asc' } },
      contract_transfers: true,
    },
  });
};

// Query transfers với filter
const findTransfers = async (where, orderBy = { created_at: 'desc' }, take = 100) => {
  return prisma.contract_transfers.findMany({
    where,
    include: {
      contracts: { include: { apartments: true } },
      old_customer: true,
      new_customer: true,
    },
    orderBy,
    take,
  });
};

// Chi tiết transfer
const findTransferById = async (id) => {
  return prisma.contract_transfers.findUnique({
    where: { id },
    include: {
      contracts: {
        include: {
          apartments: true,
          contract_payments: { orderBy: { installment: 'asc' } },
          contract_promotions: true,
        },
      },
      old_customer: true,
      new_customer: true,
    },
  });
};

// Tìm hoặc tạo customer mới
const findOrCreateCustomer = async (tx, customerData) => {
  const existing = await tx.customers.findFirst({
    where: { phone_number: customerData.phone_number },
  });
  if (existing) return existing;
  return tx.customers.create({ data: customerData });
};

// Xử lý giao dịch chuyển nhượng (atomic)
const executeTransferTransaction = async (txData) => {
  return txData.transaction(async (tx) => {
    // Create customer (findOrCreate logic inline)
    let newCustomer = await tx.customers.findFirst({
      where: { phone_number: txData.newCustomerPhone },
    });
    if (!newCustomer) {
      newCustomer = await tx.customers.create({
        data: {
          id: txData.newCustomerId,
          name: txData.newCustomerName,
          phone_number: txData.newCustomerPhone,
          id_number: txData.newCustomerIdNumber || '',
          address: txData.newCustomerAddress || '',
          email: txData.newCustomerEmail || '',
        },
      });
    } else {
      await tx.customers.update({
        where: { id: newCustomer.id },
        data: {
          name: txData.newCustomerName,
          id_number: txData.newCustomerIdNumber || newCustomer.id_number,
          address: txData.newCustomerAddress || newCustomer.address,
          email: txData.newCustomerEmail || newCustomer.email,
        },
      });
    }

    const transfer = await tx.contract_transfers.create({ data: txData.transferData });
    const updatedContract = await tx.contracts.update({
      where: { id: txData.contractId },
      data: { customer_id: newCustomer.id, updated_at: new Date() },
    });
    await tx.contract_lifecycle_events.create({ data: txData.lifecycleData });
    return { transfer, updatedContract, newCustomer };
  });
};

// Cấu trúc thời gian chuyển nhượng của một căn hộ
const findApartmentWithTransfers = async (apartmentId) => {
  return prisma.apartments.findUnique({
    where: { id: apartmentId },
    include: {
      contracts: {
        include: {
          customers: true,
          contract_transfers: {
            include: { old_customer: true, new_customer: true },
            orderBy: { transfer_date: 'asc' },
          },
        },
      },
    },
  });
};

module.exports = {
  findContractWithDetails,
  findTransfers,
  findTransferById,
  findOrCreateCustomer,
  executeTransferTransaction,
  findApartmentWithTransfers,
};
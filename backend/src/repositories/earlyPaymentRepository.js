/**
 * earlyPaymentRepository — CHỈ chứa truy vấn DB (Prisma).
 *
 * Quy tắc Clean Architecture: KHÔNG chứa logic nghiệp vụ, KHÔNG if phân nhánh
 * nghiệp vụ. Mọi hàm trả về dữ liệu thuần từ Prisma. Các hàm *InTx nhận `tx`
 * (transaction client) để dùng bên trong prisma.$transaction do service gọi.
 *
 * Không đổi schema/column — dùng đúng model đã có:
 *   contracts, contract_payments, contract_lifecycle_events, payment_schedules
 */
const prisma = require('../config/prisma');

// Lấy hợp đồng kèm các đợt thanh toán CHƯA PAID (phục vụ xử lý thanh toán sớm)
async function getContractWithPendingPayments(contractId) {
  return prisma.contracts.findUnique({
    where: { id: contractId },
    include: {
      contract_payments: {
        where: { status: { not: 'PAID' } },
        orderBy: { installment: 'asc' },
      },
      customers: true,
    },
  });
}

// Cập nhật 1 đợt thanh toán trong transaction (không chứa logic nghiệp vụ)
async function updatePaymentInTx(tx, paymentId, data) {
  return tx.contract_payments.update({ where: { id: paymentId }, data });
}

// Tạo lifecycle event trong transaction (không chứa logic nghiệp vụ)
async function createLifecycleEventInTx(tx, data) {
  return tx.contract_lifecycle_events.create({ data });
}

// Bọc prisma.$transaction (mechanical wrapper, không business logic)
async function runTransaction(fn) {
  return prisma.$transaction(fn);
}

// --- Hàm cho service.calculateEarlyPaymentDiscount / applyEarlyPaymentDiscount ---
async function getPaymentScheduleById(id) {
  return prisma.payment_schedules.findUnique({ where: { id } });
}

async function getPaymentById(id) {
  return prisma.contract_payments.findUnique({ where: { id } });
}

async function updatePaymentDiscount(id, data) {
  return prisma.contract_payments.update({ where: { id }, data });
}

async function getPaymentsByContractWithDiscount(contractId) {
  return prisma.contract_payments.findMany({
    where: { contract_id: contractId, discount_applied: true },
  });
}

module.exports = {
  getContractWithPendingPayments,
  updatePaymentInTx,
  createLifecycleEventInTx,
  runTransaction,
  getPaymentScheduleById,
  getPaymentById,
  updatePaymentDiscount,
  getPaymentsByContractWithDiscount,
};

const prisma = require('../config/prisma');
const repo = require('../repositories/paymentScheduleRepository');
const earlyPaymentRepo = require('../repositories/earlyPaymentRepository');
const { logActivity } = require('../utils/logger');

async function listByContract(contractId) {
  return repo.listByContract(contractId);
}

async function markSchedulePaid(paymentId, opts = {}) {
  const payment = await earlyPaymentRepo.getPaymentById(paymentId);
  if (!payment) {
    const err = new Error('Không tìm thấy đợt thanh toán');
    err.status = 404;
    throw err;
  }

  const paidAmount = opts.paidAmount !== undefined ? Number(opts.paidAmount) : 0;
  const totalScheduled = Number(payment.amount || 0);

  if (paidAmount <= 0) {
    const err = new Error('Số tiền thanh toán không hợp lệ');
    err.status = 400;
    throw err;
  }

  const paymentData = {
    paid_amount: paidAmount,
    paid_at: opts.paidAt || new Date(),
    payment_method: opts.paymentMethod || 'MANUAL',
    transaction_ref: opts.transactionRef || null,
    status: 'PAID',
  };

  const updated = await earlyPaymentRepo.runTransaction(async (tx) => {
    await earlyPaymentRepo.updatePaymentInTx(tx, paymentId, paymentData);
    return tx.contract_payments.findUnique({ where: { id: paymentId } });
  });

  return {
    id: paymentId,
    scheduleName: payment.description,
    amount: totalScheduled,
    paid_amount: paidAmount,
    status: updated.status,
    payment_method: updated.payment_method,
    paid_at: updated.paid_at,
  };
}

async function reconcilePayment(paymentId, opts = {}) {
  const amount = Number(opts.amount || 0);
  const referenceCode = String(opts.referenceCode || '').trim();

  if (!referenceCode || amount <= 0) {
    const err = new Error('Thiếu thông tin đối soát: amount/referenceCode');
    err.status = 400;
    throw err;
  }

  const payment = await earlyPaymentRepo.getPaymentById(paymentId);
  if (!payment) {
    const err = new Error('Không tìm thấy đợt thanh toán');
    err.status = 404;
    throw err;
  }

  const remaining = Number(payment.amount || 0) - Number(payment.paid_amount || 0);
  if (remaining <= 0) {
    const err = new Error('Đợt thanh toán đã thanh toán đủ');
    err.status = 400;
    throw err;
  }

  const matchedAmount = Math.min(remaining, amount);
  const paymentData = {
    paid_amount: Number(payment.paid_amount || 0) + matchedAmount,
    paid_at: opts.transactionDate || new Date(),
    payment_method: opts.gateway ? `Ngân hàng (${opts.gateway})` : 'Ngân hàng (SePay)',
    transaction_ref: referenceCode,
    status: Number(payment.paid_amount || 0) + matchedAmount >= Number(payment.amount || 0) ? 'PAID' : 'PENDING',
  };

  const updated = await earlyPaymentRepo.runTransaction(async (tx) => {
    await earlyPaymentRepo.updatePaymentInTx(tx, paymentId, paymentData);
    return tx.contract_payments.findUnique({ where: { id: paymentId } });
  });

  return {
    id: paymentId,
    scheduleName: payment.description,
    amount: Number(payment.amount || 0),
    paid_amount: Number(updated.paid_amount),
    status: updated.status,
    gateway: opts.gateway || 'SePay',
    referenceCode,
  };
}

module.exports = {
  listByContract,
  markSchedulePaid,
  reconcilePayment,
};

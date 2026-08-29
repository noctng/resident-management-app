/**
 * earlyPaymentService — nghiệp vụ thanh toán sớm.
 *
 * KHÔNG import prisma/pg trực tiếp → gọi earlyPaymentRepository.
 * Chỉ chứa logic tính toán, validation, mapping DTO → entity.
 * Throw lỗi kèm `err.status` để controller format response.
 *
 * API giữ NGUYÊN so với phiên bản cũ để không break contractController:
 *   - calculateEarlyPaymentDiscount
 *   - applyEarlyPaymentDiscount
 *   - getEarlyPaymentSummary
 *   - DEFAULT_EARLY_PAYMENT_TIERS
 * Thêm mới:
 *   - processEarlyPayment (tách từ earlyPaymentController cũ)
 */
const repo = require('../repositories/earlyPaymentRepository');
const { generateRandomId } = require('../utils/helpers');

/** Default early payment tiers (khi payment không có schedule riêng) */
const DEFAULT_EARLY_PAYMENT_TIERS = [
  { daysEarly: 15, discountPercent: 2.0 }, // 2% if paid 15+ days early
  { daysEarly: 7, discountPercent: 1.0 }, // 1% if paid 7-14 days early
];

/**
 * Tính chiết khấu thanh toán sớm cho 1 payment.
 * @param {Object} payment - bản ghi payment (có due_date, amount, payment_schedule_id)
 * @param {Date} paymentDate - ngày thanh toán thực tế
 * @param {Array|null} customTiers - tiers tuỳ chỉnh (bỏ qua schedule)
 */
async function calculateEarlyPaymentDiscount(
  payment,
  paymentDate = new Date(),
  customTiers = null
) {
  const dueDate = new Date(payment.due_date);
  const actualPaymentDate = new Date(paymentDate);

  // Không sớm → không chiết khấu
  if (actualPaymentDate >= dueDate) {
    return { daysEarly: 0, discountAmount: 0, discountPercent: 0, applicable: false };
  }

  const daysEarly = Math.floor((dueDate - actualPaymentDate) / (1000 * 60 * 60 * 24));

  // Lấy tiers: custom > schedule (nếu có) > default
  let tiers = customTiers || DEFAULT_EARLY_PAYMENT_TIERS;
  if (payment.payment_schedule_id && !customTiers) {
    const schedule = await repo.getPaymentScheduleById(payment.payment_schedule_id);
    if (schedule && schedule.early_payment_enabled && schedule.early_payment_tiers) {
      tiers = schedule.early_payment_tiers;
    }
  }

  tiers.sort((a, b) => b.daysEarly - a.daysEarly); // cao → thấp
  const applicableTier = tiers.find((tier) => daysEarly >= tier.daysEarly);

  if (!applicableTier) {
    return { daysEarly, discountAmount: 0, discountPercent: 0, applicable: false };
  }

  const paymentAmount = parseFloat(payment.amount);
  const discountAmount = (paymentAmount * applicableTier.discountPercent) / 100;

  return {
    daysEarly,
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    discountPercent: applicableTier.discountPercent,
    applicable: true,
  };
}

/**
 * Áp dụng chiết khấu thanh toán sớm cho 1 payment (cập nhật DB).
 * @param {string} paymentId
 * @param {Date} paymentDate
 */
async function applyEarlyPaymentDiscount(paymentId, paymentDate = new Date()) {
  try {
    const payment = await repo.getPaymentById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const discount = await calculateEarlyPaymentDiscount(payment, paymentDate);
    if (!discount.applicable) {
      return {
        applied: false,
        message: 'No early payment discount applicable',
        discount: 0,
      };
    }

    await repo.updatePaymentDiscount(paymentId, {
      early_payment_discount: discount.discountAmount,
      days_early: discount.daysEarly,
      discount_applied: true,
    });

    return {
      applied: true,
      message: `Early payment discount applied: ${discount.discountPercent}% (${discount.daysEarly} days early)`,
      discount: discount.discountAmount,
      daysEarly: discount.daysEarly,
      discountPercent: discount.discountPercent,
    };
  } catch (error) {
    console.error('Error applying early payment discount:', error);
    throw error;
  }
}

/**
 * Tổng hợp chiết khấu đã áp dụng của 1 hợp đồng.
 * @param {string} contractId
 */
async function getEarlyPaymentSummary(contractId) {
  const payments = await repo.getPaymentsByContractWithDiscount(contractId);

  const totalDiscount = payments.reduce(
    (sum, p) => sum + parseFloat(p.early_payment_discount || 0),
    0
  );
  const avgDaysEarly =
    payments.length > 0
      ? payments.reduce((sum, p) => sum + (p.days_early || 0), 0) / payments.length
      : 0;

  return {
    totalPaymentsWithDiscount: payments.length,
    totalDiscountAmount: parseFloat(totalDiscount.toFixed(2)),
    averageDaysEarly: Math.round(avgDaysEarly),
  };
}

/**
 * Xử lý thanh toán sớm toàn bộ dư nợ của hợp đồng.
 * Tách từ earlyPaymentController.processEarlyPayment (cũ).
 *
 * @param {string} contractId
 * @param {{discountPercent?: number}} body
 * @param {Object} user - req.user (cần user.id để ghi lifecycle event)
 * @returns {{originalTotal:number, discount:number, finalPaid:number, contractCode:string}}
 */
async function processEarlyPayment(contractId, { discountPercent } = {}, user = {}) {
  // 1. Lấy hợp đồng + đợt thanh toán chưa PAID
  const contract = await repo.getContractWithPendingPayments(contractId);
  if (!contract) {
    const e = new Error('Hợp đồng không tồn tại');
    e.status = 404;
    throw e;
  }

  const pendingPayments = contract.contract_payments || [];
  if (pendingPayments.length === 0) {
    const e = new Error('Hợp đồng này không còn đợt thanh toán nào chưa hoàn thành');
    e.status = 400;
    throw e;
  }

  // 2. Tính tổng & chiết khấu
  const totalAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const discountRate = (discountPercent || 0) / 100;
  const discountAmount = Math.floor(totalAmount * discountRate);
  const finalAmount = totalAmount - discountAmount;

  const now = new Date();

  // 3. Tính chiết khấu phân bổ cho từng đợt (business logic → ở service)
  const items = pendingPayments.map((p) => {
    const originalAmount = Number(p.amount);
    const itemDiscount = Math.floor(originalAmount * discountRate);
    const itemPaid = originalAmount - itemDiscount;
    return {
      id: p.id,
      data: {
        status: 'PAID',
        paid_amount: itemPaid,
        payment_date: now,
        early_payment_discount: itemDiscount,
        is_early_payment: true,
        updated_at: now,
      },
    };
  });

  // 4. Dữ liệu lifecycle event (id sinh ở service, repo chỉ ghi)
  const eventData = {
    id: `evt_${generateRandomId()}`,
    contract_id: contractId,
    event_type: 'PAYMENT_RECEIVED',
    event_date: now,
    performed_by: user.id,
    notes: `Thanh toán sớm toàn bộ (Chiết khấu ${discountPercent}%): Tổng gốc ${totalAmount.toLocaleString(
      'vi-VN'
    )} - Giảm ${discountAmount.toLocaleString('vi-VN')} = Thực thu ${finalAmount.toLocaleString(
      'vi-VN'
    )}`,
    metadata: {
      type: 'EARLY_PAYMENT',
      totalOriginal: totalAmount,
      discountAmount: discountAmount,
      finalPaid: finalAmount,
      discountPercent: discountPercent,
      paymentCount: pendingPayments.length,
    },
  };

  // 5. Ghi trong 1 transaction (repo cung cấp tx, service điều phối)
  await repo.runTransaction(async (tx) => {
    for (const it of items) {
      await repo.updatePaymentInTx(tx, it.id, it.data);
    }
    await repo.createLifecycleEventInTx(tx, eventData);
  });

  return {
    originalTotal: totalAmount,
    discount: discountAmount,
    finalPaid: finalAmount,
    contractCode: contract.contract_code,
  };
}

module.exports = {
  processEarlyPayment,
  calculateEarlyPaymentDiscount,
  applyEarlyPaymentDiscount,
  getEarlyPaymentSummary,
  DEFAULT_EARLY_PAYMENT_TIERS,
};

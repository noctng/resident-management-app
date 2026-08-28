const prisma = require('../config/prisma');

/**
 * Early Payment Discount Service
 * Calculates and applies discounts for early payments
 */

/**
 * Default early payment tiers
 * Can be customized per payment schedule
 */
const DEFAULT_EARLY_PAYMENT_TIERS = [
    { daysEarly: 15, discountPercent: 2.0 }, // 2% if paid 15+ days early
    { daysEarly: 7, discountPercent: 1.0 }, // 1% if paid 7-14 days early
];

/**
 * Calculate early payment discount
 * @param {Object} payment - Payment record
 * @param {Date} paymentDate - Actual payment date
 * @param {Array} customTiers - Optional custom discount tiers
 */
async function calculateEarlyPaymentDiscount(
    payment,
    paymentDate = new Date(),
    customTiers = null
) {
    const dueDate = new Date(payment.due_date);
    const actualPaymentDate = new Date(paymentDate);

    // Check if payment is early
    if (actualPaymentDate >= dueDate) {
        return {
            daysEarly: 0,
            discountAmount: 0,
            discountPercent: 0,
            applicable: false,
        };
    }

    // Calculate days early
    const daysEarly = Math.floor((dueDate - actualPaymentDate) / (1000 * 60 * 60 * 24));

    // Get discount tiers (custom or default)
    let tiers = customTiers || DEFAULT_EARLY_PAYMENT_TIERS;

    // If payment has a schedule, check for custom tiers
    if (payment.payment_schedule_id && !customTiers) {
        const schedule = await prisma.payment_schedules.findUnique({
            where: { id: payment.payment_schedule_id },
        });

        if (schedule && schedule.early_payment_enabled && schedule.early_payment_tiers) {
            tiers = schedule.early_payment_tiers;
        }
    }

    // Find applicable tier (highest tier that matches)
    tiers.sort((a, b) => b.daysEarly - a.daysEarly); // Sort descending
    const applicableTier = tiers.find((tier) => daysEarly >= tier.daysEarly);

    if (!applicableTier) {
        return {
            daysEarly,
            discountAmount: 0,
            discountPercent: 0,
            applicable: false,
        };
    }

    // Calculate discount amount
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
 * Apply early payment discount to a payment
 * @param {string} paymentId
 * @param {Date} paymentDate
 */
async function applyEarlyPaymentDiscount(paymentId, paymentDate = new Date()) {
    try {
        const payment = await prisma.contract_payments.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new Error('Payment not found');
        }

        // Calculate discount
        const discount = await calculateEarlyPaymentDiscount(payment, paymentDate);

        if (!discount.applicable) {
            return {
                applied: false,
                message: 'No early payment discount applicable',
                discount: 0,
            };
        }

        // Update payment with discount
        await prisma.contract_payments.update({
            where: { id: paymentId },
            data: {
                early_payment_discount: discount.discountAmount,
                days_early: discount.daysEarly,
                discount_applied: true,
            },
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
 * Get early payment summary for a contract
 * @param {string} contractId
 */
async function getEarlyPaymentSummary(contractId) {
    const payments = await prisma.contract_payments.findMany({
        where: {
            contract_id: contractId,
            discount_applied: true,
        },
    });

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

module.exports = {
    calculateEarlyPaymentDiscount,
    applyEarlyPaymentDiscount,
    getEarlyPaymentSummary,
    DEFAULT_EARLY_PAYMENT_TIERS,
};

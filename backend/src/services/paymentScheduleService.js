const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');

/**
 * Payment Schedule Service
 * Handles automatic payment schedule generation and late fee calculations
 */

/**
 * Generate milestone-based payment schedule
 * @param {string} contractId
 * @param {Array} milestones - [{name, percentage, dueDate}]
 * @param {number} totalValue
 */
async function generateMilestoneBasedSchedule(contractId, milestones, totalValue) {
    const scheduleId = `sched_${generateRandomId()}`;

    // Create schedule record
    await prisma.payment_schedules.create({
        data: {
            id: scheduleId,
            contract_id: contractId,
            schedule_name: 'Milestone-based Schedule',
            policy_type: 'MILESTONE_BASED',
            late_fee_rate: 0.05, // 0.05% per day default
            grace_period_days: 7,
        },
    });

    // Create payment records
    const payments = milestones.map((milestone, index) => ({
        id: `pay_${generateRandomId()}`,
        contract_id: contractId,
        payment_schedule_id: scheduleId,
        installment: index + 1,
        description: milestone.name,
        due_date: new Date(milestone.dueDate),
        amount: ((totalValue * milestone.percentage) / 100).toFixed(2),
        paid_amount: 0,
        status: 'PENDING',
        auto_calculated: true,
    }));

    await prisma.contract_payments.createMany({
        data: payments,
    });

    return { scheduleId, paymentsCreated: payments.length };
}

/**
 * Generate time-based payment schedule
 * @param {string} contractId
 * @param {number} totalValue
 * @param {number} numberOfInstallments
 * @param {Date} startDate
 * @param {number} intervalMonths
 */
async function generateTimeBasedSchedule(
    contractId,
    totalValue,
    numberOfInstallments,
    startDate,
    intervalMonths = 1
) {
    const scheduleId = `sched_${generateRandomId()}`;

    await prisma.payment_schedules.create({
        data: {
            id: scheduleId,
            contract_id: contractId,
            schedule_name: `${numberOfInstallments}-installment Schedule`,
            policy_type: 'TIME_BASED',
            late_fee_rate: 0.05,
            grace_period_days: 7,
        },
    });

    const amountPerInstallment = (totalValue / numberOfInstallments).toFixed(2);
    const payments = [];

    for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i * intervalMonths);

        payments.push({
            id: `pay_${generateRandomId()}`,
            contract_id: contractId,
            payment_schedule_id: scheduleId,
            installment: i + 1,
            description: `Installment ${i + 1}/${numberOfInstallments}`,
            due_date: dueDate,
            amount: amountPerInstallment,
            paid_amount: 0,
            status: 'PENDING',
            auto_calculated: true,
        });
    }

    await prisma.contract_payments.createMany({
        data: payments,
    });

    return { scheduleId, paymentsCreated: payments.length };
}

/**
 * Calculate late fee for a payment
 * @param {Object} payment
 * @param {Date} currentDate
 */
async function calculateLateFee(payment, currentDate = new Date()) {
    if (payment.status !== 'OVERDUE' && payment.status !== 'PENDING') {
        return 0;
    }

    const dueDate = new Date(payment.due_date);
    if (currentDate <= dueDate) {
        return 0;
    }

    // Get schedule to check grace period
    const schedule = await prisma.payment_schedules.findUnique({
        where: { id: payment.payment_schedule_id },
    });

    const gracePeriod = schedule?.grace_period_days || 0;
    const lateFeeRate = schedule?.late_fee_rate || 0.05;

    // Calculate days overdue after grace period
    const daysOverdue = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
    const chargeableDays = Math.max(0, daysOverdue - gracePeriod);

    if (chargeableDays === 0) {
        return 0;
    }

    // Calculate late fee: outstanding amount * rate * days
    const outstandingAmount = parseFloat(payment.amount) - parseFloat(payment.paid_amount);
    const lateFee = outstandingAmount * (lateFeeRate / 100) * chargeableDays;

    return parseFloat(lateFee.toFixed(2));
}

/**
 * Update all overdue payments (run as cron job)
 */
async function updateOverduePayments() {
    const currentDate = new Date();

    // Find all pending payments past due date
    const overduePayments = await prisma.contract_payments.findMany({
        where: {
            status: 'PENDING',
            due_date: {
                lt: currentDate,
            },
        },
        include: {
            payment_schedules: true,
        },
    });

    const updates = [];

    for (const payment of overduePayments) {
        const dueDate = new Date(payment.due_date);
        const daysOverdue = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
        const lateFee = await calculateLateFee(payment, currentDate);

        updates.push(
            prisma.contract_payments.update({
                where: { id: payment.id },
                data: {
                    status: 'OVERDUE',
                    days_overdue: daysOverdue,
                    late_fee: lateFee,
                },
            })
        );
    }

    await Promise.all(updates);

    return { updated: updates.length };
}

/**
 * Get payment summary for a contract
 * @param {string} contractId
 */
async function getContractPaymentSummary(contractId) {
    const payments = await prisma.contract_payments.findMany({
        where: { contract_id: contractId },
        orderBy: { installment: 'asc' },
    });

    const summary = {
        totalScheduled: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        totalLateFees: 0,
        pendingCount: 0,
        overdueCount: 0,
        paidCount: 0,
        paymentPercentage: 0,
    };

    payments.forEach((payment) => {
        const amount = parseFloat(payment.amount);
        const paidAmount = parseFloat(payment.paid_amount);
        const lateFee = parseFloat(payment.late_fee || 0);

        summary.totalScheduled += amount;
        summary.totalPaid += paidAmount;
        summary.totalOutstanding += amount - paidAmount;
        summary.totalLateFees += lateFee;

        if (payment.status === 'PENDING') summary.pendingCount++;
        if (payment.status === 'OVERDUE') summary.overdueCount++;
        if (payment.status === 'PAID') summary.paidCount++;
    });

    summary.paymentPercentage =
        summary.totalScheduled > 0
            ? ((summary.totalPaid / summary.totalScheduled) * 100).toFixed(2)
            : 0;

    return summary;
}

module.exports = {
    generateMilestoneBasedSchedule,
    generateTimeBasedSchedule,
    calculateLateFee,
    updateOverduePayments,
    getContractPaymentSummary,
};

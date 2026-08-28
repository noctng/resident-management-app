const prisma = require('../config/prisma');
const { calculateLateFee } = require('./paymentScheduleService');

/**
 * Alert Service
 * Handles automated alerts and notifications
 */

/**
 * Check for upcoming payments (within 7 days)
 */
async function checkUpcomingPayments() {
    try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const upcomingPayments = await prisma.contract_payments.findMany({
            where: {
                status: 'PENDING',
                due_date: {
                    gte: new Date(),
                    lte: sevenDaysFromNow,
                },
            },
            include: {
                contracts: {
                    include: {
                        customers: true,
                        apartments: true,
                    },
                },
            },
        });

        console.log(`⏰ Found ${upcomingPayments.length} upcoming payments`);

        // TODO: Send email/SMS notifications
        // For now, just log
        for (const payment of upcomingPayments) {
            const daysUntilDue = Math.ceil(
                (new Date(payment.due_date) - new Date()) / (1000 * 60 * 60 * 24)
            );
            console.log(
                `  - Contract ${payment.contracts.contract_code}: ${daysUntilDue} days until due`
            );
        }

        return upcomingPayments;
    } catch (error) {
        console.error('Error checking upcoming payments:', error);
        return [];
    }
}

/**
 * Check for overdue payments
 */
async function checkOverduePayments() {
    try {
        const overduePayments = await prisma.contract_payments.findMany({
            where: {
                status: 'PENDING',
                due_date: {
                    lt: new Date(),
                },
            },
            include: {
                contracts: {
                    include: {
                        customers: true,
                        apartments: true,
                    },
                },
            },
        });

        console.log(`⚠️  Found ${overduePayments.length} overdue payments`);

        // Update status and calculate late fees
        for (const payment of overduePayments) {
            const lateFee = await calculateLateFee(payment);
            const daysOverdue = Math.floor(
                (new Date() - new Date(payment.due_date)) / (1000 * 60 * 60 * 24)
            );

            await prisma.contract_payments.update({
                where: { id: payment.id },
                data: {
                    status: 'OVERDUE',
                    days_overdue: daysOverdue,
                    late_fee: lateFee,
                },
            });

            console.log(
                `  - Contract ${payment.contracts.contract_code}: ${daysOverdue} days overdue, late fee: ${lateFee}`
            );
        }

        return overduePayments;
    } catch (error) {
        console.error('Error checking overdue payments:', error);
        return [];
    }
}

/**
 * Identify risky contracts (overdue > 30 days)
 */
async function identifyRiskyContracts() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const riskyContracts = await prisma.contracts.findMany({
            where: {
                status: {
                    in: ['SIGNED', 'PAYING'],
                },
                contract_payments: {
                    some: {
                        status: 'OVERDUE',
                        due_date: {
                            lt: thirtyDaysAgo,
                        },
                    },
                },
            },
            include: {
                customers: true,
                apartments: true,
                contract_payments: {
                    where: {
                        status: 'OVERDUE',
                    },
                },
            },
        });

        console.log(`🚨 Found ${riskyContracts.length} risky contracts`);

        for (const contract of riskyContracts) {
            const overdueCount = contract.contract_payments.length;
            console.log(`  - ${contract.contract_code}: ${overdueCount} overdue payments`);
        }

        return riskyContracts;
    } catch (error) {
        console.error('Error identifying risky contracts:', error);
        return [];
    }
}

/**
 * Get alert summary for dashboard
 */
async function getAlertSummary() {
    try {
        const [upcoming, overdue, risky] = await Promise.all([
            checkUpcomingPayments(),
            prisma.contract_payments.count({
                where: { status: 'OVERDUE' },
            }),
            identifyRiskyContracts(),
        ]);

        return {
            upcomingPayments: upcoming.length,
            overduePayments: overdue,
            riskyContracts: risky.length,
            pendingApprovals: await prisma.approval_workflows.count({
                where: { status: 'PENDING' },
            }),
        };
    } catch (error) {
        console.error('Error getting alert summary:', error);
        return {
            upcomingPayments: 0,
            overduePayments: 0,
            riskyContracts: 0,
            pendingApprovals: 0,
        };
    }
}

module.exports = {
    checkUpcomingPayments,
    checkOverduePayments,
    identifyRiskyContracts,
    getAlertSummary,
};

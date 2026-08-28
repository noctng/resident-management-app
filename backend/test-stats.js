const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testStats() {
    try {
        console.log('--- Testing CRM Stats Calculation ---');

        const customerCount = await prisma.customers.count();
        const contractCount = await prisma.contracts.count();
        const payments = await prisma.contract_payments.findMany({
            select: { amount: true, paid_amount: true, status: true },
        });

        console.log('Customer Count:', customerCount);
        console.log('Contract Count:', contractCount);
        console.log('Payments Fetched:', payments.length);

        const totalValue = await prisma.contracts.aggregate({
            _sum: {
                total_value: true,
                vat_amount: true,
                maintenance_fee: true,
            },
        });

        console.log('Total Value Aggregate:', totalValue._sum);

        const totalSales =
            (Number(totalValue._sum.total_value) || 0) +
            (Number(totalValue._sum.vat_amount) || 0) +
            (Number(totalValue._sum.maintenance_fee) || 0);

        let totalPaid = 0;
        let overdueCount = 0;

        payments.forEach((p) => {
            totalPaid += Number(p.paid_amount) || 0;
            if (p.status === 'OVERDUE') overdueCount++;
        });

        const stats = {
            totalCustomers: customerCount,
            totalContracts: contractCount,
            totalSales,
            totalPaid,
            totalRemaining: totalSales - totalPaid,
            overdueCount,
        };

        console.log('Final Calculated Stats:', stats);
    } catch (err) {
        console.error('Error during test:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testStats();

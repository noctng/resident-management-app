const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPaymentData() {
    try {
        console.log('=== Checking Contract Payment Data ===\n');

        const contracts = await prisma.contracts.findMany({
            include: {
                customers: true,
                contract_payments: {
                    orderBy: { installment: 'asc' },
                },
                payment_schedules: {
                    include: {
                        contract_payments: {
                            orderBy: { installment: 'asc' },
                        },
                    },
                },
            },
        });

        for (const contract of contracts) {
            console.log(`\n📋 Contract: ${contract.contract_code}`);
            console.log(`   Customer: ${contract.customers.name}`);
            console.log(`   Status: ${contract.status}`);

            // Check contract_payments directly linked to contract
            const directPayments = contract.contract_payments.filter((p) => !p.payment_schedule_id);
            console.log(`\n   Direct Payments (no schedule): ${directPayments.length}`);
            directPayments.forEach((p) => {
                console.log(
                    `     - Installment ${p.installment}: ${p.description || 'No description'}`
                );
                console.log(
                    `       Due: ${p.due_date.toISOString().split('T')[0]}, Status: ${p.status}`
                );
            });

            // Check payment_schedules
            console.log(`\n   Payment Schedules: ${contract.payment_schedules.length}`);
            contract.payment_schedules.forEach((schedule) => {
                console.log(`     - Schedule: ${schedule.schedule_name || 'Unnamed'}`);
                console.log(`       Policy: ${schedule.policy_type || 'N/A'}`);
                console.log(`       Payments in schedule: ${schedule.contract_payments.length}`);
                schedule.contract_payments.forEach((p) => {
                    console.log(
                        `         * Installment ${p.installment}: ${p.description || 'No description'}`
                    );
                    console.log(
                        `           Due: ${p.due_date.toISOString().split('T')[0]}, Status: ${p.status}`
                    );
                });
            });

            console.log(`\n   Total payments: ${contract.contract_payments.length}`);
            console.log('   ---');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPaymentData();

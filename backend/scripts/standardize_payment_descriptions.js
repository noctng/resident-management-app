const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function standardizePaymentDescriptions() {
    try {
        console.log('🔧 Starting payment description standardization...\n');

        // Get all payments with old format descriptions
        const oldFormatPayments = await prisma.contract_payments.findMany({
            where: {
                description: {
                    contains: 'Đợt ',
                },
            },
            include: {
                contracts: true,
            },
        });

        console.log(`📊 Found ${oldFormatPayments.length} payments with old format\n`);

        let updatedCount = 0;

        for (const payment of oldFormatPayments) {
            const oldDescription = payment.description;
            const newDescription = `Đợt thanh toán thứ ${payment.installment}`;

            // Update the payment
            await prisma.contract_payments.update({
                where: { id: payment.id },
                data: { description: newDescription },
            });

            console.log(`✅ Contract ${payment.contracts.contract_code}:`);
            console.log(`   "${oldDescription}" → "${newDescription}"`);

            updatedCount++;
        }

        console.log(`\n✨ Successfully updated ${updatedCount} payment descriptions!`);

        // Verify the changes
        console.log('\n🔍 Verifying changes...');
        const remainingOldFormat = await prisma.contract_payments.count({
            where: {
                description: {
                    contains: 'Đợt ',
                    NOT: {
                        contains: 'thanh toán',
                    },
                },
            },
        });

        if (remainingOldFormat === 0) {
            console.log('✅ All descriptions have been standardized!');
        } else {
            console.log(`⚠️  Warning: ${remainingOldFormat} old format descriptions still remain`);
        }

        // Show sample of updated data
        console.log('\n📋 Sample of standardized payments:');
        const samples = await prisma.contract_payments.findMany({
            take: 5,
            include: {
                contracts: true,
            },
            orderBy: {
                installment: 'asc',
            },
        });

        samples.forEach((p) => {
            console.log(`   ${p.contracts.contract_code} - ${p.description}`);
        });
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

standardizePaymentDescriptions();

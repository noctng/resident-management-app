const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addEarlyPaymentFields() {
    try {
        console.log('🔧 Adding early payment discount fields...');

        // Add early payment fields to contract_payments
        await prisma.$executeRawUnsafe(`
            ALTER TABLE contract_payments 
            ADD COLUMN IF NOT EXISTS early_payment_discount DECIMAL(15,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS days_early INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS discount_applied BOOLEAN DEFAULT false;
        `);

        console.log('✅ Added early payment fields to contract_payments');

        // Add early payment policy to payment_schedules
        await prisma.$executeRawUnsafe(`
            ALTER TABLE payment_schedules 
            ADD COLUMN IF NOT EXISTS early_payment_enabled BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS early_payment_tiers JSONB DEFAULT '[]'::jsonb;
        `);

        console.log('✅ Added early payment policy to payment_schedules');

        console.log('\n🎉 Early payment discount schema updated!');
    } catch (error) {
        console.error('❌ Error updating schema:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addEarlyPaymentFields();

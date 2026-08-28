const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingColumns() {
    try {
        console.log('🔧 Adding missing columns to database...');

        // Add missing columns to contracts table
        await prisma.$executeRawUnsafe(`
            ALTER TABLE contracts 
            ADD COLUMN IF NOT EXISTS handover_completed BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS handover_date_actual TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS title_deed_issued BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS title_deed_date TIMESTAMPTZ;
        `);

        console.log('✅ Added handover columns to contracts');

        // Add missing columns to contract_payments table
        await prisma.$executeRawUnsafe(`
            ALTER TABLE contract_payments 
            ADD COLUMN IF NOT EXISTS late_fee DECIMAL(15,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS days_overdue INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS auto_calculated BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS payment_schedule_id VARCHAR(255);
        `);

        console.log('✅ Added payment tracking columns to contract_payments');

        // Add index
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_payments_status_due ON contract_payments(status, due_date);
        `);

        console.log('✅ Added index on contract_payments');

        console.log('\n🎉 Database schema updated successfully!');
    } catch (error) {
        console.error('❌ Error updating schema:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addMissingColumns();

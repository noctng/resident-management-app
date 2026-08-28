const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
    try {
        console.log('🚀 Starting CRM Phase 1 migration...');

        const sqlFile = path.join(__dirname, '../migrations/20260124_crm_phase1_core.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Split by semicolon and execute each statement
        const statements = sql
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`Executing statement ${i + 1}/${statements.length}...`);

            try {
                await prisma.$executeRawUnsafe(statement);
                console.log(`✅ Statement ${i + 1} executed successfully`);
            } catch (error) {
                // Some statements might fail if already exist, that's ok
                if (error.message.includes('already exists')) {
                    console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
                } else {
                    console.error(`❌ Error in statement ${i + 1}:`, error.message);
                    throw error;
                }
            }
        }

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();

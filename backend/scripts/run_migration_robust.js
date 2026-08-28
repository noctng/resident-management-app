const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
    try {
        console.log('🚀 Starting CRM Phase 1 migration (Robust Mode)...');

        const sqlFile = path.join(__dirname, '../migrations/20260124_crm_phase1_core.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Better SQL splitting: Split by semicolon but ignore newlines/spaces
        // This is still simple, but might work better than the previous one
        const statements = sql
            .replace(/--.*$/gm, '') // Remove comments
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 5); // Ignore very short strings

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`Executing statement ${i + 1}...`);
            // console.log(statement.substring(0, 50) + '...');

            try {
                await prisma.$executeRawUnsafe(statement);
                console.log(`✅ Success`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`⚠️  Skipped (already exists)`);
                } else if (
                    error.message.includes('does not exist') &&
                    statement.toUpperCase().includes('DROP')
                ) {
                    console.log(`⚠️  Skipped DROP (missing target)`);
                } else {
                    console.error(`❌ Statement Failed:`, error.message);
                    // Don't exit, try next statements (e.g. creating unrelated tables)
                }
            }
        }

        console.log('🏁 Migration process finished.');
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();

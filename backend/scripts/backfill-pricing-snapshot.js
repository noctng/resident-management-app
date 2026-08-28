/**
 * Backfill pricing_snapshot for existing utility_records that don't have one.
 * Run: node scripts/backfill-pricing-snapshot.js
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const PRICING_CONFIG_PATH = path.join(__dirname, '../pricing.json');

async function main() {
    // Load current pricing as the best-guess snapshot for existing records
    const currentPricing = JSON.parse(fs.readFileSync(PRICING_CONFIG_PATH, 'utf-8'));

    // Find all records without a pricing snapshot (use raw query for null JSON check)
    const records = await prisma.$queryRaw`
        SELECT id, apartment_id, month, year FROM utility_records WHERE pricing_snapshot IS NULL
    `;

    console.log(`Found ${records.length} records without pricing snapshot.`);

    if (records.length === 0) {
        console.log('Nothing to backfill.');
        return;
    }

    // Check if there's a pricing_config_history entry closest to each record's date
    const history = await prisma.pricing_config_history.findMany({
        orderBy: { changed_at: 'asc' },
    });

    let updated = 0;

    for (const record of records) {
        // Try to find the pricing config that was active when this record was created
        // Use the last history entry that was changed before or around the record's month
        let snapshotToUse = currentPricing;

        if (history.length > 0) {
            // Build a date from record's month/year (assume 1st of month)
            const recordDate = new Date(record.year, record.month - 1, 1);

            // Find the last history entry changed before this record's month
            const applicableConfig = history
                .filter(h => h.changed_at && new Date(h.changed_at) <= recordDate)
                .pop();

            if (applicableConfig) {
                snapshotToUse = applicableConfig.config_data;
            } else {
                // No history before this record — use the oldest history entry
                snapshotToUse = history[0].config_data;
            }
        }

        await prisma.$executeRaw`
            UPDATE utility_records SET pricing_snapshot = ${JSON.stringify(snapshotToUse)}::jsonb WHERE id = ${record.id}
        `;

        updated++;
    }

    console.log(`Backfilled ${updated} records with pricing snapshot.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

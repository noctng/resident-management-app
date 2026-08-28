/**
 * Migration script to run SQL migrations
 * Usage: node scripts/runMigration.js <migration-file.sql>
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

async function runMigration(migrationFile) {
    const client = await pool.connect();

    try {
        console.log(`\n========================================`);
        console.log(`Running migration: ${migrationFile}`);
        console.log(`========================================\n`);

        // Read SQL file
        const sqlPath = path.join(__dirname, '..', 'migrations', migrationFile);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Run migration
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        console.log(`\n✅ Migration completed successfully!\n`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`\n❌ Migration failed:`, error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('Usage: node scripts/runMigration.js <migration-file.sql>');
    process.exit(1);
}

runMigration(migrationFile);

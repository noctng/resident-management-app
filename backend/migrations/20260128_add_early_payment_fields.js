const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'admin',
    database: process.env.POSTGRES_DB || 'resident_manager',
});

async function migrate() {
    try {
        console.log('Starting Migration: Add Early Payment Fields...');

        // Check if columns exist
        const result = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'contract_payments' 
            AND column_name IN ('early_payment_discount', 'is_early_payment');
        `);

        const existingColumns = result.rows.map((row) => row.column_name);

        if (!existingColumns.includes('early_payment_discount')) {
            console.log('Adding early_payment_discount column...');
            await pool.query(`
                ALTER TABLE contract_payments 
                ADD COLUMN early_payment_discount DECIMAL(5,2) DEFAULT 0
            `);
        } else {
            console.log('early_payment_discount column already exists.');
        }

        if (!existingColumns.includes('is_early_payment')) {
            console.log('Adding is_early_payment column...');
            await pool.query(`
                ALTER TABLE contract_payments 
                ADD COLUMN is_early_payment BOOLEAN DEFAULT FALSE
            `);
        } else {
            console.log('is_early_payment column already exists.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();

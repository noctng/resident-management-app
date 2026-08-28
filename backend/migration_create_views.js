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
        console.log('Starting View Migration for Debt Dashboard...');

        // Create v_apartment_debt_summary
        console.log('Recreating v_apartment_debt_summary...');
        await pool.query('DROP VIEW IF EXISTS v_apartment_debt_summary CASCADE');
        await pool.query(`
            CREATE OR REPLACE VIEW v_apartment_debt_summary AS
            SELECT 
                a.id as apartment_id,
                a.code as apartment_code,
                a.house_type,
                COUNT(CASE WHEN mf.status = 'PENDING' THEN 1 END) as pending_count,
                COUNT(CASE WHEN mf.status = 'OVERDUE' THEN 1 END) as overdue_count,
                COALESCE(SUM(CASE WHEN mf.status IN ('PENDING', 'OVERDUE') THEN mf.total_amount ELSE 0 END), 0) as debt_amount
            FROM 
                apartments a
            LEFT JOIN 
                management_fees mf ON a.id = mf.apartment_id
            GROUP BY 
                a.id, a.code, a.house_type;
        `);

        // Create v_monthly_revenue_summary
        console.log('Recreating v_monthly_revenue_summary...');
        await pool.query('DROP VIEW IF EXISTS v_monthly_revenue_summary CASCADE');
        await pool.query(`
            CREATE OR REPLACE VIEW v_monthly_revenue_summary AS
            SELECT 
                mf.year,
                mf.month,
                COUNT(*) as total_invoices,
                COUNT(CASE WHEN mf.status = 'PAID' THEN 1 END) as paid_count,
                COALESCE(SUM(mf.total_amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN mf.status = 'PAID' THEN mf.total_amount ELSE 0 END), 0) as collected_revenue,
                COALESCE(SUM(CASE WHEN mf.status IN ('PENDING', 'OVERDUE') THEN mf.total_amount ELSE 0 END), 0) as uncollected_revenue,
                CASE 
                    WHEN SUM(mf.total_amount) > 0 THEN 
                        ROUND((SUM(CASE WHEN mf.status = 'PAID' THEN mf.total_amount ELSE 0 END) / SUM(mf.total_amount) * 100), 2) 
                    ELSE 0 
                END as collection_rate
            FROM 
                management_fees mf
            GROUP BY 
                mf.year, mf.month;
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();

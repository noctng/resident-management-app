const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// Debt Dashboard Repository — raw PG query thuần (views + SQL)
module.exports = {
  getApartmentDebtSummary: (limit) =>
    pool.query(
      `SELECT * FROM v_apartment_debt_summary
       ORDER BY debt_amount DESC
       LIMIT $1`,
      [limit]
    ),

  getMonthlyRevenueSummary: (limit) =>
    pool.query(
      `SELECT * FROM v_monthly_revenue_summary
       ORDER BY year DESC, month DESC
       LIMIT $1`,
      [limit]
    ),

  getOverallStats: () =>
    pool.query(`
      SELECT 
        COUNT(DISTINCT apartment_id) as total_apartments,
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_invoices,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as collected_amount,
        SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_amount ELSE 0 END) as debt_amount,
        ROUND(
          (SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END)::NUMERIC / 
          NULLIF(SUM(total_amount), 0) * 100), 2
        ) as collection_rate
      FROM management_fees
    `),

  getTopDebtors: (limit) =>
    pool.query(
      `SELECT 
        apartment_code,
        house_type,
        pending_count,
        overdue_count,
        debt_amount
       FROM v_apartment_debt_summary
       WHERE debt_amount > 0
       ORDER BY debt_amount DESC
       LIMIT $1`,
      [limit]
    ),

  getPaymentTrends: () =>
    pool.query(`
      SELECT 
        year,
        month,
        total_invoices,
        paid_count,
        total_revenue,
        collected_revenue,
        uncollected_revenue,
        collection_rate
      FROM v_monthly_revenue_summary
      ORDER BY year DESC, month DESC
      LIMIT 12
    `),

  getDebtHeatmap: () =>
    pool.query(`
      SELECT 
        a.house_type,
        a.floor,
        COUNT(mf.id) as total_fees,
        SUM(CASE WHEN mf.status IN ('PENDING', 'OVERDUE') THEN 1 ELSE 0 END) as unpaid_count,
        SUM(CASE WHEN mf.status IN ('PENDING', 'OVERDUE') THEN mf.total_amount ELSE 0 END) as debt_amount
      FROM apartments a
      LEFT JOIN management_fees mf ON a.id = mf.apartment_id
      GROUP BY a.house_type, a.floor
      ORDER BY a.house_type, a.floor
    `),

  getRecentPayments: (limit) =>
    pool.query(
      `SELECT 
        mf.id,
        a.code as apartment_code,
        mf.month,
        mf.year,
        mf.total_amount,
        mf.payment_date,
        mf.payment_method,
        mf.updated_at
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      WHERE mf.status = 'PAID'
        AND mf.payment_date IS NOT NULL
      ORDER BY mf.payment_date DESC
      LIMIT $1`,
      [limit]
    ),
};

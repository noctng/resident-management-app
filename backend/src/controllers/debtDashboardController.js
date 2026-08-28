const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

/**
 * Get apartment debt summary using the view
 */
const getApartmentDebtSummary = async (req, res) => {
    try {
        const { limit = 100 } = req.query;

        const result = await pool.query(
            `SELECT * FROM v_apartment_debt_summary
       ORDER BY debt_amount DESC
       LIMIT $1`,
            [limit]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting apartment debt summary:', error);
        res.status(500).json({ error: 'Failed to get apartment debt summary' });
    }
};

/**
 * Get monthly revenue summary using the view
 */
const getMonthlyRevenueSummary = async (req, res) => {
    try {
        const { limit = 12 } = req.query;

        const result = await pool.query(
            `SELECT * FROM v_monthly_revenue_summary
       ORDER BY year DESC, month DESC
       LIMIT $1`,
            [limit]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting monthly revenue summary:', error);
        res.status(500).json({ error: 'Failed to get monthly revenue summary' });
    }
};

/**
 * Get overall statistics
 */
const getOverallStats = async (req, res) => {
    try {
        const stats = await pool.query(`
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
    `);

        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Error getting overall stats:', error);
        res.status(500).json({ error: 'Failed to get overall stats' });
    }
};

/**
 * Get top debtors (apartments with highest debt)
 */
const getTopDebtors = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const result = await pool.query(
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
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting top debtors:', error);
        res.status(500).json({ error: 'Failed to get top debtors' });
    }
};

/**
 * Get payment trends (last 12 months)
 */
const getPaymentTrends = async (req, res) => {
    try {
        const result = await pool.query(`
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
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting payment trends:', error);
        res.status(500).json({ error: 'Failed to get payment trends' });
    }
};

/**
 * Get debt heatmap data (by building and floor)
 */
const getDebtHeatmap = async (req, res) => {
    try {
        const result = await pool.query(`
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
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting debt heatmap:', error);
        res.status(500).json({ error: 'Failed to get debt heatmap' });
    }
};

/**
 * Get recent payment activities
 */
const getRecentPayments = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const result = await pool.query(
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
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting recent payments:', error);
        res.status(500).json({ error: 'Failed to get recent payments' });
    }
};

module.exports = {
    getApartmentDebtSummary,
    getMonthlyRevenueSummary,
    getOverallStats,
    getTopDebtors,
    getPaymentTrends,
    getDebtHeatmap,
    getRecentPayments,
};

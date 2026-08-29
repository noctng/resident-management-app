/**
 * debtReminderRepository — CHỈ chứa truy vấn DB (raw SQL qua pg Pool).
 *
 * GHI CHÚ: module debtReminder dùng `pg` Pool (raw SQL) — giống feeConfig.
 * Giữ nguyên raw SQL tuyệt đối để bảo toàn response shape (pg trả plain rows,
 * Decimal dạng string). Không đổi schema/column.
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

const FEE_SELECT = `
  mf.*,
  a.code as apartment_code,
  a.house_type,
  o.resident_id,
  r.name as resident_name,
  r.email as resident_email
`;

async function findFeeById(feeId) {
    const result = await pool.query(
        `SELECT ${FEE_SELECT}
       FROM management_fees mf
       JOIN apartments a ON mf.apartment_id = a.id
       LEFT JOIN occupancies o ON a.id = o.apartment_id
       LEFT JOIN residents r ON o.resident_id = r.id AND r.is_active = true
       WHERE mf.id = $1
       LIMIT 1`,
        [feeId]
    );
    return result.rows[0] || null;
}

async function findPendingFees({ month, year, statusFilter } = {}) {
    let query = `
      SELECT DISTINCT ON (mf.id)
        mf.*,
        a.code as apartment_code,
        r.name as resident_name,
        r.email as resident_email
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      LEFT JOIN occupancies o ON a.id = o.apartment_id
      LEFT JOIN residents r ON o.resident_id = r.id AND r.is_active = true
      WHERE mf.status IN ('PENDING', 'OVERDUE')
        AND r.email IS NOT NULL
    `;
    const params = [];
    let paramIndex = 1;

    if (month) {
        query += ` AND mf.month = $${paramIndex++}`;
        params.push(month);
    }

    if (year) {
        query += ` AND mf.year = $${paramIndex++}`;
        params.push(year);
    }

    if (statusFilter) {
        query += ` AND mf.status = $${paramIndex++}`;
        params.push(statusFilter);
    }

    const result = await pool.query(query, params);
    return result.rows;
}

async function logActivity({ id, userId, username, targetId, targetName, details }) {
    await pool.query(
        `INSERT INTO activity_logs (id, user_id, username, action, target_type, target_id, target_name, details, created_at)
       VALUES ($1, $2, $3, 'OTHER', 'MANAGEMENT_FEE', $4, $5, $6, CURRENT_TIMESTAMP)`,
        [id, userId, username, targetId, targetName, details]
    );
}

async function logBulkActivity({ id, userId, username, details }) {
    await pool.query(
        `INSERT INTO activity_logs (id, user_id, username, action, target_type, details, created_at)
       VALUES ($1, $2, $3, 'OTHER', 'MANAGEMENT_FEE', $4, CURRENT_TIMESTAMP)`,
        [id, userId, username, details]
    );
}

async function getEmailHistory({ limit, offset }) {
    const result = await pool.query(
        `SELECT *
       FROM activity_logs
       WHERE target_type = 'MANAGEMENT_FEE'
         AND details LIKE '%email%'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows;
}

async function countEmailHistory() {
    const result = await pool.query(
        `SELECT COUNT(*) as total
       FROM activity_logs
       WHERE target_type = 'MANAGEMENT_FEE'
         AND details LIKE '%email%'`
    );
    return parseInt(result.rows[0].total);
}

module.exports = {
    pool,
    findFeeById,
    findPendingFees,
    logActivity,
    logBulkActivity,
    getEmailHistory,
    countEmailHistory,
};

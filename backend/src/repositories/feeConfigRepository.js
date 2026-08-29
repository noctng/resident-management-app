/**
 * feeConfigRepository — CHỈ chứa truy vấn DB (raw SQL qua pg Pool).
 *
 * GHI CHÚ: module feeConfig dùng `pg` Pool (raw SQL) chứ không dùng Prisma như các
 * module khác. Giữ nguyên raw SQL để bảo toàn TUYỆT ĐỐI response shape
 * (pg trả plain rows, Decimal dạng string). Không đổi schema/column.
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

async function findCurrent() {
    const result = await pool.query(
        'SELECT * FROM fee_config ORDER BY effective_from DESC LIMIT 1'
    );
    return result.rows[0] || null;
}

async function findHistory() {
    const result = await pool.query(
        `SELECT fc.*, u.username as created_by_username
       FROM fee_config fc
       LEFT JOIN users u ON fc.created_by = u.id
       ORDER BY fc.effective_from DESC`
    );
    return result.rows;
}

async function findEffectiveAt(date) {
    const result = await pool.query(
        `SELECT * FROM fee_config 
       WHERE effective_from <= $1 
       ORDER BY effective_from DESC 
       LIMIT 1`,
        [date]
    );
    return result.rows[0] || null;
}

async function create(values) {
    const result = await pool.query(
        `INSERT INTO fee_config (
        management_fee_per_sqm,
        internet_fee,
        cable_tv_fee,
        parking_car_fee,
        parking_motorbike_fee,
        security_fee,
        cleaning_fee,
        effective_from,
        created_by,
        enabled_fees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
        values
    );
    return result.rows[0];
}

async function logActivity({ id, userId, username, details }) {
    await pool.query(
        `INSERT INTO activity_logs (id, user_id, username, action, target_type, details, created_at)
       VALUES ($1, $2, $3, 'UPDATE', 'FEE_CONFIG', $4, CURRENT_TIMESTAMP)`,
        [id, userId, username, details]
    );
}

module.exports = {
    pool,
    findCurrent,
    findHistory,
    findEffectiveAt,
    create,
    logActivity,
};

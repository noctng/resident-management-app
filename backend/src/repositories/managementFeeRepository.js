/**
 * managementFeeRepository — CHỈ chứa truy vấn DB (raw SQL qua pg Pool).
 *
 * GHI CHÚ: module managementFee dùng `pg` Pool (raw SQL) giống feeConfig, KHÔNG dùng
 * Prisma. Giữ nguyên raw SQL để bảo toàn TUYỆT ĐỐI response shape (pg trả plain rows,
 * Decimal dạng string). Không đổi schema/column. Mọi nghiệp vụ nằm ở service.
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

/** Generate management fee ID (mirrors cũ: fee_<ts>_<rand>) */
function generateFeeId() {
    return `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Lấy diện tích căn hộ (cho tính phí) */
async function getApartmentArea(apartmentId) {
    const r = await pool.query('SELECT area FROM apartments WHERE id = $1', [apartmentId]);
    if (r.rows.length === 0) return null;
    return parseFloat(r.rows[0].area);
}

/** Lấy mã căn hộ (cho activity log) */
async function getApartmentCode(apartmentId) {
    const r = await pool.query('SELECT code FROM apartments WHERE id = $1', [apartmentId]);
    return r.rows[0]?.code || null;
}

/** Kiểm tra phí đã tồn tại cho căn hộ + tháng + năm */
async function findExisting(apartmentId, month, year) {
    const r = await pool.query(
        'SELECT id FROM management_fees WHERE apartment_id = $1 AND month = $2 AND year = $3',
        [apartmentId, month, year]
    );
    return r.rows[0] || null;
}

/** Lấy toàn bộ căn hộ (cho bulk generate) */
async function getAllApartments() {
    const r = await pool.query('SELECT id, code, area FROM apartments');
    return r.rows;
}

/** Insert 1 fee (single generate) — 19 cột có note */
async function insertFee(values) {
    const r = await pool.query(
        `INSERT INTO management_fees (
        id, apartment_id, month, year,
        area, management_fee_per_sqm, management_fee,
        internet_fee, cable_tv_fee, security_fee, cleaning_fee,
        parking_car_quantity, parking_car_fee,
        parking_motorbike_quantity, parking_motorbike_fee,
        total_amount, status, note, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
        values
    );
    return r.rows[0];
}

/** Insert 1 fee (bulk generate) — 18 cột, không note */
async function insertFeeBulk(values) {
    const r = await pool.query(
        `INSERT INTO management_fees (
        id, apartment_id, month, year,
        area, management_fee_per_sqm, management_fee,
        internet_fee, cable_tv_fee, security_fee, cleaning_fee,
        parking_car_quantity, parking_car_fee,
        parking_motorbike_quantity, parking_motorbike_fee,
        total_amount, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
        values
    );
    return r.rows[0];
}

/** List fees có filter + phân trang (trả đúng shape {data, pagination}) */
async function listFees({ month, year, status, apartment_code, page = 1, limit = 50 }) {
    let query = `
      SELECT
        mf.*,
        a.code as apartment_code,
        a.house_type,
        a.floor
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      WHERE 1=1
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
    if (status) {
        query += ` AND mf.status = $${paramIndex++}`;
        params.push(status);
    }
    if (apartment_code) {
        query += ` AND a.code ILIKE $${paramIndex++}`;
        params.push(`%${apartment_code}%`);
    }

    query += ' ORDER BY mf.year DESC, mf.month DESC, a.code';

    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      WHERE 1=1
    `;
    const countParams = [];
    let countIndex = 1;
    if (month) {
        countQuery += ` AND mf.month = $${countIndex++}`;
        countParams.push(month);
    }
    if (year) {
        countQuery += ` AND mf.year = $${countIndex++}`;
        countParams.push(year);
    }
    if (status) {
        countQuery += ` AND mf.status = $${countIndex++}`;
        countParams.push(status);
    }
    if (apartment_code) {
        countQuery += ` AND a.code ILIKE $${countIndex++}`;
        countParams.push(`%${apartment_code}%`);
    }

    const countResult = await pool.query(countQuery, countParams);

    return {
        data: result.rows,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].total),
            totalPages: Math.ceil(countResult.rows[0].total / limit),
        },
    };
}

/** Lấy 1 fee kèm thông tin căn hộ + người tạo (cho getById & delete) */
async function getFeeById(id) {
    const r = await pool.query(
        `SELECT
        mf.*,
        a.code as apartment_code,
        a.house_type,
        a.floor,
        u.username as created_by_username
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      LEFT JOIN users u ON mf.created_by = u.id
      WHERE mf.id = $1`,
        [id]
    );
    return r.rows[0] || null;
}

/** Cập nhật trạng thái thanh toán */
async function updatePaymentStatus(id, { status, payment_method, payment_date, note }) {
    const r = await pool.query(
        `UPDATE management_fees
       SET status = $1,
           payment_method = $2,
           payment_date = $3,
           note = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
        [status, payment_method || null, payment_date || null, note || null, id]
    );
    return r.rows[0] || null;
}

/** Xóa fee */
async function remove(id) {
    await pool.query('DELETE FROM management_fees WHERE id = $1', [id]);
}

/** Thống kê tổng hợp theo tháng/năm */
async function getSummary(month, year) {
    const r = await pool.query(
        `SELECT
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_amount ELSE 0 END) as debt_amount,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count
      FROM management_fees
      WHERE month = $1 AND year = $2`,
        [month, year]
    );
    return r.rows[0];
}

/** Lấy fee kèm thông tin căn hộ + cư dân (cho export PDF) */
async function getFeeForPdf(id) {
    const r = await pool.query(
        `SELECT
                mf.*,
                a.code as apartment_code,
                a.house_type,
                a.floor,
                r.name as resident_name
            FROM management_fees mf
            JOIN apartments a ON mf.apartment_id = a.id
            LEFT JOIN occupancies o ON a.id = o.apartment_id
            LEFT JOIN residents r ON o.resident_id = r.id AND r.is_active = true
            WHERE mf.id = $1
            LIMIT 1`,
        [id]
    );
    return r.rows[0] || null;
}

/** Ghi activity log (target_id/target_name tùy chọn) */
async function logActivity({ id, userId, username, action, targetType, targetId, targetName, details }) {
    const cols = ['id', 'user_id', 'username', 'action', 'target_type', 'details', 'created_at'];
    const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', 'CURRENT_TIMESTAMP'];
    const params = [id, userId, username, action, targetType, details];
    let idx = 7;
    if (targetId !== undefined) {
        cols.push('target_id');
        placeholders.push(`$${idx++}`);
        params.push(targetId);
    }
    if (targetName !== undefined) {
        cols.push('target_name');
        placeholders.push(`$${idx++}`);
        params.push(targetName);
    }
    const sql = `INSERT INTO activity_logs (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await pool.query(sql, params);
}

module.exports = {
    pool,
    generateFeeId,
    getApartmentArea,
    getApartmentCode,
    findExisting,
    getAllApartments,
    insertFee,
    insertFeeBulk,
    listFees,
    getFeeById,
    updatePaymentStatus,
    remove,
    getSummary,
    getFeeForPdf,
    logActivity,
};

const { Pool } = require('pg');
const { sendEmail } = require('../services/emailService');
const { generateDebtReminderEmail } = require('../templates/debtReminderEmail');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

/**
 * Send debt reminder email for a specific management fee
 */
exports.sendDebtReminder = async (req, res) => {
    const { feeId } = req.params;
    const userId = req.user.id;

    try {
        // Get fee details with apartment and resident info
        const feeResult = await pool.query(
            `SELECT 
        mf.*,
        a.code as apartment_code,
        a.house_type,
        o.resident_id,
        r.name as resident_name,
        r.email as resident_email
      FROM management_fees mf
      JOIN apartments a ON mf.apartment_id = a.id
      LEFT JOIN occupancies o ON a.id = o.apartment_id
      LEFT JOIN residents r ON o.resident_id = r.id AND r.is_active = true
      WHERE mf.id = $1
      LIMIT 1`,
            [feeId]
        );

        if (feeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Management fee not found' });
        }

        const fee = feeResult.rows[0];

        // Check if resident has email
        if (!fee.resident_email) {
            return res.status(400).json({
                error: 'Resident email not found. Please update resident contact information.',
            });
        }

        // Calculate days overdue
        const currentDate = new Date();
        const dueDate = new Date(fee.year, fee.month - 1, 15); // Assuming due on 15th of month
        const daysOverdue = Math.max(
            0,
            Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24))
        );

        // Prepare fee breakdown
        const fees = [];

        if (Number(fee.management_fee) > 0) {
            fees.push({ name: `Phí Quản Lý (${fee.area} m²)`, amount: Number(fee.management_fee) });
        }
        if (Number(fee.internet_fee) > 0) {
            fees.push({ name: 'Phí Internet', amount: Number(fee.internet_fee) });
        }
        if (Number(fee.cable_tv_fee) > 0) {
            fees.push({ name: 'Phí Truyền Hình', amount: Number(fee.cable_tv_fee) });
        }
        if (Number(fee.security_fee) > 0) {
            fees.push({ name: 'Phí Bảo Vệ', amount: Number(fee.security_fee) });
        }
        if (Number(fee.cleaning_fee) > 0) {
            fees.push({ name: 'Phí Vệ Sinh', amount: Number(fee.cleaning_fee) });
        }
        if (Number(fee.parking_car_fee) > 0) {
            fees.push({
                name: `Phí Gửi Xe Ô Tô (${fee.parking_car_quantity} xe)`,
                amount: Number(fee.parking_car_fee),
            });
        }
        if (Number(fee.parking_motorbike_fee) > 0) {
            fees.push({
                name: `Phí Gửi Xe Máy (${fee.parking_motorbike_quantity} xe)`,
                amount: Number(fee.parking_motorbike_fee),
            });
        }

        // Generate email HTML
        const emailHTML = generateDebtReminderEmail({
            apartmentCode: fee.apartment_code,
            residentName: fee.resident_name,
            month: fee.month,
            year: fee.year,
            totalAmount: Number(fee.total_amount),
            dueDate: dueDate.toLocaleDateString('vi-VN'),
            fees,
            daysOverdue,
        });

        // Send email
        const emailSubject =
            daysOverdue > 0
                ? `[QUÁ HẠN] Nhắc Nhở Thanh Toán Phí Quản Lý - ${fee.apartment_code} - Tháng ${fee.month}/${fee.year}`
                : `[NHẮC NHỞ] Phí Quản Lý Sắp Đến Hạn - ${fee.apartment_code} - Tháng ${fee.month}/${fee.year}`;

        const result = await sendEmail(fee.resident_email, emailSubject, emailHTML);

        // Log the email sent
        await pool.query(
            `INSERT INTO activity_logs (id, user_id, username, action, target_type, target_id, target_name, details, created_at)
       VALUES ($1, $2, $3, 'OTHER', 'MANAGEMENT_FEE', $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
                `log_${Date.now()}`,
                userId,
                req.user.username,
                feeId,
                `${fee.apartment_code} - ${fee.month}/${fee.year}`,
                `Sent debt reminder email to ${fee.resident_email}`,
            ]
        );

        res.json({
            success: true,
            message: 'Debt reminder email sent successfully',
            recipient: fee.resident_email,
            mock: result.mock || false,
        });
    } catch (error) {
        console.error('Error sending debt reminder:', error);
        res.status(500).json({ error: 'Failed to send debt reminder email' });
    }
};

/**
 * Send bulk debt reminder emails for all pending/overdue fees
 */
exports.sendBulkDebtReminders = async (req, res) => {
    const { month, year, statusFilter } = req.body;
    const userId = req.user.id;

    try {
        // Get all pending/overdue fees with resident emails
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

        const feesResult = await pool.query(query, params);
        const fees = feesResult.rows;

        const results = {
            success: [],
            failed: [],
            skipped: [],
        };

        for (const fee of fees) {
            try {
                if (!fee.resident_email) {
                    results.skipped.push({
                        apartment_code: fee.apartment_code,
                        reason: 'No email address',
                    });
                    continue;
                }

                // Calculate days overdue
                const currentDate = new Date();
                const dueDate = new Date(fee.year, fee.month - 1, 15);
                const daysOverdue = Math.max(
                    0,
                    Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24))
                );

                // Prepare fee breakdown
                const feeBreakdown = [];
                if (Number(fee.management_fee) > 0)
                    feeBreakdown.push({
                        name: `Phí Quản Lý (${fee.area} m²)`,
                        amount: Number(fee.management_fee),
                    });
                if (Number(fee.internet_fee) > 0)
                    feeBreakdown.push({ name: 'Phí Internet', amount: Number(fee.internet_fee) });
                if (Number(fee.cable_tv_fee) > 0)
                    feeBreakdown.push({
                        name: 'Phí Truyền Hình',
                        amount: Number(fee.cable_tv_fee),
                    });
                if (Number(fee.security_fee) > 0)
                    feeBreakdown.push({ name: 'Phí Bảo Vệ', amount: Number(fee.security_fee) });
                if (Number(fee.cleaning_fee) > 0)
                    feeBreakdown.push({ name: 'Phí Vệ Sinh', amount: Number(fee.cleaning_fee) });
                if (Number(fee.parking_car_fee) > 0)
                    feeBreakdown.push({
                        name: `Phí Gửi Xe Ô Tô`,
                        amount: Number(fee.parking_car_fee),
                    });
                if (Number(fee.parking_motorbike_fee) > 0)
                    feeBreakdown.push({
                        name: `Phí Gửi Xe Máy`,
                        amount: Number(fee.parking_motorbike_fee),
                    });

                const emailHTML = generateDebtReminderEmail({
                    apartmentCode: fee.apartment_code,
                    residentName: fee.resident_name,
                    month: fee.month,
                    year: fee.year,
                    totalAmount: Number(fee.total_amount),
                    dueDate: dueDate.toLocaleDateString('vi-VN'),
                    fees: feeBreakdown,
                    daysOverdue,
                });

                const emailSubject =
                    daysOverdue > 0
                        ? `[QUÁ HẠN] Nhắc Nhở Thanh Toán Phí Quản Lý - ${fee.apartment_code}`
                        : `[NHẮC NHỞ] Phí Quản Lý Sắp Đến Hạn - ${fee.apartment_code}`;

                await sendEmail(fee.resident_email, emailSubject, emailHTML);

                results.success.push({
                    apartment_code: fee.apartment_code,
                    recipient: fee.resident_email,
                });
            } catch (error) {
                results.failed.push({
                    apartment_code: fee.apartment_code,
                    error: error.message,
                });
            }
        }

        // Log bulk email activity
        await pool.query(
            `INSERT INTO activity_logs (id, user_id, username, action, target_type, details, created_at)
       VALUES ($1, $2, $3, 'OTHER', 'MANAGEMENT_FEE', $4, CURRENT_TIMESTAMP)`,
            [
                `log_${Date.now()}`,
                userId,
                req.user.username,
                `Sent bulk debt reminder emails: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`,
            ]
        );

        res.json({
            success: true,
            results,
        });
    } catch (error) {
        console.error('Error sending bulk reminders:', error);
        res.status(500).json({ error: 'Failed to send bulk debt reminders' });
    }
};

/**
 * Get email sending history
 */
exports.getEmailHistory = async (req, res) => {
    const { page = 1, limit = 50 } = req.query;

    try {
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT *
       FROM activity_logs
       WHERE target_type = 'MANAGEMENT_FEE'
         AND details LIKE '%email%'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const countResult = await pool.query(
            `SELECT COUNT(*) as total
       FROM activity_logs
       WHERE target_type = 'MANAGEMENT_FEE'
         AND details LIKE '%email%'`
        );

        res.json({
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
                totalPages: Math.ceil(countResult.rows[0].total / limit),
            },
        });
    } catch (error) {
        console.error('Error getting email history:', error);
        res.status(500).json({ error: 'Failed to get email history' });
    }
};

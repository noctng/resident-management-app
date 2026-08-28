const cron = require('node-cron');
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
 * Auto send debt reminders for overdue fees
 * Runs every day at 9:00 AM
 */
const scheduleDebtReminders = () => {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('[Cron] Running automated debt reminder job...');

        try {
            // Get all overdue fees with resident emails
            const feesResult = await pool.query(
                `SELECT DISTINCT ON (mf.id)
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
        ORDER BY mf.id`
            );

            const fees = feesResult.rows;
            let successCount = 0;
            let failedCount = 0;

            for (const fee of fees) {
                try {
                    // Calculate days overdue
                    const currentDate = new Date();
                    const dueDate = new Date(fee.year, fee.month - 1, 15); // Due on 15th
                    const daysOverdue = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));

                    // Only send if overdue (skip upcoming fees in auto mode)
                    if (daysOverdue <= 0) continue;

                    // Build fee breakdown
                    const feeBreakdown = [];
                    if (Number(fee.management_fee) > 0)
                        feeBreakdown.push({
                            name: `Phí Quản Lý (${fee.area} m²)`,
                            amount: Number(fee.management_fee),
                        });
                    if (Number(fee.internet_fee) > 0)
                        feeBreakdown.push({
                            name: 'Phí Internet',
                            amount: Number(fee.internet_fee),
                        });
                    if (Number(fee.cable_tv_fee) > 0)
                        feeBreakdown.push({
                            name: 'Phí Truyền Hình',
                            amount: Number(fee.cable_tv_fee),
                        });
                    if (Number(fee.security_fee) > 0)
                        feeBreakdown.push({ name: 'Phí Bảo Vệ', amount: Number(fee.security_fee) });
                    if (Number(fee.cleaning_fee) > 0)
                        feeBreakdown.push({
                            name: 'Phí Vệ Sinh',
                            amount: Number(fee.cleaning_fee),
                        });
                    if (Number(fee.parking_car_fee) > 0)
                        feeBreakdown.push({
                            name: 'Phí Gửi Xe Ô Tô',
                            amount: Number(fee.parking_car_fee),
                        });
                    if (Number(fee.parking_motorbike_fee) > 0)
                        feeBreakdown.push({
                            name: 'Phí Gửi Xe Máy',
                            amount: Number(fee.parking_motorbike_fee),
                        });

                    // Generate email
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

                    const emailSubject = `[QUÁ HẠN ${daysOverdue} NGÀY] Nhắc Nhở Thanh Toán Phí Quản Lý - ${fee.apartment_code}`;

                    // Send email
                    await sendEmail(fee.resident_email, emailSubject, emailHTML);

                    // Update status to OVERDUE if still PENDING
                    if (fee.status === 'PENDING') {
                        await pool.query('UPDATE management_fees SET status = $1 WHERE id = $2', [
                            'OVERDUE',
                            fee.id,
                        ]);
                    }

                    successCount++;
                    console.log(
                        `[Cron] Sent reminder to ${fee.resident_email} for ${fee.apartment_code}`
                    );
                } catch (error) {
                    failedCount++;
                    console.error(
                        `[Cron] Failed to send reminder for ${fee.apartment_code}:`,
                        error.message
                    );
                }
            }

            // Log cron job execution
            await pool.query(
                `INSERT INTO activity_logs (id, user_id, username, action, target_type, details, created_at)
         VALUES ($1, 'SYSTEM', 'CRON_JOB', 'OTHER', 'MANAGEMENT_FEE', $2, CURRENT_TIMESTAMP)`,
                [
                    `log_${Date.now()}`,
                    `Automated debt reminder: ${successCount} sent, ${failedCount} failed`,
                ]
            );

            console.log(
                `[Cron] Debt reminder job completed: ${successCount} sent, ${failedCount} failed`
            );
        } catch (error) {
            console.error('[Cron] Error in debt reminder job:', error);
        }
    });

    console.log('[Cron] Debt reminder job scheduled: Every day at 9:00 AM');
};

/**
 * Schedule to update fee status from PENDING to OVERDUE after due date
 * Runs every day at midnight
 */
const scheduleStatusUpdate = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Running fee status update job...');

        try {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            const today = currentDate.getDate();

            // If today is past the 15th, mark this month's pending fees as overdue
            if (today > 15) {
                const result = await pool.query(
                    `UPDATE management_fees
           SET status = 'OVERDUE', updated_at = CURRENT_TIMESTAMP
           WHERE status = 'PENDING'
             AND year = $1
             AND month = $2
           RETURNING id`,
                    [currentYear, currentMonth]
                );

                console.log(`[Cron] Updated ${result.rowCount} fees to OVERDUE status`);

                // Log the update
                if (result.rowCount > 0) {
                    await pool.query(
                        `INSERT INTO activity_logs (id, user_id, username, action, target_type, details, created_at)
             VALUES ($1, 'SYSTEM', 'CRON_JOB', 'UPDATE', 'MANAGEMENT_FEE', $2, CURRENT_TIMESTAMP)`,
                        [
                            `log_${Date.now()}`,
                            `Auto-updated ${result.rowCount} fees to OVERDUE status for ${currentMonth}/${currentYear}`,
                        ]
                    );
                }
            }
        } catch (error) {
            console.error('[Cron] Error in status update job:', error);
        }
    });

    console.log('[Cron] Fee status update job scheduled: Every day at midnight');
};

module.exports = {
    scheduleDebtReminders,
    scheduleStatusUpdate,
};

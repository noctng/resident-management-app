/**
 * debtReminderService — nghiệp vụ nhắc nợ. Không truy cập DB trực tiếp (gọi repo),
 * không gửi email trực tiếp (gọi emailService.sendEmail và template qua OBJECT để
 * test có thể `vi.spyOn` được — KHÔNG destructure).
 */
const repo = require('../repositories/debtReminderRepository');
const emailService = require('../services/emailService');
const debtReminderEmail = require('../templates/debtReminderEmail');

function httpError(message, status) {
    const e = new Error(message);
    e.status = status;
    return e;
}

const DUE_DAY = 15;

function computeDueDate(fee) {
    return new Date(fee.year, fee.month - 1, DUE_DAY);
}

function computeDaysOverdue(dueDate, currentDate = new Date()) {
    return Math.max(0, Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24)));
}

function buildFeeBreakdown(fee) {
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

    return fees;
}

function buildEmail(fee) {
    const dueDate = computeDueDate(fee);
    const daysOverdue = computeDaysOverdue(dueDate);
    const fees = buildFeeBreakdown(fee);

    const emailHTML = debtReminderEmail.generateDebtReminderEmail({
        apartmentCode: fee.apartment_code,
        residentName: fee.resident_name,
        month: fee.month,
        year: fee.year,
        totalAmount: Number(fee.total_amount),
        dueDate: dueDate.toLocaleDateString('vi-VN'),
        fees,
        daysOverdue,
    });

    const emailSubject =
        daysOverdue > 0
            ? `[QUÁ HẠN] Nhắc Nhở Thanh Toán Phí Quản Lý - ${fee.apartment_code} - Tháng ${fee.month}/${fee.year}`
            : `[NHẮC NHỞ] Phí Quản Lý Sắp Đến Hạn - ${fee.apartment_code} - Tháng ${fee.month}/${fee.year}`;

    return { emailHTML, emailSubject, daysOverdue };
}

async function sendDebtReminder(feeId, user) {
    const fee = await repo.findFeeById(feeId);
    if (!fee) throw httpError('Management fee not found', 404);

    if (!fee.resident_email) {
        throw httpError(
            'Resident email not found. Please update resident contact information.',
            400
        );
    }

    const { emailHTML, emailSubject } = buildEmail(fee);

    const result = await emailService.sendEmail(fee.resident_email, emailSubject, emailHTML);

    await repo.logActivity({
        id: `log_${Date.now()}`,
        userId: user.id,
        username: user.username,
        targetId: feeId,
        targetName: `${fee.apartment_code} - ${fee.month}/${fee.year}`,
        details: `Sent debt reminder email to ${fee.resident_email}`,
    });

    return {
        success: true,
        message: 'Debt reminder email sent successfully',
        recipient: fee.resident_email,
        mock: result.mock || false,
    };
}

async function sendBulkDebtReminders({ month, year, statusFilter } = {}, user) {
    const fees = await repo.findPendingFees({ month, year, statusFilter });

    const results = { success: [], failed: [], skipped: [] };

    for (const fee of fees) {
        try {
            if (!fee.resident_email) {
                results.skipped.push({
                    apartment_code: fee.apartment_code,
                    reason: 'No email address',
                });
                continue;
            }

            const { emailHTML, emailSubject } = buildEmail(fee);

            await emailService.sendEmail(fee.resident_email, emailSubject, emailHTML);

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

    await repo.logBulkActivity({
        id: `log_${Date.now()}`,
        userId: user.id,
        username: user.username,
        details: `Sent bulk debt reminder emails: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`,
    });

    return { success: true, results };
}

async function getEmailHistory({ page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;

    const data = await repo.getEmailHistory({ limit, offset });
    const total = await repo.countEmailHistory();

    return {
        data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

module.exports = {
    sendDebtReminder,
    sendBulkDebtReminders,
    getEmailHistory,
};

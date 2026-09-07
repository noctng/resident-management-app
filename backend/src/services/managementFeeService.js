/**
 * managementFeeService — nghiệp vụ phí quản lý.
 * KHÔNG truy cập DB trực tiếp: gọi managementFeeRepository (raw SQL pg).
 * Cross-module: dùng feeConfigRepository (cấu hình phí) & notificationService (push/email).
 */
const repo = require('../repositories/managementFeeRepository');
const feeConfigRepo = require('../repositories/feeConfigRepository');
const notificationService = require('../services/notificationService');

function httpError(message, status) {
    const e = new Error(message);
    e.status = status;
    return e;
}

/**
 * Hàm tính phí THUẦN (không DB). area lấy từ repo trước khi gọi.
 * Giữ nguyên công thức gốc của calculateManagementFee.
 */
function calculateFeeBreakdown(area, config, extraData = {}) {
    const managementFee = area * parseFloat(config.management_fee_per_sqm);

    const enabled = config.enabled_fees || {};
    const isEnabled = (key) => enabled[key] !== false; // Default true nếu thiếu

    const parkingCarQty = isEnabled('parking_car') ? extraData.parking_car_quantity || 0 : 0;
    const parkingMotorbikeQty = isEnabled('parking_motorbike')
        ? extraData.parking_motorbike_quantity || 0
        : 0;

    const parkingCarFee = parkingCarQty * parseFloat(config.parking_car_fee);
    const parkingMotorbikeFee = parkingMotorbikeQty * parseFloat(config.parking_motorbike_fee);

    const internetFee =
        isEnabled('internet') && extraData.has_internet ? parseFloat(config.internet_fee) : 0;
    const cableTvFee =
        isEnabled('cable_tv') && extraData.has_cable_tv ? parseFloat(config.cable_tv_fee) : 0;
    const securityFee =
        isEnabled('security') && extraData.has_security !== false
            ? parseFloat(config.security_fee)
            : 0;
    const cleaningFee =
        isEnabled('cleaning') && extraData.has_cleaning !== false
            ? parseFloat(config.cleaning_fee)
            : 0;

    const managementFeeAmount = isEnabled('management') ? managementFee : 0;

    const totalAmount =
        managementFeeAmount +
        internetFee +
        cableTvFee +
        securityFee +
        cleaningFee +
        parkingCarFee +
        parkingMotorbikeFee;

    return {
        area,
        management_fee_per_sqm: config.management_fee_per_sqm,
        management_fee: managementFee,
        internet_fee: internetFee,
        cable_tv_fee: cableTvFee,
        security_fee: securityFee,
        cleaning_fee: cleaningFee,
        parking_car_quantity: parkingCarQty,
        parking_car_fee: parkingCarFee,
        parking_motorbike_quantity: parkingMotorbikeQty,
        parking_motorbike_fee: parkingMotorbikeFee,
        total_amount: totalAmount,
    };
}

/** Tạo 1 phí quản lý cho căn hộ */
async function generateFee(input, user) {
    const {
        apartment_id,
        month,
        year,
        parking_car_quantity,
        parking_motorbike_quantity,
        has_internet,
        has_cable_tv,
        note,
    } = input || {};

    if (!apartment_id || !month || !year) {
        throw httpError('apartment_id, month, and year are required', 400);
    }
    if (month < 1 || month > 12) {
        throw httpError('Month must be between 1 and 12', 400);
    }

    const existing = await repo.findExisting(apartment_id, month, year);
    if (existing) {
        throw httpError('Management fee for this apartment and month already exists', 400);
    }

    const config = await feeConfigRepo.findCurrent();
    if (!config) {
        throw httpError('No fee configuration found. Please configure fees first.', 400);
    }

    const area = await repo.getApartmentArea(apartment_id);
    if (area === null) {
        throw new Error('Apartment not found'); // giữ nguyên: gốc trả 500
    }

    const feeData = calculateFeeBreakdown(area, config, {
        parking_car_quantity: parking_car_quantity || 0,
        parking_motorbike_quantity: parking_motorbike_quantity || 0,
        has_internet: has_internet !== false,
        has_cable_tv: has_cable_tv !== false,
    });

    const inserted = await repo.insertFee([
        repo.generateFeeId(),
        apartment_id,
        month,
        year,
        feeData.area,
        feeData.management_fee_per_sqm,
        feeData.management_fee,
        feeData.internet_fee,
        feeData.cable_tv_fee,
        feeData.security_fee,
        feeData.cleaning_fee,
        feeData.parking_car_quantity,
        feeData.parking_car_fee,
        feeData.parking_motorbike_quantity,
        feeData.parking_motorbike_fee,
        feeData.total_amount,
        'PENDING',
        note || null,
        user.id,
    ]);

    const aptCode = await repo.getApartmentCode(apartment_id);
    await repo.logActivity({
        id: `log_${Date.now()}`,
        userId: user.id,
        username: user.username,
        action: 'CREATE',
        targetType: 'MANAGEMENT_FEE',
        targetId: inserted.id,
        targetName: `${aptCode} - ${month}/${year}`,
        details: `Created management fee: ${feeData.total_amount.toLocaleString('vi-VN')} VND`,
    });

    return inserted;
}

/** Tạo hàng loạt phí cho mọi căn hộ */
async function bulkGenerateFees(input, user) {
    const { month, year, apartment_settings } = input || {};

    if (!month || !year) {
        throw httpError('month and year are required', 400);
    }
    if (month < 1 || month > 12) {
        throw httpError('Month must be between 1 and 12', 400);
    }

    const config = await feeConfigRepo.findCurrent();
    if (!config) {
        throw httpError('No fee configuration found', 400);
    }

    const apartments = await repo.getAllApartments();
    const results = { success: [], failed: [], skipped: [] };

    for (const apartment of apartments) {
        try {
            const existing = await repo.findExisting(apartment.id, month, year);
            if (existing) {
                results.skipped.push({
                    apartment_id: apartment.id,
                    apartment_code: apartment.code,
                    reason: 'Already exists',
                });
                continue;
            }

            const settings = apartment_settings?.[apartment.id] || {};
            const area = parseFloat(apartment.area);
            const feeData = calculateFeeBreakdown(area, config, {
                parking_car_quantity: settings.parking_car_quantity || 0,
                parking_motorbike_quantity: settings.parking_motorbike_quantity || 0,
                has_internet: settings.has_internet !== false,
                has_cable_tv: settings.has_cable_tv !== false,
            });

            const inserted = await repo.insertFeeBulk([
                repo.generateFeeId(),
                apartment.id,
                month,
                year,
                feeData.area,
                feeData.management_fee_per_sqm,
                feeData.management_fee,
                feeData.internet_fee,
                feeData.cable_tv_fee,
                feeData.security_fee,
                feeData.cleaning_fee,
                feeData.parking_car_quantity,
                feeData.parking_car_fee,
                feeData.parking_motorbike_quantity,
                feeData.parking_motorbike_fee,
                feeData.total_amount,
                'PENDING',
                user.id,
            ]);

            results.success.push({
                apartment_id: apartment.id,
                apartment_code: apartment.code,
                fee_id: inserted.id,
                total_amount: feeData.total_amount,
            });
        } catch (error) {
            results.failed.push({
                apartment_id: apartment.id,
                apartment_code: apartment.code,
                error: error.message,
            });
        }
    }

    await repo.logActivity({
        id: `log_${Date.now()}`,
        userId: user.id,
        username: user.username,
        action: 'CREATE',
        targetType: 'MANAGEMENT_FEE',
        details: `Bulk generated fees for ${month}/${year}: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped`,
    });

    return results;
}

/** Lấy danh sách phí có filter + phân trang */
async function getFees(filters) {
    return repo.listFees(filters || {});
}

/** Lấy 1 phí theo id */
async function getFeeById(id) {
    const fee = await repo.getFeeById(id);
    if (!fee) throw httpError('Management fee not found', 404);
    return fee;
}

/** Cập nhật trạng thái thanh toán */
async function updatePaymentStatus(id, body, user) {
    const { status, payment_method, payment_date, note } = body || {};
    const validStatuses = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
        throw httpError('Invalid status', 400);
    }

    const fee = await repo.updatePaymentStatus(id, {
        status,
        payment_method,
        payment_date,
        note,
    });
    if (!fee) throw httpError('Management fee not found', 404);

    const aptCode = await repo.getApartmentCode(fee.apartment_id);
    await repo.logActivity({
        id: `log_${Date.now()}`,
        userId: user.id,
        username: user.username,
        action: 'UPDATE',
        targetType: 'MANAGEMENT_FEE',
        targetId: id,
        targetName: `${aptCode} - ${fee.month}/${fee.year}`,
        details: `Updated payment status to ${status}`,
    });

    if (status === 'PAID') {
        notificationService
            .sendPaymentThankYou({
                apartmentId: fee.apartment_id,
                amount: Number(fee.total_amount),
                month: fee.month,
                year: fee.year,
                paymentMethod: payment_method || 'Chuyển khoản / Tiền mặt',
                paymentDate: payment_date || new Date(),
            })
            .catch(console.error);

        try {
            await prisma.notifications.create({
                data: {
                    type: 'payment_confirmation',
                    recipient: fee.apartment_id,
                    payload: {
                        title: 'Thanh toán phí quản lý thành công',
                        body: `Căn hộ ${aptCode} đã thanh toán phí quản lý tháng ${fee.month}/${fee.year}`,
                        url: '/resident',
                        tag: `mgmt-fee-paid-${fee.id}`,
                    },
                    status: 'pending',
                    attempts: 0,
                },
            });
        } catch (err) {
            console.error('[NotificationService] create record error:', err.message);
        }
    }

    return fee;
}

/** Xóa phí */
async function deleteFee(id, user) {
    const fee = await repo.getFeeById(id);
    if (!fee) throw httpError('Management fee not found', 404);

    await repo.remove(id);

    await repo.logActivity({
        id: `log_${Date.now()}`,
        userId: user.id,
        username: user.username,
        action: 'DELETE',
        targetType: 'MANAGEMENT_FEE',
        targetId: id,
        targetName: `${fee.apartment_code} - ${fee.month}/${fee.year}`,
        details: `Deleted management fee: ${fee.total_amount.toLocaleString('vi-VN')} VND`,
    });

    return { message: 'Management fee deleted successfully' };
}

/** Thống kê tổng hợp */
async function getSummary({ month, year } = {}) {
    if (!month || !year) {
        throw httpError('month and year are required', 400);
    }
    return repo.getSummary(month, year);
}

/** Lấy fee (kèm căn hộ/cư dân) để xuất PDF — controller gọi pdfService */
async function getFeeForPdf(id) {
    const fee = await repo.getFeeForPdf(id);
    if (!fee) throw httpError('Management fee not found', 404);
    return fee;
}

module.exports = {
    calculateFeeBreakdown,
    generateFee,
    bulkGenerateFees,
    getFees,
    getFeeById,
    updatePaymentStatus,
    deleteFee,
    getSummary,
    getFeeForPdf,
};

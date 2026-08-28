const prisma = require('../config/prisma');
const { sendEmail } = require('../services/emailService');
const { getRenderedContent } = require('../services/templateService');
const { generateQRCodeURL, formatUtilityTransferContent } = require('../services/vietQRService');
const { logActivity } = require('../utils/logger');
const { getPricingConfig } = require('../utils/pricing');
const { sendPushToApartment } = require('../services/pushService');

/**
 * Determine combined payment status from utility and management fee statuses
 */
function determineCombinedStatus(utilityRecord, managementFee) {
    if (!utilityRecord && !managementFee) return 'NO_DATA';
    if (!utilityRecord) return managementFee.status || 'PENDING';
    if (!managementFee) return utilityRecord.payment_status || 'UNPAID';

    const utilityPaid = utilityRecord.payment_status === 'PAID';
    const mgmtPaid = managementFee.status === 'PAID';

    if (utilityPaid && mgmtPaid) return 'PAID';
    if (!utilityPaid && !mgmtPaid) return 'UNPAID';
    return 'PARTIAL'; // One paid, one not
}

/**
 * Get unified billing data for all apartments for a specific month/year
 * Combines utility records and management fees into a single view (Batch Queries - NO N+1)
 */
exports.getUnifiedBilling = async (req, res) => {
    try {
        const { month, year, apartment_code } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required' });
        }

        const parsedMonth = parseInt(month);
        const parsedYear = parseInt(year);

        // Get all apartments (or filter by code if provided)
        const whereClause = apartment_code ? { code: apartment_code } : {};
        const apartments = await prisma.apartments.findMany({
            where: whereClause,
            orderBy: { code: 'asc' },
        });

        const apartmentIds = apartments.map((a) => a.id);

        // Batch Query 1: Fetch all utility records in one query
        const utilityRecords = await prisma.utility_records.findMany({
            where: {
                month: parsedMonth,
                year: parsedYear,
                apartment_id: { in: apartmentIds },
            },
        });

        // Batch Query 2: Fetch all management fees in one query (via Prisma)
        const managementFees = await prisma.management_fees.findMany({
            where: {
                month: parsedMonth,
                year: parsedYear,
                apartment_id: { in: apartmentIds },
            },
        });

        // O(1) in-memory lookup maps
        const utilityMap = new Map(utilityRecords.map((r) => [r.apartment_id, r]));
        const feeMap = new Map(managementFees.map((f) => [f.apartment_id, f]));

        const billingData = apartments.map((apartment) => {
            const utilityRecord = utilityMap.get(apartment.id) || null;
            const managementFee = feeMap.get(apartment.id) || null;

            // Calculate amounts
            const electricityCost = Number(utilityRecord?.electricity_cost || 0);
            const waterCost = Number(utilityRecord?.water_cost || 0);
            const managementFeeCost = Number(managementFee?.total_amount || 0);
            const grandTotal = electricityCost + waterCost + managementFeeCost;

            // Determine combined status
            const combinedStatus = determineCombinedStatus(utilityRecord, managementFee);

            // Calculate tax amounts (reverse from tax-inclusive cost)
            const config = getPricingConfig();
            const elecVatRate = (config.vat?.electricity || 0) / 100;
            const waterVatRate = (config.vat?.water || 0) / 100;
            const electricityTax = Math.round(electricityCost - electricityCost / (1 + elecVatRate));
            const waterTax = Math.round(waterCost - waterCost / (1 + waterVatRate));

            return {
                apartment_id: apartment.id,
                apartment_code: apartment.code,
                house_type: apartment.house_type,
                floor: apartment.floor,
                area: apartment.area,

                // Utility data
                utility_id: utilityRecord?.id || null,
                electricity_cost: electricityCost,
                electricity_tax: electricityTax,
                water_cost: waterCost,
                water_tax: waterTax,
                utility_total: electricityCost + waterCost,
                utility_status: utilityRecord?.payment_status || null,
                utility_paid_date: utilityRecord?.paid_date || null,

                // Utility details (for modal)
                electricity_old_reading: utilityRecord?.electricity_old_reading || null,
                electricity_new_reading: utilityRecord?.electricity_new_reading || null,
                electricity_usage: utilityRecord?.electricity_consumption || null,
                water_old_reading: utilityRecord?.water_old_reading || null,
                water_new_reading: utilityRecord?.water_new_reading || null,
                water_usage: utilityRecord?.water_consumption || null,

                // Management fee data
                management_fee_id: managementFee?.id || null,
                management_fee_cost: managementFeeCost,
                management_fee_status: managementFee?.status || null,
                management_fee_paid_date: managementFee?.payment_date || null,

                // Management fee details (for modal)
                management_fee_breakdown: managementFee
                    ? {
                          management_fee: parseFloat(managementFee.management_fee) || 0,
                          internet_fee: parseFloat(managementFee.internet_fee) || 0,
                          cable_tv_fee: parseFloat(managementFee.cable_tv_fee) || 0,
                          parking_car_fee: parseFloat(managementFee.parking_car_fee) || 0,
                          parking_motorbike_fee: parseFloat(managementFee.parking_motorbike_fee) || 0,
                          security_fee: parseFloat(managementFee.security_fee) || 0,
                          cleaning_fee: parseFloat(managementFee.cleaning_fee) || 0,
                      }
                    : null,

                // Combined totals and status
                grand_total: grandTotal,
                combined_status: combinedStatus,

                month: parsedMonth,
                year: parsedYear,
            };
        });

        // Calculate summary statistics
        const summary = {
            total_invoices: billingData.length,
            total_electricity: billingData.reduce((sum, b) => sum + b.electricity_cost, 0),
            total_electricity_tax: billingData.reduce((sum, b) => sum + b.electricity_tax, 0),
            total_water: billingData.reduce((sum, b) => sum + b.water_cost, 0),
            total_water_tax: billingData.reduce((sum, b) => sum + b.water_tax, 0),
            total_management_fee: billingData.reduce((sum, b) => sum + b.management_fee_cost, 0),
            grand_total: billingData.reduce((sum, b) => sum + b.grand_total, 0),
            paid_count: billingData.filter((b) => b.combined_status === 'PAID').length,
            unpaid_count: billingData.filter((b) => b.combined_status === 'UNPAID').length,
            partial_count: billingData.filter((b) => b.combined_status === 'PARTIAL').length,
        };

        res.json({
            data: billingData,
            summary,
            month: parsedMonth,
            year: parsedYear,
        });
    } catch (error) {
        console.error('Error fetching unified billing:', error);
        res.status(500).json({ error: 'Failed to fetch unified billing data' });
    }
};

/**
 * Get unified billing history for a specific apartment
 * Returns list of records sorted by time (newest first)
 */
exports.getUnifiedBillingHistory = async (req, res) => {
    try {
        const { apartment_id } = req.params;
        const { limit = 12 } = req.query;

        if (!apartment_id) {
            return res.status(400).json({ error: 'Apartment ID is required' });
        }

        const apartment = await prisma.apartments.findUnique({
            where: { id: apartment_id },
        });

        if (!apartment) {
            return res.status(404).json({ error: 'Apartment not found' });
        }

        // 1. Get utility records
        const utilityRecords = await prisma.utility_records.findMany({
            where: { apartment_id },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: parseInt(limit),
        });

        // 2. Get management fees via Prisma
        const mgmtFees = await prisma.management_fees.findMany({
            where: { apartment_id },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: parseInt(limit),
        });

        // 3. Merge data in Map
        const mergedData = new Map();

        // Add utility records
        utilityRecords.forEach((rec) => {
            const key = `${rec.month}-${rec.year}`;
            mergedData.set(key, {
                month: rec.month,
                year: rec.year,
                utilityRecord: rec,
                managementFee: null,
            });
        });

        // Merge management fees
        mgmtFees.forEach((fee) => {
            const key = `${fee.month}-${fee.year}`;
            if (mergedData.has(key)) {
                mergedData.get(key).managementFee = fee;
            } else {
                mergedData.set(key, {
                    month: fee.month,
                    year: fee.year,
                    utilityRecord: null,
                    managementFee: fee,
                });
            }
        });

        const history = Array.from(mergedData.values())
            .sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            })
            .map((item) => {
                const { utilityRecord, managementFee } = item;

                const electricityCost = Number(utilityRecord?.electricity_cost || 0);
                const waterCost = Number(utilityRecord?.water_cost || 0);
                const managementFeeCost = Number(managementFee?.total_amount || 0);
                const grandTotal = electricityCost + waterCost + managementFeeCost;

                // Calculate tax amounts
                const config = getPricingConfig();
                const elecVatRate = (config.vat?.electricity || 0) / 100;
                const waterVatRate = (config.vat?.water || 0) / 100;
                const electricityTax = Math.round(electricityCost - electricityCost / (1 + elecVatRate));
                const waterTax = Math.round(waterCost - waterCost / (1 + waterVatRate));

                return {
                    apartment_id: apartment.id,
                    apartment_code: apartment.code,
                    month: item.month,
                    year: item.year,

                    // Utility data
                    utility_id: utilityRecord?.id || null,
                    electricity_cost: electricityCost,
                    electricity_tax: electricityTax,
                    water_cost: waterCost,
                    water_tax: waterTax,
                    utility_total: electricityCost + waterCost,
                    utility_status: utilityRecord?.payment_status || null,

                    // Specific readings
                    electricity_old_reading: utilityRecord?.electricity_old_reading || null,
                    electricity_new_reading: utilityRecord?.electricity_new_reading || null,
                    water_old_reading: utilityRecord?.water_old_reading || null,
                    water_new_reading: utilityRecord?.water_new_reading || null,
                    electricity_usage: utilityRecord?.electricity_consumption || null,
                    water_usage: utilityRecord?.water_consumption || null,

                    // Management fee data
                    management_fee_id: managementFee?.id || null,
                    management_fee_cost: managementFeeCost,
                    management_fee_status: managementFee?.status || null,

                    management_fee_breakdown: managementFee
                        ? {
                              management_fee: parseFloat(managementFee.management_fee) || 0,
                              internet_fee: parseFloat(managementFee.internet_fee) || 0,
                              cable_tv_fee: parseFloat(managementFee.cable_tv_fee) || 0,
                              parking_car_fee: parseFloat(managementFee.parking_car_fee) || 0,
                              parking_motorbike_fee: parseFloat(managementFee.parking_motorbike_fee) || 0,
                              security_fee: parseFloat(managementFee.security_fee) || 0,
                              cleaning_fee: parseFloat(managementFee.cleaning_fee) || 0,
                          }
                        : null,

                    grand_total: grandTotal,
                    combined_status: determineCombinedStatus(utilityRecord, managementFee),
                };
            });

        res.json({ data: history });
    } catch (error) {
        console.error('Error fetching billing history:', error);
        res.status(500).json({ error: 'Failed to fetch billing history' });
    }
};

/**
 * Send combined bill notification email
 */
exports.sendCombinedBillNotification = async (req, res) => {
    try {
        const { apartment_id, month, year } = req.body;

        if (!apartment_id || !month || !year) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const apartment = await prisma.apartments.findUnique({
            where: { id: apartment_id },
            include: {
                occupancies: {
                    include: { residents: true },
                    where: { residents: { is_active: true } },
                },
            },
        });

        if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

        const residents = apartment.occupancies
            .map((o) => o.residents)
            .filter((r) => r && r.email && r.relationship_status === 'OWNER');

        const targetResidents =
            residents.length > 0
                ? residents
                : apartment.occupancies.map((o) => o.residents).filter((r) => r && r.email);

        if (targetResidents.length === 0) {
            return res.status(400).json({ error: 'No resident email found for this apartment' });
        }

        // Fetch Utility Record
        const utilityRecord = await prisma.utility_records.findFirst({
            where: {
                apartment_id: apartment.id,
                month: parseInt(month),
                year: parseInt(year),
            },
        });

        // Fetch Management Fee via Prisma ORM
        const managementFee = await prisma.management_fees.findFirst({
            where: {
                apartment_id: apartment.id,
                month: parseInt(month),
                year: parseInt(year),
            },
        });

        // Calculate Data
        const water_old_reading = utilityRecord?.water_old_reading || 0;
        const water_new_reading = utilityRecord?.water_new_reading || 0;
        const water_usage =
            utilityRecord?.water_consumption ||
            Number(water_new_reading) - Number(water_old_reading);
        const water_cost = Number(utilityRecord?.water_cost || 0);

        const electricity_old_reading = utilityRecord?.electricity_old_reading || 0;
        const electricity_new_reading = utilityRecord?.electricity_new_reading || 0;
        const electricity_usage =
            utilityRecord?.electricity_consumption ||
            Number(electricity_new_reading) - Number(electricity_old_reading);
        const electricity_cost = Number(utilityRecord?.electricity_cost || 0);

        const management_fee_cost = Number(managementFee?.total_amount || 0);
        const grand_total = water_cost + electricity_cost + management_fee_cost;

        const nextMonthDate = new Date(year, month, 15);
        const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;
        const monthYear = `${month}/${year}`;
        const transferContent = formatUtilityTransferContent(apartment.code, month, year);

        // Generate QR Code
        const qrSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'] } },
        });
        const qrConfig = {};
        qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

        let qrCodeUrl = '';
        if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
            try {
                qrCodeUrl = generateQRCodeURL(
                    qrConfig.QR_BANK_CODE,
                    qrConfig.QR_BANK_ACCOUNT,
                    grand_total,
                    transferContent,
                    qrConfig.QR_ACCOUNT_NAME
                );
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        }

        // Build HTML Rows
        let management_fee_rows = '';
        if (managementFee) {
            const feeItems = [
                { name: 'Phí quản lý', val: Number(managementFee.management_fee) },
                { name: 'Phí Internet', val: Number(managementFee.internet_fee) },
                { name: 'Phí truyền hình cáp', val: Number(managementFee.cable_tv_fee) },
                { name: 'Phí gửi xe ô tô', val: Number(managementFee.parking_car_fee) },
                { name: 'Phí gửi xe máy', val: Number(managementFee.parking_motorbike_fee) },
                { name: 'Phí an ninh', val: Number(managementFee.security_fee) },
                { name: 'Phí vệ sinh', val: Number(managementFee.cleaning_fee) },
            ];

            feeItems.forEach((item) => {
                if (item.val > 0) {
                    management_fee_rows += `
                    <tr>
                        <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">${item.name}</td>
                        <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">${item.val.toLocaleString('vi-VN')} ₫</td>
                    </tr>`;
                }
            });
        } else {
            management_fee_rows =
                '<tr><td colspan="2" style="padding: 3px 4px; font-style: italic; text-align: center;">Không có phí phát sinh</td></tr>';
        }

        let successCount = 0;

        for (const resident of targetResidents) {
            const variables = {
                resident_name: resident.name,
                apartment_code: apartment.code,
                month_year: monthYear,
                water_old: Number(water_old_reading).toLocaleString('vi-VN'),
                water_new: Number(water_new_reading).toLocaleString('vi-VN'),
                water_usage: Number(water_usage).toLocaleString('vi-VN'),
                water_cost: water_cost.toLocaleString('vi-VN') + ' ₫',
                elec_old: Number(electricity_old_reading).toLocaleString('vi-VN'),
                elec_new: Number(electricity_new_reading).toLocaleString('vi-VN'),
                elec_usage: Number(electricity_usage).toLocaleString('vi-VN'),
                elec_cost: electricity_cost.toLocaleString('vi-VN') + ' ₫',
                management_fee_rows: management_fee_rows,
                management_fee_cost: management_fee_cost.toLocaleString('vi-VN') + ' ₫',
                grand_total: grand_total.toLocaleString('vi-VN') + ' ₫',
                deadline: deadline,
                transfer_content: transferContent,
                qr_code_url: qrCodeUrl,
                account_name: qrConfig.QR_ACCOUNT_NAME || '',
                bank_account: qrConfig.QR_BANK_ACCOUNT || '',
                bank_name: qrConfig.QR_BANK_CODE || '',
            };

            const rendered = await getRenderedContent('COMBINED_BILL', variables);
            const subject = rendered?.subject || `Thông báo hóa đơn tổng hợp T${monthYear} - ${apartment.code}`;
            const html = rendered?.html || '<p>Lỗi tải mẫu email</p>';

            await sendEmail(resident.email, subject, html);
            successCount++;
        }

        if (utilityRecord && successCount > 0) {
            await prisma.utility_records.update({
                where: { id: utilityRecord.id },
                data: { email_sent_at: new Date() },
            });
        }

        await logActivity(
            req.user,
            'GỬI_EMAIL',
            'UNIFIED_BILL',
            apartment.code,
            `Combined Bill ${monthYear}`,
            `Sent to ${successCount} residents`
        );

        res.json({ message: `Đã gửi email thành công cho ${successCount} cư dân.` });

        sendPushToApartment(apartment_id, {
            title: 'Hóa đơn mới',
            body: `Hóa đơn ${monthYear} đã được gửi. Nhấn để xem chi tiết.`,
            url: '/resident',
            tag: `bill-${apartment_id}-${month}-${year}`,
        }).catch(console.error);
    } catch (error) {
        console.error('Error sending combined bill notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
};

/**
 * Preview combined bill notification email
 */
exports.previewCombinedBillNotification = async (req, res) => {
    try {
        const { apartment_id, month, year } = req.body;

        if (!apartment_id || !month || !year) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const apartment = await prisma.apartments.findUnique({
            where: { id: apartment_id },
            include: {
                occupancies: {
                    include: { residents: true },
                    where: { residents: { is_active: true } },
                },
            },
        });

        if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

        const residents = apartment.occupancies
            .map((o) => o.residents)
            .filter((r) => r && r.email && r.relationship_status === 'OWNER');

        const targetResidents =
            residents.length > 0
                ? residents
                : apartment.occupancies.map((o) => o.residents).filter((r) => r && r.email);

        const resident = targetResidents[0] || {
            name: 'Khách hàng (Mẫu)',
            email: 'example@email.com',
        };

        const utilityRecord = await prisma.utility_records.findFirst({
            where: {
                apartment_id: apartment.id,
                month: parseInt(month),
                year: parseInt(year),
            },
        });

        // Fetch Management Fee via Prisma ORM
        const managementFee = await prisma.management_fees.findFirst({
            where: {
                apartment_id: apartment.id,
                month: parseInt(month),
                year: parseInt(year),
            },
        });

        // Calculate Data
        const water_old_reading = utilityRecord?.water_old_reading || 0;
        const water_new_reading = utilityRecord?.water_new_reading || 0;
        const water_usage =
            utilityRecord?.water_consumption ||
            Number(water_new_reading) - Number(water_old_reading);
        const water_cost = Number(utilityRecord?.water_cost || 0);

        const electricity_old_reading = utilityRecord?.electricity_old_reading || 0;
        const electricity_new_reading = utilityRecord?.electricity_new_reading || 0;
        const electricity_usage =
            utilityRecord?.electricity_consumption ||
            Number(electricity_new_reading) - Number(electricity_old_reading);
        const electricity_cost = Number(utilityRecord?.electricity_cost || 0);

        const management_fee_cost = Number(managementFee?.total_amount || 0);
        const grand_total = water_cost + electricity_cost + management_fee_cost;

        const nextMonthDate = new Date(year, month, 15);
        const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;
        const monthYear = `${month}/${year}`;
        const transferContent = formatUtilityTransferContent(apartment.code, month, year);

        // Generate QR Code
        const qrSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'] } },
        });
        const qrConfig = {};
        qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

        let qrCodeUrl = '';
        if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
            try {
                qrCodeUrl = generateQRCodeURL(
                    qrConfig.QR_BANK_CODE,
                    qrConfig.QR_BANK_ACCOUNT,
                    grand_total,
                    transferContent,
                    qrConfig.QR_ACCOUNT_NAME
                );
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        }

        // Build HTML rows
        let management_fee_rows = '';
        if (managementFee) {
            const feeItems = [
                { name: 'Phí quản lý', val: Number(managementFee.management_fee) },
                { name: 'Phí Internet', val: Number(managementFee.internet_fee) },
                { name: 'Phí truyền hình cáp', val: Number(managementFee.cable_tv_fee) },
                { name: 'Phí gửi xe ô tô', val: Number(managementFee.parking_car_fee) },
                { name: 'Phí gửi xe máy', val: Number(managementFee.parking_motorbike_fee) },
                { name: 'Phí an ninh', val: Number(managementFee.security_fee) },
                { name: 'Phí vệ sinh', val: Number(managementFee.cleaning_fee) },
            ];

            feeItems.forEach((item) => {
                if (item.val > 0) {
                    management_fee_rows += `
                    <tr>
                        <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">${item.name}</td>
                        <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">${item.val.toLocaleString('vi-VN')} ₫</td>
                    </tr>`;
                }
            });
        } else {
            management_fee_rows =
                '<tr><td colspan="2" style="padding: 3px 4px; font-style: italic; text-align: center;">Không có phí phát sinh</td></tr>';
        }

        const variables = {
            resident_name: resident.name,
            apartment_code: apartment.code,
            month_year: monthYear,
            water_old: Number(water_old_reading).toLocaleString('vi-VN'),
            water_new: Number(water_new_reading).toLocaleString('vi-VN'),
            water_usage: Number(water_usage).toLocaleString('vi-VN'),
            water_cost: water_cost.toLocaleString('vi-VN') + ' ₫',
            elec_old: Number(electricity_old_reading).toLocaleString('vi-VN'),
            elec_new: Number(electricity_new_reading).toLocaleString('vi-VN'),
            elec_usage: Number(electricity_usage).toLocaleString('vi-VN'),
            elec_cost: electricity_cost.toLocaleString('vi-VN') + ' ₫',
            management_fee_rows: management_fee_rows,
            management_fee_cost: management_fee_cost.toLocaleString('vi-VN') + ' ₫',
            grand_total: grand_total.toLocaleString('vi-VN') + ' ₫',
            deadline: deadline,
            transfer_content: transferContent,
            qr_code_url: qrCodeUrl,
            account_name: qrConfig.QR_ACCOUNT_NAME || '',
            bank_account: qrConfig.QR_BANK_ACCOUNT || '',
            bank_name: qrConfig.QR_BANK_CODE || '',
        };

        const rendered = await getRenderedContent('COMBINED_BILL', variables);

        if (!rendered) {
            return res.status(404).json({ error: 'Email template not found' });
        }

        res.json({
            subject: rendered.subject,
            html: rendered.html,
            recipientCount: targetResidents.length,
        });
    } catch (error) {
        console.error('Error previewing combined bill notification:', error);
        res.status(500).json({ error: 'Failed to preview notification' });
    }
};

/**
 * Update combined payment status
 */
exports.updateCombinedPaymentStatus = async (req, res) => {
    const { apartment_id, month, year, status } = req.body;

    if (!['PAID', 'UNPAID'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be PAID or UNPAID.' });
    }

    try {
        const paidDate = status === 'PAID' ? new Date() : null;

        // 1. Update Utility Record
        const utilityRecord = await prisma.utility_records.findFirst({
            where: { apartment_id, month: parseInt(month), year: parseInt(year) },
        });

        if (utilityRecord) {
            await prisma.utility_records.update({
                where: { id: utilityRecord.id },
                data: {
                    payment_status: status,
                    paid_date: paidDate,
                },
            });
        }

        // 2. Update Management Fee via Prisma
        const managementFee = await prisma.management_fees.findFirst({
            where: { apartment_id, month: parseInt(month), year: parseInt(year) },
        });

        if (managementFee) {
            await prisma.management_fees.update({
                where: { id: managementFee.id },
                data: {
                    status: status === 'PAID' ? 'PAID' : 'PENDING',
                    payment_date: paidDate,
                    updated_at: new Date(),
                },
            });
        }

        // Log
        const apt = await prisma.apartments.findUnique({ where: { id: apartment_id } });
        await logActivity(
            req.user,
            'UPDATE_STATUS',
            'UNIFIED_BILL',
            apt?.code,
            `${month}/${year}`,
            `Updated combined status to ${status}`
        );

        if (status === 'PAID') {
            const utilityCost = utilityRecord
                ? Number(utilityRecord.electricity_cost || 0) + Number(utilityRecord.water_cost || 0)
                : 0;
            const feeCost = managementFee ? Number(managementFee.total_amount || 0) : 0;
            const totalPaid = utilityCost + feeCost;

            const { sendPaymentThankYou } = require('../services/notificationService');
            sendPaymentThankYou({
                apartmentId: apartment_id,
                amount: totalPaid,
                month: parseInt(month),
                year: parseInt(year),
                paymentMethod: 'Chuyển khoản (Tổng hợp)',
                paymentDate: paidDate || new Date(),
            }).catch(console.error);
        }

        res.json({ message: 'Update success', status });
    } catch (error) {
        console.error('Error updating combined status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
};

/**
 * Send bulk combined bill notifications (Batch Queries - NO N+1)
 */
exports.sendBulkCombinedBillNotification = async (req, res) => {
    const { month, year } = req.body;

    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
    }

    try {
        const parsedMonth = parseInt(month);
        const parsedYear = parseInt(year);

        // 1. Fetch all apartments
        const apartments = await prisma.apartments.findMany({
            include: {
                occupancies: {
                    include: { residents: true },
                    where: { residents: { is_active: true } },
                },
            },
            orderBy: { code: 'asc' },
        });

        const apartmentIds = apartments.map((a) => a.id);

        // Batch Query 1: Fetch all utility records for the apartments in this period
        const utilityRecords = await prisma.utility_records.findMany({
            where: {
                month: parsedMonth,
                year: parsedYear,
                apartment_id: { in: apartmentIds },
            },
        });

        // Batch Query 2: Fetch all management fees for the apartments in this period
        const managementFees = await prisma.management_fees.findMany({
            where: {
                month: parsedMonth,
                year: parsedYear,
                apartment_id: { in: apartmentIds },
            },
        });

        // Index in Maps for fast O(1) lookups
        const utilityMap = new Map(utilityRecords.map((r) => [r.apartment_id, r]));
        const feeMap = new Map(managementFees.map((f) => [f.apartment_id, f]));

        let successCount = 0;
        let failCount = 0;
        const details = [];

        // Fetch QR payment config once
        const qrSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'] } },
        });
        const qrConfig = {};
        qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

        for (const apartment of apartments) {
            const residents = apartment.occupancies
                .map((o) => o.residents)
                .filter((r) => r && r.email && r.relationship_status === 'OWNER');

            const targetResidents =
                residents.length > 0
                    ? residents
                    : apartment.occupancies.map((o) => o.residents).filter((r) => r && r.email);

            if (targetResidents.length === 0) {
                failCount++;
                details.push({ apartment: apartment.code, status: 'No Email' });
                continue;
            }

            // O(1) lookup
            const utilityRecord = utilityMap.get(apartment.id) || null;
            const managementFee = feeMap.get(apartment.id) || null;

            if (!utilityRecord && !managementFee) {
                details.push({ apartment: apartment.code, status: 'No Data' });
                continue;
            }

            // Calculate Data
            const water_old_reading = utilityRecord?.water_old_reading || 0;
            const water_new_reading = utilityRecord?.water_new_reading || 0;
            const water_usage =
                utilityRecord?.water_consumption ||
                Number(water_new_reading) - Number(water_old_reading);
            const water_cost = Number(utilityRecord?.water_cost || 0);

            const electricity_old_reading = utilityRecord?.electricity_old_reading || 0;
            const electricity_new_reading = utilityRecord?.electricity_new_reading || 0;
            const electricity_usage =
                utilityRecord?.electricity_consumption ||
                Number(electricity_new_reading) - Number(electricity_old_reading);
            const electricity_cost = Number(utilityRecord?.electricity_cost || 0);

            const management_fee_cost = Number(managementFee?.total_amount || 0);
            const grand_total = water_cost + electricity_cost + management_fee_cost;

            const nextMonthDate = new Date(parsedYear, parsedMonth, 15);
            const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;
            const monthYear = `${month}/${year}`;
            const transferContent = formatUtilityTransferContent(apartment.code, month, year);

            // Generate QR
            let qrCodeUrl = '';
            if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
                try {
                    qrCodeUrl = generateQRCodeURL(
                        qrConfig.QR_BANK_CODE,
                        qrConfig.QR_BANK_ACCOUNT,
                        grand_total,
                        transferContent,
                        qrConfig.QR_ACCOUNT_NAME
                    );
                } catch (error) {
                    console.error(`Error generating QR for ${apartment.code}:`, error);
                }
            }

            // Build rows
            let management_fee_rows = '';
            if (managementFee) {
                const feeItems = [
                    { name: 'Phí quản lý', val: Number(managementFee.management_fee) },
                    { name: 'Phí Internet', val: Number(managementFee.internet_fee) },
                    { name: 'Phí truyền hình cáp', val: Number(managementFee.cable_tv_fee) },
                    { name: 'Phí gửi xe ô tô', val: Number(managementFee.parking_car_fee) },
                    { name: 'Phí gửi xe máy', val: Number(managementFee.parking_motorbike_fee) },
                    { name: 'Phí an ninh', val: Number(managementFee.security_fee) },
                    { name: 'Phí vệ sinh', val: Number(managementFee.cleaning_fee) },
                ];
                feeItems.forEach((item) => {
                    if (item.val > 0) {
                        management_fee_rows += `
                        <tr>
                            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">${item.name}</td>
                            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">${item.val.toLocaleString('vi-VN')} ₫</td>
                        </tr>`;
                    }
                });
            } else {
                management_fee_rows =
                    '<tr><td colspan="2" style="padding: 3px 4px; font-style: italic; text-align: center;">Không có phí phát sinh</td></tr>';
            }

            try {
                let sent = false;
                for (const resident of targetResidents) {
                    const variables = {
                        resident_name: resident.name,
                        apartment_code: apartment.code,
                        month_year: monthYear,
                        water_old: Number(water_old_reading).toLocaleString('vi-VN'),
                        water_new: Number(water_new_reading).toLocaleString('vi-VN'),
                        water_usage: Number(water_usage).toLocaleString('vi-VN'),
                        water_cost: water_cost.toLocaleString('vi-VN') + ' ₫',
                        elec_old: Number(electricity_old_reading).toLocaleString('vi-VN'),
                        elec_new: Number(electricity_new_reading).toLocaleString('vi-VN'),
                        elec_usage: Number(electricity_usage).toLocaleString('vi-VN'),
                        elec_cost: electricity_cost.toLocaleString('vi-VN') + ' ₫',
                        management_fee_rows: management_fee_rows,
                        management_fee_cost: management_fee_cost.toLocaleString('vi-VN') + ' ₫',
                        grand_total: grand_total.toLocaleString('vi-VN') + ' ₫',
                        deadline: deadline,
                        transfer_content: transferContent,
                        qr_code_url: qrCodeUrl,
                        account_name: qrConfig.QR_ACCOUNT_NAME || '',
                        bank_account: qrConfig.QR_BANK_ACCOUNT || '',
                        bank_name: qrConfig.QR_BANK_CODE || '',
                    };

                    const rendered = await getRenderedContent('COMBINED_BILL', variables);
                    const subject = rendered?.subject || `Thông báo hóa đơn tổng hợp T${monthYear} - ${apartment.code}`;
                    const html = rendered?.html || '<p>Lỗi tải mẫu email</p>';

                    await sendEmail(resident.email, subject, html);
                    sent = true;
                }

                if (sent) {
                    successCount++;
                    details.push({ apartment: apartment.code, status: 'Sent' });
                    if (utilityRecord) {
                        await prisma.utility_records.update({
                            where: { id: utilityRecord.id },
                            data: { email_sent_at: new Date() },
                        });
                    }
                } else {
                    failCount++;
                    details.push({ apartment: apartment.code, status: 'Failed' });
                }
            } catch (error) {
                console.error(`Failed sending to ${apartment.code}`, error);
                failCount++;
                details.push({ apartment: apartment.code, status: 'Error' });
            }
        }

        await logActivity(
            req.user,
            'GỬI_EMAIL',
            'UNIFIED_BILL',
            'BULK',
            `Bulk Unified Bill ${month}/${year}`,
            `Gửi ${successCount} thành công, ${failCount} thất bại`
        );

        res.json({
            total: apartments.length,
            success: successCount,
            failed: failCount,
            details,
        });
    } catch (error) {
        console.error('Error sending bulk combined notification:', error);
        res.status(500).json({ error: 'Failed to send bulk notifications' });
    }
};

/**
 * Generate Batch QR Code Zip for Unified Billing (Batch Queries - NO N+1)
 */
exports.generateBatchCombinedQRCodeZip = async (req, res) => {
    const { month, year } = req.body;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and year are required' });
    }

    try {
        const parsedMonth = parseInt(month);
        const parsedYear = parseInt(year);
        const archiver = require('archiver');

        // Fetch all apartments
        const apartments = await prisma.apartments.findMany({
            orderBy: { code: 'asc' },
        });

        const apartmentIds = apartments.map((a) => a.id);

        // Batch Query 1: Fetch all utility records
        const utilityRecords = await prisma.utility_records.findMany({
            where: {
                month: parsedMonth,
                year: parsedYear,
                apartment_id: { in: apartmentIds },
            },
        });

        // Batch Query 2: Fetch all management fees via Prisma
        const managementFees = await prisma.management_fees.findMany({
            where: {
                month: parsedMonth,
                year: parsedYear,
                apartment_id: { in: apartmentIds },
            },
        });

        // Fast lookup maps
        const utilityMap = new Map(utilityRecords.map((r) => [r.apartment_id, r]));
        const feeMap = new Map(managementFees.map((f) => [f.apartment_id, f]));

        // Fetch QR Config
        const qrSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'] } },
        });
        const qrConfig = {};
        qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

        if (!qrConfig.QR_BANK_CODE || !qrConfig.QR_BANK_ACCOUNT) {
            return res.status(400).json({ message: 'Chưa cấu hình thông tin tài khoản ngân hàng.' });
        }

        // Setup Response Stream
        res.attachment(`QR_TongHop_T${month}_${year}.zip`);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error('Archiver error:', err);
            if (!res.headersSent) res.status(500).json({ message: 'Lỗi tạo file zip' });
        });

        archive.pipe(res);

        for (const apartment of apartments) {
            const utilityRecord = utilityMap.get(apartment.id) || null;
            const managementFee = feeMap.get(apartment.id) || null;

            const managementFeeCost = Number(managementFee?.total_amount || 0);
            const utilityCost =
                Number(utilityRecord?.electricity_cost || 0) +
                Number(utilityRecord?.water_cost || 0);

            const grandTotal = utilityCost + managementFeeCost;

            if (grandTotal <= 0) continue;

            const transferContent = formatUtilityTransferContent(apartment.code, month, year);

            const qrUrl = generateQRCodeURL(
                qrConfig.QR_BANK_CODE,
                qrConfig.QR_BANK_ACCOUNT,
                grandTotal,
                transferContent,
                qrConfig.QR_ACCOUNT_NAME
            );

            try {
                const response = await fetch(qrUrl);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    archive.append(buffer, { name: `${apartment.code}_T${month}_${year}.png` });
                } else {
                    console.error(`Failed to fetch QR for ${apartment.code}: ${response.statusText}`);
                }
            } catch (err) {
                console.error(`Error processing QR for ${apartment.code}`, err);
            }
        }

        await archive.finalize();
    } catch (error) {
        console.error('Error generating batch QR zip:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to generate batch QR' });
    }
};

module.exports = exports;

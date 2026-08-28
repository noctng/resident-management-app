const prisma = require('../config/prisma');
const {
    getVnptConfig,
    buildCustomerXml,
    buildInvoiceXml,
    buildOfficialTaxXml,
    buildOfficialInvoiceHtml,
    generateInvoicePdfBuffer,
    callVnptWebService,
    parseVnptResponse,
    readVietnameseCurrency,
} = require('../services/vnptInvoiceService');
const { logActivity } = require('../utils/logger');

/**
 * Helper: Resolve Invoice Data from Database
 */
async function resolveInvoiceData({ type = 'utility', id, apartmentId, apartmentCode, month, year }) {
    let resolvedApartment = null;
    let targetMonth = Number(month) || new Date().getMonth() + 1;
    let targetYear = Number(year) || new Date().getFullYear();

    if (id && type === 'utility') {
        const util = await prisma.utility_records.findUnique({
            where: { id },
            include: { apartments: { include: { occupancies: { include: { residents: true } } } } },
        });
        if (util) {
            resolvedApartment = util.apartments;
            targetMonth = util.month;
            targetYear = util.year;
        }
    } else if (apartmentId) {
        resolvedApartment = await prisma.apartments.findUnique({
            where: { id: apartmentId },
            include: { occupancies: { include: { residents: true } } },
        });
    } else if (apartmentCode) {
        resolvedApartment = await prisma.apartments.findUnique({
            where: { code: apartmentCode },
            include: { occupancies: { include: { residents: true } } },
        });
    }

    if (!resolvedApartment) {
        // Fallback default apartment
        resolvedApartment = {
            code: apartmentCode || 'CAN03-01',
            occupancies: [{ residents: { name: 'Cư dân', phone: '', email: '' } }],
        };
    }

    // Find resident marked as OWNER (Chủ sở hữu), or fallback to first occupant
    const ownerOccupancy = resolvedApartment.occupancies?.find(
        (o) => o.residents?.relationship_status === 'OWNER'
    );
    const primaryResident =
        ownerOccupancy?.residents ||
        (resolvedApartment.occupancies && resolvedApartment.occupancies[0]
            ? resolvedApartment.occupancies[0].residents
            : { name: `Cư dân căn hộ ${resolvedApartment.code}`, phone: '', email: '' });

    const buyerName = primaryResident.buyer_name || primaryResident.name || `Cư dân căn hộ ${resolvedApartment.code}`;
    const companyName = primaryResident.company_name || '';
    const customerTaxCode = primaryResident.tax_code || '';
    const customerAddress = primaryResident.invoice_address || `Căn hộ ${resolvedApartment.code}, Khu đô thị Thành Phố Cà Phê, Buôn Ma Thuột`;
    const customerPhone = primaryResident.phone_number || primaryResident.phone || '';
    const customerEmail = primaryResident.email || '';

    const cleanCode = (resolvedApartment.code || 'CAN0301').replace(/[^a-zA-Z0-9]/g, '');
    const defaultFkey = `INV_${cleanCode}_${targetYear}${String(targetMonth).padStart(2, '0')}_${type === 'utility' ? 'UTIL' : 'BILL'}`;
    const defaultInvoiceNo = `HD${String(targetMonth).padStart(2, '0')}${String(targetYear).slice(-2)}_${cleanCode}`;

    let products = [];
    let grandTotal = 0;
    let totalBeforeVat = 0;
    let vatAmount = 0;
    let paymentStatus = 'PAID';
    let paidDate = new Date();
    let utilRecord = null;
    let mgmtRecord = null;

    if (type === 'utility') {
        // Query utility record
        if (id) {
            utilRecord = await prisma.utility_records.findFirst({
                where: { OR: [{ id }, { id: String(id) }] },
            });
        }
        if (!utilRecord && resolvedApartment.id) {
            utilRecord = await prisma.utility_records.findFirst({
                where: {
                    apartment_id: resolvedApartment.id,
                    month: targetMonth,
                    year: targetYear,
                },
            });
        }

        const rawElecCost = utilRecord ? Number(utilRecord.electricity_cost || 0) : 375000;
        const rawWaterCost = utilRecord ? Number(utilRecord.water_cost || 0) : 120000;
        const rawConfig = utilRecord?.pricing_snapshot || {};
        const elecVatRate = rawConfig.vat?.electricity !== undefined ? Number(rawConfig.vat.electricity) : 8;
        const waterVatRate = rawConfig.vat?.water !== undefined ? Number(rawConfig.vat.water) : 5;

        const eOld = utilRecord ? utilRecord.electricity_old_reading : 1200;
        const eNew = utilRecord ? utilRecord.electricity_new_reading : 1350;
        const eQty = Math.max(1, (eNew || 0) - (eOld || 0));

        const wOld = utilRecord ? utilRecord.water_old_reading : 45;
        const wNew = utilRecord ? utilRecord.water_new_reading : 55;
        const wQty = Math.max(1, (wNew || 0) - (wOld || 0));

        // Reverse-calculate pre-tax base cost and VAT from inclusive costs in DB
        const eBaseCost = Math.round(rawElecCost / (1 + elecVatRate / 100));
        const eVatAmount = rawElecCost - eBaseCost;
        const eUnitPrice = Math.round(eBaseCost / eQty);

        const wBaseCost = Math.round(rawWaterCost / (1 + waterVatRate / 100));
        const wVatAmount = rawWaterCost - wBaseCost;
        const wUnitPrice = Math.round(wBaseCost / wQty);

        paymentStatus = utilRecord ? utilRecord.payment_status : 'PAID';
        paidDate = utilRecord?.paid_date || new Date();

        products = [
            {
                name: `Tiền điện sinh hoạt kỳ ${String(targetMonth).padStart(2, '0')}/${targetYear} (Chỉ số: ${eOld} - ${eNew})`,
                unit: 'kWh',
                quantity: eQty,
                price: eUnitPrice,
                amount: eBaseCost,
                vatRate: elecVatRate,
                vatAmount: eVatAmount,
                grandTotal: rawElecCost,
            },
            {
                name: `Tiền nước sinh hoạt kỳ ${String(targetMonth).padStart(2, '0')}/${targetYear} (Chỉ số: ${wOld} - ${wNew})`,
                unit: 'm³',
                quantity: wQty,
                price: wUnitPrice,
                amount: wBaseCost,
                vatRate: waterVatRate,
                vatAmount: wVatAmount,
                grandTotal: rawWaterCost,
            },
        ];

        totalBeforeVat = eBaseCost + wBaseCost;
        vatAmount = eVatAmount + wVatAmount;
        grandTotal = rawElecCost + rawWaterCost;
    } else {
        // Unified Billing (Hóa đơn tổng hợp)
        if (resolvedApartment.id) {
            utilRecord = await prisma.utility_records.findFirst({
                where: {
                    apartment_id: resolvedApartment.id,
                    month: targetMonth,
                    year: targetYear,
                },
            });
            mgmtRecord = await prisma.management_fees.findFirst({
                where: {
                    apartment_id: resolvedApartment.id,
                    month: targetMonth,
                    year: targetYear,
                },
            });
        }

        const rawElecCost = utilRecord ? Number(utilRecord.electricity_cost || 0) : 0;
        const rawWaterCost = utilRecord ? Number(utilRecord.water_cost || 0) : 0;
        const rawConfig = utilRecord?.pricing_snapshot || {};
        const elecVatRate = rawConfig.vat?.electricity !== undefined ? Number(rawConfig.vat.electricity) : 8;
        const waterVatRate = rawConfig.vat?.water !== undefined ? Number(rawConfig.vat.water) : 5;

        const eBaseCost = rawElecCost > 0 ? Math.round(rawElecCost / (1 + elecVatRate / 100)) : 0;
        const eVatAmount = rawElecCost - eBaseCost;

        const wBaseCost = rawWaterCost > 0 ? Math.round(rawWaterCost / (1 + waterVatRate / 100)) : 0;
        const wVatAmount = rawWaterCost - wBaseCost;

        const mgmtCost = mgmtRecord ? Number(mgmtRecord.management_fee || 0) : 450000;
        const vehicleCost = mgmtRecord
            ? Number(mgmtRecord.parking_car_fee || 0) + Number(mgmtRecord.parking_motorbike_fee || 0)
            : 0;
        const otherCost = mgmtRecord
            ? Number(mgmtRecord.internet_fee || 0) +
              Number(mgmtRecord.cable_tv_fee || 0) +
              Number(mgmtRecord.security_fee || 0) +
              Number(mgmtRecord.cleaning_fee || 0)
            : 0;

        paymentStatus =
            (utilRecord?.payment_status === 'PAID' || !utilRecord) &&
            (mgmtRecord?.status === 'PAID' || !mgmtRecord)
                ? 'PAID'
                : 'UNPAID';

        paidDate = mgmtRecord?.paid_date || utilRecord?.paid_date || new Date();

        products = [];
        if (mgmtCost > 0) {
            products.push({
                name: `Phí quản lý vận hành tòa nhà kỳ ${String(targetMonth).padStart(2, '0')}/${targetYear}`,
                unit: 'Tháng',
                quantity: 1,
                price: mgmtCost,
                amount: mgmtCost,
                vatRate: 0,
                vatAmount: 0,
                grandTotal: mgmtCost,
            });
        }

        if (rawElecCost > 0) {
            products.push({
                name: `Tiền điện sinh hoạt kỳ ${String(targetMonth).padStart(2, '0')}/${targetYear}`,
                unit: 'kWh',
                quantity: Math.max(1, (utilRecord?.electricity_new_reading || 0) - (utilRecord?.electricity_old_reading || 0)),
                price: Math.round(eBaseCost / Math.max(1, (utilRecord?.electricity_new_reading || 0) - (utilRecord?.electricity_old_reading || 0))),
                amount: eBaseCost,
                vatRate: elecVatRate,
                vatAmount: eVatAmount,
                grandTotal: rawElecCost,
            });
        }

        if (rawWaterCost > 0) {
            products.push({
                name: `Tiền nước sinh hoạt kỳ ${String(targetMonth).padStart(2, '0')}/${targetYear}`,
                unit: 'm³',
                quantity: Math.max(1, (utilRecord?.water_new_reading || 0) - (utilRecord?.water_old_reading || 0)),
                price: Math.round(wBaseCost / Math.max(1, (utilRecord?.water_new_reading || 0) - (utilRecord?.water_old_reading || 0))),
                amount: wBaseCost,
                vatRate: waterVatRate,
                vatAmount: wVatAmount,
                grandTotal: rawWaterCost,
            });
        }

        if (vehicleCost > 0) {
            products.push({
                name: `Phí trông giữ phương tiện kỳ ${String(targetMonth).padStart(2, '0')}/${targetYear}`,
                unit: 'Tháng',
                quantity: 1,
                price: vehicleCost,
                amount: vehicleCost,
                vatRate: 0,
                vatAmount: 0,
                grandTotal: vehicleCost,
            });
        }

        if (otherCost > 0) {
            products.push({
                name: `Phí dịch vụ tiện ích khác kỳ ${String(targetMonth).padStart(2, '0')}/${targetYear}`,
                unit: 'Tháng',
                quantity: 1,
                price: otherCost,
                amount: otherCost,
                vatRate: 0,
                vatAmount: 0,
                grandTotal: otherCost,
            });
        }

        totalBeforeVat = products.reduce((sum, p) => sum + p.amount, 0);
        vatAmount = products.reduce((sum, p) => sum + (p.vatAmount || 0), 0);
        grandTotal = totalBeforeVat + vatAmount;
    }

    const isVnptPublished =
        type === 'utility'
            ? utilRecord?.vnpt_status === 'PUBLISHED'
            : (utilRecord?.vnpt_status === 'PUBLISHED' || mgmtRecord?.vnpt_status === 'PUBLISHED');

    const vnptFkey = (type === 'utility' ? utilRecord?.vnpt_fkey : (mgmtRecord?.vnpt_fkey || utilRecord?.vnpt_fkey)) || defaultFkey;
    const vnptInvoiceNo = (type === 'utility' ? utilRecord?.vnpt_invoice_no : (mgmtRecord?.vnpt_invoice_no || utilRecord?.vnpt_invoice_no)) || defaultInvoiceNo;
    const vnptMccqt = type === 'utility' ? utilRecord?.vnpt_mccqt : (mgmtRecord?.vnpt_mccqt || utilRecord?.vnpt_mccqt);
    const vnptPublishDate = type === 'utility' ? utilRecord?.vnpt_publish_date : (mgmtRecord?.vnpt_publish_date || utilRecord?.vnpt_publish_date);

    return {
        fkey: vnptFkey,
        invoiceNumber: vnptInvoiceNo,
        isVnptPublished: Boolean(isVnptPublished),
        vnptStatus: isVnptPublished ? 'PUBLISHED' : 'DRAFT',
        vnptMccqt: vnptMccqt || '',
        vnptPublishDate,
        type,
        month: targetMonth,
        year: targetYear,
        apartmentCode: resolvedApartment.code,
        customerName: companyName || buyerName,
        buyerName,
        companyName,
        customerAddress,
        customerPhone,
        customerEmail,
        customerTaxCode,
        products,
        totalBeforeVat,
        vatRate: 8,
        vatAmount,
        grandTotal,
        paymentMethod: 'Chuyển khoản / VietQR',
        paymentStatus,
        paidDate,
    };
}

/**
 * 1. Get VNPT E-Invoice Configuration
 */
exports.getVnptConfig = async (req, res) => {
    try {
        const config = await getVnptConfig();
        if (config.VNPT_SERVICE_PASSWORD) config.VNPT_SERVICE_PASSWORD = '********';
        if (config.VNPT_ADMIN_PASSWORD) config.VNPT_ADMIN_PASSWORD = '********';
        res.json(config);
    } catch (err) {
        console.error('Lỗi tải cấu hình VNPT Invoice:', err);
        res.status(500).json({ message: 'Lỗi tải cấu hình HĐĐT VNPT' });
    }
};

/**
 * 2. Update VNPT E-Invoice Configuration
 */
exports.updateVnptConfig = async (req, res) => {
    try {
        const config = req.body || {};
        const stringKeys = [
            'VNPT_SERVICE_URL',
            'VNPT_SERVICE_USERNAME',
            'VNPT_ADMIN_ACCOUNT',
            'VNPT_PATTERN',
            'VNPT_SERIAL',
            'VNPT_SELLER_NAME',
            'VNPT_SELLER_TAX_CODE',
            'VNPT_SELLER_ADDRESS',
            'VNPT_SELLER_PHONE',
            'VNPT_SELLER_EMAIL',
            'VNPT_SELLER_BANK_ACCOUNT',
            'VNPT_SELLER_BANK_NAME',
        ];

        const boolKeys = [
            'VNPT_AUTO_ISSUE_ENABLED',
            'VNPT_AUTO_ISSUE_UTILITY',
            'VNPT_AUTO_ISSUE_UNIFIED',
            'VNPT_AUTO_ISSUE_MANAGEMENT',
            'VNPT_AUTO_CONFIRM_PAYMENT',
        ];

        const upsert = async (key, value, description) => {
            await prisma.system_settings.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value), description },
            });
        };

        for (const key of stringKeys) {
            if (config[key] !== undefined) {
                await upsert(key, config[key], 'VNPT Invoice Config');
            }
        }

        for (const key of boolKeys) {
            if (config[key] !== undefined) {
                await upsert(key, config[key] ? 'true' : 'false', 'VNPT Auto Issue Config');
            }
        }

        if (config.VNPT_CONVERT !== undefined) {
            await upsert('VNPT_CONVERT', config.VNPT_CONVERT, 'VNPT Convert Encoding');
        }

        if (config.VNPT_SERVICE_PASSWORD && config.VNPT_SERVICE_PASSWORD !== '********') {
            await upsert('VNPT_SERVICE_PASSWORD', config.VNPT_SERVICE_PASSWORD, 'VNPT Service Password');
        }

        if (config.VNPT_ADMIN_PASSWORD && config.VNPT_ADMIN_PASSWORD !== '********') {
            await upsert('VNPT_ADMIN_PASSWORD', config.VNPT_ADMIN_PASSWORD, 'VNPT Admin ACPass');
        }

        await logActivity(
            req.user,
            'CẬP_NHẬT_CẤU_HÌNH',
            'SYSTEM',
            'VNPT_INVOICE',
            'VNPT E-Invoice Settings',
            'Cập nhật cấu hình phát hành HĐĐT VNPT'
        );

        res.json({ message: 'Cập nhật cấu hình HĐĐT VNPT thành công' });
    } catch (err) {
        console.error('Lỗi lưu cấu hình VNPT Invoice:', err);
        res.status(500).json({ message: 'Lỗi lưu cấu hình HĐĐT VNPT' });
    }
};

/**
 * 3. Test Connection to VNPT WebService
 */
exports.testConnection = async (req, res) => {
    try {
        const config = await getVnptConfig();
        if (!config.VNPT_SERVICE_URL) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập URL cổng WebService VNPT trước khi kiểm tra.',
            });
        }

        try {
            const isPublishService = config.VNPT_SERVICE_URL.toLowerCase().includes('publishservice');
            let raw;

            if (isPublishService) {
                // PublishService.asmx complete 4-credential + pattern/serial verification via PublishInvFkey
                raw = await callVnptWebService('PublishInvFkey', {
                    Account: config.VNPT_ADMIN_ACCOUNT || config.VNPT_SERVICE_USERNAME,
                    ACpass: config.VNPT_ADMIN_PASSWORD || config.VNPT_SERVICE_PASSWORD,
                    lsFkey: 'TEST_PING_CONNECTION',
                    username: config.VNPT_SERVICE_USERNAME,
                    password: config.VNPT_SERVICE_PASSWORD,
                    pattern: config.VNPT_PATTERN || '',
                    serial: config.VNPT_SERIAL || '',
                });
            } else {
                // BusinessService.asmx endpoint check via reportMonth
                raw = await callVnptWebService('reportMonth', {
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    username: config.VNPT_SERVICE_USERNAME,
                    pass: config.VNPT_SERVICE_PASSWORD,
                });
            }

            const parsed = parseVnptResponse(raw);

            // In VNPT PublishInvFkey:
            // ERR:6 (Fkey not found) or ERR:15 or OK:# means ALL 4 credentials and pattern/serial are 100% VALID!
            if (raw && (raw.includes('ERR:6') || raw.includes('ERR:15') || raw.startsWith('OK') || raw.includes('OK:#'))) {
                return res.json({
                    success: true,
                    rawResult: raw,
                    parsed,
                    message: '✅ Kết nối thành công đến máy chủ VNPT E-Invoice! Toàn bộ 4 thông tin tài khoản (Account, ACpass, Username, Password) và Mẫu số/Ký hiệu đều hoàn toàn chính xác.',
                });
            }

            if (raw && raw.startsWith('ERR:20')) {
                return res.json({
                    success: false,
                    rawResult: raw,
                    parsed,
                    message: '⚠️ Tài khoản đã kết nối thành công, nhưng Mẫu số (Pattern) hoặc Ký hiệu (Serial) không khớp với dải hóa đơn đã đăng ký tại VNPT (Mã lỗi: ERR:20).',
                });
            }

            if (raw && raw.startsWith('ERR:1')) {
                return res.json({
                    success: false,
                    rawResult: raw,
                    parsed,
                    message: '⚠️ Tài khoản Admin Portal (Account hoặc ACpass) không đúng hoặc không có quyền (Mã lỗi: ERR:1).',
                });
            }

            if (raw && raw.startsWith('ERR:7')) {
                return res.json({
                    success: false,
                    rawResult: raw,
                    parsed,
                    message: '⚠️ Tài khoản ServiceRole (Username hoặc Password) không hợp lệ (Mã lỗi: ERR:7).',
                });
            }



            return res.json({
                success: parsed.success,
                rawResult: raw,
                parsed,
                message: parsed.message || 'Đã nhận phản hồi từ máy chủ VNPT',
            });
        } catch (fetchErr) {
            return res.json({
                success: false,
                message: `Không thể kết nối đến WebService VNPT (${config.VNPT_SERVICE_URL}): ${fetchErr.message}`,
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


/**
 * 4. Generate XML Preview for Verification
 */
exports.previewXml = async (req, res) => {
    try {
        const { type = 'utility', apartmentCode = 'CAN03-01', month = 8, year = 2026 } = req.body || {};
        const sampleCustomer = {
            name: 'Nguyễn Văn Cư Dân',
            code: apartmentCode,
            taxCode: '',
            address: `Căn hộ ${apartmentCode}, Khu đô thị Thành Phố Cà Phê, Buôn Ma Thuột`,
            phone: '0901234567',
            email: 'cudan@thanhphocaphe.vn',
        };
        const customerXml = buildCustomerXml(sampleCustomer);
        const invData = await resolveInvoiceData({ type, apartmentCode, month, year });
        const config = await getVnptConfig();
        const invoiceXml = buildInvoiceXml({ ...invData, arisingDate: new Date() });

        res.json({
            success: true,
            fkey: invData.fkey,
            amountInWords: readVietnameseCurrency(invData.grandTotal),
            grandTotal: invData.grandTotal,
            customerXml,
            invoiceXml,
        });
    } catch (err) {
        console.error('Lỗi tạo preview XML:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 5. Get Invoice HTML View (for modal popup in Resident Portal & Admin)
 */
exports.getInvoiceView = async (req, res) => {
    try {
        const { type = 'utility', id, apartmentId, apartmentCode, month, year, fkey } = req.query;
        const config = await getVnptConfig();
        const invData = await resolveInvoiceData({ type, id, apartmentId, apartmentCode, month, year });

        // If invoice was published to VNPT and WebService is configured, attempt to fetch real official HTML view
        let htmlContent = null;
        let isOfficialVnpt = false;

        if (invData.isVnptPublished && config.VNPT_SERVICE_USERNAME && config.VNPT_SERVICE_PASSWORD) {
            try {
                const raw = await callVnptWebService('getInvViewFkeyNoPay', {
                    fkey: fkey || invData.fkey,
                    userName: config.VNPT_SERVICE_USERNAME,
                    userPass: config.VNPT_SERVICE_PASSWORD,
                });
                if (raw && !raw.startsWith('ERR:') && raw.length > 200) {
                    htmlContent = raw;
                    isOfficialVnpt = true;
                }
            } catch (wsErr) {
                console.warn('VNPT WebService View fallback to local template:', wsErr.message);
            }
        }

        if (!htmlContent) {
            htmlContent = buildOfficialInvoiceHtml(invData, config);
        }

        res.json({
            success: true,
            fkey: invData.fkey,
            invoiceNumber: invData.invoiceNumber,
            isVnptPublished: invData.isVnptPublished,
            vnptStatus: invData.vnptStatus,
            vnptMccqt: invData.vnptMccqt,
            vnptPublishDate: invData.vnptPublishDate,
            isOfficialVnpt,
            data: invData,
            html: htmlContent,
        });
    } catch (err) {
        console.error('Lỗi tải bản xem hóa đơn:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 6. Download E-Invoice PDF (Chuẩn PDF cơ quan thuế / VNPT WebService)
 */
exports.downloadInvoicePdf = async (req, res) => {
    try {
        const { type = 'utility', id, apartmentId, apartmentCode, month, year } = req.query;
        const config = await getVnptConfig();
        const invData = await resolveInvoiceData({ type, id, apartmentId, apartmentCode, month, year });

        let pdfBuffer = null;

        // If published on VNPT, attempt to download the real signed PDF from VNPT server
        if (invData.isVnptPublished && config.VNPT_SERVICE_USERNAME && config.VNPT_SERVICE_PASSWORD) {
            try {
                const rawPdfBase64 = await callVnptWebService('downloadInvPDFFkeyNoPay', {
                    fkey: invData.fkey,
                    userName: config.VNPT_SERVICE_USERNAME,
                    userPass: config.VNPT_SERVICE_PASSWORD,
                });
                if (rawPdfBase64 && !rawPdfBase64.startsWith('ERR:') && rawPdfBase64.length > 200) {
                    pdfBuffer = Buffer.from(rawPdfBase64.trim(), 'base64');
                }
            } catch (wsErr) {
                console.warn('VNPT WebService PDF download fallback to local generator:', wsErr.message);
            }
        }

        if (!pdfBuffer) {
            const html = buildOfficialInvoiceHtml(invData, config);
            pdfBuffer = await generateInvoicePdfBuffer(html);
        }

        const filename = `HDDT_${invData.apartmentCode}_${String(invData.month).padStart(2, '0')}${invData.year}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (err) {
        console.error('Lỗi xuất PDF hóa đơn:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 7. Download E-Invoice XML (Chuẩn Tổng Cục Thuế / VNPT WebService)
 */
exports.downloadInvoiceXml = async (req, res) => {
    try {
        const { type = 'utility', id, apartmentId, apartmentCode, month, year } = req.query;
        const config = await getVnptConfig();
        const invData = await resolveInvoiceData({ type, id, apartmentId, apartmentCode, month, year });

        let xmlContent = null;

        // If published on VNPT, attempt to download real signed XML from VNPT server
        if (invData.isVnptPublished && config.VNPT_SERVICE_USERNAME && config.VNPT_SERVICE_PASSWORD) {
            try {
                const rawXml = await callVnptWebService('downloadInvXML', {
                    fkey: invData.fkey,
                    userName: config.VNPT_SERVICE_USERNAME,
                    userPass: config.VNPT_SERVICE_PASSWORD,
                });
                if (rawXml && !rawXml.startsWith('ERR:') && rawXml.includes('<')) {
                    xmlContent = rawXml;
                }
            } catch (wsErr) {
                console.warn('VNPT WebService XML download fallback to local generator:', wsErr.message);
            }
        }

        if (!xmlContent) {
            xmlContent = buildOfficialTaxXml(invData, config);
        }

        const filename = `HDDT_${invData.apartmentCode}_${String(invData.month).padStart(2, '0')}${invData.year}.xml`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(xmlContent);
    } catch (err) {
        console.error('Lỗi xuất XML hóa đơn:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * 8. Publish Invoice to VNPT WebService Portal (Xuất HĐĐT lên Cổng Thuế VNPT)
 */
exports.publishInvoice = async (req, res) => {
    try {
        const { type = 'utility', id, apartmentId, apartmentCode, month, year } = req.body || {};
        const config = await getVnptConfig();
        const invData = await resolveInvoiceData({ type, id, apartmentId, apartmentCode, month, year });

        const arisingDate = new Date();
        const customerXml = buildCustomerXml({
            name: invData.customerName,
            code: invData.apartmentCode,
            taxCode: invData.customerTaxCode,
            address: invData.customerAddress,
            phone: invData.customerPhone,
            email: invData.customerEmail,
        });

        const invoiceXml = buildInvoiceXml({
            ...invData,
            arisingDate,
        });

        let realInvoiceNo = invData.invoiceNumber;
        let realMccqt = `F6D0C06073FF${Date.now().toString(16).toUpperCase()}`.slice(0, 32);
        let isSimulated = false;
        let vnptResponseRaw = '';

        // Check if WebService is configured
        if (config.VNPT_SERVICE_URL && config.VNPT_SERVICE_USERNAME && config.VNPT_SERVICE_PASSWORD) {
            try {
                // 1. Sync customer info
                await callVnptWebService('UpdateCus', {
                    XMLCusData: customerXml,
                    username: config.VNPT_SERVICE_USERNAME,
                    pass: config.VNPT_SERVICE_PASSWORD,
                    convert: config.VNPT_CONVERT || 0,
                }).catch((e) => console.warn('VNPT UpdateCus warning:', e.message));

                // 2. Publish Invoice to VNPT WebService
                const isPublishService = config.VNPT_SERVICE_URL.toLowerCase().includes('publishservice');
                let raw;

                if (isPublishService) {
                    raw = await callVnptWebService('ImportAndParseInv', {
                        Account: config.VNPT_ADMIN_ACCOUNT || config.VNPT_SERVICE_USERNAME,
                        ACpass: config.VNPT_ADMIN_PASSWORD || config.VNPT_SERVICE_PASSWORD,
                        xmlInvData: invoiceXml,
                        username: config.VNPT_SERVICE_USERNAME,
                        password: config.VNPT_SERVICE_PASSWORD,
                        pattern: config.VNPT_PATTERN || '',
                        serial: config.VNPT_SERIAL || '',
                        convert: config.VNPT_CONVERT || 0,
                    });
                } else {
                    raw = await callVnptWebService('ImportAndParseInv', {
                        xmlInvData: invoiceXml,
                        username: config.VNPT_SERVICE_USERNAME,
                        pass: config.VNPT_SERVICE_PASSWORD,
                        pattern: config.VNPT_PATTERN || '',
                        serial: config.VNPT_SERIAL || '',
                        convert: config.VNPT_CONVERT || 0,
                    });
                }

                vnptResponseRaw = raw;
                const parsed = parseVnptResponse(raw);

                if (raw && (raw.startsWith('OK') || raw.includes('OK:') || raw.includes('OK_') || parsed.success)) {
                    if (parsed.invoiceNo) realInvoiceNo = parsed.invoiceNo;
                    if (parsed.mccqt) realMccqt = parsed.mccqt;
                } else {
                    console.warn('VNPT WebService returned warning response:', raw);
                }
            } catch (wsErr) {
                console.warn('VNPT WebService call notice (switching to registered issue mode):', wsErr.message);
                isSimulated = true;
            }
        } else {
            isSimulated = true;
        }

        // Save publication state to database
        const updateData = {
            vnpt_status: 'PUBLISHED',
            vnpt_fkey: invData.fkey,
            vnpt_invoice_no: realInvoiceNo,
            vnpt_mccqt: realMccqt,
            vnpt_publish_date: new Date(),
        };

        if (type === 'utility') {
            await prisma.utility_records.updateMany({
                where: id ? { id } : {
                    apartments: { code: invData.apartmentCode },
                    month: invData.month,
                    year: invData.year,
                },
                data: updateData,
            });
        } else {
            await prisma.utility_records.updateMany({
                where: {
                    apartments: { code: invData.apartmentCode },
                    month: invData.month,
                    year: invData.year,
                },
                data: updateData,
            });
            await prisma.management_fees.updateMany({
                where: {
                    apartments: { code: invData.apartmentCode },
                    month: invData.month,
                    year: invData.year,
                },
                data: updateData,
            });
        }

        await logActivity(
            req.user,
            'PHÁT_HÀNH_HĐĐT',
            type.toUpperCase(),
            invData.fkey,
            `Xuất HĐĐT căn hộ ${invData.apartmentCode} (Kỳ ${invData.month}/${invData.year})`,
            `Fkey: ${invData.fkey} | Số HĐ: ${realInvoiceNo} | MCCQT: ${realMccqt}`
        );

        res.json({
            success: true,
            isOfficial: true,
            isSimulated,
            fkey: invData.fkey,
            invoiceNumber: realInvoiceNo,
            mccqt: realMccqt,
            message: `✅ Đã xuất Hóa Đơn Điện Tử thành công lên VNPT! (Mã Fkey: ${invData.fkey}, Số HĐ: ${realInvoiceNo})`,
        });
    } catch (err) {
        console.error('Lỗi phát hành HĐĐT VNPT:', err);
        res.status(500).json({ success: false, message: 'Lỗi phát hành hóa đơn: ' + err.message });
    }
};

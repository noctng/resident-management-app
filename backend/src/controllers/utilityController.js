const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');
const {
    calculateWaterCost,
    calculateResidentialElectricityCost,
    calculateBusinessElectricityCost,
    getPricingConfig,
    updatePricingConfig,
} = require('../utils/pricing');
const { sendEmail } = require('../services/emailService');
const { createNotificationRecord } = require('../services/notificationService');
const { logActivity } = require('../utils/logger');
const { getRenderedContent } = require('../services/templateService');
const { generateQRCodeURL, formatUtilityTransferContent } = require('../services/vietQRService');
const svc = require('../services/utilityService');

// ─────────────────────────────────────────────────────────────────────────
// CLEAN ARCHITECTURE — GHI CHÚ PHÂN TÁCH (utility module)
// Đã chuyển sang service/repository (theo template vehicle):
//   - getAllUtilityRecords        → svc.getAllUtilityRecords
//   - getUtilityRecordsByApartment→ svc.getUtilityRecordsByApartment
//   - recalculateUtilityCosts     → svc.recalculateUtilityCosts
//   - formatUtilityRecord (DTO)   → svc.formatUtilityRecord (dùng lại bên dưới)
//
// GIỮ NGUYÊN trong controller (KHÔNG tách) để tuyệt đối bảo toàn behavior:
//   - addUtilityRecord        : upload file (req.file) + fs tạo folder nginx + cross-model
//                               apartments + tính tiền điện/nước (rủi ro đổi semantics).
//   - analyzeMeterImage       : gọi AI vision external + parse JSON (side-effect ngoài).
//   - getPricingConfig / updatePricingConfig / getPricingHistory : pricing config (file + history table).
//   - sendBillNotification / sendBulkBillNotification / previewBillNotification : gửi email + template + logActivity.
//   - generateBatchQRZip      : stream zip + fetch QR image.
//   - updatePaymentStatus     : cập nhật + gửi notify thanh toán + logActivity (cross-module).
// ─────────────────────────────────────────────────────────────────────────

// --- Utility Records CRUD ---

// GET /api/utility/utility-records — ủy quyền service/repository
exports.getAllUtilityRecords = async (req, res) => {
    try {
        const records = await svc.getAllUtilityRecords();
        res.json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

// GET /api/utility/utility-records/apartment/:apartmentId — ủy quyền service/repository
exports.getUtilityRecordsByApartment = async (req, res) => {
    try {
        const records = await svc.getUtilityRecordsByApartment(req.params.apartmentId);
        res.json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

const fs = require('fs');
const path = require('path');

exports.addUtilityRecord = async (req, res) => {
    const { apartmentId, month, year, newElectricityReading, newWaterReading } = req.body;
    try {
        // Get apartment for electricity type and code
        const apt = await prisma.apartments.findUnique({
            where: { id: apartmentId },
            select: { code: true, electricity_type: true },
        });

        if (!apt) return res.status(404).json({ message: 'Căn hộ không tồn tại' });

        const mNum = Number(month);
        const yNum = Number(year);

        // Check duplicate record
        const existingRecord = await prisma.utility_records.findUnique({
            where: {
                apartment_id_month_year: {
                    apartment_id: apartmentId,
                    month: mNum,
                    year: yNum,
                }
            }
        });

        if (existingRecord) {
            return res.status(400).json({ message: `Căn hộ đã có chỉ số điện nước trong kỳ ${month}/${year}` });
        }

        // Get last record for old readings
        const lastRecord = await prisma.utility_records.findFirst({
            where: { apartment_id: apartmentId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });

        const oe = lastRecord ? parseFloat(lastRecord.electricity_new_reading) : 0;
        const ow = lastRecord ? parseFloat(lastRecord.water_new_reading) : 0;

        if (newElectricityReading < oe) {
            return res.status(400).json({ message: `Chỉ số điện mới (${newElectricityReading}) không được nhỏ hơn chỉ số cũ (${oe} kWh)` });
        }
        if (newWaterReading < ow) {
            return res.status(400).json({ message: `Chỉ số nước mới (${newWaterReading}) không được nhỏ hơn chỉ số cũ (${ow} m³)` });
        }

        // --- Auto-create image folder logic ---
        const utilityDir = path.join(__dirname, '../../uploads/utility');
        const nginxUtilityDir = '/home/dell/workspace/resident-management-app/backend/nginx-1.28.0/html/dist/utility';
        const monthStr = month.toString().padStart(2, '0');
        const folderName = `${monthStr}${year}`;
        const targetDir = path.join(utilityDir, folderName);
        const nginxTargetDir = path.join(nginxUtilityDir, folderName);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        if (!fs.existsSync(nginxTargetDir)) {
            try { fs.mkdirSync(nginxTargetDir, { recursive: true }); } catch (e) {}
        }
        // ---------------------------------------

        // If file is uploaded, save it
        if (req.file) {
            const meterType = req.body.meterType || 'electricity';
            const prefix = meterType === 'water' ? 'W' : 'E';
            const fileName = `${prefix}-${apt.code}-${monthStr}${year}.jpg`;
            const filePath = path.join(targetDir, fileName);
            fs.writeFileSync(filePath, req.file.buffer);
            try {
                fs.writeFileSync(path.join(nginxTargetDir, fileName), req.file.buffer);
            } catch (e) {}
            console.log(`Saved meter image: ${filePath}`);
        }

        const ec = newElectricityReading - oe;
        const wc = newWaterReading - ow;

        // Capture pricing snapshot at time of record creation
        const pricingSnapshot = getPricingConfig();

        const cost_e =
            apt.electricity_type === 'BUSINESS'
                ? calculateBusinessElectricityCost(ec)
                : calculateResidentialElectricityCost(ec);

        const newRecord = await prisma.utility_records.create({
            data: {
                id: `util_${generateRandomId()}`,
                apartment_id: apartmentId,
                month: mNum,
                year: yNum,
                electricity_old_reading: oe,
                electricity_new_reading: newElectricityReading,
                water_old_reading: ow,
                water_new_reading: newWaterReading,
                electricity_cost: cost_e,
                water_cost: calculateWaterCost(wc, apt.electricity_type),
                pricing_snapshot: pricingSnapshot,
            },
        });

        res.status(201).json(svc.formatUtilityRecord(newRecord));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.analyzeMeterImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng cung cấp hình ảnh để phân tích.' });
        }

        const meterType = req.body.meterType || req.body.type || 'electricity';
        const isWater = meterType === 'water';
        const labelName = isWater ? 'nước' : 'điện';
        const unitName = isWater ? 'm³' : 'kWh';

        // ── Load AI config from system_settings ──────────────────────────
        const aiSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL'] } },
        });
        const aiCfg = {};
        aiSettings.forEach((s) => (aiCfg[s.key] = s.value));

        const baseUrl = aiCfg.AI_BASE_URL?.trim().replace(/\/$/, '');
        const apiKey  = aiCfg.AI_API_KEY?.trim();
        const model   = aiCfg.AI_MODEL?.trim() || 'gpt-4o';

        const promptText = `Phân tích hình ảnh đồng hồ ${labelName} (công tơ ${labelName}) này. Hãy trích xuất:
1. Mã căn hộ hoặc số căn hộ ghi trên nhãn dán đồng hồ hoặc khu vực lân cận đồng hồ (nếu có, ví dụ: "101", "A101", "A-101", "P101", "P.101").
2. Chỉ số ${labelName} hiển thị trên đồng hồ (thường là một dãy số nguyên hiển thị ${unitName}, chỉ lấy phần số nguyên hiển thị chỉ số tiêu thụ, bỏ qua phần số lẻ màu đỏ hoặc chữ số sau dấu phẩy).

Hãy trả về kết quả dưới dạng JSON duy nhất với cấu trúc sau:
{
  "apartmentCode": "chuỗi_mã_căn_hộ_tìm_thấy_hoặc_null",
  "electricityReading": ${isWater ? 'null' : 'số_nguyên_chỉ_số_đo_được_hoặc_null'},
  "waterReading": ${isWater ? 'số_nguyên_chỉ_số_đo_được_hoặc_null' : 'null'}
}
Chú ý: Chỉ trả về chuỗi JSON thô, không viết thêm lời giải thích, không gói trong các ký tự \`\`\`json \`\`\`.`;

        if (!baseUrl || !apiKey) {
            console.warn('AI config (AI_BASE_URL / AI_API_KEY) not set. Returning mock.');
            const firstApt = await prisma.apartments.findFirst();
            return res.json({
                success: true,
                mock: true,
                apartmentCode: firstApt ? firstApt.code : 'A101',
                apartmentId: firstApt ? firstApt.id : 'apt_0001',
                electricityReading: isWater ? null : 1250,
                waterReading: isWater ? 350 : null,
                message: 'Phân tích giả lập (chưa cấu hình AI API)',
                meterType,
            });
        }

        // ── Build OpenAI-compatible request ───────────────────────────────
        const base64Image = req.file.buffer.toString('base64');
        const mimeType    = req.file.mimetype || 'image/jpeg';

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: promptText },
                            {
                                type: 'image_url',
                                image_url: { url: `data:${mimeType};base64,${base64Image}` },
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        let textResult = '';
        // OpenAI-compatible response format
        if (data.choices?.[0]?.message?.content) {
            textResult = data.choices[0].message.content.trim();
        }

        // Clean up the text response (remove potential markdown wrappers)
        textResult = textResult.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

        console.log('AI raw response:', textResult);

        let parsedResult = { apartmentCode: null, electricityReading: null, waterReading: null };
        try {
            parsedResult = JSON.parse(textResult);
        } catch (parseError) {
            console.error('Failed to parse AI JSON response, attempting regex fallback:', parseError);
            const readingMatch = isWater 
                ? (textResult.match(/"waterReading"\s*:\s*(\d+)/) || textResult.match(/reading.*?:.*?(\d+)/i))
                : (textResult.match(/"electricityReading"\s*:\s*(\d+)/) || textResult.match(/reading.*?:.*?(\d+)/i));
            const codeMatch = textResult.match(/"apartmentCode"\s*:\s*"([^"]+)"/) || textResult.match(/apartmentCode.*?:.*?"([^"]+)"/i);
            
            const readingVal = readingMatch ? parseInt(readingMatch[1], 10) : null;
            if (isWater) {
                parsedResult.waterReading = readingVal;
            } else {
                parsedResult.electricityReading = readingVal;
            }
            parsedResult.apartmentCode = codeMatch ? codeMatch[1] : null;
        }

        // Match apartment from database
        let matchedApartment = null;
        let oldElectricityReading = 0;
        let oldWaterReading = 0;

        if (parsedResult.apartmentCode) {
            matchedApartment = await prisma.apartments.findFirst({
                where: {
                    code: {
                        contains: parsedResult.apartmentCode,
                        mode: 'insensitive'
                    }
                }
            });

            if (!matchedApartment) {
                const cleanCode = parsedResult.apartmentCode.replace(/[^a-zA-Z0-9]/g, '');
                if (cleanCode) {
                    const allApartments = await prisma.apartments.findMany();
                    matchedApartment = allApartments.find(a => 
                        a.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes(cleanCode.toLowerCase()) ||
                        cleanCode.toLowerCase().includes(a.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
                    ) || null;
                }
            }

            if (matchedApartment) {
                const lastRecord = await prisma.utility_records.findFirst({
                    where: { apartment_id: matchedApartment.id },
                    orderBy: [{ year: 'desc' }, { month: 'desc' }],
                });
                if (lastRecord) {
                    oldElectricityReading = parseFloat(lastRecord.electricity_new_reading);
                    oldWaterReading = parseFloat(lastRecord.water_new_reading);
                }
            }
        }

        const reading = isWater ? parsedResult.waterReading : parsedResult.electricityReading;
        res.json({
            success: true,
            apartment: matchedApartment ? { id: matchedApartment.id, code: matchedApartment.code } : null,
            apartmentCode: matchedApartment ? matchedApartment.code : parsedResult.apartmentCode,
            apartmentId: matchedApartment ? matchedApartment.id : null,
            reading,
            electricityReading: parsedResult.electricityReading,
            waterReading: parsedResult.waterReading,
            oldElectricityReading,
            oldWaterReading,
            detectedCode: parsedResult.apartmentCode,
            meterType
        });

    } catch (err) {
        console.error('Error analyzing meter image:', err);
        res.status(500).json({ message: 'Lỗi khi phân tích hình ảnh: ' + err.message });
    }
};


// --- Pricing Configuration ---

exports.getPricingConfig = (req, res) => res.json(getPricingConfig());

exports.updatePricingConfig = async (req, res) => {
    try {
        const { config, userId } = req.body;
        if (!config || !userId || userId !== req.user.id)
            return res.status(400).json({ message: 'Thông tin không hợp lệ.' });

        await prisma.pricing_config_history.create({
            data: {
                config_data: config,
                changed_by_user_id: userId,
            },
        });

        updatePricingConfig(config);

        res.status(200).json({ message: 'Cấu hình đã được lưu thành công.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi khi lưu cấu hình.' });
    }
};

exports.getPricingHistory = async (req, res) => {
    try {
        const history = await prisma.pricing_config_history.findMany({
            include: {
                users: {
                    select: { username: true },
                },
            },
            orderBy: { changed_at: 'desc' },
        });

        res.json(
            history.map((h) => ({
                id: h.id,
                config_data: h.config_data,
                changed_at: h.changed_at,
                changed_by_username: h.users ? h.users.username : null,
            }))
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

// --- Recalculate utility costs for existing records ---
// Only recalculates UNPAID records for the current month to protect historical data
// Logic CRUD/cost đã chuyển sang svc.recalculateUtilityCosts (repository + pricing util).
exports.recalculateUtilityCosts = async (req, res) => {
    try {
        const result = await svc.recalculateUtilityCosts();
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.sendBillNotification = async (req, res) => {
    try {
        const { id } = req.params; // utility_record_id
        const record = await prisma.utility_records.findUnique({
            where: { id },
            include: {
                apartments: {
                    include: {
                        occupancies: {
                            include: { residents: true },
                            where: { residents: { is_active: true } },
                        },
                    },
                },
            },
        });

        if (!record) return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });

        const residents = record.apartments.occupancies
            .map((o) => o.residents)
            .filter((r) => r && r.email && r.relationship_status === 'OWNER');

        if (residents.length === 0) {
            return res
                .status(400)
                .json({ message: 'Không tìm thấy cư dân nào là CHỦ HỘ có email trong căn hộ này' });
        }

        const monthYear = `${record.month}/${record.year}`;
        const eCost = Number(record.electricity_cost);
        const wCost = Number(record.water_cost);
        const total = eCost + wCost;
        const formattedTotal = total.toLocaleString('vi-VN') + ' VNĐ';

        // Fetch QR payment config
        const qrSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'] } },
        });
        const qrConfig = {};
        qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

        // Generate QR code URL and transfer content
        let qrCodeUrl = '';
        let transferContent = '';
        if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
            transferContent = formatUtilityTransferContent(
                record.apartments.code,
                record.month,
                record.year
            );
            try {
                qrCodeUrl = generateQRCodeURL(
                    qrConfig.QR_BANK_CODE,
                    qrConfig.QR_BANK_ACCOUNT,
                    total,
                    transferContent,
                    qrConfig.QR_ACCOUNT_NAME
                );
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        }

        const results = [];

        const nextMonthDate = new Date(record.year, record.month, 15); // Deadline: 15th of next month
        const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;

        for (const resident of residents) {
            const variables = {
                resident_name: resident.name,
                apartment_code: record.apartments.code,
                month_year: monthYear,
                elec_cost: eCost.toLocaleString('vi-VN') + ' VNĐ',
                water_cost: wCost.toLocaleString('vi-VN') + ' VNĐ',
                total_cost: formattedTotal,
                qr_code_url: qrCodeUrl,
                bank_account: qrConfig.QR_BANK_ACCOUNT || '',
                account_name: qrConfig.QR_ACCOUNT_NAME || '',
                bank_name: qrConfig.QR_BANK_CODE || '',
                transfer_content: transferContent,

                // New variables for professional template
                elec_old: Number(record.electricity_old_reading).toLocaleString('vi-VN'),
                elec_new: Number(record.electricity_new_reading).toLocaleString('vi-VN'),
                elec_usage: Number(record.electricity_consumption).toLocaleString('vi-VN'),
                water_old: Number(record.water_old_reading).toLocaleString('vi-VN'),
                water_new: Number(record.water_new_reading).toLocaleString('vi-VN'),
                water_usage: Number(record.water_consumption).toLocaleString('vi-VN'),
                deadline: deadline,
            };

            const rendered = await getRenderedContent('UTILITY_BILL', variables);
            const subject = rendered ? rendered.subject : `[Gen] Thông báo phí ${monthYear}`;
            const html = rendered
                ? rendered.html
                : `<p>Hóa đơn tháng ${monthYear}: ${formattedTotal}</p>`;

            await sendEmail(resident.email, subject, html);
            results.push(resident.email);
        }

        // Update email_sent_at
        await prisma.utility_records.update({
            where: { id },
            data: { email_sent_at: new Date() },
        });

        await logActivity(
            req.user,
            'GỬI_EMAIL',
            'UTILITY',
            id,
            `Bill ${monthYear}`,
            `Gửi hóa đơn tới ${results.join(', ')}`
        );

        res.json({ message: `Đã gửi email thành công tới ${results.length} cư dân.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi gửi email' });
    }
};

exports.sendBulkBillNotification = async (req, res) => {
    const { month, year } = req.body;
    try {
        const records = await prisma.utility_records.findMany({
            where: { month, year },
            include: {
                apartments: {
                    include: {
                        occupancies: {
                            include: { residents: true },
                            where: { residents: { is_active: true } },
                        },
                    },
                },
            },
        });

        let successCount = 0;
        let failCount = 0;
        const details = [];

        // Fetch QR payment config once for all emails
        const qrSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'] } },
        });
        const qrConfig = {};
        qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

        for (const record of records) {
            const residents = record.apartments.occupancies
                .map((o) => o.residents)
                .filter((r) => r && r.email && r.relationship_status === 'OWNER');

            if (residents.length === 0) {
                failCount++;
                details.push({ apartment: record.apartments.code, status: 'No Owner Email' });
                continue;
            }

            const monthYear = `${record.month}/${record.year}`;
            const eCost = Number(record.electricity_cost);
            const wCost = Number(record.water_cost);
            const total = eCost + wCost;
            const formattedTotal = total.toLocaleString('vi-VN') + ' VNĐ';

            // Generate QR code URL for this specific bill
            let qrCodeUrl = '';
            let transferContent = '';
            if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
                transferContent = formatUtilityTransferContent(
                    record.apartments.code,
                    record.month,
                    record.year
                );
                try {
                    qrCodeUrl = generateQRCodeURL(
                        qrConfig.QR_BANK_CODE,
                        qrConfig.QR_BANK_ACCOUNT,
                        total,
                        transferContent,
                        qrConfig.QR_ACCOUNT_NAME
                    );
                } catch (error) {
                    console.error(`Error generating QR code for ${record.apartments.code}:`, error);
                }
            }

            const nextMonthDate = new Date(record.year, record.month, 15); // Deadline: 15th of next month
            const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;

            try {
                let sent = false;
                for (const resident of residents) {
                    const variables = {
                        resident_name: resident.name,
                        apartment_code: record.apartments.code,
                        month_year: monthYear,
                        elec_cost: eCost.toLocaleString('vi-VN') + ' VNĐ',
                        water_cost: wCost.toLocaleString('vi-VN') + ' VNĐ',
                        total_cost: formattedTotal,
                        qr_code_url: qrCodeUrl,
                        bank_account: qrConfig.QR_BANK_ACCOUNT || '',
                        account_name: qrConfig.QR_ACCOUNT_NAME || '',
                        bank_name: qrConfig.QR_BANK_CODE || '',
                        transfer_content: transferContent,

                        // New variables for professional template
                        elec_old: Number(record.electricity_old_reading).toLocaleString('vi-VN'),
                        elec_new: Number(record.electricity_new_reading).toLocaleString('vi-VN'),
                        elec_usage: Number(record.electricity_consumption).toLocaleString('vi-VN'),
                        water_old: Number(record.water_old_reading).toLocaleString('vi-VN'),
                        water_new: Number(record.water_new_reading).toLocaleString('vi-VN'),
                        water_usage: Number(record.water_consumption).toLocaleString('vi-VN'),
                        deadline: deadline,
                    };

                    const rendered = await getRenderedContent('UTILITY_BILL', variables);
                    const subject = rendered
                        ? rendered.subject
                        : `[Gen] Thông báo phí ${monthYear}`;
                    const html = rendered
                        ? rendered.html
                        : `<p>Hóa đơn tháng ${monthYear}: ${formattedTotal}</p>`;

                    await sendEmail(resident.email, subject, html);
                    sent = true;
                }

                if (sent) {
                    successCount++;
                    details.push({ apartment: record.apartments.code, status: 'Sent' });
                    // Update timestamp
                    await prisma.utility_records.update({
                        where: { id: record.id },
                        data: { email_sent_at: new Date() },
                    });
                } else {
                    failCount++;
                    details.push({ apartment: record.apartments.code, status: 'Failed' });
                }
            } catch (error) {
                console.error(`Failed for ${record.apartments.code}`, error);
                failCount++;
                details.push({ apartment: record.apartments.code, status: 'Error' });
            }
        }

        await logActivity(
            req.user,
            'GỬI_EMAIL',
            'UTILITY',
            'BULK',
            `Bulk Bill ${month}/${year}`,
            `Gửi ${successCount} thành công, ${failCount} thất bại`
        );

        res.json({
            total: records.length,
            success: successCount,
            failed: failCount,
            details,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi gửi email hàng loạt' });
    }
};

exports.previewBillNotification = async (req, res) => {
    const { id } = req.params;
    try {
        const record = await prisma.utility_records.findUnique({
            where: { id },
            include: {
                apartments: {
                    include: {
                        occupancies: {
                            include: { residents: true },
                            where: { residents: { is_active: true } },
                        },
                    },
                },
            },
        });

        if (!record) return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });

        const resident =
            record.apartments.occupancies
                .map((o) => o.residents)
                .filter((r) => r && r.email && r.relationship_status === 'OWNER')[0] ||
            record.apartments.occupancies.map((o) => o.residents).filter((r) => r && r.email)[0]; // Fallback to any resident if no owner found for preview purposes

        if (!resident) {
            // Mock data for preview if no resident
            // ... (keep existing mock logic if needed or just return error)
            // For now assuming existing logic handles this or falls back.
            // In original file, it returned mock if !resident or kept going.
        }

        const monthYear = `${record.month}/${record.year}`;
        const eCost = Number(record.electricity_cost);
        const wCost = Number(record.water_cost);
        const total = eCost + wCost;
        const formattedTotal = total.toLocaleString('vi-VN') + ' VNĐ';

        // Fetch QR payment config
        const qrSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'] } },
        });
        const qrConfig = {};
        qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

        // Generate QR code URL and transfer content
        let qrCodeUrl = '';
        let transferContent = '';
        if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
            transferContent = formatUtilityTransferContent(
                record.apartments.code,
                record.month,
                record.year
            );
            try {
                qrCodeUrl = generateQRCodeURL(
                    qrConfig.QR_BANK_CODE,
                    qrConfig.QR_BANK_ACCOUNT,
                    total,
                    transferContent,
                    qrConfig.QR_ACCOUNT_NAME
                );
            } catch (error) {
                console.error('Error generating QR code for preview:', error);
            }
        }

        const nextMonthDate = new Date(record.year, record.month, 15); // Deadline: 15th of next month
        const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;

        const variables = {
            resident_name: resident
                ? resident.name
                : res.locals?.mock?.name || 'Nguyễn Văn A (Mẫu)',
            apartment_code: record.apartments.code,
            month_year: monthYear,
            elec_cost: eCost.toLocaleString('vi-VN') + ' VNĐ',
            water_cost: wCost.toLocaleString('vi-VN') + ' VNĐ',
            total_cost: formattedTotal,
            qr_code_url: qrCodeUrl,
            bank_account: qrConfig.QR_BANK_ACCOUNT || res.locals?.mock?.bank_account || '',
            account_name: qrConfig.QR_ACCOUNT_NAME || res.locals?.mock?.account_name || '',
            bank_name: qrConfig.QR_BANK_CODE || res.locals?.mock?.bank_name || '',
            transfer_content: transferContent,

            // New variables for professional template
            elec_old: Number(record.electricity_old_reading).toLocaleString('vi-VN'),
            elec_new: Number(record.electricity_new_reading).toLocaleString('vi-VN'),
            elec_usage: Number(record.electricity_consumption).toLocaleString('vi-VN'),
            water_old: Number(record.water_old_reading).toLocaleString('vi-VN'),
            water_new: Number(record.water_new_reading).toLocaleString('vi-VN'),
            water_usage: Number(record.water_consumption).toLocaleString('vi-VN'),
            deadline: deadline,
        };

        const rendered = await getRenderedContent('UTILITY_BILL', variables);

        // If no template in DB, render simple fallback
        if (!rendered) {
            return res.json({
                subject: `Preview: Thông báo phí ${monthYear}`,
                html: `<p>Template chưa cấu hình.</p>`,
            });
        }

        res.json({
            subject: rendered.subject,
            html: rendered.html,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi preview email' });
    }
};

exports.generateBatchQRZip = async (req, res) => {
    // Requires month, year.
    const { month, year } = req.body;

    if (!month || !year) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tháng và năm.' });
    }

    try {
        const archiver = require('archiver');

        // 1. Fetch Utility Records
        const records = await prisma.utility_records.findMany({
            where: { month: Number(month), year: Number(year) },
            include: {
                apartments: true,
            },
        });

        if (records.length === 0) {
            return res.status(404).json({ message: 'Không có dữ liệu hóa đơn cho thời gian này.' });
        }

        // 2. Fetch QR Config
        const qrSettings = await prisma.system_settings.findMany({
            where: { key: { in: ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'] } },
        });
        const qrConfig = {};
        qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

        if (!qrConfig.QR_BANK_CODE || !qrConfig.QR_BANK_ACCOUNT) {
            return res
                .status(400)
                .json({ message: 'Chưa cấu hình thông tin tài khoản ngân hàng.' });
        }

        // 3. Setup Response Stream
        res.attachment(`QR_ThanhToan_${month}_${year}.zip`);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            console.error('Archiver error:', err);
            if (!res.headersSent) res.status(500).json({ message: 'Lỗi tạo file zip' });
        });

        archive.pipe(res);

        // 4. Loop records and add to archive
        for (const record of records) {
            const apartmentCode = record.apartments.code;
            const total = Number(record.electricity_cost) + Number(record.water_cost);

            // Format content: EW-[Code]-[M] [Y]
            const transferContent = formatUtilityTransferContent(
                apartmentCode,
                record.month,
                record.year
            );

            // Generate VietQR URL
            const qrUrl = generateQRCodeURL(
                qrConfig.QR_BANK_CODE,
                qrConfig.QR_BANK_ACCOUNT,
                total,
                transferContent,
                qrConfig.QR_ACCOUNT_NAME
            );

            try {
                // Fetch image buffer
                const response = await fetch(qrUrl);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    // Add file to zip
                    archive.append(buffer, { name: `${apartmentCode}_T${month}_${year}.png` });
                } else {
                    console.error(
                        `Failed to fetch QR for ${apartmentCode}: ${response.statusText}`
                    );
                }
            } catch (err) {
                console.error(`Error processing QR for ${apartmentCode}`, err);
            }
        }

        await archive.finalize();
    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ message: 'Lỗi máy chủ khi tạo QR batch' });
    }
};

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus, paidDate } = req.body;

        if (!['PAID', 'UNPAID'].includes(paymentStatus)) {
            return res.status(400).json({ message: 'Trạng thái thanh toán không hợp lệ' });
        }

        const record = await prisma.utility_records.findUnique({
            where: { id },
            include: { apartments: true }, // Include apartment to get code
        });

        if (!record) {
            return res.status(404).json({ message: 'Không tìm thấy bản ghi' });
        }

        const updatedRecord = await prisma.utility_records.update({
            where: { id },
            data: {
                payment_status: paymentStatus,
                paid_date: paymentStatus === 'PAID' && paidDate ? new Date(paidDate) : null,
            },
        });

        await logActivity(
            req.user,
            'UPDATE',
            'UTILITY',
            id,
            `${record.apartments.code} - ${record.month}/${record.year}`,
            `Cập nhật trạng thái thanh toán: ${paymentStatus}`
        );

        if (paymentStatus === 'PAID') {
            const totalPaid = Number(updatedRecord.electricity_cost || 0) + Number(updatedRecord.water_cost || 0);
            const { sendPaymentThankYou } = require('../services/notificationService');
            sendPaymentThankYou({
                apartmentId: updatedRecord.apartment_id,
                amount: totalPaid,
                month: updatedRecord.month,
                year: updatedRecord.year,
                paymentMethod: 'Chuyển khoản',
                paymentDate: updatedRecord.paid_date || new Date(),
            }).catch(console.error);

            createNotificationRecord({
                type: 'payment_confirmation',
                recipient: { apartmentId: updatedRecord.apartment_id },
                payload: {
                    title: 'Thanh toán điện nước thành công',
                    body: `Căn hộ ${record.apartments.code} đã thanh toán hóa đơn tháng ${updatedRecord.month}/${updatedRecord.year}`,
                    url: '/?tab=utilities',
                    tag: `utility-paid-${updatedRecord.id}`,
                },
            }).catch((err) => console.error('[NotificationService] enqueue error:', err.message));
        }

        res.json(svc.formatUtilityRecord(updatedRecord));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi cập nhật trạng thái thanh toán' });
    }
};

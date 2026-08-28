const svc = require('../services/residentService');
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const { generateRandomId } = require('../utils/helpers');

const SALT_ROUNDS = 10;

// --- Residents CRUD (thin controller: HTTP in/out only) ---

exports.getAllResidents = async (req, res) => {
    try {
        res.json(await svc.getAllResidents());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.createResident = async (req, res) => {
    try {
        const resident = await svc.createResident(req.body);
        res.status(201).json(resident);
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ message: err.status ? err.message : 'Lỗi máy chủ' });
    }
};

exports.updateResident = async (req, res) => {
    try {
        res.json(await svc.updateResident(req.params.id, req.body));
    } catch (err) {
        console.error('Error updating resident:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ message: 'Không tìm thấy cư dân' });
        }
        res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
    }
};

exports.updateResidentStatus = async (req, res) => {
    try {
        res.json(await svc.updateResidentStatus(req.params.id, req.body.isActive));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.updateAmenityAccess = async (req, res) => {
    try {
        res.json(await svc.updateAmenityAccess(req.params.id, req.body.canUseAmenities));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

// --- Resident Accounts ---

exports.getAllResidentAccounts = async (req, res) => {
    try {
        res.json(await svc.getAllResidentAccounts());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.syncResidentAccounts = async (req, res) => {
    try {
        res.json(await svc.syncResidentAccounts());
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.resetResidentPassword = async (req, res) => {
    try {
        res.json(await svc.resetResidentPassword(req.params.residentId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.deleteResident = async (req, res) => {
    try {
        res.json(await svc.deleteResident(req.params.id));
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({ message: err.message });
        }
        console.error('Error deleting resident:', err);
        res.status(500).json({ message: 'Lỗi máy chủ: ' + err.message });
    }
};


const ExcelJS = require('exceljs');
const { logActivity } = require('../utils/logger');

// --- Download Resident Excel Template ---
exports.downloadResidentTemplate = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Thành Phố Cà Phê';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Danh Sách Cư Dân', {
            views: [{ showGridLines: true }],
        });

        // Title Row
        worksheet.mergeCells('A1:L1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'DANH SÁCH IMPORT CƯ DÂN - KHU ĐÔ THỊ THÀNH PHỐ CÀ PHÊ';
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF122120' }, // Dark Green Brand
        };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 40;

        // Subtitle / Guide Row
        worksheet.mergeCells('A2:L2');
        const subCell = worksheet.getCell('A2');
        subCell.value = 'Lưu ý: Cột "Họ và tên" là bắt buộc. Quan hệ chọn: CHỦ HỘ, GIA ĐÌNH hoặc KHÁCH THUÊ. Mã căn hộ theo đúng định dạng (VD: CAN01-01, TES01-02).';
        subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } };
        subCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F0' },
        };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).height = 24;

        // Header Columns
        const headers = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Họ và tên (*)', key: 'name', width: 26 },
            { header: 'Số CCCD / CMND', key: 'idNumber', width: 20 },
            { header: 'Số điện thoại', key: 'phoneNumber', width: 18 },
            { header: 'Email', key: 'email', width: 26 },
            { header: 'Mã Căn Hộ', key: 'apartmentCode', width: 18 },
            { header: 'Quan Hệ (*)', key: 'relationshipStatus', width: 18 },
            { header: 'Ngày sinh (DD/MM/YYYY)', key: 'dob', width: 22 },
            { header: 'Tiện Ích VIP (CÓ/KHÔNG)', key: 'canUseAmenities', width: 22 },
            { header: 'Tên Công Ty (Nếu có)', key: 'companyName', width: 28 },
            { header: 'Mã Số Thuế', key: 'taxCode', width: 18 },
            { header: 'Địa Chỉ Xuất Hóa Đơn', key: 'invoiceAddress', width: 35 },
        ];

        const headerRow = worksheet.getRow(4);
        headers.forEach((col, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = col.header;
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF8A6240' }, // Amber Coffee Brand
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            };
            worksheet.getColumn(index + 1).width = col.width;
        });
        headerRow.height = 30;

        // Sample Data Rows
        const sampleData = [
            [1, 'Nguyễn Văn An', '079090001234', '0901234567', 'an.nguyen@example.com', 'CAN01-01', 'CHỦ HỘ', '15/05/1985', 'CÓ', '', '', ''],
            [2, 'Trần Thị Mai', '079192005678', '0912345678', 'mai.tran@example.com', 'CAN01-01', 'GIA ĐÌNH', '20/10/1988', 'CÓ', '', '', ''],
            [3, 'Công Ty TNHH Cà Phê Xanh', '', '02623888999', 'contact@caphexanh.vn', 'TES01-05', 'CHỦ HỘ', '', 'CÓ', 'Công Ty TNHH Cà Phê Xanh', '6001234567', 'Đường Nguyễn Đình Chiểu, P. Tân Lợi, TP. Buôn Ma Thuột'],
            [4, 'Lê Hoàng Nam', '079095009876', '0933445566', 'nam.le@example.com', 'TES01-05', 'KHÁCH THUÊ', '12/03/1992', 'CÓ', '', '', ''],
            [5, 'Phạm Thu Trang', '079199003322', '0988776655', 'trang.pham@example.com', 'CAN02-08', 'CHỦ HỘ', '08/09/1990', 'CÓ', '', '', ''],
        ];

        sampleData.forEach((rowValues, rowIndex) => {
            const row = worksheet.getRow(5 + rowIndex);
            rowValues.forEach((val, colIndex) => {
                const cell = row.getCell(colIndex + 1);
                cell.value = val;
                cell.font = { name: 'Arial', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [0, 5, 6, 7, 8].includes(colIndex) ? 'center' : 'left',
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE5E5E5' } },
                    left: { style: 'thin', color: { argb: 'FFE5E5E5' } },
                    bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } },
                    right: { style: 'thin', color: { argb: 'FFE5E5E5' } },
                };
            });
            row.height = 24;
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="Mau_Import_Danh_Sach_Cu_Dan.xlsx"'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error generating resident template:', err);
        res.status(500).json({ message: 'Lỗi tạo file mẫu Excel: ' + err.message });
    }
};

// Helper: Parse DD/MM/YYYY date
function parseDateString(str) {
    if (!str) return null;
    if (str instanceof Date) return isNaN(str.getTime()) ? null : str;
    const s = String(str).trim();
    if (!s) return null;

    // Format DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})$/);
    if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1;
        const year = parseInt(dmy[3], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
    }

    // Format YYYY-MM-DD
    const ymd = s.match(/^(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})$/);
    if (ymd) {
        const year = parseInt(ymd[1], 10);
        const month = parseInt(ymd[2], 10) - 1;
        const day = parseInt(ymd[3], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

// --- Import Residents from Excel / JSON ---
exports.importResidents = async (req, res) => {
    try {
        let rows = [];

        // Check if file was uploaded via multipart/form-data
        if (req.file && req.file.buffer) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(req.file.buffer);
            const worksheet = workbook.worksheets[0];

            if (!worksheet) {
                return res.status(400).json({ message: 'File Excel không có dữ liệu sheet!' });
            }

            // Find header row (search first 10 rows for "Họ và tên" or "name")
            let headerRowIndex = 4;
            worksheet.eachRow((r, rowNumber) => {
                if (rowNumber <= 10) {
                    const rowStr = JSON.stringify(r.values).toLowerCase();
                    if (rowStr.includes('họ và tên') || rowStr.includes('họ tên') || rowStr.includes('name')) {
                        headerRowIndex = rowNumber;
                    }
                }
            });

            worksheet.eachRow((r, rowNumber) => {
                if (rowNumber > headerRowIndex) {
                    const name = r.getCell(2).text ? r.getCell(2).text.trim() : (r.getCell(2).value ? String(r.getCell(2).value).trim() : '');
                    if (name) {
                        rows.push({
                            name: name,
                            idNumber: r.getCell(3).text ? r.getCell(3).text.trim() : (r.getCell(3).value ? String(r.getCell(3).value).trim() : ''),
                            phoneNumber: r.getCell(4).text ? r.getCell(4).text.trim() : (r.getCell(4).value ? String(r.getCell(4).value).trim() : ''),
                            email: r.getCell(5).text ? r.getCell(5).text.trim() : (r.getCell(5).value ? String(r.getCell(5).value).trim() : ''),
                            apartmentCode: r.getCell(6).text ? r.getCell(6).text.trim() : (r.getCell(6).value ? String(r.getCell(6).value).trim() : ''),
                            relationshipStatus: r.getCell(7).text ? r.getCell(7).text.trim() : (r.getCell(7).value ? String(r.getCell(7).value).trim() : ''),
                            dob: r.getCell(8).text ? r.getCell(8).text.trim() : (r.getCell(8).value ? String(r.getCell(8).value).trim() : ''),
                            canUseAmenities: r.getCell(9).text ? r.getCell(9).text.trim() : (r.getCell(9).value ? String(r.getCell(9).value).trim() : ''),
                            companyName: r.getCell(10).text ? r.getCell(10).text.trim() : (r.getCell(10).value ? String(r.getCell(10).value).trim() : ''),
                            taxCode: r.getCell(11).text ? r.getCell(11).text.trim() : (r.getCell(11).value ? String(r.getCell(11).value).trim() : ''),
                            invoiceAddress: r.getCell(12).text ? r.getCell(12).text.trim() : (r.getCell(12).value ? String(r.getCell(12).value).trim() : ''),
                        });
                    }
                }
            });
        } else if (req.body.residents && Array.isArray(req.body.residents)) {
            rows = req.body.residents;
        } else {
            return res.status(400).json({ message: 'Vui lòng chọn file Excel hoặc gửi mảng residents hợp lệ!' });
        }

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Không tìm thấy dữ liệu cư dân hợp lệ trong file!' });
        }

        const autoCreateAccount = req.body.autoCreateAccount !== false && req.body.autoCreateAccount !== 'false';
        const updateExisting = req.body.updateExisting !== false && req.body.updateExisting !== 'false';

        // Load existing apartments for fast lookup
        const allApartments = await prisma.apartments.findMany({
            select: { id: true, code: true },
        });
        const aptMap = new Map();
        allApartments.forEach((a) => {
            aptMap.set(a.code.toUpperCase().trim(), a.id);
        });

        // Load existing residents for duplicate checking
        const existingResidents = await prisma.residents.findMany({
            select: { id: true, name: true, id_number: true, phone_number: true },
        });

        let insertedCount = 0;
        let updatedCount = 0;
        const errors = [];
        const defaultPasswordHash = await bcrypt.hash('123456', SALT_ROUNDS);

        for (let i = 0; i < rows.length; i++) {
            const item = rows[i];
            const rowNum = i + 1;
            const name = item.name ? String(item.name).trim() : '';
            if (!name) {
                errors.push({ row: rowNum, error: 'Thiếu họ và tên' });
                continue;
            }

            const idNumber = item.idNumber ? String(item.idNumber).trim() : null;
            const phoneNumber = item.phoneNumber ? String(item.phoneNumber).trim().replace(/\s+/g, '') : null;
            const email = item.email ? String(item.email).trim() : null;
            const companyName = item.companyName ? String(item.companyName).trim() : null;
            const taxCode = item.taxCode ? String(item.taxCode).trim() : null;
            const invoiceAddress = item.invoiceAddress ? String(item.invoiceAddress).trim() : null;
            const dob = parseDateString(item.dob);

            // Normalize relationship
            let rel = 'FAMILY';
            const relRaw = (item.relationshipStatus || '').toUpperCase().trim();
            if (relRaw.includes('CHỦ') || relRaw === 'OWNER') {
                rel = 'OWNER';
            } else if (relRaw.includes('THUÊ') || relRaw === 'TENANT') {
                rel = 'TENANT';
            }

            // Normalize amenities
            let canUse = true;
            const amenRaw = (item.canUseAmenities || '').toUpperCase().trim();
            if (amenRaw.includes('KHÔNG') || amenRaw === 'FALSE' || amenRaw === 'NO') {
                canUse = false;
            }

            // Check if resident exists
            let existing = null;
            if (idNumber) {
                existing = existingResidents.find((r) => r.id_number && r.id_number.trim() === idNumber);
            }
            if (!existing && phoneNumber) {
                existing = existingResidents.find((r) => r.phone_number && r.phone_number.trim() === phoneNumber);
            }

            let residentId = null;

            try {
                if (existing && updateExisting) {
                    // Update existing resident
                    residentId = existing.id;
                    await prisma.residents.update({
                        where: { id: residentId },
                        data: {
                            name: name || existing.name,
                            dob: dob !== undefined ? dob : undefined,
                            id_number: idNumber || undefined,
                            phone_number: phoneNumber || undefined,
                            email: email || undefined,
                            relationship_status: rel,
                            can_use_amenities: canUse,
                            company_name: companyName,
                            tax_code: taxCode,
                            invoice_address: invoiceAddress,
                        },
                    });
                    updatedCount++;
                } else if (!existing) {
                    // Create new resident
                    residentId = `res_${generateRandomId()}`;
                    await prisma.residents.create({
                        data: {
                            id: residentId,
                            name,
                            dob,
                            id_number: idNumber,
                            phone_number: phoneNumber,
                            email,
                            relationship_status: rel,
                            can_use_amenities: canUse,
                            company_name: companyName,
                            tax_code: taxCode,
                            invoice_address: invoiceAddress,
                            is_active: true,
                        },
                    });
                    insertedCount++;
                    existingResidents.push({ id: residentId, name, id_number: idNumber, phone_number: phoneNumber });
                } else {
                    // Skip or log duplicate
                    residentId = existing.id;
                }

                // Link to Apartment if apartmentCode is supplied
                if (residentId && item.apartmentCode) {
                    const aptCodes = String(item.apartmentCode)
                        .split(/[,;/+]/)
                        .map((s) => s.toUpperCase().trim())
                        .filter(Boolean);

                    for (const code of aptCodes) {
                        const apartmentId = aptMap.get(code);
                        if (apartmentId) {
                            await prisma.occupancies.upsert({
                                where: {
                                    apartment_id_resident_id: {
                                        apartment_id: apartmentId,
                                        resident_id: residentId,
                                    },
                                },
                                create: {
                                    apartment_id: apartmentId,
                                    resident_id: residentId,
                                },
                                update: {},
                            });
                        }
                    }
                }

                // Auto create resident account if requested
                if (residentId && autoCreateAccount) {
                    const accountExists = await prisma.resident_accounts.findUnique({
                        where: { resident_id: residentId },
                    });
                    if (!accountExists) {
                        await prisma.resident_accounts.create({
                            data: {
                                resident_id: residentId,
                                password_hash: defaultPasswordHash,
                            },
                        });
                    }
                }
            } catch (err) {
                console.error(`Lỗi xử lý dòng ${rowNum} (${name}):`, err);
                errors.push({ row: rowNum, name, error: err.message });
            }
        }

        // Log admin activity
        if (req.user) {
            await logActivity(
                req.user.id,
                req.user.username,
                'IMPORT_RESIDENTS',
                'RESIDENT',
                null,
                'Import Cư Dân',
                `Đã import thành công: ${insertedCount} thêm mới, ${updatedCount} cập nhật, ${errors.length} lỗi.`
            );
        }

        res.json({
            message: `Import cư dân thành công: Thêm mới ${insertedCount} cư dân, cập nhật ${updatedCount} cư dân.`,
            total: rows.length,
            insertedCount,
            updatedCount,
            errorCount: errors.length,
            errors,
        });
    } catch (err) {
        console.error('Error importing residents:', err);
        res.status(500).json({ message: 'Lỗi import danh sách cư dân: ' + err.message });
    }
};

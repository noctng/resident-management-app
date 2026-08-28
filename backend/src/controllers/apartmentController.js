const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');

exports.getAllApartments = async (req, res) => {
    try {
        const { phase, status, search } = req.query;

        const where = {};
        if (phase && phase !== 'all' && phase !== 'ALL') {
            where.phase_code = phase;
        }
        if (status && status !== 'all' && status !== 'ALL') {
            where.sales_status = status;
        }
        if (search) {
            where.OR = [
                { code: { contains: search, mode: 'insensitive' } },
                { block_code: { contains: search, mode: 'insensitive' } },
                { lot_number: { contains: search, mode: 'insensitive' } },
            ];
        }

        const apartments = await prisma.apartments.findMany({
            where,
            orderBy: [
                { phase_code: 'asc' },
                { block_code: 'asc' },
                { code: 'asc' },
            ],
            include: {
                occupancies: {
                    include: {
                        residents: {
                            select: {
                                id: true,
                                name: true,
                                phone_number: true,
                                relationship_status: true,
                                email: true,
                                is_active: true,
                            },
                        },
                    },
                },
                contracts: {
                    select: {
                        id: true,
                        contract_code: true,
                        status: true,
                        customer_id: true,
                        total_value: true,
                        customers: {
                            select: { id: true, name: true, phone_number: true },
                        },
                    },
                },
            },
        });

        const mapped = apartments.map((a) => {
            const landPrice = Number(a.land_price_before_vat || 0);
            const constPrice = Number(a.construction_price_before_vat || 0);
            const subtotal = landPrice + constPrice;
            const vatRate = Number(a.vat_rate || 8);
            const vatAmt = Math.round((subtotal * vatRate) / 100);
            const maintFee = Number(a.maintenance_fee_2pct || Math.round(subtotal * 0.02));
            const grandTotal = subtotal + vatAmt + maintFee;

            const residentList = (a.occupancies || []).map((o) => ({
                id: o.residents.id,
                name: o.residents.name,
                phoneNumber: o.residents.phone_number,
                relationshipStatus: o.residents.relationship_status,
                email: o.residents.email,
                isActive: o.residents.is_active,
            }));

            return {
                id: a.id,
                houseType: a.house_type,
                code: a.code,
                floor: a.floor,
                area: parseFloat(a.area || a.land_area || 0),
                electricityType: a.electricity_type,
                
                // CRM standard fields
                phase_code: a.phase_code || 'CANTATA',
                phaseCode: a.phase_code || 'CANTATA',
                block_code: a.block_code || a.code.split('-')[0] || 'Dãy 01',
                blockCode: a.block_code || a.code.split('-')[0] || 'Dãy 01',
                lot_number: a.lot_number || a.code,
                lotNumber: a.lot_number || a.code,
                
                // 4 Area Metrics
                land_area: parseFloat(a.land_area || a.area || 0),
                landArea: parseFloat(a.land_area || a.area || 0),
                construction_area: parseFloat(a.construction_area || (Number(a.area) * 1.2) || 0),
                constructionArea: parseFloat(a.construction_area || (Number(a.area) * 1.2) || 0),
                usable_area: parseFloat(a.usable_area || a.construction_area || 0),
                usableArea: parseFloat(a.usable_area || a.construction_area || 0),
                certificate_area: parseFloat(a.certificate_area || a.land_area || a.area || 0),
                certificateArea: parseFloat(a.certificate_area || a.land_area || a.area || 0),

                // Two-Component Pricing
                land_price_before_vat: landPrice,
                landPrice,
                construction_price_before_vat: constPrice,
                constructionPrice: constPrice,
                vat_rate: vatRate,
                vatRate,
                maintenance_fee_2pct: maintFee,
                maintenanceFee2pct: maintFee,
                subtotal,
                vatAmount: vatAmt,
                grand_total: grandTotal,
                grandTotal,

                // Specs & Status
                sales_status: a.sales_status || 'HANDED_OVER',
                salesStatus: a.sales_status || 'HANDED_OVER',
                direction: a.direction || 'Đông Nam',
                view_description: a.view_description || '',
                viewDescription: a.view_description || '',
                bedroom_count: a.bedroom_count || 3,
                bedroomCount: a.bedroom_count || 3,
                bathroom_count: a.bathroom_count || 3,
                bathroomCount: a.bathroom_count || 3,

                // Associated Residents & Contract
                residents: residentList,
                contracts: a.contracts || [],
                residentCount: residentList.length,
            };
        });

        res.json(mapped);
    } catch (err) {
        console.error('Lỗi lấy danh sách căn hộ admin:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.createApartment = async (req, res) => {
    try {
        const {
            houseType = 'SHOPHOUSE',
            code,
            floor = 1,
            area = 100,
            electricityType = 'RESIDENTIAL',
            phase_code = 'CANTATA',
            phaseCode,
            block_code,
            blockCode,
            lot_number,
            lotNumber,
            land_area,
            landArea,
            construction_area,
            constructionArea,
            usable_area,
            usableArea,
            certificate_area,
            certificateArea,
            land_price_before_vat = 0,
            landPrice,
            construction_price_before_vat = 0,
            constructionPrice,
            vat_rate = 8.00,
            vatRate,
            direction = 'Đông Nam',
            view_description,
            viewDescription,
            bedroom_count = 3,
            bedroomCount,
            bathroom_count = 3,
            bathroomCount,
            sales_status = 'HANDED_OVER',
            salesStatus,
        } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Vui lòng nhập Mã Căn' });
        }

        const existing = await prisma.apartments.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ message: `Mã căn ${code} đã tồn tại!` });
        }

        const phase = phaseCode || phase_code;
        const blk = blockCode || block_code || 'Dãy 01';
        const lot = lotNumber || lot_number || code;
        const lArea = Number(landArea || land_area || area);
        const cArea = Number(constructionArea || construction_area || (lArea * 1.2));
        const lPrice = Number(landPrice !== undefined ? landPrice : land_price_before_vat);
        const cPrice = Number(constructionPrice !== undefined ? constructionPrice : construction_price_before_vat);
        const subtotal = lPrice + cPrice;
        const maintFee = Math.round(subtotal * 0.02);

        const newApartment = await prisma.apartments.create({
            data: {
                house_type: houseType,
                code,
                floor: Number(floor),
                area: lArea,
                electricity_type: electricityType,
                phase_code: phase,
                block_code: blk,
                lot_number: lot,
                land_area: lArea,
                construction_area: cArea,
                usable_area: Number(usableArea || usable_area || cArea),
                certificate_area: Number(certificateArea || certificate_area || lArea),
                land_price_before_vat: lPrice,
                construction_price_before_vat: cPrice,
                vat_rate: Number(vatRate || vat_rate || (phase === 'NOXH' ? 5.00 : 8.00)),
                maintenance_fee_2pct: maintFee,
                direction: direction || 'Đông Nam',
                view_description: viewDescription || view_description || '',
                bedroom_count: Number(bedroomCount || bedroom_count || 3),
                bathroom_count: Number(bathroomCount || bathroom_count || 3),
                sales_status: salesStatus || sales_status || 'HANDED_OVER',
            },
        });

        if (req.user) {
            await logActivity(
                req.user,
                'TẠO_CĂN_HỘ',
                'APARTMENT',
                newApartment.id,
                newApartment.code,
                `Thêm căn hộ ${newApartment.code} (${phase})`
            );
        }

        res.status(201).json({
            id: newApartment.id,
            houseType: newApartment.house_type,
            code: newApartment.code,
            floor: newApartment.floor,
            area: parseFloat(newApartment.area),
            electricityType: newApartment.electricity_type,
            phase_code: newApartment.phase_code,
            sales_status: newApartment.sales_status,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.updateApartment = async (req, res) => {
    try {
        const {
            houseType,
            code,
            floor,
            area,
            electricityType,
            phase_code,
            phaseCode,
            block_code,
            blockCode,
            lot_number,
            lotNumber,
            land_area,
            landArea,
            construction_area,
            constructionArea,
            usable_area,
            usableArea,
            certificate_area,
            certificateArea,
            land_price_before_vat,
            landPrice,
            construction_price_before_vat,
            constructionPrice,
            vat_rate,
            vatRate,
            direction,
            view_description,
            viewDescription,
            bedroom_count,
            bedroomCount,
            bathroom_count,
            bathroomCount,
            sales_status,
            salesStatus,
        } = req.body;

        const existing = await prisma.apartments.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ message: 'Không tìm thấy căn hộ' });
        }

        const lArea = landArea !== undefined ? Number(landArea) : (land_area !== undefined ? Number(land_area) : (area !== undefined ? Number(area) : existing.land_area));
        const cArea = constructionArea !== undefined ? Number(constructionArea) : (construction_area !== undefined ? Number(construction_area) : existing.construction_area);
        const lPrice = landPrice !== undefined ? Number(landPrice) : (land_price_before_vat !== undefined ? Number(land_price_before_vat) : Number(existing.land_price_before_vat || 0));
        const cPrice = constructionPrice !== undefined ? Number(constructionPrice) : (construction_price_before_vat !== undefined ? Number(construction_price_before_vat) : Number(existing.construction_price_before_vat || 0));
        const subtotal = lPrice + cPrice;
        const maintFee = Math.round(subtotal * 0.02);

        const updatedApartment = await prisma.apartments.update({
            where: { id: req.params.id },
            data: {
                ...(houseType ? { house_type: houseType } : {}),
                ...(code ? { code } : {}),
                ...(floor !== undefined ? { floor: Number(floor) } : {}),
                ...(lArea !== undefined ? { area: lArea, land_area: lArea } : {}),
                ...(electricityType ? { electricity_type: electricityType } : {}),
                ...((phaseCode || phase_code) ? { phase_code: phaseCode || phase_code } : {}),
                ...((blockCode || block_code) ? { block_code: blockCode || block_code } : {}),
                ...((lotNumber || lot_number) ? { lot_number: lotNumber || lot_number } : {}),
                ...(cArea !== undefined ? { construction_area: cArea } : {}),
                ...((usableArea || usable_area) !== undefined ? { usable_area: Number(usableArea || usable_area) } : {}),
                ...((certificateArea || certificate_area) !== undefined ? { certificate_area: Number(certificateArea || certificate_area) } : {}),
                ...(lPrice !== undefined ? { land_price_before_vat: lPrice } : {}),
                ...(cPrice !== undefined ? { construction_price_before_vat: cPrice } : {}),
                ...((vatRate || vat_rate) !== undefined ? { vat_rate: Number(vatRate || vat_rate) } : {}),
                maintenance_fee_2pct: maintFee,
                ...(direction !== undefined ? { direction } : {}),
                ...((viewDescription || view_description) !== undefined ? { view_description: viewDescription || view_description } : {}),
                ...((bedroomCount || bedroom_count) !== undefined ? { bedroom_count: Number(bedroomCount || bedroom_count) } : {}),
                ...((bathroomCount || bathroom_count) !== undefined ? { bathroom_count: Number(bathroomCount || bathroom_count) } : {}),
                ...((salesStatus || sales_status) ? { sales_status: salesStatus || sales_status } : {}),
            },
        });

        if (req.user) {
            await logActivity(
                req.user,
                'CẬP_NHẬT_CĂN_HỘ',
                'APARTMENT',
                updatedApartment.id,
                updatedApartment.code,
                `Cập nhật thông tin căn ${updatedApartment.code}`
            );
        }

        res.json({
            id: updatedApartment.id,
            houseType: updatedApartment.house_type,
            code: updatedApartment.code,
            floor: updatedApartment.floor,
            area: parseFloat(updatedApartment.area),
            electricityType: updatedApartment.electricity_type,
            phase_code: updatedApartment.phase_code,
            sales_status: updatedApartment.sales_status,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.deleteApartment = async (req, res) => {
    try {
        const { id } = req.params;
        const apt = await prisma.apartments.findUnique({
            where: { id },
            include: {
                contracts: true,
                occupancies: true,
            },
        });

        if (!apt) {
            return res.status(404).json({ message: 'Không tìm thấy căn hộ' });
        }

        if (apt.occupancies && apt.occupancies.length > 0) {
            return res.status(400).json({ message: `Không thể xóa căn ${apt.code} vì đang có cư dân ở!` });
        }

        if (apt.contracts && apt.contracts.length > 0) {
            return res.status(400).json({ message: `Không thể xóa căn ${apt.code} vì đã phát sinh Hợp đồng Mua Bán!` });
        }

        await prisma.apartments.delete({ where: { id } });

        if (req.user) {
            await logActivity(
                req.user,
                'XÓA_CĂN_HỘ',
                'APARTMENT',
                id,
                apt.code,
                `Xóa căn hộ ${apt.code}`
            );
        }

        res.json({ message: `Đã xóa căn hộ ${apt.code} thành công` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};


const ExcelJS = require('exceljs');

// --- Download Apartment Excel Template ---
exports.downloadApartmentTemplate = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Thành Phố Cà Phê';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Danh Sách Căn Hộ', {
            views: [{ showGridLines: true }],
        });

        // Title Row
        worksheet.mergeCells('A1:S1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'DANH SÁCH IMPORT CĂN HỘ / BẤT ĐỘNG SẢN - KHU ĐÔ THỊ THÀNH PHỐ CÀ PHÊ';
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF122120' }, // Dark Green Brand
        };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 40;

        // Subtitle / Guide Row
        worksheet.mergeCells('A2:S2');
        const subCell = worksheet.getCell('A2');
        subCell.value = 'Lưu ý: Mã Căn Hộ là duy nhất (VD: CAN01-01, TES01-02). Phân khu chọn: TESLA, CANTATA hoặc NOXH. Tình trạng chọn: DELIVERED (Đã bàn giao), AVAILABLE (Đang mở bán), DEPOSIT (Đã cọc), CONTRACT (Đã ký HĐ).';
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
            { header: 'Mã Căn Hộ (*)', key: 'code', width: 18 },
            { header: 'Phân Khu (*)', key: 'phaseCode', width: 16 },
            { header: 'Block / Dãy', key: 'blockCode', width: 16 },
            { header: 'Lô / Vị Trí', key: 'lotNumber', width: 16 },
            { header: 'Số Tầng (*)', key: 'floor', width: 12 },
            { header: 'Loại Nhà (*)', key: 'houseType', width: 18 },
            { header: 'DT Đất (m²)', key: 'landArea', width: 16 },
            { header: 'DT Xây Dựng (m²)', key: 'constructionArea', width: 18 },
            { header: 'DT Sử Dụng (m²)', key: 'usableArea', width: 18 },
            { header: 'Loại Điện Nước', key: 'electricityType', width: 18 },
            { header: 'Tình Trạng (*)', key: 'salesStatus', width: 18 },
            { header: 'Số Phòng Ngủ', key: 'bedroomCount', width: 14 },
            { header: 'Số Phòng WC', key: 'bathroomCount', width: 14 },
            { header: 'Hướng Nhà', key: 'direction', width: 16 },
            { header: 'Giá Đất Trước VAT (VNĐ)', key: 'landPrice', width: 24 },
            { header: 'Giá XD Trước VAT (VNĐ)', key: 'constructionPrice', width: 24 },
            { header: 'Thuế VAT (%)', key: 'vatRate', width: 14 },
            { header: 'Phí Bảo Trì 2% (VNĐ)', key: 'maintenanceFee', width: 22 },
        ];

        const headerRow = worksheet.getRow(4);
        headers.forEach((col, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = col.header;
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1F5E5B' }, // Teal Brand
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
            [1, 'CAN01-01', 'CANTATA', 'CAN01', 'Lô 01', 3, 'Nhà phố liền kề', 110.0, 280.0, 260.0, 'RESIDENTIAL', 'DELIVERED', 3, 3, 'Đông Nam', 4500000000, 3200000000, 8, 154000000],
            [2, 'CAN01-02', 'CANTATA', 'CAN01', 'Lô 02', 3, 'Nhà phố liền kề', 110.0, 280.0, 260.0, 'RESIDENTIAL', 'DELIVERED', 3, 3, 'Đông Nam', 4500000000, 3200000000, 8, 154000000],
            [3, 'TES01-01', 'TESLA', 'TES01', 'Lô 01', 4, 'Biệt thự song lập', 160.0, 420.0, 390.0, 'RESIDENTIAL', 'DELIVERED', 4, 4, 'Chính Nam', 8500000000, 5800000000, 8, 286000000],
            [4, 'TES01-02', 'TESLA', 'TES01', 'Lô 02', 4, 'Biệt thự song lập', 160.0, 420.0, 390.0, 'RESIDENTIAL', 'AVAILABLE', 4, 4, 'Chính Nam', 8500000000, 5800000000, 8, 286000000],
            [5, 'NOXH01-101', 'NOXH', 'NOXH01', 'Căn 101', 1, 'Căn hộ chung cư', 65.5, 65.5, 60.0, 'RESIDENTIAL', 'DELIVERED', 2, 2, 'Đông Bắc', 800000000, 650000000, 5, 29000000],
        ];

        sampleData.forEach((rowValues, rowIndex) => {
            const row = worksheet.getRow(5 + rowIndex);
            rowValues.forEach((val, colIndex) => {
                const cell = row.getCell(colIndex + 1);
                cell.value = val;
                cell.font = { name: 'Arial', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14].includes(colIndex) ? 'center' : ([7, 8, 9, 15, 16, 17, 18].includes(colIndex) ? 'right' : 'left'),
                };
                if ([15, 16, 18].includes(colIndex) && typeof val === 'number') {
                    cell.numFmt = '#,##0';
                }
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
            'attachment; filename="Mau_Import_Danh_Sach_Can_Ho.xlsx"'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error generating apartment template:', err);
        res.status(500).json({ message: 'Lỗi tạo file mẫu Excel căn hộ: ' + err.message });
    }
};

// --- Import Apartments from Excel / JSON ---
exports.importApartments = async (req, res) => {
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

            // Find header row
            let headerRowIndex = 4;
            worksheet.eachRow((r, rowNumber) => {
                if (rowNumber <= 10) {
                    const rowStr = JSON.stringify(r.values).toLowerCase();
                    if (rowStr.includes('mã căn') || rowStr.includes('mã căn hộ') || rowStr.includes('code')) {
                        headerRowIndex = rowNumber;
                    }
                }
            });

            worksheet.eachRow((r, rowNumber) => {
                if (rowNumber > headerRowIndex) {
                    const code = r.getCell(2).text ? r.getCell(2).text.trim() : (r.getCell(2).value ? String(r.getCell(2).value).trim() : '');
                    if (code) {
                        rows.push({
                            code: code.toUpperCase(),
                            phaseCode: r.getCell(3).text ? r.getCell(3).text.trim() : (r.getCell(3).value ? String(r.getCell(3).value).trim() : ''),
                            blockCode: r.getCell(4).text ? r.getCell(4).text.trim() : (r.getCell(4).value ? String(r.getCell(4).value).trim() : ''),
                            lotNumber: r.getCell(5).text ? r.getCell(5).text.trim() : (r.getCell(5).value ? String(r.getCell(5).value).trim() : ''),
                            floor: r.getCell(6).value ? Number(r.getCell(6).value) : 1,
                            houseType: r.getCell(7).text ? r.getCell(7).text.trim() : (r.getCell(7).value ? String(r.getCell(7).value).trim() : 'Nhà phố'),
                            landArea: r.getCell(8).value ? Number(r.getCell(8).value) : null,
                            constructionArea: r.getCell(9).value ? Number(r.getCell(9).value) : null,
                            usableArea: r.getCell(10).value ? Number(r.getCell(10).value) : null,
                            electricityType: r.getCell(11).text ? r.getCell(11).text.trim() : 'RESIDENTIAL',
                            salesStatus: r.getCell(12).text ? r.getCell(12).text.trim() : 'DELIVERED',
                            bedroomCount: r.getCell(13).value ? Number(r.getCell(13).value) : 3,
                            bathroomCount: r.getCell(14).value ? Number(r.getCell(14).value) : 3,
                            direction: r.getCell(15).text ? r.getCell(15).text.trim() : '',
                            landPrice: r.getCell(16).value ? Number(r.getCell(16).value) : 0,
                            constructionPrice: r.getCell(17).value ? Number(r.getCell(17).value) : 0,
                            vatRate: r.getCell(18).value ? Number(r.getCell(18).value) : 8,
                            maintenanceFee: r.getCell(19).value ? Number(r.getCell(19).value) : 0,
                        });
                    }
                }
            });
        } else if (req.body.apartments && Array.isArray(req.body.apartments)) {
            rows = req.body.apartments;
        } else {
            return res.status(400).json({ message: 'Vui lòng chọn file Excel hoặc gửi mảng apartments hợp lệ!' });
        }

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Không tìm thấy dữ liệu căn hộ hợp lệ trong file!' });
        }

        const updateExisting = req.body.updateExisting !== false && req.body.updateExisting !== 'false';

        // Load existing apartments
        const existingApartments = await prisma.apartments.findMany({
            select: { id: true, code: true },
        });
        const aptMap = new Map();
        existingApartments.forEach((a) => {
            aptMap.set(a.code.toUpperCase().trim(), a.id);
        });

        let insertedCount = 0;
        let updatedCount = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const item = rows[i];
            const rowNum = i + 1;
            const code = item.code ? String(item.code).toUpperCase().trim() : '';
            if (!code) {
                errors.push({ row: rowNum, error: 'Thiếu mã căn hộ' });
                continue;
            }

            // Normalize phase
            let phase = 'CANTATA';
            const phaseRaw = (item.phaseCode || item.phase_code || '').toUpperCase().trim();
            if (phaseRaw.includes('TESLA') || code.startsWith('TES')) {
                phase = 'TESLA';
            } else if (phaseRaw.includes('NOXH') || code.startsWith('NOXH')) {
                phase = 'NOXH';
            }

            const block = item.blockCode || item.block_code || code.split('-')[0] || 'Block 01';
            const lot = item.lotNumber || item.lot_number || code;
            const floor = Number(item.floor || 1);
            let houseType = 'SHOPHOUSE';
const htRaw = (item.houseType || item.house_type || '').toUpperCase().trim();
if (htRaw.includes('VILLA') || htRaw.includes('BIỆT THỰ') || phase === 'TESLA') {
    houseType = 'VILLA';
}

            const landArea = Number(item.landArea || item.land_area || item.area || 100);
            const constArea = Number(item.constructionArea || item.construction_area || (landArea * 2.5));
            const usableArea = Number(item.usableArea || item.usable_area || constArea);

            let elecType = 'RESIDENTIAL';
            const elecRaw = (item.electricityType || '').toUpperCase().trim();
            if (elecRaw.includes('BUSINESS') || elecRaw.includes('KINH DOANH')) {
                elecType = 'BUSINESS';
            }

            let salesStatus = 'DELIVERED';
            const statusRaw = (item.salesStatus || '').toUpperCase().trim();
            if (statusRaw.includes('AVAILABLE') || statusRaw.includes('MỞ BÁN') || statusRaw.includes('TRỐNG')) {
                salesStatus = 'AVAILABLE';
            } else if (statusRaw.includes('DEPOSIT') || statusRaw.includes('CỌC')) {
                salesStatus = 'DEPOSIT';
            } else if (statusRaw.includes('CONTRACT') || statusRaw.includes('HỢP ĐỒNG')) {
                salesStatus = 'CONTRACT';
            }

            const bedroomCount = Number(item.bedroomCount || 3);
            const bathroomCount = Number(item.bathroomCount || 3);
            const direction = item.direction ? String(item.direction).trim() : null;

            const landPrice = Number(item.landPrice || item.land_price_before_vat || 0);
            const constPrice = Number(item.constructionPrice || item.construction_price_before_vat || 0);
            const vatRate = Number(item.vatRate || item.vat_rate || 8);
            const subtotal = landPrice + constPrice;
            const maintFee = Number(item.maintenanceFee || item.maintenance_fee_2pct || (subtotal > 0 ? Math.round(subtotal * 0.02) : 0));

            const existingAptId = aptMap.get(code);

            try {
                if (existingAptId && updateExisting) {
                    // Update
                    await prisma.apartments.update({
                        where: { id: existingAptId },
                        data: {
                            phase_code: phase,
                            block_code: block,
                            lot_number: lot,
                            floor,
                            house_type: houseType,
                            area: landArea,
                            land_area: landArea,
                            construction_area: constArea,
                            usable_area: usableArea,
                            electricity_type: elecType,
                            sales_status: salesStatus,
                            bedroom_count: bedroomCount,
                            bathroom_count: bathroomCount,
                            direction: direction || undefined,
                            land_price_before_vat: landPrice,
                            construction_price_before_vat: constPrice,
                            vat_rate: vatRate,
                            maintenance_fee_2pct: maintFee,
                        },
                    });
                    updatedCount++;
                } else if (!existingAptId) {
                    // Create
                    const newApt = await prisma.apartments.create({
                        data: {
                            code,
                            phase_code: phase,
                            block_code: block,
                            lot_number: lot,
                            floor,
                            house_type: houseType,
                            area: landArea,
                            land_area: landArea,
                            construction_area: constArea,
                            usable_area: usableArea,
                            electricity_type: elecType,
                            sales_status: salesStatus,
                            bedroom_count: bedroomCount,
                            bathroom_count: bathroomCount,
                            direction: direction,
                            land_price_before_vat: landPrice,
                            construction_price_before_vat: constPrice,
                            vat_rate: vatRate,
                            maintenance_fee_2pct: maintFee,
                        },
                    });
                    insertedCount++;
                    aptMap.set(code, newApt.id);
                }
            } catch (err) {
                console.error(`Lỗi import căn hộ dòng ${rowNum} (${code}):`, err);
                errors.push({ row: rowNum, code, error: err.message });
            }
        }

        // Log admin activity
        if (req.user) {
            await logActivity(
                req.user.id,
                req.user.username,
                'IMPORT_APARTMENTS',
                'APARTMENT',
                null,
                'Import Căn Hộ',
                `Đã import thành công: ${insertedCount} thêm mới, ${updatedCount} cập nhật, ${errors.length} lỗi.`
            );
        }

        res.json({
            message: `Import căn hộ thành công: Thêm mới ${insertedCount} căn, cập nhật ${updatedCount} căn.`,
            total: rows.length,
            insertedCount,
            updatedCount,
            errorCount: errors.length,
            errors,
        });
    } catch (err) {
        console.error('Error importing apartments:', err);
        res.status(500).json({ message: 'Lỗi import danh sách căn hộ: ' + err.message });
    }
};

const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');
const ExcelJS = require('exceljs');
const { sendPushToApartment } = require('../services/pushService');

// Helper
const f = (d) =>
    d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;

exports.getAmenityUsage = async (req, res) => {
    try {
        const usages = await prisma.amenity_usage.findMany({
            include: {
                residents: { select: { name: true } },
            },
            orderBy: [{ usage_date: 'desc' }, { start_time: 'desc' }],
        });

        res.json(
            usages.map((u) => ({
                id: u.id,
                apartmentId: u.apartment_id,
                amenity: u.amenity,
                usageDate: u.usage_date ? u.usage_date.toISOString().split('T')[0] : null,
                startTime: f(u.start_time),
                endTime: f(u.end_time),
                bookingCode: u.booking_code,
                status: u.status,
                residentId: u.resident_id,
                residentName: u.residents ? u.residents.name : null,
            }))
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.createAmenityBooking = async (req, res) => {
    try {
        const { apartmentId, residentId, amenity, usageDate, startTime, endTime } = req.body;

        if (residentId) {
            const resident = await prisma.residents.findUnique({
                where: { id: residentId },
                select: { can_use_amenities: true, name: true },
            });
            if (!resident || !resident.can_use_amenities) {
                return res.status(403).json({ message: 'Cư dân không được phép đặt.' });
            }
        }

        const bk = `BK-${amenity}-${Math.random().toString(36).substring(7).toUpperCase()}`;
        const newBooking = await prisma.amenity_usage.create({
            data: {
                id: `amenity_${generateRandomId()}`,
                apartment_id: apartmentId,
                resident_id: residentId || null,
                amenity,
                usage_date: new Date(usageDate),
                start_time: new Date(`${usageDate}T${startTime}`),
                end_time: new Date(`${usageDate}T${endTime}`),
                booking_code: bk,
                status: 'PENDING',
            },
            include: { residents: { select: { name: true } } },
        });

        res.status(201).json({
            id: newBooking.id,
            apartmentId: newBooking.apartment_id,
            residentId: newBooking.resident_id,
            residentName: newBooking.residents ? newBooking.residents.name : null,
            amenity: newBooking.amenity,
            usageDate: newBooking.usage_date ? newBooking.usage_date.toISOString().split('T')[0] : null,
            startTime: f(newBooking.start_time),
            endTime: f(newBooking.end_time),
            bookingCode: newBooking.booking_code,
            status: newBooking.status,
        });

        // Push notification to apartment
        sendPushToApartment(apartmentId, {
            title: 'Đặt lịch tiện ích thành công',
            body: `Mã đặt lịch: ${bk} - ${amenity} ngày ${usageDate}`,
            url: '/resident',
            tag: `amenity-${newBooking.id}`,
        }).catch(console.error);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.updateBookingStatus = async (req, res) => {
    try {
        const existingBooking = await prisma.amenity_usage.findUnique({
            where: { id: req.params.id },
            include: {
                apartments: {
                    include: {
                        occupancies: true,
                    },
                },
            },
        });

        if (!existingBooking) {
            return res.status(404).json({ message: 'Không tìm thấy đặt lịch.' });
        }

        // Authorization check
        if (req.resident) {
            // Residents can only cancel their booking
            if (req.body.status !== 'CANCELLED') {
                return res.status(403).json({ message: 'Cư dân chỉ có quyền hủy đặt chỗ.' });
            }

            // Check if booking belongs to this resident or their apartment
            const isOwner =
                existingBooking.resident_id === req.resident.id ||
                existingBooking.apartments?.occupancies?.some(
                    (o) => o.resident_id === req.resident.id
                );

            if (!isOwner) {
                return res.status(403).json({ message: 'Bạn không có quyền thao tác trên đặt lịch này.' });
            }
        } else if (!req.user || (req.user.role !== 0 && req.user.role !== 1)) {
            return res.status(403).json({ message: 'Quyền truy cập bị từ chối.' });
        }

        const updatedBooking = await prisma.amenity_usage.update({
            where: { id: req.params.id },
            data: { status: req.body.status },
            include: { residents: { select: { name: true } } },
        });

        res.json({
            id: updatedBooking.id,
            apartmentId: updatedBooking.apartment_id,
            residentId: updatedBooking.resident_id,
            residentName: updatedBooking.residents ? updatedBooking.residents.name : null,
            amenity: updatedBooking.amenity,
            usageDate: updatedBooking.usage_date ? updatedBooking.usage_date.toISOString().split('T')[0] : null,
            startTime: f(updatedBooking.start_time),
            endTime: f(updatedBooking.end_time),
            bookingCode: updatedBooking.booking_code,
            status: updatedBooking.status,
        });

        // Push notification for status change
        const statusLabels = { CONFIRMED: 'đã xác nhận', CANCELLED: 'đã hủy', USED: 'đã sử dụng' };
        const label = statusLabels[updatedBooking.status] || updatedBooking.status;
        sendPushToApartment(updatedBooking.apartment_id, {
            title: 'Cập nhật đặt lịch tiện ích',
            body: `Đặt lịch ${updatedBooking.booking_code} ${label}`,
            url: '/resident',
            tag: `amenity-status-${updatedBooking.id}`,
        }).catch(console.error);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.updateAmenityBooking = async (req, res) => {
    try {
        const { apartmentId, residentId, amenity, usageDate, startTime, endTime, status } = req.body;

        // Check if booking exists
        const existing = await prisma.amenity_usage.findUnique({
            where: { id: req.params.id },
        });
        if (!existing) {
            return res.status(404).json({ message: 'Không tìm thấy đặt lịch.' });
        }

        // Build update data — only include fields that were provided
        const updateData = {};
        if (apartmentId !== undefined) updateData.apartment_id = apartmentId;
        if (residentId !== undefined) updateData.resident_id = residentId || null;
        if (amenity !== undefined) updateData.amenity = amenity;
        if (status !== undefined) updateData.status = status;
        if (usageDate !== undefined) updateData.usage_date = new Date(usageDate);
        if (startTime !== undefined) updateData.start_time = new Date(`${usageDate || existing.usage_date.toISOString().split('T')[0]}T${startTime}`);
        if (endTime !== undefined) updateData.end_time = new Date(`${usageDate || existing.usage_date.toISOString().split('T')[0]}T${endTime}`);

        const updatedBooking = await prisma.amenity_usage.update({
            where: { id: req.params.id },
            data: updateData,
            include: { residents: { select: { name: true } } },
        });

        res.json({
            id: updatedBooking.id,
            apartmentId: updatedBooking.apartment_id,
            residentId: updatedBooking.resident_id,
            residentName: updatedBooking.residents ? updatedBooking.residents.name : null,
            amenity: updatedBooking.amenity,
            usageDate: updatedBooking.usage_date ? updatedBooking.usage_date.toISOString().split('T')[0] : null,
            startTime: f(updatedBooking.start_time),
            endTime: f(updatedBooking.end_time),
            bookingCode: updatedBooking.booking_code,
            status: updatedBooking.status,
        });
    } catch (err) {
        console.error('Update amenity booking error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.deleteAmenityBooking = async (req, res) => {
    try {
        const existing = await prisma.amenity_usage.findUnique({
            where: { id: req.params.id },
        });
        if (!existing) {
            return res.status(404).json({ message: 'Không tìm thấy đặt lịch.' });
        }

        await prisma.amenity_usage.delete({
            where: { id: req.params.id },
        });

        res.json({ message: 'Đã xóa đặt lịch thành công.' });
    } catch (err) {
        console.error('Delete amenity booking error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

const AMENITY_NAMES = {
    GOLF_3D: 'Golf 3D',
    HORSE_RIDING: 'Cưỡi ngựa Ả Rập',
    MUSEUM: 'Thăm quan bảo tàng',
    ZEN_GARDEN: 'Thăm quan vườn Zen',
    SAUNA: 'Xông Hơi',
    ARCHERY: 'Bắn Cung',
    GYM: 'Gym',
    YOGA: 'Yoga',
};

exports.exportAmenityUsage = async (req, res) => {
    try {
        const { month } = req.query; // format: YYYY-MM
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ message: 'Thiếu hoặc sai định dạng tháng (YYYY-MM)' });
        }

        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 1);

        // Fetch all usages for the month
        const usages = await prisma.amenity_usage.findMany({
            where: {
                usage_date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            include: {
                apartments: { select: { code: true } },
                residents: { select: { name: true } },
            },
            orderBy: [{ apartments: { code: 'asc' } }, { usage_date: 'asc' }],
        });

        // Fetch all apartments
        const apartments = await prisma.apartments.findMany({
            orderBy: { code: 'asc' },
            select: { id: true, code: true },
        });

        // Build pivot: apartment x amenity = count of USED
        const amenityTypes = Object.keys(AMENITY_NAMES);
        const usageMap = {};

        for (const apt of apartments) {
            usageMap[apt.id] = {};
            for (const a of amenityTypes) {
                usageMap[apt.id][a] = 0;
            }
        }

        for (const u of usages) {
            if (u.status === 'USED' && usageMap[u.apartment_id]) {
                usageMap[u.apartment_id][u.amenity] =
                    (usageMap[u.apartment_id][u.amenity] || 0) + 1;
            }
        }

        // Create Excel
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Resident Management System';
        workbook.created = new Date();

        const ws = workbook.addWorksheet(`BaoCaoTienIch T${monthNum}-${year}`);

        const columns = [
            { header: 'Căn hộ', key: 'code', width: 12 },
            ...amenityTypes.map((a) => ({
                header: AMENITY_NAMES[a],
                key: a,
                width: 18,
            })),
            { header: 'Tổng lượt', key: 'total', width: 14 },
        ];
        ws.columns = columns;

        // Style header
        ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        ws.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
        };
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

        // Data rows
        for (const apt of apartments) {
            const counts = usageMap[apt.id];
            const total = amenityTypes.reduce((sum, a) => sum + (counts[a] || 0), 0);
            ws.addRow({
                code: apt.code,
                ...counts,
                total,
            });
        }

        // Auto-width
        ws.columns.forEach((col) => {
            let maxLen = col.header.length;
            col.eachCell({ includeEmpty: true }, (cell) => {
                const len = cell.value ? cell.value.toString().length : 0;
                if (len > maxLen) maxLen = len;
            });
            col.width = Math.max(maxLen + 2, 10);
        });

        // Border for all cells
        ws.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });

        // Total row
        const totalRow = ws.addRow({
            code: 'Tổng cộng',
            ...Object.fromEntries(amenityTypes.map((a) => [
                a,
                apartments.reduce((sum, apt) => sum + (usageMap[apt.id][a] || 0), 0),
            ])),
            total: usages.filter((u) => u.status === 'USED').length,
        });
        totalRow.font = { bold: true };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2EFDA' },
        };

        // ===== Sheet 2: Chi tiết đặt lịch =====
        const ws2 = workbook.addWorksheet('ChiTietDatLich');

        const STATUS_NAMES = {
            PENDING: 'Chờ xác nhận',
            CONFIRMED: 'Đã xác nhận',
            USED: 'Đã sử dụng',
            CANCELLED: 'Đã hủy',
        };

        ws2.columns = [
            { header: 'STT', key: 'stt', width: 6 },
            { header: 'Mã đặt lịch', key: 'bookingCode', width: 18 },
            { header: 'Căn hộ', key: 'apartment', width: 12 },
            { header: 'Cư dân', key: 'resident', width: 22 },
            { header: 'Tiện ích', key: 'amenity', width: 22 },
            { header: 'Ngày sử dụng', key: 'date', width: 14 },
            { header: 'Giờ bắt đầu', key: 'startTime', width: 14 },
            { header: 'Giờ kết thúc', key: 'endTime', width: 14 },
            { header: 'Trạng thái', key: 'status', width: 16 },
        ];

        // Style header
        ws2.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        ws2.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
        };
        ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

        // Sort all bookings by date then start_time
        const sortedBookings = [...usages].sort((a, b) => {
            const dateA = a.usage_date ? new Date(a.usage_date).getTime() : 0;
            const dateB = b.usage_date ? new Date(b.usage_date).getTime() : 0;
            if (dateA !== dateB) return dateA - dateB;
            const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
            const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
            return timeA - timeB;
        });

        // Status color map
        const STATUS_COLORS = {
            PENDING: 'FFFCE4D6',    // light orange
            CONFIRMED: 'FFDDEBF7',  // light blue
            USED: 'FFE2EFDA',       // light green
            CANCELLED: 'FFF2F2F2',  // light gray
        };

        sortedBookings.forEach((u, idx) => {
            const row = ws2.addRow({
                stt: idx + 1,
                bookingCode: u.booking_code || '',
                apartment: u.apartments ? u.apartments.code : u.apartment_id,
                resident: u.residents ? u.residents.name : '',
                amenity: AMENITY_NAMES[u.amenity] || u.amenity,
                date: u.usage_date ? new Date(u.usage_date).toLocaleDateString('vi-VN') : '',
                startTime: u.start_time ? new Date(u.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
                endTime: u.end_time ? new Date(u.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
                status: STATUS_NAMES[u.status] || u.status,
            });

            // Color the status cell
            const statusCell = row.getCell('status');
            if (STATUS_COLORS[u.status]) {
                statusCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: STATUS_COLORS[u.status] },
                };
            }
            statusCell.alignment = { horizontal: 'center' };
        });

        // Auto-width for sheet 2
        ws2.columns.forEach((col) => {
            let maxLen = col.header.length;
            col.eachCell({ includeEmpty: true }, (cell) => {
                const len = cell.value ? cell.value.toString().length : 0;
                if (len > maxLen) maxLen = len;
            });
            col.width = Math.max(maxLen + 2, 10);
        });

        // Border for all cells in sheet 2
        ws2.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });

        // Summary row at bottom of sheet 2
        const summaryRow = ws2.addRow({});
        const summaryRow2 = ws2.addRow({
            stt: '',
            bookingCode: 'Tổng cộng:',
            apartment: `${sortedBookings.length} đặt lịch`,
            resident: `Sử dụng: ${sortedBookings.filter(u => u.status === 'USED').length}`,
            amenity: `Hủy: ${sortedBookings.filter(u => u.status === 'CANCELLED').length}`,
            date: `Chờ: ${sortedBookings.filter(u => u.status === 'PENDING').length}`,
            startTime: `Xác nhận: ${sortedBookings.filter(u => u.status === 'CONFIRMED').length}`,
            endTime: '',
            status: '',
        });
        summaryRow2.font = { bold: true };
        summaryRow2.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2EFDA' },
        };

        // Send file
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=BaoCaoTienIch_${month}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Export amenity usage error:', err);
        res.status(500).json({ message: 'Lỗi xuất báo cáo' });
    }
};

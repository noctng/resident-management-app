const svc = require('../services/amenityService');
const ExcelJS = require('exceljs');

// GET /api/amenity/amenity-usage — List all amenity usage
exports.getAmenityUsage = async (req, res) => {
  try {
    const result = await svc.getAmenityUsage();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// POST /api/amenity/amenity-usage — Create a booking
exports.createAmenityBooking = async (req, res) => {
  try {
    const booking = await svc.createAmenityBooking(req.body);
    res.status(201).json(booking);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

// PUT /api/amenity/amenity-usage/:id/status — Update booking status (auth-aware)
exports.updateBookingStatus = async (req, res) => {
  try {
    const actor = req.resident
      ? { isResident: true, residentId: req.resident.id }
      : { isResident: false, userRole: req.user?.role };
    const booking = await svc.updateBookingStatus(req.params.id, req.body.status, actor);
    res.json(booking);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

// PUT /api/amenity/amenity-usage/:id — Update a booking (manager/admin)
exports.updateAmenityBooking = async (req, res) => {
  try {
    const booking = await svc.updateAmenityBooking(req.params.id, req.body);
    res.json(booking);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

// DELETE /api/amenity/amenity-usage/:id — Delete a booking
exports.deleteAmenityBooking = async (req, res) => {
  try {
    const result = await svc.deleteAmenityBooking(req.params.id);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
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

// GET /api/amenity/amenity-usage/export — Export amenity usage report (Excel)
exports.exportAmenityUsage = async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    const { usages, apartments, monthNum, year } = await svc.getExportData(month);

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
      ...Object.fromEntries(
        amenityTypes.map((a) => [
          a,
          apartments.reduce((sum, apt) => sum + (usageMap[apt.id][a] || 0), 0),
        ])
      ),
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
      PENDING: 'FFFCE4D6', // light orange
      CONFIRMED: 'FFDDEBF7', // light blue
      USED: 'FFE2EFDA', // light green
      CANCELLED: 'FFF2F2F2', // light gray
    };

    sortedBookings.forEach((u, idx) => {
      const row = ws2.addRow({
        stt: idx + 1,
        bookingCode: u.booking_code || '',
        apartment: u.apartments ? u.apartments.code : u.apartment_id,
        resident: u.residents ? u.residents.name : '',
        amenity: AMENITY_NAMES[u.amenity] || u.amenity,
        date: u.usage_date ? new Date(u.usage_date).toLocaleDateString('vi-VN') : '',
        startTime: u.start_time
          ? new Date(u.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : '',
        endTime: u.end_time
          ? new Date(u.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : '',
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
      resident: `Sử dụng: ${sortedBookings.filter((u) => u.status === 'USED').length}`,
      amenity: `Hủy: ${sortedBookings.filter((u) => u.status === 'CANCELLED').length}`,
      date: `Chờ: ${sortedBookings.filter((u) => u.status === 'PENDING').length}`,
      startTime: `Xác nhận: ${sortedBookings.filter((u) => u.status === 'CONFIRMED').length}`,
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
    res.setHeader('Content-Disposition', `attachment; filename=BaoCaoTienIch_${month}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi xuất báo cáo' });
  }
};

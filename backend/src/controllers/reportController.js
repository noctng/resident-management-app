const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');

// -- Add PG Pool for Management Fee Queries --
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

exports.exportUnifiedBilling = async (req, res) => {
    const { month, year } = req.query;
    if (!month || !year) {
        return res.status(400).json({ message: 'Thiếu thông tin tháng/năm' });
    }

    try {
        const workbook = createWorkbook();
        const worksheet = workbook.addWorksheet(`Hóa Đơn Tổng Hợp T${month}-${year}`);

        // Define columns
        worksheet.columns = [
            { header: 'Căn hộ', key: 'code', width: 10 },
            { header: 'Chủ hộ', key: 'resident', width: 25 },
            { header: 'Tiền Điện', key: 'elec_cost', width: 15 },
            { header: 'Tiền Nước', key: 'water_cost', width: 15 },
            { header: 'Phí Quản Lý', key: 'mgmt_cost', width: 15 },
            { header: 'Tổng Cộng', key: 'grand_total', width: 18, style: { font: { bold: true } } },
            { header: 'Trạng thái (Điện Nước)', key: 'util_status', width: 20 },
            { header: 'Trạng thái (Phí QL)', key: 'mgmt_status', width: 20 },
            { header: 'Trạng thái Tổng', key: 'combined_status', width: 20 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Fetch Apartments
        const apartments = await prisma.apartments.findMany({
            include: {
                occupancies: {
                    include: { residents: true },
                    where: { residents: { is_active: true } },
                },
            },
            orderBy: { code: 'asc' },
        });

        // Loop and fetch data for each apartment
        // Note: For better performance in large datasets, we should bulk fetch.
        // But for < 500 records, loop with promise all or sequential is acceptable for MVP.
        const rows = [];

        for (const apartment of apartments) {
            // Owner name
            const owner =
                apartment.occupancies.find((o) => o.residents.relationship_status === 'OWNER')
                    ?.residents.name ||
                apartment.occupancies[0]?.residents.name ||
                '';

            // Utility Record
            const utilityRecord = await prisma.utility_records.findFirst({
                where: { apartment_id: apartment.id, month: parseInt(month), year: parseInt(year) },
            });

            // Management Fee
            const mgmtFeeResult = await pool.query(
                `SELECT * FROM management_fees WHERE apartment_id = $1 AND month = $2 AND year = $3`,
                [apartment.id, parseInt(month), parseInt(year)]
            );
            const managementFee = mgmtFeeResult.rows[0] || null;

            const elecCost = Number(utilityRecord?.electricity_cost || 0);
            const waterCost = Number(utilityRecord?.water_cost || 0);
            const mgmtCost = Number(managementFee?.total_amount || 0);
            const grandTotal = elecCost + waterCost + mgmtCost;

            const utilStatus = utilityRecord?.payment_status || 'Không dữ liệu';
            const mgmtStatus = managementFee?.status || 'Không dữ liệu';

            let combinedStatus = 'Chưa thanh toán';
            if (
                (!utilityRecord || utilityRecord.payment_status === 'PAID') &&
                (!managementFee || managementFee.status === 'PAID')
            ) {
                combinedStatus = 'Đã thanh toán';
            } else if (
                utilityRecord?.payment_status === 'PAID' ||
                managementFee?.status === 'PAID'
            ) {
                combinedStatus = 'Thanh toán 1 phần';
            }

            if (!utilityRecord && !managementFee) combinedStatus = 'Không có dữ liệu';

            worksheet.addRow({
                code: apartment.code,
                resident: owner,
                elec_cost: elecCost,
                water_cost: waterCost,
                mgmt_cost: mgmtCost,
                grand_total: grandTotal,
                util_status:
                    utilStatus === 'PAID' ? 'Đã thu' : utilStatus === 'UNPAID' ? 'Chưa thu' : '-',
                mgmt_status:
                    mgmtStatus === 'PAID' ? 'Đã thu' : mgmtStatus === 'PENDING' ? 'Chưa thu' : '-',
                combined_status: combinedStatus,
            });
        }

        // Add Summary
        // Manual sum not efficient here but acceptable for report logic
        worksheet.addRow({});
        const lastRow = worksheet.lastRow.number;
        worksheet.addRow([
            'TỔNG CỘNG',
            '',
            { formula: `SUM(C2:C${lastRow - 1})` },
            { formula: `SUM(D2:D${lastRow - 1})` },
            { formula: `SUM(E2:E${lastRow - 1})` },
            { formula: `SUM(F2:F${lastRow - 1})` },
            '',
            '',
            '',
        ]);

        worksheet.lastRow.font = { bold: true };
        ['C', 'D', 'E', 'F'].forEach((col) => {
            worksheet.getColumn(col).numFmt = '#,##0';
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Bao_cao_Tong_Hop_T${month}_${year}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Unified Billing Error:', error);
        res.status(500).json({ message: 'Lỗi xuất báo cáo tổng hợp' });
    }
};

const createWorkbook = () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Resident Management System';
    workbook.created = new Date();
    return workbook;
};

const setAutoWidth = (worksheet) => {
    worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
    });
};

exports.exportResidents = async (req, res) => {
    try {
        const residents = await prisma.residents.findMany({
            include: {
                occupancies: {
                    include: { apartments: true },
                },
            },
        });

        const workbook = createWorkbook();
        const worksheet = workbook.addWorksheet('Danh sách Cư dân');

        worksheet.columns = [
            { header: 'Họ và Tên', key: 'name', width: 20 },
            { header: 'Email', key: 'email', width: 25 }, // Reordered for better visibility
            { header: 'Số điện thoại', key: 'phone', width: 15 },
            { header: 'Ngày sinh', key: 'dob', width: 15 }, // Adjusted header
            { header: 'Giới tính', key: 'gender', width: 10 },
            { header: 'CCCD/CMND', key: 'identity_card', width: 15 },
            { header: 'Căn hộ', key: 'apartments', width: 20 },
            { header: 'Trạng thái', key: 'status', width: 10 },
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        residents.forEach((r) => {
            const apartmentCodes = r.occupancies.map((o) => o.apartments.code).join(', ');
            worksheet.addRow({
                name: r.name,
                email: r.email,
                phone: r.phone,
                dob: r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString('vi-VN') : '',
                gender: r.gender === 'MALE' ? 'Nam' : r.gender === 'FEMALE' ? 'Nữ' : 'Khác',
                identity_card: r.identity_card,
                apartments: apartmentCodes,
                status: r.is_active ? 'Hoạt động' : 'Đã rời đi',
            });
        });

        // setAutoWidth(worksheet);

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename=Danh_sach_cu_dan.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Residents Error:', error);
        res.status(500).json({ message: 'Lỗi xuất báo cáo cư dân' });
    }
};

exports.exportApartments = async (req, res) => {
    try {
        const apartments = await prisma.apartments.findMany({
            include: {
                occupancies: {
                    where: { residents: { is_active: true } }, // Only active residents
                    include: { residents: true },
                },
            },
            orderBy: { code: 'asc' },
        });

        const workbook = createWorkbook();
        const worksheet = workbook.addWorksheet('Danh sách Căn hộ');

        worksheet.columns = [
            { header: 'Mã Căn Hộ', key: 'code', width: 15 },
            { header: 'Loại hình', key: 'house_type', width: 15 },
            { header: 'Tầng', key: 'floor', width: 10 },
            { header: 'Diện tích (m2)', key: 'area', width: 15 },
            { header: 'Loại điện', key: 'electricity_type', width: 15 },
            { header: 'Chủ sở hữu/Cư dân', key: 'residents', width: 30 },
            { header: 'Trạng thái', key: 'status', width: 15 }, // Derived status
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        apartments.forEach((apt) => {
            const residentNames = apt.occupancies.map((o) => o.residents.name).join(', ');
            const status = apt.occupancies.length > 0 ? 'Đang ở' : 'Trống'; // Simple logic

            worksheet.addRow({
                code: apt.code,
                house_type: apt.house_type,
                floor: apt.floor,
                area: Number(apt.area),
                electricity_type:
                    apt.electricity_type === 'RESIDENTIAL' ? 'Sinh hoạt' : 'Kinh doanh',
                residents: residentNames,
                status: status,
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename=Danh_sach_can_ho.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Apartments Error:', error);
        res.status(500).json({ message: 'Lỗi xuất báo cáo căn hộ' });
    }
};

exports.exportUtility = async (req, res) => {
    const { month, year } = req.query;
    if (!month || !year) {
        return res.status(400).json({ message: 'Thiếu thông tin tháng/năm' });
    }

    try {
        const records = await prisma.utility_records.findMany({
            where: {
                month: Number(month),
                year: Number(year),
            },
            include: {
                apartments: true,
            },
            orderBy: { apartments: { code: 'asc' } },
        });

        const workbook = createWorkbook();
        const worksheet = workbook.addWorksheet(`Điện Nước T${month}-${year}`);

        worksheet.columns = [
            { header: 'Căn hộ', key: 'code', width: 10 },
            { header: 'Tháng/Năm', key: 'month_year', width: 12 },
            { header: 'Điện Cũ', key: 'elec_old', width: 12 },
            { header: 'Điện Mới', key: 'elec_new', width: 12 },
            { header: 'Tiêu thụ Điện', key: 'elec_usage', width: 15 },
            { header: 'Tiền Điện', key: 'elec_cost', width: 15 },
            { header: 'Nước Cũ', key: 'water_old', width: 12 },
            { header: 'Nước Mới', key: 'water_new', width: 12 },
            { header: 'Tiêu thụ Nước', key: 'water_usage', width: 15 },
            { header: 'Tiền Nước', key: 'water_cost', width: 15 },
            { header: 'Tổng Cộng', key: 'total', width: 18, style: { font: { bold: true } } },
            { header: 'Trạng thái', key: 'status', width: 15 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        records.forEach((r) => {
            worksheet.addRow({
                code: r.apartments.code,
                month_year: `${r.month}/${r.year}`,
                elec_old: Number(r.electricity_old_reading),
                elec_new: Number(r.electricity_new_reading),
                elec_usage: Number(r.electricity_consumption),
                elec_cost: Number(r.electricity_cost),
                water_old: Number(r.water_old_reading),
                water_new: Number(r.water_new_reading),
                water_usage: Number(r.water_consumption),
                water_cost: Number(r.water_cost),
                total: Number(r.electricity_cost) + Number(r.water_cost),
                status: r.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
            });
        });

        // Add Summary Row
        const totalAmount = records.reduce(
            (sum, r) => sum + Number(r.electricity_cost) + Number(r.water_cost),
            0
        );
        worksheet.addRow({}); // Empty row
        const summaryRow = worksheet.addRow([
            'Tổng cộng doanh thu',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            totalAmount,
            '',
        ]);
        summaryRow.font = { bold: true };
        summaryRow.getCell(11).numFmt = '#,##0'; // Format number

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Bao_cao_dien_nuoc_T${month}_${year}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Utility Error:', error);
        res.status(500).json({ message: 'Lỗi xuất báo cáo điện nước' });
    }
};
exports.exportContracts = async (req, res) => {
    try {
        const contracts = await prisma.contracts.findMany({
            include: {
                customers: true,
                apartments: true,
            },
            orderBy: { created_at: 'desc' },
        });

        const workbook = createWorkbook();
        const worksheet = workbook.addWorksheet('Danh sách Hợp đồng');

        worksheet.columns = [
            { header: 'Mã Hợp đồng', key: 'contract_code', width: 15 },
            { header: 'Khách hàng', key: 'customer', width: 25 },
            { header: 'Căn hộ', key: 'apartment', width: 12 },
            { header: 'Tổng Giá trị', key: 'total_value', width: 18 },
            { header: 'Tiền VAT', key: 'vat', width: 15 },
            { header: 'Phí Bảo trì', key: 'maintenance', width: 15 },
            { header: 'Ngày Ký', key: 'signed_date', width: 12 },
            { header: 'Ngày Bàn giao', key: 'handover_date', width: 15 },
            { header: 'Trạng thái', key: 'status', width: 15 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Helper to translate status (mapped from contract_status enum if exists)
        const statusMap = {
            DEPOSIT: 'Đặt cọc',
            SIGNED: 'Đã ký',
            HANDOVER_PENDING: 'Chờ bàn giao',
            HANDED_OVER: 'Đã bàn giao',
            CANCELLED: 'Đã hủy',
            TRANSFERRED: 'Đã chuyển nhượng',
        };

        contracts.forEach((c) => {
            worksheet.addRow({
                contract_code: c.contract_code,
                customer: c.customers.name,
                apartment: c.apartments.code,
                total_value: Number(c.total_value),
                vat: Number(c.vat_amount),
                maintenance: Number(c.maintenance_fee),
                signed_date: c.signed_date
                    ? new Date(c.signed_date).toLocaleDateString('vi-VN')
                    : '',
                handover_date: c.handover_date
                    ? new Date(c.handover_date).toLocaleDateString('vi-VN')
                    : '',
                status: statusMap[c.status] || c.status,
            });
        });

        // Set number formats for money columns
        [4, 5, 6].forEach((colIndex) => {
            worksheet.getColumn(colIndex).numFmt = '#,##0';
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename=Danh_sach_hop_dong.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Contracts Error:', error);
        res.status(500).json({ message: 'Lỗi xuất báo cáo hợp đồng' });
    }
};

// ============================================================
// REVENUE REPORT FUNCTIONS
// ============================================================

/**
 * Get Revenue Report
 * GET /api/reports/revenue?period=month&year=2026&month=1
 * Supports: month, quarter, year
 */
exports.getRevenueReport = async (req, res) => {
    const { period, year, month, quarter } = req.query;

    if (!period || !year) {
        return res.status(400).json({ message: 'Thiếu thông tin period/year' });
    }

    try {
        let startDate, endDate, previousStartDate, previousEndDate, periodLabel;
        const currentYear = parseInt(year);

        // Calculate date ranges based on period type
        if (period === 'month') {
            if (!month) {
                return res.status(400).json({ message: 'Thiếu thông tin tháng' });
            }
            const currentMonth = parseInt(month);
            startDate = new Date(currentYear, currentMonth - 1, 1);
            endDate = new Date(currentYear, currentMonth, 0);

            // Previous month
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
            previousStartDate = new Date(prevYear, prevMonth - 1, 1);
            previousEndDate = new Date(prevYear, prevMonth, 0);

            periodLabel = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        } else if (period === 'quarter') {
            if (!quarter) {
                return res.status(400).json({ message: 'Thiếu thông tin quý' });
            }
            const currentQuarter = parseInt(quarter);
            const startMonth = (currentQuarter - 1) * 3 + 1;
            startDate = new Date(currentYear, startMonth - 1, 1);
            endDate = new Date(currentYear, startMonth + 2, 0);

            // Previous quarter
            const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
            const prevYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
            const prevStartMonth = (prevQuarter - 1) * 3 + 1;
            previousStartDate = new Date(prevYear, prevStartMonth - 1, 1);
            previousEndDate = new Date(prevYear, prevStartMonth + 2, 0);

            periodLabel = `${currentYear}-Q${currentQuarter}`;
        } else if (period === 'year') {
            startDate = new Date(currentYear, 0, 1);
            endDate = new Date(currentYear, 11, 31);

            // Previous year
            previousStartDate = new Date(currentYear - 1, 0, 1);
            previousEndDate = new Date(currentYear - 1, 11, 31);

            periodLabel = `${currentYear}`;
        } else {
            return res.status(400).json({ message: 'Period không hợp lệ (month/quarter/year)' });
        }

        // Fetch current period data
        const currentPayments = await prisma.contract_payments.findMany({
            where: {
                created_at: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                contracts: {
                    include: {
                        customers: true,
                        apartments: true,
                    },
                },
            },
        });

        // Fetch previous period data
        const previousPayments = await prisma.contract_payments.findMany({
            where: {
                created_at: {
                    gte: previousStartDate,
                    lte: previousEndDate,
                },
            },
        });

        // Calculate totals for current period
        const totalRevenue = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalPaid = currentPayments.reduce((sum, p) => {
            return p.status === 'PAID' ? sum + Number(p.paid_amount) : sum;
        }, 0);
        const totalRemaining = totalRevenue - totalPaid;

        // Calculate totals for previous period
        const previousRevenue = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const previousPaid = previousPayments.reduce((sum, p) => {
            return p.status === 'PAID' ? sum + Number(p.paid_amount) : sum;
        }, 0);

        // Calculate change percentage
        const changePercent =
            previousRevenue > 0
                ? (((totalRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2)
                : 0;

        // Get unique contracts count
        const contractCount = new Set(currentPayments.map((p) => p.contract_id)).size;

        // Prepare chart data (last 6 periods for trend)
        const chartData = [];
        let chartPeriods = 6;

        for (let i = chartPeriods - 1; i >= 0; i--) {
            let chartStart, chartEnd, chartLabel;

            if (period === 'month') {
                const m = parseInt(month) - i;
                const y = m <= 0 ? currentYear - 1 : currentYear;
                const actualMonth = m <= 0 ? 12 + m : m;
                chartStart = new Date(y, actualMonth - 1, 1);
                chartEnd = new Date(y, actualMonth, 0);
                chartLabel = `${y}-${String(actualMonth).padStart(2, '0')}`;
            } else if (period === 'quarter') {
                const q = parseInt(quarter) - i;
                const y = q <= 0 ? currentYear - 1 : currentYear;
                const actualQuarter = q <= 0 ? 4 + q : q;
                const sm = (actualQuarter - 1) * 3 + 1;
                chartStart = new Date(y, sm - 1, 1);
                chartEnd = new Date(y, sm + 2, 0);
                chartLabel = `${y}-Q${actualQuarter}`;
            } else {
                const y = currentYear - i;
                chartStart = new Date(y, 0, 1);
                chartEnd = new Date(y, 11, 31);
                chartLabel = `${y}`;
            }

            const periodPayments = await prisma.contract_payments.findMany({
                where: {
                    created_at: {
                        gte: chartStart,
                        lte: chartEnd,
                    },
                },
            });

            const revenue = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);
            const paid = periodPayments.reduce((sum, p) => {
                return p.status === 'PAID' ? sum + Number(p.paid_amount) : sum;
            }, 0);

            chartData.push({
                period: chartLabel,
                revenue: Math.round(revenue),
                paid: Math.round(paid),
            });
        }

        // Prepare detailed data for table
        const detailData = currentPayments.map((p) => ({
            paymentId: p.id,
            contractCode: p.contracts.contract_code,
            customerName: p.contracts.customers.name,
            apartmentCode: p.contracts.apartments.code,
            installment: p.installment,
            dueDate: p.due_date,
            amount: Number(p.amount),
            paidAmount: Number(p.paid_amount),
            status: p.status,
            paymentDate: p.payment_date,
        }));

        res.json({
            period: periodLabel,
            totalRevenue: Math.round(totalRevenue),
            totalPaid: Math.round(totalPaid),
            totalRemaining: Math.round(totalRemaining),
            contractCount,
            paymentCount: currentPayments.length,
            comparison: {
                previousPeriod:
                    period === 'month'
                        ? `${previousStartDate.getFullYear()}-${String(previousStartDate.getMonth() + 1).padStart(2, '0')}`
                        : period === 'quarter'
                          ? `${previousStartDate.getFullYear()}-Q${Math.ceil((previousStartDate.getMonth() + 1) / 3)}`
                          : `${previousStartDate.getFullYear()}`,
                previousRevenue: Math.round(previousRevenue),
                previousPaid: Math.round(previousPaid),
                changePercent: Number(changePercent),
            },
            chartData,
            detailData,
        });
    } catch (error) {
        console.error('Get Revenue Report Error:', error);
        res.status(500).json({ message: 'Lỗi lấy báo cáo doanh thu', error: error.message });
    }
};

/**
 * Export Revenue Report to Excel
 * POST /api/reports/revenue/export
 * Body: { period, year, month, quarter }
 */
exports.exportRevenueReport = async (req, res) => {
    const { period, year, month, quarter } = req.body;

    if (!period || !year) {
        return res.status(400).json({ message: 'Thiếu thông tin period/year' });
    }

    try {
        // Reuse the logic from getRevenueReport to fetch data
        let startDate, endDate, periodLabel;
        const currentYear = parseInt(year);

        if (period === 'month') {
            if (!month) {
                return res.status(400).json({ message: 'Thiếu thông tin tháng' });
            }
            const currentMonth = parseInt(month);
            startDate = new Date(currentYear, currentMonth - 1, 1);
            endDate = new Date(currentYear, currentMonth, 0);
            periodLabel = `T${currentMonth}-${currentYear}`;
        } else if (period === 'quarter') {
            if (!quarter) {
                return res.status(400).json({ message: 'Thiếu thông tin quý' });
            }
            const currentQuarter = parseInt(quarter);
            const startMonth = (currentQuarter - 1) * 3 + 1;
            startDate = new Date(currentYear, startMonth - 1, 1);
            endDate = new Date(currentYear, startMonth + 2, 0);
            periodLabel = `Q${currentQuarter}-${currentYear}`;
        } else if (period === 'year') {
            startDate = new Date(currentYear, 0, 1);
            endDate = new Date(currentYear, 11, 31);
            periodLabel = `${currentYear}`;
        } else {
            return res.status(400).json({ message: 'Period không hợp lệ' });
        }

        // Fetch payments
        const payments = await prisma.contract_payments.findMany({
            where: {
                created_at: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                contracts: {
                    include: {
                        customers: true,
                        apartments: true,
                    },
                },
            },
            orderBy: { due_date: 'asc' },
        });

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Resident Management System';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet(`Báo Cáo Doanh Thu ${periodLabel}`);

        // Define columns
        worksheet.columns = [
            { header: 'Mã HĐ', key: 'contract_code', width: 15 },
            { header: 'Khách hàng', key: 'customer', width: 25 },
            { header: 'Căn hộ', key: 'apartment', width: 12 },
            { header: 'Đợt', key: 'installment', width: 8 },
            { header: 'Hạn thanh toán', key: 'due_date', width: 15 },
            { header: 'Số tiền', key: 'amount', width: 18 },
            { header: 'Đã thanh toán', key: 'paid_amount', width: 18 },
            { header: 'Còn lại', key: 'remaining', width: 18 },
            { header: 'Trạng thái', key: 'status', width: 15 },
            { header: 'Ngày TT', key: 'payment_date', width: 15 },
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Add data rows
        const statusMap = {
            PENDING: 'Chờ thanh toán',
            PAID: 'Đã thanh toán',
            OVERDUE: 'Quá hạn',
        };

        payments.forEach((p) => {
            const amount = Number(p.amount);
            const paidAmount = Number(p.paid_amount);
            const remaining = amount - paidAmount;

            worksheet.addRow({
                contract_code: p.contracts.contract_code,
                customer: p.contracts.customers.name,
                apartment: p.contracts.apartments.code,
                installment: p.installment,
                due_date: p.due_date ? new Date(p.due_date).toLocaleDateString('vi-VN') : '',
                amount: amount,
                paid_amount: paidAmount,
                remaining: remaining,
                status: statusMap[p.status] || p.status,
                payment_date: p.payment_date
                    ? new Date(p.payment_date).toLocaleDateString('vi-VN')
                    : '',
            });
        });

        // Add summary
        worksheet.addRow({});
        const lastRow = worksheet.lastRow.number;
        const summaryRow = worksheet.addRow({
            contract_code: 'TỔNG CỘNG',
            customer: '',
            apartment: '',
            installment: '',
            due_date: '',
            amount: { formula: `SUM(F2:F${lastRow - 1})` },
            paid_amount: { formula: `SUM(G2:G${lastRow - 1})` },
            remaining: { formula: `SUM(H2:H${lastRow - 1})` },
            status: '',
            payment_date: '',
        });

        summaryRow.font = { bold: true };
        summaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE7E6E6' },
        };

        // Format number columns
        ['F', 'G', 'H'].forEach((col) => {
            worksheet.getColumn(col).numFmt = '#,##0';
        });

        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Bao_cao_doanh_thu_${periodLabel}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export Revenue Report Error:', error);
        res.status(500).json({ message: 'Lỗi xuất báo cáo doanh thu', error: error.message });
    }
};

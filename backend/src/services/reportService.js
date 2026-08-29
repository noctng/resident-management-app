const ExcelJS = require('exceljs');
const repo = require('../repositories/reportRepository');

const createWorkbook = () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Resident Management System';
  workbook.created = new Date();
  return workbook;
};

const styleHeader = (worksheet) => {
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
};

const setResponseExcel = (res, filename) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
};

// ============ EXPORT UNIFIED BILLING ============
const exportUnifiedBilling = async (res, month, year) => {
  const m = parseInt(month);
  const y = parseInt(year);
  const apartments = await repo.getApartmentsForBilling();

  const workbook = createWorkbook();
  const worksheet = workbook.addWorksheet(`Hóa Đơn Tổng Hợp T${m}-${y}`);
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
  styleHeader(worksheet);

  for (const apartment of apartments) {
    const owner =
      apartment.occupancies.find((o) => o.residents.relationship_status === 'OWNER')?.residents.name ||
      apartment.occupancies[0]?.residents.name ||
      '';

    const utilityRecord = await repo.getUtilityRecord(apartment.id, m, y);
    const mgmtFeeResult = await repo.getManagementFee(apartment.id, m, y);
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
    } else if (utilityRecord?.payment_status === 'PAID' || managementFee?.status === 'PAID') {
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
      util_status: utilStatus === 'PAID' ? 'Đã thu' : utilStatus === 'UNPAID' ? 'Chưa thu' : '-',
      mgmt_status: mgmtStatus === 'PAID' ? 'Đã thu' : mgmtStatus === 'PENDING' ? 'Chưa thu' : '-',
      combined_status: combinedStatus,
    });
  }

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

  setResponseExcel(res, `Bao_cao_Tong_Hop_T${m}_${y}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

// ============ EXPORT RESIDENTS ============
const exportResidents = async (res) => {
  const residents = await repo.getResidents();
  const workbook = createWorkbook();
  const worksheet = workbook.addWorksheet('Danh sách Cư dân');
  worksheet.columns = [
    { header: 'Họ và Tên', key: 'name', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Số điện thoại', key: 'phone', width: 15 },
    { header: 'Ngày sinh', key: 'dob', width: 15 },
    { header: 'Giới tính', key: 'gender', width: 10 },
    { header: 'CCCD/CMND', key: 'identity_card', width: 15 },
    { header: 'Căn hộ', key: 'apartments', width: 20 },
    { header: 'Trạng thái', key: 'status', width: 10 },
  ];
  styleHeader(worksheet);

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

  setResponseExcel(res, 'Danh_sach_cu_dan.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// ============ EXPORT APARTMENTS ============
const exportApartments = async (res) => {
  const apartments = await repo.getApartments();
  const workbook = createWorkbook();
  const worksheet = workbook.addWorksheet('Danh sách Căn hộ');
  worksheet.columns = [
    { header: 'Mã Căn Hộ', key: 'code', width: 15 },
    { header: 'Loại hình', key: 'house_type', width: 15 },
    { header: 'Tầng', key: 'floor', width: 10 },
    { header: 'Diện tích (m2)', key: 'area', width: 15 },
    { header: 'Loại điện', key: 'electricity_type', width: 15 },
    { header: 'Chủ sở hữu/Cư dân', key: 'residents', width: 30 },
    { header: 'Trạng thái', key: 'status', width: 15 },
  ];
  styleHeader(worksheet);

  apartments.forEach((apt) => {
    const residentNames = apt.occupancies.map((o) => o.residents.name).join(', ');
    worksheet.addRow({
      code: apt.code,
      house_type: apt.house_type,
      floor: apt.floor,
      area: Number(apt.area),
      electricity_type: apt.electricity_type === 'RESIDENTIAL' ? 'Sinh hoạt' : 'Kinh doanh',
      residents: residentNames,
      status: apt.occupancies.length > 0 ? 'Đang ở' : 'Trống',
    });
  });

  setResponseExcel(res, 'Danh_sach_can_ho.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// ============ EXPORT UTILITY ============
const exportUtility = async (res, month, year) => {
  const m = parseInt(month);
  const y = parseInt(year);
  const records = await repo.getUtilityRecords(m, y);
  const workbook = createWorkbook();
  const worksheet = workbook.addWorksheet(`Điện Nước T${m}-${y}`);
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
  styleHeader(worksheet);

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

  const totalAmount = records.reduce((sum, r) => sum + Number(r.electricity_cost) + Number(r.water_cost), 0);
  worksheet.addRow({});
  const summaryRow = worksheet.addRow([
    'Tổng cộng doanh thu', '', '', '', '', '', '', '', '', '', totalAmount, '',
  ]);
  summaryRow.font = { bold: true };
  summaryRow.getCell(11).numFmt = '#,##0';

  setResponseExcel(res, `Bao_cao_dien_nuoc_T${m}_${y}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

// ============ EXPORT CONTRACTS ============
const exportContracts = async (res) => {
  const contracts = await repo.getContracts();
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
  styleHeader(worksheet);

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
      signed_date: c.signed_date ? new Date(c.signed_date).toLocaleDateString('vi-VN') : '',
      handover_date: c.handover_date ? new Date(c.handover_date).toLocaleDateString('vi-VN') : '',
      status: statusMap[c.status] || c.status,
    });
  });

  [4, 5, 6].forEach((colIndex) => {
    worksheet.getColumn(colIndex).numFmt = '#,##0';
  });

  setResponseExcel(res, 'Danh_sach_hop_dong.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// ============ REVENUE REPORT ============
const computeDateRange = (period, year, month, quarter) => {
  const currentYear = parseInt(year);
  let startDate, endDate, previousStartDate, previousEndDate, periodLabel;

  if (period === 'month') {
    const currentMonth = parseInt(month);
    startDate = new Date(currentYear, currentMonth - 1, 1);
    endDate = new Date(currentYear, currentMonth, 0);
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    previousStartDate = new Date(prevYear, prevMonth - 1, 1);
    previousEndDate = new Date(prevYear, prevMonth, 0);
    periodLabel = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  } else if (period === 'quarter') {
    const currentQuarter = parseInt(quarter);
    const startMonth = (currentQuarter - 1) * 3 + 1;
    startDate = new Date(currentYear, startMonth - 1, 1);
    endDate = new Date(currentYear, startMonth + 2, 0);
    const prevQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
    const prevYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
    const prevStartMonth = (prevQuarter - 1) * 3 + 1;
    previousStartDate = new Date(prevYear, prevStartMonth - 1, 1);
    previousEndDate = new Date(prevYear, prevStartMonth + 2, 0);
    periodLabel = `${currentYear}-Q${currentQuarter}`;
  } else {
    startDate = new Date(currentYear, 0, 1);
    endDate = new Date(currentYear, 11, 31);
    previousStartDate = new Date(currentYear - 1, 0, 1);
    previousEndDate = new Date(currentYear - 1, 11, 31);
    periodLabel = `${currentYear}`;
  }

  return { startDate, endDate, previousStartDate, previousEndDate, periodLabel, currentYear };
};

const computeChartData = async (period, year, month, quarter, currentYear) => {
  const chartData = [];
  const chartPeriods = 6;

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

    const periodPayments = await repo.getContractPaymentsRangeSimple(chartStart, chartEnd);
    const revenue = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const paid = periodPayments.reduce((sum, p) => (p.status === 'PAID' ? sum + Number(p.paid_amount) : sum), 0);
    chartData.push({ period: chartLabel, revenue: Math.round(revenue), paid: Math.round(paid) });
  }

  return chartData;
};

const getRevenueReport = async (period, year, month, quarter) => {
  const { startDate, endDate, previousStartDate, previousEndDate, periodLabel, currentYear } =
    computeDateRange(period, year, month, quarter);

  const currentPayments = await repo.getContractPaymentsRange(startDate, endDate);
  const previousPayments = await repo.getContractPaymentsRangeSimple(previousStartDate, previousEndDate);

  const totalRevenue = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = currentPayments.reduce((sum, p) => (p.status === 'PAID' ? sum + Number(p.paid_amount) : sum), 0);
  const totalRemaining = totalRevenue - totalPaid;

  const previousRevenue = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const previousPaid = previousPayments.reduce((sum, p) => (p.status === 'PAID' ? sum + Number(p.paid_amount) : sum), 0);

  const changePercent = previousRevenue > 0 ? (((totalRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2) : 0;
  const contractCount = new Set(currentPayments.map((p) => p.contract_id)).size;

  const chartData = await computeChartData(period, year, month, quarter, currentYear);

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

  return {
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
  };
};

// ============ EXPORT REVENUE REPORT ============
const exportRevenueReport = async (res, period, year, month, quarter) => {
  const currentYear = parseInt(year);
  let startDate, endDate, periodLabel;

  if (period === 'month') {
    const currentMonth = parseInt(month);
    startDate = new Date(currentYear, currentMonth - 1, 1);
    endDate = new Date(currentYear, currentMonth, 0);
    periodLabel = `T${currentMonth}-${currentYear}`;
  } else if (period === 'quarter') {
    const currentQuarter = parseInt(quarter);
    const startMonth = (currentQuarter - 1) * 3 + 1;
    startDate = new Date(currentYear, startMonth - 1, 1);
    endDate = new Date(currentYear, startMonth + 2, 0);
    periodLabel = `Q${currentQuarter}-${currentYear}`;
  } else {
    startDate = new Date(currentYear, 0, 1);
    endDate = new Date(currentYear, 11, 31);
    periodLabel = `${currentYear}`;
  }

  const payments = await repo.getContractPaymentsRange(startDate, endDate);

  const workbook = createWorkbook();
  const worksheet = workbook.addWorksheet(`Báo Cáo Doanh Thu ${periodLabel}`);
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
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  const statusMap = { PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', OVERDUE: 'Quá hạn' };

  payments.forEach((p) => {
    const amount = Number(p.amount);
    const paidAmount = Number(p.paid_amount);
    worksheet.addRow({
      contract_code: p.contracts.contract_code,
      customer: p.contracts.customers.name,
      apartment: p.contracts.apartments.code,
      installment: p.installment,
      due_date: p.due_date ? new Date(p.due_date).toLocaleDateString('vi-VN') : '',
      amount,
      paid_amount: paidAmount,
      remaining: amount - paidAmount,
      status: statusMap[p.status] || p.status,
      payment_date: p.payment_date ? new Date(p.payment_date).toLocaleDateString('vi-VN') : '',
    });
  });

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
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
  ['F', 'G', 'H'].forEach((col) => {
    worksheet.getColumn(col).numFmt = '#,##0';
  });

  setResponseExcel(res, `Bao_cao_doanh_thu_${periodLabel}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  exportUnifiedBilling,
  exportResidents,
  exportApartments,
  exportUtility,
  exportContracts,
  getRevenueReport,
  exportRevenueReport,
};

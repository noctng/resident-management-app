const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');

/**
 * Sales KPI & Conversion Funnel Service (B.10 / E.3 / E.4)
 */

async function getConversionFunnel(filters = {}) {
  const { startDate, endDate, phase } = filters;

  const dateFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const [leads, bookings, deposits, contracts, handovers] = await Promise.all([
    prisma.crm_leads.count({
      where: hasDateFilter ? { created_at: dateFilter } : {},
    }),
    prisma.sales_bookings.count({
      where: hasDateFilter ? { created_at: dateFilter } : {},
    }),
    prisma.deposit_receipts.count({
      where: hasDateFilter ? { created_at: dateFilter } : {},
    }),
    prisma.contracts.count({
      where: hasDateFilter ? { created_at: dateFilter } : {},
    }),
    prisma.contracts.count({
      where: {
        handover_completed: true,
        ...(hasDateFilter ? { handover_date: dateFilter } : {}),
      },
    }),
  ]);

  const stages = [
    { stage: 'LEADS', name: 'Khách hàng tiềm năng (Leads)', count: leads },
    { stage: 'BOOKINGS', name: 'Giữ chỗ căn hộ (Bookings)', count: bookings },
    { stage: 'DEPOSITS', name: 'Đặt cọc (PDC Receipts)', count: deposits },
    { stage: 'CONTRACTS', name: 'Hợp đồng mua bán (HĐMB)', count: contracts },
    { stage: 'HANDOVERS', name: 'Bàn giao căn hộ (Handover)', count: handovers },
  ];

  const funnelWithRates = stages.map((item, idx) => {
    const prevCount = idx === 0 ? item.count : stages[idx - 1].count;
    const conversionRate = prevCount > 0 ? Math.round((item.count / prevCount) * 100) : 0;
    const dropRate = prevCount > 0 ? Math.round((1 - item.count / prevCount) * 100) : 0;
    return {
      ...item,
      conversionRate,
      dropRate: idx === 0 ? 0 : dropRate,
    };
  });

  return {
    success: true,
    funnel: funnelWithRates,
    summary: {
      totalLeads: leads,
      totalContracts: contracts,
      overallConversionRate: leads > 0 ? Math.round((contracts / leads) * 100) : 0,
    },
  };
}

async function getEmployeeKpiReport(filters = {}) {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
    },
  });

  const [leadsGroup, contractsGroup, commissionsGroup] = await Promise.all([
    prisma.crm_leads.groupBy({
      by: ['assigned_to'],
      _count: { id: true },
    }),
    prisma.contracts.findMany({
      include: {
        customers: true,
        apartments: true,
      },
    }),
    prisma.commissions.findMany({
      include: {
        users: true,
      },
    }),
  ]);

  const leadCountMap = {};
  leadsGroup.forEach((g) => {
    if (g.assigned_to) leadCountMap[g.assigned_to] = g._count.id;
  });

  const report = users.map((user) => {
    const assignedLeads = leadCountMap[user.id] || 0;

    const userCommissions = commissionsGroup.filter((c) => c.agent_id === user.id);
    const totalCommission = userCommissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
    const paidCommission = userCommissions.reduce((sum, c) => sum + Number(c.paid_amount || 0), 0);

    const signedContractsCount = userCommissions.length;
    const totalSalesVolume = userCommissions.reduce((sum, c) => sum + Number(c.deal_value || 0), 0);

    const conversionRate = assignedLeads > 0 ? Math.round((signedContractsCount / assignedLeads) * 100) : 0;

    return {
      userId: user.id,
      userName: user.name || user.username,
      role: user.role,
      assignedLeads,
      signedContractsCount,
      totalSalesVolume,
      totalCommission,
      paidCommission,
      pendingCommission: totalCommission - paidCommission,
      conversionRate,
    };
  });

  return {
    success: true,
    employeesCount: report.length,
    report,
  };
}

async function exportSalesKpiExcel(res, filters = {}) {
  const [funnelData, employeeData] = await Promise.all([
    getConversionFunnel(filters),
    getEmployeeKpiReport(filters),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Resident Management System - Sales KPI Engine';
  workbook.created = new Date();

  // Sheet 1: Funnel
  const funnelSheet = workbook.addWorksheet('Phễu Chuyển Đổi Sales');
  funnelSheet.columns = [
    { header: 'Giai Đoạn', key: 'name', width: 35 },
    { header: 'Số Lượng', key: 'count', width: 15 },
    { header: 'Tỷ Lệ Chuyển Đổi (%)', key: 'conversionRate', width: 22 },
    { header: 'Tỷ Lệ Rơi Rút (%)', key: 'dropRate', width: 20 },
  ];
  funnelSheet.getRow(1).font = { bold: true };

  funnelData.funnel.forEach((f) => {
    funnelSheet.addRow({
      name: f.name,
      count: f.count,
      conversionRate: `${f.conversionRate}%`,
      dropRate: `${f.dropRate}%`,
    });
  });

  // Sheet 2: Employee KPI
  const empSheet = workbook.addWorksheet('KPI Nhân Viên Kinh Doanh');
  empSheet.columns = [
    { header: 'Tên Nhân Viên', key: 'userName', width: 25 },
    { header: 'Chức Danh', key: 'role', width: 20 },
    { header: 'Leads Được Giao', key: 'assignedLeads', width: 18 },
    { header: 'Số HĐMB Ký', key: 'signedContractsCount', width: 15 },
    { header: 'Doanh Số (VNĐ)', key: 'totalSalesVolume', width: 22 },
    { header: 'Tỷ Lệ Chuyển Đổi (%)', key: 'conversionRate', width: 22 },
    { header: 'Hoa Hồng Đã Nhận (VNĐ)', key: 'paidCommission', width: 25 },
    { header: 'Hoa Hồng Còn Lại (VNĐ)', key: 'pendingCommission', width: 25 },
  ];
  empSheet.getRow(1).font = { bold: true };

  employeeData.report.forEach((emp) => {
    empSheet.addRow({
      userName: emp.userName,
      role: emp.role,
      assignedLeads: emp.assignedLeads,
      signedContractsCount: emp.signedContractsCount,
      totalSalesVolume: emp.totalSalesVolume,
      conversionRate: `${emp.conversionRate}%`,
      paidCommission: emp.paidCommission,
      pendingCommission: emp.pendingCommission,
    });
  });

  ['E', 'G', 'H'].forEach((colKey) => {
    empSheet.getColumn(colKey).numFmt = '#,##0';
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Bao_Cao_KPI_Sales.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  getConversionFunnel,
  getEmployeeKpiReport,
  exportSalesKpiExcel,
};

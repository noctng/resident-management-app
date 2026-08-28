const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');

/**
 * 1. Executive Summary Overview (4 Top KPIs)
 */
exports.getOverview = async (req, res) => {
  try {
    const { phase, year = new Date().getFullYear() } = req.query;

    const aptWhere = phase && phase !== 'ALL' ? { phase_code: phase } : {};

    // 1. Sales & Revenue
    const contracts = await prisma.contracts.findMany({
      where: {
        apartments: aptWhere,
        status: { not: 'CANCELLED' },
      },
      include: {
        contract_payments: true,
      },
    });

    const totalContractValue = contracts.reduce((sum, c) => sum + Number(c.total_value || 0), 0);
    const totalCollected = contracts.reduce((sum, c) => {
      const paidInContract = c.contract_payments
        .filter((p) => p.status === 'PAID')
        .reduce((s, p) => s + Number(p.paid_amount || p.amount || 0), 0);
      return sum + paidInContract;
    }, 0);

    // 2. Overdue Receivables
    const now = new Date();
    const allPayments = await prisma.contract_payments.findMany({
      where: {
        contracts: { apartments: aptWhere, status: { not: 'CANCELLED' } },
        status: 'PENDING',
        due_date: { lt: now },
      },
    });
    const totalOverdueAmount = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 3. Maintenance Fund 2%
    const totalMaintenanceFund = contracts.reduce((sum, c) => sum + Number(c.maintenance_fee || 0), 0);

    // 4. Construction Deposits 100M held
    const constructionRegs = await prisma.construction_registrations.findMany({
      where: {
        apartments: aptWhere,
        deposit_status: 'DEPOSITED',
      },
    });
    const totalDepositHeld = constructionRegs.reduce((sum, r) => sum + Number(r.deposit_amount || 100000000), 0);

    // 5. Warranty SLA %
    const claims = await prisma.warranty_claims.findMany({
      where: { apartments: aptWhere },
    });
    const completedClaims = claims.filter((c) => c.status === 'COMPLETED');
    const onTimeClaims = completedClaims.filter((c) => {
      if (!c.sla_deadline || !c.completed_at) return true;
      return new Date(c.completed_at) <= new Date(c.sla_deadline);
    });
    const slaAdherenceRate = completedClaims.length > 0
      ? Math.round((onTimeClaims.length / completedClaims.length) * 100)
      : 100;

    // 6. Handover rate
    const totalApartments = await prisma.apartments.count({ where: aptWhere });
    const handedOverCount = contracts.filter((c) => c.handover_completed || c.status === 'COMPLETED').length;
    const handoverRate = totalApartments > 0 ? Math.round((handedOverCount / totalApartments) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalContractValue,
        totalCollected,
        collectionRate: totalContractValue > 0 ? Math.round((totalCollected / totalContractValue) * 100) : 0,
        totalOverdueAmount,
        overdueCount: allPayments.length,
        totalMaintenanceFund,
        totalDepositHeld,
        slaAdherenceRate,
        totalClaims: claims.length,
        handedOverCount,
        totalApartments,
        handoverRate,
      },
    });
  } catch (err) {
    console.error('Lỗi tổng quan điều hành:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Sales & Funnel Analytics (Pillar 1)
 */
exports.getSalesFunnel = async (req, res) => {
  try {
    const { phase } = req.query;
    const aptWhere = phase && phase !== 'ALL' ? { phase_code: phase } : {};

    // Funnel counts
    const leadsCount = await prisma.crm_opportunities.count();
    const bookingsCount = await prisma.sales_bookings.count({
      where: { apartments: aptWhere },
    });
    const depositsCount = await prisma.deposit_receipts.count({
      where: { apartments: aptWhere },
    });
    const contractsCount = await prisma.contracts.count({
      where: { apartments: aptWhere, status: { not: 'CANCELLED' } },
    });
    const transfersCount = await prisma.contract_transfers.count({
      where: { contracts: { apartments: aptWhere } },
    });

    // Sales by Phase
    const phases = ['CANTATA', 'TESLA', 'DA_VINCI'];
    const phaseRevenue = await Promise.all(
      phases.map(async (p) => {
        const pContracts = await prisma.contracts.findMany({
          where: { apartments: { phase_code: p }, status: { not: 'CANCELLED' } },
        });
        const val = pContracts.reduce((sum, c) => sum + Number(c.total_value || 0), 0);
        return { phase: p, count: pContracts.length, totalValue: val };
      })
    );

    // Commissions summary
    const commissions = await prisma.commissions.findMany({
      where: { contracts: { apartments: aptWhere } },
    });
    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);
    const paidCommission = commissions.reduce((sum, c) => sum + Number(c.paid_amount || 0), 0);

    res.json({
      success: true,
      funnel: [
        { stage: 'LEADS', label: '1. Khách Hàng Tiềm Năng (Leads)', count: leadsCount, dropRate: 0 },
        { stage: 'BOOKINGS', label: '2. Giữ Chỗ Căn Hộ', count: bookingsCount, dropRate: leadsCount > 0 ? Math.round((1 - bookingsCount / leadsCount) * 100) : 0 },
        { stage: 'DEPOSITS', label: '3. Phiếu Thu Đặt Cọc (PDC)', count: depositsCount, dropRate: bookingsCount > 0 ? Math.round((1 - depositsCount / bookingsCount) * 100) : 0 },
        { stage: 'CONTRACTS', label: '4. Ký Hợp Đồng Mua Bán (HĐMB)', count: contractsCount, dropRate: depositsCount > 0 ? Math.round((1 - contractsCount / depositsCount) * 100) : 0 },
        { stage: 'TRANSFERS', label: '5. Chuyển Nhượng HĐMB', count: transfersCount, dropRate: 0 },
      ],
      phaseRevenue,
      commissions: {
        totalCommission,
        paidCommission,
        remainingCommission: totalCommission - paidCommission,
      },
    });
  } catch (err) {
    console.error('Lỗi phễu bán hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Financial & Aging Receivables Analytics (Pillar 2)
 */
exports.getFinancialAging = async (req, res) => {
  try {
    const { phase } = req.query;
    const aptWhere = phase && phase !== 'ALL' ? { phase_code: phase } : {};

    const now = new Date();

    const pendingPayments = await prisma.contract_payments.findMany({
      where: {
        contracts: { apartments: aptWhere, status: { not: 'CANCELLED' } },
        status: 'PENDING',
      },
      include: {
        contracts: {
          include: {
            apartments: true,
            customers: true,
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    const aging = {
      notDue: { label: 'Chưa Đến Hạn', amount: 0, count: 0, payments: [] },
      d0_30: { label: 'Quá Hạn 1 - 30 Ngày', amount: 0, count: 0, payments: [] },
      d31_60: { label: 'Quá Hạn 31 - 60 Ngày', amount: 0, count: 0, payments: [] },
      d61_90: { label: 'Quá Hạn 61 - 90 Ngày', amount: 0, count: 0, payments: [] },
      d90plus: { label: 'Quá Hạn > 90 Ngày (Khó Đòi)', amount: 0, count: 0, payments: [] },
    };

    // Cash flow forecast for next 30/60/90 days
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60d = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const in90d = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    let forecast30d = 0;
    let forecast60d = 0;
    let forecast90d = 0;

    for (const p of pendingPayments) {
      const amt = Number(p.amount || 0);
      const dueDate = new Date(p.due_date);

      if (dueDate >= now) {
        aging.notDue.amount += amt;
        aging.notDue.count += 1;

        if (dueDate <= in30d) forecast30d += amt;
        else if (dueDate <= in60d) forecast60d += amt;
        else if (dueDate <= in90d) forecast90d += amt;
      } else {
        const diffDays = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
        const item = {
          id: p.id,
          contract_code: p.contracts?.contract_code,
          apartment_code: p.contracts?.apartments?.code,
          customer_name: p.contracts?.customers?.name,
          installment_number: p.installment_number,
          due_date: p.due_date,
          diffDays,
          amount: amt,
        };

        if (diffDays <= 30) {
          aging.d0_30.amount += amt;
          aging.d0_30.count += 1;
          aging.d0_30.payments.push(item);
        } else if (diffDays <= 60) {
          aging.d31_60.amount += amt;
          aging.d31_60.count += 1;
          aging.d31_60.payments.push(item);
        } else if (diffDays <= 90) {
          aging.d61_90.amount += amt;
          aging.d61_90.count += 1;
          aging.d61_90.payments.push(item);
        } else {
          aging.d90plus.amount += amt;
          aging.d90plus.count += 1;
          aging.d90plus.payments.push(item);
        }
      }
    }

    res.json({
      success: true,
      aging,
      forecast: {
        next30d: forecast30d,
        next60d: forecast60d,
        next90d: forecast90d,
        totalUpcoming: forecast30d + forecast60d + forecast90d,
      },
    });
  } catch (err) {
    console.error('Lỗi phân tích tuổi nợ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Operations, Maintenance & SLA Analytics (Pillar 3)
 */
exports.getOperationsSla = async (req, res) => {
  try {
    const { phase } = req.query;
    const aptWhere = phase && phase !== 'ALL' ? { phase_code: phase } : {};

    const claims = await prisma.warranty_claims.findMany({
      where: { apartments: aptWhere },
      include: { contractors: true, apartments: true },
    });

    // Pareto Categories Breakdown
    const categoryMap = {};
    for (const c of claims) {
      const cat = c.category || 'KY_THUAT';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    const pareto = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      count: categoryMap[cat],
      percentage: claims.length > 0 ? Math.round((categoryMap[cat] / claims.length) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // Contractor Rankings
    const contractors = await prisma.contractors.findMany({
      include: {
        warranty_claims: {
          where: { apartments: aptWhere },
        },
      },
    });

    const contractorRanking = contractors.map((ctr) => {
      const total = ctr.warranty_claims.length;
      const done = ctr.warranty_claims.filter((c) => c.status === 'COMPLETED').length;
      return {
        id: ctr.id,
        name: ctr.name,
        trade_type: ctr.trade_type,
        rating: Number(ctr.rating || 5),
        totalAssigned: total,
        completed: done,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 100,
      };
    }).sort((a, b) => b.rating - a.rating);

    // Construction Fitout Stats
    const fitouts = await prisma.construction_registrations.findMany({
      where: { apartments: aptWhere },
      include: { construction_violations: true },
    });
    const totalFines = fitouts.reduce(
      (sum, f) => sum + f.construction_violations.reduce((s, v) => s + Number(v.fine_amount || 0), 0),
      0
    );

    res.json({
      success: true,
      pareto,
      contractorRanking,
      fitouts: {
        totalRegistrations: fitouts.length,
        constructing: fitouts.filter((f) => f.status === 'CONSTRUCTING').length,
        settled: fitouts.filter((f) => f.status === 'SETTLED').length,
        totalFines,
      },
    });
  } catch (err) {
    console.error('Lỗi phân tích vận hành SLA:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Community & Occupancy Analytics (Pillar 4)
 */
exports.getCommunityOccupancy = async (req, res) => {
  try {
    const { phase } = req.query;
    const aptWhere = phase && phase !== 'ALL' ? { phase_code: phase } : {};

    const apartments = await prisma.apartments.findMany({
      where: aptWhere,
      include: {
        occupancies: {
          include: { residents: true },
        },
        vehicles: true,
        contracts: true,
      },
    });

    const totalApts = apartments.length;
    const occupiedApts = apartments.filter((a) => a.occupancies.length > 0).length;
    const totalResidents = apartments.reduce((sum, a) => sum + a.occupancies.length, 0);

    const totalCars = apartments.reduce(
      (sum, a) => sum + a.vehicles.filter((v) => v.vehicle_type === 'CAR').length,
      0
    );
    const totalBikes = apartments.reduce(
      (sum, a) => sum + a.vehicles.filter((v) => v.vehicle_type === 'MOTORBIKE').length,
      0
    );

    res.json({
      success: true,
      community: {
        totalApartments: totalApts,
        occupiedApartments: occupiedApts,
        occupancyRate: totalApts > 0 ? Math.round((occupiedApts / totalApts) * 100) : 0,
        totalResidents,
        vehicles: {
          cars: totalCars,
          motorbikes: totalBikes,
          total: totalCars + totalBikes,
        },
      },
    });
  } catch (err) {
    console.error('Lỗi phân tích cư dân đô thị:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. Export Multi-sheet Executive Excel Report
 */
exports.exportExecutiveReport = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Thành Phố Cà Phê CRM & Operations';
    workbook.created = new Date();

    // Sheet 1: Tổng quan Bán hàng & HĐMB
    const ws1 = workbook.addWorksheet('1. Bán Hàng & HĐMB');
    ws1.columns = [
      { header: 'Mã HĐMB', key: 'code', width: 22 },
      { header: 'Căn Hộ', key: 'apartment', width: 12 },
      { header: 'Khách Hàng', key: 'customer', width: 25 },
      { header: 'Tổng Giá Trị (VNĐ)', key: 'total_value', width: 20 },
      { header: 'Đã Thu (VNĐ)', key: 'paid', width: 20 },
      { header: 'Trạng Thái', key: 'status', width: 15 },
    ];
    const contracts = await prisma.contracts.findMany({
      include: { apartments: true, customers: true, contract_payments: true },
      take: 100,
    });
    for (const c of contracts) {
      const paid = c.contract_payments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + Number(p.paid_amount || p.amount || 0), 0);
      ws1.addRow({
        code: c.contract_code,
        apartment: c.apartments?.code,
        customer: c.customers?.name,
        total_value: Number(c.total_value || 0),
        paid,
        status: c.status,
      });
    }

    // Sheet 2: Tuổi Nợ (Aging)
    const ws2 = workbook.addWorksheet('2. Ma Trận Tuổi Nợ');
    ws2.columns = [
      { header: 'HĐMB', key: 'contract', width: 20 },
      { header: 'Căn Hộ', key: 'apartment', width: 12 },
      { header: 'Khách Hàng', key: 'customer', width: 25 },
      { header: 'Đợt', key: 'installment', width: 8 },
      { header: 'Hạn Thanh Toán', key: 'due_date', width: 15 },
      { header: 'Số Tiền Quá Hạn (VNĐ)', key: 'amount', width: 22 },
    ];
    const overdue = await prisma.contract_payments.findMany({
      where: { status: 'PENDING', due_date: { lt: new Date() } },
      include: { contracts: { include: { apartments: true, customers: true } } },
    });
    for (const p of overdue) {
      ws2.addRow({
        contract: p.contracts?.contract_code,
        apartment: p.contracts?.apartments?.code,
        customer: p.contracts?.customers?.name,
        installment: p.installment_number,
        due_date: new Date(p.due_date).toLocaleDateString('vi-VN'),
        amount: Number(p.amount || 0),
      });
    }

    // Sheet 3: Vận Hành & Bảo Hành
    const ws3 = workbook.addWorksheet('3. Bảo Hành & SLA');
    ws3.columns = [
      { header: 'Mã Phiếu BH', key: 'claim_code', width: 18 },
      { header: 'Căn Hộ', key: 'apartment', width: 12 },
      { header: 'Hạng Mục', key: 'category', width: 18 },
      { header: 'Mức Độ', key: 'severity', width: 12 },
      { header: 'Nhà Thầu', key: 'contractor', width: 25 },
      { header: 'Trạng Thái', key: 'status', width: 15 },
    ];
    const claims = await prisma.warranty_claims.findMany({
      include: { apartments: true, contractors: true },
    });
    for (const cl of claims) {
      ws3.addRow({
        claim_code: cl.claim_code,
        apartment: cl.apartments?.code,
        category: cl.category,
        severity: cl.severity,
        contractor: cl.contractors?.name || 'Chưa gán',
        status: cl.status,
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Bao-Cao-Dieu-Hanh-Tong-Hop-TPCP.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Lỗi xuất Excel điều hành:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

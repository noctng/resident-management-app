const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * 1. Get Handover & Snag List for a Contract / Apartment
 */
exports.getHandoverDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contracts.findFirst({
      where: { OR: [{ id }, { contract_code: id }, { apartment_id: id }] },
      include: {
        apartments: true,
        customers: true,
        handover_checklists: { orderBy: { item_order: 'asc' } },
        snag_items: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ bàn giao' });
    }

    res.json({
      success: true,
      contract,
      openSnagsCount: contract.snag_items.filter((s) => s.status === 'OPEN').length,
    });
  } catch (err) {
    console.error('Lỗi lấy hồ sơ bàn giao:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Add Snag Item (Biên bản ghi nhận lỗi kỹ thuật)
 */
exports.addSnagItem = async (req, res) => {
  try {
    const { id } = req.params; // contract_id
    const {
      room_area = 'PHÒNG KHÁCH',
      category = 'KỸ THUẬT',
      description,
      severity = 'MINOR',
      photo_urls = [],
      assigned_contractor,
      sla_days = 7,
    } = req.body;

    const contract = await prisma.contracts.findUnique({ where: { id } });
    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    const slaDeadline = new Date(Date.now() + sla_days * 24 * 60 * 60 * 1000);
    const snag = await prisma.snag_items.create({
      data: {
        id: 'sng_' + crypto.randomBytes(6).toString('hex'),
        contract_id: contract.id,
        apartment_id: contract.apartment_id,
        room_area,
        category,
        description,
        severity,
        status: 'OPEN',
        photo_urls,
        assigned_contractor,
        sla_deadline: slaDeadline,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Đã thêm hạng mục lỗi vào Snag List',
      snag,
    });
  } catch (err) {
    console.error('Lỗi thêm Snag item:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Resolve Snag Item (Xác nhận sửa xong lỗi)
 */
exports.resolveSnagItem = async (req, res) => {
  try {
    const { snagId } = req.params;
    const { verified_by_customer = false } = req.body;

    const snag = await prisma.snag_items.update({
      where: { id: snagId },
      data: {
        status: 'RESOLVED',
        resolved_at: new Date(),
        resolved_by: req.user?.username || 'Kỹ thuật KĐT',
        verified_by_customer,
      },
    });

    res.json({
      success: true,
      message: 'Đã cập nhật khắc phục lỗi thành công',
      snag,
    });
  } catch (err) {
    console.error('Lỗi cập nhật Snag item:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. COMPLETE HANDOVER & ACTIVATE AUTOMATIC OPERATIONS BRIDGE (B.9)
 */
exports.completeHandoverBridge = async (req, res) => {
  try {
    const { id } = req.params; // contract_id
    const {
      initial_electricity_reading = 0,
      initial_water_reading = 0,
      notes,
    } = req.body;

    const contract = await prisma.contracts.findUnique({
      where: { id },
      include: {
        apartments: true,
        customers: true,
        snag_items: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    // Validate Snag list: Block if there are open CRITICAL snags (BLUEPRINT B.8.2)
    const openCriticalSnags = (contract.snag_items || []).filter(
      (s) => s.status === 'OPEN' && s.severity === 'CRITICAL'
    );

    if (openCriticalSnags.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể hoàn tất bàn giao: Căn hộ còn ${openCriticalSnags.length} lỗi kỹ thuật NGHIÊM TRỌNG (CRITICAL) chưa khắc phục. Bắt buộc sửa chữa trước khi bàn giao!`,
        openCriticalSnagsCount: openCriticalSnags.length,
      });
    }

    const { apartments: unit, customers: cust } = contract;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Execute Operations Bridge in Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Apartment & Contract Status
      await tx.apartments.update({
        where: { id: unit.id },
        data: { sales_status: 'HANDED_OVER' },
      });

      await tx.contracts.update({
        where: { id: contract.id },
        data: {
          status: 'COMPLETED',
          handover_completed: true,
          handover_date_actual: now,
        },
      });

      // 2. Create or Find Resident (Chủ Sở Hữu)
      let resident = await tx.residents.findFirst({
        where: {
          OR: [
            { phone_number: cust.phone_number },
            ...(cust.id_number ? [{ id_number: cust.id_number }] : []),
          ],
        },
      });

      if (!resident) {
        resident = await tx.residents.create({
          data: {
            id: 'res_' + crypto.randomBytes(6).toString('hex'),
            name: cust.name,
            phone_number: cust.phone_number,
            id_number: cust.id_number || ('ID_' + crypto.randomBytes(4).toString('hex')),
            email: cust.email || null,
          },
        });
      }

      // 3. Create Occupancy Record (Gán căn hộ với Cư dân)
      const existingOccupancy = await tx.occupancies.findFirst({
        where: { apartment_id: unit.id, resident_id: resident.id },
      });

      if (!existingOccupancy) {
        await tx.occupancies.create({
          data: {
            apartment_id: unit.id,
            resident_id: resident.id,
          },
        });
      }

      // 4. Create Resident Account for Resident Portal App Login
      const existingAccount = await tx.resident_accounts.findUnique({
        where: { resident_id: resident.id },
      });

      if (!existingAccount) {
        const defaultHash = await bcrypt.hash(cust.phone_number, 10);
        await tx.resident_accounts.create({
          data: {
            resident_id: resident.id,
            password_hash: defaultHash,
          },
        });
      }

      // 5. Initialize Initial Utility Record (Chốt số điện nước bàn giao)
      const existingUtility = await tx.utility_records.findFirst({
        where: { apartment_id: unit.id, month: currentMonth, year: currentYear },
      });

      if (!existingUtility) {
        await tx.utility_records.create({
          data: {
            id: 'utl_' + crypto.randomBytes(6).toString('hex'),
            apartment_id: unit.id,
            month: currentMonth,
            year: currentYear,
            electricity_old_reading: initial_electricity_reading,
            electricity_new_reading: initial_electricity_reading,
            water_old_reading: initial_water_reading,
            water_new_reading: initial_water_reading,
          },
        });
      }

      // 6. Initialize Initial Management Fee Record (Bắt đầu thu phí QL)
      const existingFee = await tx.management_fees.findFirst({
        where: { apartment_id: unit.id, month: currentMonth, year: currentYear },
      });

      if (!existingFee) {
        const area = Number(unit.land_area || unit.area || 100);
        const feePerSqm = 10000; // Default 10k/m2
        const mgmtFee = Math.round(area * feePerSqm);

        await tx.management_fees.create({
          data: {
            id: 'fee_' + crypto.randomBytes(6).toString('hex'),
            apartment_id: unit.id,
            month: currentMonth,
            year: currentYear,
            area,
            management_fee_per_sqm: feePerSqm,
            management_fee: mgmtFee,
            total_amount: mgmtFee,
            status: 'PENDING',
          },
        });
      }

      return { resident, unit };
    });

    await logActivity(
      req.user,
      'BÀN_GIAO_KÍCH_HOẠT_VẬN_HÀNH',
      'APARTMENT',
      unit.id,
      unit.code,
      `Bàn giao thành công căn ${unit.code} cho chủ sở hữu ${cust.name}. Kích hoạt hồ sơ Cư dân, App Account, Điện Nước & Phí Quản Lý.`
    );

    res.json({
      success: true,
      message: `Bàn giao thành công căn ${unit.code}! Cầu nối vận hành tự động đã khởi tạo Cư dân, Tài khoản App, Điện Nước & Phí Quản Lý.`,
      result,
    });
  } catch (err) {
    console.error('Lỗi kích hoạt Operations Bridge:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. EXECUTIVE CRM & BUSINESS KPI METRICS (B.10)
 */
exports.getExecutiveKpiMetrics = async (req, res) => {
  try {
    // 1. Inventory & Absorption Rate by Phase
    const allUnits = await prisma.apartments.findMany();
    const totalUnitsCount = allUnits.length;

    const absorptionByPhase = {
      TESLA: { total: 0, sold: 0, booked: 0, available: 0, rate: 0 },
      CANTATA: { total: 0, sold: 0, booked: 0, available: 0, rate: 0 },
      NOXH: { total: 0, sold: 0, booked: 0, available: 0, rate: 0 },
    };

    allUnits.forEach((u) => {
      const phase = (u.phase_code || 'CANTATA').toUpperCase();
      if (!absorptionByPhase[phase]) {
        absorptionByPhase[phase] = { total: 0, sold: 0, booked: 0, available: 0, rate: 0 };
      }
      absorptionByPhase[phase].total += 1;

      const st = u.sales_status || 'AVAILABLE';
      if (st === 'CONTRACTED' || st === 'HANDED_OVER' || st === 'DEPOSITED') {
        absorptionByPhase[phase].sold += 1;
      } else if (st === 'BOOKED') {
        absorptionByPhase[phase].booked += 1;
      } else {
        absorptionByPhase[phase].available += 1;
      }
    });

    Object.keys(absorptionByPhase).forEach((p) => {
      const d = absorptionByPhase[p];
      d.rate = d.total > 0 ? Math.round((d.sold / d.total) * 100) : 0;
    });

    // 2. Financial Metrics (Total Contracts Value, Collected, Remaining)
    const contracts = await prisma.contracts.findMany({
      include: { contract_payments: true },
    });

    let totalContractRevenue = 0;
    let totalCollectedAmount = 0;
    let totalOverdueAmount = 0;
    let overduePaymentsCount = 0;

    const now = new Date();
    const d30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const d90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    let forecast30Days = 0;
    let forecast60Days = 0;
    let forecast90Days = 0;

    contracts.forEach((c) => {
      totalContractRevenue += Number(c.total_value || 0);

      c.contract_payments.forEach((p) => {
        totalCollectedAmount += Number(p.paid_amount || 0);
        const due = new Date(p.due_date);
        const unpaid = Number(p.amount) - Number(p.paid_amount || 0);

        if (p.status !== 'PAID' && unpaid > 0) {
          if (now > due) {
            totalOverdueAmount += unpaid;
            overduePaymentsCount += 1;
          } else if (due <= d30) {
            forecast30Days += unpaid;
          } else if (due <= d60) {
            forecast60Days += unpaid;
          } else if (due <= d90) {
            forecast90Days += unpaid;
          }
        }
      });
    });

    const totalRemainingDebt = Math.max(0, totalContractRevenue - totalCollectedAmount);

    // 3. Sales Pipeline Funnel Counts
    const leadsCount = await prisma.crm_leads.count();
    const cartCount = await prisma.sales_cart_items.count();
    const bookingsCount = await prisma.sales_bookings.count({ where: { status: 'ACTIVE' } });
    const depositsCount = await prisma.deposit_receipts.count({ where: { status: 'ACTIVE' } });
    const contractsCount = contracts.length;
    const handedOverCount = allUnits.filter((u) => u.sales_status === 'HANDED_OVER').length;

    res.json({
      success: true,
      metrics: {
        totalUnitsCount,
        totalContractRevenue,
        totalCollectedAmount,
        totalRemainingDebt,
        totalOverdueAmount,
        overduePaymentsCount,
        forecastCashflow: {
          next30Days: forecast30Days,
          next60Days: forecast60Days,
          next90Days: forecast90Days,
        },
        absorptionByPhase,
        funnel: {
          leads: leadsCount,
          cart: cartCount,
          bookings: bookingsCount,
          deposits: depositsCount,
          contracts: contractsCount,
          handedOver: handedOverCount,
        },
      },
    });
  } catch (err) {
    console.error('Lỗi tính toán Executive KPI:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

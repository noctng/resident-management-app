/**
 * handoverBridgeService — nghiệp vụ bàn giao căn hộ.
 * Không truy cập DB trực tiếp (gọi repo). Chao xử lý:
 * - Valid contract tồn tại
 * - SLA deadline computation
 * - Block completehandover khi có CRITICAL snag mở
 * - Mapping DTO → entity, tính toán KPI
 */
const repo = require('../repositories/handoverBridgeRepository');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/**
 * GET /:id — lấy hồ sơ bàn giao kèm snag list.
 * Trả { success, contract, openSnagsCount }.
 */
async function getHandoverDetails(id) {
  const contract = await repo.findContractForHandover(id);
  if (!contract) {
    throw httpError('Không tìm thấy hồ sơ bàn giao', 404);
  }
  const openSnagsCount = (contract.snag_items || []).filter(
    (s) => s.status === 'OPEN'
  ).length;
  return { success: true, contract, openSnagsCount };
}

/**
 * POST /:id/snags — thêm snag item vào hợp đồng.
 * Trả { success, message, snag } với status 201.
 */
async function addSnagItem(contractId, dto) {
  const {
    room_area = 'PHÒNG KHÁCH',
    category = 'KỸ THUẬT',
    description,
    severity = 'MINOR',
    photo_urls = [],
    assigned_contractor,
    sla_days = 7,
  } = dto;

  const contract = await repo.findContractById(contractId);
  if (!contract) {
    throw httpError('Không tìm thấy hợp đồng', 404);
  }

  const slaDeadline = new Date(Date.now() + sla_days * 24 * 60 * 60 * 1000);
  const snag = await repo.createSnagItem({
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
  });

  return {
    success: true,
    message: 'Đã thêm hạng mục lỗi vào Snag List',
    snag,
  };
}

/**
 * POST /snags/:snagId/resolve — cập nhật snag thành RESOLVED.
 * Trả { success, message, snag }.
 */
async function resolveSnagItem(snagId, dto) {
  const { verified_by_customer = false } = dto;

  const snag = await repo.updateSnagItem(snagId, {
    status: 'RESOLVED',
    resolved_at: new Date(),
    resolved_by: dto.resolved_by || 'Kỹ thuật KĐT',
    verified_by_customer,
  });

  return {
    success: true,
    message: 'Đã cập nhật khắc phục lỗi thành công',
    snag,
  };
}

/**
 * POST /:id/complete-bridge — thực thi Operations Bridge.
 * - Block nếu có CRITICAL snag mở
 * - Transaction: update apartment/contract, tạo resident/occupancy/account/
 *   utility/management fee records
 * - Ghi logActivity
 * Trả { success, message, result }.
 */
async function completeHandoverBridge(contractId, dto, user) {
  const { notes } = dto;

  const contract = await repo.findContractById(contractId);
  if (!contract) {
    throw httpError('Không tìm thấy hợp đồng', 404);
  }

  // Validate Snag list: Block nếu có open CRITICAL snags
  const snags = await repo.findContractForHandover(contractId);
  const openCriticalSnags = (snags?.snag_items || []).filter(
    (s) => s.status === 'OPEN' && s.severity === 'CRITICAL'
  );

  if (openCriticalSnags.length > 0) {
    const err = new Error(
      `Không thể hoàn tất bàn giao: Căn hộ còn ${openCriticalSnags.length} lỗi kỹ thuật NGHIÊM TRỌNG (CRITICAL) chưa khắc phục. Bắt buộc sửa chữa trước khi bàn giao!`
    );
    err.status = 400;
    err.openCriticalSnagsCount = openCriticalSnags.length;
    throw err;
  }

  const { apartments: unit, customers: cust } = contract;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const area = Number(unit.land_area || unit.area || 100);
  const feePerSqm = 10000; // Default 10k/m2

  const result = await repo.executeCompleteHandover({
    contractId: contract.id,
    unitId: unit.id,
    customer: cust,
    initial_electricity_reading: dto.initial_electricity_reading || 0,
    initial_water_reading: dto.initial_water_reading || 0,
    area,
    feePerSqm,
    notes,
  });

  // Ghi logActivity (cross-module — giữ nguyên, không spy trong test)
  await logActivity(
    user,
    'BÀN_GIAO_KÍCH_HOẠT_VẬN_HÀNH',
    'APARTMENT',
    unit.id,
    unit.code,
    `Bàn giao thành công căn ${unit.code} cho chủ sở hữu ${cust.name}. Kích hoạt hồ sơ Cư dân, App Account, Điện Nước & Phí Quản Lý.`
  );

  return {
    success: true,
    message: `Bàn giao thành công căn ${unit.code}! Cầu nối vận hành tự động đã khởi tạo Cư dân, Tài khoản App, Điện Nước & Phí Quản Lý.`,
    result,
  };
}

/**
 * GET /analytics/executive-kpis — tính toán Executive CRM & Business KPI Metrics.
 * Trả { success, metrics: { ... } }.
 */
async function getExecutiveKpiMetrics() {
  const { allUnits, contracts, leadsCount, cartCount, bookingsCount, depositsCount } =
    await repo.getExecutiveRawData();

  // 1. Inventory & Absorption Rate by Phase
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

  // 2. Financial Metrics
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
  const handedOverCount = allUnits.filter((u) => u.sales_status === 'HANDED_OVER').length;

  return {
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
        contracts: contracts.length,
        handedOver: handedOverCount,
      },
    },
  };
}

module.exports = {
  getHandoverDetails,
  addSnagItem,
  resolveSnagItem,
  completeHandoverBridge,
  getExecutiveKpiMetrics,
};

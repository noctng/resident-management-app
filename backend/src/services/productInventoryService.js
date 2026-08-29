const { logActivity } = require('../utils/logger');
const repo = require('../repositories/productInventoryRepository');

// Helper: xác định trạng thái bán hàng động từ contracts/bookings
const computeEffectiveStatus = (u) => {
  let currentStatus = u.sales_status || 'AVAILABLE';
  if (u.contracts && u.contracts.length > 0) {
    const c = u.contracts[0];
    if (c.status === 'COMPLETED') currentStatus = 'HANDED_OVER';
    else if (c.status === 'SIGNED' || c.status === 'PAYING') currentStatus = 'CONTRACTED';
    else if (c.status === 'DEPOSIT') currentStatus = 'DEPOSITED';
  } else if (u.sales_bookings && u.sales_bookings.length > 0) {
    currentStatus = 'BOOKED';
  }
  return currentStatus;
};

// Helper: build matrix grouped by Phase -> Block -> Units
const buildSalesMatrix = (units) => {
  const matrix = { TESLA: {}, CANTATA: {}, NOXH: {} };
  const stats = {
    total: units.length,
    available: 0,
    booked: 0,
    deposited: 0,
    contracted: 0,
    handedOver: 0,
    locked: 0,
  };

  units.forEach((u) => {
    const p = u.phase_code || 'CANTATA';
    const b = u.block_code || 'Dãy 01';

    if (!matrix[p]) matrix[p] = {};
    if (!matrix[p][b]) matrix[p][b] = [];

    const currentStatus = computeEffectiveStatus(u);
    switch (currentStatus) {
      case 'AVAILABLE': stats.available++; break;
      case 'BOOKED': stats.booked++; break;
      case 'DEPOSITED': stats.deposited++; break;
      case 'CONTRACTED': stats.contracted++; break;
      case 'HANDED_OVER': stats.handedOver++; break;
      case 'LOCKED': stats.locked++; break;
      default: stats.available++; break;
    }

    matrix[p][b].push({ ...u, effectiveStatus: currentStatus });
  });

  return { matrix, stats };
};

const buildWhereClause = (filters) => {
  const where = {};
  if (filters.phase && filters.phase !== 'ALL') where.phase_code = filters.phase;
  if (filters.status && filters.status !== 'ALL') where.sales_status = filters.status;
  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search, mode: 'insensitive' } },
      { block_code: { contains: filters.search, mode: 'insensitive' } },
      { lot_number: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  return where;
};

const getSalesMatrix = async (filters) => {
  const where = buildWhereClause(filters);
  const units = await repo.findUnits(where);
  const { matrix, stats } = buildSalesMatrix(units);
  return { success: true, stats, matrix, units, totalUnits: units.length };
};

// Helper: tính giá breakdown
const computePriceBreakdown = (unit) => {
  const landPrice = Number(unit.land_price_before_vat || 0);
  const constructionPrice = Number(unit.construction_price_before_vat || 0);
  const subtotal = landPrice + constructionPrice;
  const vatRate = Number(unit.vat_rate || 8);
  const vatAmount = Math.round((subtotal * vatRate) / 100);
  const maintenanceFee2Pct = Math.round(subtotal * 0.02);
  const grandTotal = subtotal + vatAmount + maintenanceFee2Pct;
  return { landPrice, constructionPrice, subtotal, vatRate, vatAmount, maintenanceFee2Pct, grandTotal };
};

const getProductDetail = async (id) => {
  const unit = await repo.findUnitByCodeOrId(id);
  if (!unit) return { success: false, message: 'Không tìm thấy sản phẩm' };
  const priceBreakdown = computePriceBreakdown(unit);
  return { success: true, unit: { ...unit, priceBreakdown } };
};

const createProductUnit = async (body, user) => {
  const {
    code,
    phase_code = 'CANTATA',
    block_code,
    lot_number,
    house_type = 'SHOPHOUSE',
    floor = 1,
    area,
    land_area,
    construction_area,
    usable_area,
    certificate_area,
    land_price_before_vat = 0,
    construction_price_before_vat = 0,
    vat_rate = 8.00,
    direction = 'Đông Nam',
    view_description,
    bedroom_count = 3,
    bathroom_count = 3,
    svg_coordinates,
    sales_status = 'AVAILABLE',
  } = body;

  if (!code) return { success: false, message: 'Vui lòng nhập Mã Căn / Lô' };

  const existing = await repo.findUnitByCode(code);
  if (existing) return { success: false, message: `Mã căn ${code} đã tồn tại trong hệ thống!` };

  const landArea = Number(land_area || area || 100);
  const constArea = Number(construction_area || (landArea * 0.85).toFixed(1));
  const subtotal = Number(land_price_before_vat || 0) + Number(construction_price_before_vat || 0);
  const maintFee = Math.round(subtotal * 0.02);

  const unit = await repo.createUnit({
    code,
    phase_code,
    block_code: block_code || 'Dãy 01',
    lot_number: lot_number || code,
    house_type,
    floor: Number(floor || 1),
    area: landArea,
    land_area: landArea,
    construction_area: constArea,
    usable_area: Number(usable_area || constArea),
    certificate_area: Number(certificate_area || landArea),
    land_price_before_vat: Number(land_price_before_vat || 0),
    construction_price_before_vat: Number(construction_price_before_vat || 0),
    vat_rate: Number(vat_rate || (phase_code === 'NOXH' ? 5.0 : 8.0)),
    maintenance_fee_2pct: maintFee,
    direction,
    view_description,
    bedroom_count: Number(bedroom_count || 3),
    bathroom_count: Number(bathroom_count || 3),
    svg_coordinates,
    sales_status,
  });

  await logActivity(
    user,
    'THÊM_SẢN_PHẨM_BĐS',
    'APARTMENT',
    unit.id,
    unit.code,
    `Thêm mới sản phẩm ${unit.code} phân khu ${phase_code}. Giá: ${subtotal.toLocaleString('vi-VN')} VNĐ`
  );

  return { success: true, message: `Thêm mới sản phẩm ${unit.code} thành công!`, unit };
};

const updateProductUnit = async (id, body, user) => {
  const existing = await repo.findUnitById(id);
  if (!existing) return { success: false, message: 'Không tìm thấy sản phẩm' };

  const {
    code, phase_code, block_code, lot_number, house_type, floor, area,
    land_area, construction_area, usable_area, certificate_area,
    land_price_before_vat, construction_price_before_vat, vat_rate,
    direction, view_description, bedroom_count, bathroom_count, svg_coordinates, sales_status,
  } = body;

  const landArea = land_area !== undefined ? Number(land_area) : (area !== undefined ? Number(area) : existing.land_area);
  const constArea = construction_area !== undefined ? Number(construction_area) : existing.construction_area;
  const landPrice = land_price_before_vat !== undefined ? Number(land_price_before_vat) : Number(existing.land_price_before_vat || 0);
  const constPrice = construction_price_before_vat !== undefined ? Number(construction_price_before_vat) : Number(existing.construction_price_before_vat || 0);
  const subtotal = landPrice + constPrice;
  const maintFee = Math.round(subtotal * 0.02);

  const data = {
    ...(code ? { code } : {}),
    ...(phase_code ? { phase_code } : {}),
    ...(block_code !== undefined ? { block_code } : {}),
    ...(lot_number !== undefined ? { lot_number } : {}),
    ...(house_type ? { house_type } : {}),
    ...(floor !== undefined ? { floor: Number(floor) } : {}),
    ...(landArea !== undefined ? { area: landArea, land_area: landArea } : {}),
    ...(constArea !== undefined ? { construction_area: constArea } : {}),
    ...(usable_area !== undefined ? { usable_area: Number(usable_area) } : {}),
    ...(certificate_area !== undefined ? { certificate_area: Number(certificate_area) } : {}),
    ...(land_price_before_vat !== undefined ? { land_price_before_vat: landPrice } : {}),
    ...(construction_price_before_vat !== undefined ? { construction_price_before_vat: constPrice } : {}),
    ...(vat_rate !== undefined ? { vat_rate: Number(vat_rate) } : {}),
    maintenance_fee_2pct: maintFee,
    ...(direction !== undefined ? { direction } : {}),
    ...(view_description !== undefined ? { view_description } : {}),
    ...(bedroom_count !== undefined ? { bedroom_count: Number(bedroom_count) } : {}),
    ...(bathroom_count !== undefined ? { bathroom_count: Number(bathroom_count) } : {}),
    ...(svg_coordinates !== undefined ? { svg_coordinates } : {}),
    ...(sales_status ? { sales_status } : {}),
  };

  const updated = await repo.updateUnit(id, data);

  await logActivity(
    user,
    'CẬP_NHẬT_SẢN_PHẨM_BĐS',
    'APARTMENT',
    updated.id,
    updated.code,
    `Cập nhật thông số sản phẩm ${updated.code}`
  );

  return { success: true, message: `Cập nhật sản phẩm ${updated.code} thành công!`, unit: updated };
};

const deleteProductUnit = async (id, user) => {
  const unit = await repo.findUnitForDelete(id);
  if (!unit) return { success: false, message: 'Không tìm thấy sản phẩm' };

  if (unit.contracts && unit.contracts.length > 0) {
    return { success: false, message: `Không thể xóa căn ${unit.code} vì đã phát sinh ${unit.contracts.length} Hợp Đồng Mua Bán!` };
  }
  if (unit.deposit_receipts && unit.deposit_receipts.length > 0) {
    return { success: false, message: `Không thể xóa căn ${unit.code} vì đang có Phiếu Đặt Cọc còn hiệu lực!` };
  }
  if (unit.occupancies && unit.occupancies.length > 0) {
    return { success: false, message: `Không thể xóa căn ${unit.code} vì đang có cư dân đăng ký cư trú!` };
  }

  await repo.deleteUnit(id);
  await logActivity(user, 'XÓA_SẢN_PHẨM_BĐS', 'APARTMENT', id, unit.code, `Xóa sản phẩm ${unit.code} khỏi kho hàng BĐS`);

  return { success: true, message: `Đã xóa sản phẩm ${unit.code} khỏi kho hàng!` };
};

const batchUpdateStatus = async (unit_ids = [], sales_status, user) => {
  if (!unit_ids.length || !sales_status) {
    return { success: false, message: 'Vui lòng chọn danh sách căn và trạng thái' };
  }
  const updated = await repo.batchUpdateStatus(unit_ids, sales_status);
  await logActivity(
    user,
    'CẬP_NHẬT_KHO_HÀNG_LOẠT',
    'APARTMENT',
    'BATCH',
    `${unit_ids.length} căn`,
    `Chuyển trạng thái ${unit_ids.length} căn sang ${sales_status}`
  );
  return { success: true, message: `Đã cập nhật trạng thái ${updated.count} sản phẩm sang ${sales_status}!`, count: updated.count };
};

module.exports = {
  computeEffectiveStatus,
  buildSalesMatrix,
  computePriceBreakdown,
  getSalesMatrix,
  getProductDetail,
  createProductUnit,
  updateProductUnit,
  deleteProductUnit,
  batchUpdateStatus,
};

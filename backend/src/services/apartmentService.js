const repo = require('../repositories/apartmentRepository');
const { logActivity } = require('../utils/logger');

// Map entity (snake_case từ Prisma) → DTO (camelCase + derived pricing) trả frontend.
// Giữ NGUYÊN mọi field/format của handler getAllApartments cũ.
function toListItem(a) {
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
}

// GET /api/apartments — list + filter + map
async function getApartments(query = {}) {
  const { phase, status, search } = query;

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

  const apartments = await repo.listAll(where);
  return apartments.map(toListItem);
}

// POST /api/apartments — create
async function createApartment(dto = {}, user) {
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
  } = dto;

  if (!code) {
    const err = new Error('Vui lòng nhập Mã Căn');
    err.status = 400;
    throw err;
  }

  const existing = await repo.findByCode(code);
  if (existing) {
    const err = new Error(`Mã căn ${code} đã tồn tại!`);
    err.status = 400;
    throw err;
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

  const newApartment = await repo.create({
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
    vat_rate: Number(vatRate || vat_rate || (phase === 'NOXH' ? 5.0 : 8.0)),
    maintenance_fee_2pct: maintFee,
    direction: direction || 'Đông Nam',
    view_description: viewDescription || view_description || '',
    bedroom_count: Number(bedroomCount || bedroom_count || 3),
    bathroom_count: Number(bathroomCount || bathroom_count || 3),
    sales_status: salesStatus || sales_status || 'HANDED_OVER',
  });

  if (user) {
    await logActivity(
      user,
      'TẠO_CĂN_HỘ',
      'APARTMENT',
      newApartment.id,
      newApartment.code,
      `Thêm căn hộ ${newApartment.code} (${phase})`
    );
  }

  return {
    id: newApartment.id,
    houseType: newApartment.house_type,
    code: newApartment.code,
    floor: newApartment.floor,
    area: parseFloat(newApartment.area),
    electricityType: newApartment.electricity_type,
    phase_code: newApartment.phase_code,
    sales_status: newApartment.sales_status,
  };
}

// PUT /api/apartments/:id — update
async function updateApartment(id, dto = {}, user) {
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
  } = dto;

  const existing = await repo.findById(id);
  if (!existing) {
    const err = new Error('Không tìm thấy căn hộ');
    err.status = 404;
    throw err;
  }

  const lArea =
    landArea !== undefined
      ? Number(landArea)
      : land_area !== undefined
        ? Number(land_area)
        : area !== undefined
          ? Number(area)
          : existing.land_area;
  const cArea =
    constructionArea !== undefined
      ? Number(constructionArea)
      : construction_area !== undefined
        ? Number(construction_area)
        : existing.construction_area;
  const lPrice =
    landPrice !== undefined
      ? Number(landPrice)
      : land_price_before_vat !== undefined
        ? Number(land_price_before_vat)
        : Number(existing.land_price_before_vat || 0);
  const cPrice =
    constructionPrice !== undefined
      ? Number(constructionPrice)
      : construction_price_before_vat !== undefined
        ? Number(construction_price_before_vat)
        : Number(existing.construction_price_before_vat || 0);
  const subtotal = lPrice + cPrice;
  const maintFee = Math.round(subtotal * 0.02);

  const updatedApartment = await repo.update(id, {
    data: {
      ...(houseType ? { house_type: houseType } : {}),
      ...(code ? { code } : {}),
      ...(floor !== undefined ? { floor: Number(floor) } : {}),
      ...(lArea !== undefined ? { area: lArea, land_area: lArea } : {}),
      ...(electricityType ? { electricity_type: electricityType } : {}),
      ...((phaseCode || phase_code) ? { phase_code: phaseCode || phase_code } : {}),
      ...((blockCode || block_code) ? { block_code: blockCode || blockCode || block_code } : {}),
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

  if (user) {
    await logActivity(
      user,
      'CẬP_NHẬT_CĂN_HỘ',
      'APARTMENT',
      updatedApartment.id,
      updatedApartment.code,
      `Cập nhật thông tin căn ${updatedApartment.code}`
    );
  }

  return {
    id: updatedApartment.id,
    houseType: updatedApartment.house_type,
    code: updatedApartment.code,
    floor: updatedApartment.floor,
    area: parseFloat(updatedApartment.area),
    electricityType: updatedApartment.electricity_type,
    phase_code: updatedApartment.phase_code,
    sales_status: updatedApartment.sales_status,
  };
}

// DELETE /api/apartments/:id — delete (có guard cư dân / hợp đồng)
async function deleteApartment(id, user) {
  const apt = await repo.findById(id, { contracts: true, occupancies: true });

  if (!apt) {
    const err = new Error('Không tìm thấy căn hộ');
    err.status = 404;
    throw err;
  }

  if (apt.occupancies && apt.occupancies.length > 0) {
    const err = new Error(`Không thể xóa căn ${apt.code} vì đang có cư dân ở!`);
    err.status = 400;
    throw err;
  }

  if (apt.contracts && apt.contracts.length > 0) {
    const err = new Error(`Không thể xóa căn ${apt.code} vì đã phát sinh Hợp đồng Mua Bán!`);
    err.status = 400;
    throw err;
  }

  await repo.remove(id);

  if (user) {
    await logActivity(
      user,
      'XÓA_CĂN_HỘ',
      'APARTMENT',
      id,
      apt.code,
      `Xóa căn hộ ${apt.code}`
    );
  }

  return { message: `Đã xóa căn hộ ${apt.code} thành công` };
}

module.exports = {
  getApartments,
  createApartment,
  updateApartment,
  deleteApartment,
};

const crypto = require('crypto');
const repo = require('../repositories/warrantyRepository');
// Side-effect (audit) qua object để test có thể spyOn
const logger = require('../utils/logger');

// ---------- Helpers (business logic thuần, không prisma) ----------

// Số tháng chênh lệch giữa 2 ngày (dùng kiểm tra thời hạn bảo hành)
function diffMonths(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

// Tính SLA deadline theo mức độ nghiêm trọng
function computeSlaDeadline(severity) {
  let slaHours = 48; // NORMAL: 48h
  if (severity === 'CRITICAL') slaHours = 4;
  else if (severity === 'HIGH') slaHours = 24;
  return new Date(Date.now() + slaHours * 60 * 60 * 1000);
}

// Lấy tên người tạo (cho trường created_by)
function resolveUploader(ctx = {}) {
  const user = ctx.user;
  const resident = ctx.resident;
  return user?.username || user?.name || resident?.name || 'Cư dân';
}

// ---------- 1. Get Warranty Claims & KPI Stats ----------

async function getWarrantyClaims(query = {}) {
  const { phase, status, severity, contractor_id, apartment_id, search } = query;

  const where = {};
  if (status && status !== 'ALL') where.status = status;
  if (severity && severity !== 'ALL') where.severity = severity;
  if (contractor_id && contractor_id !== 'ALL') where.contractor_id = contractor_id;
  if (apartment_id) where.apartment_id = apartment_id;
  if (phase && phase !== 'ALL') {
    where.apartments = { phase_code: phase };
  }
  if (search) {
    where.OR = [
      { claim_code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { location_detail: { contains: search, mode: 'insensitive' } },
      { apartments: { code: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const claims = await repo.listClaims(where);

  // KPI stats (tính trên danh sách đã query)
  const now = new Date();
  const totalClaims = claims.length;
  const inProgressCount = claims.filter((c) =>
    ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)
  ).length;
  const overdueSlaCount = claims.filter((c) => {
    if (['COMPLETED', 'CANCELLED'].includes(c.status)) return false;
    return c.sla_deadline && new Date(c.sla_deadline) < now;
  }).length;
  const completedList = claims.filter((c) => c.status === 'COMPLETED' && c.customer_rating);
  const avgRating =
    completedList.length > 0
      ? (
          completedList.reduce((sum, c) => sum + (c.customer_rating || 5), 0) /
          completedList.length
        ).toFixed(1)
      : '5.0';

  return {
    claims,
    stats: { totalClaims, inProgressCount, overdueSlaCount, avgRating },
  };
}

// ---------- 2. Create Warranty Claim ----------

async function createWarrantyClaim(dto = {}, ctx = {}) {
  const {
    apartment_id,
    contract_id,
    category = 'KY_THUAT',
    location_detail,
    description,
    severity = 'NORMAL',
    photo_urls = [],
    contractor_id,
    notes,
  } = dto;

  if (!apartment_id || !description) {
    const e = new Error('Vui lòng cung cấp căn hộ và mô tả sự cố bảo hành');
    e.status = 400;
    throw e;
  }

  // Kiểm tra thời hạn bảo hành từ ngày bàn giao
  let isUnderWarranty = true;
  let finalContractId = contract_id;

  const contract = await repo.findContractByApartment(apartment_id, contract_id);
  if (contract) {
    finalContractId = contract.id;
    const handoverDate = contract.handover_date_actual || contract.handover_date;
    if (handoverDate) {
      const now = new Date();
      const months = diffMonths(new Date(handoverDate), now);
      // Kết cấu thấm: 60m; còn lại (KT/Điện nước/...): 24m
      const warrantyLimit = ['KET_CAU_THAM'].includes(category) ? 60 : 24;
      if (months > warrantyLimit) isUnderWarranty = false;
    }
  }

  // Tính SLA deadline
  const slaDeadline = computeSlaDeadline(severity);

  // Sinh mã claim BH-TPCP-YYYY-NNNN
  const year = new Date().getFullYear();
  const lastClaim = await repo.findLastClaimByYear(year);
  let nextNum = 1;
  if (lastClaim) {
    const parts = lastClaim.claim_code.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  const claimCode = `BH-TPCP-${year}-${String(nextNum).padStart(4, '0')}`;
  const claimId = 'claim_' + crypto.randomBytes(6).toString('hex');

  const uploader = resolveUploader(ctx);

  const claim = await repo.createClaim({
    id: claimId,
    claim_code: claimCode,
    apartment_id,
    contract_id: finalContractId,
    contractor_id: contractor_id || null,
    category,
    location_detail: location_detail || 'Toàn căn hộ',
    description,
    severity,
    status: contractor_id ? 'ASSIGNED' : 'REPORTED',
    is_under_warranty: isUnderWarranty,
    sla_deadline: slaDeadline,
    photo_urls,
    notes,
    created_by: uploader,
  });

  await logger.logActivity(
    ctx.user,
    'TIẾP_NHẬN_BẢO_HÀNH',
    'WARRANTY_CLAIM',
    claim.id,
    claim.claim_code,
    `Tiếp nhận sự cố bảo hành ${claim.claim_code} - Căn ${claim.apartments?.code}`
  );

  return {
    message: 'Tiếp nhận sự cố bảo hành thành công!',
    claim,
  };
}

// ---------- 3. Assign Contractor ----------

async function assignContractor(id, dto = {}, ctx = {}) {
  const { contractor_id, scheduled_at, resolution_notes } = dto;

  const claim = await repo.updateClaim(id, {
    contractor_id,
    scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
    resolution_notes: resolution_notes || undefined,
    status: 'IN_PROGRESS',
    updated_at: new Date(),
  });

  await logger.logActivity(
    ctx.user,
    'ĐIỀU_PHỐI_NHÀ_THẦU_BH',
    'WARRANTY_CLAIM',
    claim.id,
    claim.claim_code,
    `Điều phối nhà thầu ${claim.contractors?.name} xử lý sự cố ${claim.claim_code}`
  );

  return {
    message: 'Đã điều phối nhà thầu và lên lịch sửa chữa thành công!',
    claim,
  };
}

// ---------- 4. Complete Warranty Claim ----------

async function completeWarrantyClaim(id, dto = {}, ctx = {}) {
  const { customer_signature, customer_rating = 5, resolution_notes } = dto;

  const claim = await repo.updateClaim(id, {
    status: 'COMPLETED',
    completed_at: new Date(),
    customer_signature: customer_signature || undefined,
    customer_rating: Number(customer_rating),
    resolution_notes: resolution_notes || undefined,
    updated_at: new Date(),
  });

  // Cập nhật rating trung bình của nhà thầu
  if (claim.contractor_id) {
    const allDone = await repo.findCompletedClaimsByContractor(claim.contractor_id);
    const avg =
      allDone.reduce((sum, c) => sum + (c.customer_rating || 5), 0) / allDone.length;
    await repo.updateContractorRating(claim.contractor_id, Number(avg.toFixed(2)));
  }

  await logger.logActivity(
    ctx.user,
    'NGHIỆM_THU_BẢO_HÀNH',
    'WARRANTY_CLAIM',
    claim.id,
    claim.claim_code,
    `Nghiệm thu đóng ticket bảo hành ${claim.claim_code} - Đánh giá: ${customer_rating} sao`
  );

  return {
    message: 'Nghiệm thu và đóng hồ sơ bảo hành thành công!',
    claim,
  };
}

// ---------- 5. Get Contractors ----------

async function getContractors() {
  const contractors = await repo.listActiveContractors();
  return { contractors };
}

// ---------- 6. Create Contractor ----------

async function createContractor(dto = {}) {
  const { name, code, contact_person, phone, email, trade_type } = dto;
  const cId = 'ctr_' + crypto.randomBytes(4).toString('hex');
  const contractor = await repo.createContractor({
    id: cId,
    code: code || `NT-${Date.now().toString().slice(-4)}`,
    name,
    contact_person,
    phone,
    email,
    trade_type: trade_type || 'GENERAL',
  });
  return { contractor };
}

// ---------- 7. Update Contractor ----------

async function updateContractor(id, dto = {}) {
  const { name, contact_person, phone, email, trade_type, is_active } = dto;

  const existing = await repo.findContractorById(id);
  if (!existing) {
    const e = new Error('Không tìm thấy nhà thầu');
    e.status = 404;
    throw e;
  }

  const updated = await repo.updateContractor(id, {
    name: name !== undefined ? name.trim() : existing.name,
    contact_person:
      contact_person !== undefined ? contact_person?.trim() : existing.contact_person,
    phone: phone !== undefined ? phone?.trim() : existing.phone,
    email: email !== undefined ? email?.trim() : existing.email,
    trade_type: trade_type !== undefined ? trade_type : existing.trade_type,
    is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
  });

  return { message: 'Cập nhật nhà thầu thành công!', contractor: updated };
}

// ---------- 8. Delete / Deactivate Contractor ----------

async function deleteContractor(id) {
  const existing = await repo.findContractorById(id, true);
  if (!existing) {
    const e = new Error('Không tìm thấy nhà thầu');
    e.status = 404;
    throw e;
  }

  if (existing._count?.warranty_claims > 0) {
    // Soft-delete / deactivate (giữ lịch sử ticket)
    await repo.deactivateContractor(id);
    return {
      message: `Đã vô hiệu hóa nhà thầu "${existing.name}" (giữ lại lịch sử ${existing._count.warranty_claims} ticket bảo hành).`,
    };
  }

  await repo.deleteContractor(id);
  return { message: `Đã xóa nhà thầu "${existing.name}" thành công!` };
}

module.exports = {
  getWarrantyClaims,
  createWarrantyClaim,
  assignContractor,
  completeWarrantyClaim,
  getContractors,
  createContractor,
  updateContractor,
  deleteContractor,
};

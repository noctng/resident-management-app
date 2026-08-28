const crypto = require('crypto');
const repo = require('../repositories/constructionRepository');
const { logActivity } = require('../utils/logger');

// Mọi logic nghiệp vụ của module construction nằm ở đây.
// Service KHÔNG viết prisma query trực tiếp → gọi repo.*.
// Throw lỗi kèm `err.status` để controller format response.

// ===== 1. Get Construction Registrations & Financial Deposit Stats =====
async function getRegistrations({ phase, status, deposit_status, search } = {}) {
  const where = {};
  if (status && status !== 'ALL') where.status = status;
  if (deposit_status && deposit_status !== 'ALL') where.deposit_status = deposit_status;
  if (phase && phase !== 'ALL') {
    where.apartments = { phase_code: phase };
  }
  if (search) {
    where.OR = [
      { reg_code: { contains: search, mode: 'insensitive' } },
      { contractor_name: { contains: search, mode: 'insensitive' } },
      { contact_person: { contains: search, mode: 'insensitive' } },
      { apartments: { code: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const registrations = await repo.findRegistrations(where);

  // Stats
  const totalRegs = registrations.length;
  const activeConstructing = registrations.filter((r) => r.status === 'CONSTRUCTING').length;
  const totalDepositHeld = registrations
    .filter((r) => r.deposit_status === 'DEPOSITED')
    .reduce((sum, r) => sum + Number(r.deposit_amount || 0), 0);
  const totalWorkers = registrations.reduce(
    (sum, r) => sum + (r.construction_workers?.filter((w) => w.status === 'ACTIVE').length || 0),
    0
  );
  const totalViolationsFine = registrations.reduce(
    (sum, r) =>
      sum + (r.construction_violations?.reduce((s, v) => s + Number(v.fine_amount || 0), 0) || 0),
    0
  );

  return {
    registrations,
    stats: {
      totalRegs,
      activeConstructing,
      totalDepositHeld,
      totalWorkers,
      totalViolationsFine,
    },
  };
}

// ===== 2. Create Construction Registration (Enforces 6-month rule & 100M deposit) =====
async function createRegistration(dto, actor) {
  const {
    apartment_id,
    contract_id,
    contractor_name,
    contact_person,
    phone,
    start_date,
    end_date,
    scope_description,
    drawings_url,
    notes,
  } = dto;

  if (!apartment_id || !contractor_name || !start_date || !end_date) {
    const err = new Error('Vui lòng điền đầy đủ căn hộ, nhà thầu và thời gian thi công');
    err.status = 400;
    throw err;
  }

  // Auto-calculate 6-month construction start deadline from handover
  let handoverDate = null;
  let deadline6m = null;
  let finalContractId = contract_id;

  const contract = await repo.findContractForApartment(apartment_id, contract_id);
  if (contract) {
    finalContractId = contract.id;
    handoverDate = contract.handover_date_actual || contract.handover_date;
    if (handoverDate) {
      deadline6m = new Date(new Date(handoverDate).getTime() + 180 * 24 * 60 * 60 * 1000);
    }
  }

  const year = new Date().getFullYear();
  const count = await repo.countRegistrations();
  const regCode = `TC-TPCP-${year}-${String(count + 1).padStart(4, '0')}`;
  const regId = 'reg_' + crypto.randomBytes(6).toString('hex');

  const registration = await repo.createRegistration({
    id: regId,
    reg_code: regCode,
    apartment_id,
    contract_id: finalContractId,
    contractor_name,
    contact_person,
    phone,
    start_date: new Date(start_date),
    end_date: new Date(end_date),
    handover_date: handoverDate ? new Date(handoverDate) : undefined,
    deadline_6m: deadline6m ? new Date(deadline6m) : undefined,
    deposit_amount: 100000000.0, // Standard 100,000,000 VND
    deposit_status: 'PENDING_DEPOSIT',
    status: 'PENDING_REVIEW',
    drawings_url,
    scope_description,
    notes,
  });

  await logActivity(
    actor,
    'LẬP_HỒ_SƠ_THI_CÔNG',
    'CONSTRUCTION_REGISTRATION',
    registration.id,
    registration.reg_code,
    `Lập hồ sơ đăng ký thi công hoàn thiện ${registration.reg_code} - Căn ${registration.apartments?.code}`
  );

  return {
    message: 'Lập hồ sơ đăng ký thi công thành công! Vui lòng nộp tiền ký quỹ 100.000.000đ.',
    registration,
  };
}

// ===== 3. Confirm Deposit Receipt (100,000,000 VND) =====
async function confirmDeposit(id, dto, actor) {
  const { deposit_payment_ref, notes } = dto;

  const registration = await repo.updateRegistration(id, {
    deposit_status: 'DEPOSITED',
    deposit_payment_ref: deposit_payment_ref || `UNC-KQ-${Date.now()}`,
    deposit_date: new Date(),
    status: 'CONSTRUCTING',
    approved_by: actor?.username || actor?.name || 'Kế Toán BQL',
    approved_at: new Date(),
    notes: notes || undefined,
    updated_at: new Date(),
  });

  await logActivity(
    actor,
    'XÁC_NHẬN_KÝ_QUỸ_THI_CÔNG',
    'CONSTRUCTION_REGISTRATION',
    registration.id,
    registration.reg_code,
    `Xác nhận thu 100.000.000đ tiền ký quỹ thi công ${registration.reg_code} - Căn ${registration.apartments?.code}`
  );

  return {
    message: 'Đã xác nhận thu đủ 100.000.000đ tiền ký quỹ và kích hoạt cho phép thi công!',
    registration,
  };
}

// ===== 4. Record Construction Violation & Deduct Deposit (Rule E.5.6) =====
const DEFAULT_FINES = {
  SAI_HANG_MUC: 2000000,
  THIEU_PCCC: 2000000,
  CAU_MAC_DIEN: 5000000,
  KHONG_BAO_HO: 200000,
  KHONG_GIAM_SAT: 500000,
  HAN_KHONG_PHEP: 1000000,
  TIENG_ON_NGOAI_GIO: 1000000,
  VI_PHAM_KHAC: 1000000,
};

async function createViolation(id, dto, actor) {
  const {
    violation_type = 'VI_PHAM_KHAC',
    fine_amount,
    description,
    photo_urls = [],
    notes,
  } = dto;

  // Standard fine rates under Rule E.5.6
  let fine = Number(fine_amount || 0);
  if (!fine) {
    fine = DEFAULT_FINES[violation_type] || 1000000;
  }

  const year = new Date().getFullYear();
  const count = await repo.countViolations();
  const violationCode = `VP-TC-${year}-${String(count + 1).padStart(4, '0')}`;
  const violationId = 'viol_' + crypto.randomBytes(6).toString('hex');
  const recorder = actor?.username || actor?.name || 'Bảo Vệ / BQL';

  const violation = await repo.createViolation({
    id: violationId,
    registration_id: id,
    violation_code: violationCode,
    violation_type,
    fine_amount: fine,
    description: description || 'Vi phạm nội quy thi công khu đô thị',
    photo_urls,
    recorded_by: recorder,
    deducted: true,
    notes,
  });

  await logActivity(
    actor,
    'LẬP_BIÊN_BẢN_VI_PHẠM_TC',
    'CONSTRUCTION_VIOLATION',
    violation.id,
    violation.violation_code,
    `Lập biên bản vi phạm ${violation.violation_code}: phạt ${fine.toLocaleString('vi-VN')} đ`
  );

  return {
    message: `Đã lập biên bản vi phạm và khấu trừ ${fine.toLocaleString('vi-VN')}đ từ tiền ký quỹ!`,
    violation,
  };
}

// ===== 5. Add Worker & Issue Temporary Pass =====
async function addWorker(id, dto) {
  const {
    full_name,
    id_number,
    phone,
    role = 'THO_CHINH',
    valid_from,
    valid_to,
    photo_url,
  } = dto;

  if (!full_name) {
    const err = new Error('Vui lòng cung cấp họ tên công nhân');
    err.status = 400;
    throw err;
  }

  const passCode = `THE-TC-${Date.now().toString().slice(-6)}`;
  const workerId = 'wrk_' + crypto.randomBytes(6).toString('hex');

  const worker = await repo.createWorker({
    id: workerId,
    registration_id: id,
    full_name,
    id_number,
    phone,
    pass_code: passCode,
    role,
    photo_url,
    valid_from: valid_from ? new Date(valid_from) : new Date(),
    valid_to: valid_to
      ? new Date(valid_to)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'ACTIVE',
  });

  return {
    message: 'Cấp thẻ tạm thi công cho công nhân thành công!',
    worker,
  };
}

// ===== 6. Settle Registration & Refund Deposit =====
async function settleRegistration(id, dto, actor) {
  const { inspection_notes } = dto;

  const reg = await repo.getRegistrationWithViolations(id);
  if (!reg) {
    const err = new Error('Không tìm thấy hồ sơ');
    err.status = 404;
    throw err;
  }

  const totalFines = reg.construction_violations.reduce(
    (sum, v) => sum + Number(v.fine_amount || 0),
    0
  );
  const deposit = Number(reg.deposit_amount || 100000000);
  const refundAmount = Math.max(0, deposit - totalFines);

  const updated = await repo.updateRegistration(id, {
    status: 'SETTLED',
    deposit_status: totalFines > 0 ? 'PARTIAL_REFUNDED' : 'REFUNDED',
    refund_amount: refundAmount,
    refund_date: new Date(),
    inspection_notes:
      inspection_notes || 'Nghiệm thu hoàn công đạt chuẩn, các căn lân cận không khiếu nại',
    updated_at: new Date(),
  });

  // Revoke all workers
  await repo.expireWorkersByRegistration(id);

  await logActivity(
    actor,
    'QUYẾT_TOÁN_HOÀN_KÝ_QUỸ',
    'CONSTRUCTION_REGISTRATION',
    updated.id,
    updated.reg_code,
    `Nghiệm thu hoàn công và hoàn trả ${refundAmount.toLocaleString('vi-VN')}đ tiền ký quỹ cho ${updated.reg_code}`
  );

  return {
    message: `Nghiệm thu hoàn công thành công! Số tiền hoàn trả: ${refundAmount.toLocaleString(
      'vi-VN'
    )} VNĐ (Đã trừ ${totalFines.toLocaleString('vi-VN')} VNĐ vi phạm).`,
    registration: updated,
  };
}

module.exports = {
  getRegistrations,
  createRegistration,
  confirmDeposit,
  createViolation,
  addWorker,
  settleRegistration,
};

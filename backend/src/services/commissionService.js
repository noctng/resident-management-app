const crypto = require('crypto');
const repo = require('../repositories/commissionRepository');
const logger = require('../utils/logger');

// Mọi logic nghiệp vụ của module commission nằm ở đây.
// Service KHÔNG viết prisma query trực tiếp → gọi repo.* (Clean Architecture rule).
// Throw lỗi kèm `err.status` để controller format response.
// logActivity (side-effect) được thực hiện tại đây, không phải ở controller.

// ===== 1. Get Commission Policies =====
async function getPolicies({ beneficiary_type, status } = {}) {
  const where = {};
  if (beneficiary_type && beneficiary_type !== 'ALL') where.beneficiary_type = beneficiary_type;
  if (status && status !== 'ALL') where.status = status;

  const policies = await repo.listPolicies(where);
  return { policies, totalCount: policies.length };
}

// ===== 2. Create Commission Policy =====
async function createPolicy(dto, actor) {
  const {
    policy_name,
    beneficiary_type = 'INTERNAL_SALE',
    phase_code = 'ALL',
    commission_rate = 1.5,
    commission_fixed_amount = 0,
    trigger_milestone = 'ON_CONTRACT_SIGNED',
    staged_percentages,
    description,
  } = dto;

  if (!policy_name) {
    const err = new Error('Vui lòng nhập tên chính sách hoa hồng');
    err.status = 400;
    throw err;
  }

  const policyCode =
    'CS-HH-' +
    beneficiary_type.slice(0, 3) +
    '-' +
    new Date().getFullYear() +
    '-' +
    crypto.randomBytes(2).toString('hex').toUpperCase();
  const id = 'pol_' + crypto.randomBytes(6).toString('hex');
  const createdBy = actor?.username || actor?.name || 'Admin';

  const policy = await repo.createCommissionPolicy({
    id,
    policy_code: policyCode,
    policy_name,
    beneficiary_type,
    phase_code,
    commission_rate: Number(commission_rate),
    commission_fixed_amount: Number(commission_fixed_amount) || 0,
    trigger_milestone,
    staged_percentages: staged_percentages || null,
    status: 'ACTIVE',
    description,
    created_by: createdBy,
  });

  await logger.logActivity(
    actor,
    'TẠO_CHÍNH_SÁCH_HOA_HỒNG',
    'COMMISSION_POLICY',
    policy.id,
    policy.policy_code,
    `Tạo chính sách hoa hồng: ${policy.policy_name} (${policy.commission_rate}%)`
  );

  return { message: 'Tạo chính sách hoa hồng thành công', policy };
}

// ===== 3. Get Commissions (Bảng kê hoa hồng theo HĐMB) =====
async function getCommissions({ beneficiary_type, status, search } = {}) {
  const where = {};
  if (beneficiary_type && beneficiary_type !== 'ALL') where.beneficiary_type = beneficiary_type;
  if (status && status !== 'ALL') where.status = status;
  if (search) {
    where.OR = [
      { beneficiary_name: { contains: search, mode: 'insensitive' } },
      { contracts: { contract_code: { contains: search, mode: 'insensitive' } } },
      { contracts: { apartments: { code: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const commissions = await repo.listCommissions(where);

  // KPI summary calculation
  const totalCommission = commissions.reduce((sum, c) => sum + Number(c.total_commission_amount || 0), 0);
  const totalPaid = commissions.reduce((sum, c) => sum + Number(c.paid_amount || 0), 0);
  const totalPending = commissions.reduce((sum, c) => sum + Number(c.remaining_amount || 0), 0);
  const pendingApprovalCount = commissions.filter((c) => c.status === 'PENDING_APPROVAL').length;

  return {
    commissions,
    totalCount: commissions.length,
    stats: { totalCommission, totalPaid, totalPending, pendingApprovalCount },
  };
}

// ===== 4. Generate Commission for a Contract (tự động hoặc thủ công) =====
async function generateCommission(dto, actor) {
  const {
    contract_id,
    policy_id,
    beneficiary_type = 'INTERNAL_SALE',
    beneficiary_name,
    beneficiary_phone,
    beneficiary_bank_account,
    beneficiary_bank_name,
    custom_commission_rate,
  } = dto;

  const contract = await repo.getContractById(contract_id);
  if (!contract) {
    const err = new Error('Không tìm thấy hợp đồng');
    err.status = 404;
    throw err;
  }

  // Xác định tỷ lệ hoa hồng: ưu tiên custom_rate, sau đó policy, cuối cùng mặc định 1.5%
  let rate = 1.5;
  if (custom_commission_rate !== undefined) {
    rate = Number(custom_commission_rate);
  } else if (policy_id) {
    const pol = await repo.getPolicyById(policy_id);
    if (pol) rate = Number(pol.commission_rate);
  }

  const contractVal = Number(contract.total_value || 0);
  const commissionAmt = (contractVal * rate) / 100;
  const id = 'cms_' + crypto.randomBytes(6).toString('hex');

  const commission = await repo.createCommission({
    id,
    contract_id,
    policy_id: policy_id || null,
    beneficiary_type,
    beneficiary_name: beneficiary_name || 'NV Kinh Doanh',
    beneficiary_phone,
    beneficiary_bank_account,
    beneficiary_bank_name,
    total_contract_value: contractVal,
    commission_rate: rate,
    total_commission_amount: commissionAmt,
    paid_amount: 0,
    remaining_amount: commissionAmt,
    status: 'PENDING_APPROVAL',
  });

  await logger.logActivity(
    actor,
    'LẬP_BẢNG_HOA_HỒNG',
    'COMMISSION',
    commission.id,
    contract.contract_code,
    `Lập bảng tính hoa hồng HĐ ${contract.contract_code}: ${commissionAmt.toLocaleString('vi-VN')} VNĐ (${rate}%)`
  );

  return { message: 'Lập bảng tính hoa hồng thành công', commission };
}

// ===== 5. Approve Commission (Duyệt chi hoa hồng) =====
async function approveCommission(id, dto, actor) {
  const { notes } = dto;
  const approverName = actor?.username || actor?.name || 'Giám Đốc Kinh Doanh';

  const cms = await repo.getCommissionById(id);
  if (!cms) {
    const err = new Error('Không tìm thấy bản ghi hoa hồng');
    err.status = 404;
    throw err;
  }

  const updated = await repo.updateCommission(id, {
    status: 'APPROVED',
    approval_notes: notes,
    approved_by: approverName,
    approved_at: new Date(),
    updated_at: new Date(),
  });

  await logger.logActivity(
    actor,
    'PHÊ_DUYỆT_HOA_HỒNG',
    'COMMISSION',
    updated.id,
    updated.beneficiary_name,
    `Phê duyệt hoa hồng cho ${updated.beneficiary_name}: ${Number(updated.total_commission_amount).toLocaleString('vi-VN')} VNĐ`
  );

  return { message: 'Đã phê duyệt hoa hồng thành công', commission: updated };
}

// ===== 6. Create Commission Payout (Giải ngân chi trả hoa hồng) =====
async function createPayout(id, dto, actor) {
  const {
    amount,
    payout_date = new Date().toISOString().slice(0, 10),
    payment_method = 'BANK_TRANSFER',
    reference_doc,
    notes,
  } = dto;

  const cms = await repo.getCommissionById(id);
  if (!cms) {
    const err = new Error('Không tìm thấy bản ghi hoa hồng');
    err.status = 404;
    throw err;
  }

  const payAmt = Number(amount);
  if (payAmt <= 0) {
    const err = new Error('Số tiền chi trả phải lớn hơn 0');
    err.status = 400;
    throw err;
  }

  const curPaid = Number(cms.paid_amount || 0);
  const totalCms = Number(cms.total_commission_amount || 0);
  const nextPaid = curPaid + payAmt;
  const nextRemaining = Math.max(0, totalCms - nextPaid);
  const nextStatus = nextRemaining <= 0 ? 'COMPLETED' : 'PARTIALLY_PAID';

  const payoutCode =
    'PC-HH-' +
    new Date().toISOString().slice(0, 7).replace('-', '') +
    '-' +
    crypto.randomBytes(2).toString('hex').toUpperCase();
  const createdBy = actor?.username || actor?.name || 'Kế toán';

  const result = await repo.createPayoutTx({
    commissionId: id,
    payoutData: {
      id: 'pout_' + crypto.randomBytes(6).toString('hex'),
      commission_id: id,
      payout_code: payoutCode,
      amount: payAmt,
      payout_date: new Date(payout_date),
      payment_method,
      reference_doc,
      created_by: createdBy,
      notes,
    },
    commissionUpdateData: {
      paid_amount: nextPaid,
      remaining_amount: nextRemaining,
      status: nextStatus,
      updated_at: new Date(),
    },
  });

  await logger.logActivity(
    actor,
    'CHI_TRẢ_HOA_HỒNG',
    'COMMISSION_PAYOUT',
    result.payout.id,
    result.payout.payout_code,
    `Chi trả hoa hồng phiếu ${result.payout.payout_code}: ${payAmt.toLocaleString('vi-VN')} VNĐ cho ${cms.beneficiary_name}`
  );

  return {
    message: `Đã lập phiếu chi hoa hồng ${result.payout.payout_code} thành công`,
    payout: result.payout,
    updatedCommission: result.updatedCommission,
  };
}

module.exports = {
  getPolicies,
  createPolicy,
  getCommissions,
  generateCommission,
  approveCommission,
  createPayout,
};

const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get Commission Policies
 */
exports.getPolicies = async (req, res) => {
  try {
    const { beneficiary_type, status } = req.query;
    const where = {};
    if (beneficiary_type && beneficiary_type !== 'ALL') where.beneficiary_type = beneficiary_type;
    if (status && status !== 'ALL') where.status = status;

    const policies = await prisma.commission_policies.findMany({
      where,
      include: {
        _count: {
          select: { commissions: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, policies, totalCount: policies.length });
  } catch (err) {
    console.error('Lỗi lấy danh sách chính sách hoa hồng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Commission Policy
 */
exports.createPolicy = async (req, res) => {
  try {
    const {
      policy_name,
      beneficiary_type = 'INTERNAL_SALE',
      phase_code = 'ALL',
      commission_rate = 1.5,
      commission_fixed_amount = 0,
      trigger_milestone = 'ON_CONTRACT_SIGNED',
      staged_percentages,
      description,
    } = req.body;

    if (!policy_name) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên chính sách hoa hồng' });
    }

    const policyCode = 'CS-HH-' + beneficiary_type.slice(0, 3) + '-' + new Date().getFullYear() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const id = 'pol_' + crypto.randomBytes(6).toString('hex');
    const createdBy = req.user?.username || req.user?.name || 'Admin';

    const policy = await prisma.commission_policies.create({
      data: {
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
      },
    });

    await logActivity(
      req.user,
      'TẠO_CHÍNH_SÁCH_HOA_HỒNG',
      'COMMISSION_POLICY',
      policy.id,
      policy.policy_code,
      `Tạo chính sách hoa hồng: ${policy.policy_name} (${policy.commission_rate}%)`
    );

    res.status(201).json({ success: true, message: 'Tạo chính sách hoa hồng thành công', policy });
  } catch (err) {
    console.error('Lỗi tạo chính sách hoa hồng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Get Commissions (Bảng kê hoa hồng theo HĐMB)
 */
exports.getCommissions = async (req, res) => {
  try {
    const { beneficiary_type, status, search } = req.query;

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

    const commissions = await prisma.commissions.findMany({
      where,
      include: {
        contracts: {
          include: {
            apartments: true,
            customers: true,
          },
        },
        commission_policies: true,
        commission_payouts: {
          orderBy: { payout_date: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // KPI summary calculation
    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.total_commission_amount || 0), 0);
    const totalPaid = commissions.reduce((sum, c) => sum + Number(c.paid_amount || 0), 0);
    const totalPending = commissions.reduce((sum, c) => sum + Number(c.remaining_amount || 0), 0);
    const pendingApprovalCount = commissions.filter((c) => c.status === 'PENDING_APPROVAL').length;

    res.json({
      success: true,
      commissions,
      totalCount: commissions.length,
      stats: {
        totalCommission,
        totalPaid,
        totalPending,
        pendingApprovalCount,
      },
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách hoa hồng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Generate Commission for a Contract (Tự động hoặc thủ công)
 */
exports.generateCommission = async (req, res) => {
  try {
    const {
      contract_id,
      policy_id,
      beneficiary_type = 'INTERNAL_SALE',
      beneficiary_name,
      beneficiary_phone,
      beneficiary_bank_account,
      beneficiary_bank_name,
      custom_commission_rate,
    } = req.body;

    const contract = await prisma.contracts.findUnique({
      where: { id: contract_id },
      include: { apartments: true },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    let rate = 1.5;
    if (custom_commission_rate !== undefined) {
      rate = Number(custom_commission_rate);
    } else if (policy_id) {
      const pol = await prisma.commission_policies.findUnique({ where: { id: policy_id } });
      if (pol) rate = Number(pol.commission_rate);
    }

    const contractVal = Number(contract.total_value || 0);
    const commissionAmt = (contractVal * rate) / 100;
    const id = 'cms_' + crypto.randomBytes(6).toString('hex');

    const commission = await prisma.commissions.create({
      data: {
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
      },
    });

    await logActivity(
      req.user,
      'LẬP_BẢNG_HOA_HỒNG',
      'COMMISSION',
      commission.id,
      contract.contract_code,
      `Lập bảng tính hoa hồng HĐ ${contract.contract_code}: ${commissionAmt.toLocaleString('vi-VN')} VNĐ (${rate}%)`
    );

    res.status(201).json({ success: true, message: 'Lập bảng tính hoa hồng thành công', commission });
  } catch (err) {
    console.error('Lỗi tạo hoa hồng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Approve Commission (Duyệt chi hoa hồng)
 */
exports.approveCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const approverName = req.user?.username || req.user?.name || 'Giám Đốc Kinh Doanh';

    const cms = await prisma.commissions.findUnique({ where: { id } });
    if (!cms) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi hoa hồng' });
    }

    const updated = await prisma.commissions.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approval_notes: notes,
        approved_by: approverName,
        approved_at: new Date(),
        updated_at: new Date(),
      },
    });

    await logActivity(
      req.user,
      'PHÊ_DUYỆT_HOA_HỒNG',
      'COMMISSION',
      updated.id,
      updated.beneficiary_name,
      `Phê duyệt hoa hồng cho ${updated.beneficiary_name}: ${Number(updated.total_commission_amount).toLocaleString('vi-VN')} VNĐ`
    );

    res.json({ success: true, message: 'Đã phê duyệt hoa hồng thành công', commission: updated });
  } catch (err) {
    console.error('Lỗi phê duyệt hoa hồng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. Create Commission Payout (Giải ngân chi trả hoa hồng)
 */
exports.createPayout = async (req, res) => {
  try {
    const { id } = req.params; // commission_id
    const {
      amount,
      payout_date = new Date().toISOString().slice(0, 10),
      payment_method = 'BANK_TRANSFER',
      reference_doc,
      notes,
    } = req.body;

    const cms = await prisma.commissions.findUnique({ where: { id } });
    if (!cms) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi hoa hồng' });
    }

    const payAmt = Number(amount);
    if (payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền chi trả phải lớn hơn 0' });
    }

    const curPaid = Number(cms.paid_amount || 0);
    const totalCms = Number(cms.total_commission_amount || 0);
    const nextPaid = curPaid + payAmt;
    const nextRemaining = Math.max(0, totalCms - nextPaid);
    const nextStatus = nextRemaining <= 0 ? 'COMPLETED' : 'PARTIALLY_PAID';

    const payoutCode = 'PC-HH-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const createdBy = req.user?.username || req.user?.name || 'Kế toán';

    const result = await prisma.$transaction(async (tx) => {
      const payout = await tx.commission_payouts.create({
        data: {
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
      });

      const updatedCommission = await tx.commissions.update({
        where: { id },
        data: {
          paid_amount: nextPaid,
          remaining_amount: nextRemaining,
          status: nextStatus,
          updated_at: new Date(),
        },
      });

      return { payout, updatedCommission };
    });

    await logActivity(
      req.user,
      'CHI_TRẢ_HOA_HỒNG',
      'COMMISSION_PAYOUT',
      result.payout.id,
      result.payout.payout_code,
      `Chi trả hoa hồng phiếu ${result.payout.payout_code}: ${payAmt.toLocaleString('vi-VN')} VNĐ cho ${cms.beneficiary_name}`
    );

    res.status(201).json({
      success: true,
      message: `Đã lập phiếu chi hoa hồng ${result.payout.payout_code} thành công`,
      ...result,
    });
  } catch (err) {
    console.error('Lỗi lập phiếu chi hoa hồng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

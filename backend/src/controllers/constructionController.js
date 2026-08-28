const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get Construction Registrations & Financial Deposit Stats
 */
exports.getRegistrations = async (req, res) => {
  try {
    const { phase, status, deposit_status, search } = req.query;

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

    const registrations = await prisma.construction_registrations.findMany({
      where,
      include: {
        apartments: true,
        contracts: {
          include: { customers: true },
        },
        construction_workers: true,
        construction_violations: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Stats
    const totalRegs = registrations.length;
    const activeConstructing = registrations.filter((r) => r.status === 'CONSTRUCTING').length;
    const totalDepositHeld = registrations
      .filter((r) => r.deposit_status === 'DEPOSITED')
      .reduce((sum, r) => sum + Number(r.deposit_amount || 0), 0);
    const totalWorkers = registrations.reduce((sum, r) => sum + (r.construction_workers?.filter(w => w.status === 'ACTIVE').length || 0), 0);
    const totalViolationsFine = registrations.reduce(
      (sum, r) => sum + (r.construction_violations?.reduce((s, v) => s + Number(v.fine_amount || 0), 0) || 0),
      0
    );

    res.json({
      success: true,
      registrations,
      stats: {
        totalRegs,
        activeConstructing,
        totalDepositHeld,
        totalWorkers,
        totalViolationsFine,
      },
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách hồ sơ thi công:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Construction Registration (Enforces 6-month rule & 100M deposit)
 */
exports.createRegistration = async (req, res) => {
  try {
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
    } = req.body;

    if (!apartment_id || !contractor_name || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ căn hộ, nhà thầu và thời gian thi công' });
    }

    // Auto-calculate 6-month construction start deadline from handover
    let handoverDate = null;
    let deadline6m = null;
    let finalContractId = contract_id;

    const contract = await prisma.contracts.findFirst({
      where: {
        apartment_id,
        ...(contract_id ? { id: contract_id } : {}),
      },
      orderBy: { created_at: 'desc' },
    });

    if (contract) {
      finalContractId = contract.id;
      handoverDate = contract.handover_date_actual || contract.handover_date;
      if (handoverDate) {
        deadline6m = new Date(new Date(handoverDate).getTime() + 180 * 24 * 60 * 60 * 1000);
      }
    }

    const year = new Date().getFullYear();
    const count = await prisma.construction_registrations.count();
    const regCode = `TC-TPCP-${year}-${String(count + 1).padStart(4, '0')}`;
    const regId = 'reg_' + crypto.randomBytes(6).toString('hex');

    const registration = await prisma.construction_registrations.create({
      data: {
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
        deposit_amount: 100000000.00, // Standard 100,000,000 VND
        deposit_status: 'PENDING_DEPOSIT',
        status: 'PENDING_REVIEW',
        drawings_url,
        scope_description,
        notes,
      },
      include: {
        apartments: true,
      },
    });

    await logActivity(
      req.user,
      'LẬP_HỒ_SƠ_THI_CÔNG',
      'CONSTRUCTION_REGISTRATION',
      registration.id,
      registration.reg_code,
      `Lập hồ sơ đăng ký thi công hoàn thiện ${registration.reg_code} - Căn ${registration.apartments?.code}`
    );

    res.status(201).json({
      success: true,
      message: 'Lập hồ sơ đăng ký thi công thành công! Vui lòng nộp tiền ký quỹ 100.000.000đ.',
      registration,
    });
  } catch (err) {
    console.error('Lỗi tạo hồ sơ thi công:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Confirm Deposit Receipt (100,000,000 VND)
 */
exports.confirmDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { deposit_payment_ref, notes } = req.body;

    const registration = await prisma.construction_registrations.update({
      where: { id },
      data: {
        deposit_status: 'DEPOSITED',
        deposit_payment_ref: deposit_payment_ref || `UNC-KQ-${Date.now()}`,
        deposit_date: new Date(),
        status: 'CONSTRUCTING',
        approved_by: req.user?.username || req.user?.name || 'Kế Toán BQL',
        approved_at: new Date(),
        notes: notes || undefined,
        updated_at: new Date(),
      },
      include: { apartments: true },
    });

    await logActivity(
      req.user,
      'XÁC_NHẬN_KÝ_QUỸ_THI_CÔNG',
      'CONSTRUCTION_REGISTRATION',
      registration.id,
      registration.reg_code,
      `Xác nhận thu 100.000.000đ tiền ký quỹ thi công ${registration.reg_code} - Căn ${registration.apartments?.code}`
    );

    res.json({
      success: true,
      message: 'Đã xác nhận thu đủ 100.000.000đ tiền ký quỹ và kích hoạt cho phép thi công!',
      registration,
    });
  } catch (err) {
    console.error('Lỗi xác nhận ký quỹ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Record Construction Violation & Deduct Deposit (Rule E.5.6)
 */
exports.createViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      violation_type = 'VI_PHAM_KHAC',
      fine_amount,
      description,
      photo_urls = [],
      notes,
    } = req.body;

    // Standard fine rates under Rule E.5.6
    let fine = Number(fine_amount || 0);
    if (!fine) {
      switch (violation_type) {
        case 'SAI_HANG_MUC': fine = 2000000; break;
        case 'THIEU_PCCC': fine = 2000000; break;
        case 'CAU_MAC_DIEN': fine = 5000000; break;
        case 'KHONG_BAO_HO': fine = 200000; break;
        case 'KHONG_GIAM_SAT': fine = 500000; break;
        case 'HAN_KHONG_PHEP': fine = 1000000; break;
        case 'TIENG_ON_NGOAI_GIO': fine = 1000000; break;
        default: fine = 1000000; break;
      }
    }

    const year = new Date().getFullYear();
    const count = await prisma.construction_violations.count();
    const violationCode = `VP-TC-${year}-${String(count + 1).padStart(4, '0')}`;
    const violationId = 'viol_' + crypto.randomBytes(6).toString('hex');
    const recorder = req.user?.username || req.user?.name || 'Bảo Vệ / BQL';

    const violation = await prisma.construction_violations.create({
      data: {
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
      },
    });

    await logActivity(
      req.user,
      'LẬP_BIÊN_BẢN_VI_PHẠM_TC',
      'CONSTRUCTION_VIOLATION',
      violation.id,
      violation.violation_code,
      `Lập biên bản vi phạm ${violation.violation_code}: phạt ${fine.toLocaleString('vi-VN')} đ`
    );

    res.status(201).json({
      success: true,
      message: `Đã lập biên bản vi phạm và khấu trừ ${fine.toLocaleString('vi-VN')}đ từ tiền ký quỹ!`,
      violation,
    });
  } catch (err) {
    console.error('Lỗi lập biên bản vi phạm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Add Worker & Issue Temporary Pass
 */
exports.addWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, id_number, phone, role = 'THO_CHINH', valid_from, valid_to, photo_url } = req.body;

    if (!full_name) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp họ tên công nhân' });
    }

    const passCode = `THE-TC-${Date.now().toString().slice(-6)}`;
    const workerId = 'wrk_' + crypto.randomBytes(6).toString('hex');

    const worker = await prisma.construction_workers.create({
      data: {
        id: workerId,
        registration_id: id,
        full_name,
        id_number,
        phone,
        pass_code: passCode,
        role,
        photo_url,
        valid_from: valid_from ? new Date(valid_from) : new Date(),
        valid_to: valid_to ? new Date(valid_to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Cấp thẻ tạm thi công cho công nhân thành công!',
      worker,
    });
  } catch (err) {
    console.error('Lỗi cấp thẻ công nhân:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. Settle Registration & Refund Deposit
 */
exports.settleRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { inspection_notes } = req.body;

    const reg = await prisma.construction_registrations.findUnique({
      where: { id },
      include: { construction_violations: true },
    });

    if (!reg) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });

    const totalFines = reg.construction_violations.reduce((sum, v) => sum + Number(v.fine_amount || 0), 0);
    const deposit = Number(reg.deposit_amount || 100000000);
    const refundAmount = Math.max(0, deposit - totalFines);

    const updated = await prisma.construction_registrations.update({
      where: { id },
      data: {
        status: 'SETTLED',
        deposit_status: totalFines > 0 ? 'PARTIAL_REFUNDED' : 'REFUNDED',
        refund_amount: refundAmount,
        refund_date: new Date(),
        inspection_notes: inspection_notes || 'Nghiệm thu hoàn công đạt chuẩn, các căn lân cận không khiếu nại',
        updated_at: new Date(),
      },
      include: { apartments: true },
    });

    // Revoke all workers
    await prisma.construction_workers.updateMany({
      where: { registration_id: id },
      data: { status: 'EXPIRED' },
    });

    await logActivity(
      req.user,
      'QUYẾT_TOÁN_HOÀN_KÝ_QUỸ',
      'CONSTRUCTION_REGISTRATION',
      updated.id,
      updated.reg_code,
      `Nghiệm thu hoàn công và hoàn trả ${refundAmount.toLocaleString('vi-VN')}đ tiền ký quỹ cho ${updated.reg_code}`
    );

    res.json({
      success: true,
      message: `Nghiệm thu hoàn công thành công! Số tiền hoàn trả: ${refundAmount.toLocaleString('vi-VN')} VNĐ (Đã trừ ${totalFines.toLocaleString('vi-VN')} VNĐ vi phạm).`,
      registration: updated,
    });
  } catch (err) {
    console.error('Lỗi quyết toán ký quỹ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

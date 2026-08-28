const repo = require('../repositories/salesContractRepository');
const crypto = require('crypto');

// Service: chuyển MỌI logic nghiệp vụ của salesContract từ controller cũ vào đây.
// KHÔNG import prisma trực tiếp — chỉ gọi repo.*.
// Giữ NGUYÊN response shape / status code / tính toán của các endpoint hiện có.

// ============================================================
// 1. Create Standard Sales Contract (HĐMB 18 Điều + LTT 10 Đợt Chuẩn)
// ============================================================
async function createStandardContract(dto) {
  const {
    apartment_id,
    customer_id,
    contract_type = 'FUTURE_HOUSING', // FUTURE_HOUSING | EXISTING_HOUSING | NOXH_HOUSING
    finish_standard = 'STANDARD',
    deposit_receipt_id,
    signed_date = new Date(),
    notes, // không lưu DB (giữ nguyên behavior gốc)
  } = dto;

  if (!apartment_id || !customer_id) {
    const err = new Error('Vui lòng chọn Căn hộ và Khách hàng');
    err.status = 400;
    throw err;
  }

  const unit = await repo.getApartmentById(apartment_id);
  if (!unit) {
    const err = new Error('Không tìm thấy căn hộ');
    err.status = 404;
    throw err;
  }

  const customer = await repo.getCustomerById(customer_id);
  if (!customer) {
    const err = new Error('Không tìm thấy khách hàng');
    err.status = 404;
    throw err;
  }

  // --- Pricing Breakdown ---
  const landPrice =
    Number(unit.land_price_before_vat) > 0 ? Number(unit.land_price_before_vat) : 4500000000;
  const constructionPrice =
    Number(unit.construction_price_before_vat) > 0
      ? Number(unit.construction_price_before_vat)
      : 2500000000;
  const subtotal = landPrice + constructionPrice;
  const vatRate =
    contract_type === 'NOXH_HOUSING'
      ? 5.0
      : Number(unit.vat_rate) > 0
        ? Number(unit.vat_rate)
        : 8.0;
  const vatAmount = Math.round((subtotal * vatRate) / 100);
  const maintenanceFee = Math.round(subtotal * 0.02);
  const totalValue = subtotal + vatAmount; // Tổng giá bán (chưa gồm phí bảo trì)

  // --- Deposit deduction ---
  let depositDeducted = 0;
  if (deposit_receipt_id) {
    const depositRec = await repo.getDepositReceiptById(deposit_receipt_id);
    if (depositRec && depositRec.status === 'ACTIVE') {
      depositDeducted = Number(depositRec.paid_amount || depositRec.deposit_amount || 0);
    }
  }

  // --- Generate Contract Code / IDs ---
  const year = new Date(signed_date).getFullYear();
  const phaseCode = unit.phase_code || 'CANTATA';
  const contractCode = `HDMB/TPCP/${phaseCode}/${unit.code}/${year}`;
  const contractId = 'cnt_' + crypto.randomBytes(6).toString('hex');
  const signDateObj = new Date(signed_date);

  // Clause 18 Deadline (3 ngày sau ký cho đợt 1)
  const clause18Deadline = new Date(signDateObj.getTime() + 3 * 24 * 60 * 60 * 1000);

  // --- 10-Stage Payment Schedule (LTT 10 đợt chuẩn Thành Phố Cà Phê) ---
  const schedulePercents = [
    { inst: 1, pct: 15, days: 3, event: 'Ký HĐMB (Đợt 1 - Khấu trừ tiền cọc)' },
    { inst: 2, pct: 10, days: 30, event: 'Đợt 2: T+30 ngày kể từ ngày ký HĐ' },
    { inst: 3, pct: 10, days: 60, event: 'Đợt 3: T+60 ngày kể từ ngày ký HĐ' },
    { inst: 4, pct: 10, days: 90, event: 'Đợt 4: T+90 ngày kể từ ngày ký HĐ' },
    { inst: 5, pct: 10, days: 120, event: 'Đợt 5: T+120 ngày kể từ ngày ký HĐ' },
    { inst: 6, pct: 10, days: 150, event: 'Đợt 6: T+150 ngày kể từ ngày ký HĐ' },
    { inst: 7, pct: 10, days: 180, event: 'Đợt 7: T+180 ngày kể từ ngày ký HĐ' },
    { inst: 8, pct: 10, days: 210, event: 'Đợt 8: T+210 ngày kể từ ngày ký HĐ' },
    { inst: 9, pct: 10, days: 240, event: 'Đợt 9: Bàn giao nhà (+ 2% Phí bảo trì)', isHandover: true },
    { inst: 10, pct: 5, days: 360, event: 'Đợt 10: Thông báo bàn giao Giấy chứng nhận (Sổ hồng)' },
  ];

  const payments = schedulePercents.map((s) => {
    let baseAmt = Math.round((totalValue * s.pct) / 100);
    let finalAmt = baseAmt;

    if (s.inst === 1 && depositDeducted > 0) {
      finalAmt = Math.max(0, baseAmt - depositDeducted);
    } else if (s.isHandover) {
      finalAmt = baseAmt + maintenanceFee; // Gộp 2% phí bảo trì vào đợt bàn giao
    }

    const dueDate = new Date(signDateObj.getTime() + s.days * 24 * 60 * 60 * 1000);
    const qrMemo = `HDMB ${unit.code} D${s.inst}`;

    return {
      id: 'pay_' + crypto.randomBytes(6).toString('hex'),
      contract_id: contractId,
      installment: s.inst,
      percentage: s.pct,
      description: s.event,
      milestone_event: s.event,
      base_amount: baseAmt,
      amount: finalAmt,
      paid_amount: 0,
      due_date: dueDate,
      status: 'PENDING',
      late_penalty_rate: 0.0005, // 0.05%/ngày (Điều 11.1.1)
      qr_payment_memo: qrMemo,
    };
  });

  const contractData = {
    id: contractId,
    contract_code: contractCode,
    customer_id,
    apartment_id,
    contract_type,
    total_value: totalValue,
    land_price: landPrice,
    construction_price: constructionPrice,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    maintenance_fee: maintenanceFee,
    deposit_deducted_amount: depositDeducted,
    status: 'SIGNED',
    signed_date: signDateObj,
    handover_deadline: new Date(signDateObj.getTime() + 240 * 24 * 60 * 60 * 1000), // 8 tháng
    finish_standard,
    clause_18_status: 'NORMAL',
    clause_18_deadline: clause18Deadline,
  };

  const contract = await repo.createStandardContractTx({
    contractData,
    payments,
    apartmentId: apartment_id,
    depositReceiptId: deposit_receipt_id,
  });

  // Trả thêm thông tin để controller ghi logActivity (cần req.user)
  return {
    contract,
    customerName: customer.name,
    unitCode: unit.code,
  };
}

// ============================================================
// 2. Get Full Contract Details (18 Articles + 3 Annexes + 10 Installments)
// ============================================================
async function getContractFull(id) {
  const contract = await repo.getContractFullByCodeOrId(id);

  if (!contract) {
    const err = new Error('Không tìm thấy hợp đồng');
    err.status = 404;
    throw err;
  }

  // Tính phạt chậm (0.05%/ngày với các đợt quá hạn)
  const now = new Date();
  const paymentsWithPenalties = (contract.contract_payments || []).map((p) => {
    let lateDays = 0;
    let latePenalty = 0;
    const dueDate = new Date(p.due_date);

    if (p.status !== 'PAID' && now > dueDate) {
      const diffTime = Math.abs(now.getTime() - dueDate.getTime());
      lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const unpaidAmount = Number(p.amount) - Number(p.paid_amount || 0);
      // Công thức: Chưa trả * 0.05% * số ngày trễ
      latePenalty = Math.round(unpaidAmount * 0.0005 * lateDays);
    }

    return {
      ...p,
      lateDays,
      latePenalty,
      totalDueNow: Number(p.amount) - Number(p.paid_amount || 0) + latePenalty,
    };
  });

  // Điều 18 Giám sát: kiểm tra đợt 1 quá hạn > 3 ngày
  const inst1 = paymentsWithPenalties.find((p) => p.installment === 1);
  let clause18Alert = null;
  if (inst1 && inst1.status !== 'PAID') {
    const deadline = new Date(contract.clause_18_deadline || inst1.due_date);
    if (now > deadline) {
      clause18Alert = {
        violated: true,
        message:
          'CẢNH BÁO ĐIỀU 18: Đợt 1 quá hạn 3 ngày chưa nộp đủ. HĐMB thuộc diện tự động thanh lý và CĐT có quyền giữ lại tiền cọc.',
      };
    }
  }

  return {
    ...contract,
    contract_payments: paymentsWithPenalties,
    clause18Alert,
  };
}

// ============================================================
// 3. Transfer Contract (Chuyển nhượng kế thừa 100% LTT theo Luật KDBĐS 2023)
// ============================================================
async function transferContract(dto) {
  const { id } = dto; // lấy từ req.params
  const {
    new_customer_name,
    new_customer_phone,
    new_customer_id_number,
    new_customer_address,
    notary_office,
    notary_number,
    notary_date,
    notes,
  } = dto;

  const contract = await repo.getContractByIdWithRelations(id);
  if (!contract) {
    const err = new Error('Không tìm thấy hợp đồng');
    err.status = 404;
    throw err;
  }

  // Điều kiện: không có đợt thanh toán quá hạn
  const overdueCount = (contract.contract_payments || []).filter(
    (p) => p.status !== 'PAID' && new Date() > new Date(p.due_date)
  ).length;

  if (overdueCount > 0) {
    const err = new Error(
      `Không đủ điều kiện chuyển nhượng theo Điều 7.3 Luật KDBĐS 2023: Hợp đồng đang có ${overdueCount} đợt thanh toán quá hạn chưa tất toán.`
    );
    err.status = 400;
    throw err;
  }

  // Tính tổng đã nộp & nợ còn lại
  let totalPaid = 0;
  (contract.contract_payments || []).forEach((p) => {
    totalPaid += Number(p.paid_amount || 0);
  });
  const remainingDebt = Number(contract.total_value) - totalPaid;

  // Tìm hoặc tạo khách hàng mới
  const existing = await repo.findCustomerByPhone(new_customer_phone);
  let customerOp;
  if (existing) {
    customerOp = { mode: 'existing', customerId: existing.id };
  } else {
    customerOp = {
      mode: 'create',
      data: {
        id: 'cust_' + crypto.randomBytes(6).toString('hex'),
        name: new_customer_name,
        phone_number: new_customer_phone,
        id_number: new_customer_id_number || '',
        address: new_customer_address || '',
      },
    };
  }

  const newCustomerId = customerOp.mode === 'create' ? customerOp.data.id : customerOp.customerId;

  const transferData = {
    id: 'trf_' + crypto.randomBytes(6).toString('hex'),
    contract_id: contract.id,
    old_customer_id: contract.customer_id,
    new_customer_id: newCustomerId,
    transfer_date: new Date(),
    notary_office,
    notary_number,
    notary_date: notary_date ? new Date(notary_date) : new Date(),
    inherited_paid_amount: totalPaid,
    remaining_debt_amount: remainingDebt,
    notes,
  };

  const result = await repo.transferContractTx({
    contractId: contract.id,
    customerOp,
    transferData,
  });

  // Trả thông tin để controller ghi logActivity
  return {
    transfer: result.transferRec,
    contractId: contract.id,
    contractCode: contract.contract_code,
    oldCustomerName: contract.customers?.name,
    customerName: new_customer_name,
    inheritedPaid: totalPaid,
  };
}

module.exports = {
  createStandardContract,
  getContractFull,
  transferContract,
};

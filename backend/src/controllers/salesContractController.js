const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Create Standard Sales Contract (HĐMB 18 Điều + LTT 10 Đợt Chuẩn)
 */
exports.createStandardContract = async (req, res) => {
  try {
    const {
      apartment_id,
      customer_id,
      contract_type = 'FUTURE_HOUSING', // FUTURE_HOUSING | EXISTING_HOUSING | NOXH_HOUSING
      finish_standard = 'STANDARD',
      deposit_receipt_id,
      signed_date = new Date(),
      notes,
    } = req.body;

    if (!apartment_id || !customer_id) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn Căn hộ và Khách hàng' });
    }

    const unit = await prisma.apartments.findUnique({ where: { id: apartment_id } });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ' });
    }

    const customer = await prisma.customers.findUnique({ where: { id: customer_id } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    // Pricing Breakdown
    const landPrice = Number(unit.land_price_before_vat) > 0 ? Number(unit.land_price_before_vat) : 4500000000;
    const constructionPrice = Number(unit.construction_price_before_vat) > 0 ? Number(unit.construction_price_before_vat) : 2500000000;
    const subtotal = landPrice + constructionPrice;
    const vatRate = contract_type === 'NOXH_HOUSING' ? 5.00 : (Number(unit.vat_rate) > 0 ? Number(unit.vat_rate) : 8.00);
    const vatAmount = Math.round((subtotal * vatRate) / 100);
    const maintenanceFee = Math.round(subtotal * 0.02);
    const totalValue = subtotal + vatAmount; // Total selling price (Excluding maintenance fee)

    // Deposit deduction
    let depositDeducted = 0;
    if (deposit_receipt_id) {
      const depositRec = await prisma.deposit_receipts.findUnique({ where: { id: deposit_receipt_id } });
      if (depositRec && depositRec.status === 'ACTIVE') {
        depositDeducted = Number(depositRec.paid_amount || depositRec.deposit_amount || 0);
      }
    }

    // Generate Contract Code: HDMB/TPCP/{PHASE}/{CODE}/{YEAR}
    const year = new Date(signed_date).getFullYear();
    const phaseCode = unit.phase_code || 'CANTATA';
    const contractCode = `HDMB/TPCP/${phaseCode}/${unit.code}/${year}`;
    const contractId = 'cnt_' + crypto.randomBytes(6).toString('hex');
    const signDateObj = new Date(signed_date);

    // Clause 18 Deadline (3 days after signing date for 1st installment)
    const clause18Deadline = new Date(signDateObj.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Execute in Transaction
    const contract = await prisma.$transaction(async (tx) => {
      // 1. Create Contract
      const createdContract = await tx.contracts.create({
        data: {
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
          handover_deadline: new Date(signDateObj.getTime() + 240 * 24 * 60 * 60 * 1000), // 8 months
          finish_standard,
          clause_18_status: 'NORMAL',
          clause_18_deadline: clause18Deadline,
        },
      });

      // 2. Generate 10-Stage Payment Schedule (LTT 10 đợt chuẩn Thành Phố Cà Phê)
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

      for (const s of schedulePercents) {
        let baseAmt = Math.round((totalValue * s.pct) / 100);
        let finalAmt = baseAmt;

        if (s.inst === 1 && depositDeducted > 0) {
          finalAmt = Math.max(0, baseAmt - depositDeducted);
        } else if (s.isHandover) {
          finalAmt = baseAmt + maintenanceFee; // Include 2% maintenance fee in handover installment
        }

        const dueDate = new Date(signDateObj.getTime() + s.days * 24 * 60 * 60 * 1000);
        const qrMemo = `HDMB ${unit.code} D${s.inst}`;

        await tx.contract_payments.create({
          data: {
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
            late_penalty_rate: 0.0005, // 0.05% / day (Điều 11.1.1)
            qr_payment_memo: qrMemo,
          },
        });
      }

      // 3. Update Apartment Status to CONTRACTED
      await tx.apartments.update({
        where: { id: apartment_id },
        data: { sales_status: 'CONTRACTED' },
      });

      // 4. Update Deposit Receipt to CONVERTED_CONTRACT if linked
      if (deposit_receipt_id) {
        await tx.deposit_receipts.update({
          where: { id: deposit_receipt_id },
          data: { status: 'CONVERTED_CONTRACT' },
        });
      }

      return createdContract;
    });

    await logActivity(
      req.user,
      'KÝ_HỢP_ĐỒNG_MUA_BÁN',
      'CONTRACT',
      contract.id,
      contract.contract_code,
      `Ký HĐMB ${contract.contract_code} cho khách ${customer.name} căn ${unit.code}. Giá trị: ${totalValue.toLocaleString('vi-VN')} VNĐ`
    );

    res.status(201).json({
      success: true,
      message: `Lập Hợp đồng Mua Bán thành công: ${contract.contract_code}`,
      contract,
    });
  } catch (err) {
    console.error('Lỗi lập HĐMB:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Get Full Contract Details (18 Articles + 3 Annexes + 10 Installments)
 */
exports.getContractFull = async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await prisma.contracts.findFirst({
      where: { OR: [{ id }, { contract_code: id }] },
      include: {
        apartments: true,
        customers: true,
        contract_payments: {
          orderBy: { installment: 'asc' },
        },
        contract_transfers: {
          include: {
            old_customer: true,
            new_customer: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    // Calculate Late Penalties (0.05%/day for overdue installments)
    const now = new Date();
    const paymentsWithPenalties = contract.contract_payments.map((p) => {
      let lateDays = 0;
      let latePenalty = 0;
      const dueDate = new Date(p.due_date);

      if (p.status !== 'PAID' && now > dueDate) {
        const diffTime = Math.abs(now.getTime() - dueDate.getTime());
        lateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const unpaidAmount = Number(p.amount) - Number(p.paid_amount || 0);
        // Formula: Unpaid * 0.05% * lateDays
        latePenalty = Math.round(unpaidAmount * 0.0005 * lateDays);
      }

      return {
        ...p,
        lateDays,
        latePenalty,
        totalDueNow: Number(p.amount) - Number(p.paid_amount || 0) + latePenalty,
      };
    });

    // Clause 18 Supervision: Check if 1st installment overdue > 3 days
    const inst1 = paymentsWithPenalties.find((p) => p.installment === 1);
    let clause18Alert = null;
    if (inst1 && inst1.status !== 'PAID') {
      const deadline = new Date(contract.clause_18_deadline || inst1.due_date);
      if (now > deadline) {
        clause18Alert = {
          violated: true,
          message: 'CẢNH BÁO ĐIỀU 18: Đợt 1 quá hạn 3 ngày chưa nộp đủ. HĐMB thuộc diện tự động thanh lý và CĐT có quyền giữ lại tiền cọc.',
        };
      }
    }

    res.json({
      success: true,
      contract: {
        ...contract,
        contract_payments: paymentsWithPenalties,
        clause18Alert,
      },
    });
  } catch (err) {
    console.error('Lỗi lấy chi tiết HĐMB:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Transfer Contract (Chuyển nhượng kế thừa 100% LTT theo Luật KDBĐS 2023)
 */
exports.transferContract = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      new_customer_name,
      new_customer_phone,
      new_customer_id_number,
      new_customer_address,
      notary_office,
      notary_number,
      notary_date,
      notes,
    } = req.body;

    const contract = await prisma.contracts.findUnique({
      where: { id },
      include: {
        customers: true,
        apartments: true,
        contract_payments: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    // Check conditions: No overdue payments
    const overdueCount = contract.contract_payments.filter(
      (p) => p.status !== 'PAID' && new Date() > new Date(p.due_date)
    ).length;

    if (overdueCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không đủ điều kiện chuyển nhượng theo Điều 7.3 Luật KDBĐS 2023: Hợp đồng đang có ${overdueCount} đợt thanh toán quá hạn chưa tất toán.`,
      });
    }

    // Calculate total inherited paid amount and remaining debt
    let totalPaid = 0;
    contract.contract_payments.forEach((p) => {
      totalPaid += Number(p.paid_amount || 0);
    });
    const remainingDebt = Number(contract.total_value) - totalPaid;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or Find New Customer
      let newCustomer = await tx.customers.findFirst({ where: { phone_number: new_customer_phone } });
      if (!newCustomer) {
        newCustomer = await tx.customers.create({
          data: {
            id: 'cust_' + crypto.randomBytes(6).toString('hex'),
            name: new_customer_name,
            phone_number: new_customer_phone,
            id_number: new_customer_id_number || '',
            address: new_customer_address || '',
          },
        });
      }

      // 2. Record Transfer History
      const transferRec = await tx.contract_transfers.create({
        data: {
          id: 'trf_' + crypto.randomBytes(6).toString('hex'),
          contract_id: contract.id,
          old_customer_id: contract.customer_id,
          new_customer_id: newCustomer.id,
          transfer_date: new Date(),
          notary_office,
          notary_number,
          notary_date: notary_date ? new Date(notary_date) : new Date(),
          inherited_paid_amount: totalPaid,
          remaining_debt_amount: remainingDebt,
          notes,
        },
      });

      // 3. Update Contract to New Customer
      const updatedContract = await tx.contracts.update({
        where: { id: contract.id },
        data: {
          customers: { connect: { id: newCustomer.id } },
        },
      });

      return { transferRec, updatedContract, newCustomer };
    });

    await logActivity(
      req.user,
      'CHUYỂN_NHƯỢNG_HĐMB',
      'CONTRACT',
      contract.id,
      contract.contract_code,
      `Chuyển nhượng HĐMB ${contract.contract_code} từ ${contract.customers.name} sang ${new_customer_name}. Kế thừa ${totalPaid.toLocaleString('vi-VN')} VNĐ đã đóng.`
    );

    res.json({
      success: true,
      message: `Chuyển nhượng hợp đồng thành công sang khách hàng ${new_customer_name}! Toàn bộ LTT được kế thừa nguyên vẹn.`,
      transfer: result.transferRec,
    });
  } catch (err) {
    console.error('Lỗi chuyển nhượng HĐMB:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

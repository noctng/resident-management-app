const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get All Deposit Receipts (PDC)
 */
exports.getDeposits = async (req, res) => {
  try {
    const { phase, status = 'ALL', search } = req.query;

    const where = {};
    if (status !== 'ALL') where.status = status;
    if (phase && phase !== 'ALL') {
      where.apartments = { phase_code: phase };
    }
    if (search) {
      where.OR = [
        { deposit_code: { contains: search, mode: 'insensitive' } },
        { customer_name: { contains: search, mode: 'insensitive' } },
        { customer_phone: { contains: search } },
        { apartments: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const deposits = await prisma.deposit_receipts.findMany({
      where,
      include: {
        apartments: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, deposits, totalCount: deposits.length });
  } catch (err) {
    console.error('Lỗi lấy danh sách phiếu đặt cọc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Deposit Receipt (PDC) - Sale initiates
 */
exports.createDepositReceipt = async (req, res) => {
  try {
    const {
      apartment_id,
      customer_id,
      customer_name,
      customer_phone,
      customer_id_number,
      booking_id,
      opportunity_id,
      deposit_amount = 100000000,
      paid_amount = 0,
      deadline_date,
      payment_method = 'BANK_TRANSFER',
      notes,
    } = req.body;

    const salesPersonId = req.user?.username || req.user?.name || 'Admin';

    if (!apartment_id || !customer_name || !customer_phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ thông tin Căn hộ, Tên khách và SĐT' });
    }

    const unit = await prisma.apartments.findUnique({ where: { id: apartment_id } });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ' });
    }

    // Generate PDC Code: PDC-{CODE}-{DATE}
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const depositCode = `PDC-${unit.code}-${dateStr}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // Ensure customer exists or create
    let finalCustId = customer_id;
    if (!finalCustId) {
      let cust = await prisma.customers.findFirst({ where: { phone_number: customer_phone } });
      if (!cust) {
        cust = await prisma.customers.create({
          data: {
            id: 'cust_' + crypto.randomBytes(6).toString('hex'),
            name: customer_name,
            phone_number: customer_phone,
            id_number: customer_id_number || '',
          },
        });
      }
      finalCustId = cust.id;
    }

    const isDirectPaid = Number(paid_amount) >= Number(deposit_amount);
    const initialStatus = isDirectPaid ? 'ACTIVE' : 'PENDING_PAYMENT';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Deposit Receipt
      const receipt = await tx.deposit_receipts.create({
        data: {
          id: 'pdc_' + crypto.randomBytes(6).toString('hex'),
          deposit_code: depositCode,
          apartment_id,
          customer_id: finalCustId,
          customer_name,
          customer_phone,
          customer_id_number,
          booking_id,
          opportunity_id,
          sales_person_id: salesPersonId,
          deposit_amount: Number(deposit_amount),
          paid_amount: Number(paid_amount),
          status: initialStatus,
          deadline_date: deadline_date ? new Date(deadline_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          payment_method,
          notes,
          ...(isDirectPaid && {
            payment_confirmed_by: salesPersonId,
            payment_confirmed_at: new Date(),
          }),
        },
        include: { apartments: true },
      });

      // 2. Lock unit status
      await tx.apartments.update({
        where: { id: apartment_id },
        data: { sales_status: isDirectPaid ? 'DEPOSITED' : 'BOOKED' },
      });

      // 3. Mark booking converted if linked
      if (booking_id) {
        await tx.sales_bookings.update({
          where: { id: booking_id },
          data: { status: 'CONVERTED_DEPOSIT' },
        });
      }

      return receipt;
    });

    await logActivity(
      req.user,
      'LẬP_PHIẾU_ĐẶT_CỌC',
      'DEPOSIT',
      result.id,
      result.deposit_code,
      `Lập phiếu đặt cọc ${result.deposit_code} cho căn ${unit.code} (${Number(deposit_amount).toLocaleString('vi-VN')} VNĐ)`
    );

    res.status(201).json({
      success: true,
      message: `Lập phiếu đặt cọc thành công: ${result.deposit_code}`,
      deposit: result,
    });
  } catch (err) {
    console.error('Lỗi lập phiếu đặt cọc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Confirm Deposit Payment (Kế toán xác nhận tiền về)
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_amount, payment_reference, notes } = req.body;
    const confirmedBy = req.user?.username || req.user?.name || 'Kế toán';

    const deposit = await prisma.deposit_receipts.findUnique({
      where: { id },
      include: { apartments: true },
    });

    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu đặt cọc' });
    }

    const newPaid = paid_amount ? Number(paid_amount) : Number(deposit.deposit_amount);

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.deposit_receipts.update({
        where: { id },
        data: {
          paid_amount: newPaid,
          status: 'ACTIVE',
          payment_reference,
          payment_confirmed_by: confirmedBy,
          payment_confirmed_at: new Date(),
          notes: notes ? `${deposit.notes || ''}\n[Kế toán xác nhận]: ${notes}` : deposit.notes,
        },
        include: { apartments: true },
      });

      // Update unit to DEPOSITED
      await tx.apartments.update({
        where: { id: deposit.apartment_id },
        data: { sales_status: 'DEPOSITED' },
      });

      return rec;
    });

    await logActivity(
      req.user,
      'XÁC_NHẬN_TIỀN_CỌC',
      'DEPOSIT',
      deposit.id,
      deposit.deposit_code,
      `Kế toán ${confirmedBy} xác nhận đã thu đủ tiền cọc ${newPaid.toLocaleString('vi-VN')} VNĐ cho căn ${deposit.apartments?.code}`
    );

    res.json({
      success: true,
      message: `Đã xác nhận thu đủ tiền cọc cho phiếu ${deposit.deposit_code}`,
      deposit: updated,
    });
  } catch (err) {
    console.error('Lỗi xác nhận tiền cọc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Transfer Deposit to another unit (Cọc chuyển căn - Blueprint B.4.3)
 */
exports.transferDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_apartment_id, transfer_reason } = req.body;

    if (!new_apartment_id) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn căn hộ đích muốn chuyển đến' });
    }

    const deposit = await prisma.deposit_receipts.findUnique({
      where: { id },
      include: { apartments: true },
    });

    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu đặt cọc' });
    }

    const newUnit = await prisma.apartments.findUnique({ where: { id: new_apartment_id } });
    if (!newUnit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ mới' });
    }

    if (newUnit.sales_status && newUnit.sales_status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: `Căn mới ${newUnit.code} không sẵn bán (Trạng thái: ${newUnit.sales_status})`,
      });
    }

    const oldAptCode = deposit.apartments?.code;

    await prisma.$transaction(async (tx) => {
      // 1. Release old apartment back to AVAILABLE
      await tx.apartments.update({
        where: { id: deposit.apartment_id },
        data: { sales_status: 'AVAILABLE' },
      });

      // 2. Lock new apartment to DEPOSITED
      await tx.apartments.update({
        where: { id: new_apartment_id },
        data: { sales_status: 'DEPOSITED' },
      });

      // 3. Update Deposit Receipt
      await tx.deposit_receipts.update({
        where: { id },
        data: {
          apartment_id: new_apartment_id,
          transferred_from_apt_id: deposit.apartment_id,
          transferred_to_apt_id: new_apartment_id,
          notes: `${deposit.notes || ''}\n[Chuyển cọc từ căn ${oldAptCode} sang căn ${newUnit.code}]: ${transfer_reason || 'Không có lý do'}`,
        },
      });
    });

    await logActivity(
      req.user,
      'CHUYỂN_CỌC_BĐS',
      'DEPOSIT',
      deposit.id,
      deposit.deposit_code,
      `Chuyển tiền cọc từ căn ${oldAptCode} sang căn ${newUnit.code}. Lý do: ${transfer_reason || 'Chuyển căn'}`
    );

    res.json({
      success: true,
      message: `Đã chuyển tiền cọc thành công từ căn ${oldAptCode} sang căn ${newUnit.code}`,
    });
  } catch (err) {
    console.error('Lỗi chuyển cọc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Refund or Forfeit Deposit (Duyệt Hoàn cọc / Tịch cọc - Blueprint B.4.5)
 */
exports.resolveDepositOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'REFUND' | 'FORFEIT'
    const approvedBy = req.user?.username || req.user?.name || 'Ban Lãnh Đạo';

    const deposit = await prisma.deposit_receipts.findUnique({
      where: { id },
      include: { apartments: true },
    });

    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu đặt cọc' });
    }

    const nextStatus = action === 'REFUND' ? 'REFUNDED' : 'FORFEITED';

    await prisma.$transaction(async (tx) => {
      // 1. Update deposit receipt
      await tx.deposit_receipts.update({
        where: { id },
        data: {
          status: nextStatus,
          refund_reason: reason,
          refund_approved_by: approvedBy,
          refund_approved_at: new Date(),
        },
      });

      // 2. Release apartment back to AVAILABLE
      await tx.apartments.update({
        where: { id: deposit.apartment_id },
        data: { sales_status: 'AVAILABLE' },
      });
    });

    await logActivity(
      req.user,
      action === 'REFUND' ? 'HOÀN_TIỀN_CỌC' : 'TỊCH_THU_CỌC',
      'DEPOSIT',
      deposit.id,
      deposit.deposit_code,
      `${action === 'REFUND' ? 'Hoàn cọc' : 'Tịch cọc'} phiếu ${deposit.deposit_code} căn ${deposit.apartments?.code}. Duyệt bởi: ${approvedBy}`
    );

    res.json({
      success: true,
      message: `Đã thực hiện ${action === 'REFUND' ? 'hoàn cọc' : 'tịch cọc'} và giải phóng căn ${deposit.apartments?.code} về trạng thái Sẵn bán`,
    });
  } catch (err) {
    console.error('Lỗi giải quyết kết quả cọc:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const crypto = require('crypto');
const repo = require('../repositories/depositReceiptRepository');

// Service: chuyển MỌI logic nghiệp vụ của depositReceipt từ controller cũ vào đây.
// KHÔNG import prisma/pg trực tiếp — chỉ gọi repo.*.
// Giữ NGUYÊN response shape / status code / route path của các endpoint hiện có.

function genId(prefix, bytes) {
  return prefix + crypto.randomBytes(bytes).toString('hex');
}

// 1. GET /api/deposit-receipts — danh sách (filter status/phase/search)
async function getDeposits(query = {}) {
  const { phase, status = 'ALL', search } = query;

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

  const deposits = await repo.listAll(where);
  return { success: true, deposits, totalCount: deposits.length };
}

// 2. POST /api/deposit-receipts — Sale lập phiếu đặt cọc
async function createDepositReceipt(body, actor) {
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
  } = body;

  const salesPersonId = actor?.username || actor?.name || 'Admin';

  if (!apartment_id || !customer_name || !customer_phone) {
    const err = new Error('Vui lòng điền đủ thông tin Căn hộ, Tên khách và SĐT');
    err.status = 400;
    throw err;
  }

  const unit = await repo.findApartmentById(apartment_id);
  if (!unit) {
    const err = new Error('Không tìm thấy căn hộ');
    err.status = 404;
    throw err;
  }

  // Generate PDC Code: PDC-{CODE}-{DATE}-{RANDOM}
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const depositCode = `PDC-${unit.code}-${dateStr}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;

  // Ensure customer exists or create
  let finalCustId = customer_id;
  if (!finalCustId) {
    let cust = await repo.findCustomerByPhone(customer_phone);
    if (!cust) {
      cust = await repo.createCustomer({
        id: genId('cust_', 6),
        name: customer_name,
        phone_number: customer_phone,
        id_number: customer_id_number || '',
      });
    }
    finalCustId = cust.id;
  }

  const isDirectPaid = Number(paid_amount) >= Number(deposit_amount);
  const initialStatus = isDirectPaid ? 'ACTIVE' : 'PENDING_PAYMENT';

  const receiptData = {
    id: genId('pdc_', 6),
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
    deadline_date: deadline_date
      ? new Date(deadline_date)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    payment_method,
    notes,
    ...(isDirectPaid && {
      payment_confirmed_by: salesPersonId,
      payment_confirmed_at: new Date(),
    }),
  };

  return repo.createDepositTx({
    receiptData,
    apartmentId: apartment_id,
    apartmentStatus: isDirectPaid ? 'DEPOSITED' : 'BOOKED',
    bookingId: booking_id,
  });
}

// 3. POST /api/deposit-receipts/:id/confirm — Kế toán xác nhận tiền về
async function confirmPayment(id, body, actor) {
  const { paid_amount, payment_reference, notes } = body;
  const confirmedBy = actor?.username || actor?.name || 'Kế toán';

  const deposit = await repo.findByIdWithApartment(id);
  if (!deposit) {
    const err = new Error('Không tìm thấy phiếu đặt cọc');
    err.status = 404;
    throw err;
  }

  const newPaid = paid_amount ? Number(paid_amount) : Number(deposit.deposit_amount);

  const updateData = {
    paid_amount: newPaid,
    status: 'ACTIVE',
    payment_reference,
    payment_confirmed_by: confirmedBy,
    payment_confirmed_at: new Date(),
    notes: notes ? `${deposit.notes || ''}\n[Kế toán xác nhận]: ${notes}` : deposit.notes,
  };

  return repo.confirmPaymentTx({
    id,
    updateData,
    apartmentId: deposit.apartment_id,
  });
}

// 4. POST /api/deposit-receipts/:id/transfer — Chuyển cọc sang căn khác
async function transferDeposit(id, body) {
  const { new_apartment_id, transfer_reason } = body;

  if (!new_apartment_id) {
    const err = new Error('Vui lòng chọn căn hộ đích muốn chuyển đến');
    err.status = 400;
    throw err;
  }

  const deposit = await repo.findByIdWithApartment(id);
  if (!deposit) {
    const err = new Error('Không tìm thấy phiếu đặt cọc');
    err.status = 404;
    throw err;
  }

  const newUnit = await repo.findApartmentById(new_apartment_id);
  if (!newUnit) {
    const err = new Error('Không tìm thấy căn hộ mới');
    err.status = 404;
    throw err;
  }

  if (newUnit.sales_status && newUnit.sales_status !== 'AVAILABLE') {
    const err = new Error(
      `Căn mới ${newUnit.code} không sẵn bán (Trạng thái: ${newUnit.sales_status})`
    );
    err.status = 400;
    throw err;
  }

  const oldAptCode = deposit.apartments?.code;

  await repo.transferTx({
    oldApartmentId: deposit.apartment_id,
    newApartmentId: new_apartment_id,
    receiptUpdateData: {
      id,
      data: {
        apartment_id: new_apartment_id,
        transferred_from_apt_id: deposit.apartment_id,
        transferred_to_apt_id: new_apartment_id,
        notes: `${deposit.notes || ''}\n[Chuyển cọc từ căn ${oldAptCode} sang căn ${
          newUnit.code
        }]: ${transfer_reason || 'Không có lý do'}`,
      },
    },
  });

  return { oldAptCode, newAptCode: newUnit.code };
}

// 5. POST /api/deposit-receipts/:id/outcome — Hoàn cọc / Tịch cọc
async function resolveDepositOutcome(id, body, actor) {
  const { action, reason } = body;
  const approvedBy = actor?.username || actor?.name || 'Ban Lãnh Đạo';

  const deposit = await repo.findByIdWithApartment(id);
  if (!deposit) {
    const err = new Error('Không tìm thấy phiếu đặt cọc');
    err.status = 404;
    throw err;
  }

  const nextStatus = action === 'REFUND' ? 'REFUNDED' : 'FORFEITED';

  await repo.resolveTx({
    id,
    updateData: {
      status: nextStatus,
      refund_reason: reason,
      refund_approved_by: approvedBy,
      refund_approved_at: new Date(),
    },
    apartmentId: deposit.apartment_id,
  });

  return {
    action,
    depositCode: deposit.deposit_code,
    apartmentCode: deposit.apartments?.code,
  };
}

module.exports = {
  getDeposits,
  createDepositReceipt,
  confirmPayment,
  transferDeposit,
  resolveDepositOutcome,
};

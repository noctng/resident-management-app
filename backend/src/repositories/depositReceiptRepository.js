const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Model chính: `deposit_receipts`. Các query liên quan (apartments, customers,
// sales_bookings) nằm trong các hàm *Tx dùng prisma.$transaction để giữ tính
// nguyên tử của các nghiệp vụ liên quan đến phiếu đặt cọc.
// KHÔNG đổi behavior / response shape của các endpoint hiện có.

// GET /api/deposit-receipts — list với apartment info
async function listAll(where = {}, opts = {}) {
  return prisma.deposit_receipts.findMany({
    where,
    include: { apartments: true },
    orderBy: { created_at: 'desc' },
    ...opts,
  });
}

// Lấy phiếu cọc kèm căn hộ (dùng cho existence check + log)
async function findByIdWithApartment(id) {
  return prisma.deposit_receipts.findUnique({
    where: { id },
    include: { apartments: true },
  });
}

// Lấy căn hộ theo id (dùng validate + lấy code)
async function findApartmentById(id) {
  return prisma.apartments.findUnique({ where: { id } });
}

// Tìm khách hàng theo SĐT (dùng ensure-customer)
async function findCustomerByPhone(phone) {
  return prisma.customers.findFirst({ where: { phone_number: phone } });
}

// Tạo khách hàng mới (khi đặt cọc mà chưa có customer_id)
async function createCustomer(data) {
  return prisma.customers.create({ data });
}

// Tạo phiếu cọc + khoá căn + (tuỳ chọn) cập nhật booking trong 1 transaction
async function createDepositTx({ receiptData, apartmentId, apartmentStatus, bookingId }) {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.deposit_receipts.create({
      data: receiptData,
      include: { apartments: true },
    });
    await tx.apartments.update({
      where: { id: apartmentId },
      data: { sales_status: apartmentStatus },
    });
    if (bookingId) {
      await tx.sales_bookings.update({
        where: { id: bookingId },
        data: { status: 'CONVERTED_DEPOSIT' },
      });
    }
    return receipt;
  });
}

// Xác nhận thanh toán cọc + khoá căn thành DEPOSITED
async function confirmPaymentTx({ id, updateData, apartmentId }) {
  return prisma.$transaction(async (tx) => {
    const rec = await tx.deposit_receipts.update({
      where: { id },
      data: updateData,
      include: { apartments: true },
    });
    await tx.apartments.update({
      where: { id: apartmentId },
      data: { sales_status: 'DEPOSITED' },
    });
    return rec;
  });
}

// Chuyển cọc sang căn mới: giải phóng căn cũ, khoá căn mới, cập nhật phiếu
async function transferTx({ oldApartmentId, newApartmentId, receiptUpdateData }) {
  return prisma.$transaction(async (tx) => {
    await tx.apartments.update({
      where: { id: oldApartmentId },
      data: { sales_status: 'AVAILABLE' },
    });
    await tx.apartments.update({
      where: { id: newApartmentId },
      data: { sales_status: 'DEPOSITED' },
    });
    await tx.deposit_receipts.update({
      where: { id: receiptUpdateData.id },
      data: receiptUpdateData.data,
    });
  });
}

// Hoàn / tịch cọc + giải phóng căn về AVAILABLE
async function resolveTx({ id, updateData, apartmentId }) {
  return prisma.$transaction(async (tx) => {
    await tx.deposit_receipts.update({ where: { id }, data: updateData });
    await tx.apartments.update({
      where: { id: apartmentId },
      data: { sales_status: 'AVAILABLE' },
    });
  });
}

module.exports = {
  listAll,
  findByIdWithApartment,
  findApartmentById,
  findCustomerByPhone,
  createCustomer,
  createDepositTx,
  confirmPaymentTx,
  transferTx,
  resolveTx,
};

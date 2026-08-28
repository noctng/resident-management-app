const repo = require('../repositories/contractRepository');
const { generateRandomId } = require('../utils/helpers');

// Service: chuyển logic CRUD cốt lõi của contract từ controller cũ vào đây.
// KHÔNG import prisma trực tiếp — chỉ gọi repo.*.
// Giữ NGUYÊN response shape / status code của các endpoint hiện có.

// GET /api/contracts — trả nguyên shape prisma (đã include customers/apartments)
async function getAllContracts() {
  return repo.listAll();
}

// GET /api/contracts/:id — 404 nếu không tìm thấy (để controller format response)
async function getContractById(id) {
  const contract = await repo.getById(id);
  if (!contract) {
    const err = new Error('Không tìm thấy hợp đồng');
    err.status = 404;
    throw err;
  }
  return contract;
}

// POST /api/contracts — tạo hợp đồng (+ tuỳ chọn lịch thanh toán)
async function createContract(body) {
  const {
    contract_code,
    customer_id,
    apartment_id,
    total_value,
    vat_amount,
    maintenance_fee,
    status,
    signed_date,
    handover_date,
    payment_schedule, // Optional array of payments
  } = body;

  const id = `cont_${generateRandomId()}`;

  const contractData = {
    id,
    contract_code,
    customer_id,
    apartment_id,
    total_value,
    vat_amount: vat_amount || 0,
    maintenance_fee: maintenance_fee || 0,
    status: status || 'DEPOSIT',
    signed_date: signed_date ? new Date(signed_date) : null,
    handover_date: handover_date ? new Date(handover_date) : null,
  };

  let payments = [];
  if (payment_schedule && Array.isArray(payment_schedule)) {
    payments = payment_schedule.map((p, index) => ({
      id: `pay_${generateRandomId()}_${index}`,
      contract_id: id,
      installment: p.installment || index + 1,
      description: p.description,
      due_date: new Date(p.due_date),
      amount: p.amount,
      paid_amount: p.paid_amount || 0,
      status: p.status || 'PENDING',
    }));
  }

  return repo.createWithPayments(contractData, payments);
}

// PUT /api/contracts/:id — cập nhật trạng thái / ngày ký / ngày bàn giao.
// Trả về { oldContract, updatedContract } để controller ghi logActivity (cần req.user).
async function updateContract(id, body) {
  const { status, signed_date, handover_date } = body;

  const oldContract = await repo.findById(id);
  if (!oldContract) {
    const err = new Error('Không tìm thấy hợp đồng');
    err.status = 404;
    throw err;
  }

  const data = {
    status,
    signed_date: signed_date ? new Date(signed_date) : undefined,
    handover_date: handover_date ? new Date(handover_date) : undefined,
    updated_at: new Date(),
  };

  const updatedContract = await repo.update(id, data);
  return { oldContract, updatedContract };
}

module.exports = {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
};

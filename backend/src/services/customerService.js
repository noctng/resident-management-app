const { generateRandomId } = require('../utils/helpers');
const { logActivity } = require('../utils/logger');
const repo = require('../repositories/customerRepository');

const getAllCustomers = async () => repo.findAll();

const getCustomerById = async (id) => {
  const customer = await repo.findById(id);
  return customer; // null nếu không tìm thấy (controller xử lý 404)
};

const createCustomer = async (body, user) => {
  const { name, phone_number, email, address, id_number, notes } = body;
  const id = `cust_${generateRandomId()}`;

  const newCustomer = await repo.create({
    id,
    name,
    phone_number,
    email,
    address,
    id_number,
    notes,
  });

  await logActivity(
    user,
    'CREATE',
    'CUSTOMER',
    newCustomer.id,
    newCustomer.name,
    `Tạo khách hàng mới: ${newCustomer.name} - SĐT: ${newCustomer.phone_number}`
  );

  return newCustomer;
};

const updateCustomer = async (id, body, user) => {
  const { name, phone_number, email, address, id_number, notes } = body;

  const oldCustomer = await repo.findRawById(id);
  if (!oldCustomer) return null; // controller xử lý 404

  const updatedCustomer = await repo.update(id, {
    name,
    phone_number,
    email,
    address,
    id_number,
    notes,
  });

  await logActivity(
    user,
    'UPDATE',
    'CUSTOMER',
    updatedCustomer.id,
    updatedCustomer.name,
    `Cập nhật thông tin khách hàng: ${updatedCustomer.name}`,
    oldCustomer,
    updatedCustomer
  );

  return updatedCustomer;
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
};

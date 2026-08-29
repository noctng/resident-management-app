const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');
const { logActivity } = require('../utils/logger');
const service = require('../services/customerService');

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await service.getAllCustomers();
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách khách hàng' });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await service.getCustomerById(id);

    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }

    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải chi tiết khách hàng' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const newCustomer = await service.createCustomer(req.body, req.user);
    res.status(201).json(newCustomer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo khách hàng' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCustomer = await service.updateCustomer(id, req.body, req.user);

    if (!updatedCustomer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng để cập nhật' });
    }

    res.json(updatedCustomer);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng để cập nhật' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật khách hàng' });
  }
};

// HUYẾT MẠCH CROSS-MODULE: chuyển khách hàng thành cư dân (tạo resident + account + occupancy + bcrypt).
// Giữ nguyên logic prisma trong controller theo quy tắc exception (handler cross-module phức tạp).
exports.convertToResident = async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const { contractId } = req.body;
    const bcrypt = require('bcrypt');
    const SALT_ROUNDS = 10;

    // 1. Get customer with contracts
    const customer = await prisma.customers.findUnique({
      where: { id: customerId },
      include: {
        contracts: {
          where: { status: 'COMPLETED' },
          include: {
            apartments: {
              include: {
                occupancies: {
                  include: {
                    residents: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
    }

    // 2. Validate: Must have completed contract
    if (customer.contracts.length === 0) {
      return res.status(400).json({
        message: 'Khách hàng chưa có hợp đồng hoàn thành nào',
        requiresCompletedContract: true,
      });
    }

    // 3. Validate: Must have ID number
    if (!customer.id_number || customer.id_number.trim() === '') {
      return res.status(400).json({
        message:
          'Khách hàng chưa có CMND/CCCD. Vui lòng cập nhật thông tin trước khi chuyển đổi.',
        missingIdNumber: true,
      });
    }

    // 4. Determine which contract to use
    let selectedContract;
    if (contractId) {
      selectedContract = customer.contracts.find((c) => c.id === contractId);
      if (!selectedContract) {
        return res.status(400).json({ message: 'Hợp đồng không hợp lệ' });
      }
    } else {
      selectedContract = customer.contracts[0];
    }

    const apartmentId = selectedContract.apartment_id;
    const apartment = selectedContract.apartments;

    // 5. Check if customer is already a resident (by id_number or phone_number)
    let existingResident = null;
    if (customer.id_number) {
      existingResident = await prisma.residents.findFirst({
        where: { id_number: customer.id_number },
      });
    }

    if (!existingResident && customer.phone_number) {
      existingResident = await prisma.residents.findFirst({
        where: { phone_number: customer.phone_number },
      });
    }

    let residentId;
    let isNewResident = false;
    let accountCreated = false;

    if (existingResident) {
      // Customer is already a resident, just use existing resident ID
      residentId = existingResident.id;
    } else {
      // 6. Create new resident
      isNewResident = true;
      residentId = `res_${generateRandomId()}`;

      await prisma.residents.create({
        data: {
          id: residentId,
          name: customer.name,
          dob: null, // Customer doesn't have DOB
          id_number: customer.id_number,
          phone_number: customer.phone_number || null,
          email: customer.email || null,
          is_active: true,
          relationship_status: 'OWNER',
          can_use_amenities: true,
        },
      });

      // 7. Create resident account if has phone number
      if (customer.phone_number) {
        try {
          const hash = await bcrypt.hash('Abc@12345', SALT_ROUNDS);
          await prisma.resident_accounts.create({
            data: {
              resident_id: residentId,
              password_hash: hash,
            },
          });
          accountCreated = true;
        } catch (err) {
          console.error('Error creating resident account:', err);
          // Continue even if account creation fails
        }
      }
    }

    // 8. Check if occupancy already exists
    const existingOccupancy = await prisma.occupancies.findUnique({
      where: {
        apartment_id_resident_id: {
          apartment_id: apartmentId,
          resident_id: residentId,
        },
      },
    });

    if (existingOccupancy) {
      return res.status(400).json({
        message: 'Cư dân này đã được gán vào căn hộ này rồi',
        alreadyOccupied: true,
      });
    }

    // 9. Get existing residents in the apartment
    const existingResidents = apartment.occupancies.map((occ) => ({
      id: occ.residents.id,
      name: occ.residents.name,
      phone_number: occ.residents.phone_number,
      relationship_status: occ.residents.relationship_status,
    }));

    // 10. Create occupancy record
    await prisma.occupancies.create({
      data: {
        apartment_id: apartmentId,
        resident_id: residentId,
      },
    });

    // 11. Log activity
    await logActivity(
      req.user,
      'CONVERT_TO_RESIDENT',
      'CUSTOMER',
      customerId,
      customer.name,
      {
        message: `Chuyển đổi khách hàng thành cư dân: ${customer.name}`,
        metadata: {
          residentId,
          apartmentId,
          apartmentCode: apartment.code,
          isNewResident,
          accountCreated,
          contractId: selectedContract.id,
        },
      }
    );

    // 12. Return success response
    res.status(201).json({
      message: 'Chuyển đổi thành công',
      resident: {
        id: residentId,
        name: customer.name,
        phone_number: customer.phone_number,
        id_number: customer.id_number,
        email: customer.email,
      },
      apartment: {
        id: apartmentId,
        code: apartment.code,
        house_type: apartment.house_type,
      },
      isNewResident,
      accountCreated,
      hasPhoneNumber: !!customer.phone_number,
      existingResidents,
      warnings: !customer.phone_number
        ? ['Không có số điện thoại, chưa tạo tài khoản cư dân']
        : [],
    });
  } catch (err) {
    console.error('Error converting customer to resident:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi chuyển đổi khách hàng thành cư dân' });
  }
};

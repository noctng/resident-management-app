const repo = require('../repositories/vehicleRepository');

// Map entity (snake_case từ Prisma) → DTO (camelCase trả frontend).
function toDTO(v) {
  return {
    id: v.id,
    apartmentId: v.apartment_id,
    vehicleType: v.vehicle_type,
    licensePlate: v.license_plate,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };
}

// Map list vehicles kèm owner info (từ include apartments.occupancies.residents).
function mapWithOwner(vehicles) {
  return vehicles.map((v) => {
    const apt = v.apartments;
    const ownerOcc = apt?.occupancies?.[0];
    return {
      id: v.id,
      apartmentId: v.apartment_id,
      vehicleType: v.vehicle_type,
      licensePlate: v.license_plate,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
      apartmentCode: apt?.code || '',
      ownerName: ownerOcc?.residents?.name || '',
      ownerPhone: ownerOcc?.residents?.phone_number || '',
    };
  });
}

async function getVehicles() {
  const vehicles = await repo.listAll();
  return mapWithOwner(vehicles);
}

async function getVehiclesByApartment(apartmentId) {
  const vehicles = await repo.listByApartment(apartmentId);
  return { success: true, vehicles };
}

async function createVehicle(dto) {
  const { apartmentId, vehicleType, licensePlate } = dto;

  const existing = await repo.findByLicensePlate(licensePlate);
  if (existing) {
    const err = new Error('Biển số đã tồn tại.');
    err.status = 400;
    throw err;
  }

  const vehicle = await repo.create({
    apartment_id: apartmentId,
    vehicle_type: vehicleType,
    license_plate: licensePlate,
  });

  return toDTO(vehicle);
}

async function updateVehicle(id, dto) {
  const { apartmentId, vehicleType, licensePlate } = dto;

  // Chỉ check trùng khi đổi biển số
  if (licensePlate) {
    const dup = await repo.findDuplicate(licensePlate, id);
    if (dup) {
      const err = new Error('Biển số đã tồn tại.');
      err.status = 400;
      throw err;
    }
  }

  const data = {};
  if (apartmentId) data.apartment_id = apartmentId;
  if (vehicleType) data.vehicle_type = vehicleType;
  if (licensePlate) data.license_plate = licensePlate;
  data.updated_at = new Date();

  const vehicle = await repo.update(id, data);
  return toDTO(vehicle);
}

async function deleteVehicle(id) {
  await repo.remove(id);
}

// Resident Portal: đăng ký xe online (normalize biển số, default MOTORBIKE).
async function registerResidentVehicle(dto) {
  const { apartment_id, vehicle_type, license_plate } = dto;

  if (!apartment_id || !license_plate) {
    const err = new Error('Vui lòng cung cấp căn hộ và biển số xe.');
    err.status = 400;
    throw err;
  }

  const plate = license_plate.trim().toUpperCase();
  const existing = await repo.findByLicensePlate(plate);
  if (existing) {
    const err = new Error('Biển số xe này đã được đăng ký trong hệ thống.');
    err.status = 400;
    throw err;
  }

  const vehicle = await repo.create({
    apartment_id,
    vehicle_type: vehicle_type || 'MOTORBIKE',
    license_plate: plate,
  });

  return vehicle;
}

module.exports = {
  getVehicles,
  getVehiclesByApartment,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  registerResidentVehicle,
};

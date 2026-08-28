const prisma = require('../config/prisma');

// GET /api/vehicles — List all vehicles with owner info
exports.getVehicles = async (req, res) => {
    try {
        const vehicles = await prisma.vehicles.findMany({
            include: {
                apartments: {
                    include: {
                        occupancies: {
                            where: { residents: { relationship_status: 'OWNER' } },
                            include: { residents: true },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        const result = vehicles.map((v) => {
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

        res.json(result);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách phương tiện.' });
    }
};

// POST /api/vehicles — Create a vehicle
exports.createVehicle = async (req, res) => {
    try {
        const { apartmentId, vehicleType, licensePlate } = req.body;

        // Check duplicate license plate
        const existing = await prisma.vehicles.findUnique({
            where: { license_plate: licensePlate },
        });
        if (existing) {
            return res.status(400).json({ message: 'Biển số đã tồn tại.' });
        }

        const vehicle = await prisma.vehicles.create({
            data: {
                apartment_id: apartmentId,
                vehicle_type: vehicleType,
                license_plate: licensePlate,
            },
        });

        res.status(201).json({
            id: vehicle.id,
            apartmentId: vehicle.apartment_id,
            vehicleType: vehicle.vehicle_type,
            licensePlate: vehicle.license_plate,
            createdAt: vehicle.created_at,
            updatedAt: vehicle.updated_at,
        });
    } catch (error) {
        console.error('Error creating vehicle:', error);
        res.status(500).json({ message: 'Lỗi khi thêm phương tiện.' });
    }
};

// PUT /api/vehicles/:id — Update a vehicle
exports.updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const { apartmentId, vehicleType, licensePlate } = req.body;

        // Check license plate uniqueness if changing
        if (licensePlate) {
            const dup = await prisma.vehicles.findFirst({
                where: { license_plate: licensePlate, NOT: { id } },
            });
            if (dup) {
                return res.status(400).json({ message: 'Biển số đã tồn tại.' });
            }
        }

        const data = {};
        if (apartmentId) data.apartment_id = apartmentId;
        if (vehicleType) data.vehicle_type = vehicleType;
        if (licensePlate) data.license_plate = licensePlate;
        data.updated_at = new Date();

        const vehicle = await prisma.vehicles.update({
            where: { id },
            data,
        });

        res.json({
            id: vehicle.id,
            apartmentId: vehicle.apartment_id,
            vehicleType: vehicle.vehicle_type,
            licensePlate: vehicle.license_plate,
            createdAt: vehicle.created_at,
            updatedAt: vehicle.updated_at,
        });
    } catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({ message: 'Lỗi khi cập nhật phương tiện.' });
    }
};

// DELETE /api/vehicles/:id — Delete a vehicle
exports.deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.vehicles.delete({ where: { id } });
        res.json({ message: 'Đã xóa phương tiện.' });
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ message: 'Lỗi khi xóa phương tiện.' });
    }
};

// GET /api/vehicles/apartment/:apartmentId — List vehicles for a specific apartment (Resident Portal)
exports.getVehiclesByApartment = async (req, res) => {
    try {
        const { apartmentId } = req.params;
        const vehicles = await prisma.vehicles.findMany({
            where: { apartment_id: apartmentId },
            orderBy: { created_at: 'desc' },
        });
        res.json({ success: true, vehicles });
    } catch (error) {
        console.error('Error fetching apartment vehicles:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách phương tiện căn hộ.' });
    }
};

// POST /api/vehicles/register — Resident registers a new vehicle online
exports.registerResidentVehicle = async (req, res) => {
    try {
        const { apartment_id, vehicle_type, license_plate } = req.body;
        if (!apartment_id || !license_plate) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp căn hộ và biển số xe.' });
        }

        const existing = await prisma.vehicles.findUnique({
            where: { license_plate: license_plate.trim().toUpperCase() },
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Biển số xe này đã được đăng ký trong hệ thống.' });
        }

        const vehicle = await prisma.vehicles.create({
            data: {
                apartment_id,
                vehicle_type: vehicle_type || 'MOTORBIKE',
                license_plate: license_plate.trim().toUpperCase(),
            },
        });

        res.status(201).json({
            success: true,
            message: 'Đăng ký phương tiện thành công! Thẻ xe đang được BQL kích hoạt.',
            vehicle,
        });
    } catch (error) {
        console.error('Error registering vehicle:', error);
        res.status(500).json({ success: false, message: error.message || 'Lỗi khi đăng ký phương tiện.' });
    }
};


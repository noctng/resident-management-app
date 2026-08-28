const { z } = require('zod');

// --- Apartment Schemas ---
const createApartmentSchema = z.object({
    houseType: z.string().optional(),
    code: z.string().min(1, 'Mã căn hộ không được để trống'),
    floor: z.number().int('Tầng phải là số nguyên').optional(),
    area: z.number().positive('Diện tích phải là số dương').optional(),
    electricityType: z.enum(['RESIDENTIAL', 'BUSINESS']).optional(),
}).passthrough();

const updateApartmentSchema = z.object({}).passthrough();

// --- Resident Schemas ---
const createResidentSchema = z.object({
    name: z.string().min(1, 'Tên cư dân không được để trống'),
    dob: z
        .string()
        .or(z.date())
        .refine((val) => !isNaN(Date.parse(val.toString())), { message: 'Ngày sinh không hợp lệ' }),
    idNumber: z.string().min(1, 'CMND/CCCD/Passport không được để trống'),
    zaloId: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    email: z.string().email('Email không hợp lệ').or(z.literal('')).optional().nullable(),
    relationshipStatus: z.enum(['OWNER', 'FAMILY', 'TENANT']).optional(),
    canUseAmenities: z.boolean().optional(),
});

const updateResidentSchema = createResidentSchema.partial();

// --- Occupancy Schemas ---
const occupancySchema = z.object({
    apartmentId: z.string().min(1, 'ID Căn hộ không được để trống'),
    residentId: z.string().min(1, 'ID Cư dân không được để trống'),
});

module.exports = {
    createApartmentSchema,
    updateApartmentSchema,
    createResidentSchema,
    updateResidentSchema,
    occupancySchema,
};

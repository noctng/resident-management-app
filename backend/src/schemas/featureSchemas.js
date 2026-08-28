const { z } = require('zod');

// --- Utility Schemas ---
const utilityRecordSchema = z.object({
    apartmentId: z.string().min(1, 'ID Căn hộ không được để trống'),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000),
    newElectricityReading: z.number().min(0, 'Chỉ số điện không hợp lệ'),
    newWaterReading: z.number().min(0, 'Chỉ số nước không hợp lệ'),
});

const pricingConfigSchema = z.object({
    config: z.object({
        residentialElectricity: z.array(
            z.object({
                limit: z.number().nullable(),
                rate: z.number(),
            })
        ),
        businessElectricity: z.object({
            normalRate: z.number(),
            offPeakRate: z.number(),
            peakRate: z.number(),
            averageRate: z.number(),
        }),
        water: z.object({
            residentialRate: z.number(),
            businessRate: z.number(),
        }),
        vat: z.object({
            electricity: z.number(),
            water: z.number(),
        }),
        n8nWebhookUrl: z.string().optional(),
    }),
    userId: z.string().min(1),
});

// --- Amenity Schemas ---
const amenityBookingSchema = z.object({
    apartmentId: z.string().min(1, 'ID Căn hộ không được để trống'),
    residentId: z.string().optional().nullable(),
    amenity: z.enum([
        'GOLF_3D',
        'HORSE_RIDING',
        'MUSEUM',
        'ZEN_GARDEN',
        'GYM',
        'YOGA',
        'SAUNA',
        'ARCHERY',
    ]),
    usageDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ngày không hợp lệ'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ bắt đầu sai định dạng (HH:mm)'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ kết thúc sai định dạng (HH:mm)'),
});

const updateBookingStatusSchema = z.object({
    status: z.enum(['PENDING', 'USED', 'CANCELLED']),
});

const updateAmenityBookingSchema = z.object({
    apartmentId: z.string().min(1, 'ID Căn hộ không được để trống').optional(),
    residentId: z.string().optional().nullable(),
    amenity: z.enum([
        'GOLF_3D',
        'HORSE_RIDING',
        'MUSEUM',
        'ZEN_GARDEN',
        'GYM',
        'YOGA',
        'SAUNA',
        'ARCHERY',
    ]).optional(),
    usageDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ngày không hợp lệ').optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ bắt đầu sai định dạng (HH:mm)').optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ kết thúc sai định dạng (HH:mm)').optional(),
    status: z.enum(['PENDING', 'USED', 'CANCELLED']).optional(),
});

// --- Feedback Schemas ---
const createFeedbackSchema = z.object({
    residentId: z.string().min(1),
    apartmentId: z.string().min(1),
    content: z.string().min(1, 'Nội dung không được để trống'),
});

const resolveFeedbackSchema = z.object({
    adminResponseContent: z.string().min(1, 'Nội dung phản hồi không được để trống'),
});

// --- Log Schema ---
const createLogSchema = z.object({
    action: z.string().min(1),
    targetType: z.string(),
    targetId: z.string().optional().nullable(),
    targetName: z.string().optional().nullable(),
    details: z.string().optional().nullable(),
});

// --- Vehicle Schemas ---
const vehicleSchema = z.object({
    apartmentId: z.string().min(1, 'Căn hộ không được để trống'),
    vehicleType: z.enum(['CAR', 'MOTORBIKE'], { required_error: 'Loại phương tiện không được để trống' }),
    licensePlate: z.string().min(1, 'Biển số không được để trống').max(20),
});

const updateVehicleSchema = z.object({
    apartmentId: z.string().min(1).optional(),
    vehicleType: z.enum(['CAR', 'MOTORBIKE']).optional(),
    licensePlate: z.string().min(1).max(20).optional(),
});

module.exports = {
    utilityRecordSchema,
    pricingConfigSchema,
    amenityBookingSchema,
    updateBookingStatusSchema,
    updateAmenityBookingSchema,
    createFeedbackSchema,
    resolveFeedbackSchema,
    createLogSchema,
    vehicleSchema,
    updateVehicleSchema,
};

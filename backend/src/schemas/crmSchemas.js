const { z } = require('zod');

const customerSchema = z.object({
    name: z.string().min(1, 'Tên không được để trống'),
    phone_number: z.string().min(10, 'Số điện thoại không hợp lệ'),
    email: z.string().email('Email không hợp lệ').optional().nullable(),
    address: z.string().optional().nullable(),
    id_number: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

const contractSchema = z.object({
    contract_code: z.string().min(1, 'Mã hợp đồng không được để trống'),
    customer_id: z.string().min(1, 'Khách hàng không được để trống'),
    apartment_id: z.string().min(1, 'Căn hộ không được để trống'),
    total_value: z.number().positive('Giá trị phải lớn hơn 0'),
    vat_amount: z.number().nonnegative().default(0),
    maintenance_fee: z.number().nonnegative().default(0),
    status: z.enum(['DEPOSIT', 'SIGNED', 'PAYING', 'COMPLETED', 'CANCELLED']).default('DEPOSIT'),
    signed_date: z.string().optional().nullable(),
    handover_date: z.string().optional().nullable(),
});

const paymentSchema = z.object({
    contract_id: z.string().min(1),
    installment: z.number().int().positive(),
    description: z.string().optional().nullable(),
    due_date: z.string(),
    amount: z.number().positive(),
    paid_amount: z.number().nonnegative().default(0),
    payment_date: z.string().optional().nullable(),
    status: z.enum(['PENDING', 'PAID', 'OVERDUE']).default('PENDING'),
});

module.exports = {
    customerSchema,
    contractSchema,
    paymentSchema,
};

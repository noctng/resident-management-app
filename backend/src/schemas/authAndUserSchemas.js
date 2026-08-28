const { z } = require('zod');

// --- Auth Schemas ---
const loginSchema = z.object({
    username: z.string().min(1, 'Tên đăng nhập không được để trống'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
});

const residentLoginSchema = z.object({
    phoneNumber: z.string().min(1, 'Số điện thoại không được để trống'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Mật khẩu cũ không được để trống'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
    userId: z.string().optional(), // For admin changing user password
});

const changeResidentPasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Mật khẩu cũ không được để trống'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

// --- User Schemas ---
const createUserSchema = z.object({
    username: z.string().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    role: z.number().int().min(0).max(1).optional(), // 0: Admin, 1: Staff
    permissions: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
    role: z.number().int().min(0).max(1).optional(),
    permissions: z.array(z.string()).optional(),
});

module.exports = {
    loginSchema,
    residentLoginSchema,
    changePasswordSchema,
    changeResidentPasswordSchema,
    createUserSchema,
    updateUserSchema,
};

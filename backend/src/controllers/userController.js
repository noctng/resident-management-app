const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const { generateRandomId } = require('../utils/helpers');
const { logAudit } = require('../utils/serverLogger');

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Mk@12345';

exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            select: { id: true, username: true, role: true, permissions: true, created_at: true },
            orderBy: { username: 'asc' },
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, password, role, permissions } = req.body;

        const exist = await prisma.users.findUnique({ where: { username } });
        if (exist) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const id = `user_${generateRandomId()}`;
        const finalRole = role === undefined || role === null ? 1 : role; // Default to Staff

        const newUser = await prisma.users.create({
            data: {
                id,
                username,
                password_hash: hash,
                role: finalRole,
                permissions: permissions || [],
            },
            select: { id: true, username: true, role: true, permissions: true },
        });

        logAudit({
            req,
            action: 'CREATE_USER',
            targetType: 'User',
            targetId: newUser.id,
            targetName: newUser.username,
            details: `Tạo tài khoản người dùng mới: "${newUser.username}" (Role: ${newUser.role === 0 ? 'Admin' : 'Staff'}, Quyền: ${(newUser.permissions || []).join(', ') || 'Không'})`,
            newValue: { role: newUser.role, permissions: newUser.permissions },
            statusCode: 201,
        });

        res.status(201).json(newUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { role, permissions } = req.body;

        if (req.params.id === req.user.id && req.user.role === 0 && role !== 0) {
            return res.status(400).json({ message: 'Không thể tự hạ quyền Admin của chính mình.' });
        }

        const existingUser = await prisma.users.findUnique({
            where: { id: req.params.id },
            select: { id: true, username: true, role: true, permissions: true },
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        const updatedUser = await prisma.users.update({
            where: { id: req.params.id },
            data: { role, permissions },
            select: { id: true, username: true, role: true, permissions: true },
        });

        logAudit({
            req,
            action: 'UPDATE_USER_PERMISSION',
            targetType: 'User',
            targetId: updatedUser.id,
            targetName: updatedUser.username,
            details: `Cập nhật vai trò & quyền truy cập của "${updatedUser.username}": Role ${existingUser.role} → ${updatedUser.role}, Quyền: ${(updatedUser.permissions || []).join(', ') || 'Không'}`,
            oldValue: { role: existingUser.role, permissions: existingUser.permissions },
            newValue: { role: updatedUser.role, permissions: updatedUser.permissions },
            statusCode: 200,
        });

        res.json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user.id)
            return res.status(400).json({ message: 'Không thể tự xóa tài khoản.' });

        const userToDelete = await prisma.users.findUnique({
            where: { id: req.params.id },
            select: { id: true, username: true, role: true },
        });

        if (!userToDelete) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        await prisma.users.delete({ where: { id: req.params.id } });

        logAudit({
            req,
            action: 'DELETE_USER',
            targetType: 'User',
            targetId: userToDelete.id,
            targetName: userToDelete.username,
            details: `Xóa tài khoản người dùng: "${userToDelete.username}"`,
            statusCode: 204,
        });

        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await prisma.users.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }

        // Prevent resetting admin password
        if (user.username === 'admin') {
            return res.status(403).json({ message: 'Không thể reset mật khẩu admin.' });
        }

        // Hash the default password
        const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

        // Update password
        await prisma.users.update({
            where: { id },
            data: { password_hash: hash },
        });

        logAudit({
            req,
            action: 'RESET_PASSWORD',
            targetType: 'User',
            targetId: user.id,
            targetName: user.username,
            details: `Reset mật khẩu cho người dùng "${user.username}" về mật khẩu mặc định`,
            statusCode: 200,
        });

        res.json({ message: `Mật khẩu đã được reset thành công. Mật khẩu mới: ${DEFAULT_PASSWORD}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ khi reset mật khẩu' });
    }
};

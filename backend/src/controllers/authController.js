const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const {
    JWT_ADMIN_SECRET,
    JWT_RESIDENT_SECRET,
    TOKEN_COOKIE_NAME,
    COOKIE_OPTIONS,
} = require('../config/auth');
const { logAudit } = require('../utils/serverLogger');

const SALT_ROUNDS = 10;

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.users.findUnique({ where: { username } });

        if (!user) {
            logAudit({
                req,
                action: 'LOGIN_FAILED',
                targetType: 'Auth',
                details: `Đăng nhập thất bại: Tài khoản "${username}" không tồn tại`,
                statusCode: 401,
            });
            return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
            const token = jwt.sign(
                {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions,
                    type: 'admin',
                },
                JWT_ADMIN_SECRET,
                { expiresIn: '1d' }
            );

            res.cookie(TOKEN_COOKIE_NAME, token, {
                ...COOKIE_OPTIONS,
                maxAge: 24 * 60 * 60 * 1000,
            });

            logAudit({
                req,
                userId: user.id,
                username: user.username,
                action: 'USER_LOGIN',
                targetType: 'Auth',
                targetId: user.id,
                targetName: user.username,
                details: `Đăng nhập hệ thống thành công (Role: ${user.role === 0 ? 'Admin' : 'Staff'})`,
                statusCode: 200,
            });

            res.json({
                message: 'Đăng nhập thành công.',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    permissions: user.permissions,
                },
            });
        } else {
            logAudit({
                req,
                action: 'LOGIN_FAILED',
                targetType: 'Auth',
                targetId: user.id,
                targetName: user.username,
                details: `Đăng nhập thất bại: Sai mật khẩu cho tài khoản "${username}"`,
                statusCode: 401,
            });
            res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.logout = (req, res) => {
    if (req.user || req.resident) {
        logAudit({
            req,
            action: 'USER_LOGOUT',
            targetType: 'Auth',
            details: 'Người dùng đăng xuất khỏi hệ thống',
            statusCode: 200,
        });
    }
    res.clearCookie(TOKEN_COOKIE_NAME, {
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: COOKIE_OPTIONS.sameSite,
        path: '/',
    });
    res.status(200).json({ message: 'Đăng xuất thành công.' });
};

exports.getSession = async (req, res) => {
    if (req.user) {
        try {
            const user = await prisma.users.findUnique({
                where: { id: req.user.id },
                select: { id: true, username: true, role: true, permissions: true },
            });
            if (user) return res.json({ user, userType: 'admin' });
        } catch (e) {
            console.error(e);
            return res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    } else if (req.resident) {
        try {
            const resident = await prisma.residents.findUnique({
                where: { id: req.resident.id },
                include: {
                    occupancies: {
                        include: {
                            apartments: {
                                select: { id: true, code: true },
                            },
                        },
                    },
                },
            });

            if (resident) {
                // Extract apartments from occupancies via Prisma relation
                const apartments = resident.occupancies
                    .map((o) => o.apartments)
                    .sort((a, b) => a.code.localeCompare(b.code));

                return res.json({
                    user: {
                        resident: {
                            id: resident.id,
                            name: resident.name,
                            canUseAmenities: resident.can_use_amenities,
                        },
                        apartments: apartments,
                    },
                    userType: 'resident',
                });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    }
    res.status(404).json({ message: 'Tài khoản không tồn tại.' });
};

exports.residentLogin = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const resident = await prisma.residents.findFirst({
            where: { phone_number: phoneNumber?.trim() },
        });

        if (!resident || !resident.is_active) {
            return res.status(401).json({ message: 'Tài khoản không đúng hoặc bị khóa.' });
        }

        const account = await prisma.resident_accounts.findUnique({
            where: { resident_id: resident.id },
        });

        if (!account || !(await bcrypt.compare(password, account.password_hash))) {
            return res.status(401).json({ message: 'Sai mật khẩu.' });
        }

        // Fetch apartments via occupancies
        const occupancies = await prisma.occupancies.findMany({
            where: { resident_id: resident.id },
            include: {
                apartments: { select: { id: true, code: true } },
            },
        });

        if (occupancies.length === 0) {
            return res.status(403).json({ message: 'Bạn chưa thuộc căn hộ nào.' });
        }

        const apartments = occupancies
            .map((o) => o.apartments)
            .sort((a, b) => a.code.localeCompare(b.code));

        const token = jwt.sign(
            { id: resident.id, name: resident.name, type: 'resident' },
            JWT_RESIDENT_SECRET,
            { expiresIn: '7d' }
        );
        res.cookie(TOKEN_COOKIE_NAME, token, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        logAudit({
            req,
            userId: resident.id,
            username: resident.phone_number,
            action: 'RESIDENT_LOGIN',
            targetType: 'Resident',
            targetId: resident.id,
            targetName: resident.name,
            details: `Cư dân đăng nhập cổng portal (Căn hộ: ${apartments.map((a) => a.code).join(', ')})`,
            statusCode: 200,
        });

        res.json({
            resident: {
                id: resident.id,
                name: resident.name,
                canUseAmenities: resident.can_use_amenities,
            },
            apartments: apartments,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.changeResidentPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (req.resident?.id !== req.params.residentId)
            return res.status(403).json({ message: 'Quyền truy cập bị từ chối.' });

        const account = await prisma.resident_accounts.findUnique({
            where: { resident_id: req.params.residentId },
        });

        if (!account)
            return res.status(404).json({ message: 'Không tìm thấy tài khoản cư dân.' });

        const isMatch = await bcrypt.compare(currentPassword, account.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });

        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await prisma.resident_accounts.update({
            where: { resident_id: req.params.residentId },
            data: { password_hash: hash },
        });

        logAudit({
            req,
            action: 'CHANGE_PASSWORD',
            targetType: 'ResidentAccount',
            targetId: req.params.residentId,
            details: 'Cư dân đổi mật khẩu tài khoản cổng portal',
            statusCode: 200,
        });

        res.json({ message: 'Đổi mật khẩu thành công.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

exports.changeUserPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma.users.findUnique({ where: { id: req.user.id } });

        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });

        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await prisma.users.update({
            where: { id: req.user.id },
            data: { password_hash: hash },
        });

        logAudit({
            req,
            action: 'CHANGE_PASSWORD',
            targetType: 'User',
            targetId: req.user.id,
            targetName: req.user.username,
            details: 'Nhân viên đổi mật khẩu đăng nhập',
            statusCode: 200,
        });

        res.json({ message: 'Đổi mật khẩu thành công.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

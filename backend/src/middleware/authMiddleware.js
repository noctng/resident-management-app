const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { JWT_ADMIN_SECRET, JWT_RESIDENT_SECRET, TOKEN_COOKIE_NAME } = require('../config/auth');

const authenticateToken = (req, res, next) => {
    let token = req.cookies ? req.cookies[TOKEN_COOKIE_NAME] : null;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_ADMIN_SECRET, async (err, user) => {
        if (!err && user.type === 'admin') {
            // Fetch latest role and permissions from DB
            try {
                const dbUser = await prisma.users.findUnique({
                    where: { id: user.id },
                    select: { id: true, username: true, role: true, permissions: true },
                });

                if (dbUser) {
                    req.user = { ...user, ...dbUser }; // Use fresh data from DB
                    return next();
                }
            } catch (e) {
                console.error('[Auth] Error querying user details:', e);
            }

            // Fallback to token data if DB fails or user not found (though unusual)
            req.user = user;
            return next();
        }

        jwt.verify(token, JWT_RESIDENT_SECRET, (err, resident) => {
            if (!err && resident.type === 'resident') {
                req.resident = resident;
                return next();
            }
            return res.status(403).json({ message: 'Token không hợp lệ.' });
        });
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 0) return next();
    return res.status(403).json({ message: 'Quyền truy cập bị từ chối.' });
};

const checkPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            console.log(`[Auth] No user found in request for permission:`, permissions);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Admin has access to everything
        if (req.user.role === 0) return next();

        // Staff checks permission list
        if (req.user.role === 1 && Array.isArray(req.user.permissions)) {
            const required = Array.isArray(permissions) ? permissions : [permissions];
            const hasPermission = required.some((p) => req.user.permissions.includes(p));
            if (hasPermission) return next();
        }

        console.log(
            `[Auth] Access Denied. Required '${permissions}', but user has:`,
            req.user.permissions
        );
        return res.status(403).json({ message: 'Quyền truy cập bị từ chối.' });
    };
};

const isManagerOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 0 || req.user.role === 1)) return next();
    return res.status(403).json({ message: 'Quyền truy cập bị từ chối.' });
};

module.exports = {
    authenticateToken,
    isAdmin,
    checkPermission,
    isManagerOrAdmin,
};

const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { JWT_ADMIN_SECRET, JWT_RESIDENT_SECRET, TOKEN_COOKIE_NAME } = require('../config/auth');

// Cache effective permissions (module:action) của user trong request
const loadEffectivePerms = async (req) => {
  if (req.user.effectivePerms) return req.user.effectivePerms;
  // Legacy full-access: admin (role 0) hoặc manager (role 1) có mọi quyền
  if (req.user.role === 0 || req.user.role === 1) {
    req.user.effectivePerms = 'ALL';
    return 'ALL';
  }
  const rows = await prisma.user_roles.findMany({
    where: { user_id: req.user.id },
    select: { role_code: true },
  });
  const roleCodes = rows.map((r) => r.role_code);
  if (roleCodes.includes('ADMIN') || roleCodes.includes('MANAGER')) {
    req.user.effectivePerms = 'ALL';
    return 'ALL';
  }
  const perms = await prisma.role_permissions.findMany({
    where: { role_code: { in: roleCodes } },
    select: { module: true, action: true },
  });
  req.user.effectivePerms = new Set(perms.map((p) => `${p.module}:${p.action}`));
  req.user.roles = roleCodes;
  return req.user.effectivePerms;
};

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
                    // RBAC: nếu user có vai trò (role != 0/1) và permissions cũ rỗng,
                    // populate permissions từ roles (union các module có quyền R) để
                    // tương thích với checkPermission cũ.
                    if (dbUser.role !== 0 && dbUser.role !== 1) {
                        try {
                            const rows = await prisma.user_roles.findMany({
                                where: { user_id: dbUser.id },
                                select: { role_code: true },
                            });
                            const roleCodes = rows.map((r) => r.role_code);
                            if (roleCodes.length > 0) {
                                const perms = await prisma.role_permissions.findMany({
                                    where: { role_code: { in: roleCodes }, action: 'R' },
                                    select: { module: true },
                                });
                                const modules = Array.from(new Set(perms.map((p) => p.module)));
                                const legacy = Array.isArray(dbUser.permissions) ? dbUser.permissions : [];
                                req.user.permissions = Array.from(new Set([...legacy, ...modules]));
                            }
                        } catch (e2) {
                            console.error('[Auth] RBAC permission sync error:', e2);
                        }
                    }
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

// Yêu cầu quyền theo module + action (CRUDA). Full-access: role 0/1 hoặc role ADMIN/MANAGER
const requireAction = (module, action) => {
    return async (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
        try {
            const perms = await loadEffectivePerms(req);
            if (perms === 'ALL') return next();
            if (perms.has(`${module}:${action}`)) return next();
            return res.status(403).json({ message: 'Quyền truy cập bị từ chối.' });
        } catch (e) {
            console.error('[Auth] requireAction error:', e);
            return res.status(500).json({ message: 'Lỗi kiểm tra quyền.' });
        }
    };
};

// Yêu cầu user sở hữu ít nhất một vai trò (theo mã blueprint)
const requireAnyRole = (...codes) => {
    return async (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
        try {
            const perms = await loadEffectivePerms(req);
            if (perms === 'ALL') return next(); // admin/manager luôn qua
            const roles = req.user.roles || [];
            if (codes.some((c) => roles.includes(c))) return next();
            return res.status(403).json({ message: 'Quyền truy cập bị từ chối.' });
        } catch (e) {
            console.error('[Auth] requireAnyRole error:', e);
            return res.status(500).json({ message: 'Lỗi kiểm tra vai trò.' });
        }
    };
};

const checkPermission = (permissions) => {
    return async (req, res, next) => {
        if (!req.user) {
            console.log(`[Auth] No user found in request for permission:`, permissions);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Admin (role 0) và Manager cũ (role 1) có toàn quyền
        if (req.user.role === 0 || req.user.role === 1) return next();

        const required = Array.isArray(permissions) ? permissions : [permissions];

        // Legacy: permissions array (từ DB users.permissions)
        if (Array.isArray(req.user.permissions) && required.some((p) => req.user.permissions.includes(p))) {
            return next();
        }

        // RBAC: nếu user có vai trò -> có quyền R trên các module của vai trò đó
        try {
            let roleCodes = req.user.roles;
            if (!Array.isArray(roleCodes) || roleCodes.length === 0) {
                const rows = await prisma.user_roles.findMany({
                    where: { user_id: req.user.id },
                    select: { role_code: true },
                });
                roleCodes = rows.map((r) => r.role_code);
                req.user.roles = roleCodes;
            }
            if (Array.isArray(roleCodes) && roleCodes.length > 0) {
                const perms = await prisma.role_permissions.findMany({
                    where: { role_code: { in: roleCodes } },
                    select: { module: true },
                });
                const modules = new Set(perms.map((p) => p.module));
                if (required.some((p) => modules.has(p))) return next();
            }
        } catch (e) {
            console.error('[Auth] checkPermission RBAC error:', e);
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

const buildEffectivePerms = async (user) => {
  // Trả về 'ALL' hoặc Set<module:action>
  if (!user) return new Set();
  if (user.role === 0 || user.role === 1) return 'ALL';
  const rows = await prisma.user_roles.findMany({
    where: { user_id: user.id },
    select: { role_code: true },
  });
  const roleCodes = rows.map((r) => r.role_code);
  if (roleCodes.includes('ADMIN') || roleCodes.includes('MANAGER')) return 'ALL';
  const perms = await prisma.role_permissions.findMany({
    where: { role_code: { in: roleCodes } },
    select: { module: true, action: true },
  });
  return new Set(perms.map((p) => `${p.module}:${p.action}`));
};

module.exports = {
    authenticateToken,
    isAdmin,
    requireAction,
    requireAnyRole,
    checkPermission,
    isManagerOrAdmin,
    buildEffectivePerms,
};

/**
 * rbacAuto.js — Centralized RBAC enforcement (GĐ2 mở rộng)
 *
 * Tự động suy ra (module, action) từ mount-path + HTTP method, enforce qua
 * requireAction. Mount 1 lần trong server.js SAU authenticateToken.
 *
 * Quy tắc:
 *  - Bypass: role 0/1 (admin/manager cũ), ADMIN/MANAGER role, resident token.
 *  - Nếu path không map được module → bỏ qua (fail-open) để không khóa nhầm.
 *  - Action: POST=C, GET=R, PUT/PATCH=U, DELETE=D; path chứa approve/reject/sign/
 *    recalculate/close/confirm → A (phê duyệt/chốt kỳ).
 */
const { buildEffectivePerms } = require('./authMiddleware');

// mount-base (prefix) -> Permission module
const MOUNT_MODULE = {
  '/api/apartments': 'apartments',
  '/api/occupancies': 'residents',
  '/api/feedback': 'feedback',
  '/api/activity-logs': 'logs',
  '/api/users': 'users',
  '/api/customers': 'residents',
  '/api/contracts': 'contracts',
  '/api/crm/contracts': 'contracts',
  '/api/crm/sales-contracts': 'contracts',
  '/api/crm/documents': 'contracts',
  '/api/config': 'configuration',
  '/api/dashboard': 'dashboard',
  '/api/reports': 'revenue',
  '/api/fee-config': 'unified_billing',
  '/api/management-fees': 'unified_billing',
  '/api/debt-reminders': 'unified_billing',
  '/api/debt-dashboard': 'unified_billing',
  '/api/unified-billing': 'unified_billing',
  '/api/vnpt-invoice': 'unified_billing',
  '/api/approvals': 'crm_approve',
  '/api/vehicles': 'vehicles',
  '/api/announcements': 'announcements',
  '/api/products': 'apartments',
  '/api/crm/leads': 'crm',
  '/api/crm/bookings': 'crm',
  '/api/crm/deposits': 'deposits',
  '/api/crm/handover': 'handover',
  '/api/crm/pricebooks': 'pricebook',
  '/api/crm/promotions': 'crm',
  '/api/crm/commissions': 'commission',
  '/api/crm/transfers': 'crm',
  '/api/operations/warranty': 'warranty',
  '/api/operations/construction': 'construction',
  '/api/crm/analytics': 'dashboard',
  '/api/project-phases': 'configuration',
  '/api/utility': 'utilities',
  '/api/amenity': 'amenities',
  '/api/resident': 'residents',
};

// mount-prefixes (root) được bỏ qua hoàn toàn (auth, push, webhook, chat-proxy)
const SKIP_PREFIXES = ['/api/auth', '/api/push', '/api/webhooks', '/api/webhook'];

const APPROVE_KEYWORDS = ['/approve', '/reject', '/sign', '/recalculate', '/close', '/confirm', '/release', '/handover-confirm'];

function deriveAction(method, path) {
  const p = (path || '').toLowerCase();
  if (APPROVE_KEYWORDS.some((k) => p.includes(k))) return 'A';
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
      return 'R';
    case 'POST':
      return 'C';
    case 'PUT':
    case 'PATCH':
      return 'U';
    case 'DELETE':
      return 'D';
    default:
      return 'R';
  }
}

function resolveModule(baseUrl, path) {
  const full = (baseUrl || '') + (path || '');
  // skip
  if (SKIP_PREFIXES.some((s) => full.startsWith(s))) return null;
  // exact / longest-prefix match
  let best = null;
  for (const prefix of Object.keys(MOUNT_MODULE)) {
    if (full.startsWith(prefix) && (best === null || prefix.length > best.length)) {
      best = prefix;
    }
  }
  return best ? MOUNT_MODULE[best] : null;
}

const autoRbac = async (req, res, next) => {
  // Bypass: manager cũ / admin / resident
  if (req.user && (req.user.role === 0 || req.user.role === 1)) return next();
  if (req.resident) return next();
  if (req.user && req.user.roles && (req.user.roles.includes('ADMIN') || req.user.roles.includes('MANAGER')))
    return next();

  const module = resolveModule(req.baseUrl, req.path);
  if (!module) return next(); // fail-open: không map được → cho qua

  const action = deriveAction(req.method, req.path);
  try {
    const perms = await buildEffectivePerms(req.user);
    if (perms === 'ALL') return next();
    if (perms.has(`${module}:${action}`)) return next();
    return res.status(403).json({
      error: 'Forbidden',
      message: `Thiếu quyền ${action} trên module '${module}'`,
      module,
      action,
    });
  } catch (e) {
    return next(e);
  }
};

module.exports = { autoRbac, resolveModule, deriveAction, MOUNT_MODULE };

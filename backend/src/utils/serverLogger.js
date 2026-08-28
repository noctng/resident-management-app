const prisma = require('../config/prisma');
const { generateRandomId } = require('./helpers');

/**
 * Server-side audit logger helper
 * @param {Object} params
 * @param {Object} [params.req] - Express request object (extracts user, IP, method, path, user-agent)
 * @param {string} [params.userId] - User ID if not from req
 * @param {string} [params.username] - Username if not from req
 * @param {string} params.action - Action code, e.g. 'CREATE_RESIDENT', 'LOGIN', 'UPDATE_CONTRACT'
 * @param {string} [params.targetType] - Target entity type, e.g. 'Resident', 'SalesContract'
 * @param {string} [params.targetId] - ID of the target entity
 * @param {string} [params.targetName] - Human-readable name or code of target
 * @param {string} [params.details] - Descriptive details
 * @param {Object} [params.oldValue] - Previous state (JSON)
 * @param {Object} [params.newValue] - New state (JSON)
 * @param {number} [params.statusCode] - HTTP status code
 */
const logAudit = async ({
  req,
  userId,
  username,
  action,
  targetType,
  targetId,
  targetName,
  details,
  oldValue,
  newValue,
  statusCode = 200,
}) => {
  try {
    const finalUserId = userId || (req?.user?.id) || (req?.resident?.id) || null;
    const finalUsername = username || (req?.user?.username) || (req?.resident?.phoneNumber) || 'system';
    
    let ipAddress = null;
    let httpMethod = null;
    let httpPath = null;
    let userAgent = null;

    if (req) {
      const forwarded = req.headers['x-forwarded-for'];
      ipAddress = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.socket?.remoteAddress || null);
      if (ipAddress && ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.replace('::ffff:', '');
      }
      httpMethod = req.method || null;
      httpPath = req.originalUrl || req.url || null;
      userAgent = req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 255) : null;
    }

    const id = `log_${generateRandomId()}`;

    await prisma.activity_logs.create({
      data: {
        id,
        user_id: finalUserId,
        username: finalUsername,
        action,
        target_type: targetType || null,
        target_id: targetId ? String(targetId) : null,
        target_name: targetName ? String(targetName) : null,
        details: details || null,
        ip_address: ipAddress,
        http_method: httpMethod,
        http_path: httpPath,
        status_code: statusCode,
        old_value: oldValue || null,
        new_value: newValue || null,
        user_agent: userAgent,
      },
    });
  } catch (err) {
    console.error('[AuditLogger] Failed to write audit log:', err.message);
  }
};

module.exports = { logAudit };

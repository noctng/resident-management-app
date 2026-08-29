const { generateRandomId } = require('../utils/helpers');
const repo = require('../repositories/activityLogRepository');

const buildWhereClause = (query) => {
  const { startDate, endDate, userId, action, targetType, search } = query;
  const whereClause = {};

  if (startDate || endDate) {
    whereClause.created_at = {};
    if (startDate) whereClause.created_at.gte = new Date(startDate);
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      whereClause.created_at.lt = endDateTime;
    }
  }

  if (userId && userId !== 'ALL') whereClause.user_id = userId;
  if (action && action !== 'ALL') whereClause.action = action;
  if (targetType && targetType !== 'ALL') whereClause.target_type = targetType;

  if (search && search.trim()) {
    const term = search.trim();
    whereClause.OR = [
      { username: { contains: term, mode: 'insensitive' } },
      { details: { contains: term, mode: 'insensitive' } },
      { target_name: { contains: term, mode: 'insensitive' } },
      { target_id: { contains: term, mode: 'insensitive' } },
      { ip_address: { contains: term, mode: 'insensitive' } },
      { action: { contains: term, mode: 'insensitive' } },
    ];
  }

  return whereClause;
};

const mapLog = (r) => ({
  id: r.id,
  userId: r.user_id,
  username: r.username,
  action: r.action,
  targetType: r.target_type,
  targetId: r.target_id,
  targetName: r.target_name,
  details: r.details,
  ipAddress: r.ip_address,
  httpMethod: r.http_method,
  httpPath: r.http_path,
  statusCode: r.status_code,
  oldValue: r.old_value,
  newValue: r.new_value,
  userAgent: r.user_agent,
  timestamp: r.created_at,
});

const getAllLogs = async (query) => {
  const { limit = 30, offset = 0 } = query;
  const whereClause = buildWhereClause(query);

  const totalCount = await repo.countLogs(whereClause);
  const logs = await repo.findLogs(whereClause, limit, offset);

  const hasMore = parseInt(offset) + logs.length < totalCount;

  return {
    logs: logs.map(mapLog),
    totalCount,
    hasMore,
    offset: parseInt(offset),
    limit: parseInt(limit),
  };
};

const getLogFilters = async () => {
  const [users, actions, targetTypes] = await Promise.all([
    repo.findUsers(),
    repo.findActions(),
    repo.findTargetTypes(),
  ]);

  return {
    users,
    actions: actions.map((a) => a.action).filter(Boolean),
    targetTypes: targetTypes.map((t) => t.target_type).filter(Boolean),
  };
};

const extractIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  let ipAddress = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.socket?.remoteAddress || null);
  if (ipAddress && ipAddress.startsWith('::ffff:')) {
    ipAddress = ipAddress.replace('::ffff:', '');
  }
  return ipAddress;
};

const createLog = async (req) => {
  const { action, targetType, targetId, targetName, details } = req.body;
  const id = `log_${generateRandomId()}`;
  const userId = req.user?.id || req.resident?.id || null;
  const username = req.user?.username || req.resident?.phoneNumber || 'system';

  await repo.createLog({
    id,
    user_id: userId,
    username,
    action,
    target_type: targetType,
    target_id: targetId || null,
    target_name: targetName || null,
    details,
    ip_address: extractIp(req),
    http_method: req.method,
    http_path: req.originalUrl || req.url,
    status_code: 201,
    user_agent: req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 255) : null,
  });

  return { message: 'Log saved' };
};

module.exports = { getAllLogs, getLogFilters, createLog };

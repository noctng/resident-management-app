const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');

/**
 * Get all activity logs with rich filtering and pagination
 * Query params:
 * - startDate: ISO date string (filter from this date)
 * - endDate: ISO date string (filter to this date)
 * - userId: string (filter by specific user ID)
 * - action: string (filter by action code, e.g. CREATE_RESIDENT)
 * - targetType: string (filter by entity type, e.g. Resident)
 * - search: string (keyword in username, details, targetName, ipAddress)
 * - limit: number of records (default 30)
 * - offset: skip records (default 0)
 */
exports.getAllLogs = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            userId,
            action,
            targetType,
            search,
            limit = 30,
            offset = 0,
        } = req.query;

        // Build where clause
        const whereClause = {};

        // Date filtering
        if (startDate || endDate) {
            whereClause.created_at = {};
            if (startDate) {
                whereClause.created_at.gte = new Date(startDate);
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setDate(endDateTime.getDate() + 1);
                whereClause.created_at.lt = endDateTime;
            }
        }

        // Specific filters
        if (userId && userId !== 'ALL') {
            whereClause.user_id = userId;
        }

        if (action && action !== 'ALL') {
            whereClause.action = action;
        }

        if (targetType && targetType !== 'ALL') {
            whereClause.target_type = targetType;
        }

        // Text search across details, username, target_name, ip_address
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

        // Get total count for pagination
        const totalCount = await prisma.activity_logs.count({
            where: whereClause,
        });

        // Get logs with pagination
        const logs = await prisma.activity_logs.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        // Calculate if there are more records
        const hasMore = parseInt(offset) + logs.length < totalCount;

        res.json({
            logs: logs.map((r) => ({
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
            })),
            totalCount,
            hasMore,
            offset: parseInt(offset),
            limit: parseInt(limit),
        });
    } catch (err) {
        console.error('Error fetching activity logs:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/**
 * Get log filter options (unique actions, target types, and users)
 */
exports.getLogFilters = async (req, res) => {
    try {
        const [users, actions, targetTypes] = await Promise.all([
            prisma.users.findMany({
                select: { id: true, username: true, role: true },
                orderBy: { username: 'asc' },
            }),
            prisma.activity_logs.findMany({
                select: { action: true },
                distinct: ['action'],
                where: { action: { not: null } },
            }),
            prisma.activity_logs.findMany({
                select: { target_type: true },
                distinct: ['target_type'],
                where: { target_type: { not: null } },
            }),
        ]);

        res.json({
            users,
            actions: actions.map((a) => a.action).filter(Boolean),
            targetTypes: targetTypes.map((t) => t.target_type).filter(Boolean),
        });
    } catch (err) {
        console.error('Error fetching log filters:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/**
 * Client-triggered log creation (for frontend actions)
 */
exports.createLog = async (req, res) => {
    try {
        const { action, targetType, targetId, targetName, details } = req.body;
        const id = `log_${generateRandomId()}`;
        const userId = req.user?.id || req.resident?.id || null;
        const username = req.user?.username || req.resident?.phoneNumber || 'system';

        const forwarded = req.headers['x-forwarded-for'];
        let ipAddress = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.socket?.remoteAddress || null);
        if (ipAddress && ipAddress.startsWith('::ffff:')) {
          ipAddress = ipAddress.replace('::ffff:', '');
        }

        await prisma.activity_logs.create({
            data: {
                id,
                user_id: userId,
                username,
                action,
                target_type: targetType,
                target_id: targetId || null,
                target_name: targetName || null,
                details,
                ip_address: ipAddress,
                http_method: req.method,
                http_path: req.originalUrl || req.url,
                status_code: 201,
                user_agent: req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 255) : null,
            },
        });
        res.status(201).json({ message: 'Log saved' });
    } catch (err) {
        console.error('Error saving log:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

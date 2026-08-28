const prisma = require('../config/prisma');
const { generateRandomId } = require('./helpers');

/**
 * Log user activity with optional change tracking
 * 
 * @param {Object} user - User object with id and username
 * @param {string} action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {string} targetType - Type of target (CONTRACT, CUSTOMER, PAYMENT, etc.)
 * @param {string} targetId - ID of the target entity
 * @param {string} targetName - Name/code of the target entity
 * @param {string|Object} detailsOrMessage - Simple message string OR structured object with {message, oldData, newData}
 * @param {Object|null} oldData - (Optional) Old data before change (for UPDATE operations)
 * @param {Object|null} newData - (Optional) New data after change (for UPDATE operations)
 * 
 * @example
 * // Simple logging (backward compatible)
 * logActivity(req.user, 'CREATE', 'CUSTOMER', 'cust_123', 'John Doe', 'Created new customer');
 * 
 * @example
 * // Change tracking logging
 * logActivity(req.user, 'UPDATE', 'CUSTOMER', 'cust_123', 'John Doe', 'Updated customer info', oldCustomer, updatedCustomer);
 * 
 * @example
 * // Structured logging
 * logActivity(req.user, 'CREATE', 'PAYMENT', 'pay_123', 'Payment 1', {
 *   message: 'Payment received',
 *   metadata: { amount: 10000000, contractId: 'cont_456' }
 * });
 */
const logActivity = async (user, action, targetType, targetId, targetName, detailsOrMessage, oldData = null, newData = null) => {
    if (!user) return;

    try {
        let detailsString = '';

        // Handle different input formats
        if (typeof detailsOrMessage === 'string') {
            // Simple string message
            if (oldData || newData) {
                // String message with change tracking
                detailsString = JSON.stringify({
                    message: detailsOrMessage,
                    oldData: oldData ? sanitizeData(oldData) : null,
                    newData: newData ? sanitizeData(newData) : null,
                });
            } else {
                // Plain string (backward compatible)
                detailsString = detailsOrMessage;
            }
        } else if (typeof detailsOrMessage === 'object' && detailsOrMessage !== null) {
            // Structured object
            detailsString = JSON.stringify({
                ...detailsOrMessage,
                oldData: oldData ? sanitizeData(oldData) : (detailsOrMessage.oldData || null),
                newData: newData ? sanitizeData(newData) : (detailsOrMessage.newData || null),
            });
        } else {
            // Fallback
            detailsString = String(detailsOrMessage || '');
        }

        await prisma.activity_logs.create({
            data: {
                id: `log_${generateRandomId()}`,
                user_id: user.id || 'system',
                username: user.username || 'System',
                action: action,
                target_type: targetType,
                target_id: targetId || null,
                target_name: targetName || null,
                details: detailsString,
            },
        });
    } catch (err) {
        console.error('Failed to create activity log:', err);
    }
};

/**
 * Sanitize data before logging to remove sensitive fields and normalize dates
 * 
 * @param {Object} data - Data object to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeData = (data) => {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = ['password_hash', 'password', 'token', 'secret'];
    sensitiveFields.forEach(field => {
        if (field in sanitized) {
            delete sanitized[field];
        }
    });

    // Convert dates to ISO strings for better JSON serialization
    Object.keys(sanitized).forEach(key => {
        if (sanitized[key] instanceof Date) {
            sanitized[key] = sanitized[key].toISOString();
        }
        // Handle nested objects
        if (sanitized[key] && typeof sanitized[key] === 'object' && !Array.isArray(sanitized[key])) {
            sanitized[key] = sanitizeData(sanitized[key]);
        }
    });

    return sanitized;
};

module.exports = { logActivity };

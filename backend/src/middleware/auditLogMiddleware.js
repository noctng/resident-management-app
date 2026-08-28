const { logAudit } = require('../utils/serverLogger');

/**
 * Middleware factory for auto audit logging
 * @param {string} action - Action name (e.g. 'CREATE_RESIDENT', 'UPDATE_CONTRACT')
 * @param {string} targetType - Target type (e.g. 'Resident', 'SalesContract')
 * @param {Function} [extractor] - Optional function (req, resBody) => ({ targetId, targetName, details, oldValue, newValue })
 */
const auditLog = (action, targetType, extractor) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const handleLog = (body) => {
      // Only log if response was successful (2xx) or specific audited errors
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let extracted = {};
        if (typeof extractor === 'function') {
          try {
            extracted = extractor(req, body) || {};
          } catch (e) {
            console.error('[AuditMiddleware] Error in extractor:', e.message);
          }
        } else {
          // Default extraction
          extracted = {
            targetId: req.params?.id || body?.id || null,
            targetName: body?.name || body?.code || body?.title || null,
            details: req.body ? JSON.stringify(req.body).slice(0, 500) : null,
          };
        }

        logAudit({
          req,
          action,
          targetType,
          targetId: extracted.targetId,
          targetName: extracted.targetName,
          details: extracted.details,
          oldValue: extracted.oldValue,
          newValue: extracted.newValue,
          statusCode: res.statusCode,
        });
      }
    };

    res.json = function (body) {
      handleLog(body);
      return originalJson(body);
    };

    res.send = function (body) {
      if (res.statusCode === 204) {
        handleLog(null);
      }
      return originalSend(body);
    };

    next();
  };
};

module.exports = { auditLog };

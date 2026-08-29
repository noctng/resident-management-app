const svc = require('../services/feeConfigService');

function fail(res, err, fallback, logMsg) {
    const status = err.status || 500;
    if (!err.status) console.error(logMsg, err);
    res.status(status).json({ error: err.status ? err.message : fallback });
}

/**
 * Get current fee configuration
 */
exports.getCurrentConfig = async (req, res) => {
    try {
        res.json(await svc.getCurrentConfig());
    } catch (error) {
        fail(res, error, 'Failed to get fee configuration', 'Error getting fee config:');
    }
};

/**
 * Get fee configuration history
 */
exports.getConfigHistory = async (req, res) => {
    try {
        res.json(await svc.getConfigHistory());
    } catch (error) {
        fail(res, error, 'Failed to get configuration history', 'Error getting config history:');
    }
};

/**
 * Create or update fee configuration
 */
exports.updateConfig = async (req, res) => {
    try {
        const created = await svc.updateConfig(req.body, req.user);
        res.status(201).json(created);
    } catch (error) {
        fail(res, error, 'Failed to update fee configuration', 'Error updating fee config:');
    }
};

/**
 * Get fee config effective at a specific date
 */
exports.getConfigAtDate = async (req, res) => {
    try {
        res.json(await svc.getConfigAtDate(req.query.date));
    } catch (error) {
        fail(res, error, 'Failed to get fee configuration', 'Error getting fee config at date:');
    }
};

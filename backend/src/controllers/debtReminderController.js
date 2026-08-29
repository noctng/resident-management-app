/**
 * debtReminderController — MỎNG: parse req → gọi service → res.
 * KHÔNG truy cập DB trực tiếp (truy vấn nằm trong repository).
 */
const svc = require('../services/debtReminderService');

function fail(res, err, fallback, logMsg) {
    const status = err.status || 500;
    if (!err.status) console.error(logMsg, err);
    res.status(status).json({ error: err.status ? err.message : fallback });
}

/**
 * Send debt reminder email for a specific management fee
 */
exports.sendDebtReminder = async (req, res) => {
    try {
        res.json(await svc.sendDebtReminder(req.params.feeId, req.user));
    } catch (error) {
        fail(res, error, 'Failed to send debt reminder email', 'Error sending debt reminder:');
    }
};

/**
 * Send bulk debt reminder emails for all pending/overdue fees
 */
exports.sendBulkDebtReminders = async (req, res) => {
    try {
        res.json(await svc.sendBulkDebtReminders(req.body, req.user));
    } catch (error) {
        fail(res, error, 'Failed to send bulk debt reminders', 'Error sending bulk reminders:');
    }
};

/**
 * Get email sending history
 */
exports.getEmailHistory = async (req, res) => {
    try {
        res.json(await svc.getEmailHistory(req.query));
    } catch (error) {
        fail(res, error, 'Failed to get email history', 'Error getting email history:');
    }
};

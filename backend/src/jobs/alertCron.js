const cron = require('node-cron');
const {
    checkUpcomingPayments,
    checkOverduePayments,
    identifyRiskyContracts,
} = require('../services/alertService');

/**
 * Schedule daily alerts check (runs at 9 AM every day)
 */
function scheduleDailyAlerts() {
    cron.schedule('0 9 * * *', async () => {
        console.log('🔔 Running daily alerts check...');

        try {
            await checkUpcomingPayments();
            await checkOverduePayments();
            await identifyRiskyContracts();

            console.log('✅ Daily alerts check completed');
        } catch (error) {
            console.error('❌ Error in daily alerts:', error);
        }
    });

    console.log('✅ Daily alerts cron job scheduled (9 AM daily)');
}

/**
 * Schedule overdue check (runs every 6 hours)
 */
function scheduleOverdueCheck() {
    cron.schedule('0 */6 * * *', async () => {
        console.log('⏰ Running overdue payments check...');

        try {
            await checkOverduePayments();
            console.log('✅ Overdue check completed');
        } catch (error) {
            console.error('❌ Error in overdue check:', error);
        }
    });

    console.log('✅ Overdue check cron job scheduled (every 6 hours)');
}

module.exports = {
    scheduleDailyAlerts,
    scheduleOverdueCheck,
};

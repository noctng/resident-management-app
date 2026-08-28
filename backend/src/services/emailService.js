const nodemailer = require('nodemailer');
const prisma = require('../config/prisma');

const getTransporter = async () => {
    // 1. Try DB Settings
    let dbSettings = {};
    try {
        const settings = await prisma.system_settings.findMany({
            where: {
                key: {
                    in: [
                        'SMTP_HOST',
                        'SMTP_PORT',
                        'SMTP_USER',
                        'SMTP_PASS',
                        'SMTP_SECURE',
                        'SMTP_FROM',
                    ],
                },
            },
        });
        settings.forEach((s) => (dbSettings[s.key] = s.value));
    } catch (e) {
        // Silently fail if table doesn't exist or other DB error, fallback to env
        // console.warn('Failed to load email settings from DB:', e.message);
    }

    const host = dbSettings.SMTP_HOST || process.env.SMTP_HOST;
    const user = dbSettings.SMTP_USER || process.env.SMTP_USER;
    const pass = dbSettings.SMTP_PASS || process.env.SMTP_PASS;
    const port = dbSettings.SMTP_PORT || process.env.SMTP_PORT || 587;
    const secure = dbSettings.SMTP_SECURE
        ? dbSettings.SMTP_SECURE === 'true'
        : process.env.SMTP_SECURE === 'true';

    if (host && user) {
        return nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass,
            },
        });
    }
    return null;
};

const sendEmail = async (to, subject, htmlContent) => {
    const transporter = await getTransporter();
    const from =
        (await prisma.system_settings.findUnique({ where: { key: 'SMTP_FROM' } }))?.value ||
        process.env.SMTP_FROM ||
        '"Thanh Pho Ca Phe" <no-reply@thanhphocaphe.vn>';

    if (transporter) {
        try {
            const info = await transporter.sendMail({
                from,
                to,
                subject,
                html: htmlContent,
            });
            console.log(`[Email] Sent to ${to}. MessageId: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('[Email] Failed to send email:', error);
            throw error;
        }
    } else {
        // Mock Mode
        console.log('================ [MOCK EMAIL] ================');
        console.log(`To: ${to}`);
        console.log(`From: ${from}`);
        console.log(`Subject: ${subject}`);
        console.log('Content:');
        console.log(htmlContent);
        console.log('==============================================');
        return { success: true, mock: true };
    }
};

module.exports = { sendEmail };

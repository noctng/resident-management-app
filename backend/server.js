require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const path = require('path');
const compression = require('compression');

// --- Routes ---
const authRoutes = require('./src/routes/authRoutes');
const apartmentRoutes = require('./src/routes/apartmentRoutes');
const residentRoutes = require('./src/routes/residentRoutes');
const residentPortalRoutes = require('./src/routes/residentPortalRoutes');
const occupancyRoutes = require('./src/routes/occupancyRoutes');
const utilityRoutes = require('./src/routes/utilityRoutes');
const amenityRoutes = require('./src/routes/amenityRoutes');
const feedbackRoutes = require('./src/routes/feedbackRoutes');
const activityLogRoutes = require('./src/routes/activityLogRoutes');
const userRoutes = require('./src/routes/userRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const contractRoutes = require('./src/routes/contractRoutes');
const earlyPaymentRoutes = require('./src/routes/earlyPaymentRoutes');
const configRoutes = require('./src/routes/configRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const feeConfigRoutes = require('./src/routes/feeConfigRoutes');
const managementFeeRoutes = require('./src/routes/managementFeeRoutes');
const debtReminderRoutes = require('./src/routes/debtReminderRoutes');
const debtDashboardRoutes = require('./src/routes/debtDashboardRoutes');
const unifiedBillingRoutes = require('./src/routes/unifiedBillingRoutes');
const contractLifecycleRoutes = require('./src/routes/contractLifecycleRoutes');
const approvalRoutes = require('./src/routes/approvalRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes');
const pushRoutes = require('./src/routes/pushRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const vnptInvoiceRoutes = require('./src/routes/vnptInvoiceRoutes');
const announcementRoutes = require('./src/routes/announcementRoutes');
const productInventoryRoutes = require('./src/routes/productInventoryRoutes');
const crmLeadRoutes = require('./src/routes/crmLeadRoutes');
const salesBookingRoutes = require('./src/routes/salesBookingRoutes');
const depositReceiptRoutes = require('./src/routes/depositReceiptRoutes');
const salesContractRoutes = require('./src/routes/salesContractRoutes');
const handoverBridgeRoutes = require('./src/routes/handoverBridgeRoutes');
const pricebookRoutes = require('./src/routes/pricebookRoutes');
const promotionRoutes = require('./src/routes/promotionRoutes');
const commissionRoutes = require('./src/routes/commissionRoutes');
const propertyTransferRoutes = require('./src/routes/propertyTransferRoutes');
const contractDocumentRoutes = require('./src/routes/contractDocumentRoutes');
const warrantyRoutes = require('./src/routes/warrantyRoutes');
const constructionRoutes = require('./src/routes/constructionRoutes');
const executiveAnalyticsRoutes = require('./src/routes/executiveAnalyticsRoutes');
const phaseRoutes = require('./src/routes/phaseRoutes');
const { getPricingConfig } = require('./src/utils/pricing');

// --- Middleware ---
const { authenticateToken } = require('./src/middleware/authMiddleware');
const { securityHeaders, authLimiter, apiLimiter } = require('./src/middleware/securityMiddleware');
const { redisPing, isAllowed } = require('./src/middleware/redisRateLimiter');

const app = express();
const port = process.env.PORT || 3002;

app.set('trust proxy', 1);

// Apply Compression to JSON payload
app.use(compression());

// Apply Security Headers (Helmet)
app.use(securityHeaders);

// Redis-backed sliding window rate limiter (Chapter 4: Rate Limiter)
// - Sliding window log over Redis sorted set
// - Gracefully falls back to in-memory express-rate-limit if Redis is unavailable
async function rateLimitByRoute(req, res, next, route, windowMs, max) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const result = await isAllowed({ ip, route, windowMs, max });

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfterMs ? String(Math.ceil(result.retryAfterMs / 1000)) : '60');
    return res.status(429).json({ message: 'Too many requests, please try again later.' });
  }

  next();
}

app.use('/api/auth/login', async (req, res, next) => {
  await rateLimitByRoute(req, res, next, 'auth-login', 15 * 60 * 1000, 20);
});

app.use('/api', async (req, res, next) => {
  await rateLimitByRoute(req, res, next, 'api-default', 1 * 60 * 1000, 200);
});

// If Redis is unavailable, old in-memory limiters are not used here to avoid double-limiting.
// The async Redis limiter already falls back internally when Redis is unreachable.

// CORS configuration
const corsEnv = process.env.CORS_ALLOWED_ORIGINS || '*';
const allowedOrigins = corsEnv === '*'
    ? '*'
    : corsEnv
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow server-to-server, mobile native requests, or requests without Origin header
            if (!origin) return callback(null, true);

            // Allow all if configured with wildcard *
            if (allowedOrigins === '*' || (Array.isArray(allowedOrigins) && allowedOrigins.includes('*'))) {
                return callback(null, true);
            }

            const normalizedOrigin = origin.replace(/\/$/, '');
            const isAllowed =
                (Array.isArray(allowedOrigins) && allowedOrigins.some((o) => o === normalizedOrigin)) ||
                normalizedOrigin.includes('localhost') ||
                normalizedOrigin.includes('127.0.0.1');

            if (isAllowed) return callback(null, true);
            console.error('❌ Blocked by CORS:', origin);
            return callback(
                new Error(
                    'The CORS policy for this site does not allow access from the specified Origin.'
                ),
                false
            );
        },
        credentials: true,
    })
);


app.use(cookieParser());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Static files (Feedback pictures)
const feedbackPictureDir = '/home/dell/workspace/resident-management-app/backend/nginx-1.28.0/html/dist/picture_feedback';
if (!fs.existsSync(feedbackPictureDir)) {
    fs.mkdirSync(feedbackPictureDir, { recursive: true });
}
app.use('/picture_feedback', express.static(feedbackPictureDir, { maxAge: '1y' }));

const crmDocDir = '/home/dell/workspace/resident-management-app/backend/nginx-1.28.0/html/dist/crm_docs';
if (!fs.existsSync(crmDocDir)) {
    fs.mkdirSync(crmDocDir, { recursive: true });
}
app.use('/crm_docs', express.static(crmDocDir, { maxAge: '1y' }));
const localCrmDocDir = path.join(__dirname, 'uploads/crm_docs');
if (!fs.existsSync(localCrmDocDir)) {
    fs.mkdirSync(localCrmDocDir, { recursive: true });
}
app.use('/crm_docs', express.static(localCrmDocDir, { maxAge: '1y' }));

const utilityDir = '/home/dell/workspace/resident-management-app/backend/nginx-1.28.0/html/dist/utility';
if (!fs.existsSync(utilityDir)) {
    fs.mkdirSync(utilityDir, { recursive: true });
}
app.use('/utility', express.static(utilityDir, { maxAge: '1y' }));

// --- API Routes ---
// RBAC GĐ2 (mở rộng): centralized auto-enforcement — chạy SAU authenticateToken
const { autoRbac } = require('./src/middleware/rbacAuto');
app.use('/api', authenticateToken, autoRbac);
app.use('/api', authRoutes);
app.use('/api/resident-portal', residentPortalRoutes);
app.use('/api', utilityRoutes);
app.use('/api', amenityRoutes);

app.use('/api/apartments', apartmentRoutes);
app.use('/api/occupancies', occupancyRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/contracts', earlyPaymentRoutes); // Early payment routes (nested under contracts)
app.use('/api/config', configRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/fee-config', feeConfigRoutes);
app.use('/api/management-fees', managementFeeRoutes);
app.use('/api/debt-reminders', debtReminderRoutes);
app.use('/api/debt-dashboard', debtDashboardRoutes);
app.use('/api/unified-billing', unifiedBillingRoutes);
app.use('/api/contracts', contractLifecycleRoutes); // Lifecycle & Handover routes
app.use('/api/approvals', approvalRoutes); // Approval workflows
app.use('/api/vehicles', vehicleRoutes); // Vehicle management
app.use('/api', residentRoutes); // Residents CRUD + Resident Accounts (Tài khoản cư dân)
app.use('/api/push', pushRoutes); // Push notifications
app.use('/api/webhooks', webhookRoutes); // Webhooks (SePay, etc.)
app.use('/api/webhook', webhookRoutes); // Webhooks singular alias
app.use('/api/vnpt-invoice', vnptInvoiceRoutes); // VNPT E-Invoice
app.use('/api/announcements', announcementRoutes); // News Announcements
app.use('/api/products', productInventoryRoutes); // Real Estate Inventory & Sales Matrix (TESLA, CANTATA, NOXH)
app.use('/api/crm/leads', crmLeadRoutes); // CRM 3-Tier Leads & Pipeline
app.use('/api/crm/bookings', salesBookingRoutes); // Cart & Atomic Bookings
app.use('/api/crm/deposits', depositReceiptRoutes); // Deposit Receipts (PDC) & Accounting confirmations
app.use('/api/crm/contracts', contractRoutes); // Real Estate Contracts list & CRUD
app.use('/api/crm/contracts', earlyPaymentRoutes); // Early payment routes (nested under contracts)
app.use('/api/crm/contracts', contractLifecycleRoutes); // Contract Lifecycle routes
app.use('/api/crm/sales-contracts', salesContractRoutes); // Standard 18 Articles HĐMB & 10 Installments
app.use('/api/crm/handover', handoverBridgeRoutes); // Handover, Snag List & Operations Bridge
app.use('/api/crm/pricebooks', pricebookRoutes); // Pricebook Versions & Unit Pricing (B.9.1)
app.use('/api/crm/promotions', promotionRoutes); // Promotional Campaigns & Discounts (B.9.2)
app.use('/api/crm/commissions', commissionRoutes); // Commissions & Broker Payouts (B.9.3)
app.use('/api/crm/transfers', propertyTransferRoutes); // Property Transfer Management (B.7)
app.use('/api/crm/documents', contractDocumentRoutes); // Hard-copy Scanned PDF Documents (B.5/B.7)
app.use('/api/operations/warranty', warrantyRoutes); // Warranty Management & Contractor SLA (B.8.4/C.8)
app.use('/api/operations/construction', constructionRoutes); // Construction Registration & 100M Deposit (C.9)
app.use('/api/crm/analytics', executiveAnalyticsRoutes); // Executive KPI & Analytics Hub (B.10/C.14/E.3/E.4)
app.use('/api/project-phases', phaseRoutes); // Project Phases & Subdivisions Management


// ==========================================================
// STATIC UPLOAD ROUTES (Persistent Storage)
// ==========================================================
const uploadsBase = path.join(__dirname, 'uploads');
const feedbackDir = path.join(uploadsBase, 'picture_feedback');
const utilityUploadDir = path.join(uploadsBase, 'utility');
const newsUploadDir = path.join(uploadsBase, 'news/images');
const documentsUploadDir = path.join(uploadsBase, 'documents');
const crmDocsDir = path.join(uploadsBase, 'crm_docs');

[uploadsBase, feedbackDir, utilityUploadDir, newsUploadDir, documentsUploadDir, crmDocsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

app.use('/picture_feedback', express.static(feedbackDir, { maxAge: '30d' }));
app.use('/utility', express.static(utilityUploadDir, { maxAge: '30d' }));
app.use('/news/images', express.static(newsUploadDir, { maxAge: '30d' }));
app.use('/documents', express.static(documentsUploadDir, { maxAge: '1d' }));
app.use('/crm_docs', express.static(crmDocsDir, { maxAge: '7d' }));
app.use('/uploads', express.static(uploadsBase, { maxAge: '7d' }));

// --- Health & Metrics (Chapter 20) ---
const { getHealth, getMetrics } = require('./src/middleware/healthMetrics');

app.get('/health', async (req, res) => {
  try {
    const data = await getHealth();
    res.status(data.status === 'ok' ? 200 : 503).json(data);
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message, timestamp: new Date().toISOString() });
  }
});

app.get('/metrics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const data = await getMetrics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy metrics', error: err.message });
  }
});

// --- Chat Proxy Route ---
app.post('/api/chat-proxy', authenticateToken, async (req, res) => {
    try {
        const pricing = getPricingConfig();
        const webhookUrl = process.env.N8N_WEBHOOK_URL || pricing?.n8nWebhookUrl || '';

        // If no webhook configured or domain is stale
        if (!webhookUrl || webhookUrl.trim() === '' || webhookUrl.includes('ai.n8ntng.xyz')) {
            return res.json([
                {
                    output: 'Xin chào! Trợ lý AI đang được cập nhật kết nối. Quý cư dân có thể gửi yêu cầu hỗ trợ qua mục "Gửi Phản Ánh" hoặc liên hệ Hotline Ban Quản Lý để được hỗ trợ kịp thời.',
                },
            ]);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.json([
                {
                    output: 'Hệ thống trợ lý ảo tạm thời không phản hồi. Quý cư dân vui lòng thử lại sau hoặc liên hệ Hotline Ban Quản Lý.',
                },
            ]);
        }

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        // Return friendly message without crashing
        res.json([
            {
                output: 'Hệ thống trợ lý AI đang gián đoạn kết nối máy chủ. Quý cư dân vui lòng gửi phản ánh qua ứng dụng hoặc liên hệ hotline BQL.',
            },
        ]);
    }
});

// --- Jobs ---
const { scheduleDebtReminders, scheduleStatusUpdate } = require('./src/jobs/debtReminderCron');
const { scheduleDailyAlerts, scheduleOverdueCheck } = require('./src/jobs/alertCron');
const { scheduleAmenityReminders } = require('./src/jobs/amenityReminderCron');
const { startWorker } = require('./src/queues/notificationWorker');

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Backend server is running on http://localhost:${port}`);

        // Start background notification worker (Chapter 10: Notification System)
        const worker = startWorker();
        process.on('SIGTERM', () => worker.stop());
        process.on('SIGINT', () => worker.stop());

        // Start cron jobs
        scheduleDebtReminders();
        scheduleStatusUpdate();
        scheduleDailyAlerts();
        scheduleOverdueCheck();
        scheduleAmenityReminders();
    });
}

module.exports = app;

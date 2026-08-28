# Tài Liệu Backend - Resident Management App

> **Phiên bản:** 1.0  
> **Ngày tạo:** 28/01/2026  
> **Tech Stack:** Node.js + Express + PostgreSQL + Prisma ORM

---

## 📋 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Cấu Trúc Thư Mục](#cấu-trúc-thư-mục)
- [Files Gốc](#files-gốc)
- [Controllers](#controllers)
- [Routes](#routes)
- [Services](#services)
- [Middleware](#middleware)
- [Database](#database)
- [Utilities](#utilities)
- [Jobs & Cron](#jobs--cron)

---

## 🎯 Tổng Quan

Backend API RESTful cho hệ thống quản lý cư dân chung cư, hỗ trợ:

- **Quản lý căn hộ & cư dân**
- **Quản lý tiện ích (điện, nước, phí quản lý)**
- **Quản lý tiện ích chung cư (gym, sauna, v.v.)**
- **Module CRM** (khách hàng, hợp đồng, thanh toán)
- **Phản hồi & nhật ký hoạt động**
- **Email tự động & cron jobs**

---

## 📁 Cấu Trúc Thư Mục

```
backend/
├── server.js              # Entry point
├── package.json           # Dependencies
├── .env                   # Environment variables
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.js           # Seed data
├── migrations/           # SQL migrations (8 files)
├── scripts/              # Utility scripts (11 files)
├── src/
│   ├── config/           # Configuration (2 files)
│   ├── controllers/      # Business logic (24 files)
│   ├── routes/           # API routes (21 files)
│   ├── services/         # External services (7 files)
│   ├── middleware/       # Middleware (3 files)
│   ├── utils/            # Utilities (4 files)
│   ├── schemas/          # Validation schemas (4 files)
│   ├── templates/        # Email templates (3 files)
│   └── jobs/             # Cron jobs (2 files)
└── public/               # Static files
```

**Tổng số files:** 70+ files trong `src/`

---

## 📄 Files Gốc

### `server.js`

**Entry point** của ứng dụng

**Chức năng:**

- Khởi tạo Express app
- Cấu hình CORS, cookie-parser, body-parser
- Mount tất cả routes (`/api/*`)
- Serve static files (feedback images, CRM docs, utility files)
- Khởi động cron jobs
- Chat proxy cho n8n integration

**Port:** 3002 (mặc định)

**Static Directories:**

- `/picture_feedback` → `D:/nginx/nginx-1.28.0/html/dist/picture_feedback`
- `/crm_docs` → `D:/nginx/nginx-1.28.0/html/dist/crm_docs`
- `/utility` → `D:/nginx/nginx-1.28.0/html/dist/utility`

---

### `package.json`

**Dependencies chính:**

- `express` - Web framework
- `@prisma/client` - ORM
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `nodemailer` - Email sending
- `puppeteer` - PDF generation
- `node-cron` - Scheduled jobs
- `zod` - Validation
- `archiver` - ZIP creation
- `exceljs` - Excel export

**Scripts:**

- `npm start` - Production
- `npm run dev` - Development (nodemon)

---

## 🎮 Controllers (24 files)

### Core Controllers

#### `authController.js`

- `login()` - Admin/resident login
- `logout()` - Clear session
- `getCurrentUser()` - Get logged-in user info
- `changePassword()` - Change password

#### `apartmentController.js`

- `getApartments()` - List all apartments
- `createApartment()` - Add new apartment
- `updateApartment()` - Update apartment info
- `deleteApartment()` - Delete apartment

#### `residentController.js`

- `getResidents()` - List residents
- `createResident()` - Add resident
- `updateResident()` - Update resident
- `deleteResident()` - Delete resident
- `getResidentsByApartment()` - Get residents of apartment
- `createResidentAccount()` - Create login account for resident

#### `occupancyController.js`

- `assignResident()` - Assign resident to apartment
- `removeResident()` - Remove resident from apartment

---

### Utility & Billing Controllers

#### `utilityController.js`

- `getUtilityRecords()` - Get utility records by month/year
- `createUtilityRecord()` - Add utility record
- `updateUtilityRecord()` - Update record
- `deleteUtilityRecord()` - Delete record
- `markAsPaid()` - Mark payment as paid
- `sendEmailReminder()` - Send payment reminder
- `generateQRCode()` - Generate VietQR payment code
- `bulkGenerateQR()` - Generate QR for all apartments
- `getUtilityHistory()` - Get history for apartment

#### `managementFeeController.js`

- `getManagementFees()` - List management fees
- `createManagementFee()` - Create fee record
- `bulkGenerateMonthlyFees()` - Auto-generate for all apartments
- `updateManagementFee()` - Update fee
- `deleteManagementFee()` - Delete fee
- `getFeeSummary()` - Get summary statistics

#### `unifiedBillingController.js`

- `getUnifiedBilling()` - Combined utility + management fees
- `getUnifiedBillingHistory()` - Historical data
- `getInvoiceDetail()` - Detailed invoice
- `sendCombinedEmail()` - Send combined bill email
- `exportMonthlyInvoices()` - Export to Excel

#### `feeConfigController.js`

- `getCurrentConfig()` - Get current fee configuration
- `updateConfig()` - Update fee rates
- `getConfigHistory()` - Get change history

---

### Amenity & Feedback Controllers

#### `amenityController.js`

- `getAmenityUsage()` - Get bookings by date
- `bookAmenity()` - Create booking
- `cancelBooking()` - Cancel booking
- `checkInWithQR()` - Check-in via QR code
- `getAmenityStats()` - Usage statistics

#### `feedbackController.js`

- `getFeedback()` - List all feedback
- `submitFeedback()` - Submit new feedback (with images)
- `respondToFeedback()` - Admin response
- `markAsResolved()` - Mark as resolved
- `getFeedbackStats()` - Statistics

---

### CRM Controllers

#### `customerController.js`

- `getCustomers()` - List customers
- `createCustomer()` - Add customer
- `updateCustomer()` - Update customer
- `deleteCustomer()` - Delete customer
- `getCustomerDetail()` - Customer details with contracts
- `convertToResident()` - Convert customer to resident

#### `contractController.js`

- `getContracts()` - List contracts
- `createContract()` - Create contract
- `updateContract()` - Update contract
- `deleteContract()` - Delete contract
- `getContractDetail()` - Full contract details
- `transferContract()` - Transfer to new customer
- `cancelContract()` - Cancel contract
- `uploadDocument()` - Upload contract document
- `deleteDocument()` - Delete document

#### `contractLifecycleController.js`

- `getLifecycleEvents()` - Get contract timeline
- `addLifecycleEvent()` - Add event manually
- `getPaymentSchedule()` - Get payment schedule
- `createPaymentSchedule()` - Create schedule
- `updatePaymentInstallment()` - Update payment
- `markPaymentPaid()` - Mark as paid
- `sendPaymentReminder()` - Send reminder email

#### `handoverController.js`

- `getHandoverChecklist()` - Get checklist
- `createChecklist()` - Create default checklist
- `updateChecklistItem()` - Update item status
- `checkHandoverEligibility()` - Check if ready for handover
- `completeHandover()` - Complete handover process (auto-create resident)

#### `approvalController.js`

- `getApprovals()` - List pending approvals
- `createApprovalRequest()` - Create request
- `approveRequest()` - Approve
- `rejectRequest()` - Reject

#### `earlyPaymentController.js`

- `calculateEarlyPaymentDiscount()` - Calculate discount
- `applyEarlyPayment()` - Apply early payment

---

### Dashboard & Reports

#### `dashboardController.js`

- `getStats()` - Overall statistics

#### `debtDashboardController.js`

- `getDebtSummary()` - Debt by apartment
- `getOverduePayments()` - Overdue list
- `getDebtAging()` - Aging analysis

#### `reportController.js`

- `getRevenueReport()` - Revenue statistics
- `getPaymentCollectionRate()` - Collection rate
- `getContractStatusReport()` - Contract status breakdown
- `exportRevenueExcel()` - Export to Excel

#### `debtReminderController.js`

- `sendDebtReminders()` - Send reminders to overdue accounts
- `getDebtReminderHistory()` - History of sent reminders

---

### Other Controllers

#### `userController.js`

- `getUsers()` - List admin users
- `createUser()` - Create admin user
- `updateUser()` - Update user
- `deleteUser()` - Delete user

#### `configController.js`

- `getPricingConfig()` - Get pricing config
- `updatePricingConfig()` - Update pricing
- `getPricingHistory()` - History

#### `activityLogController.js`

- `getActivityLogs()` - Get system logs

#### `templateController.js`

- `getTemplates()` - Get email templates

---

## 🛣️ Routes (21 files)

Mỗi route file map HTTP methods đến controller functions:

### Route Structure

```javascript
// Example: apartmentRoutes.js
router.get('/', authenticateToken, getApartments);
router.post('/', authenticateToken, createApartment);
router.put('/:id', authenticateToken, updateApartment);
router.delete('/:id', authenticateToken, deleteApartment);
```

### API Endpoints

**Auth:**

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `POST /api/change-password`

**Apartments:**

- `GET /api/apartments`
- `POST /api/apartments`
- `PUT /api/apartments/:id`
- `DELETE /api/apartments/:id`

**Residents:**

- `GET /api/residents`
- `POST /api/residents`
- `PUT /api/residents/:id`
- `DELETE /api/residents/:id`
- `POST /api/residents/create-account`

**Utilities:**

- `GET /api/utility-records`
- `POST /api/utility-records`
- `PUT /api/utility-records/:id`
- `DELETE /api/utility-records/:id`
- `POST /api/utility-records/:id/mark-paid`
- `POST /api/utility-records/:id/send-email`
- `POST /api/utility-records/:id/generate-qr`
- `POST /api/utility-records/bulk-generate-qr`

**Management Fees:**

- `GET /api/management-fees`
- `POST /api/management-fees`
- `POST /api/management-fees/bulk-generate`
- `GET /api/management-fees/summary`

**Unified Billing:**

- `GET /api/unified-billing`
- `GET /api/unified-billing/history/:apartmentId`
- `GET /api/unified-billing/invoice/:id`
- `POST /api/unified-billing/send-email`
- `POST /api/unified-billing/export`

**CRM:**

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `POST /api/customers/:id/convert-to-resident`
- `GET /api/contracts`
- `POST /api/contracts`
- `GET /api/contracts/:id`
- `POST /api/contracts/:id/transfer`
- `POST /api/contracts/:id/cancel`
- `GET /api/contracts/:id/lifecycle`
- `GET /api/contracts/:id/handover-checklist`
- `POST /api/contracts/:id/complete-handover`
- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

**Reports:**

- `GET /api/reports/revenue`
- `GET /api/reports/contracts`
- `POST /api/reports/export`

---

## 🔧 Services (7 files)

### `emailService.js`

**Chức năng:** Gửi email qua nodemailer

**Methods:**

- `sendEmail(to, subject, html)` - Send email
- `sendUtilityBillEmail()` - Send utility bill
- `sendPaymentReminderEmail()` - Send payment reminder

**Config:** SMTP settings từ `.env`

---

### `pdfService.js`

**Chức năng:** Generate PDF từ HTML bằng Puppeteer

**Methods:**

- `generatePDF(html)` - Generate PDF buffer
- `generateInvoicePDF(data)` - Generate invoice PDF

---

### `vietQRService.js`

**Chức năng:** Generate VietQR payment codes

**Methods:**

- `generateVietQR(amount, description, apartmentCode)` - Generate QR code image

**Format:** VietQR standard for Vietnamese banks

---

### `templateService.js`

**Chức năng:** Load email templates from database

**Methods:**

- `getTemplate(code)` - Get template by code
- `renderTemplate(code, variables)` - Render with variables

---

### `paymentScheduleService.js`

**Chức năng:** Calculate payment schedules

**Methods:**

- `generateSchedule(contract, policy)` - Generate payment plan
- `calculateLateFee(payment)` - Calculate late fees
- `updatePaymentStatus()` - Update overdue status

---

### `earlyPaymentService.js`

**Chức năng:** Calculate early payment discounts

**Methods:**

- `calculateDiscount(payment, paymentDate)` - Calculate discount amount
- `applyDiscount(payment, discount)` - Apply discount

---

### `alertService.js`

**Chức năng:** System alerts and notifications

**Methods:**

- `sendAlert(type, message)` - Send system alert
- `checkOverduePayments()` - Check for overdue payments

---

## 🛡️ Middleware (3 files)

### `authMiddleware.js`

**Chức năng:** Authentication & Authorization

**Functions:**

- `authenticateToken(req, res, next)` - Verify JWT token from cookie
- `requirePermission(permission)` - Check user permissions
- `requireRole(role)` - Check user role

**Token Storage:** HTTP-only cookie

---

### `uploadMiddleware.js`

**Chức năng:** File upload handling

**Config:** Multer for multipart/form-data

---

### `validate.js`

**Chức năng:** Request validation

**Usage:** Validate request body/params using Zod schemas

---

## 🗄️ Database

### Prisma Schema (`prisma/schema.prisma`)

**Models (20+):**

**Core:**

- `apartments` - Căn hộ
- `residents` - Cư dân
- `occupancies` - Quan hệ cư dân-căn hộ
- `users` - Admin users

**Utilities:**

- `utility_records` - Bản ghi điện nước
- `management_fees` - Phí quản lý (chưa có trong schema, dùng raw SQL)
- `fee_config` - Cấu hình phí

**Amenities:**

- `amenity_usage` - Đặt tiện ích

**Feedback:**

- `resident_feedback` - Phản hồi cư dân

**CRM:**

- `customers` - Khách hàng
- `contracts` - Hợp đồng
- `contract_payments` - Thanh toán
- `contract_documents` - Tài liệu
- `contract_transfers` - Chuyển nhượng
- `contract_lifecycle_events` - Timeline
- `payment_schedules` - Lịch thanh toán
- `handover_checklists` - Checklist bàn giao
- `approval_workflows` - Phê duyệt

**System:**

- `activity_logs` - Nhật ký
- `pricing_config_history` - Lịch sử giá
- `system_settings` - Cài đặt
- `email_templates` - Mẫu email
- `resident_accounts` - Tài khoản cư dân

**Enums:**

- `amenity_type` - Loại tiện ích
- `contract_status` - Trạng thái hợp đồng
- `payment_status` - Trạng thái thanh toán

---

### Migrations (`migrations/` - 8 files)

1. `20260124_crm_phase1_core.sql` - CRM core tables
2. `20260128_add_early_payment_fields.js` - Early payment support
3. `add_management_fees.sql` - Management fees tables
4. `add_permissions_to_users.sql` - Permission system
5. `add_security_cleaning_fees.sql` - Additional fee types
6. `create_utility_pricing_tables.sql` - Pricing config
7. `insert_sample_billing_data.sql` - Sample data
8. `migrate_permissions.js` - Permission migration

---

## 🛠️ Utilities (4 files)

### `pricing.js`

**Chức năng:** Calculate utility costs

**Functions:**

- `calculateElectricityCost(consumption, type)` - Tiered pricing
- `calculateWaterCost(consumption)` - Tiered pricing
- `loadPricingConfig()` - Load from file/DB

---

### `logger.js`

**Chức năng:** Logging utility

**Functions:**

- `log(level, message)` - Log with level
- `logActivity(user, action, target)` - Log user activity

---

### `fileHelpers.js`

**Chức năng:** File operations

**Functions:**

- `saveBase64Image(base64, path)` - Save base64 to file
- `deleteFile(path)` - Delete file
- `ensureDir(path)` - Create directory if not exists

---

### `helpers.js`

**Chức năng:** General utilities

---

## ⏰ Jobs & Cron (2 files)

### `debtReminderCron.js`

**Schedule:** Daily at 9:00 AM

**Tasks:**

- `scheduleDebtReminders()` - Send reminders for overdue payments
- `scheduleStatusUpdate()` - Update payment status (PENDING → OVERDUE)

---

### `alertCron.js`

**Schedule:** Daily at 8:00 AM

**Tasks:**

- `scheduleDailyAlerts()` - Send daily alerts
- `scheduleOverdueCheck()` - Check for new overdue payments

---

## 📧 Templates (3 files)

### `combinedBillEmail.js`

**Template:** Combined utility + management fee email

**Variables:** apartment, month, year, electricity, water, fees, total, QR code

---

### `debtReminderEmail.js`

**Template:** Debt reminder email

**Variables:** customer, contract, overdue amount, due date

---

### `invoicePDFTemplate.js`

**Template:** PDF invoice template

**Variables:** invoice data, breakdown, QR code

---

## 📜 Scripts (11 files)

**Migration Scripts:**

- `runMigration.js` - Run SQL migration
- `run_crm_migration.js` - Run CRM migration
- `add_early_payment_fields.js` - Add early payment columns
- `add_missing_columns.js` - Add missing columns

**Data Scripts:**

- `check_payment_data.js` - Verify payment data
- `standardize_payment_descriptions.js` - Standardize descriptions

**Template Scripts:**

- `test_combined_template.js` - Test email template
- `update_template_professional.js` - Update template design
- `update_template_qr.js` - Update QR template

---

## 🔐 Environment Variables (`.env`)

```env
PORT=3002
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
CORS_ALLOWED_ORIGINS=http://localhost:5173
N8N_WEBHOOK_URL=https://ai.n8ntng.xyz/webhook/...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-password
```

---

## 📊 Thống Kê

| Loại                | Số lượng |
| ------------------- | -------- |
| **Controllers**     | 24       |
| **Routes**          | 21       |
| **Services**        | 7        |
| **Middleware**      | 3        |
| **Database Models** | 20+      |
| **Migrations**      | 8        |
| **Scripts**         | 11       |
| **Templates**       | 3        |
| **Cron Jobs**       | 2        |
| **Utilities**       | 4        |

---

## 🚀 Deployment

**Requirements:**

- Node.js 16+
- PostgreSQL 12+
- Nginx (for static files)

**Setup:**

1. `npm install`
2. Configure `.env`
3. Run migrations
4. `npm start`

**Production:**

- Use PM2 for process management
- Configure Nginx reverse proxy
- Enable HTTPS
- Set up database backups

---

**Tài liệu được tạo:** 28/01/2026

# 🚀 ENHANCEMENT ROADMAP - Resident Management App

> **Lộ trình hoàn thiện dự án cho triển khai thực tế**
>
> **Ngày tạo:** 23/01/2026  
> **Version:** 1.0

---

## 📊 TỔNG QUAN DỰ ÁN

### ✅ Chức năng đã có (Current Features)

#### 1. **Quản lý cơ bản**

- [x] Quản lý căn hộ (Apartments Management)
- [x] Quản lý cư dân (Residents Management)
- [x] Quản lý tài khoản cư dân (Resident Accounts)
- [x] Quản lý người dùng admin (User Management)
- [x] Quan hệ căn hộ - cư dân (Occupancies)

#### 2. **Tiện ích & Dịch vụ**

- [x] Ghi chỉ số điện nước (Utility Records)
- [x] Gửi email thông báo hóa đơn điện nước
- [x] Gửi email hàng loạt (Bulk Email)
- [x] Tạo QR code thanh toán hóa đơn
- [x] Tạo QR code hàng loạt và download ZIP
- [x] Quản lý tiện ích chung (Amenity Usage) - Golf, Gym, Yoga, etc.
- [x] Phản hồi cư dân (Resident Feedback)

#### 3. **CRM (Customer Relationship Management)**

- [x] Quản lý khách hàng (Customers)
- [x] Quản lý hợp đồng (Contracts)
- [x] Theo dõi tiến độ thanh toán
- [x] Theo dõi hợp đồng quá hạn
- [x] Dashboard CRM

#### 4. **Hệ thống**

- [x] Đăng nhập/Phân quyền (JWT Authentication)
- [x] Activity Logs (Nhật ký hoạt động)
- [x] Cấu hình giá điện nước động
- [x] Export Excel báo cáo
- [x] Resident Portal (Cổng thông tin cư dân)

---

## 🎯 LỘ TRÌNH PHÁT TRIỂN

### **PHASE 1: CRITICAL FEATURES** ⚠️ (Ưu tiên cao nhất)

> **Timeline:** 2-3 tuần  
> **Status:** 🔴 Cần triển khai ngay

#### 1.1. Quản lý Phí Quản Lý & Dịch vụ (Management Fees)

**Độ ưu tiên:** 🔴 CRITICAL

**Tại sao cần:** Đây là nguồn thu chính của BQL chung cư, quan trọng hơn cả tiền điện nước.

**Chức năng chi tiết:**

- [ ] Cấu hình phí quản lý theo diện tích căn hộ
- [ ] Quản lý phí dịch vụ:
  - [ ] Phí Internet
  - [ ] Phí truyền hình cáp
  - [ ] Phí bảo vệ
  - [ ] Phí vệ sinh
  - [ ] Phí gửi xe ô tô
  - [ ] Phí gửi xe máy
  - [ ] Phí dịch vụ khác (có thể tùy chỉnh)
- [ ] Tạo hóa đơn tổng hợp hàng tháng (Điện + Nước + Phí quản lý)
- [ ] Tính toán tự động dựa trên cấu hình
- [ ] Theo dõi trạng thái thanh toán (Chưa thanh toán / Đã thanh toán / Quá hạn)
- [ ] Gửi email/thông báo nhắc nợ tự động
- [ ] Xuất hóa đơn PDF
- [ ] Dashboard công nợ theo căn hộ

**Database Schema:**

```sql
-- Bảng cấu hình phí cơ bản
CREATE TABLE fee_config (
    id SERIAL PRIMARY KEY,
    management_fee_per_sqm DECIMAL(10,2), -- Phí quản lý/m2
    internet_fee DECIMAL(10,2),
    cable_tv_fee DECIMAL(10,2),
    parking_car_fee DECIMAL(10,2),
    parking_motorbike_fee DECIMAL(10,2),
    effective_from DATE,
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng phí quản lý hàng tháng
CREATE TABLE management_fees (
    id VARCHAR(50) PRIMARY KEY,
    apartment_id VARCHAR(50) REFERENCES apartments(id),
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    year INTEGER,
    management_fee DECIMAL(10,2),
    internet_fee DECIMAL(10,2),
    cable_tv_fee DECIMAL(10,2),
    parking_car_fee DECIMAL(10,2),
    parking_motorbike_fee DECIMAL(10,2),
    other_fees JSONB, -- Phí khác dạng JSON
    total_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
    payment_date TIMESTAMP,
    payment_method VARCHAR(50),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (apartment_id, month, year)
);

-- Index
CREATE INDEX idx_management_fees_apartment ON management_fees(apartment_id);
CREATE INDEX idx_management_fees_status ON management_fees(status);
CREATE INDEX idx_management_fees_year_month ON management_fees(year, month);
```

**API Endpoints cần tạo:**

```
POST   /api/management-fees/generate       # Tạo hóa đơn cho tháng
GET    /api/management-fees                # Danh sách hóa đơn
GET    /api/management-fees/:id            # Chi tiết hóa đơn
PUT    /api/management-fees/:id/pay        # Cập nhật thanh toán
DELETE /api/management-fees/:id            # Xóa hóa đơn
GET    /api/management-fees/summary        # Tổng hợp công nợ
POST   /api/management-fees/bulk-generate  # Tạo hàng loạt cho tất cả căn hộ
```

**Frontend Pages:**

- [ ] `ManagementFeePage.tsx` - Trang quản lý phí
- [ ] `FeeConfigModal.tsx` - Modal cấu hình phí
- [ ] `MonthlyInvoiceModal.tsx` - Chi tiết hóa đơn tháng
- [ ] `DebtSummaryPage.tsx` - Tổng hợp công nợ

---

#### 1.2. Hệ thống Giao dịch Thanh toán (Payment Transactions)

**Độ ưu tiên:** 🔴 CRITICAL

**Chức năng chi tiết:**

- [ ] Ghi nhận giao dịch thanh toán
- [ ] Hỗ trợ nhiều phương thức: Tiền mặt, Chuyển khoản, QR Code, Thẻ
- [ ] Thanh toán một phần (partial payment)
- [ ] Lịch sử giao dịch chi tiết
- [ ] Đối soát công nợ tự động
- [ ] In biên lai thanh toán
- [ ] Xuất báo cáo thu chi Excel/PDF

**Database Schema:**

```sql
CREATE TABLE payment_transactions (
    id VARCHAR(50) PRIMARY KEY,
    apartment_id VARCHAR(50) REFERENCES apartments(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('UTILITY', 'MANAGEMENT_FEE', 'AMENITY', 'OTHER')),
    reference_id VARCHAR(50), -- ID của utility_records hoặc management_fees
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'QR_CODE', 'CARD', 'OTHER')),
    payment_date TIMESTAMP NOT NULL,
    transaction_code VARCHAR(100), -- Mã giao dịch ngân hàng
    note TEXT,
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_apartment ON payment_transactions(apartment_id);
CREATE INDEX idx_payment_date ON payment_transactions(payment_date);
CREATE INDEX idx_payment_reference ON payment_transactions(reference_id);
```

**API Endpoints:**

```
POST   /api/payments              # Tạo giao dịch thanh toán
GET    /api/payments              # Danh sách giao dịch
GET    /api/payments/:id          # Chi tiết giao dịch
GET    /api/payments/apartment/:id # Lịch sử thanh toán của căn hộ
DELETE /api/payments/:id          # Xóa giao dịch (có kiểm tra quyền)
GET    /api/payments/export       # Xuất báo cáo Excel
```

---

#### 1.3. Hệ thống Thông báo (Notification System)

**Độ ưu tiên:** 🔴 CRITICAL

**Chức năng chi tiết:**

- [ ] Gửi thông báo qua nhiều kênh:
  - [ ] Email (đã có nodemailer)
  - [ ] SMS (tích hợp Twilio/SMSAPI)
  - [ ] Zalo OA (tích hợp Zalo API)
  - [ ] Push Notification (web push)
- [ ] Template thông báo tùy chỉnh
- [ ] Lên lịch gửi thông báo tự động
- [ ] Thông báo nhắc thanh toán:
  - [ ] Trước hạn 7 ngày
  - [ ] Trước hạn 3 ngày
  - [ ] Trước hạn 1 ngày
  - [ ] Quá hạn 1 tuần
  - [ ] Quá hạn 1 tháng
- [ ] Thông báo sự kiện, bảo trì
- [ ] Lịch sử gửi và trạng thái

**Database Schema:**

```sql
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) CHECK (type IN ('PAYMENT_REMINDER', 'OVERDUE_NOTICE', 'MAINTENANCE', 'ANNOUNCEMENT', 'EVENT', 'FEEDBACK_RESPONSE')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_type VARCHAR(20) CHECK (target_type IN ('ALL', 'BUILDING', 'FLOOR', 'APARTMENT', 'RESIDENT')),
    target_ids TEXT[], -- Mảng ID căn hộ hoặc cư dân
    channels VARCHAR(20)[] CHECK (channels <@ ARRAY['EMAIL', 'SMS', 'ZALO', 'PUSH']),
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED')),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    template_id VARCHAR(50),
    metadata JSONB, -- Dữ liệu động cho template
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    notification_id VARCHAR(50) REFERENCES notifications(id),
    recipient_type VARCHAR(20),
    recipient_id VARCHAR(50),
    recipient_contact VARCHAR(255), -- Email, phone, zalo_id
    channel VARCHAR(20),
    status VARCHAR(20) CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(50),
    subject VARCHAR(255),
    content TEXT,
    variables JSONB, -- Các biến có thể sử dụng: {{apartment_code}}, {{amount}}, {{due_date}}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at);
CREATE INDEX idx_notification_logs_notification ON notification_logs(notification_id);
```

**API Endpoints:**

```
POST   /api/notifications              # Tạo thông báo
GET    /api/notifications              # Danh sách thông báo
GET    /api/notifications/:id          # Chi tiết thông báo
PUT    /api/notifications/:id          # Cập nhật thông báo
DELETE /api/notifications/:id          # Xóa thông báo
POST   /api/notifications/:id/send     # Gửi ngay
GET    /api/notifications/:id/logs     # Lịch sử gửi
GET    /api/notification-templates     # Danh sách template
POST   /api/notification-templates     # Tạo template
```

**Background Jobs (Node-cron):**

```javascript
// Chạy mỗi ngày 8:00 AM
cron.schedule('0 8 * * *', async () => {
  // Kiểm tra hóa đơn sắp đến hạn và gửi nhắc nhở
  await sendPaymentReminders();
});
```

---

#### 1.4. Bảo mật nâng cao (Security Enhancements)

**Độ ưu tiên:** 🔴 CRITICAL

**Chức năng cần bổ sung:**

- [ ] **Two-Factor Authentication (2FA)**
  - [ ] QR Code setup (Google Authenticator)
  - [ ] SMS OTP
  - [ ] Email OTP
- [ ] **Refresh Token** thay vì chỉ Access Token
- [ ] **Rate Limiting** chống brute force
  - [ ] Login: 5 lần/15 phút
  - [ ] API: 100 requests/phút/IP
- [ ] **IP Whitelisting** cho admin (tùy chọn)
- [ ] **Audit Trail** đầy đủ cho các thao tác nhạy cảm
- [ ] **Session Management**
  - [ ] Đăng xuất tất cả thiết bị
  - [ ] Xem danh sách thiết bị đã đăng nhập
- [ ] **Data Encryption**
  - [ ] Mã hóa CCCD, số điện thoại trong DB
  - [ ] HTTPS bắt buộc
- [ ] **CORS** cấu hình chặt chẽ
- [ ] **CSP (Content Security Policy)**
- [ ] **SQL Injection Protection** (dùng parameterized queries)
- [ ] **XSS Protection**

**Database Schema:**

```sql
-- Bảng refresh tokens
CREATE TABLE refresh_tokens (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    device_info JSONB, -- User agent, IP, device name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 2FA
CREATE TABLE two_factor_auth (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255),
    enabled BOOLEAN DEFAULT FALSE,
    backup_codes TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

**Backend Implementation:**

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5,
  message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 100,
  message: 'Quá nhiều requests. Vui lòng thử lại sau.',
});

module.exports = { loginLimiter, apiLimiter };
```

---

### **PHASE 2: HIGH PRIORITY FEATURES** 🟠

> **Timeline:** 2-3 tuần  
> **Status:** 🟡 Triển khai sau Phase 1

#### 2.1. Tích hợp Thanh toán Online (Payment Gateway)

**Độ ưu tiên:** 🟠 HIGH

**Chức năng:**

- [ ] Tích hợp **VNPay**
- [ ] Tích hợp **ZaloPay** (tùy chọn)
- [ ] Tích hợp **MoMo** (tùy chọn)
- [ ] QR Code động từ gateway
- [ ] Webhook xử lý callback
- [ ] Đối soát giao dịch tự động
- [ ] Hoàn tiền (refund)
- [ ] Lịch sử giao dịch online

**API Endpoints:**

```
POST   /api/payment-gateway/create-payment    # Tạo link thanh toán
GET    /api/payment-gateway/callback          # Webhook từ gateway
POST   /api/payment-gateway/verify            # Xác thực giao dịch
GET    /api/payment-gateway/transactions      # Danh sách giao dịch online
```

**Environment Variables:**

```
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://yourdomain.com/api/payment-gateway/callback
```

---

#### 2.2. Mobile PWA (Progressive Web App)

**Độ ưu tiên:** 🟠 HIGH

**Chức năng:**

- [ ] Responsive design hoàn chỉnh (đã có 80%, cần hoàn thiện)
- [ ] Service Worker cho offline support
- [ ] Manifest.json để cài đặt PWA
- [ ] Push Notification trên mobile
- [ ] Chụp ảnh feedback từ camera
- [ ] Scan QR code để thanh toán
- [ ] Tối ưu hiệu năng (lazy loading, code splitting)

**Files cần tạo:**

```
public/manifest.json
public/sw.js (Service Worker)
```

**manifest.json:**

```json
{
  "name": "Resident Management App",
  "short_name": "ResidentApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

#### 2.3. Quản lý Khách & Xe ra vào (Visitor & Vehicle Management)

**Độ ưu tiên:** 🟠 HIGH

**Chức năng:**

- [ ] Đăng ký khách trước khi đến
- [ ] QR Code cho khách (scan tại cổng)
- [ ] Quản lý xe ra vào:
  - [ ] Biển số xe
  - [ ] Loại xe (ô tô/xe máy)
  - [ ] Thời gian vào/ra
  - [ ] Căn hộ đến thăm
- [ ] Thống kê lượt ra vào
- [ ] Cảnh báo xe lạ, khách lạ
- [ ] Tích hợp camera AI (tùy chọn nâng cao)

**Database Schema:**

```sql
CREATE TABLE visitors (
    id VARCHAR(50) PRIMARY KEY,
    apartment_id VARCHAR(50) REFERENCES apartments(id),
    visitor_name VARCHAR(255),
    visitor_phone VARCHAR(20),
    purpose TEXT,
    visit_date DATE,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    qr_code VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicle_logs (
    id SERIAL PRIMARY KEY,
    license_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('CAR', 'MOTORBIKE', 'BICYCLE')),
    apartment_id VARCHAR(50) REFERENCES apartments(id),
    entry_time TIMESTAMP NOT NULL,
    exit_time TIMESTAMP,
    parking_spot VARCHAR(50),
    is_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visitors_apartment ON visitors(apartment_id);
CREATE INDEX idx_visitors_date ON visitors(visit_date);
CREATE INDEX idx_vehicle_logs_license ON vehicle_logs(license_plate);
CREATE INDEX idx_vehicle_logs_entry ON vehicle_logs(entry_time);
```

---

#### 2.4. Quản lý Tài sản & Bảo trì (Asset Management)

**Độ ưu tiên:** 🟠 HIGH

**Chức năng:**

- [ ] Danh mục tài sản chung:
  - [ ] Thang máy
  - [ ] Máy phát điện
  - [ ] Hệ thống PCCC
  - [ ] Bơm nước
  - [ ] Camera an ninh
  - [ ] Cổng tự động
- [ ] Lịch bảo trì định kỳ
- [ ] Lịch sử sửa chữa
- [ ] Theo dõi chi phí
- [ ] Quản lý nhà cung cấp dịch vụ
- [ ] Cảnh báo khi đến hạn bảo trì
- [ ] Báo cáo chi phí bảo trì

**Database Schema:**

```sql
CREATE TABLE assets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('ELEVATOR', 'GENERATOR', 'FIRE_SYSTEM', 'WATER_PUMP', 'CAMERA', 'GATE', 'OTHER')),
    location VARCHAR(255),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    warranty_expiry DATE,
    maintenance_interval_days INTEGER, -- Số ngày cần bảo trì định kỳ
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'BROKEN', 'RETIRED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE maintenance_schedules (
    id VARCHAR(50) PRIMARY KEY,
    asset_id VARCHAR(50) REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('PERIODIC', 'REPAIR', 'INSPECTION', 'EMERGENCY')),
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    technician VARCHAR(255),
    vendor VARCHAR(255),
    vendor_contact VARCHAR(100),
    cost DECIMAL(10,2),
    description TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_by VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    service_type VARCHAR(50),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_maintenance_asset ON maintenance_schedules(asset_id);
CREATE INDEX idx_maintenance_date ON maintenance_schedules(scheduled_date);
```

---

#### 2.5. Báo cáo Tài chính nâng cao (Advanced Financial Reports)

**Độ ưu tiên:** 🟠 HIGH

**Chức năng:**

- [ ] Dashboard tài chính tổng quan
- [ ] Báo cáo doanh thu:
  - [ ] Theo tháng/quý/năm
  - [ ] Theo loại phí (Điện, nước, phí quản lý, tiện ích...)
  - [ ] Theo tòa nhà (CANTATA vs TESLA)
- [ ] Báo cáo công nợ:
  - [ ] Danh sách căn hộ nợ
  - [ ] Độ tuổi công nợ (aging report)
  - [ ] Tỷ lệ thu hồi
- [ ] Báo cáo thu chi:
  - [ ] Thu nhập
  - [ ] Chi phí (bảo trì, nhân sự, tiện ích...)
  - [ ] Biểu đồ cash flow
- [ ] Dự báo doanh thu
- [ ] So sánh theo kỳ
- [ ] Xuất PDF/Excel với biểu đồ

**API Endpoints:**

```
GET /api/reports/revenue              # Báo cáo doanh thu
GET /api/reports/debt                 # Báo cáo công nợ
GET /api/reports/cash-flow            # Báo cáo thu chi
GET /api/reports/comparison           # So sánh theo kỳ
GET /api/reports/export               # Xuất file
```

---

### **PHASE 3: MEDIUM PRIORITY FEATURES** 🟡

> **Timeline:** 3-4 tuần  
> **Status:** ⚪ Triển khai sau khi Phase 2 hoàn thành

#### 3.1. Quản lý Cuộc họp & Biểu quyết (Meeting & Voting)

**Chức năng:**

- [ ] Tạo cuộc họp tổng cư dân
- [ ] Gửi thông báo và lịch họp
- [ ] Agenda (chương trình họp)
- [ ] Biểu quyết online:
  - [ ] Tán thành / Phản đối / Trung lập
  - [ ] Anonymous voting (tùy chọn)
  - [ ] Thời gian bắt đầu/kết thúc
- [ ] Thống kê kết quả realtime
- [ ] Biên bản cuộc họp
- [ ] Lưu trữ tài liệu họp

---

#### 3.2. Marketplace Cư dân (Resident Marketplace)

**Chức năng:**

- [ ] Chợ nội bộ:
  - [ ] Mua bán đồ cũ
  - [ ] Trao đổi, cho tặng
  - [ ] Tìm người giúp việc, gia sư
- [ ] Đăng tin với hình ảnh
- [ ] Chat giữa cư dân (tùy chọn)
- [ ] Đánh giá người bán
- [ ] Quản trị tin đăng (duyệt/xóa)

---

#### 3.3. Thư viện Tài liệu & FAQ

**Chức năng:**

- [ ] Quy định chung cư
- [ ] Hướng dẫn sử dụng tiện ích
- [ ] Mẫu đơn, biểu mẫu
- [ ] FAQ (Câu hỏi thường gặp)
- [ ] Chatbot tự động trả lời (AI)

---

#### 3.4. Tích hợp IoT (Internet of Things)

**Chức năng (nếu có thiết bị hỗ trợ):**

- [ ] Đồng hồ điện nước thông minh (realtime reading)
- [ ] Điều khiển thang máy từ xa
- [ ] Cảnh báo cháy nổ, rò rỉ nước
- [ ] Hệ thống đèn, điều hòa tự động
- [ ] Cổng ra vào tự động (RFID, QR)

---

### **PHASE 4: NICE TO HAVE** 💙

> **Timeline:** 1-2 tuần  
> **Status:** ⚫ Triển khai khi có thời gian

#### 4.1. Đa ngôn ngữ (Multi-language)

- [ ] Tiếng Việt (mặc định)
- [ ] Tiếng Anh
- [ ] Tiếng Hàn (nếu có cư dân Hàn)
- [ ] Tiếng Nhật (nếu có cư dân Nhật)

**Implementation:** i18next hoặc react-intl

---

#### 4.2. Dark Mode

- [ ] Theme toggle
- [ ] Lưu preference trong localStorage

---

#### 4.3. Analytics & BI Dashboard nâng cao

- [ ] Biểu đồ tương tác (Chart.js, Recharts, D3.js)
- [ ] Heatmap căn hộ nợ tiền
- [ ] Dự đoán xu hướng (ML/AI)
- [ ] WebSocket realtime updates

---

#### 4.4. DevOps & Infrastructure

- [ ] Docker containerization
- [ ] CI/CD Pipeline (GitHub Actions, GitLab CI)
- [ ] Backup tự động database (daily)
- [ ] Monitoring (PM2, Sentry, Prometheus)
- [ ] Logging (Winston, Morgan)
- [ ] Load Balancer (Nginx)
- [ ] SSL Certificate (Let's Encrypt)

---

## 📁 CẤU TRÚC THƯ MỤC ĐỀ XUẤT

```
resident-management-app/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── managementFeeController.js      # NEW
│   │   │   ├── paymentController.js            # NEW
│   │   │   ├── notificationController.js       # NEW
│   │   │   ├── assetController.js              # NEW
│   │   │   ├── visitorController.js            # NEW
│   │   │   ├── vehicleController.js            # NEW
│   │   │   ├── meetingController.js            # NEW
│   │   │   └── reportController.js             # ENHANCE
│   │   ├── routes/
│   │   │   ├── managementFeeRoutes.js          # NEW
│   │   │   ├── paymentRoutes.js                # NEW
│   │   │   ├── notificationRoutes.js           # NEW
│   │   │   ├── assetRoutes.js                  # NEW
│   │   │   ├── visitorRoutes.js                # NEW
│   │   │   └── meetingRoutes.js                # NEW
│   │   ├── middleware/
│   │   │   ├── rateLimiter.js                  # NEW
│   │   │   ├── twoFactorAuth.js                # NEW
│   │   │   └── ipWhitelist.js                  # NEW
│   │   ├── services/
│   │   │   ├── emailService.js                 # ENHANCE
│   │   │   ├── smsService.js                   # NEW
│   │   │   ├── zaloService.js                  # NEW
│   │   │   ├── paymentGateway.js               # NEW
│   │   │   └── notificationScheduler.js        # NEW (cron jobs)
│   │   └── utils/
│   │       ├── encryption.js                   # NEW
│   │       └── tokenManager.js                 # ENHANCE (refresh token)
│   └── migrations/
│       ├── add_management_fees.sql             # NEW
│       ├── add_payment_transactions.sql        # NEW
│       ├── add_notifications.sql               # NEW
│       ├── add_assets.sql                      # NEW
│       ├── add_visitors_vehicles.sql           # NEW
│       └── add_security_tables.sql             # NEW
├── src/
│   ├── pages/
│   │   ├── ManagementFeePage.tsx               # NEW
│   │   ├── PaymentTransactionsPage.tsx         # NEW
│   │   ├── NotificationPage.tsx                # NEW
│   │   ├── AssetManagementPage.tsx             # NEW
│   │   ├── VisitorManagementPage.tsx           # NEW
│   │   ├── MeetingPage.tsx                     # NEW
│   │   └── FinancialReportsPage.tsx            # NEW
│   └── components/
│       ├── FeeConfigModal.tsx                  # NEW
│       ├── MonthlyInvoiceModal.tsx             # NEW
│       ├── PaymentModal.tsx                    # NEW
│       ├── NotificationModal.tsx               # NEW
│       ├── AssetDetailModal.tsx                # NEW
│       └── TwoFactorSetupModal.tsx             # NEW
└── public/
    ├── manifest.json                           # NEW (PWA)
    └── sw.js                                   # NEW (Service Worker)
```

---

## 🔧 CÔNG NGHỆ & THƯ VIỆN ĐỀ XUẤT

### Backend

```json
{
  "dependencies": {
    "node-cron": "^3.0.0", // Scheduler cho notifications
    "twilio": "^4.0.0", // SMS service
    "speakeasy": "^2.0.0", // 2FA OTP
    "qrcode": "^1.5.0", // QR code generator (đã có)
    "express-rate-limit": "^7.0.0", // Rate limiting
    "helmet": "^7.0.0", // Security headers
    "crypto-js": "^4.2.0", // Encryption
    "ioredis": "^5.0.0", // Redis cache (optional)
    "socket.io": "^4.6.0" // Realtime updates (optional)
  }
}
```

### Frontend

```json
{
  "dependencies": {
    "recharts": "^2.10.0", // Charts
    "date-fns": "^3.0.0", // Date manipulation
    "react-qr-scanner": "^1.0.0", // QR Scanner
    "react-toastify": "^10.0.0", // Toast notifications
    "workbox-webpack-plugin": "^7.0.0" // PWA service worker
  }
}
```

---

## 📊 METRICS & KPI

### Phase 1

- [ ] 100% căn hộ có phí quản lý
- [ ] Thời gian tạo hóa đơn < 5s
- [ ] Rate thanh toán qua online gateway > 30%
- [ ] Thông báo delivery rate > 95%

### Phase 2

- [ ] PWA lighthouse score > 90
- [ ] Mobile usage > 60%
- [ ] Payment gateway success rate > 98%

### Overall Project

- [ ] API response time < 200ms (p95)
- [ ] Database query time < 100ms
- [ ] Uptime > 99.5%
- [ ] Bug fix time < 24h (critical issues)

---

## 🚨 RỦI RO & GIẢI PHÁP

| Rủi ro                      | Mức độ     | Giải pháp                                   |
| --------------------------- | ---------- | ------------------------------------------- |
| Payment gateway downtime    | Cao        | Fallback về QR code tĩnh, thông báo manual  |
| Email/SMS delivery fail     | Trung bình | Retry mechanism, log failed deliveries      |
| Database migration fail     | Cao        | Backup trước khi migrate, test trên staging |
| Security breach             | Cao        | 2FA bắt buộc, regular security audit        |
| Performance issue khi scale | Trung bình | Database indexing, caching, load balancer   |

---

## 📞 NEXT STEPS

1. **Review roadmap này với stakeholders**
2. **Xác định budget và resources**
3. **Bắt đầu Phase 1 với Management Fees**
4. **Setup staging environment**
5. **Thiết lập CI/CD pipeline**

---

## 📝 GHI CHÚ QUAN TRỌNG

> **⚠️ Trước khi triển khai mỗi Phase:**
>
> - Backup database đầy đủ
> - Test trên staging environment
> - Chuẩn bị rollback plan
> - Thông báo downtime (nếu có) cho users
> - Document tất cả API changes

> **💡 Tip:** Nên triển khai từng feature nhỏ và deploy liên tục thay vì chờ hoàn thành cả Phase.

---

**Prepared by:** AI Assistant  
**Date:** 23/01/2026  
**Version:** 1.0  
**Last Updated:** 23/01/2026

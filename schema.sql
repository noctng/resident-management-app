-- ============================================
-- RESIDENT MANAGEMENT APPLICATION
-- Database Schema Initialization & Seeding Script
-- ============================================

-- Drop existing tables (in reverse order of dependencies for clean execution)
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS approval_workflows CASCADE;
DROP TABLE IF EXISTS handover_checklists CASCADE;
DROP TABLE IF EXISTS contract_lifecycle_events CASCADE;
DROP TABLE IF EXISTS contract_documents CASCADE;
DROP TABLE IF EXISTS contract_payments CASCADE;
DROP TABLE IF EXISTS payment_schedules CASCADE;
DROP TABLE IF EXISTS contract_transfers CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS pricing_config_history CASCADE;
DROP TABLE IF EXISTS resident_feedback CASCADE;
DROP TABLE IF EXISTS amenity_usage CASCADE;
DROP TABLE IF EXISTS utility_records CASCADE;
DROP TABLE IF EXISTS management_fees CASCADE;
DROP TABLE IF EXISTS fee_config CASCADE;
DROP TABLE IF EXISTS water_pricing CASCADE;
DROP TABLE IF EXISTS electricity_pricing CASCADE;
DROP TABLE IF EXISTS occupancies CASCADE;
DROP TABLE IF EXISTS resident_accounts CASCADE;
DROP TABLE IF EXISTS residents CASCADE;
DROP TABLE IF EXISTS apartments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;

-- Drop existing custom types/enums
DROP TYPE IF EXISTS amenity_type CASCADE;
DROP TYPE IF EXISTS contract_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS vehicle_type CASCADE;

-- ============================================
-- CREATE CUSTOM ENUMS
-- ============================================
CREATE TYPE amenity_type AS ENUM ('GOLF_3D', 'HORSE_RIDING', 'MUSEUM', 'ZEN_GARDEN', 'GYM', 'YOGA', 'SAUNA', 'ARCHERY');
CREATE TYPE contract_status AS ENUM ('DEPOSIT', 'SIGNED', 'PAYING', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'OVERDUE');
CREATE TYPE vehicle_type AS ENUM ('CAR', 'MOTORBIKE');

-- ============================================
-- USERS TABLE (Admin & Staff Accounts)
-- ============================================
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role INTEGER DEFAULT 1 NOT NULL, -- 0: Admin, 1: Manager/Staff
    permissions JSON DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- APARTMENTS TABLE
-- ============================================
CREATE TABLE apartments (
    id VARCHAR(255) PRIMARY KEY,
    house_type VARCHAR(50) NOT NULL, -- CANTATA, TESLA
    code VARCHAR(255) UNIQUE NOT NULL,
    floor INTEGER NOT NULL,
    area DECIMAL(10, 2) NOT NULL,
    electricity_type VARCHAR(20) DEFAULT 'RESIDENTIAL' NOT NULL -- RESIDENTIAL, BUSINESS
);

-- ============================================
-- RESIDENTS TABLE
-- ============================================
CREATE TABLE residents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    dob DATE,
    id_number VARCHAR(255) UNIQUE,
    zalo_id VARCHAR(255),
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    zalo_name VARCHAR(255),
    email VARCHAR(255),
    relationship_status VARCHAR(50) DEFAULT 'FAMILY' NOT NULL, -- OWNER, FAMILY, TENANT
    can_use_amenities BOOLEAN DEFAULT TRUE NOT NULL
);

-- ============================================
-- RESIDENT LOGIN ACCOUNTS (Portal Login)
-- ============================================
CREATE TABLE resident_accounts (
    resident_id VARCHAR(255) PRIMARY KEY REFERENCES residents(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- OCCUPANCIES TABLE (Apartment-Resident mapping)
-- ============================================
CREATE TABLE occupancies (
    apartment_id VARCHAR(255) REFERENCES apartments(id) ON DELETE CASCADE,
    resident_id VARCHAR(255) REFERENCES residents(id) ON DELETE CASCADE,
    PRIMARY KEY (apartment_id, resident_id)
);

-- ============================================
-- UTILITY PRICING TABLES
-- ============================================
CREATE TABLE electricity_pricing (
    id SERIAL PRIMARY KEY,
    tier INTEGER UNIQUE NOT NULL,
    min_kwh INTEGER NOT NULL,
    max_kwh INTEGER,
    price_per_kwh DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE water_pricing (
    id SERIAL PRIMARY KEY,
    tier INTEGER UNIQUE NOT NULL,
    min_m3 INTEGER NOT NULL,
    max_m3 INTEGER,
    price_per_m3 DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FEE CONFIGURATION TABLE (Management Fee Rates)
-- ============================================
CREATE TABLE fee_config (
    id SERIAL PRIMARY KEY,
    management_fee_per_sqm DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    internet_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    cable_tv_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    parking_car_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    parking_motorbike_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    effective_from DATE DEFAULT CURRENT_DATE NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    security_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    cleaning_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    enabled_fees JSON DEFAULT '{"cable_tv": true, "cleaning": true, "internet": true, "security": true, "management": true, "parking_car": true, "parking_motorbike": true}'
);

-- ============================================
-- MANAGEMENT FEES TABLE (Invoices)
-- ============================================
CREATE TABLE management_fees (
    id VARCHAR(255) PRIMARY KEY,
    apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    area DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    management_fee_per_sqm DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    management_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    internet_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    cable_tv_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    parking_car_quantity INTEGER DEFAULT 0 NOT NULL,
    parking_car_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    parking_motorbike_quantity INTEGER DEFAULT 0 NOT NULL,
    parking_motorbike_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    other_fees JSON DEFAULT '[]',
    total_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    security_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    cleaning_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    UNIQUE (apartment_id, month, year)
);

-- ============================================
-- UTILITY RECORDS TABLE (Electricity & Water Records)
-- ============================================
CREATE TABLE utility_records (
    id VARCHAR(255) PRIMARY KEY,
    apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    electricity_old_reading DECIMAL(10, 2) NOT NULL,
    electricity_new_reading DECIMAL(10, 2) NOT NULL,
    electricity_consumption DECIMAL(10, 2),
    water_old_reading DECIMAL(10, 2) NOT NULL,
    water_new_reading DECIMAL(10, 2) NOT NULL,
    water_consumption DECIMAL(10, 2),
    electricity_cost DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    water_cost DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    pricing_snapshot JSON,
    paid_date DATE,
    payment_status VARCHAR(20) DEFAULT 'UNPAID' NOT NULL,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (apartment_id, month, year)
);

-- ============================================
-- AMENITY USAGE TABLE (Zen garden, gym, archery etc.)
-- ============================================
CREATE TABLE amenity_usage (
    id VARCHAR(255) PRIMARY KEY,
    apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    amenity amenity_type NOT NULL,
    usage_date DATE DEFAULT CURRENT_DATE NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    booking_code VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    resident_id VARCHAR(255) REFERENCES residents(id) ON DELETE SET NULL
);

-- ============================================
-- RESIDENT FEEDBACK TABLE
-- ============================================
CREATE TABLE resident_feedback (
    id VARCHAR(255) PRIMARY KEY,
    resident_id VARCHAR(255) NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_data TEXT[],
    status VARCHAR(50) DEFAULT 'SUBMITTED' NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    admin_response_content TEXT,
    admin_response_image_data TEXT[],
    resolved_by_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- PRICING CONFIG HISTORY TABLE
-- ============================================
CREATE TABLE pricing_config_history (
    id SERIAL PRIMARY KEY,
    config_data JSON NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changed_by_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE activity_logs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(255),
    action VARCHAR(50),
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    target_name VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CRM CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    id_number VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- ============================================
-- CRM CONTRACTS TABLE
-- ============================================
CREATE TABLE contracts (
    id VARCHAR(255) PRIMARY KEY,
    contract_code VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(255) NOT NULL REFERENCES customers(id),
    apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(id),
    total_value DECIMAL(15, 2) NOT NULL,
    vat_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    maintenance_fee DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    status contract_status DEFAULT 'DEPOSIT' NOT NULL,
    signed_date DATE,
    handover_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    handover_completed BOOLEAN DEFAULT FALSE,
    title_deed_issued BOOLEAN DEFAULT FALSE,
    title_deed_date TIMESTAMP WITH TIME ZONE,
    handover_date_actual TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- CRM CONTRACT TRANSFERS TABLE
-- ============================================
CREATE TABLE contract_transfers (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    old_customer_id VARCHAR(255) NOT NULL REFERENCES customers(id),
    new_customer_id VARCHAR(255) NOT NULL REFERENCES customers(id),
    transfer_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CRM PAYMENT SCHEDULES TABLE
-- ============================================
CREATE TABLE payment_schedules (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    schedule_name VARCHAR(255),
    policy_type VARCHAR(50),
    late_fee_rate DECIMAL(5, 2) DEFAULT 0,
    grace_period_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

-- ============================================
-- CRM CONTRACT PAYMENTS TABLE
-- ============================================
CREATE TABLE contract_payments (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    installment INTEGER NOT NULL,
    description VARCHAR(255),
    due_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL,
    payment_date DATE,
    status payment_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    late_fee DECIMAL(15, 2) DEFAULT 0,
    days_overdue INTEGER DEFAULT 0,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    auto_calculated BOOLEAN DEFAULT FALSE,
    payment_schedule_id VARCHAR(255) REFERENCES payment_schedules(id) ON DELETE SET NULL,
    early_payment_discount DECIMAL(5, 2) DEFAULT 0,
    is_early_payment BOOLEAN DEFAULT FALSE
);

-- ============================================
-- CRM CONTRACT DOCUMENTS TABLE
-- ============================================
CREATE TABLE contract_documents (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    doc_type VARCHAR(50),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SYSTEM SETTINGS TABLE (QR setup Bank Info)
-- ============================================
CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EMAIL TEMPLATES TABLE
-- ============================================
CREATE TABLE email_templates (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables JSON,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CRM CONTRACT LIFECYCLE EVENTS TABLE
-- ============================================
CREATE TABLE contract_lifecycle_events (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(255),
    notes TEXT,
    metadata JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CRM HANDOVER CHECKLISTS TABLE
-- ============================================
CREATE TABLE handover_checklists (
    id VARCHAR(255) PRIMARY KEY,
    contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CRM RESCHEDULE APPROVAL WORKFLOWS TABLE
-- ============================================
CREATE TABLE approval_workflows (
    id VARCHAR(255) PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL,
    contract_id VARCHAR(255) REFERENCES contracts(id) ON DELETE CASCADE,
    requested_by VARCHAR(255) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PENDING',
    approver_id VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    request_data JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VEHICLES REGISTERED TABLE
-- ============================================
CREATE TABLE vehicles (
    id VARCHAR(255) PRIMARY KEY,
    apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    vehicle_type vehicle_type NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE push_subscriptions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) DEFAULT 'resident' NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    apartment_id VARCHAR(255) REFERENCES apartments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================
CREATE INDEX idx_users_username ON users(username);

CREATE INDEX idx_apartments_code ON apartments(code);
CREATE INDEX idx_apartments_house_type ON apartments(house_type);

CREATE INDEX idx_residents_name ON residents(name);
CREATE INDEX idx_residents_phone_number ON residents(phone_number);
CREATE INDEX idx_residents_is_active ON residents(is_active);

CREATE INDEX idx_occupancies_apartment_id ON occupancies(apartment_id);
CREATE INDEX idx_occupancies_resident_id ON occupancies(resident_id);

CREATE INDEX idx_utility_records_apartment_id ON utility_records(apartment_id);
CREATE INDEX idx_utility_records_year_month ON utility_records(year, month);

CREATE INDEX idx_amenity_usage_apartment_date ON amenity_usage(apartment_id, usage_date);
CREATE INDEX idx_amenity_usage_resident ON amenity_usage(resident_id);

CREATE INDEX idx_resident_feedback_apartment_id ON resident_feedback(apartment_id);
CREATE INDEX idx_resident_feedback_resident_id ON resident_feedback(resident_id);
CREATE INDEX idx_resident_feedback_status ON resident_feedback(status);

CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_apartment ON contracts(apartment_id);

CREATE INDEX idx_payments_status_due ON contract_payments(status, due_date);
CREATE INDEX idx_payments_contract ON contract_payments(contract_id);

CREATE INDEX idx_management_fees_apartment ON management_fees(apartment_id);
CREATE INDEX idx_management_fees_status ON management_fees(status);
CREATE INDEX idx_management_fees_year_month ON management_fees(year, month);

-- ============================================
-- SEED DATA CONFIGURATION
-- ============================================

-- 1. Create Default Admin User (username: admin, password: password)
INSERT INTO users (id, username, password_hash, role, permissions, created_at) VALUES
('user_admin_001', 'admin', '$2a$10$EPYtG/vBf3eP2v6V1L2uJuYwU/oFvN.9Bf5p1d3jNqP7fN5q3a2G6', 0, '["dashboard", "apartments", "residents", "utilities", "amenities", "feedback", "resident_accounts", "users", "configuration", "logs", "crm", "unified_billing"]', NOW());

-- 2. Seed Apartments
INSERT INTO apartments (id, house_type, code, floor, area, electricity_type) VALUES
('apt_1001', 'CANTATA', 'A101', 1, 75.50, 'RESIDENTIAL'),
('apt_1002', 'TESLA', 'A102', 1, 120.00, 'BUSINESS'),
('apt_1003', 'CANTATA', 'B201', 2, 75.50, 'RESIDENTIAL'),
('apt_1004', 'TESLA', 'B202', 2, 150.00, 'RESIDENTIAL'),
('apt_1005', 'CANTATA', 'C301', 3, 85.00, 'RESIDENTIAL');

-- 3. Seed Residents
INSERT INTO residents (id, name, dob, id_number, phone_number, email, relationship_status, can_use_amenities) VALUES
('res_1001', 'Nguyễn Văn A', '1990-01-01', '001090001234', '0912345678', 'vana@example.com', 'OWNER', TRUE),
('res_1002', 'Trần Thị B', '1990-01-01', '001090001235', '0987654321', 'thib@example.com', 'OWNER', TRUE),
('res_1003', 'Lê Văn C', '1990-01-01', '001090001236', '0901234567', 'vanc@example.com', 'TENANT', TRUE),
('res_1004', 'Phạm Thị D', '1990-01-01', '001090001237', '0934567890', 'thid@example.com', 'OWNER', TRUE),
('res_1005', 'Hoàng Văn E', '1990-01-01', '001090001238', '0945678901', 'vane@example.com', 'FAMILY', TRUE);

-- 4. Seed Occupancies (Apartment assignment)
INSERT INTO occupancies (apartment_id, resident_id) VALUES
('apt_1001', 'res_1001'),
('apt_1002', 'res_1002'),
('apt_1003', 'res_1003'),
('apt_1004', 'res_1004'),
('apt_1005', 'res_1005');

-- 5. Seed Resident Accounts for Portal Login (password: Abc@12345)
INSERT INTO resident_accounts (resident_id, password_hash, created_at, updated_at) VALUES
('res_1001', '$2a$10$EPYtG/vBf3eP2v6V1L2uJuYwU/oFvN.9Bf5p1d3jNqP7fN5q3a2G6', NOW(), NOW()),
('res_1002', '$2a$10$EPYtG/vBf3eP2v6V1L2uJuYwU/oFvN.9Bf5p1d3jNqP7fN5q3a2G6', NOW(), NOW()),
('res_1003', '$2a$10$EPYtG/vBf3eP2v6V1L2uJuYwU/oFvN.9Bf5p1d3jNqP7fN5q3a2G6', NOW(), NOW());

-- 6. Seed Electricity Pricing Tiers
INSERT INTO electricity_pricing (tier, min_kwh, max_kwh, price_per_kwh, created_at) VALUES
(1, 0, 50, 1678.00, NOW()),
(2, 51, 100, 1734.00, NOW()),
(3, 101, 200, 2014.00, NOW()),
(4, 201, 300, 2536.00, NOW()),
(5, 301, 400, 2834.00, NOW()),
(6, 401, NULL, 2927.00, NOW());

-- 7. Seed Water Pricing (Flat Rate)
INSERT INTO water_pricing (tier, min_m3, max_m3, price_per_m3, created_at) VALUES
(1, 0, NULL, 15000.00, NOW());

-- 8. Seed Fee Config (Management fee and services pricing)
INSERT INTO fee_config (id, management_fee_per_sqm, internet_fee, cable_tv_fee, parking_car_fee, parking_motorbike_fee, security_fee, cleaning_fee, effective_from, created_at) VALUES
(1, 15000.00, 150000.00, 100000.00, 1500000.00, 100000.00, 50000.00, 30000.00, '2025-01-01', NOW());

-- 9. Seed CRM Customers
INSERT INTO customers (id, name, phone_number, email, address, id_number, created_at, updated_at, notes) VALUES
('cust_res_1001', 'Nguyễn Văn A', '0912345678', 'vana@example.com', 'Hà Nội, Việt Nam', '001090001234', NOW(), NOW(), 'Chủ hộ A101'),
('cust_res_1002', 'Trần Thị B', '0987654321', 'thib@example.com', 'Hà Nội, Việt Nam', '001090001235', NOW(), NOW(), 'Chủ hộ A102'),
('cust_res_1004', 'Phạm Thị D', '0934567890', 'thid@example.com', 'Hà Nội, Việt Nam', '001090001237', NOW(), NOW(), 'Chủ hộ B202');

-- 10. Seed CRM Contracts
INSERT INTO contracts (id, contract_code, customer_id, apartment_id, total_value, vat_amount, maintenance_fee, status, signed_date, handover_date, created_at, updated_at, handover_completed, title_deed_issued) VALUES
('cont_c011', 'HD-1234-101', 'cust_res_1001', 'apt_1001', 3000000000.00, 300000000.00, 60000000.00, 'SIGNED', NOW(), NOW(), NOW(), NOW(), TRUE, FALSE),
('cont_c012', 'HD-1235-102', 'cust_res_1002', 'apt_1002', 3000000000.00, 300000000.00, 60000000.00, 'SIGNED', NOW(), NOW(), NOW(), NOW(), TRUE, FALSE);

-- 11. Seed CRM Payments
INSERT INTO contract_payments (id, contract_id, installment, description, due_date, amount, paid_amount, payment_date, status, created_at, updated_at) VALUES
('pay_p011', 'cont_c011', 1, 'Đợt thanh toán thứ 1', '2026-06-01', 1000000000.00, 1000000000.00, NOW(), 'PAID', NOW(), NOW()),
('pay_p012', 'cont_c011', 2, 'Đợt thanh toán thứ 2', '2026-07-01', 1000000000.00, 0, NULL, 'PENDING', NOW(), NOW()),
('pay_p013', 'cont_c011', 3, 'Đợt thanh toán thứ 3', '2026-08-01', 1000000000.00, 0, NULL, 'PENDING', NOW(), NOW());

-- 12. Seed Bank Settings for VietQR Generator
INSERT INTO system_settings (key, value, description, updated_at) VALUES
('QR_BANK_ACCOUNT', '1234567890', 'Số tài khoản ngân hàng nhận thanh toán', NOW()),
('QR_ACCOUNT_NAME', 'BAN QUAN LY KHU DO THI', 'Tên chủ tài khoản nhận thanh toán', NOW()),
('QR_BANK_CODE', 'MB', 'Mã ngân hàng (VietinBank, Vietcombank, MB, ...)', NOW());

-- 13. Seed Email Templates (with beautiful professional templates)
INSERT INTO email_templates (code, name, subject, body, variables, updated_at) VALUES
('PAYMENT_REMINDER', 'Nhắc thanh toán công nợ', '[ThanhPhoCaPhe] Nhắc thanh toán hợp đồng {{contract_code}}', 
$$<p>Xin chào <b>{{customer_name}}</b>,</p><p>Hệ thống xin thông báo Quý khách có khoản thanh toán đến hạn:</p><ul><li>Mã hợp đồng: {{contract_code}}</li><li>Khoản thanh toán: {{payment_description}}</li><li>Số tiền: <span style="color:red; font-weight:bold">{{amount}}</span></li><li>Hạn thanh toán: {{due_date}}</li></ul><p>Vui lòng thanh toán khoản phí này trong thời gian sớm nhất để tránh phát sinh lãi chậm trả.</p><p>Trân trọng,<br>Ban Quản Lý</p>$$, 
'["customer_name", "contract_code", "payment_description", "amount", "due_date"]', NOW()),

('UTILITY_BILL', 'Thông báo cước phí Điện/Nước', '[ThanhPhoCaPhe] Thông báo tiền điện nước tháng {{month_year}} - {{apartment_code}}', 
$$<h3>Xin chào {{resident_name}},</h3><p>Thông báo cước phí Điện/Nước cho căn hộ <b>{{apartment_code}}</b> tháng <b>{{month_year}}</b>:</p><ul><li>Tiền điện: {{elec_cost}} VNĐ</li><li>Tiền nước: {{water_cost}} VNĐ</li><li><b>Tổng cộng: <span style="color:red">{{total_cost}}</span></b></li></ul><hr style="margin: 20px 0;"><h3>Thông tin thanh toán</h3><div style="text-align: center; margin: 20px 0;">{{#if qr_code_url}}<img src="{{qr_code_url}}" alt="Mã QR thanh toán" style="max-width: 300px; border: 1px solid #ddd; padding: 10px;" />{{/if}}</div><p><b>Thông tin tài khoản:</b></p><ul><li>Số tài khoản: <b>{{bank_account}}</b></li><li>Tên tài khoản: <b>{{account_name}}</b></li><li>Ngân hàng: <b>{{bank_name}}</b></li><li>Nội dung chuyển khoản: <b style="color: #d9534f;">{{transfer_content}}</b></li></ul><p style="color: #856404; background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px;"><b>Lưu ý:</b> Vui lòng ghi đúng nội dung chuyển khoản để hệ thống đối soát tự động.</p><p>Vui lòng thanh toán khoản phí này trong thời gian sớm nhất.</p><p>Trân trọng,<br>Ban Quản Lý</p>$$, 
'["resident_name", "apartment_code", "month_year", "elec_cost", "water_cost", "total_cost", "qr_code_url", "bank_account", "account_name", "bank_name", "transfer_content"]', NOW()),

('COMBINED_BILL', 'Thông báo Hóa đơn Tổng hợp', 'Thông báo hóa đơn tổng hợp T{{month_year}} - {{apartment_code}}', 
$$<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông Báo Tiền Điện Nước & Phí Quản Lý</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.15; font-size: 13px; margin: 0; padding: 0; background-color: #f4f6f9;">
<div style="max-width: 650px; margin: 20px auto; padding: 4px; border: 1px solid #e0e6ed; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">

    <h2 style="color: #1a365d; text-align: center; font-size: 20px; margin: 0 0 8px; border-bottom: 2px solid #2b6cb0; padding-bottom: 4px; line-height: 1.15;">
        THÔNG BÁO HÓA ĐƠN TỔNG HỢP
    </h2>
    
    <p style="margin: 2px 0; font-size: 14px; line-height: 1.15;">Kính gửi Quý Cư Dân <strong style="color: #d32f2f;">{{resident_name}}</strong>,</p>
    
    <p style="margin: 2px 0 6px; font-size: 14px; line-height: 1.15;">Ban Quản lý xin thông báo chi phí tổng hợp của căn hộ <strong>{{apartment_code}}</strong> trong kỳ <strong>{{month_year}}</strong> như sau:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 13px; border: 1px solid #d9e2ec;">
        
        <!-- A. TIỀN NƯỚC -->
        <tr>
            <td colspan="2" style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; color: #1a365d; background-color: #f8fafc; line-height: 1.15; text-align: center;">A. CHI TIẾT THÔNG TIN TIỀN NƯỚC:</td>
        </tr>
        <tr style="background-color: #e8f0fe; color: #1a365d;">
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Chỉ số nước cũ</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{water_old}} m³</td>
        </tr>
        <tr>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Chỉ số nước mới</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{water_new}} m³</td>
        </tr>
        <tr style="background-color: #e8f0fe; color: #1a365d;">
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Chỉ số nước tiêu thụ</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{water_usage}} m³</td>
        </tr>
        <tr>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Tiền nước</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{water_cost}}</td>
        </tr>

        <!-- B. TIỀN ĐIỆN -->
        <tr>
            <td colspan="2" style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; color: #1a365d; background-color: #f8fafc; line-height: 1.15; text-align: center;">B. CHI TIẾT THÔNG TIN TIỀN ĐIỆN:</td>
        </tr>
        <tr style="background-color: #e8f0fe; color: #1a365d;">
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Chỉ số điện cũ</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{elec_old}} kWh</td>
        </tr>
        <tr>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Chỉ số điện mới</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{elec_new}} kWh</td>
        </tr>
        <tr style="background-color: #e8f0fe; color: #1a365d;">
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Chỉ số điện tiêu thụ</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{elec_usage}} kWh</td>
        </tr>
        <tr>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Tiền điện</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{elec_cost}}</td>
        </tr>

        <!-- C. PHÍ QUẢN LÝ -->
        <tr>
            <td colspan="2" style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; color: #1a365d; background-color: #f8fafc; line-height: 1.15; text-align: center;">C. CHI TIẾT PHÍ QUẢN LÝ & DỊCH VỤ:</td>
        </tr>
        {{management_fee_rows}}
        <tr>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Tổng phí quản lý</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{management_fee_cost}}</td>
        </tr>

        <!-- TỔNG CỘNG -->
        <tr style="background-color: #fff9f9;">
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Tổng cộng (A)+(B)+(C)</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; color: #d32f2f; font-weight: bold; line-height: 1.15;">{{grand_total}}</td>
        </tr>
        <tr>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Hạn nộp</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">{{deadline}}</td>
        </tr>
        <tr style="background-color: #e8f0fe; color: #1a365d;">
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-weight: bold; line-height: 1.15;">Nội dung CK</td>
            <td style="padding: 3px 4px; border: 1px solid #d9e2ec; font-family: monospace; line-height: 1.15;">{{transfer_content}}</td>
        </tr>
    </table>
  
    {{#if qr_code_url}}
    <div style="text-align: center; margin: 6px auto; padding: 4px; background-color: #f1f5f9; border-radius: 6px; width: fit-content; max-width: 100%;">
        <p style="margin: 0 0 3px; font-size: 13px; color: #1a365d; line-height: 1.15;"><strong>Quý Cư Dân vui lòng quét mã QR để thanh toán:</strong></p>
        <div style="display: flex; justify-content: center;">
            <img src="{{qr_code_url}}" width="180" alt="QR Code" style="display: block; margin: 0 auto; border: 1px solid #cbd5e1; padding: 4px; background-color: white; border-radius: 4px;">
        </div>
    </div>
    {{/if}}
    
    <div style="margin: 6px 0; padding: 4px; background-color: #fefefe; border: 1px dashed #94a3b8; border-radius: 6px; font-size: 13px; line-height: 1.15;">
        <p style="margin: 0 0 2px; line-height: 1.15;"><strong style="color:#1a365d;">Quý Cư Dân vui lòng thanh toán trước hạn để tránh bị gián đoạn dịch vụ.</strong></p>
        <p style="margin: 2px 0; line-height: 1.15;"><strong>Thông tin thanh toán:</strong></p>
        <ul style="margin: 2px 0; padding-left: 18px; line-height: 1.15;">
            <li style="margin: 1px 0; line-height: 1.15;">Tài khoản: <strong>{{account_name}}</strong></li>
            <li style="margin: 1px 0; line-height: 1.15;">Số tài khoản: <strong>{{bank_account}}</strong></li>
            <li style="margin: 1px 0; line-height: 1.15;">Ngân hàng: <strong>{{bank_name}}</strong></li>
            <li style="margin: 1px 0; line-height: 1.15;">Nội dung CK: <strong>{{transfer_content}}</strong></li>
        </ul>
        <p style="margin: 2px 0 0; color: #475569; line-height: 1.15;">Nếu Quý Cư Dân đã thanh toán, vui lòng bỏ qua email này.<br/>
        Mọi thắc mắc xin liên hệ: <strong style="color:#1a365d;">0379 273 579</strong>.</p>
    </div>
    
    <div style="margin-top: 8px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 13px; color:#334155; line-height: 1.15;">
        <p style="margin: 0; line-height: 1.15;">Trân trọng,<br/>
        <strong style="color:#1a365d;">Ban Quản lý Vận hành khu đô thị</strong></p>
    </div>
</div>
</body>
</html>$$, 
'["resident_name", "apartment_code", "month_year", "water_old", "water_new", "water_usage", "water_cost", "elec_old", "elec_new", "elec_usage", "elec_cost", "management_fee_rows", "management_fee_cost", "grand_total", "deadline", "transfer_content", "qr_code_url", "account_name", "bank_account", "bank_name"]', NOW());

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database schema and seed data initialized successfully!';
    RAISE NOTICE 'Default admin user created: admin';
    RAISE NOTICE 'Default password: password';
    RAISE NOTICE 'Residents and CRM default data seeded successfully!';
    RAISE NOTICE '========================================';
END $$;

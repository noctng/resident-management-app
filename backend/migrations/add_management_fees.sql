-- ============================================
-- MANAGEMENT FEES FEATURE
-- Migration Script for Fee Configuration and Management Fees
-- ============================================
-- Version: 1.0
-- Date: 2026-01-23
-- Description: Thêm bảng quản lý phí quản lý và dịch vụ

-- ============================================
-- TABLE: fee_config
-- Cấu hình giá phí cơ bản
-- ============================================
CREATE TABLE IF NOT EXISTS fee_config (
    id SERIAL PRIMARY KEY,
    management_fee_per_sqm DECIMAL(10, 2) NOT NULL DEFAULT 0,
    internet_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cable_tv_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    parking_car_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    parking_motorbike_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_positive_fees CHECK (
        management_fee_per_sqm >= 0 AND
        internet_fee >= 0 AND
        cable_tv_fee >= 0 AND
        parking_car_fee >= 0 AND
        parking_motorbike_fee >= 0
    )
);

-- Index cho fee_config
CREATE INDEX idx_fee_config_effective_from ON fee_config(effective_from DESC);

-- ============================================
-- TABLE: management_fees
-- Hóa đơn phí quản lý hàng tháng
-- ============================================
CREATE TABLE IF NOT EXISTS management_fees (
    id VARCHAR(255) PRIMARY KEY,
    apartment_id VARCHAR(255) NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    
    -- Chi tiết các khoản phí
    area DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Lưu lại diện tích tại thời điểm tạo hóa đơn
    management_fee_per_sqm DECIMAL(10, 2) NOT NULL DEFAULT 0,
    management_fee DECIMAL(10, 2) NOT NULL DEFAULT 0, -- = area * management_fee_per_sqm
    internet_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cable_tv_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    parking_car_quantity INTEGER NOT NULL DEFAULT 0,
    parking_car_fee DECIMAL(10, 2) NOT NULL DEFAULT 0, -- = parking_car_quantity * parking_car_unit_fee
    parking_motorbike_quantity INTEGER NOT NULL DEFAULT 0,
    parking_motorbike_fee DECIMAL(10, 2) NOT NULL DEFAULT 0, -- = parking_motorbike_quantity * parking_motorbike_unit_fee
    
    -- Phí khác (JSON) - cho các khoản phí đặc biệt
    other_fees JSONB DEFAULT '[]'::jsonb,
    
    -- Tổng kết
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Trạng thái thanh toán
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
    payment_date TIMESTAMPTZ,
    payment_method VARCHAR(50),
    
    -- Ghi chú
    note TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Unique constraint: Một căn hộ chỉ có 1 hóa đơn cho 1 tháng
    CONSTRAINT unique_apartment_month_year UNIQUE (apartment_id, month, year),
    
    -- Check constraints
    CONSTRAINT check_positive_amounts CHECK (
        total_amount >= 0 AND
        management_fee >= 0 AND
        internet_fee >= 0 AND
        cable_tv_fee >= 0 AND
        parking_car_fee >= 0 AND
        parking_motorbike_fee >= 0
    ),
    CONSTRAINT check_parking_quantities CHECK (
        parking_car_quantity >= 0 AND
        parking_motorbike_quantity >= 0
    )
);

-- Indexes cho management_fees
CREATE INDEX idx_management_fees_apartment ON management_fees(apartment_id);
CREATE INDEX idx_management_fees_status ON management_fees(status);
CREATE INDEX idx_management_fees_year_month ON management_fees(year DESC, month DESC);
CREATE INDEX idx_management_fees_payment_date ON management_fees(payment_date);
CREATE INDEX idx_management_fees_created_at ON management_fees(created_at DESC);

-- ============================================
-- TRIGGER: Auto update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_management_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_management_fees_updated_at
    BEFORE UPDATE ON management_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_management_fees_updated_at();

-- ============================================
-- INSERT DEFAULT CONFIG
-- ============================================
-- Insert default fee configuration (giá tham khảo, cần điều chỉnh theo thực tế)
INSERT INTO fee_config (
    management_fee_per_sqm,
    internet_fee,
    cable_tv_fee,
    parking_car_fee,
    parking_motorbike_fee,
    effective_from,
    created_by
) VALUES (
    15000,  -- 15k VND/m2 (giá tham khảo)
    100000, -- 100k VND/tháng
    50000,  -- 50k VND/tháng
    1000000, -- 1tr VND/xe/tháng
    70000,  -- 70k VND/xe/tháng
    '2026-01-01',
    (SELECT id FROM users WHERE role = 0 LIMIT 1) -- Admin user
)
ON CONFLICT DO NOTHING;

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View: Tổng hợp công nợ theo căn hộ
CREATE OR REPLACE VIEW v_apartment_debt_summary AS
SELECT 
    a.id AS apartment_id,
    a.code AS apartment_code,
    a.house_type,
    COUNT(mf.id) AS total_invoices,
    SUM(CASE WHEN mf.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN mf.status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdue_count,
    SUM(CASE WHEN mf.status = 'PAID' THEN 1 ELSE 0 END) AS paid_count,
    SUM(mf.total_amount) AS total_amount,
    SUM(CASE WHEN mf.status = 'PAID' THEN mf.total_amount ELSE 0 END) AS paid_amount,
    SUM(CASE WHEN mf.status IN ('PENDING', 'OVERDUE') THEN mf.total_amount ELSE 0 END) AS debt_amount
FROM apartments a
LEFT JOIN management_fees mf ON a.id = mf.apartment_id
GROUP BY a.id, a.code, a.house_type
ORDER BY debt_amount DESC;

-- View: Tổng hợp doanh thu theo tháng
CREATE OR REPLACE VIEW v_monthly_revenue_summary AS
SELECT 
    year,
    month,
    COUNT(id) AS total_invoices,
    SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid_count,
    SUM(total_amount) AS total_revenue,
    SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) AS collected_revenue,
    SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_amount ELSE 0 END) AS uncollected_revenue,
    ROUND(
        (SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END)::NUMERIC / 
        NULLIF(SUM(total_amount), 0) * 100), 2
    ) AS collection_rate
FROM management_fees
GROUP BY year, month
ORDER BY year DESC, month DESC;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Management Fees tables created successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - fee_config';
    RAISE NOTICE '  - management_fees';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '  - v_apartment_debt_summary';
    RAISE NOTICE '  - v_monthly_revenue_summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Default configuration inserted with:';
    RAISE NOTICE '  - Management fee: 15,000 VND/m2';
    RAISE NOTICE '  - Internet: 100,000 VND/month';
    RAISE NOTICE '  - Cable TV: 50,000 VND/month';
    RAISE NOTICE '  - Car parking: 1,000,000 VND/month';
    RAISE NOTICE '  - Motorbike parking: 70,000 VND/month';
    RAISE NOTICE 'Please adjust these values in the admin panel!';
    RAISE NOTICE '========================================';
END $$;

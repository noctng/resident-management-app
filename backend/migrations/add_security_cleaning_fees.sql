-- ============================================
-- ENHANCEMENT: Add Security and Cleaning Fees
-- Migration Script
-- ============================================
-- Date: 2026-01-23
-- Description: Thêm phí bảo vệ và vệ sinh vào hệ thống

-- Add security_fee and cleaning_fee to fee_config
ALTER TABLE fee_config 
  ADD COLUMN IF NOT EXISTS security_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Update check constraint
ALTER TABLE fee_config DROP CONSTRAINT IF EXISTS check_positive_fees;
ALTER TABLE fee_config ADD CONSTRAINT check_positive_fees CHECK (
    management_fee_per_sqm >= 0 AND
    internet_fee >= 0 AND
    cable_tv_fee >= 0 AND
    parking_car_fee >= 0 AND
    parking_motorbike_fee >= 0 AND
    security_fee >= 0 AND
    cleaning_fee >= 0
);

-- Add security_fee and cleaning_fee to management_fees
ALTER TABLE management_fees
  ADD COLUMN IF NOT EXISTS security_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleaning_fee DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Update check constraint
ALTER TABLE management_fees DROP CONSTRAINT IF EXISTS check_positive_amounts;
ALTER TABLE management_fees ADD CONSTRAINT check_positive_amounts CHECK (
    total_amount >= 0 AND
    management_fee >= 0 AND
    internet_fee >= 0 AND
    cable_tv_fee >= 0 AND
    parking_car_fee >= 0 AND
    parking_motorbike_fee >= 0 AND
    security_fee >= 0 AND
    cleaning_fee >= 0
);

-- Update existing fee_config records with default values
UPDATE fee_config 
SET security_fee = 50000, cleaning_fee = 30000
WHERE security_fee = 0 AND cleaning_fee = 0;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Security and Cleaning Fees added successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New fields added:';
    RAISE NOTICE '  - security_fee (default: 50,000 VND/month)';
    RAISE NOTICE '  - cleaning_fee (default: 30,000 VND/month)';
    RAISE NOTICE 'Please update the fee configuration in admin panel!';
    RAISE NOTICE '========================================';
END $$;

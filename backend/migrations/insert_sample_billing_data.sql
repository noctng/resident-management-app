-- =====================================================
-- SAMPLE DATA FOR UNIFIED BILLING SYSTEM
-- This script creates sample data for testing the unified billing page
-- Run this after running all migrations
-- =====================================================

-- Step 1: Insert Fee Configuration (Pricing for Management Fees)
-- =====================================================
INSERT INTO fee_config (
    management_fee_per_sqm,
    internet_fee,
    cable_tv_fee,
    parking_car_fee,
    parking_motorbike_fee,
    security_fee,
    cleaning_fee,
    effective_from,
    created_at
) VALUES (
    15000,    -- 15,000 VND per m² for management fee
    150000,   -- 150,000 VND for internet
    100000,   -- 100,000 VND for cable TV
    1500000,  -- 1,500,000 VND for car parking
    100000,   -- 100,000 VND for motorbike parking
    50000,    -- 50,000 VND for security
    30000,    -- 30,000 VND for cleaning
    '2025-01-01',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Insert Electricity Pricing Tiers
-- =====================================================
-- Delete existing tiers first to avoid duplicates
DELETE FROM electricity_pricing WHERE 1=1;

-- Tier 1: 0-50 kWh
INSERT INTO electricity_pricing (tier, min_kwh, max_kwh, price_per_kwh, created_at)
VALUES (1, 0, 50, 1678, NOW());

-- Tier 2: 51-100 kWh
INSERT INTO electricity_pricing (tier, min_kwh, max_kwh, price_per_kwh, created_at)
VALUES (2, 51, 100, 1734, NOW());

-- Tier 3: 101-200 kWh
INSERT INTO electricity_pricing (tier, min_kwh, max_kwh, price_per_kwh, created_at)
VALUES (3, 101, 200, 2014, NOW());

-- Tier 4: 201-300 kWh
INSERT INTO electricity_pricing (tier, min_kwh, max_kwh, price_per_kwh, created_at)
VALUES (4, 201, 300, 2536, NOW());

-- Tier 5: 301-400 kWh
INSERT INTO electricity_pricing (tier, min_kwh, max_kwh, price_per_kwh, created_at)
VALUES (5, 301, 400, 2834, NOW());

-- Tier 6: 401+ kWh
INSERT INTO electricity_pricing (tier, min_kwh, max_kwh, price_per_kwh, created_at)
VALUES (6, 401, NULL, 2927, NOW());

-- Step 3: Insert Water Pricing
-- =====================================================
DELETE FROM water_pricing WHERE 1=1;

INSERT INTO water_pricing (tier, min_m3, max_m3, price_per_m3, created_at)
VALUES (1, 0, NULL, 15000, NOW());  -- Flat rate: 15,000 VND per m³

-- Step 4: Generate Management Fees for December 2025
-- =====================================================
-- This will create management fee records for all apartments for month 12/2025
INSERT INTO management_fees (
    id,
    apartment_id,
    month,
    year,
    area,
    management_fee_per_sqm,
    management_fee,
    internet_fee,
    cable_tv_fee,
    parking_car_quantity,
    parking_car_fee,
    parking_motorbike_quantity,
    parking_motorbike_fee,
    security_fee,
    cleaning_fee,
    total_amount,
    status,
    created_at,
    updated_at
)
SELECT 
    'mgmt_fee_' || a.id || '_12_2025' as id,  -- Generate unique ID
    a.id as apartment_id,
    12 as month,
    2025 as year,
    a.area,
    -- Management fee per sqm
    fc.management_fee_per_sqm,
    -- Calculate management fee based on area
    ROUND(a.area * fc.management_fee_per_sqm) as management_fee,
    -- Default service fees
    fc.internet_fee,
    fc.cable_tv_fee,
    -- Parking quantities and fees
    CASE 
        WHEN (ROW_NUMBER() OVER (ORDER BY a.id)) % 3 = 0 THEN 1
        ELSE 0
    END as parking_car_quantity,
    CASE 
        WHEN (ROW_NUMBER() OVER (ORDER BY a.id)) % 3 = 0 THEN fc.parking_car_fee
        ELSE 0
    END as parking_car_fee,
    CASE 
        WHEN (ROW_NUMBER() OVER (ORDER BY a.id)) % 3 != 0 THEN 1
        ELSE 0
    END as parking_motorbike_quantity,
    CASE 
        WHEN (ROW_NUMBER() OVER (ORDER BY a.id)) % 3 != 0 THEN fc.parking_motorbike_fee
        ELSE 0
    END as parking_motorbike_fee,
    fc.security_fee,
    fc.cleaning_fee,
    -- Calculate total
    ROUND(a.area * fc.management_fee_per_sqm) + 
    fc.internet_fee + 
    fc.cable_tv_fee + 
    fc.security_fee + 
    fc.cleaning_fee +
    CASE 
        WHEN (ROW_NUMBER() OVER (ORDER BY a.id)) % 3 = 0 THEN fc.parking_car_fee
        ELSE fc.parking_motorbike_fee
    END as total_amount,
    'PENDING' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM apartments a
CROSS JOIN fee_config fc
WHERE fc.id = (SELECT id FROM fee_config ORDER BY effective_from DESC LIMIT 1)
AND NOT EXISTS (
    -- Don't create duplicate records
    SELECT 1 FROM management_fees mf 
    WHERE mf.apartment_id = a.id 
    AND mf.month = 12 
    AND mf.year = 2025
);

-- Step 5: Create Sample Utility Records for December 2025
-- =====================================================
-- This creates utility records with realistic electricity and water usage
INSERT INTO utility_records (
    id,
    apartment_id,
    month,
    year,
    electricity_old_reading,
    electricity_new_reading,
    -- electricity_consumption (generated),
    water_old_reading,
    water_new_reading,
    -- water_consumption (generated),
    -- water_amount removed
    electricity_cost,
    water_cost,
    payment_status
)
SELECT 
    'util_rec_' || a.id || '_12_2025' as id,
    a.id as apartment_id,
    12 as month,
    2025 as year,
    -- Electricity readings (simulate realistic usage)
    500 + (ROW_NUMBER() OVER (ORDER BY a.id)) * 10 as electricity_old_reading,
    500 + (ROW_NUMBER() OVER (ORDER BY a.id)) * 10 + 
        (50 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 150) as electricity_new_reading,
    -- electricity_consumption calculated automatically
    
    -- Water readings
    150 + (ROW_NUMBER() OVER (ORDER BY a.id)) * 5 as water_old_reading,
    150 + (ROW_NUMBER() OVER (ORDER BY a.id)) * 5 + 
        (10 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 30) as water_new_reading,
    -- water_consumption calculated automatically
    
    -- Removed unused alias definitions for electricity_amount/water_amount
    
    -- Mapping aliases to actual columns
    -- electricity_amount -> electricity_cost
    CASE 
        WHEN (50 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 150) <= 50 THEN 
            (50 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 150) * 1678
        WHEN (50 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 150) <= 100 THEN 
            50 * 1678 + ((50 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 150) - 50) * 1734
        WHEN (50 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 150) <= 200 THEN 
            50 * 1678 + 50 * 1734 + ((50 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 150) - 100) * 2014
        ELSE 
            50 * 1678 + 50 * 1734 + 100 * 2014 + ((50 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 150) - 200) * 2536
    END as electricity_cost,

    (10 + (ROW_NUMBER() OVER (ORDER BY a.id)) % 30) * 15000 as water_cost,

    'UNPAID' as payment_status
FROM apartments a
WHERE NOT EXISTS (
    -- Don't create duplicate records
    SELECT 1 FROM utility_records ur 
    WHERE ur.apartment_id = a.id 
    AND ur.month = 12 
    AND ur.year = 2025
);

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check fee config
SELECT 'Fee Config Created:' as info, COUNT(*) as count FROM fee_config;

-- Check pricing tiers
SELECT 'Electricity Tiers:' as info, COUNT(*) as count FROM electricity_pricing;
SELECT 'Water Tiers:' as info, COUNT(*) as count FROM water_pricing;

-- Check management fees created
SELECT 'Management Fees (Dec 2025):' as info, COUNT(*) as count 
FROM management_fees 
WHERE month = 12 AND year = 2025;

-- Check utility records created
SELECT 'Utility Records (Dec 2025):' as info, COUNT(*) as count 
FROM utility_records 
WHERE month = 12 AND year = 2025;

-- Show sample data
SELECT 
    a.code as apartment,
    ur.electricity_consumption,
    ur.electricity_cost,
    ur.water_consumption,
    ur.water_cost,
    mf.total_amount as mgmt_fee_total
FROM apartments a
LEFT JOIN utility_records ur ON ur.apartment_id = a.id AND ur.month = 12 AND ur.year = 2025
LEFT JOIN management_fees mf ON mf.apartment_id = a.id AND mf.month = 12 AND mf.year = 2025
LIMIT 10;

COMMIT;

-- =====================================================
-- UTILITY PRICING TABLES
-- Migration to create electricity and water pricing tables
-- =====================================================

-- Create electricity_pricing table
CREATE TABLE IF NOT EXISTS electricity_pricing (
    id SERIAL PRIMARY KEY,
    tier INTEGER NOT NULL UNIQUE,
    min_kwh INTEGER NOT NULL,
    max_kwh INTEGER,  -- NULL means unlimited
    price_per_kwh DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tier_positive CHECK (tier > 0),
    CONSTRAINT check_kwh_range CHECK (min_kwh >= 0 AND (max_kwh IS NULL OR max_kwh > min_kwh)),
    CONSTRAINT check_price_positive CHECK (price_per_kwh > 0)
);

-- Create water_pricing table
CREATE TABLE IF NOT EXISTS water_pricing (
    id SERIAL PRIMARY KEY,
    tier INTEGER NOT NULL UNIQUE,
    min_m3 INTEGER NOT NULL,
    max_m3 INTEGER,  -- NULL means unlimited
    price_per_m3 DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_tier_positive CHECK (tier > 0),
    CONSTRAINT check_m3_range CHECK (min_m3 >= 0 AND (max_m3 IS NULL OR max_m3 > min_m3)),
    CONSTRAINT check_price_positive CHECK (price_per_m3 > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_electricity_pricing_tier ON electricity_pricing(tier);
CREATE INDEX IF NOT EXISTS idx_water_pricing_tier ON water_pricing(tier);

-- Completion message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Utility Pricing tables created successfully!';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - electricity_pricing';
    RAISE NOTICE '  - water_pricing';
    RAISE NOTICE '========================================';
END $$;

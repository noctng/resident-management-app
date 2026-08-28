-- Migration: Add permissions column to users table
-- Date: 2026-01-16
-- Description: Add permissions array field to support role-based access control

-- Step 1: Add permissions column (JSONB type for PostgreSQL)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Step 2: Set default permissions for existing users
-- Admin (role = 0) gets all permissions
UPDATE users 
SET permissions = '["dashboard", "apartments", "residents", "utilities", "amenities", "feedback", "resident_accounts", "users", "configuration", "logs"]'::jsonb
WHERE role = 0 AND (permissions IS NULL OR permissions = '[]'::jsonb);

-- Manager (role = 1) gets default permissions (dashboard and amenities)
UPDATE users 
SET permissions = '["dashboard", "amenities"]'::jsonb
WHERE role = 1 AND (permissions IS NULL OR permissions = '[]'::jsonb);

-- Step 3: Verify migration
SELECT 
    id,
    username,
    role,
    CASE 
        WHEN role = 0 THEN 'Admin'
        WHEN role = 1 THEN 'Manager'
        ELSE 'Unknown'
    END as role_name,
    permissions
FROM users
ORDER BY role, username;

-- Optional: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);

COMMENT ON COLUMN users.permissions IS 'Array of permission strings for role-based access control';

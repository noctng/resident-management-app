-- ============================================================
-- RBAC Schema Migration (Blueprint A.4 + E.1)
-- Tạo 3 bảng: roles, user_roles, role_permissions
-- + data-fix map user cũ (role Int) sang user_roles
-- Chạy: psql -f backend/migrations/rbac_schema.sql (hoặc qua db client)
-- ============================================================

-- 1. Bảng roles (17 vai trò blueprint)
CREATE TABLE IF NOT EXISTS roles (
  code        VARCHAR(32)  PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  subsystem   VARCHAR(32)  NOT NULL DEFAULT 'chung',  -- ban_hang | van_hanh | chung
  description TEXT,
  is_system   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. Bảng user_roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id   VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code VARCHAR(32)  NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_code)
);

-- 3. Bảng role_permissions (ma trận CRUDA)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_code VARCHAR(32) NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  module    VARCHAR(64) NOT NULL,  -- apartments, residents, utilities, ...
  action    VARCHAR(4)  NOT NULL,  -- C | R | U | D | A
  PRIMARY KEY (role_code, module, action)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions(role_code);

-- ============================================================
-- Data-fix: map user cũ sang user_roles
--   role = 0 (Admin cũ)     -> ADMIN (tất cả quyền)
--   role = 1 (Manager cũ)   -> MANAGER (tất cả quyền, theo quyết định dự án)
-- ============================================================

-- Insert 2 role hệ thống legacy (full-permission)
INSERT INTO roles (code, name, subsystem, description, is_system) VALUES
  ('ADMIN',   'Quản trị hệ thống',   'chung',   'Full quyền (legacy role=0)',        TRUE),
  ('MANAGER', 'Quản lý (legacy)',    'chung',   'Full quyền (legacy role=1)',        TRUE)
ON CONFLICT (code) DO NOTHING;

-- ADMIN: cấp toàn bộ module:action (CRUDA)
INSERT INTO role_permissions (role_code, module, action)
SELECT 'ADMIN', m.module, a.action
FROM (VALUES ('dashboard'),('apartments'),('residents'),('utilities'),('amenities'),
      ('feedback'),('resident_accounts'),('users'),('configuration'),('logs'),('crm'),
      ('meter_reading'),('vehicles'),('construction'),('contracts'),('billing'),('handover')
     ) AS m(module)
CROSS JOIN (VALUES ('C'),('R'),('U'),('D'),('A')) AS a(action)
ON CONFLICT DO NOTHING;

-- MANAGER: cũng full quyền (theo quyết định: manager cũ = cao nhất, tất cả quyền)
INSERT INTO role_permissions (role_code, module, action)
SELECT 'MANAGER', m.module, a.action
FROM (VALUES ('dashboard'),('apartments'),('residents'),('utilities'),('amenities'),
      ('feedback'),('resident_accounts'),('users'),('configuration'),('logs'),('crm'),
      ('meter_reading'),('vehicles'),('construction'),('contracts'),('billing'),('handover')
     ) AS m(module)
CROSS JOIN (VALUES ('C'),('R'),('U'),('D'),('A')) AS a(action)
ON CONFLICT DO NOTHING;

-- Gán user cũ
INSERT INTO user_roles (user_id, role_code)
SELECT id, 'ADMIN'   FROM users WHERE role = 0 AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = users.id)
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_code)
SELECT id, 'MANAGER' FROM users WHERE role = 1 AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = users.id)
ON CONFLICT DO NOTHING;

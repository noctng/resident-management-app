-- ============================================================
-- RBAC Giai đoạn 2: Seed 17 vai trò blueprint (A.4) + ma trận CRUDA mặc định
-- Không xóa ADMIN/MANAGER (legacy full-quyền) từ GĐ1.
-- Quy tắc: mỗi role có R (Xem) trên module thuộc phân hệ + C/U/A theo trách nhiệm A.4.
-- ADMIN/MANAGER giữ full (85 quyền) từ GĐ1.
-- ============================================================

-- 1. Insert 15 vai trò blueprint mới (không trùng ADMIN/MANAGER)
INSERT INTO roles (code, name, subsystem, description, is_system) VALUES
  ('DIR',       'Ban điều hành',           'chung',     'Xem mọi báo cáo, duyệt vượt hạn mức',                 TRUE),
  ('SM',        'Giám đốc kinh doanh',     'ban_hang',  'Chính sách giá/CK/hoa hồng, duyệt HĐ',               TRUE),
  ('SHEAD',     'Trưởng phòng kinh doanh', 'ban_hang',  'Quản lý team, phân lead, duyệt giữ chỗ',             TRUE),
  ('SALE',      'Nhân viên kinh doanh',    'ban_hang',  'Lead/chăm sóc/giỏ hàng/giữ chỗ/cọc',                 TRUE),
  ('AGENT',     'Đại lý/kênh',             'ban_hang',  'Giữ chỗ/cọc hộ khách qua cổng đối tác',             TRUE),
  ('CS',        'Chăm sóc khách hàng',      'ban_hang',  'Tiếp nhận tổng đài, hỗ trợ sau bán hàng',           TRUE),
  ('ACC-S',     'Kế toán bán hàng',        'ban_hang',  'Phiếu thu, đối soát, công nợ, xuất HĐ',              TRUE),
  ('LAW',       'Pháp chế hợp đồng',       'ban_hang',  'Mẫu HĐ, rà pháp lý, trình ký',                       TRUE),
  ('PMO',       'Điều hành bàn giao',      'chung',     'Kế hoạch bàn giao, nghiệm thu, cầu nối vận hành',    TRUE),
  ('PMS-M',     'Trưởng BQL KĐT',          'van_hanh',  'Biểu phí, miễn giảm/thi công/ký quỹ, SLA',           TRUE),
  ('PMS-FE',    'Nhân sự BQL (tiếp nhận)', 'van_hanh',  'Hỏi đáp quầy, tiếp nhận phản ánh, ghi chỉ số',       TRUE),
  ('PMS-BILL',  'Kế toán dịch vụ',         'van_hanh',  'Chốt công tơ, tính phí, hóa đơn, công nợ cư dân',    TRUE),
  ('PMS-TECH',  'Kỹ thuật/bảo trì',        'van_hanh',  'Xử lý phản ánh kỹ thuật, CMMS, nghiệm thu thi công', TRUE),
  ('PMS-SEC',   'An ninh/kiểm soát',       'van_hanh',  'Ra vào, xe, khách, giao hàng',                       TRUE),
  ('RESIDENT',  'Cư dân',                  'cổng',      'Xem hóa đơn, thanh toán, phản ánh, đặt tiện ích',    TRUE),
  ('AUDIT',     'Kiểm toán nội bộ',        'chung',     'Chỉ đọc toàn bộ (kể cả nhật ký)',                   TRUE)
ON CONFLICT (code) DO NOTHING;

-- Helper: gán R (Xem) trên toàn bộ module cho 1 role
-- (dùng CROSS JOIN danh sách module chuẩn)
WITH modules(mod) AS (
  VALUES ('dashboard'),('apartments'),('residents'),('utilities'),('amenities'),
         ('feedback'),('resident_accounts'),('users'),('configuration'),('logs'),
         ('crm'),('crm_approve'),('unified_billing'),('vehicles'),('meter_reading'),
         ('announcements'),('contracts'),('pricebook'),('leads'),('deposits'),
         ('handover'),('commission'),('revenue'),('construction'),('billing'),
         ('warranty')
)
INSERT INTO role_permissions (role_code, module, action)
SELECT r.code, m.mod, 'R'
FROM roles r CROSS JOIN modules m
WHERE r.code IN ('DIR','SM','SHEAD','SALE','AGENT','CS','ACC-S','LAW','PMO',
                 'PMS-M','PMS-FE','PMS-BILL','PMS-TECH','PMS-SEC','RESIDENT','AUDIT')
ON CONFLICT DO NOTHING;

-- 2. Ma trận CRUDA theo trách nhiệm (A.4) — chỉ thêm C/U/A (R đã có)
-- DIR: duyệt vượt hạn (A) trên mọi module nghiệp vụ
INSERT INTO role_permissions (role_code, module, action)
SELECT 'DIR', m.mod, 'A'
FROM (VALUES ('crm'),('crm_approve'),('unified_billing'),('billing'),('construction'),
      ('vehicles'),('deposits'),('handover'),('commission')) AS m(mod)
ON CONFLICT DO NOTHING;

-- SM (Giám đốc KD): crm CRUD + pricebook CU + crm_approve A + contracts RU + unified_billing A (vượt hạn mức)
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('SM','crm','C'),('SM','crm','U'),('SM','crm','D'),
  ('SM','pricebook','C'),('SM','pricebook','U'),
  ('SM','crm_approve','A'),
  ('SM','contracts','R'),('SM','contracts','U'),
  ('SM','unified_billing','A')
ON CONFLICT DO NOTHING;

-- SHEAD (Trưởng phòng KD): crm CU + crm_approve A + pricebook CU
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('SHEAD','crm','C'),('SHEAD','crm','U'),
  ('SHEAD','pricebook','C'),('SHEAD','pricebook','U'),
  ('SHEAD','crm_approve','A'),
  ('SHEAD','deposits','A')
ON CONFLICT DO NOTHING;

-- SALE: crm C/U (của mình) + contracts RU + deposits CU
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('SALE','crm','C'),('SALE','crm','U'),
  ('SALE','contracts','R'),('SALE','contracts','U'),
  ('SALE','deposits','C'),('SALE','deposits','U')
ON CONFLICT DO NOTHING;

-- AGENT: crm C (của mình) + deposits C (giữ chỗ/cọc hộ khách)
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('AGENT','crm','C'),
  ('AGENT','deposits','C')
ON CONFLICT DO NOTHING;

-- CS: crm RU + feedback RU
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('CS','crm','U'),('CS','feedback','R'),('CS','feedback','U'),('CS','feedback','C')
ON CONFLICT DO NOTHING;

-- ACC-S: billing CU + revenue R + crm R
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('ACC-S','unified_billing','C'),('ACC-S','unified_billing','U'),
  ('ACC-S','billing','C'),('ACC-S','billing','U'),
  ('ACC-S','revenue','R'),('ACC-S','commission','R')
ON CONFLICT DO NOTHING;

-- LAW: contracts RU
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('LAW','contracts','R'),('LAW','contracts','U')
ON CONFLICT DO NOTHING;

-- PMO: handover RU + apartments/residents R + handover C (lập kế hoạch bàn giao)
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('PMO','handover','R'),('PMO','handover','U'),('PMO','handover','C'),
  ('PMO','apartments','R'),('PMO','residents','R')
ON CONFLICT DO NOTHING;

-- PMS-M: toàn bộ vận hành CRUD + A duyệt (miễn giảm/thi công/ký quỹ per A.4)
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('PMS-M','apartments','C'),('PMS-M','apartments','U'),('PMS-M','apartments','D'),
  ('PMS-M','residents','C'),('PMS-M','residents','U'),('PMS-M','residents','D'),
  ('PMS-M','utilities','C'),('PMS-M','utilities','U'),
  ('PMS-M','amenities','C'),('PMS-M','amenities','U'),
  ('PMS-M','vehicles','C'),('PMS-M','vehicles','U'),('PMS-M','vehicles','A'),
  ('PMS-M','construction','C'),('PMS-M','construction','U'),('PMS-M','construction','A'),
  ('PMS-M','unified_billing','C'),('PMS-M','unified_billing','U'),('PMS-M','unified_billing','A'),
  ('PMS-M','billing','A'),('PMS-M','feedback','A'),
  ('PMS-M','warranty','C'),('PMS-M','warranty','U'),('PMS-M','warranty','A'),
  ('PMS-M','meter_reading','A')
ON CONFLICT DO NOTHING;

-- PMS-FE: residents RU + feedback RU + amenities RU + meter_reading C (ghi chỉ số)
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('PMS-FE','residents','R'),('PMS-FE','residents','U'),
  ('PMS-FE','feedback','R'),('PMS-FE','feedback','U'),('PMS-FE','feedback','C'),
  ('PMS-FE','amenities','R'),('PMS-FE','amenities','U'),
  ('PMS-FE','meter_reading','C')
ON CONFLICT DO NOTHING;

-- PMS-BILL: utilities CU + billing CU + meter_reading CU + billing A
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('PMS-BILL','utilities','C'),('PMS-BILL','utilities','U'),
  ('PMS-BILL','meter_reading','C'),('PMS-BILL','meter_reading','U'),
  ('PMS-BILL','unified_billing','C'),('PMS-BILL','unified_billing','U'),('PMS-BILL','unified_billing','A'),
  ('PMS-BILL','billing','C'),('PMS-BILL','billing','U'),('PMS-BILL','billing','A')
ON CONFLICT DO NOTHING;

-- PMS-TECH: construction CU + feedback RU + utilities R
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('PMS-TECH','construction','C'),('PMS-TECH','construction','U'),('PMS-TECH','construction','A'),
  ('PMS-TECH','feedback','R'),('PMS-TECH','feedback','U'),('PMS-TECH','feedback','C'),
  ('PMS-TECH','utilities','R'),('PMS-TECH','meter_reading','R'),
  ('PMS-TECH','warranty','C'),('PMS-TECH','warranty','U')
ON CONFLICT DO NOTHING;

-- PMS-SEC: vehicles RU + residents R
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('PMS-SEC','vehicles','R'),('PMS-SEC','vehicles','U'),
  ('PMS-SEC','residents','R')
ON CONFLICT DO NOTHING;

-- RESIDENT: quyền cổng (own data) — C/U trên module tự phục vụ
INSERT INTO role_permissions (role_code, module, action) VALUES
  ('RESIDENT','feedback','C'),('RESIDENT','feedback','U'),
  ('RESIDENT','amenities','C'),
  ('RESIDENT','vehicles','C'),
  ('RESIDENT','residents','U')
ON CONFLICT DO NOTHING;

-- AUDIT: chỉ R (đã có từ helper) — không thêm C/U/D/A

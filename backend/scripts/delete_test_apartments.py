"""
Xóa toàn bộ 37 căn hộ không có trong file Excel T04/2026 cùng
với cư dân giả/test và tất cả dữ liệu phụ thuộc.

Thứ tự xóa (tránh FK violation):
  1. resident_feedback (NO ACTION)
  2. approval_workflows (RESTRICT from contracts)
  3. contracts + cascade (contract_payments, contract_documents, contract_lifecycle_events, contract_transfers)
  4. apartments + cascade (utility_records, occupancies, management_fees, amenity_usage, vehicles)
  5. Orphan residents (không còn liên kết với bất kỳ căn hộ nào)
"""
import sys, io
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg2, openpyxl

EXCEL_PATH = r'D:\resident-management-app.v1\resident-management-app\public\utility_import_T04_2026.xlsx'
DB_CONFIG  = dict(host='172.16.17.19', port=54328, dbname='data_qlcd',
                  user='postgres', password='TNGbmt@123')

# ── Lấy danh sách mã căn hộ từ Excel ─────────────────────────────────────────
wb   = openpyxl.load_workbook(EXCEL_PATH)
excel_codes = {(row[2] or '').strip()
               for row in wb.active.iter_rows(min_row=2, values_only=True)
               if row[2]}

# ── Connect ───────────────────────────────────────────────────────────────────
conn = psycopg2.connect(**DB_CONFIG)
conn.autocommit = False
cur  = conn.cursor()

# ── Xác định 37 căn hộ cần xóa ───────────────────────────────────────────────
cur.execute('SELECT id, code FROM apartments ORDER BY code')
all_apts = cur.fetchall()
target_apts = [(aid, code) for aid, code in all_apts if code not in excel_codes]
target_ids  = [aid for aid, _ in target_apts]
target_codes = [code for _, code in target_apts]

print('='*70)
print(f'🗑️  Căn hộ sẽ xóa: {len(target_apts)}')
for aid, code in target_apts:
    print(f'   {code} (id={aid})')
print()

# ── DRY RUN: kiểm tra dữ liệu sẽ bị ảnh hưởng ───────────────────────────────
cur.execute("SELECT COUNT(*) FROM resident_feedback WHERE apartment_id = ANY(%s)", (target_ids,))
n_feedback = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM contracts WHERE apartment_id = ANY(%s)", (target_ids,))
n_contracts = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM approval_workflows WHERE contract_id IN (SELECT id FROM contracts WHERE apartment_id = ANY(%s))", (target_ids,))
n_approvals = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM utility_records WHERE apartment_id = ANY(%s)", (target_ids,))
n_utils = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM occupancies WHERE apartment_id = ANY(%s)", (target_ids,))
n_occ = cur.fetchone()[0]

cur.execute("""
    SELECT COUNT(DISTINCT r.id) FROM residents r
    JOIN occupancies o ON o.resident_id = r.id
    WHERE o.apartment_id = ANY(%s)
""", (target_ids,))
n_res_linked = cur.fetchone()[0]

print('📋 Dữ liệu sẽ bị xóa:')
print(f'   🏢 Căn hộ:           {len(target_apts)}')
print(f'   💬 Resident feedback: {n_feedback}')
print(f'   📄 Hợp đồng:         {n_contracts}')
print(f'   ✅ Approval flows:    {n_approvals}')
print(f'   ⚡ Utility records:   {n_utils}')
print(f'   🔗 Occupancies:       {n_occ}')
print(f'   👤 Cư dân liên kết:   {n_res_linked} (sẽ kiểm tra orphan sau)')
print()

# ── BẮT ĐẦU XÓA ──────────────────────────────────────────────────────────────
print('🚀 Bắt đầu xóa...')

# Step 1: resident_feedback (NO ACTION)
cur.execute("DELETE FROM resident_feedback WHERE apartment_id = ANY(%s)", (target_ids,))
print(f'  ✅ Step 1: Xóa {cur.rowcount} resident_feedback')

# Step 2: approval_workflows (RESTRICT từ contracts)
cur.execute("""
    DELETE FROM approval_workflows
    WHERE contract_id IN (SELECT id FROM contracts WHERE apartment_id = ANY(%s))
""", (target_ids,))
print(f'  ✅ Step 2: Xóa {cur.rowcount} approval_workflows')

# Step 3: contracts (cascade → contract_payments, contract_documents,
#                           contract_lifecycle_events, contract_transfers)
cur.execute("DELETE FROM contracts WHERE apartment_id = ANY(%s)", (target_ids,))
print(f'  ✅ Step 3: Xóa {cur.rowcount} contracts (+ cascade payments/docs/events/transfers)')

# Step 4: apartments → cascade (utility_records, occupancies, management_fees,
#                                amenity_usage, vehicles, push_subscriptions)
cur.execute("DELETE FROM apartments WHERE id = ANY(%s)", (target_ids,))
print(f'  ✅ Step 4: Xóa {cur.rowcount} apartments (+ cascade utilities/occ/fees/amenity/vehicles)')

# Step 5: orphan residents (không còn liên kết với bất kỳ căn hộ nào)
cur.execute("""
    SELECT r.id, r.name, r.phone_number
    FROM residents r
    WHERE NOT EXISTS (
        SELECT 1 FROM occupancies o WHERE o.resident_id = r.id
    )
    AND r.id NOT IN (
        SELECT DISTINCT resident_id FROM resident_accounts
    )
    ORDER BY r.name
""")
orphan_residents = cur.fetchall()
print(f'\n  👤 Orphan residents (không còn căn hộ nào): {len(orphan_residents)}')
for rid, name, phone in orphan_residents:
    print(f'     - {name} | {phone or "no phone"}')

if orphan_residents:
    orphan_ids = [r[0] for r in orphan_residents]
    cur.execute("DELETE FROM residents WHERE id = ANY(%s)", (orphan_ids,))
    print(f'  ✅ Step 5: Xóa {cur.rowcount} orphan residents')
else:
    print('  ✅ Step 5: Không có orphan residents')

# ── Commit ────────────────────────────────────────────────────────────────────
conn.commit()
cur.close()
conn.close()

print()
print('='*70)
print('✅  XÓA HOÀN TẤT – KHÔNG CÓ LỖI')
print('='*70)
print(f'  Đã xóa {len(target_apts)} căn hộ test và dữ liệu liên quan')
print(f'  Đã xóa {len(orphan_residents)} cư dân không còn liên kết')
print('='*70)

"""
Cập nhật 86 bản ghi utility_records T04/2026 bị lệch kỳ.
Bỏ qua TES05-04 (cần xem xét riêng).
"""
import sys, io
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg2
import openpyxl

EXCEL_PATH = r'D:\resident-management-app.v1\resident-management-app\public\utility_import_T04_2026.xlsx'
DB_CONFIG  = dict(host='172.16.17.19', port=54328, dbname='data_qlcd',
                  user='postgres', password='TNGbmt@123')
SKIP_CODES = {'TES05-04'}   # cần xem xét riêng

def safe_float(v, default=0.0) -> float:
    try:    return float(v) if v is not None else default
    except: return default

def fmt(v) -> str:
    try:    return f'{float(v):,.0f}'
    except: return str(v)

# ── Load Excel ────────────────────────────────────────────────────────────────
wb   = openpyxl.load_workbook(EXCEL_PATH)
rows = list(wb.active.iter_rows(min_row=2, values_only=True))

excel: dict[str, dict] = {}
for row in rows:
    (month, year, code, name, w_old, w_new, e_old, e_new,
     w_cost, e_cost, *_) = row
    if not code: continue
    excel[code.strip()] = dict(
        e_old=safe_float(e_old), e_new=safe_float(e_new),
        w_old=safe_float(w_old), w_new=safe_float(w_new),
        e_cost=safe_float(e_cost), w_cost=safe_float(w_cost),
        name=(name or '').strip()
    )

# ── Connect DB ────────────────────────────────────────────────────────────────
conn = psycopg2.connect(**DB_CONFIG)
conn.autocommit = False
cur  = conn.cursor()

# Load DB records T04/2026
cur.execute("""
    SELECT ur.id, a.code,
           ur.electricity_old_reading, ur.electricity_new_reading,
           ur.water_old_reading, ur.water_new_reading,
           ur.electricity_cost, ur.water_cost
    FROM utility_records ur
    JOIN apartments a ON ur.apartment_id = a.id
    WHERE ur.month = 4 AND ur.year = 2026
    ORDER BY a.code
""")
db_rows = cur.fetchall()

db: dict[str, dict] = {}
for ur_id, code, e_old, e_new, w_old, w_new, e_cost, w_cost in db_rows:
    db[code] = dict(
        ur_id=ur_id,
        e_old=float(e_old), e_new=float(e_new),
        w_old=float(w_old), w_new=float(w_new),
        e_cost=float(e_cost), w_cost=float(w_cost),
    )

# ── Identify shifted records ──────────────────────────────────────────────────
to_update = []
skipped   = []

for code in sorted(set(excel) & set(db)):
    if code in SKIP_CODES:
        skipped.append(code)
        continue

    ex = excel[code]
    d  = db[code]

    # Shift pattern: DB.new ≈ Excel.old
    is_shifted = (abs(d['e_new'] - ex['e_old']) < 0.5 and
                  abs(d['w_new'] - ex['w_old']) < 0.5)

    if is_shifted:
        to_update.append((code, ex, d))

print(f'📋 Bản ghi cần UPDATE: {len(to_update)}')
print(f'⏭️  Bỏ qua:            {skipped}')
print()

# ── Update ────────────────────────────────────────────────────────────────────
updated = []
errors  = []

for code, ex, d in to_update:
    cur.execute('SAVEPOINT upd_sp')
    try:
        cur.execute("""
            UPDATE utility_records SET
                electricity_old_reading = %s,
                electricity_new_reading = %s,
                water_old_reading       = %s,
                water_new_reading       = %s,
                electricity_cost        = %s,
                water_cost              = %s
            WHERE id = %s
        """, (
            ex['e_old'], ex['e_new'],
            ex['w_old'], ex['w_new'],
            ex['e_cost'], ex['w_cost'],
            d['ur_id']
        ))
        cur.execute('RELEASE SAVEPOINT upd_sp')
        updated.append(code)
        print(f'  ✅ {code:<14} [{ex["name"]}]'
              f'  Điện: {fmt(d["e_old"])}→{fmt(d["e_new"])} ➜ {fmt(ex["e_old"])}→{fmt(ex["e_new"])}'
              f'  |  Nước: {fmt(d["w_old"])}→{fmt(d["w_new"])} ➜ {fmt(ex["w_old"])}→{fmt(ex["w_new"])}')
    except Exception as e:
        cur.execute('ROLLBACK TO SAVEPOINT upd_sp')
        cur.execute('RELEASE SAVEPOINT upd_sp')
        errors.append(f'{code}: {e}')
        print(f'  ❌ {code}: {e}')

# ── Commit ────────────────────────────────────────────────────────────────────
conn.commit()
cur.close()
conn.close()

print()
print('='*70)
print('✅  CẬP NHẬT HOÀN TẤT')
print('='*70)
print(f'  Đã cập nhật: {len(updated):>3}  bản ghi')
print(f'  Bỏ qua:      {len(skipped):>3}  bản ghi ({", ".join(skipped)})')
print(f'  Lỗi:         {len(errors):>3}  bản ghi')
if errors:
    print()
    for e in errors:
        print(f'  ❌ {e}')
print('='*70)

"""
So sánh chi tiết chỉ số điện nước T04/2026 – bản phân tích ngắn gọn.
"""
import sys, io
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg2
import openpyxl

EXCEL_PATH = r'D:\resident-management-app.v1\resident-management-app\public\utility_import_T04_2026.xlsx'
DB_CONFIG  = dict(host='172.16.17.19', port=54328, dbname='data_qlcd',
                  user='postgres', password='TNGbmt@123')

def safe_float(v, default=0.0) -> float:
    try:    return float(v) if v is not None else default
    except: return default

def fmt(v) -> str:
    try:    return f'{float(v):>12,.0f}'
    except: return str(v).rjust(12)

# ── Load Excel ────────────────────────────────────────────────────────────────
wb   = openpyxl.load_workbook(EXCEL_PATH)
rows = list(wb.active.iter_rows(min_row=2, values_only=True))

excel: dict[str, dict] = {}
for row in rows:
    (month, year, code, name, w_old, w_new, e_old, e_new,
     w_cost, e_cost, usage, phone, *_) = row
    if not code: continue
    excel[code.strip()] = dict(
        e_old=safe_float(e_old), e_new=safe_float(e_new),
        w_old=safe_float(w_old), w_new=safe_float(w_new),
        e_cost=safe_float(e_cost), w_cost=safe_float(w_cost),
        name=(name or '').strip()
    )

# ── Load DB ───────────────────────────────────────────────────────────────────
conn = psycopg2.connect(**DB_CONFIG)
cur  = conn.cursor()
cur.execute("""
    SELECT a.code,
           ur.electricity_old_reading, ur.electricity_new_reading,
           ur.water_old_reading,       ur.water_new_reading,
           ur.electricity_cost,        ur.water_cost
    FROM utility_records ur JOIN apartments a ON ur.apartment_id = a.id
    WHERE ur.month = 4 AND ur.year = 2026 ORDER BY a.code
""")
db: dict[str, dict] = {}
for code, e_old, e_new, w_old, w_new, e_cost, w_cost in cur.fetchall():
    db[code] = dict(
        e_old=float(e_old), e_new=float(e_new),
        w_old=float(w_old), w_new=float(w_new),
        e_cost=float(e_cost), w_cost=float(w_cost)
    )
cur.close(); conn.close()

# ── Phân tích ─────────────────────────────────────────────────────────────────
FIELDS = [
    ('e_old','Điện cũ'), ('e_new','Điện mới'),
    ('w_old','Nước cũ'), ('w_new','Nước mới'),
    ('e_cost','Tiền điện'), ('w_cost','Tiền nước')
]

matched=[]
mismatched=[]
only_excel=[]
only_db=[]

for code in sorted(set(excel)|set(db)):
    if code not in db:       only_excel.append(code); continue
    if code not in excel:    only_db.append(code);    continue
    diffs = [(lbl, excel[code][f], db[code][f])
             for f,lbl in FIELDS if abs(excel[code][f]-db[code][f]) > 0.01]
    if diffs: mismatched.append((code, excel[code]['name'], diffs))
    else:     matched.append(code)

# Detect shift pattern: DB new == Excel old (data shifted one period)
shifted = []
for code, name, diffs in mismatched:
    if code in excel and code in db:
        ex, d = excel[code], db[code]
        if abs(d['e_new'] - ex['e_old']) < 0.5 and abs(d['w_new'] - ex['w_old']) < 0.5:
            shifted.append(code)

print('='*70)
print('  KIỂM TRA DỮ LIỆU ĐIỆN NƯỚC T04/2026')
print('='*70)
print(f'  Excel  : {len(excel)} căn hộ')
print(f'  Database: {len(db)} căn hộ T04/2026')
print()
print(f'✅  KHỚP HOÀN TOÀN         : {len(matched):>3}  căn hộ')
print(f'❌  KHÔNG KHỚP             : {len(mismatched):>3}  căn hộ')
print(f'📄  Chỉ trong Excel        : {len(only_excel):>3}  căn hộ')
print(f'🗄️   Chỉ trong Database     : {len(only_db):>3}  căn hộ')
print()
print(f'🔄  Lệch kỳ (DB.new=Excel.old): {len(shifted):>3}  căn hộ')
print()

if shifted:
    print('─'*70)
    print(f'🔍 PHÂN TÍCH: {len(shifted)} căn hộ bị lệch kỳ (DB đang chứa dữ liệu T03/2026):')
    print(f'   DB.điện_mới == Excel.điện_cũ → DB có chỉ số kỳ TRƯỚC')
    print()
    print(f'   Danh sách: {", ".join(shifted[:30])}')
    if len(shifted) > 30:
        print(f'   ... và {len(shifted)-30} căn hộ nữa')

non_shifted = [x for x in mismatched if x[0] not in shifted]
if non_shifted:
    print()
    print('─'*70)
    print(f'⚠️  {len(non_shifted)} căn hộ KHÔNG KHỚP và KHÔNG phải lệch kỳ:')
    for code, name, diffs in non_shifted[:10]:
        print(f'\n  📍 {code} ({name})')
        for lbl, ex_v, db_v in diffs:
            pct = abs(ex_v-db_v)/max(abs(ex_v),1)*100
            mark = '🔴' if pct > 5 else '🟡'
            print(f'     {mark} {lbl:<12}: Excel={fmt(ex_v)}  DB={fmt(db_v)}  ({pct:.1f}%)')

if only_db:
    print()
    print('─'*70)
    print(f'🗄️  Chỉ trong DB (ngoài file Excel): {only_db}')

print()
print('='*70)
print('📋 KẾT LUẬN:')
if shifted:
    print(f'   → {len(shifted)} bản ghi trong DB là dữ liệu CŨ (T03/2026 đang gắn nhầm kỳ T04)')
    print(f'   → Cần CẬP NHẬT {len(shifted)} bản ghi này bằng dữ liệu từ file Excel')
if not mismatched and not only_excel:
    print('   → TẤT CẢ DỮ LIỆU KHỚP HOÀN TOÀN')
print('='*70)

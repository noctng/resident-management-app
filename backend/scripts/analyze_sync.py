"""
1. Kiểm tra TES09-26 trong DB và Excel
2. Phân tích căn hộ & cư dân trong DB nhưng không có trong file Excel
"""
import sys, io
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg2, openpyxl

EXCEL_PATH = r'D:\resident-management-app.v1\resident-management-app\public\utility_import_T04_2026.xlsx'
DB_CONFIG  = dict(host='172.16.17.19', port=54328, dbname='data_qlcd',
                  user='postgres', password='TNGbmt@123')

wb   = openpyxl.load_workbook(EXCEL_PATH)
rows = list(wb.active.iter_rows(min_row=2, values_only=True))

# Tất cả mã căn hộ trong Excel
excel_codes = set()
excel_map   = {}
for row in rows:
    code = (row[2] or '').strip()
    if code:
        excel_codes.add(code)
        excel_map[code] = {
            'name': (row[3] or '').strip(),
            'phone': row[11],
            'w_old': row[4], 'w_new': row[5],
            'e_old': row[6], 'e_new': row[7],
        }

conn = psycopg2.connect(**DB_CONFIG)
cur  = conn.cursor()

# ══════════════════════════════════════════════════════════════════════
print('='*70)
print('1. KIỂM TRA TES09-26')
print('='*70)

# Trong Excel
if 'TES09-26' in excel_map:
    ex = excel_map['TES09-26']
    print(f'📄 Excel: tên={ex["name"]} | phone={ex["phone"]}')
    print(f'         Điện: {ex["e_old"]} → {ex["e_new"]} | Nước: {ex["w_old"]} → {ex["w_new"]}')
else:
    print('📄 Excel: KHÔNG CÓ TES09-26')

# Apartment trong DB
cur.execute("SELECT id, code, house_type, floor, area FROM apartments WHERE code = 'TES09-26'")
apt = cur.fetchone()
if apt:
    apt_id = apt[0]
    print(f'\n🏢 DB Apartment: id={apt_id} code={apt[1]} type={apt[2]} floor={apt[3]} area={apt[4]}')

    # Residents
    cur.execute("""
        SELECT r.id, r.name, r.phone_number, r.relationship_status
        FROM residents r
        JOIN occupancies o ON o.resident_id = r.id
        WHERE o.apartment_id = %s
    """, (apt_id,))
    residents = cur.fetchall()
    print(f'👤 Cư dân ({len(residents)}):')
    for r in residents:
        print(f'   {r[0]}: {r[1]} | {r[2]} | {r[3]}')

    # Utility records
    cur.execute("""
        SELECT month, year, electricity_old_reading, electricity_new_reading,
               water_old_reading, water_new_reading, payment_status
        FROM utility_records WHERE apartment_id = %s ORDER BY year, month
    """, (apt_id,))
    utils = cur.fetchall()
    print(f'⚡ Utility records ({len(utils)}):')
    for u in utils:
        print(f'   T{u[0]:02d}/{u[1]}: Điện {u[2]}→{u[3]} | Nước {u[4]}→{u[5]} | {u[6]}')
else:
    print('\n🏢 DB: KHÔNG TÌM THẤY căn hộ TES09-26')

# T04/2026 utility record riêng
cur.execute("""
    SELECT ur.id, ur.electricity_old_reading, ur.electricity_new_reading,
           ur.water_old_reading, ur.water_new_reading, ur.payment_status
    FROM utility_records ur
    JOIN apartments a ON ur.apartment_id = a.id
    WHERE a.code = 'TES09-26' AND ur.month = 4 AND ur.year = 2026
""")
util26 = cur.fetchone()
if util26:
    print(f'\n⚡ T04/2026: Điện {util26[1]}→{util26[2]} | Nước {util26[3]}→{util26[4]} | {util26[5]}')
else:
    print('\n⚡ T04/2026 record: KHÔNG CÓ TRONG DATABASE')

# ══════════════════════════════════════════════════════════════════════
print('\n' + '='*70)
print('2. PHÂN TÍCH: CĂN HỘ TRONG DB NHƯNG KHÔNG CÓ TRONG FILE EXCEL')
print('='*70)

cur.execute('SELECT id, code, house_type, floor, area FROM apartments ORDER BY code')
all_apts = cur.fetchall()
db_codes = {r[1]: r[0] for r in all_apts}

only_db = sorted(set(db_codes) - excel_codes)
print(f'  Excel có:         {len(excel_codes)} căn hộ')
print(f'  DB có:            {len(db_codes)} căn hộ')
print(f'  Chỉ trong DB:     {len(only_db)} căn hộ')

print()
for code in only_db:
    apt_id = db_codes[code]
    # Check contracts
    cur.execute("SELECT COUNT(*) FROM contracts WHERE apartment_id = %s", (apt_id,))
    n_contracts = cur.fetchone()[0]
    # Check utility records (any)
    cur.execute("SELECT COUNT(*), MAX(year*100+month) FROM utility_records WHERE apartment_id = %s", (apt_id,))
    n_util, last_util = cur.fetchone()
    # Check occupancies
    cur.execute("""
        SELECT r.name FROM residents r
        JOIN occupancies o ON o.resident_id = r.id
        WHERE o.apartment_id = %s
    """, (apt_id,))
    residents = [r[0] for r in cur.fetchall()]

    flags = []
    if n_contracts > 0: flags.append(f'⚠️  {n_contracts} hợp đồng')
    if n_util > 0:      flags.append(f'📊 {n_util} utility recs (last T{str(last_util)[4:]}/{str(last_util)[:4]})')
    risk = '🔴 CÓ RỦI RO' if n_contracts > 0 else ('🟡 CÓ DATA' if n_util > 0 else '🟢 TRỐNG')

    print(f'  {risk}  {code:<16} | cư dân: {", ".join(residents) or "—"} | {" | ".join(flags) or "không có data"}')

# ══════════════════════════════════════════════════════════════════════
print('\n' + '='*70)
print('3. PHÂN TÍCH: CƯ DÂN TRONG DB NHƯNG KHÔNG LIÊN KẾT VỚI CĂN HỘ TRONG EXCEL')
print('='*70)

# Residents linked to apartments NOT in Excel
cur.execute("""
    SELECT DISTINCT r.id, r.name, r.phone_number, a.code
    FROM residents r
    JOIN occupancies o ON o.resident_id = r.id
    JOIN apartments a ON o.apartment_id = a.id
    WHERE a.code = ANY(%s::text[])
    ORDER BY a.code, r.name
""", (list(only_db),))
res_only_db = cur.fetchall()
print(f'  Cư dân liên kết với {len(only_db)} căn hộ chỉ-trong-DB: {len(res_only_db)} người')
for r in res_only_db:
    print(f'   {r[3]}: {r[1]} | {r[2]}')

cur.close(); conn.close()

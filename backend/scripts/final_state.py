import sys, io
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2, openpyxl

EXCEL_PATH = r'D:\resident-management-app.v1\resident-management-app\public\utility_import_T04_2026.xlsx'
DB_CONFIG  = dict(host='172.16.17.19', port=54328, dbname='data_qlcd', user='postgres', password='TNGbmt@123')

wb  = openpyxl.load_workbook(EXCEL_PATH)
excel_codes = {(r[2] or '').strip() for r in wb.active.iter_rows(min_row=2, values_only=True) if r[2]}

conn = psycopg2.connect(**DB_CONFIG)
cur  = conn.cursor()

cur.execute('SELECT COUNT(*) FROM apartments');          n_apts  = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM residents');           n_res   = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM utility_records WHERE month=4 AND year=2026"); n_util  = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM occupancies');         n_occ   = cur.fetchone()[0]
cur.execute('SELECT COUNT(*) FROM contracts');           n_con   = cur.fetchone()[0]

cur.execute('SELECT code FROM apartments ORDER BY code')
db_codes = {r[0] for r in cur.fetchall()}
only_db    = db_codes - excel_codes
only_excel = excel_codes - db_codes

print('='*60)
print('  TRẠNG THÁI DATABASE SAU KHI DỌN DẸP')
print('='*60)
print(f'  🏢 Căn hộ:            {n_apts}')
print(f'  👤 Cư dân:            {n_res}')
print(f'  📄 Hợp đồng:          {n_con}')
print(f'  🔗 Occupancies:       {n_occ}')
print(f'  ⚡ Utility T04/2026:  {n_util}')
print()
print(f'  📄 Excel:   {len(excel_codes)} căn hộ')
print(f'  🗄️  DB:      {len(db_codes)} căn hộ')
print(f'  ✅ Đồng bộ: {len(excel_codes & db_codes)} khớp')
print(f'  ❓ Chỉ DB:  {len(only_db)}  →  {sorted(only_db)}')
print(f'  ❓ Chỉ Excel: {len(only_excel)}  →  {sorted(only_excel)}')
print('='*60)
if not only_excel:
    print('✅ TẤT CẢ CĂN HỘ TRONG EXCEL ĐÃ CÓ TRONG DATABASE')
if only_db:
    print(f'ℹ️  {len(only_db)} căn hộ trong DB không có trong file Excel (có thể hợp lệ)')
print('='*60)
cur.close(); conn.close()

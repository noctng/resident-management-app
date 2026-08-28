import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

conn = psycopg2.connect(
    host='172.16.17.19', port=54328,
    dbname='data_qlcd', user='postgres', password='TNGbmt@123'
)
cur = conn.cursor()

# Check existing apartments
cur.execute('SELECT id, code FROM apartments ORDER BY code')
apartments = cur.fetchall()
print(f'Total apartments in DB: {len(apartments)}')
apt_map = {row[1]: row[0] for row in apartments}
print('Sample codes:', list(apt_map.keys())[:20])

# Check utility records for April 2026
cur.execute("""
    SELECT a.code FROM utility_records ur
    JOIN apartments a ON ur.apartment_id = a.id
    WHERE ur.month=4 AND ur.year=2026
    ORDER BY a.code
""")
util_codes = [r[0] for r in cur.fetchall()]
print(f'\nUtility records T04/2026 count: {len(util_codes)}')
print('Codes:', util_codes[:20])

# Check residents
cur.execute('SELECT id, full_name, phone FROM residents ORDER BY full_name LIMIT 20')
residents = cur.fetchall()
print(f'\nSample residents:')
for r in residents:
    print(f'  {r[0]}: {r[1]} | {r[2]}')

conn.close()

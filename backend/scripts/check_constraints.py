import sys, io
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

conn = psycopg2.connect(host='172.16.17.19', port=54328, dbname='data_qlcd', user='postgres', password='TNGbmt@123')
cur = conn.cursor()

# Check house_type constraint
cur.execute("""
    SELECT pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'apartments' AND c.contype = 'c'
""")
for row in cur.fetchall():
    print('Constraint:', row[0])

# Check distinct house_type values in use
cur.execute('SELECT DISTINCT house_type FROM apartments ORDER BY house_type')
print('\nExisting house_type values:', [r[0] for r in cur.fetchall()])

# Check distinct electricity_type values
cur.execute('SELECT DISTINCT electricity_type FROM apartments ORDER BY electricity_type')
print('Existing electricity_type values:', [r[0] for r in cur.fetchall()])

# Check apartments with codes like CAN03- or TES
cur.execute("SELECT code, house_type, floor, area, electricity_type FROM apartments WHERE code LIKE 'CAN%' OR code LIKE 'TES%' ORDER BY code LIMIT 20")
print('\nExisting CAN/TES apartments:')
for r in cur.fetchall():
    print(f'  {r[0]}: type={r[1]}, floor={r[2]}, area={r[3]}, elec={r[4]}')

conn.close()

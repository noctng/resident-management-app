import sys, io
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

conn = psycopg2.connect(host='172.16.17.19', port=54328, dbname='data_qlcd', user='postgres', password='TNGbmt@123')
cur = conn.cursor()
cur.execute("""
    SELECT tc.table_name, kcu.column_name, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
    JOIN information_schema.referential_constraints rc ON tc.constraint_name=rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name=ccu.constraint_name
    WHERE ccu.table_name='apartments' AND tc.constraint_type='FOREIGN KEY'
    ORDER BY tc.table_name
""")
print("Tables referencing apartments:")
for r in cur.fetchall():
    print(f"  {r[0]}.{r[1]}  ON DELETE: {r[2]}")
conn.close()

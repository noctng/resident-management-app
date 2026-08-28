import sys, io
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

DB_CONFIG = dict(host='172.16.17.19', port=54328, dbname='data_qlcd', user='postgres', password='TNGbmt@123')

AI_SETTINGS = [
    ('AI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai', 'AI Base URL (OpenAI-compatible)'),
    ('AI_API_KEY',  'AIzaSyAovIrzVoVGgqbaE149zQ7dborWx4NtJOg',                'AI API Key'),
    ('AI_MODEL',    'gemini-2.0-flash',                                          'AI Model Name'),
]

conn = psycopg2.connect(**DB_CONFIG)
conn.autocommit = False
cur = conn.cursor()

for key, value, desc in AI_SETTINGS:
    cur.execute("""
        INSERT INTO system_settings (key, value, description)
        VALUES (%s, %s, %s)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description
    """, (key, value, desc))
    print(f'  ✅ {key} = {value[:30]}{"..." if len(value) > 30 else ""}')

conn.commit()
cur.close()
conn.close()
print('\n✅ Đã lưu cấu hình AI vào database.')

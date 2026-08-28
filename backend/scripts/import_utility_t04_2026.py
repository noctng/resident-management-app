"""
Import utility data T04/2026 from Excel into PostgreSQL.
Fixed: correct house_type (CANTATA/TESLA), electricity_type (BUSINESS/RESIDENTIAL),
       per-row savepoints to prevent transaction abort cascade.
"""
import sys, io, uuid, re
sys.path.insert(0, r'C:\users\tuha\appdata\roaming\python\python313\site-packages')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg2
import openpyxl

EXCEL_PATH = r'D:\resident-management-app.v1\resident-management-app\public\utility_import_T04_2026.xlsx'
DB_CONFIG  = dict(host='172.16.17.19', port=54328, dbname='data_qlcd',
                  user='postgres', password='TNGbmt@123')

# ── Helpers ──────────────────────────────────────────────────────────────────
def apt_code_to_house_type(code: str) -> str:
    prefix = code.split('-')[0].upper()
    if prefix.startswith('CAN'):
        return 'CANTATA'
    if prefix.startswith('TES'):
        return 'TESLA'
    return 'CANTATA'   # fallback

def usage_to_elec_type(usage_type: str) -> str:
    if usage_type and 'kinh doanh' in usage_type.lower():
        return 'BUSINESS'
    return 'RESIDENTIAL'

def normalize_phone(phone) -> str | None:
    if not phone:
        return None
    p = str(phone).strip().replace(' ', '')
    if p.startswith('84') and len(p) > 10:
        p = '0' + p[2:]
    return p[:20] if p else None

def safe_float(v, default=0.0) -> float:
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default

SKIP_NAMES = {'', 'cdt', 'cđt', 'chủ đầu tư', 'cdt '}

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    wb = openpyxl.load_workbook(EXCEL_PATH)
    rows = list(wb.active.iter_rows(min_row=2, values_only=True))
    print(f'📄 Excel rows: {len(rows)}')

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur  = conn.cursor()

    # ── Load DB state ─────────────────────────────────────────────────────
    cur.execute('SELECT id, code FROM apartments')
    apt_map = {r[1]: r[0] for r in cur.fetchall()}

    cur.execute('SELECT id, phone_number, name FROM residents WHERE is_active = TRUE')
    res_by_phone: dict[str, str] = {}
    res_by_name:  dict[str, str] = {}
    for rid, phone, name in cur.fetchall():
        if phone: res_by_phone[phone] = rid
        if name:  res_by_name[name]   = rid

    cur.execute("""
        SELECT a.code FROM utility_records ur
        JOIN apartments a ON ur.apartment_id = a.id
        WHERE ur.month = 4 AND ur.year = 2026
    """)
    existing_util = {r[0] for r in cur.fetchall()}

    cur.execute('SELECT apartment_id, resident_id FROM occupancies')
    existing_occ = set((r[0], r[1]) for r in cur.fetchall())

    print(f'🏢 Apartments in DB:    {len(apt_map)}')
    print(f'👤 Residents in DB:    {len(res_by_name)}')
    print(f'⚡ T04/2026 util recs: {len(existing_util)}')

    # ── Counters ─────────────────────────────────────────────────────────
    apts_created  = []
    res_created   = []
    occ_created   = []
    util_created  = []
    util_skipped  = []
    errors        = []

    for i, row in enumerate(rows, start=2):
        cur.execute('SAVEPOINT row_sp')
        try:
            (month, year, apt_code, resident_name,
             water_start, water_end, elec_start, elec_end,
             water_amount, elec_amount, usage_type, phone,
             source_name, source_block, source_row, note) = row

            if not apt_code:
                cur.execute('RELEASE SAVEPOINT row_sp')
                continue

            apt_code = apt_code.strip()
            phone    = normalize_phone(phone)

            # ── Create apartment if missing ───────────────────────────────
            if apt_code not in apt_map:
                house_type = apt_code_to_house_type(apt_code)
                elec_type  = usage_to_elec_type(usage_type)
                cur.execute("""
                    INSERT INTO apartments (house_type, code, floor, area, electricity_type)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (house_type, apt_code, 0, 0.0, elec_type))
                new_id = cur.fetchone()[0]
                apt_map[apt_code] = new_id
                apts_created.append(apt_code)
                print(f'  ✅ Apartment created: {apt_code} [{house_type}] id={new_id}')

            apt_id = apt_map[apt_code]

            # ── Create resident if real name ──────────────────────────────
            res_name = (resident_name or '').strip()
            if res_name.lower() not in SKIP_NAMES and res_name:
                res_id = res_by_phone.get(phone) if phone else None
                if not res_id:
                    res_id = res_by_name.get(res_name)

                if not res_id:
                    res_id = 'res_' + uuid.uuid4().hex[:20]
                    cur.execute("""
                        INSERT INTO residents
                            (id, name, phone_number, relationship_status, is_active, can_use_amenities)
                        VALUES (%s, %s, %s, 'OWNER', TRUE, TRUE)
                    """, (res_id, res_name, phone))
                    if phone: res_by_phone[phone] = res_id
                    res_by_name[res_name] = res_id
                    res_created.append(f'{res_name} ({phone or "no phone"})')
                    print(f'  👤 Resident created: {res_name} | {phone}')

                # ── Link occupancy ────────────────────────────────────────
                if (apt_id, res_id) not in existing_occ:
                    cur.execute("""
                        INSERT INTO occupancies (apartment_id, resident_id)
                        VALUES (%s, %s) ON CONFLICT DO NOTHING
                    """, (apt_id, res_id))
                    existing_occ.add((apt_id, res_id))
                    occ_created.append(f'{apt_code} ← {res_name}')
                    print(f'  🔗 Linked: {apt_code} ← {res_name}')

            # ── Insert utility record ─────────────────────────────────────
            if apt_code in existing_util:
                util_skipped.append(apt_code)
                cur.execute('RELEASE SAVEPOINT row_sp')
                continue

            e_old = safe_float(elec_start)
            e_new = safe_float(elec_end, e_old)
            w_old = safe_float(water_start)
            w_new = safe_float(water_end, w_old)
            if e_new < e_old: e_new = e_old
            if w_new < w_old: w_new = w_old

            ur_id = 'ur_' + uuid.uuid4().hex[:20]
            cur.execute("""
                INSERT INTO utility_records (
                    id, apartment_id, month, year,
                    electricity_old_reading, electricity_new_reading,
                    water_old_reading, water_new_reading,
                    electricity_cost, water_cost, payment_status
                ) VALUES (%s, %s, 4, 2026, %s, %s, %s, %s, %s, %s, 'UNPAID')
                ON CONFLICT (apartment_id, month, year) DO NOTHING
            """, (
                ur_id, apt_id,
                e_old, e_new, w_old, w_new,
                safe_float(elec_amount), safe_float(water_amount)
            ))
            util_created.append(apt_code)
            cur.execute('RELEASE SAVEPOINT row_sp')

        except Exception as e:
            cur.execute('ROLLBACK TO SAVEPOINT row_sp')
            cur.execute('RELEASE SAVEPOINT row_sp')
            errors.append(f'Row {i} ({row[2] if row[2] else "?"}): {e}')
            print(f'  ❌ Row {i} error: {e}')

    conn.commit()
    print('\n' + '='*60)
    print('✅  IMPORT DONE')
    print('='*60)
    print(f'🏢 Apartments created:       {len(apts_created):>4}  {apts_created}')
    print(f'👤 Residents created:        {len(res_created):>4}')
    for r in res_created: print(f'       {r}')
    print(f'🔗 Occupancies linked:       {len(occ_created):>4}')
    for o in occ_created: print(f'       {o}')
    print(f'⚡ Utility records created:  {len(util_created):>4}')
    print(f'⏭️  Utility records skipped: {len(util_skipped):>4} (already existed)')
    if errors:
        print(f'\n❌ Errors: {len(errors)}')
        for e in errors: print(f'   {e}')
    else:
        print('\n✔️  No errors')
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()

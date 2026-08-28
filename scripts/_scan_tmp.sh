cd ~/workspace/resident-management-app
echo "=== DB TABLES ==="
grep -ioE "create table (if not exists )?[a-z0-9_]+" schema.sql | sed -E 's/create table (if not exists )?//I' | sort -u
echo ""
echo "table_count=$(grep -icE 'create table' schema.sql)"
echo ""
echo "=== API ENDPOINT PREFIXES (grouped) ==="
grep -oE "(get|post|put|patch|del)\(['\"]/api/[a-zA-Z0-9_/-]+" src/services/api.ts \
  | sed -E "s/^(get|post|put|patch|del)\(['\"]//" \
  | sed -E 's#\{[^}]*\}##g' \
  | sed -E 's#(/[^/]+)$##' \
  | sort -u
echo ""
echo "=== api.ts total exported functions ==="
grep -cE "^(export (async )?function|export const)" src/services/api.ts

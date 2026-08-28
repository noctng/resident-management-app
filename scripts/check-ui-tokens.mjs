/**
 * UI Token Guard — chặn tái phát vi phạm design system (design-system/resident-management-app/MASTER.md)
 *
 * Kiểm tra: (1) alert/confirm/prompt native  (2) hex hardcode trong class Tailwind
 *           (3) palette mặc định Tailwind     (4) spacing không hợp lệ *-4.5
 *
 * Cách dùng:
 *   npm run guard:ui            → kiểm tra, fail nếu file KHÔNG có trong allowlist vi phạm
 *   npm run guard:ui -- --init  → ghi toàn bộ file đang vi phạm vào allowlist (chạy 1 lần)
 *
 * Workflow: khi refactor xong 1 module (Giai đoạn 2–7), xoá file đó khỏi
 * scripts/ui-guard-allowlist.json để guard siết lại.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'ui-guard-allowlist.json');

const PATTERNS = [
  {
    name: 'native alert/confirm/prompt',
    re:
      /\bwindow\.(?:alert|confirm|prompt)\s*\(|(?<![\w$.])(?<!await )(?:alert|prompt|confirm)\s*\(/g,
    hint: 'Dùng useToast()/useConfirm() từ src/components/ui',
  },
  {
    name: 'hardcoded hex in tailwind class',
    re:
      /(?:^|[\s"'`{(])(?:bg|text|border|from|to|via|ring|fill|stroke|divide|shadow|outline|decoration|accent|caret)-\[#[0-9a-fA-F]{3,8}\]/g,
    hint: 'Dùng token: bg-accent, text-ink, border-brand-border… (tailwind.config.js)',
  },
  {
    name: 'default tailwind palette',
    re:
      /(?:^|[\s"'`{(])(?:[a-z-]+:)*(?:bg|text|border|ring|fill|stroke|divide|from|to|via|placeholder|decoration|outline|accent|caret)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
    hint: 'Dùng semantic tokens: brand-danger/-warning/-success, ink, accent…',
  },
  {
    name: 'invalid tailwind spacing *-4.5',
    re:
      /(?:^|[\s"'`{(])(?:p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap)(?:-[trbl])?-4\.5\b/g,
    hint: 'Tailwind 3.4 không có bước 4.5 — dùng p-4/p-5/gap-4',
  },
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

const isInit = process.argv.includes('--init');
const files = walk(SRC);
let allowlist = existsSync(ALLOWLIST_PATH)
  ? new Set(JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')))
  : new Set();

const violationsByFile = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const hits = [];
  for (const { name, re } of PATTERNS) {
    const m = src.match(re);
    if (m) hits.push(`${name} ×${m.length}`);
  }
  if (hits.length) violationsByFile.set(path.relative(ROOT, f).replace(/\\/g, '/'), hits);
}

if (isInit) {
  writeFileSync(ALLOWLIST_PATH, JSON.stringify([...violationsByFile.keys()].sort(), null, 2));
  console.log(`Allowlist written: ${violationsByFile.size} files → ${path.relative(ROOT, ALLOWLIST_PATH)}`);
  process.exit(0);
}

let newViolations = 0;
console.log(`UI Token Guard — scanned ${files.length} files\n`);
for (const [rel, hits] of [...violationsByFile.entries()].sort()) {
  if (allowlist.has(rel)) continue;
  newViolations++;
  console.log(`✗ ${rel}`);
  for (const h of hits) console.log(`    ${h}`);
}
const legacyCount = [...violationsByFile.keys()].filter((f) => allowlist.has(f)).length;
console.log(`\nLegacy (allowlisted): ${legacyCount} files — hãy xoá khỏi allowlist khi refactor xong.`);
if (newViolations > 0) {
  console.log(`\nFAILED: ${newViolations} file mới vi phạm design system.`);
  process.exit(1);
}
console.log('PASSED: không có vi phạm mới.');

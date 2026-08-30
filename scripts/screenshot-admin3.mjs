// screenshot-admin3.mjs — Thi Cong + feedback form (ESM)
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'http://localhost:5174';
const shots = '/home/dell/workspace/resident-management-app/docs/shots';
fs.mkdirSync(shots, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(page, name) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await sleep(700);
  await page.screenshot({ path: `${shots}/${name}.png` });
  console.log('SAVED', name);
}
async function clickText(page, label, timeout = 3000) {
  try { await page.click(`text=${label}`, { timeout }); return true; } catch { return false; }
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await sleep(700);
  await page.fill('input[placeholder*="tên đăng nhập" i], input[name="username"]', 'admin');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await sleep(2200);
  // Thi Cong variants
  let ok = false;
  for (const l of ['Thi Công & Kỹ Quỹ', 'Thi Công', 'Kỹ Quỹ', 'Thi Công & Kỹ Quỹ (Construction)']) {
    if (await clickText(page, l, 2000)) { await sleep(1100); await shot(page, '22-admin-ThiCong'); ok = true; break; }
  }
  if (!ok) console.log('MISS Thi Cong');
  // Phan anh form
  if (await clickText(page, 'Phản Ánh', 2500)) {
    await sleep(1000);
    for (const b of ['Tiếp nhận', 'Thêm phản ánh', 'Thêm mới', 'Tạo mới']) {
      if (await clickText(page, b, 1500)) { await sleep(900); await shot(page, '23-admin-PhanAnh-form'); break; }
    }
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

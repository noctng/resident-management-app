// screenshot-admin2.mjs — capture remaining admin screens + forms (ESM)
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

  // remaining list pages
  for (const label of ['Ghi Chỉ Số (Mobile)', 'Thi Công & Kỹ Quỹ', 'Báo Cáo & KPI (Điều Hành)']) {
    if (await clickText(page, label, 2500)) { await sleep(1100); await shot(page, '22-admin-' + label.replace(/[^a-z0-9]/gi, '')); }
    else console.log('MISS', label);
  }

  // Try opening a "create" form on Căn Hộ and Cư Dân for detailed how-to
  if (await clickText(page, 'Căn Hộ', 2500)) {
    await sleep(1000);
    for (const b of ['Thêm căn hộ', 'Thêm mới', 'Tạo mới', '+ Thêm']) {
      if (await clickText(page, b, 1500)) { await sleep(900); await shot(page, '23-admin-CanHo-form'); break; }
    }
  }
  if (await clickText(page, 'Cư Dân', 2500)) {
    await sleep(1000);
    for (const b of ['Thêm cư dân', 'Thêm mới', 'Tạo mới', '+ Thêm']) {
      if (await clickText(page, b, 1500)) { await sleep(900); await shot(page, '23-admin-CuDan-form'); break; }
    }
  }
  // Phản ánh detail / create
  if (await clickText(page, 'Phản Ánh', 2500)) {
    await sleep(1000);
    for (const b of ['Thêm phản ánh', 'Tiếp nhận', 'Thêm mới', 'Tạo mới']) {
      if (await clickText(page, b, 1500)) { await sleep(900); await shot(page, '23-admin-PhanAnh-form'); break; }
    }
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

// screenshot-admin.mjs — capture admin (admin/password) screens (ESM)
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
  await shot(page, '20-admin-dashboard');
  // capture key admin modules
  const mods = ['Căn Hộ', 'Cư Dân', 'Phương Tiện', 'Tin Tức', 'Phản Ánh', 'Tiện Ích', 'Thi Công & Kỹ Quỹ', 'Bảo Hành Sau Bàn Giao', 'Quản Lý Điện Nước', 'Hóa Đơn Tổng Hợp', 'Kinh Doanh (CRM)'];
  for (const label of mods) {
    if (await clickText(page, label, 2000)) { await sleep(1100); await shot(page, '21-admin-' + label.replace(/[^a-z0-9]/gi, '')); }
    else console.log('MISS', label);
  }
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

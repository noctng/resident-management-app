// screenshot-perms.mjs v2 — click shield icon button, capture modal
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
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await sleep(700);
  await page.fill('input[placeholder*="tên đăng nhập" i], input[name="username"]', 'guide_admin');
  await page.fill('input[type="password"]', 'Guide@12345');
  await page.click('button[type="submit"]');
  await sleep(2000);
  await page.click('text=Tài Khoản Cư Dân', { timeout: 3000 });
  await sleep(1500);
  await shot(page, '14-admin-taikhoan-cudan');
  // click the shield icon (Xem phân quyền) button
  await page.click('button[title*="Xem phân quyền"], button[aria-label*="Xem phân quyền"]', { timeout: 3000 });
  await sleep(1200);
  await shot(page, '15-admin-permission-matrix');
  console.log('GOT permission matrix');
  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

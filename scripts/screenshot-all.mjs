// screenshot-final.mjs — capture real app screenshots (ESM)
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5174';
const shots = '/home/dell/workspace/resident-management-app/docs/shots';
fs.mkdirSync(shots, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name, w = 1440, h = 960) {
  await page.setViewportSize({ width: w, height: h });
  await sleep(600);
  const p = `${shots}/${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  console.log('SAVED', p);
}
// click by visible text; returns true if clicked
async function clickText(page, label, timeout = 2500) {
  try { await page.click(`text=${label}`, { timeout }); return true; } catch { return false; }
}

(async () => {
  const browser = await chromium.launch();

  // ===================== RESIDENT =====================
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.log('R-ERR:', m.text()); });
    console.log('--- RESIDENT ---');
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await sleep(700);
    await shot(page, '01-resident-login');
    await page.fill('input[placeholder*="Số điện thoại" i]', '0963517247');
    await page.fill('input[type="password"]', 'CuDan@12345');
    await page.click('button[type="submit"]');
    await sleep(2200);
    await shot(page, '02-resident-portal-onboard');
    // dismiss onboarding (skip)
    for (let i = 0; i < 6; i++) {
      if (await clickText(page, 'Bỏ qua', 1000)) { await sleep(700); break; }
      if (!(await clickText(page, 'Tiếp theo', 1000))) break;
      await sleep(500);
    }
    await sleep(1200);
    await shot(page, '03-resident-tongquan');
    // visit each menu feature
    const menus = ['Tin Tức', 'Hóa Đơn Tổng Hợp', 'Điện Nước', 'Đăng Ký Tiện Ích', 'Thẻ Xe Phương Tiện', 'Phản Ánh', 'Bảo Hành Căn Hộ', 'Đăng Ký Cải Tạo'];
    for (const label of menus) {
      if (await clickText(page, label, 1800)) { await sleep(1100); await shot(page, '04-res-' + label.replace(/[^a-z0-9]/gi, '')); }
    }
    await ctx.close();
  }

  // ===================== ADMIN =====================
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.log('A-ERR:', m.text()); });
    console.log('--- ADMIN ---');
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await sleep(800);
    await shot(page, '10-admin-login');
    await page.fill('input[placeholder*="tên đăng nhập" i], input[name="username"]', 'guide_admin');
    await page.fill('input[type="password"]', 'Guide@12345');
    await page.click('button[type="submit"]');
    await sleep(2200);
    await shot(page, '11-admin-dashboard');
    // navigate to user/permission related pages
    const adminMenus = ['Quản lý tài khoản cư dân', 'Tài khoản cư dân', 'Người dùng', 'Quản lý người dùng', 'Cấu hình', 'Hệ thống', 'Phân quyền'];
    for (const label of adminMenus) {
      if (await clickText(page, label, 1800)) { await sleep(1100); await shot(page, '12-admin-' + label.replace(/[^a-z0-9]/gi, '')); }
    }
    // open permission matrix modal if present
    for (const label of ['Xem quyền', 'Phân quyền', 'Chỉnh sửa quyền', 'Sửa quyền']) {
      if (await clickText(page, label, 1500)) { await sleep(900); await shot(page, '13-admin-' + label.replace(/[^a-z0-9]/gi, '')); }
    }
    await ctx.close();
  }

  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

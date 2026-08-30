// screenshot-features.mjs — targeted capture (ESM)
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

  // ===== RESIDENT feature tabs =====
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await sleep(600);
    await page.fill('input[placeholder*="Số điện thoại" i]', '0963517247');
    await page.fill('input[type="password"]', 'CuDan@12345');
    await page.click('button[type="submit"]');
    await sleep(2000);
    for (let i = 0; i < 6; i++) {
      if (await clickText(page, 'Bỏ qua', 1000)) { await sleep(500); break; }
      if (!(await clickText(page, 'Tiếp theo', 1000))) break;
      await sleep(400);
    }
    await sleep(800);
    for (const label of ['Đăng Ký Tiện Ích', 'Thẻ Xe Phương Tiện', 'Bảo Hành Căn Hộ', 'Phản Ánh', 'Đăng Ký Cải Tạo', 'Sổ Tay Cư Dân']) {
      if (await clickText(page, label, 2000)) { await sleep(1000); await shot(page, '05-res-' + label.replace(/[^a-z0-9]/gi, '')); }
      else console.log('MISS', label);
    }
    await ctx.close();
  }

  // ===== ADMIN: Tài Khoản Cư Dân + permission matrix =====
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await sleep(700);
    await page.fill('input[placeholder*="tên đăng nhập" i], input[name="username"]', 'guide_admin');
    await page.fill('input[type="password"]', 'Guide@12345');
    await page.click('button[type="submit"]');
    await sleep(2000);
    // open Tài Khoản Cư Dân from sidebar
    if (await clickText(page, 'Tài Khoản Cư Dân', 3000)) {
      await sleep(1200);
      await shot(page, '14-admin-taikhoan-cudan');
      // click "Xem quyền" button in a row
      if (await clickText(page, 'Xem quyền', 2500)) {
        await sleep(1000);
        await shot(page, '15-admin-permission-matrix');
      } else console.log('MISS Xem quyền');
    } else console.log('MISS Tài Khoản Cư Dân');
    await ctx.close();
  }

  await browser.close();
  console.log('DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

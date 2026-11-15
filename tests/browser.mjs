// 瀏覽器整合測試與截圖：node tests/browser.mjs [輸出資料夾]
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] || join(root, 'tests/shots'));
mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
process.on('exit', () => { if (errors.length) console.error('瀏覽器錯誤：\n' + errors.join('\n')); });

async function open(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.stack || String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__studio);
  await page.waitForTimeout(600);
  return page;
}
const shot = async (page, name) => { await page.evaluate(() => window.__studio.invalidate()); await page.waitForTimeout(350); await page.screenshot({ path: join(out, name + '.png') }); };
const stateOf = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__studio.state)));
const allValid = (page) => page.evaluate(() => { const s = window.__studio; return s.state.items.every(i => s.M.checkPlacement(s.state, i).ok); });

// ---- 桌面 ----
const page = await open({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await shot(page, 'desktop-orbit-day');
for (const v of ['top', 'inside', 'door', 'bed']) { await page.click(`#views button[data-view=${v}]`); await shot(page, `desktop-${v}-day`); }
await page.click('#btnNight');
for (const v of ['orbit', 'inside', 'bed']) { await page.click(`#views button[data-view=${v}]`); await shot(page, `desktop-${v}-night`); }
await page.click('#btnCeil'); await shot(page, 'desktop-bed-night-lamps-only');
await page.click('#btnCeil'); await page.click('#btnNight');

// 拖曳椅子：位置改變、放開後一致、重新載入後一致
await page.click('#views button[data-view=top]');
const drag = async (pg, id, dx, dz) => {
  const it = (await stateOf(pg)).items.find(i => i.id === id);
  const a = await pg.evaluate(([x, z]) => window.__studio.screenOf(x, 40, z), [it.x, it.z]);
  const b = await pg.evaluate(([x, z]) => window.__studio.screenOf(x, 40, z), [it.x + dx, it.z + dz]);
  await pg.mouse.move(a.x, a.y); await pg.mouse.down();
  for (let i = 1; i <= 12; i++) await pg.mouse.move(a.x + (b.x - a.x) * i / 12, a.y + (b.y - a.y) * i / 12);
  const during = (await stateOf(pg)).items.find(i => i.id === id);
  await pg.mouse.up();
  const after = (await stateOf(pg)).items.find(i => i.id === id);
  return { before: it, during, after };
};
let s = await stateOf(page);
const chair = s.items.find(i => i.type === 'deskChair');
let r = await drag(page, chair.id, 30, 40);
assert.ok(Math.abs(r.after.x - (chair.x + 30)) < 4 && Math.abs(r.after.z - (chair.z + 40)) < 4, '椅子應跟著拖曳移動 ' + JSON.stringify(r.after));
assert.deepEqual([r.during.x, r.during.z], [r.after.x, r.after.z], '拖曳中與放開後位置一致');
await page.waitForFunction(([id, x]) => { const s = JSON.parse(localStorage.getItem('bedroom-studio.fable.v1')); return s && s.items.find(i => i.id === id).x === x; }, [chair.id, r.after.x]);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bedroom-studio.fable.v1')));
assert.deepEqual([saved.items.find(i => i.id === chair.id).x, saved.items.find(i => i.id === chair.id).z], [r.after.x, r.after.z], '自動儲存位置一致');
// 往書桌與牆的方向硬拖：被書桌擋住並停在旁邊，不穿過也不跳回起點
r = await drag(page, chair.id, -400, 0);
assert.ok(Math.abs(r.after.x - 95.5) < 1 && Math.abs(r.after.z - r.before.z) < 1, '應停在書桌旁 x=' + r.after.x);
assert.match(await page.textContent('#selLabel') + (await page.textContent('#panel')), /120 × 70|46 × 50/);
assert.ok(await allValid(page));
await shot(page, 'desktop-top-after-drag');
// 復原兩次回到原位
await page.click('#btnUndo'); await page.click('#btnUndo');
s = await stateOf(page);
assert.deepEqual([s.items.find(i => i.id === chair.id).x, s.items.find(i => i.id === chair.id).z], [chair.x, chair.z], '復原');
// 床帶著娃娃旋轉；NORDLI 只有一顆枕頭
const bed = s.items.find(i => i.type === 'nordli');
await page.evaluate((id) => window.__studio.select(id), bed.id);
assert.match(await page.textContent('#panel'), /120.*202/);
await page.click('#panel >> text=枕頭與棉被換邊');
assert.equal((await stateOf(page)).items.find(i => i.id === bed.id).flip, true);
await page.click('#btnUndo');
// 加入家具選單
await page.click('#btnAdd'); await page.waitForTimeout(500);
await shot(page, 'desktop-catalog');
await page.click('#catTabs >> text=椅子'); await page.waitForTimeout(400);
await shot(page, 'desktop-catalog-chairs');
await page.click('.card:has-text("DYVLINGE") >> text=加入房間');
assert.match(await page.textContent('#toast'), /放不下/, '房間已滿時應提示放不下');
assert.ok(!(await stateOf(page)).items.some(i => i.type === 'dyvlinge'));
await page.click('#sheetCatalog [data-close]');
await page.evaluate(() => { const s = window.__studio; s.select(s.state.items.find(i => i.type === 'beanbag').id); });
await page.click('#panel >> text=刪除');
await page.click('#btnAdd'); await page.click('#catTabs >> text=椅子'); await page.waitForTimeout(300);
await page.click('.card:has-text("DYVLINGE") >> text=加入房間');
assert.ok((await stateOf(page)).items.some(i => i.type === 'dyvlinge'));
assert.ok(await allValid(page));
await page.click('#views button[data-view=orbit]');
await shot(page, 'desktop-orbit-with-dyvlinge');
// 尺寸設定：縮小房間後家具仍合法
await page.click('#btnSize');
await page.fill('#sizeFields label:has-text("大窗牆寬度") input', '300');
await page.press('#sizeFields label:has-text("大窗牆寬度") input', 'Tab');
assert.equal((await stateOf(page)).room.width, 300);
assert.ok(await allValid(page), '縮小房間後家具合法');
await page.click('#sheetSize [data-close]');
await page.click('#views button[data-view=top]');
await shot(page, 'desktop-top-width-300');
// 其他提案
for (const [i, name] of ['復古暖橘', '無印日系', '灰白北歐・金屬'].entries()) {
  await page.evaluate(() => window.__studio.loadState(null));
  await page.click('#btnMenu'); await page.click(`#proposals >> text=${name}`);
  assert.ok(await allValid(page), name);
  await page.click('#views button[data-view=top]'); await shot(page, `proposal-${i + 1}-top`);
  await page.click('#views button[data-view=orbit]'); await shot(page, `proposal-${i + 1}-orbit`);
}
// 重新載入：不出現空白、配置保留
await page.reload(); await page.waitForFunction(() => window.__studio); await page.waitForTimeout(500);
assert.equal((await stateOf(page)).items.some(i => i.type === 'poles'), true);

// ---- 手機（iPhone 尺寸、觸控）----
const phone = await open({ ...devices['iPhone 13'], defaultBrowserType: undefined });
await shot(phone, 'phone-orbit');
await phone.tap('#views button[data-view=top]'); await shot(phone, 'phone-top');
const ps = await stateOf(phone), pchair = ps.items.find(i => i.type === 'deskChair');
const cdp = await phone.context().newCDPSession(phone);
const pt = async (x, z) => phone.evaluate(([x, z]) => window.__studio.screenOf(x, 40, z), [x, z]);
const a = await pt(pchair.x, pchair.z), b = await pt(pchair.x + 40, pchair.z + 30);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
await touch('touchStart', [a]);
for (let i = 1; i <= 10; i++) await touch('touchMove', [{ x: a.x + (b.x - a.x) * i / 10, y: a.y + (b.y - a.y) * i / 10 }]);
await touch('touchEnd', []);
const pa = (await stateOf(phone)).items.find(i => i.id === pchair.id);
assert.ok(Math.abs(pa.x - pchair.x - 40) < 5 && Math.abs(pa.z - pchair.z - 30) < 5, '手機觸控拖曳 ' + JSON.stringify([pa.x, pa.z]));
// 雙指縮放
const z0 = await phone.evaluate(() => window.__studio.cam.top.zoom);
await touch('touchStart', [{ x: 150, y: 250 }, { x: 240, y: 250 }]);
for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: 150 - i * 8, y: 250 }, { x: 240 + i * 8, y: 250 }]);
await touch('touchEnd', []);
assert.ok(await phone.evaluate(() => window.__studio.cam.top.zoom) > z0 * 1.3, '雙指放大');
await shot(phone, 'phone-top-zoomed');
// 單指旋轉鏡頭
await phone.tap('#views button[data-view=orbit]');
const t0 = await phone.evaluate(() => window.__studio.cam.theta);
await touch('touchStart', [{ x: 30, y: 150 }]);
for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: 30 + i * 12, y: 150 }]);
await touch('touchEnd', []);
assert.notEqual(await phone.evaluate(() => window.__studio.cam.theta), t0, '單指旋轉');
await phone.tap('#views button[data-view=inside]'); await shot(phone, 'phone-inside');
await phone.tap('#btnAdd'); await phone.waitForTimeout(500); await shot(phone, 'phone-catalog');

await browser.close(); server.close();
if (errors.length) { console.error('瀏覽器錯誤：\n' + errors.join('\n')); process.exit(1); }
console.log('瀏覽器測試全部通過，截圖在 ' + out);

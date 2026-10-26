import { test, expect } from './fx';

/** Koʻchasoz C1 (26.10): haqiqiy chorraha — koordinata → OSM (soxta Overpass javobi) → ikki koʻcha, burchak, tezlik */
const C = [69.28, 41.31];
const nd = (id: number, dx: number, dy: number) => ({ type: 'node', id, lon: C[0] + dx * 1e-4, lat: C[1] + dy * 1e-4 });
const OSM = { elements: [nd(1, 0, 0), nd(2, -6, 0), nd(3, 6, 0), nd(4, 2, 6), nd(5, -2, -6), nd(6, -12, 0), nd(7, 12, 0),
  { type: 'way', id: 10, nodes: [6, 2, 1, 3, 7], tags: { highway: 'primary', lanes: '4', maxspeed: '60', name: 'Amir Temur' } },
  { type: 'way', id: 11, nodes: [4, 1, 5], tags: { highway: 'residential', name: 'Mahalla' } }] };

test('C: «Haqiqiy chorraha» — OSM dan koʻchalar, burchak va tezlik; manba koʻrsatiladi', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  let q = '';
  await page.route(/overpass|interpreter/, async r => { q = r.request().postData() ?? r.request().url(); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OSM) }); });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta#/c');   // C hozircha beta (saytda «Tez orada»)
  await expect(page.locator('.ws-c')).toBeVisible();
  // notoʻgʻri kiritish
  await page.fill('#ksNodeIn', 'salom'); await page.click('#ksNodeGo');
  await expect(page.locator('#ksNodeMsg')).toContainText('Koordinata yoki xarita havolasini');
  // Google havolasi
  await page.fill('#ksNodeIn', 'https://www.google.com/maps/@41.31002,69.28001,18z'); await page.click('#ksNodeGo');
  await expect(page.locator('#ksNodeMsg')).toContainText('4 ta tarmoq');
  expect(decodeURIComponent(q)).toMatch(/around:80,41\.31002/);
  await expect(page.locator('.ws-c')).toContainText('OSM · Amir Temur × OSM · Mahalla');
  await expect(page.locator('.ws-c')).toContainText('boʻlaklar — OSM');
  await expect(page.locator('.ws-c')).toContainText('OpenStreetMap');
  // burchak ≈ 90 ± 25° (kesishuvchi qiya), tezlik 60 tanlangan
  const ang = Number((await page.locator('.ws-c .stepper .v').first().textContent())!.replace(/\D/g, ''));
  expect(ang).toBeGreaterThanOrEqual(60); expect(ang).toBeLessThanOrEqual(120);
  await expect(page.locator('.ws-c .seg button[aria-pressed=true]', { hasText: '60' }).first()).toBeVisible();
  // tekshiruvlar ishlaydi
  await expect(page.locator('.ws-c .chk').first()).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ks_c_tugun_1024.png` });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ks_c_tugun_dark.png` });
  // C2: T-chorraha — «Past yoʻq»: belgilar va yozuvlar yoʻq tarmoqda qolmaydi; OSM dagi T tugun ham shunday chiziladi
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const svgLen = () => page.locator('.ws-c svg[role=img]').evaluate(e => e.innerHTML.length);
  const n4 = await svgLen();
  await page.locator('#ksShape .chipb', { hasText: 'Past yoʻq' }).click();
  await expect(page.locator('#ksShape .chipb[aria-pressed=true]')).toHaveText('Past yoʻq');
  expect(await svgLen()).not.toBe(n4);
  await page.locator('#ksShape .chipb', { hasText: '4 tarmoq' }).click();
  const T = { elements: OSM.elements.filter(e => !(e.type === 'way' && e.id === 11)).concat([{ type: 'way', id: 12, nodes: [1, 4], tags: { highway: 'residential', name: 'Berk' } } as never]) };
  await page.unroute(/overpass|interpreter/);
  await page.route(/overpass|interpreter/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(T) }));
  await page.fill('#ksNodeIn', '41.31, 69.28'); await page.click('#ksNodeGo');
  await expect(page.locator('#ksNodeMsg')).toContainText('3 ta tarmoq');
  await expect(page.locator('.ws-c')).toContainText('T-chorraha');
  await expect(page.locator('#ksShape .chipb[aria-pressed=true]')).toHaveText(/Tepa yoʻq|Past yoʻq/);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ks_c_T_1024.png` });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(300);   // rang oʻtishi (transition) tugashi uchun
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ks_c_T_dark.png` });
  // qayta ochilganda saqlanadi
  await page.waitForTimeout(400);   // saqlash 200 ms kechikish bilan
  await page.reload(); await expect(page.locator('.ws-c')).toContainText('OSM · Amir Temur'); await expect(page.locator('#ksShape .chipb[aria-pressed=true]')).toHaveText(/Tepa yoʻq|Past yoʻq/);
});

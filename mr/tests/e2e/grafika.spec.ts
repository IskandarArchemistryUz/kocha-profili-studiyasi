import { test, expect } from './fx';
import { writeFileSync } from 'node:fs';

/** Atrof: yoʻllar toʻri, kvartallarda binolar, park va daraxtlar */
function fixture(): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = []; let id = 1;
  const g = (x: number, y: number) => ({ lon: c[0] + x * mx, lat: c[1] + y * my });
  const sq = (x: number, y: number, w: number, d: number) => [[x, y], [x + w, y], [x + w, y + d], [x, y + d], [x, y]].map(([a, b]) => g(a, b));
  for (let k = -360; k <= 360; k += 180) {
    el.push({ type: 'way', id: id++, tags: { highway: k === 0 ? 'secondary' : 'residential' }, geometry: [g(k, -450), g(k, 450)] });
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [g(-450, k), g(450, k)] });
  }
  for (let bx = -340; bx < 340; bx += 180) for (let by = -340; by < 340; by += 180) {
    if (Math.abs(bx + 70) < 120 && Math.abs(by + 70) < 120) continue;
    if (bx > 150 && by < -150) { el.push({ type: 'way', id: id++, tags: { leisure: 'park' }, geometry: sq(bx, by, 140, 140) }); continue; }
    for (let i = 0; i < 3; i++) el.push({ type: 'way', id: id++, tags: { building: 'apartments', 'building:levels': String(4 + ((bx + by + i * 60) / 60 & 7)) }, geometry: sq(bx + 10 + i * 45, by + 20, 30, 12) });
    for (let i = 0; i < 4; i++) el.push({ type: 'way', id: id++, tags: { building: 'house' }, geometry: sq(bx + 10 + i * 34, by + 100, 14, 12) });
  }
  for (let i = 0; i < 40; i++) el.push({ type: 'node', id: 9000 + i, lat: c[1] + (-300 + (i * 37) % 600) * my, lon: c[0] + (-300 + (i * 53) % 600) * mx, tags: { natural: 'tree' } });
  el.push({ type: 'way', id: 701, tags: { building: 'house' }, geometry: sq(-30, -30, 14, 12) });
  return { elements: el };
}

test('grafika: varaqlar (bosh reja, zonalash, figure-ground), SVG yuklab olish', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|interpreter/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture()) }));
  await page.route(/arcgisonline|terrain|amazonaws|elevation/, r => r.abort());
  await page.goto('./'); await page.click('#newP');
  await page.click('#ctxLoad'); await page.waitForSelector('#ctxSt', { timeout: 60000 });
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
  // V3: xaritada varaq ramkasi → «Varaqni ochish»
  await page.click('#gxOpen');
  await expect(page.locator('.panel[data-mode=frame]')).toBeVisible();
  await page.click('#frScale [data-scale="1000"]');
  await expect(page.locator('#frInfo')).toContainText('1:1');
  await page.click('#frOpen');
  const view = page.locator('#gxView svg');
  await expect(view.locator('#Yangi_binolar')).toBeAttached();
  await expect(view.locator('#Atrof_binolar')).toBeAttached();
  await expect(view.locator('#Buziladigan_binolar')).toBeAttached();
  await expect(page.locator('.gx-info')).toContainText('M 1:');
  const shots = process.env.GX_SHOTS;
  if (shots) { await page.screenshot({ path: `${shots}/gx_bosh.png` }); writeFileSync(`${shots}/bosh.svg`, await page.locator('#gxView').innerHTML()); }
  await page.click('[data-kind=zona]');
  await expect(view.locator('#Zonalar')).toBeAttached();
  if (shots) await page.screenshot({ path: `${shots}/gx_zona.png` });
  await page.click('[data-kind=figura]');
  await expect(view.locator('#Atrof_yollar')).toHaveCount(0);
  if (shots) await page.screenshot({ path: `${shots}/gx_figura.png` });
  await page.click('[data-kind=landshaft]'); if (shots) await page.screenshot({ path: `${shots}/gx_landshaft.png` });
  await page.click('[data-kind=qavat]'); if (shots) await page.screenshot({ path: `${shots}/gx_qavat.png` });
  await page.click('#gxScale [data-scale="2000"]');
  await expect(page.locator('.gx-info')).toContainText('M 1:2000');
  // varaqlar toʻplami (V2): 5 varaq, varaq qoʻshish; tekshiruv; yozuvlar jadvali
  await expect(page.locator('[data-sheet]')).toHaveCount(1);
  await page.click('#shAdd'); await expect(page.locator('[data-sheet]')).toHaveCount(2);
  await expect(view.locator('#Shtamp')).toBeAttached();
  await page.click('#shChecks'); await expect(page.locator('.sh-menu [data-check=labels]')).toBeVisible(); await page.keyboard.press('Escape');
  await page.click('#gxDl');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#gxSvg')]);
  expect(dl.suggestedFilename()).toMatch(/_qavat\.svg$/);
  await page.click('#gxDl');
  const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#gxPdf')]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.gx')).toHaveCount(0);
});

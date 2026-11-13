import { test, expect } from './fx';

/** Koʻrinish tekshiruvi (VGA): loyiha va hozir — bir hisob, legenda solishtiradi (13.11) */
function fixture(): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = []; let id = 1;
  const g = (x: number, y: number) => ({ lon: c[0] + x * mx, lat: c[1] + y * my });
  const sq = (x: number, y: number, w: number, d: number) => [[x, y], [x + w, y], [x + w, y + d], [x, y + d], [x, y]].map(([a, b]) => g(a, b));
  for (const k of [-120, 120]) el.push({ type: 'way', id: id++, tags: { highway: 'secondary' }, geometry: [g(k, -400), g(k, 400)] });
  el.push({ type: 'way', id: id++, tags: { leisure: 'park' }, geometry: sq(140, -100, 120, 200) });
  el.push({ type: 'way', id: id++, tags: { building: 'apartments', 'building:levels': '9' }, geometry: sq(-220, -40, 60, 14) });
  for (let i = 0; i < 20; i++) el.push({ type: 'node', id: 9000 + i, lat: c[1] + (-90 + i * 9) * my, lon: c[0] + 170 * mx, tags: { natural: 'tree' } });
  el.push({ type: 'way', id: id++, tags: { building: 'warehouse' }, geometry: sq(-30, -20, 50, 40) });   // uchastka ichida — hozir bor, loyihada buziladi
  return { elements: el };
}

test('Koʻrinish tekshiruvi: loyiha ↔ hozir xaritasi va legenda', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|interpreter/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture()) }));
  await page.route(/arcgisonline|terrain|amazonaws|elevation/, r => r.abort());
  await page.goto('./'); await page.click('#newP');
  await page.click('#ctxLoad'); await page.waitForSelector('#ctxSt', { timeout: 60000 });
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('#genGo');
  await page.click('#layPop');
  await page.click('[data-map=kor]');
  const leg = page.locator('.maplegend');
  await expect(leg).toContainText('Koʻrinish — loyiha', { timeout: 90000 });
  await expect(leg).toContainText(/Uchastka, mediana: loyiha [\d\s]+ · hozir [\d\s]+ m²/);
  await expect(leg).toContainText('Binolardan boʻsh joy');
  if (process.env.GX_SHOTS) { await page.click('#layPop'); await page.screenshot({ path: `${process.env.GX_SHOTS}/korinish.png` }); await page.click('#layPop'); }
  await page.click('[data-map=kor0]');   // kesh — qayta hisob yoʻq
  await expect(leg).toContainText('Koʻrinish — hozir', { timeout: 5000 });
  await page.click('#layPop');
  await page.click('.maplegend .ib');
  await expect(leg).toHaveCount(0);
});

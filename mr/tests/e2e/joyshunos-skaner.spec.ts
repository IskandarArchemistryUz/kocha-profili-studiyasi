import { test, expect, type Page } from './fx';

/**
 * Ijtimoiy skaner (12.11): doira ichidagi har bino uchun xizmatlarga piyoda yetish bali; binoni bosish — bino pasporti.
 * OSM soxta: 100 m toʻr koʻchalar, kvartallarda binolar, maktab va bekat bor, bogʻcha yoʻq.
 */
test.use({ reducedMotion: 'reduce' });
const C = [69.2797, 41.3111];
const kx = 111320 * Math.cos(C[1] * Math.PI / 180), ky = 111132;
const ll = (x: number, y: number) => ({ lat: C[1] + y / ky, lon: C[0] + x / kx });
let k = 1;
function osm(): unknown[] {
  const el: unknown[] = [];
  for (let i = -6; i <= 6; i++) {
    // OSM dagidek: chorrahalarda umumiy tugun (har 100 m)
    const st = Array.from({ length: 14 }, (_, j) => -650 + j * 100).map(v => Math.max(-650, Math.min(650, v)));
    el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [-650, ...st.slice(1, -1).map(v => v + 50), 650].map(v => ll(i * 100, v)) });
    el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [-650, ...st.slice(1, -1).map(v => v + 50), 650].map(v => ll(v, i * 100)) });
  }
  // har kvartal markazida 20 × 20 m bino
  for (let i = -5; i < 5; i++) for (let j = -5; j < 5; j++) {
    const x = i * 100 + 40, y = j * 100 + 40;
    el.push({ type: 'way', id: k++, tags: { building: 'apartments', 'building:levels': '5' }, geometry: [ll(x, y), ll(x + 20, y), ll(x + 20, y + 20), ll(x, y + 20), ll(x, y)] });
  }
  el.push({ type: 'node', id: k++, ...ll(-150, 0), tags: { amenity: 'school' } });
  el.push({ type: 'node', id: k++, ...ll(350, 300), tags: { highway: 'bus_stop' } });
  el.push({ type: 'node', id: k++, ...ll(0, -300), tags: { shop: 'supermarket' } });
  return el;
}
async function open(page: Page): Promise<void> {
  await page.route(/fonts\.g|openfreemap|arcgis|gibs\.earthdata|elevation-tiles-prod|nominatim|landsat|usgs/, r => r.abort());
  await page.route(/overpass|kumi\.systems|mail\.ru|private\.coffee/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: osm() }) }));
  await page.addInitScript(([c]) => { try { if (!sessionStorage.getItem('joyInit')) { sessionStorage.setItem('joyInit', '1'); localStorage.setItem('joy-state', JSON.stringify({ c, r: 300, on: ['skaner'], act: 'skaner', cat: 'cafe', base: 'stil' })); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } }, [C]);
  await page.goto('./joyshunos.html');
}

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`ijtimoiy skaner: hudud va bino pasporti · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await open(page);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const card = page.locator('[data-card=skaner]');
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator('.big')).toHaveText(/\d+ bino · oʻrtacha \d+/, { timeout: 60_000 });
  // bogʻcha OSM da yoʻq — hudud oʻrtachasida 0 ball
  await expect(card.locator('li[data-dim=mtm] b')).toHaveText('0 ball');
  await expect(card.locator('li[data-dim=maktab]')).toHaveClass(/ok|warn/);
  // binoni bosish: markazga eng yaqin bino (40..60, 40..60 m)
  const p = await page.evaluate(([x, y]) => { const m = (window as unknown as { joyMap: { project: (c: [number, number]) => { x: number; y: number } } }).joyMap; return m.project([x, y]); }, [ll(50, 50).lon, ll(50, 50).lat]);
  const box = (await page.locator('.maplibregl-canvas').boundingBox())!;
  await page.mouse.click(box.x + p.x, box.y + p.y);
  await expect(card.locator('.big')).toHaveText(/^\d+ \/ 100$/, { timeout: 10_000 });
  await expect(card).toContainText('Asosiy bosim');
  await expect(card.locator('li[data-dim=mtm] b')).toHaveText('topilmadi');
  // markaz oʻzgarmadi (bino bosilganda tahlil nuqtasi koʻchmaydi)
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('joy-state') || '{}').c);
  expect(st).toEqual(C);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_skaner_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#joySkAll');
  await expect(card.locator('.big')).toHaveText(/bino · oʻrtacha/);
});

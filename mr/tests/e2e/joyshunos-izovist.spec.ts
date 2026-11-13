import { test, expect, type Page } from './fx';

/**
 * Koʻrinadigan joy — izovist (13.11): Nuqta (xaritani bosish) va Marshrut (chizish → hisob → ijro → grafik).
 * OSM soxta: 100 m toʻr koʻchalar, har kvartalda 60 × 60 m bino (koʻchalar eni 40 m).
 */
test.use({ reducedMotion: 'reduce' });
const C = [69.2797, 41.3111];
const kx = 111320 * Math.cos(C[1] * Math.PI / 180), ky = 111132;
const ll = (x: number, y: number) => ({ lat: C[1] + y / ky, lon: C[0] + x / kx });
let k = 1;
function osm(): unknown[] {
  const el: unknown[] = [];
  for (let i = -6; i <= 6; i++) {
    el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [-650, 650].map(v => ll(i * 100, v)) });
    el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [-650, 650].map(v => ll(v, i * 100)) });
  }
  for (let i = -5; i < 5; i++) for (let j = -5; j < 5; j++) {
    const x = i * 100 + 20, y = j * 100 + 20;
    el.push({ type: 'way', id: k++, tags: { building: 'apartments', 'building:levels': '5' }, geometry: [ll(x, y), ll(x + 60, y), ll(x + 60, y + 60), ll(x, y + 60), ll(x, y)] });
  }
  return el;
}
async function open(page: Page): Promise<void> {
  await page.route(/\/private\//, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ layers: [], features: [] }) }));
  await page.route(/fonts\.g|openfreemap|arcgis|gibs\.earthdata|elevation-tiles-prod|nominatim|landsat|usgs/, r => r.abort());
  await page.route(/overpass|kumi\.systems|mail\.ru|private\.coffee/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: osm() }) }));
  await page.addInitScript(([c]) => { try { if (!sessionStorage.getItem('joyInit')) { sessionStorage.setItem('joyInit', '1'); localStorage.setItem('joy-state', JSON.stringify({ c, r: 300, on: ['izovist'], act: 'izovist', cat: 'cafe', base: 'stil' })); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } }, [C]);
  await page.goto('./joyshunos.html');
}
async function clickAt(page: Page, x: number, y: number): Promise<void> {
  const p = await page.evaluate(([lon, lat]) => (window as unknown as { joyMap: { project: (c: [number, number]) => { x: number; y: number } } }).joyMap.project([lon, lat]), [ll(x, y).lon, ll(x, y).lat]);
  const box = (await page.locator('.maplibregl-canvas').boundingBox())!;
  await page.mouse.click(box.x + p.x, box.y + p.y);
}

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`koʻrinadigan joy: nuqta va marshrut · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await open(page);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const card = page.locator('[data-card=izovist]');
  await expect(card).toBeVisible({ timeout: 30_000 });
  // Nuqta: markaz (0,0) — chorraha; koʻrinish maydoni m² da
  await expect(card.locator('.big')).toHaveText(/^[\d\s ]+ m²$/, { timeout: 60_000 });
  const a0 = await card.locator('.big').textContent();
  // koʻcha oʻrtasida, chorrahadan uzoqroq — boshqa maydon; tahlil nuqtasi koʻchmaydi
  await clickAt(page, 50, 0);
  await expect(card.locator('.big')).not.toHaveText(a0!, { timeout: 10_000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('joy-state') || '{}').c)).toEqual(C);
  // bino ichi
  await clickAt(page, 50, 50);
  await expect(card.locator('.big')).toHaveText('bino ichida');
  // Marshrut rejimi: chizish → hisob → sarlavha, grafik, ijro
  await card.getByRole('button', { name: 'Marshrut', exact: true }).click();
  await card.locator('#izDraw').click();
  await clickAt(page, -200, 0); await clickAt(page, 0, 0); await clickAt(page, 0, 200);
  await page.keyboard.press('Enter');
  await expect(card.locator('.joy-izh')).toHaveText(/^(Yoʻlning \d+ foizida koʻrinish 1\s000 m² dan kam|Butun yoʻlda koʻrinish 1\s000 m² dan koʻp)$/, { timeout: 60_000 });
  await expect(card.locator('#izChart')).toBeVisible();
  await expect(card.locator('#izPos')).toHaveText(/^0 \/ (39\d|40\d) m$/);
  await card.locator('#izPlay').click();
  await expect(card.locator('#izPlay')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(600);
  await card.locator('#izPlay').click();
  await expect(card.locator('#izPlay')).toHaveAttribute('aria-pressed', 'false');
  // grafikni bosish — oʻsha masofaga oʻtadi
  const g = (await card.locator('#izChart').boundingBox())!;
  await page.mouse.click(g.x + g.width * 0.75, g.y + g.height / 2);
  await expect(card.locator('#izPos')).toHaveText(/^(29\d|3\d\d) \/ (39\d|40\d) m$/);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_izovist_${w}${dark ? 'd' : 'l'}.png` });
  await card.locator('#izClr').click();
  await expect(card.locator('#izDraw')).toHaveText('Marshrutni chizish');
});

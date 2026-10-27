import { test, expect } from './fx';

/** Qorashina sxemasi: 2 mahalla, aholi punkti chegarasi, 30 bino (landuse, height_m, floors) — WGS84 */
const C = [66.5733, 38.3395], mx = 1 / (111320 * Math.cos(C[1] * Math.PI / 180)), my = 1 / 110574;
const g = (x: number, y: number) => [C[0] + x * mx, C[1] + y * my];
const sq = (x: number, y: number, w: number, d: number) => [[g(x, y), g(x + w, y), g(x + w, y + d), g(x, y + d), g(x, y)]];
const fc = (features: unknown[]) => JSON.stringify({ type: 'FeatureCollection', features });
const F = (coordinates: unknown, properties: Record<string, unknown>) => ({ type: 'Feature', properties, geometry: { type: 'Polygon', coordinates } });

const buildings = fc(Array.from({ length: 30 }, (_, i) => F(sq(-280 + (i % 10) * 50, -60 + Math.floor(i / 10) * 50, 14, 10),
  { floors: i % 3 ? 1 : 2, height_m: i % 3 ? 3.35 : 6.7, landuse: i < 20 ? 'NOP' : 'RES', mahalla: i < 15 ? 'Nodira MFY' : 'Boʻston MFY' })));
const mahalla = fc([F(sq(-300, -100, 300, 300), { name: 'Nodira MFY' }), F(sq(0, -100, 300, 300), { name: 'Boʻston MFY' }), F(sq(400, 400, 20, 20), { name: null })]);
const settle = fc([F(sq(-300, -100, 450, 300), { closed: true })]);

test('mening qatlamlarim: GeoJSON import, toifalar, mahalla koʻrsatkichlari, loyiha faylida saqlanadi', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.route(/overpass|interpreter|openfreemap|arcgisonline|terrain|amazonaws/, r => r.abort());
  await page.goto('./'); await page.click('#newP');
  // Hudud panelidagi tugma — Qatlamlar oynasini ochadi
  await page.locator('#ctxMore').waitFor(); if ((await page.locator('#ctxMore').getAttribute('open')) === null) await page.click('#ctxMore > summary'); await expect(page.locator('#ctxMore')).toHaveAttribute('open', ''); await page.click('#ulOpen');
  await expect(page.locator('#ulSec')).toBeVisible();

  // 1) binolar
  await page.setInputFiles('#ulFile', { name: 'QOR_buildings_archicad_WGS84.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(buildings) });
  await expect(page.locator('#ulForm')).toContainText('30 ta obyekt');
  await expect(page.locator('#ulKind button[aria-pressed=true]')).toHaveText('Binolar');
  await expect(page.locator('#ulCat')).toHaveValue('landuse');
  await expect(page.locator('#ulH')).toHaveValue('height_m');
  await page.click('#ulOk');
  await expect(page.locator('#ulList .li')).toHaveCount(1);
  await expect(page.locator('#ulList')).toContainText('QOR_buildings_archicad_WGS84');

  // 2) mahallalar: mayda nomsiz boʻlak tashlanadi
  await page.setInputFiles('#ulFile', { name: 'QOR_mahalla_boundaries_WGS84.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(mahalla) });
  await expect(page.locator('#ulKind button[aria-pressed=true]')).toHaveText('Chegaralar');
  await expect(page.locator('#ulForm')).toContainText('Nomsiz mayda boʻlaklar (< 10 ga): 1 ta');
  await expect(page.locator('#ulOk')).toContainText('(2)');
  await page.click('#ulOk');

  // 3) aholi punkti chegarasi (tur — qoʻlda «Chegaralar»)
  await page.setInputFiles('#ulFile', { name: 'QOR_settlement_boundary_WGS84.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(settle) });
  await page.click('#ulKind button:has-text("Chegaralar")');
  await page.click('#ulOk');
  await expect(page.locator('#ulList .li')).toHaveCount(3);

  // toifani oʻchirish (bekor qilish tarixida)
  const bl = page.locator('#ulList [data-ul]').filter({ hasText: 'QOR_buildings' });
  await bl.locator('button[aria-label=Sozlash]').click();
  await expect(page.locator('.ulcats [data-cat]')).toHaveCount(2);
  await page.locator('.ulcats [data-cat=RES] .switch').click();
  await expect(page.locator('#undo')).toHaveAttribute('title', /Qatlam sozlamasi/);

  // mahalla koʻrsatkichlari: binolar markazi boʻyicha, aholi punkti ichidagi maydon
  const mh = page.locator('#ulList [data-ul]').filter({ hasText: 'QOR_mahalla' });
  await mh.locator('button[aria-label=Sozlash]').click();
  await page.locator('[data-ulstats]').click();
  await page.locator('#ulStats').waitFor();
  await page.selectOption('select[aria-label="Aholi punkti chegarasi"]', { label: 'QOR_settlement_boundary_WGS84' });
  const rows = page.locator('#ulStats tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Nodira MFY');
  await expect(rows.nth(0).locator('td').nth(3)).toHaveText('18');   // 30 binodan 18 tasi chap mahallada (markazi x < 0)
  await expect(rows.nth(1).locator('td').nth(2)).toHaveText('4,5');   // Boʻston: 9 ga dan aholi punkti ichida 4,5 ga
  if (shots) await page.screenshot({ path: `${shots}/userlayers.png` });

  // sahifa yangilansa — qatlamlar bazadan tiklanadi (avtosaqlash 0,5 s kechikish bilan)
  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved');
  await page.waitForTimeout(800);
  await page.reload();
  await page.click('#layPop');
  await expect(page.locator('#ulList .li')).toHaveCount(3);
  await expect(page.locator('#ulList')).not.toContainText('yuklanmoqda');
});

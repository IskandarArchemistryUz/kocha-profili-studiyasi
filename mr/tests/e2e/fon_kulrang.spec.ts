import { test, expect } from './fx';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Kulrang fon (atrof yuklanmaganda): kalit boʻlsa — Esri Static Basemap Tiles (512 px), rad etilsa — eski kalitsiz Canvas */
const png = readFileSync(join(process.cwd(), 'tests/e2e/fixtures/rasm.png'));
async function start(page: import('@playwright/test').Page, staticOk: boolean) {
  const hits = { stat: 0, legacy: 0 };
  await page.route(/overpass|openfreemap|elevation|openstreetmap|amazonaws|ibasemaps/, r => r.fulfill({ status: 404, body: '' }));
  await page.route(/static-map-tiles-api\.arcgis\.com/, r => { hits.stat++; return staticOk ? r.fulfill({ status: 200, contentType: 'image/png', body: png }) : r.fulfill({ status: 403, body: '{"error":{"code":403}}' }); });
  await page.route(/server\.arcgisonline\.com/, r => { hits.legacy++; return r.fulfill({ status: 200, contentType: 'image/png', body: png }); });
  await page.addInitScript(() => { try { sessionStorage.setItem('kps_esri', 'AAPTtestkeyabcdefghijklmnop'); } catch { /* */ } });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  return hits;
}
test('kulrang fon: kalitli Static Basemap Tiles, manba matnida TomTom', async ({ page }) => {
  const hits = await start(page, true);
  await expect(page.locator('.attr .carto')).toContainText('TomTom', { timeout: 20_000 });
  expect(hits.stat).toBeGreaterThan(0); expect(hits.legacy).toBe(0);
});
test('kulrang fon: kalitda ruxsat yoʻq (403) — eski kalitsiz Canvas', async ({ page }) => {
  const hits = await start(page, false);
  await expect(page.locator('.attr .carto')).toContainText('HERE', { timeout: 20_000 });
  expect(hits.stat).toBeGreaterThan(0); expect(hits.legacy).toBeGreaterThan(0);
});

import { test, expect } from './fx';
import { readFileSync } from 'node:fs';

/** Hudud joyi koordinatadan: mamlakat, vaqt mintaqasi va meʼyorlar profili (Toshkent — ShNQ, Parij/Melburn — xalqaro andozalar) */
async function openAt(page: import('@playwright/test').Page, c: [number, number], lang = 'uz', on: string[] = []) {
  await page.route(/fonts\.g|openfreemap|arcgis|gibs|nominatim|overpass|kumi\.systems|mail\.ru|private\.coffee|elevation-tiles/, r => r.abort());
  await page.addInitScript(([c, lang, on]) => { try { localStorage.setItem('joy-state', JSON.stringify({ c, r: 500, on })); localStorage.setItem('mr-lang', lang as string); } catch { /* */ } }, [c, lang, on] as const);
  await page.goto('./joyshunos.html');
}
test('Joy: Toshkent — ShNQ, Parij — xalqaro andozalar va UTC+2, Melburn — janub', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await openAt(page, [69.2797, 41.3111]);
  await expect(page.locator('#joyPlace')).toContainText('Asia/Tashkent');
  await expect(page.locator('#joyPlace')).toContainText('UTC+5');
  await expect(page.locator('#joyPlace .nb')).toHaveClass(/uz/);
  await openAt(page, [2.3522, 48.8566]);
  await expect(page.locator('#joyPlace')).toContainText('Europe/Paris');
  await expect(page.locator('#joyPlace')).toContainText('UTC+2');
  await expect(page.locator('#joyPlace .nb')).toHaveClass(/intl/);
  await expect(page.locator('#joyPlace .nb')).toContainText('xalqaro andozalar');
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/joy-parij.png' });
  // shamol: Parijga eng yaqin stansiya Oʻzbekistonda — shamol guli koʻrsatilmaydi, ogohlantirish chiqadi
  await openAt(page, [2.3522, 48.8566], 'uz', ['shamol']);
  await expect(page.locator('#windFar')).toContainText('km uzoqda');
  await expect(page.locator('[data-card=shamol] .big')).toHaveText('—');
  // Toshkentda — shamol guli bor
  await openAt(page, [69.2797, 41.3111], 'uz', ['shamol']);
  await expect(page.locator('[data-card=shamol] .src')).toContainText('Stansiya');
  await expect(page.locator('#windFar')).toHaveCount(0);
  await openAt(page, [144.9631, -37.8136], 'en');
  await expect(page.locator('#joyPlace')).toContainText('Australia');
  await expect(page.locator('#joyPlace .nb')).toContainText('international benchmarks');
  expect(errs).toEqual([]);
});

test('Koʻcha rejimi: joy belgisi xarita/koʻcha markaziga ergashadi; uslub almashganda chizilgan koʻcha yoʻqolmaydi', async ({ page }) => {
  await page.route(/fonts\.g|openfreemap|arcgis|gibs|nominatim|overpass|kumi\.systems|mail\.ru|private\.coffee|elevation-tiles|archemistry\.uz/, r => r.abort());
  await page.addInitScript(() => { try { localStorage.setItem('joy-state', JSON.stringify({ c: [69.2797, 41.3111], r: 500, on: [], an: 'kocha' })); localStorage.setItem('mr-lang', 'uz'); } catch { /* */ } });
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('./joyshunos.html');
  await page.waitForFunction(() => !!(window as any).joyMap?.getSource?.('joy-st-line'), null, { timeout: 30_000 });
  await expect(page.locator('#joyPlace')).toContainText('Asia/Tashkent');
  // xaritani Parijga surish — belgi ergashadi, nom lotinda
  await page.evaluate(() => (window as any).joyMap.jumpTo({ center: [2.3522, 48.8566], zoom: 16 }));
  await expect(page.locator('#joyPlace')).toContainText('Europe/Paris');
  expect(await page.locator('#joyPlace .pl').textContent()).not.toMatch(/[Ѐ-ӿ]/);
  // koʻchani chizish (2 nuqta + Enter)
  const box = (await page.locator('.maplibregl-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.5); await page.waitForTimeout(350);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5); await page.waitForTimeout(350);
  await page.keyboard.press('Enter');
  await expect(page.locator('#stTtl')).toBeVisible();
  // tahlil yuklanayotganda/yuklanmaganda ham chizilgan oʻq koʻrinadi
  const n = () => page.evaluate(() => { const m = (window as any).joyMap; return m.getSource('joy-st-draft') ? m.querySourceFeatures('joy-st-draft').length + ((m.getSource('joy-st-draft') as any)._data?.features?.length ?? 0) : -1; });
  await expect.poll(n).toBeGreaterThan(0);
  // uslubni almashtirish → qatlamlar qaytadan qoʻshiladi
  await page.locator('button', { hasText: 'Sunʼiy yoʻldosh' }).first().click();
  await expect.poll(() => page.evaluate(() => !!(window as any).joyMap.getLayer('joy-st-draft'))).toBe(true);
  await expect.poll(n).toBeGreaterThan(0);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_kocha_parij_dark.png` });
  // tozalash
  await page.locator('#stReset').click();
  await expect.poll(n).toBe(0);
});

test('Shamol: Parijda yaqin stansiya yoʻq — ERA5 (server orqali); navbatda — kutish yozuvi', async ({ page }) => {
  const st = JSON.parse(readFileSync('public/climate/uz_climate.json', 'utf8')).stations[0];
  let mode: 'pending' | 'ok' = 'pending';
  await page.route(/\/data\/wind\?/, r => mode === 'pending' ? r.fulfill({ status: 202, json: { status: 'pending' } }) : r.fulfill({ json: { source: 'era5', station: { ...st, name: 'ERA5 48.75, 2.25', lat: 48.75, lon: 2.25 } } }));
  await openAt(page, [2.3522, 48.8566], 'uz', ['shamol']);
  await expect(page.locator('#windEra')).toContainText('Copernicus');
  mode = 'ok';
  await openAt(page, [2.3522, 48.8566], 'uz', ['shamol']);
  await expect(page.locator('[data-card=shamol] #windSrc')).toContainText('ERA5');
  await expect(page.locator('[data-card=shamol] .big')).not.toHaveText('—');
  await expect(page.locator('#windFar')).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_era5_dark.png` });
});

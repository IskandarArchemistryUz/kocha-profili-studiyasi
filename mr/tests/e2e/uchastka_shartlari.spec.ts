import { test, expect } from './fx';
import { fileURLToPath } from 'node:url';

/** 12.11 — meʼyorlar toʻplami, 3-bosqich, 1-band: «Uchastka shartlari» formasi, majburiy tekshiruv va generator */
const SAMPLE = fileURLToPath(new URL('../../../data/namuna-mahalla.archemistry.json', import.meta.url));
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`uchastka shartlari · ${w}${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.route('**/data/namuna-mahalla.archemistry.json', r => r.fulfill({ path: SAMPLE, contentType: 'application/json' }));
  await page.setViewportSize({ width: w, height: w > 1100 ? 900 : 760 });
  await page.goto('./#/namuna'); await page.waitForURL(/#\/p\//);
  if (dark) await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect(page.locator('#kGfa b')).not.toHaveText('—', { timeout: 20_000 });
  await page.click('[data-step=uchastka]');
  await expect(page.locator('#scEntry')).toContainText('Uchastka shartlari');
  await page.click('#scOpen');
  await expect(page.locator('#scForm .sc-num')).toHaveCount(10);
  await expect(page.locator('#sc_sbSide').locator('xpath=..')).toContainText('boʻsh — ShNQ');
  // notoʻgʻri qiymat — belgilanadi, qoʻllanmaydi
  await page.fill('#sc_far', 'abc'); await expect(page.locator('#sc_far')).toHaveAttribute('aria-invalid', '');
  await page.fill('#sc_far', '0,5'); await expect(page.locator('#sc_far')).not.toHaveAttribute('aria-invalid', '');
  await page.fill('#sc_hMax', '9');
  await page.fill('#scSrc', 'Zona R2, 14-modda');
  if (process.env.GX_SHOTS) { await page.locator('#scForm').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${process.env.GX_SHOTS}/shartlar_forma_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#scApply');
  await expect(page.locator('#scCnt')).toHaveText('2');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.siteCond)).toEqual({ far: 0.5, hMax: 9, src: 'Zona R2, 14-modda' });
  // meʼyorlar roʻyxatida — majburiy, mos emas
  await page.click('#normReg');
  const row = page.locator('.regw').getByText('Balandlik — uchastka sharti');
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.regw')).toContainText('Zona R2, 14-modda');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/shartlar_reyestr_${w}${dark ? 'd' : 'l'}.png` });
  // toʻplam sifatida saqlash va qayta yuklash
  await page.click('#scOpen'); await page.click('#scSave');
  await expect(page.locator('#scSaved .chip')).toHaveText(['Zona R2, 14-modda']);
  await page.click('#scClear');
  await expect(page.locator('#scCnt')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.siteCond)).toBeUndefined();
});

test('generator balandlik va chekinish shartiga amal qiladi', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.evaluate(() => (window as any).__mr.store.dispatch({ type: 'setSettings', patch: { siteCond: { hMax: 13 } } }));
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30_000 }).toBeGreaterThan(0);
  const fl = await page.evaluate(() => { const d = (window as any).__mr.store.doc; return { maxF: Math.max(...d.buildings.map((b: any) => b.floors)), fh: d.settings.floorHeight }; });
  expect(fl.maxF * fl.fh).toBeLessThanOrEqual(13 + 0.01);
});

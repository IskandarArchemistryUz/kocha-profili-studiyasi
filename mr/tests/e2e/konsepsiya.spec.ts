import { test, expect } from './fx';

/** 12.11 — meʼyorlar toʻplami, 3-bosqich, 3-band: Oʻzbekistonda «Konsepsiya rejimi (erkin)» */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`konsepsiya rejimi · ${w}${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: w > 1100 ? 900 : 760 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.evaluate(() => (window as any).__mr.store.dispatch({ type: 'moveProject', origin: [69.2797, 41.3111], carry: false }));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30_000 }).toBeGreaterThan(0);
  if (dark) await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  // ShNQ rejimida «mos emas» bandlar bor (maktab, MTM)
  await expect(page.locator('#kStat')).toHaveAttribute('data-s', 'fail', { timeout: 20_000 });
  await page.click('[data-step=uchastka]');
  await expect(page.locator('#conceptRow')).toBeVisible();
  await expect(page.locator('#conceptNote')).toHaveCount(0);
  await page.click('#conceptOn');
  await expect(page.locator('#conceptNote')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.concept)).toBe(true);
  await expect(page.locator('#kStat')).not.toHaveAttribute('data-s', 'fail');
  await page.click('#kMore');
  await expect(page.locator('.regw .rrow [data-s=fail]')).toHaveCount(0);
  await expect(page.locator('.regw')).toContainText('Konsepsiya rejimi');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/konsepsiya_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#kMore');
  // xalqaro toʻplamda rejim yoʻq
  await page.click('#normBox [data-norms=intl]');
  await expect(page.locator('#conceptRow')).toHaveCount(0);
  await page.click('#normBox [data-norms=UZ]');
  await page.click('#conceptOn');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.concept)).toBeUndefined();
  await expect(page.locator('#kStat')).toHaveAttribute('data-s', 'fail');
});

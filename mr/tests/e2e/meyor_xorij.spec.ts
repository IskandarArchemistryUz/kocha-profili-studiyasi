import { test, expect } from './fx';

/** 33-band: Oʻzbekistondan tashqaridagi loyihada ShNQ «mos emas» emas — andoza («koʻrib chiqish») */
async function proj(page: import('@playwright/test').Page, origin: [number, number]) {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.evaluate(o => (window as any).__mr.store.dispatch({ type: 'moveProject', origin: o, carry: false }), origin);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 0, null, { timeout: 30000 });
  await page.click('#kMore');
  await expect(page.locator('.drawer .rrow').first()).toBeVisible();
}
test('Parij: reyestrda xorij izohi, ShNQ «mos emas» yoʻq; Toshkentda — avvalgidek', async ({ page }) => {
  test.setTimeout(120_000);
  await proj(page, [2.3522, 48.8566]);
  await expect(page.locator('#regAbroad')).toBeVisible();
  await expect(page.locator('#regSeg button:last-child')).toContainText('· 0');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/meyor_xorij_dark.png` });
  await proj(page, [69.2797, 41.3111]);
  await expect(page.locator('#regAbroad')).toHaveCount(0);
  await expect(page.locator('#regSeg button:last-child')).not.toContainText('· 0');   // Toshkentda shu loyihada «mos emas» bandlar bor
});

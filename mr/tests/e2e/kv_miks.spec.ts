import { test, expect } from './fx';

/** 04.11 (Murad Buildings sinovi, 7-band): miks maqsaddan > 5 punkt farq qilsa — sababi va yaqinlashtirish yoʻli koʻrsatiladi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`kvartira miksi — farq sababi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '240'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(4);
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  // 4 xonalini 40 % ga koʻtaramiz — sigʻmaydi, sababi yoziladi
  await page.evaluate(() => { const m = (window as any).__mr; m.store.dispatch({ type: 'setSettings', patch: { aptMix: [10, 20, 30, 40] } }); m.renderPanel(); });
  await expect(page.locator('#mixWhy')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#mixWhy')).toContainText('4 xonali');
  if (process.env.GX_SHOTS) { await page.locator('#mixWhy').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/kv_miks_${w}${dark ? 'd' : 'l'}.png` }); }
});

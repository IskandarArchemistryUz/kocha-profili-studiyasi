import { test, expect } from './fx';

/** 12.11 (eski navbat, 8-band; egasi 06.11, bino 47): «+» minorada zina katagi fasadda — qanot yon devorida, tabiiy yorugʻlik bilan (325-band) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`«+» minora: zina fasadda · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, k = [1 / (111320 * Math.cos(o[1] * Math.PI / 180)), 1 / 111132], g = (x: number, y: number) => [o[0] + x * k[0], o[1] + y * k[1]];
    const A = 7, B = 19, c = [[-A, -B], [A, -B], [A, -A], [B, -A], [B, A], [A, A], [A, B], [-A, B], [-A, A], [-B, A], [-B, -A], [-A, -A]];
    ed.store.dispatch({ type: 'addBuilding', footprint: c.map(p => g(p[0], p[1])), floors: 12, use: 'turar' });
  });
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon', { timeout: 60_000 });
  await page.locator('#planGp path[data-bld]').first().dispatchEvent('click');
  await page.click('#planEditBtn');
  await expect(page.locator('#albPlan svg path[data-apt]').first()).toBeAttached();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/minora_plus_${w}${dark ? 'd' : 'l'}.png` }); }
  expect(errs).toEqual([]);
});

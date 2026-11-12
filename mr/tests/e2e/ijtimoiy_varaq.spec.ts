import { test, expect } from './fx';

/** 12.11 (eski navbat, 2-band): «Ijtimoiy infratuzilma» varagʻi — ijtimoiy binolar toʻliq rangda va raqamli, qolganlari och; aksonometrik doira-namunalar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`ijtimoiy infratuzilma varagʻi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  // uchastka ichida ikki ijtimoiy bino (maktab L-shakl, bogʻcha) — hovlining markaziga
  await page.evaluate(() => {
    const ed = (window as any).__mr, fr = ed.store.doc.origin, k = [1 / (111320 * Math.cos(fr[1] * Math.PI / 180)), 1 / 111132];
    const g = (x: number, y: number) => [fr[0] + x * k[0], fr[1] + y * k[1]];
    ed.store.dispatch({ type: 'addBuilding', footprint: [g(-30, -20), g(5, -20), g(5, -12), g(-18, -12), g(-18, 12), g(-30, 12)], floors: 3, use: 'maktab' });
    ed.store.dispatch({ type: 'addBuilding', footprint: [g(12, -15), g(32, -15), g(32, 5), g(12, 5)], floors: 2, use: 'mtm' });
  });
  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('[data-kind=ijtimoiy]');
  const v = page.locator('#gxView');
  await expect(v.locator('#Aksonometrik_namunalar')).toBeAttached({ timeout: 20_000 });
  await expect(v).toContainText('Maktab');
  await expect(v.locator('#Ijtimoiy_raqamlar text')).toHaveCount(2);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/ijtimoiy_${w}${dark ? 'd' : 'l'}.png` }); }
});

import { test, expect } from './fx';

/** 12.11 (eski navbat, 5-band): «Yongʻin marshrutlari» varagʻi — yetib keladigan sirt, kelish tomoni va 5–8 m zona */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`yongʻin marshrutlari varagʻi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('[data-kind=yongin]');
  const v = page.locator('#gxView');
  await expect(v.locator('#Shartli_belgilar')).toBeAttached({ timeout: 20_000 });
  await expect(v).toContainText(/H [<≥] 28 m/);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/yongin_${w}${dark ? 'd' : 'l'}.png` }); }
});

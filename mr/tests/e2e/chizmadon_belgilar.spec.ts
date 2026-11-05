import { test, expect } from './fx';

/** 06.11 (03.11 roʻyxati): «Shartli belgilar» Chizmadonda joy topmasdi — endi tushuntiradigan materialning katagida (chizmaga tegmasdan); reja belgilari kichik katakda ham */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Chizmadon: shartli belgilar joy topadi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(200_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen'); await page.click('#chStGo');
  const leg = page.locator('.li', { hasText: 'Shartli belgilar' }).first();
  await expect(leg).toContainText(/\d+-varaqda/);
  await expect(page.locator('.ch-banner')).not.toContainText('Shartli belgilar');
  // varaqda: legenda alohida guruh, tushuntiradigan material bilan kesishmaydi
  for (let i = 0; i < 20 && !(await page.locator('.ch-body [data-el="legend"]').count()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); }
  const lg = page.locator('.ch-body [data-el="legend"]').first();
  await expect(lg).toBeAttached();
  const host = lg.locator('xpath=preceding-sibling::*[@data-el][1]');
  const a = (await lg.locator('rect').first().boundingBox())!, b = (await host.locator('rect').first().boundingBox())!;
  const ix = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  expect(ix).toBeLessThan(1);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/belgilar_keyin_${w}${dark ? 'd' : 'l'}.png` }); }
  // tahlil modullari (xizmat radiusi, 4 ta katak) — har birida belgilar qutisi
  for (let i = 0; i < 25 && !(await page.locator('.ch-body [data-el="p:plan:svc:mtm"]').count()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); }
  const svc = await page.evaluate(() => [...document.querySelectorAll('.ch-body [data-el^="p:plan:svc:"]')].map(e => /fill-opacity="?\.93/.test(e.outerHTML)));
  expect(svc.length).toBeGreaterThan(0); expect(svc.every(Boolean)).toBe(true);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/belgilar_svc_${w}${dark ? 'd' : 'l'}.png` }); }
});

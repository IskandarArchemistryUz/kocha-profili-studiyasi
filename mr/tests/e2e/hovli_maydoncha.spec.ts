import { test, expect } from './fx';

/** 05.11: ShNQ 2.07.01-23, 90–92-bandlar — qisqartirish asoslari (Yashil → Batafsil), 91-band (≥ 150 m²), play-89 izohi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`hovli maydonchalari — 90–92-bandlar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(1);
  await page.click('[data-step=yashil]');
  await page.click('#greenMore > summary');
  await expect(page.locator('#play90')).toBeVisible();
  const need0 = await page.evaluate(() => (window as any).__mr.last?.d.playNeed);
  expect(need0).toBeGreaterThan(0);
  await page.click('#play90Sport');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.settings.play90?.sport)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__mr.last?.d.playNeed)).toBeLessThan(need0 * 0.6);
  await page.click('#kMore');
  await page.locator('.drawer [data-rule=play-89] button.li').click();
  await expect(page.locator('.drawer [data-rule=play-89]')).toContainText('90-band qoʻllandi');
  await expect(page.locator('.drawer [data-rule=play-91]')).toBeAttached();
  if (process.env.GX_SHOTS) { await page.locator('.drawer [data-rule=play-89]').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/play89_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#kMore');
  await page.click('#play90Sport');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.last?.d.playNeed)).toBeCloseTo(need0, 0);
  if (process.env.GX_SHOTS) { await page.locator('#play90').scrollIntoViewIfNeeded(); await page.click('#play90Dust'); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/play90_${w}${dark ? 'd' : 'l'}.png` }); }
});

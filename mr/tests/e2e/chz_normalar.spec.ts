import { test, expect } from './fx';

/** 12.11 (meʼyorlar toʻplami, 3-bosqich qoldigʻi): Chizmadon albomi shtampida qoʻllangan meʼyorlar toʻplami qatori */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Chizmadon shtampida meʼyorlar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile|fonts\.g))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('#chOpen'); await page.click('#chStGo');
  // albom shtamp matni (sukut — loyiha maʼlumotidan): meʼyorlar toʻplami qatori bilan
  // albom shtamp matni (sukut — loyiha maʼlumotidan) meʼyorlar toʻplami qatori bilan; 1024 da oʻng panel yigʻilgan — faqat skrinshot
  if (w > 1200) await expect(page.getByPlaceholder(/Meʼyorlar: Oʻzbekiston · ShNQ/).first()).toBeAttached({ timeout: 20_000 }); else await page.waitForTimeout(1500);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/chz_normalar_${w}${dark ? 'd' : 'l'}.png` }); }
  expect(errs).toEqual([]);
});

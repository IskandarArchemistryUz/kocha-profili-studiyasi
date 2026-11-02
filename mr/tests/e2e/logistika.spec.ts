import { test, expect } from './fx';

/** 02.11 (egasi: «logistika markazi hududi yoʻqku»): ishlab chiqarish funksiyalari, logistika turlari, ombor bloki, ShNQ 146/147/174 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`logistika zonasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '400'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click();
  // funksiyalar katalogida yangi guruh
  for (const u of ['logistika', 'sanoat', 'kommunal', 'transport', 'mamuriy']) await expect(page.locator(`[data-use=${u}]`)).toBeVisible();
  await page.click('[data-use=logistika]');
  await expect(page.locator('#logiType [data-logi]')).toHaveCount(7);
  await page.click('[data-logi=yoqilgi]');
  await expect(page.locator('#prodSzz')).toContainText('100');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.zones[0].sub)).toBe('yoqilgi');
  // generator: ombor bloki, 1 qavat
  await page.click('[data-step=hajm]');
  await expect(page.locator('#typoPick summary')).toContainText('Ombor bloki');   // ishlab chiqarish zonasida yagona tipologiya
  await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 10000 }).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.every((b: any) => b.floors === 1 && b.use === 'logistika'))).toBe(true);
  // reyestr: 174 — magistral koʻcha / temir yoʻl yoʻq → koʻrib chiqish
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=logi-174] [data-s=review]').first()).toBeVisible();
  await expect(page.locator('.drawer [data-rule=prod-146]')).toBeVisible();
  await page.waitForTimeout(400);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/logistika_${w}${dark ? 'd' : 'l'}.png` });
});

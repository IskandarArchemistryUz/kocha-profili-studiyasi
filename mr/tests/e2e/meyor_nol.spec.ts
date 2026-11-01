import { test, expect } from './fx';

/** 01.11 (egasi: «meʼyorlarda 0 qiymatlar qizil — xatomi?»): talab bor, loyihada umuman yoʻq — «0 oʻrin · loyihada yoʻq» */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`meʼyor: 0 qiymat izohi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#kMore');
  const row = page.locator('.drawer [data-rule=school]');
  await expect(row.locator('.chip')).toContainText('0 oʻrin');
  await expect(row.locator('[data-nol]')).toHaveText('loyihada yoʻq');
  if (process.env.GX_SHOTS) { await row.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/meyor_nol_${w}${dark ? 'd' : 'l'}.png` }); }
});

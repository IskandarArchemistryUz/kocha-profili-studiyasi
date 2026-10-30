import { test, expect } from './fx';

/** Kvartira ichki rejasi (31.10): albom «Reja» koʻrinishida xonalar (prixojaya, oshxona-mehmonxona, yotoqlar, hoʻl xonalar), ichki devorlar, eshiklar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`albomda kvartira ichki rejasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.click('#planEditBtn');
  const svg = page.locator('#albPlan svg');
  await expect(svg.locator('text', { hasText: 'prixojaya' }).first()).toBeVisible();
  await expect(svg.locator('tspan', { hasText: 'oshxona-mehmonxona' }).first()).toBeAttached();
  expect(await svg.locator('text', { hasText: 'yotoqxona' }).count()).toBeGreaterThan(0);
  // hoʻl xonalar kafel bilan, eski «S» belgisi yoʻq (ichki rejali kvartiralarda)
  expect(await svg.locator('path[fill="url(#tile)"]').count()).toBeGreaterThan(2);
  await page.waitForTimeout(900);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ichki_${w}${dark ? 'd' : 'l'}.png` });
});

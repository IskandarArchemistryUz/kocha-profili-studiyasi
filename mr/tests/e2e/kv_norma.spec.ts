import { test, expect } from './fx';

/** 04.11: kvartira rejasi meʼyor buzilishlari interfeysda — rejada qizil «!», qavat boʻyicha soni, tanlangan kvartirada roʻyxat */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`kvartira meʼyor buzilishlari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
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
  await expect(svg.locator('path[data-apt]').first()).toBeAttached();
  const marks = await svg.locator('[data-norm]').count();
  if (marks) {
    await expect(page.locator('#albNormCnt')).toContainText(String(marks));
    const ai = await svg.locator('[data-norm]').first().getAttribute('data-norm');
    await page.locator(`#albPlan path[data-apt="${ai}"]`).first().click({ force: true });
    await expect(page.locator('#albInNorm')).toBeVisible();
    await expect(page.locator('#albInNorm')).toContainText(/band|ANDOZA/);
  } else await expect(page.locator('#albNormCnt')).toHaveCount(0);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/kvnorma_${w}${dark ? 'd' : 'l'}.png` }); }
});

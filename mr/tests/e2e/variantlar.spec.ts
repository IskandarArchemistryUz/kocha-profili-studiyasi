import { test, expect } from './fx';

/** V3: qavat albomida «Variantlar» — joriy reja + generator variantlari, aralashma slayderlari, qoʻllash → «Reja» (tahrir, Orqaga bilan qaytariladi) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`reja variantlari (V3) · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
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
  await page.click('#albView [data-view=variantlar]');
  await expect(page.locator('#albVars .alb-var[data-var=A]')).toContainText('Joriy');
  const n = await page.locator('#albVars .alb-var').count(); expect(n).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#albVars .alb-var-th svg').first()).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/v3_${w}${dark ? 'd' : 'l'}.png` });
  // aralashmani oʻzgartirish va yangilash
  await page.locator('#albVars .alb-mix input[type=range]').first().evaluate(e => { const i = e as HTMLInputElement; i.value = '60'; i.dispatchEvent(new Event('input')); });
  await page.click('#albVarsGo');
  await expect(page.locator('#albVars .alb-var').first()).toBeVisible();
  // tavsiya — joriy boʻlmagan variantni qoʻllash → reja koʻrinishi, Orqaga faol
  const apply = page.locator('#albVars [data-var-apply]:not([disabled])').first();
  await apply.click();
  await expect(page.locator('#albView [data-view=reja]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#albUndo')).toBeEnabled();
  await expect(page.locator('#albSave')).toBeEnabled();
  await page.click('#albUndo');
  await page.click('#albView [data-view=variantlar]');
  await expect(page.locator('#albVars .alb-var[data-var=A]')).toBeVisible();
});

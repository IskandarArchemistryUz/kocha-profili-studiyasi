import { test, expect } from './fx';

/**
 * 12.11 (eski navbat, 1-band: «P/C torets 12–13 m va 18 m+ qanotlar uchun»): 12 m chuqurlikdagi perimetr seksiyasida ham (18 m — unit)
 * qanot uchida P/C kvartira — koridor seksiya uchigacha bormaydi (tekshiruv — unit `koridor_torets`; bu yerda reja chiziladi, skrinshot).
 */
for (const [w, dark, depth] of [[1440, false, 12], [1024, true, 12]] as const) test(`P/C torets ${depth} m qanotda · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  await page.fill('#gDepth', String(depth)); await page.locator('#gDepth').dispatchEvent('change');
  await expect(page.locator('#gDepth')).toHaveValue(String(depth));
  await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon', { timeout: 60_000 });
  await page.locator('#planGp path[data-bld]').nth(Number(process.env.PC_NTH ?? 1)).dispatchEvent('click');
  await page.click('#planEditBtn');
  await expect(page.locator('#albPlan svg path[data-apt]').first()).toBeAttached();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/pc_torets_${depth}_${w}${dark ? 'd' : 'l'}.png` }); }
});

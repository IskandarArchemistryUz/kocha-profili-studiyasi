import { test, expect } from './fx';

/** 31.10 (egasi): qizil chiziqdan chekinish fasad balandligiga qarab avtomatik (andoza H/W — ShNQ da raqam yoʻq) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`avto chekinish · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('#gSetAuto');
  await expect(page.locator('#gSetAuto')).toBeChecked();
  await expect(page.locator('#gSet')).toHaveCount(0);
  // 12 qavat × 3,3 = 39,6 m, koʻcha nomaʼlum (15 m andoza), H/W ≤ 1 → 12,5 m
  await expect(page.locator('#gSetAutoV')).toContainText('12,5 m');
  await page.fill('#gMax', '6'); await page.press('#gMax', 'Tab');
  // 6 qavat = 19,8 m → (19,8 − 15)/2 = 2,4 < eng kami; 1-qavat noturar (sukut) — 3 m
  await expect(page.locator('#gSetAutoV b')).toHaveText('3 m');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/chekinish_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('Chekinish avto');
});

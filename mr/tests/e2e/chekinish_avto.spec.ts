import { test, expect } from './fx';

/** 01.11 (egasi): chekinish ShNQ 2.07.01-23, 79-band, 2-jadval boʻyicha — koʻcha H × 0,25, qoʻshni H × kʏ / 2 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`avto chekinish · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('#gSetAuto');
  await expect(page.locator('#gSetAuto')).toBeChecked();
  await expect(page.locator('#gSet')).toHaveCount(0);
  // 12 qavat × 3,3 = 39,6 m; uchastka chetlari — koʻcha: H × 0,25 = 9,9 m
  await expect(page.locator('#gSetAutoV b')).toHaveText('9,9 m');
  // qoʻshni hudud: uzun tarz H × kʏ / 2 (toʻgʻri toʻrtburchak — 0°/90°, kʏ 1,2) = 23,8 m
  await page.click('[data-se=qoshni]');
  await expect(page.locator('#gSetAutoV b')).toHaveText('23,8 m');
  await page.click('[data-se=kocha]');
  await page.fill('#gMax', '6'); await page.press('#gMax', 'Tab');
  // 6 qavat = 19,8 m → 19,8 × 0,25 = 4,95 → 4,9 m
  await expect(page.locator('#gSetAutoV b')).toHaveText('4,9 m');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/chekinish_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('79-band');
});

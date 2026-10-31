import { test, expect } from './fx';

/** 31.10 (egasi: «A ni kirit», 2-bosqich): qadam izohi bir qatorda; «Hajmlar» — tipologiya bitta qator, qoʻshimcha sozlamalar yigʻiq */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qadam paneli A · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect(page.locator('#typoPick')).not.toHaveAttribute('open', '');
  await expect(page.locator('#genMore')).not.toHaveAttribute('open', '');
  await expect(page.locator('#genGo')).toBeInViewport();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/panel_a_${w}${dark ? 'd' : 'l'}.png` }); }
  // almashtirish: roʻyxat ochiladi, tanlansa yopiladi
  await page.locator('#typoPick > summary').click();
  await page.locator('[data-typ=qatorlar]').click();
  await expect(page.locator('#typoPick')).not.toHaveAttribute('open', '');
  await expect(page.locator('#typoPick summary')).toContainText('Kenglik qatorlari');
  // qoʻshimcha sozlamalar
  await page.click('#gExact');
  await expect(page.locator('#genMore')).toHaveAttribute('open', '');
  await expect(page.locator('#gExact')).toBeChecked();
  await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
});

import { test, expect } from './fx';

/** 31.10 (egasi: «A ni kirit»): sarlavha — «Taqdimot» menyusi (Grafika, Chizmadon), «Sozlamalar» (til, tema); oʻngda bitta xarita guruhi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qobiq A · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  // sarlavhada alohida Grafika / Chizmadon / til / tema tugmalari yoʻq — menyularda
  await expect(page.locator('.top #chOpen')).toHaveCount(0);
  await expect(page.locator('.top #langSw')).toHaveCount(0);
  await page.locator('#presPop').click();
  await expect(page.locator('.pop #gxOpen')).toBeVisible(); await expect(page.locator('.pop #chOpen')).toBeVisible();
  await page.waitForTimeout(450); if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/qobiq_taqdimot_${w}${dark ? 'd' : 'l'}.png` });
  await page.locator('#prefPop').click();
  await expect(page.locator('.pop #langSw')).toBeVisible(); await expect(page.locator('.pop #themeBtn')).toBeVisible();
  await page.waitForTimeout(450); if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/qobiq_sozlama_${w}${dark ? 'd' : 'l'}.png` });
  // oʻngdagi uch tugma — bitta guruhda
  const n = await page.evaluate(() => document.querySelectorAll('.mapctl.one > *').length);
  expect(n).toBe(3);
  await page.keyboard.press('Escape'); await page.click('#chOpen');   // fx: menyu yopiq boʻlsa avval ochadi
  await expect(page.locator('.gx.ch')).toBeVisible();
});

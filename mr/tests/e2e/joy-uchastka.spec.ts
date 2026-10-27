import { test, expect } from './fx';

/** 1-qadam «Joy va uchastka»: Joy → Chegara → Kirish va yoʻllar (1440 px va 1024 px tungi) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) {
  test(`1-qadam: joy, chegara, kirish va yoʻllar (${w}${dark ? ', tungi' : ''})`, async ({ page }) => {
    test.setTimeout(120_000);
    const shots = process.env.GX_SHOTS;
    await page.setViewportSize({ width: w, height: 860 });
    if (dark) await page.addInitScript(() => { try { localStorage.setItem('mr-theme', 'dark'); } catch { /* */ } });
    await page.goto('./'); await page.click('#newP'); await expect(page).toHaveURL(/#\/p\/p_/);
    if (dark) await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.panel h2')).toHaveText('Joy va uchastka');
    await expect(page.locator('#secJoy')).toBeVisible(); await expect(page.locator('#secSite')).toBeVisible();
    await expect(page.locator('#secAccess')).toHaveCount(0);   // uchastka chizilmaguncha
    await page.fill('#rw', '160'); await page.fill('#rh', '120'); await page.click('#rectSite');
    await expect(page.locator('#secAccess')).toBeVisible();
    // yigʻiq boʻlim qayta chizilganda ham ochiq qoladi
    await page.click('#siteMore > summary');
    await page.fill('#rw', '150'); await page.click('#rectSite');
    await expect(page.locator('#siteMore')).toHaveAttribute('open', '');
    if (shots) await page.screenshot({ path: `${shots}/joy_uchastka_${w}${dark ? '_dark' : ''}.png` });
  });
}

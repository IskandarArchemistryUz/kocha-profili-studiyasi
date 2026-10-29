import { test, expect } from './fx';

/** Rekonstruksiya / renovatsiya rejimi (ShNQ 2.07.01-23, 79-band, 2-jadval, 7-izoh): toretslar orasi jadvaldan kam, yarmidan koʻp — «koʻrib chiqish» */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`rekonstruksiya rejimi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForFunction(() => !!(window as any).__mr?.store?.doc?.origin);
  // ikki 12 qavatli bino toretsi bilan 8 m oraliqda (qoʻlda chizilgan: talab (H1+H2)·0,15 ≈ 12 m)
  await page.evaluate(() => {
    const mr = (window as any).__mr, [lng, lat] = mr.store.doc.origin, kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 111320;
    const R = (x: number) => [[0, 0], [30, 0], [30, 15], [0, 15]].map(([a, b]) => [lng + (a + x) / kx, lat + b / ky]);
    mr.store.dispatch({ type: 'addBuilding', footprint: R(0), floors: 12 });
    mr.store.dispatch({ type: 'addBuilding', footprint: R(38), floors: 12 });
  });
  await page.click('#kMore');
  const rule = page.locator('.drawer [data-rule=spacing-79]');
  await expect(rule.locator('.chip')).toHaveAttribute('data-s', 'fail');
  const on = page.locator('.drawer #reconOn');
  await expect(on).toHaveAttribute('aria-checked', 'false');
  await on.click();
  await expect(rule.locator('.chip')).toHaveAttribute('data-s', 'review');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.recon)).toBe(true);
  await rule.locator('.li').click();
  await expect(rule.locator('.rnote')).toContainText('7-izoh');
  await expect(rule).toContainText('7–8-izohlar');
  if (process.env.SHOT_DIR) {
    await page.screenshot({ path: `${process.env.SHOT_DIR}/recon_${w}${dark ? 'd' : 'l'}.png` });
    await page.locator('.drawer #reconRow').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.env.SHOT_DIR}/recon_sw_${w}${dark ? 'd' : 'l'}.png` });
  }
  // oʻchirilsa — yana buzilish
  await page.locator('.drawer #reconOn').click();
  await expect(rule.locator('.chip')).toHaveAttribute('data-s', 'fail');
});

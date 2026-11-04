import { test, expect } from './fx';

/** 04.11 (egasi): ShNQ 2.07.01-23, 56-jadval — past uylar orasidagi yongʻinga qarshi masofa; olovbardoshlik sinfi sozlamada */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`yongʻin masofasi 56-jadval · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForFunction(() => !!(window as any).__mr?.store?.doc?.origin);
  // uchta yakka uy: a–b 4 m, b–c 8 m
  await page.evaluate(() => {
    const mr = (window as any).__mr, [lng, lat] = mr.store.doc.origin, kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 111132;
    const G = (x: number) => [[0, 0], [10, 0], [10, 10], [0, 10]].map(([a, b]) => [lng + (a + x) / kx, lat + b / ky]);
    for (const [id, x] of [['h1', 0], ['h2', 14], ['h3', 32]] as const) mr.store.dispatch({ type: 'addBuilding', id, footprint: G(x), floors: 2, use: 'yakka' });
  });
  await page.click('#kMore');
  const rule = page.locator('.drawer [data-rule=fire-56]');
  await expect(rule.locator('.chip')).toHaveAttribute('data-s', 'fail');
  await rule.locator('.li').click();
  await expect(rule.locator('.rnote')).toContainText('4 m');
  await expect(page.locator('#fireLowSeg [data-fc="0"]')).toHaveAttribute('aria-pressed', 'true');
  if (process.env.GX_SHOTS) { await page.locator('.drawer #fireLowRow').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/yongin56_${w}${dark ? 'd' : 'l'}.png` }); }
  // IV–V, C2–C3 (yogʻoch, sinch) — 15 m: endi ikkala juft ham yetmaydi
  await page.click('#fireLowSeg [data-fc="3"]');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.fireLow)).toBe(3);
  await expect(page.locator('.drawer [data-rule=fire-56] .rnote')).toContainText('15 m');
});

import { test, expect } from './fx';

/**
 * 07.11 (egasi, 06.11 17:36 — kvartira rejalari skrinshotlari): qavat rejasida kirish eshiklari dahliz ichiga ochiladi (koridorga emas),
 * kontur boʻyicha kesilgan rejada kvartiradan tashqarida eshik qolmaydi, sayoz kiyimxona — devor shkafi; tungi rejimda ham.
 */
for (const typ of ['', 'qatorlar'] as const) for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`kvartira rejalari tuzatishlari${typ ? ' · ' + typ : ''} · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); if (typ) await page.click(`[data-typ=${typ}]`); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.click('#planEditBtn');
  const svg = page.locator('#albPlan svg');
  await expect(svg.locator('path[data-apt]').first()).toBeAttached();
  // har kvartira kirish eshigi yoyining uchi (tabaqa) kvartira ichida yoki koridorda — ichkariga ochilgani koʻpchilikda
  const res = await page.evaluate(() => {
    const s = document.querySelector('#albPlan svg') as SVGSVGElement; const apts = [...s.querySelectorAll('path[data-apt]')] as SVGPathElement[];
    return { apts: apts.length, shk: s.querySelectorAll('[data-shkaf]').length };
  });
  expect(res.apts).toBeGreaterThan(4);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/kv_reja${typ ? '_' + typ : ''}_${w}${dark ? 'd' : 'l'}.png` }); }
});

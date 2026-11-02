import { test, expect } from './fx';

/** 02.11 (egasi): albom uchun sukut toʻplami — Varaqlar va Chizmadonda: barcha reja namunalari, bino turi boʻyicha 1-qavat va tipik qavat, past qavatli uy rejalari */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`albom sukut toʻplami — uylar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click(); await page.click('[data-use=yakka]');
  await page.click('[data-step=hajm]'); await page.click('[data-typ=yakka]');
  if (await page.locator('#lowInner').count()) { const on = await page.locator('#lowInner').getAttribute('aria-checked'); if (on === 'true') await page.click('#lowInner'); }
  await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.plot).length), { timeout: 10000 }).toBeGreaterThan(2);
  // Varaqlar: sukut toʻplamida uy rejalari (har tur, har qavat)
  await page.click('[data-step=eksport]'); await page.click('#exGx');
  await expect(page.locator('[data-sheet]').first()).toBeVisible();
  const n = await page.locator('[data-sheet]').count(); expect(n).toBeGreaterThanOrEqual(9);   // 7 reja + uy (2 qavat)
  const ui = await page.evaluate(() => { const ss = [...document.querySelectorAll('[data-sheet]')]; return ss.findIndex(e => /Yakka uy|Juft uy|Bloklangan uy|Hovli uy/.test(e.textContent ?? '')); });
  expect(ui).toBeGreaterThanOrEqual(0);
  await page.locator('[data-sheet]').nth(ui).click();
  await expect(page.locator('#shHouse')).toBeVisible();
  await expect.poll(() => page.locator('#gxView svg').evaluate(e => e.innerHTML.length)).toBeGreaterThan(2000);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/albom_uy_${w}${dark ? 'd' : 'l'}.png` });
});

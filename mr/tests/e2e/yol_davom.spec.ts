import { test, expect, rectSite } from './fx';

/* 12.11 (egasi): «atrofdagi mavjud yoʻllarni davom ettiradigan funksiya yoʻq — yoʻllar uchastka chegarasida toʻxtab qolgan».
   Koʻchalar qadamida #stubCard: toʻxtagan yoʻllar uchastka ichiga davom ettiriladi (core/roadstubs). */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`mavjud yoʻllarni davom ettirish · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const way = (id: number, hw: string, pts: [number, number][]) => ({ type: 'way', id, tags: { highway: hw }, geometry: pts.map(([x, y]) => ll(x, y)) });
  await context.route(/interpreter/, r => r.fulfill({ json: { elements: [
    way(11, 'residential', [[-215, -420], [-215, 30], [-215, 420]]),     // gʻarbiy chegara koʻchasi
    way(12, 'residential', [[215, -420], [215, 34], [215, 420]]),        // sharqiy chegara koʻchasi
    way(13, 'residential', [[-420, 30], [-215, 30]]),                    // gʻarbdan kelib T da toʻxtagan
    way(14, 'tertiary', [[420, 34], [215, 34]]),                         // sharqdan kelib T da toʻxtagan
    way(15, 'residential', [[60, 420], [60, 212]]),                      // shimoldan berk uch
    way(16, 'footway', [[-420, -100], [-215, -100]]),                    // piyoda — taklif yoʻq
  ] } }));
  await context.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText(/yoʻl|bino|Tayyor/, { timeout: 15000 });
  await rectSite(page, 400, 400);
  await page.click('[data-step=kocha]');
  const card = page.locator('#stubCard');
  await expect(card).toBeVisible({ timeout: 15000 });
  await expect(card).toContainText('2');
  await page.click('#stubShow');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/yol_davom_${w}${dark ? 'd' : 'l'}.png` }); }
  const n0 = await page.evaluate(() => (window as any).__mr.store.doc.streets.length);
  await page.click('#stubGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.streets.length)).toBe(n0 + 2);
  await expect(page.locator('#stubCard')).toHaveCount(0);
  const profs = await page.evaluate(() => (window as any).__mr.store.doc.streets.map((s: { profile: string }) => s.profile));
  expect(profs).toContain('tuman-40');                                   // tertiary → tuman koʻchasi
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/yol_davom_tayyor_${w}${dark ? 'd' : 'l'}.png` }); }
});

import { test, expect, type Page } from './fx';

/** 31.10 (egasi): «Tuzat» boshqa meʼyorlarda ham — zichlik (qavatlar), hovlilar, koʻcha koridori, berk koʻcha oxiri */
const fixRule = async (page: Page, id: string) => {
  const r = page.locator(`.drawer [data-rule=${id}]`);
  await r.locator('button.li').click();
  await expect(page.locator(`#fix-${id}`)).toBeVisible();
  await page.click(`#fix-${id}`);
};
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`meʼyorlarni tuzatish (2) · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  // koʻcha (y = 0) va berk koʻcha (x = 0, y 0 → 50); qoʻlda bino koridorda
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132];
    ed.store.dispatch({ type: 'addStreet', axis: [g(-110, 0), g(110, 0)], profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addStreet', axis: [g(0, 0), g(0, 50)], profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addBuilding', id: 'qolda', footprint: [g(-70, -4), g(-40, -4), g(-40, -16), g(-70, -16)], floors: 16, nonRes: 0, use: 'turar' });
    ed.store.dispatch({ type: 'setSettings', patch: { yards: false } }); });
  await page.click('[data-step=hajm]');
  await page.click('#kMore');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tuzat2_${w}${dark ? 'd' : 'l'}.png` });
  // 1) koʻcha koridori
  await fixRule(page, 'street-overlap');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.last?.d.streetOverlap.length ?? -1), { timeout: 15_000 }).toBe(0);
  // 2) berk koʻcha oxiri — aylana
  await fixRule(page, 'dead-end-57');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.streets[1].ends)).toEqual({ b: 'aylana' });
  // 3) hovlilar
  await fixRule(page, 'play-89');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.yards)).toBe(true);
  // 4) zichlik — turar qavatlar kamayadi
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132];
    ed.store.dispatch({ type: 'addBuilding', id: 'baland', footprint: [g(20, 20), g(90, 20), g(90, 40), g(20, 40)], floors: 40, nonRes: 1, use: 'turar' }); });
  await expect.poll(() => page.evaluate(() => (window as any).__mr.last?.d.density), { timeout: 15_000 }).toBeGreaterThan(400);
  await fixRule(page, 'density-84');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.last?.d.density), { timeout: 15_000 }).toBeLessThanOrEqual(400);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.find((b: any) => b.id === 'baland').nonRes)).toBe(1);
});

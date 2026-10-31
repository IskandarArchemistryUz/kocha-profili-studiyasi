import { test, expect } from './fx';

/** 22:49, 10-band (egasi): avtomatik tuzatilmaydigan meʼyorlarda sahnada kerakli masofa va mos uchastka maydoni (yashil) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`meʼyor: kerakli masofa va maydon sahnada · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  await page.evaluate(() => {
    const mr = (window as any).__mr, [lng, lat] = mr.store.doc.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180), g = (x: number, y: number) => [lng + x * kx, lat + y * k];
    mr.store.dispatch({ type: 'addBuilding', footprint: [g(-30, 0), g(30, 0), g(30, 15), g(-30, 15)], floors: 9, nonRes: 0 });
    mr.store.dispatch({ type: 'addBuilding', footprint: [g(-30, 23), g(30, 23), g(30, 38), g(-30, 38)], floors: 9, nonRes: 0 });
  });
  await page.waitForTimeout(800);
  const labels = () => page.evaluate(() => (window as any).__mr.scene.issueG.children.filter((o: any) => o.userData.needLbl).map((o: any) => o.userData.needLbl as string));
  // 79-band: uzun tomonlar orasi 8 m, talab 2·Hmax = 2 × 29,7 = 59,4 m
  await page.click('#kMore');
  await page.locator('.drawer [data-rule=spacing-79] [data-where]').click();
  await expect.poll(labels).toContain('8 → 59,4 m');
  expect(await page.evaluate(() => (window as any).__mr.scene.issueG.children.some((o: any) => o.userData.need === 'seg'))).toBe(true);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/meyor_kerak_${w}${dark ? 'd' : 'l'}.png` }); }
  // maktab: parsel yoʻq — uchastka markazida kerakli maydon kvadrati
  await page.click('#issueList');
  const sch = page.locator('.drawer [data-rule=school] [data-where]');
  await expect(sch).toBeVisible(); await sch.click();
  await expect.poll(async () => (await labels()).some(t => /^≥ [\d ]+ m²$/.test(t))).toBe(true);
  expect(await page.evaluate(() => (window as any).__mr.scene.issueG.children.some((o: any) => o.userData.need === 'ring'))).toBe(true);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/meyor_kerak_maktab_${w}${dark ? 'd' : 'l'}.png` }); }
});

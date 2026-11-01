import { test, expect } from './fx';

/** 01.11: ShNQ 2.07.01-23, 79-band, 2-jadval, 3-izoh — yopiq ichki hovli, ichki fasadlar orasi Hmax × 2,3 (meʼyorlar roʻyxatida, sahnada kerakli masofa) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`meʼyor: yopiq hovli Hmax × 2,3 · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  await page.evaluate(() => {
    const mr = (window as any).__mr, [lng, lat] = mr.store.doc.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180), g = (x: number, y: number) => [lng + x * kx, lat + y * k];
    const R = (x0: number, y0: number, x1: number, y1: number) => [g(x0, y0), g(x1, y0), g(x1, y1), g(x0, y1)];
    // 100 × 80 m yopiq perimetr, 12 qavat: hovli 76 × 56 m, talab ≈ 91 m
    for (const f of [R(-50, -40, 50, -28), R(-50, 28.2, 50, 40), R(-50, -27.8, -38, 28), R(38, -27.8, 50, 28)]) mr.store.dispatch({ type: 'addBuilding', footprint: f, floors: 12, nonRes: 0 });
  });
  await page.waitForTimeout(800);
  await page.click('#kMore');
  const row = page.locator('.drawer [data-rule=hovli-79-3]');
  await expect(row).toContainText('Hmax');
  await row.locator('[data-where]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__mr.scene.issueG.children.filter((o: any) => o.userData.needLbl).map((o: any) => o.userData.needLbl as string))).toContainEqual(expect.stringMatching(/^5[56](,\d)? → 9\d(,\d)? m$/));
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/hovli_79_3_${w}${dark ? 'd' : 'l'}.png` }); }
});

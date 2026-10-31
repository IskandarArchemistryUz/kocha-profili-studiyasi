import { test, expect } from './fx';

/** Meʼyorga tushmagan bandni bosganda sahnada koʻrsatish (31.10) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`meʼyor bandi sahnada · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  // ikki bino juda yaqin (uzun tomonlar orasi 8 m, 9 qavat) — 79-band buziladi
  await page.evaluate(() => {
    const mr = (window as any).__mr, [lng, lat] = mr.store.doc.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180), g = (x: number, y: number) => [lng + x * kx, lat + y * k];
    mr.store.dispatch({ type: 'addBuilding', footprint: [g(-30, 0), g(30, 0), g(30, 15), g(-30, 15)], floors: 9, nonRes: 0 });
    mr.store.dispatch({ type: 'addBuilding', footprint: [g(-30, 23), g(30, 23), g(30, 38), g(-30, 38)], floors: 9, nonRes: 0 });
  });
  await page.waitForTimeout(800);
  await page.click('#kMore');
  const row = page.locator('.drawer [data-rule=spacing-79]');
  await expect(row.locator('[data-where]')).toBeVisible();
  await row.locator('[data-where]').click();
  const n = await page.evaluate(() => (window as any).__mr.scene.issueG.children.length);
  expect(n).toBeGreaterThan(2);   // ikki bino + masofa kesmasi
  // roʻyxat yopiladi, sahnada kartochka; «Roʻyxat» — qaytish, × — tozalash
  await expect(page.locator('.drawer')).toBeHidden(); await expect(page.locator('#issueCard')).toContainText('masofa');
  await page.waitForTimeout(500);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/meyor_sahna_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#issueList'); await expect(page.locator('#issueClear')).toBeVisible();
  await page.click('#issueClear'); await expect(page.locator('#issueCard')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__mr.scene.issueG.children.length)).toBe(0);
});

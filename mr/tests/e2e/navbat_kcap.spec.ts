import { test, expect } from './fx';

/** 12.11 (eski navbat, 6-band 2-qismi): KCAP uslubidagi «Qurilish navbatlari ketma-ketligi» varagʻi — har navbat alohida katakda */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`navbatlar ketma-ketligi varagʻi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 60_000 }).toBeGreaterThan(8);
  // binolarni gʻarbdan sharqqa uch navbatga boʻlish
  await page.evaluate(() => {
    const ed = (window as any).__mr, bs = ed.store.doc.buildings, xs = bs.map((b: any) => b.footprint.reduce((t: number, p: number[]) => t + p[0], 0) / b.footprint.length);
    const lo = Math.min(...xs), hi = Math.max(...xs);
    bs.forEach((b: any, i: number) => ed.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { stage: 1 + Math.min(2, Math.floor((xs[i] - lo) / (hi - lo + 1e-9) * 3)) } }));
  });
  await page.click('#gxOpen'); await page.click('#frOpen');
  await expect(page.locator('.sh-list')).toContainText('Qurilish navbatlari ketma-ketligi');
  await page.click('[data-mode=fazalar]');
  const v = page.locator('#gxView');
  await expect(v.locator('[data-stage-panel]')).toHaveCount(3, { timeout: 20_000 });
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/navbat_kcap_${w}${dark ? 'd' : 'l'}.png` }); if (!dark) await v.locator('svg').first().screenshot({ path: `${process.env.GX_SHOTS}/navbat_kcap_svg.png` }); }
  expect(errs).toEqual([]);
});

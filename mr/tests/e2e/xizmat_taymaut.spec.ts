import { test, expect } from './fx';

/** 04.11 (Murad Buildings sinovi, 5-band): Overpass javob bermasa 9-qadam qotib qolmaydi — loyiha obyektlari boʻyicha radiuslar
 *  darhol chiqadi; taymautdan keyin aniq xabar va «Qayta urinish» */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Xizmatlar — OSM javob bermasa · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  // Overpass — hech qachon javob bermaydi (qotish); boshqa tashqi manbalar — 404
  await page.route(/overpass|interpreter|\/data\/overpass/, () => { /* javobsiz */ });
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.evaluate(() => { (window as any).__mr.constructor.POI_WAIT = 3000; });
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '420'); await page.fill('#rh', '330'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=portlend]'); await page.click('#gridApply');
  await page.evaluate(() => { const m = (window as any).__mr, plan = m.plan(), o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    m.store.dispatch({ type: 'setZones', zones: [...m.store.doc.zones, { id: 'zm', at: g(plan.blocks[0].centroid), use: 'maktab' }] }); });
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 60000 }).toBeGreaterThan(5);
  const t0 = Date.now();
  await page.click('[data-step=xizmat]');
  // natija OSM ni kutmasdan — loyihaning oʻz maktabi boʻyicha
  await expect(page.locator('#svcTab')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#svcTab [data-svc=maktab]')).toBeVisible();
  // 3 s dan keyin aniq xabar va «Qayta urinish»
  await expect(page.locator('#svcErr')).toContainText('javob bermadi', { timeout: 8000 });
  expect(Date.now() - t0).toBeLessThan(15000);
  await expect(page.locator('#svcRetry')).toBeVisible();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/xizmat_taymaut_${w}${dark ? 'd' : 'l'}.png` }); }
});

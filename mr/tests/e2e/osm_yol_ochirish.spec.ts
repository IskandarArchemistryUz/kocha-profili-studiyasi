import { test, expect } from './fx';

/** 04.11 (Murad Buildings sinovi, 7-band): uchastka ichidagi mavjud (OSM) yoʻllarni bir tugma bilan olib tashlash */
function fixture(): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = []; let id = 1;
  const g = (x: number, y: number) => ({ lon: c[0] + x * mx, lat: c[1] + y * my });
  for (const k of [-200, 200]) { el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [g(k, -300), g(k, 300)] }); el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [g(-300, k), g(300, k)] }); }
  el.push({ type: 'way', id: 801, tags: { highway: 'service' }, geometry: [g(-60, 0), g(60, 10)] });   // zavod ichki yoʻli
  el.push({ type: 'way', id: 802, tags: { highway: 'footway' }, geometry: [g(0, -50), g(5, 50)] });
  return { elements: el };
}
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`uchastka ichidagi OSM yoʻllari — bir tugma · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|interpreter/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture()) }));
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:arcgisonline|terrain|amazonaws|elevation|openfreemap|tile))/, r => r.abort());
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad'); await page.waitForSelector('#ctxSt', { timeout: 60000 });
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); if (await page.locator('[data-ktab=tor]').count()) await page.click('[data-ktab=tor]');
  const btn = page.locator('#siteRoadsDel');
  await expect(btn).toContainText('(2)');
  if (process.env.GX_SHOTS) { await btn.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/osm_yol_${w}${dark ? 'd' : 'l'}.png` }); }
  await btn.click();
  await expect.poll(() => page.evaluate(() => ((window as any).__mr.store.doc.removedRoads ?? []).slice().sort())).toEqual([801, 802]);
  await expect(btn).toHaveCount(0);
});

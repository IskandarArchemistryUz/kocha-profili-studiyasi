import { test, expect } from './fx';

/** 05.11 (egasi skrinshoti): bulvar burilish nuqtasiga boshqa koʻchalar ulangan — ajratuvchi tugungacha borardi, tashqi burchakda
 *  trotuar «choʻqqisi» chiqardi. Endi chorraha boʻgʻinida koʻcha boʻlinadi: markaz asfalt, ajratuvchi va trotuar chorraha chetida tugaydi. */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`burilish boʻgʻinidagi chorraha · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '320'); await page.fill('#rh', '320'); await page.click('#rectSite');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    ed.store.dispatch({ type: 'addStreet', axis: [[-150, 0], [0, 0], [0, 150]].map(G), profile: 'tuman-40' });
    ed.store.dispatch({ type: 'addStreet', axis: [[4, -4], [4, -150]].map(G), profile: 'turar-20' });
    ed.store.dispatch({ type: 'addStreet', axis: [[4, -4], [150, -4]].map(G), profile: 'turar-20' }); });
  await page.click('[data-step=kocha]');
  await expect(page.locator('#connEnds')).toBeVisible();
  // sahnada koʻcha qatlamlari chizildi (asfalt mavjud)
  await expect.poll(() => page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.isMesh && o.geometry?.attributes?.position?.count > 0) n++; }); return n; })).toBeGreaterThan(5);
  const sh = process.env.GX_SHOTS, tag = `${w}${dark ? 'd' : 'l'}`;
  if (sh) {
    await page.evaluate(() => (window as any).__mr.scene.frameView(-12, 0, 55)); await page.waitForTimeout(700);
    await page.screenshot({ path: `${sh}/chorraha_reja_${tag}.png` });
    await page.evaluate(() => { const s = (window as any).__mr.scene; s.setView('axo'); s.frameView(-12, 0, 55); }); await page.waitForTimeout(1000);
    await page.screenshot({ path: `${sh}/chorraha_akso_${tag}.png` });
  }
});

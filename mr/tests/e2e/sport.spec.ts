import { test, expect } from './fx';

/** Sport hududi (31.10): stadion, basseyn, yopiq majmua, kortlar — parkdan farqli */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`sport hududi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '270'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setZones', zones: [{ id: 'z0', at: ed.store.doc.origin, use: 'sport' }] }); });
  await page.click('[data-view=axo]');
  // yopiq sport majmuasi sahnada (CI da sahna kechroq quriladi — kutib tekshiriladi)
  await expect.poll(() => page.evaluate(() => { let c = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.sport) c++; }); return c; }), { timeout: 15_000 }).toBeGreaterThan(0);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/sport_${w}${dark ? 'd' : 'l'}.png` });
});

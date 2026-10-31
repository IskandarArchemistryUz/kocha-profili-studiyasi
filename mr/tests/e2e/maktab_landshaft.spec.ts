import { test, expect } from './fx';

/** 31.10 (egasi: «maktab va MTM hududlari landshafti»): uchastka zonalari — sport, oʻquv-tajriba bogʻi, maydonchalar */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`maktab uchastkasi landshafti · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '180'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setZones', zones: [{ id: 'z0', at: ed.store.doc.origin, use: 'maktab' }] }); });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 15_000 }).toBeGreaterThan(0);
  await page.click('[data-view=axo]');
  await expect.poll(() => page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.playKit === 'ekin') n++; }); return n; }), { timeout: 15_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/maktab_${w}${dark ? 'd' : 'l'}.png` });
});

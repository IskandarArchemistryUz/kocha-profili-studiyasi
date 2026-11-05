import { test, expect } from './fx';

/** 05.11 (egasi): «Avtoturargoh» parseli — koʻp qavatli: pandus, yoʻlaklar, joylar; sigʻim va 413/30-jadval qoidalari */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`koʻp qavatli avtoturargoh · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '80'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setZones', zones: [{ id: 'z0', at: ed.store.doc.origin, use: 'avtoturargoh' }] }); });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect(page.locator('#mlType')).toBeVisible();
  await expect(page.locator('#mlOpen')).toContainText('joy');
  await page.click('#mlType [data-ptype=kop]');
  await page.click('#mlFloors [data-pfl="4"]');
  await expect(page.locator('#mlFloors [data-pfl="4"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#genGo');
  await expect(page.locator('#mlCap')).toContainText('joy');
  const g = await page.evaluate(() => { const d = (window as any).__mr.store.doc; const x = d.garages.find((q: any) => q.kind === 'kop_qavatli'); return x ? { lv: x.levels, sp: x.spaces, pf: x.perFloor, r: x.ramps?.length } : null; });
  expect(g).not.toBeNull(); expect(g!.lv).toBe(4); expect(g!.r).toBe(2);
  expect(g!.sp).toBe(g!.pf.reduce((a: number, b: number) => a + b, 0));
  await expect(page.locator('#mlCap')).toContainText(String(g!.sp));
  await expect(page.locator('#ml413')).toContainText('m²');
  const ids = await page.evaluate(() => { const m = (window as any).__mr; return m.last?.results?.filter((r: any) => r.id?.startsWith('park-')).map((r: any) => `${r.id}:${r.status}`) ?? null; });
  if (ids) expect(ids.join()).toContain('park-413');
  await page.click('[data-view=axo]');
  await expect.poll(() => page.evaluate(() => { let c = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.garage) c++; }); return c; }), { timeout: 15_000 }).toBeGreaterThan(1);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/mlpark_${w}${dark ? 'd' : 'l'}.png` }); }
});

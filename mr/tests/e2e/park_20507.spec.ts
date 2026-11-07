import { test, expect } from './fx';

/** 07.11 (c73): SHNQ 2.05.07-24 — joy 5,5 × 2,5 m (1-ilova, 4-izoh), rampalar (37, 41-bandlar), balandlik (29), EV (171¹, 180), nogironlar (255) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`SHNQ 2.05.07-24 avtoturargoh · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '80'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setZones', zones: [{ id: 'z0', at: ed.store.doc.origin, use: 'avtoturargoh' }] }); });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect(page.locator('#mlType')).toBeVisible();
  await page.click('#mlType [data-ptype=kop]');
  await page.click('#mlFloors [data-pfl="4"]');
  await page.click('#genGo');
  await expect(page.locator('#mlCap')).toContainText('joy');
  await page.click('[data-view=axo]');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/p24_ml_${w}${dark ? 'd' : 'l'}.png` }); }
  const g = await page.evaluate(() => { const d = (window as any).__mr.store.doc; const x = d.garages.find((q: any) => q.kind === 'kop_qavatli'); return x ? { sp: x.spaces, st: x.stalls?.[0] } : null; });
  expect(g).not.toBeNull();
  // joy oʻlchami: 5,5 × 2,5 m
  const dims = await page.evaluate((r: any) => { const fr = (window as any).__mr.frame?.toLocal ?? null; return r?.length ?? 0; }, g!.st);
  expect(dims).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => ((window as any).__mr.last?.results ?? []).find((r: any) => r.id === 'park-20507')?.status ?? 'yoq'), { timeout: 15_000 }).not.toBe('yoq');
  const note = await page.evaluate(() => ((window as any).__mr.last?.results ?? []).find((r: any) => r.id === 'park-20507')?.note ?? '');
  expect(note).toContain('5,5');
  expect(note).toContain('37');
  if (process.env.GX_SHOTS) {
    await page.click('#kStat').catch(() => {});
    await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/p24_meyor_${w}${dark ? 'd' : 'l'}.png` });
  }
});

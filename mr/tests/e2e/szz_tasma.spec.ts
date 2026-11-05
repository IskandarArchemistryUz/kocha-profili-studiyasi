import { test, expect } from './fx';

/** 06.11 — SanPiN RUz № 0350-17, 2.19: turar joy tomonida daraxt-buta tasmasi ≥ 50 m (zona ≤ 100 m — ≥ 20 m); «Tuzat» — himoya parseli */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`SMZ daraxt-buta tasmasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '300'); await page.click('#rectSite');
  // qabriston uchastkaning gʻarbiy chetida (IV sinf, SMZ 100 m → tasma ≥ 20 m), qolgan uchastka — turar joy
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), r = ed.store.doc.site.rings[0];
    const xs = r.map((p: number[]) => p[0]), ys = r.map((p: number[]) => p[1]), x0 = Math.min(...xs), cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const g = (a: number, b: number) => [x0 + a / mx, cy + b / 111132];
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'q1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [[g(-50, -20), g(-10, -20), g(-10, 20), g(-50, 20)]] } }); });
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click();
  await page.click('[data-use=turar]');
  await page.click('#kMore');
  const row = page.locator('.drawer [data-rule=szz-belt]');
  await expect(row.locator('[data-s=fail]').first()).toBeVisible();
  await row.locator('button.li').click();
  await expect(page.locator('#fix-szz-belt')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/szz_tasma_oldin_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#fix-szz-belt');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.plan().blocks.some((b: any) => b.use === 'himoya')), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => { const r = (window as any).__mr.allRules?.() ?? []; return r.find((x: any) => x.id === 'szz-belt')?.status; }), { timeout: 10_000 }).toBe('pass');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/szz_tasma_keyin_${w}${dark ? 'd' : 'l'}.png` }); }
});

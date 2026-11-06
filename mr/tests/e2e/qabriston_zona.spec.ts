import { test, expect } from './fx';

/**
 * 06.11 (c65, egasi): VM 101-son qarori, 1-ilova, 50-band — qabriston SMZ i (qishloq: 50 m) va alohida talab
 * «turar joy, jamoat binolari va dam olish zonalari devoridan qabristongacha ≥ 100 m»: 50–100 m oraligʻida turar joy — mos emas,
 * avtoturargoh — mumkin. Sahnada 100 m halqa — binafsha uzuq chiziq; meʼyorlar roʻyxatida ikki qator.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qabriston SMZ 50 m va 100 m halqa · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '240'); await page.click('#rectSite');
  await page.evaluate(() => {
    const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180);
    const r = m.store.doc.site.rings[0], cx = r.reduce((t: number, p: number[]) => t + p[0], 0) / r.length, cy = r.reduce((t: number, p: number[]) => t + p[1], 0) / r.length;
    const G = (x: number, y: number) => [cx + x / mx, cy + y / 111132];
    const sq = (x0: number, y0: number, x1: number, y1: number) => [G(x0, y0), G(x1, y0), G(x1, y1), G(x0, y1)];
    // qishloq qabristoni uchastka gʻarbiy chetida (x −150…−110): SMZ 50 m, 100 m halqa alohida
    m.store.dispatch({ type: 'addLimit', limit: { id: 'qab', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', sub: { open: true, rural: true }, rings: [sq(-150, -40, -110, 40)] } });
    m.store.dispatch({ type: 'addBuilding', footprint: sq(-40, -15, -20, 15), floors: 9, nonRes: 0, use: 'turar' });            // 70–90 m — mos emas
    m.store.dispatch({ type: 'addBuilding', footprint: sq(-40, 50, -20, 80), floors: 2, nonRes: 0, use: 'avtoturargoh' });     // mumkin
    m.store.dispatch({ type: 'addBuilding', footprint: sq(60, -15, 90, 15), floors: 9, nonRes: 0, use: 'turar' });             // 170 m dan — mumkin
    m.pickLimit('qab'); m.renderPanel();
  });
  await expect(page.locator('[data-lim=qab] .v')).toContainText('50 m');
  await expect(page.locator('[data-qabnote]')).toContainText('100 m');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/qab_zona_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=qab-100]')).toContainText('VM 101');
  await expect(page.locator('.drawer [data-rule=qab-100] [data-s=fail]').first()).toBeVisible();
  await expect(page.locator('.drawer [data-rule=qab-szz]')).toBeVisible();
  await expect(page.locator('.drawer [data-rule=qab-szz] [data-s=fail]')).toHaveCount(0);
  const n = await page.evaluate(() => { const m = (window as any).__mr; return m.store.doc.buildings.length; });
  expect(n).toBe(3);
  if (process.env.GX_SHOTS) { await page.locator('.drawer [data-rule=qab-100]').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/qab_meyor_${w}${dark ? 'd' : 'l'}.png` }); }
});

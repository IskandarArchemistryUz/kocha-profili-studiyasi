import { test, expect, rectSite } from './fx';

/* 13.11 (egasi, «Ikkinchisi»): koʻcha toʻri mavjud yoʻllar davomiga moslashadi — toʻr chiziqlari chegarada toʻxtagan yoʻllar ustidan oʻtadi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`toʻr mavjud yoʻllar davomiga moslashadi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  const way = (id: number, hw: string, pts: [number, number][]) => ({ type: 'way', id, tags: { highway: hw }, geometry: pts.map(([x, y]) => ll(x, y)) });
  await context.route(/interpreter/, r => r.fulfill({ json: { elements: [
    way(11, 'residential', [[-215, -420], [-215, 47], [-215, 420]]),
    way(12, 'residential', [[215, -420], [215, 47], [215, 420]]),
    way(13, 'residential', [[-420, 47], [-215, 47]]),                    // gʻarbdan — T da toʻxtagan, y = 47
    way(14, 'tertiary', [[420, 47], [215, 47]]),                         // sharqdan — xuddi shu chiziqda
    way(15, 'residential', [[-31, 420], [-31, 212]]),                    // shimoldan berk uch, x = −31
  ] } }));
  await context.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText(/yoʻl|bino|Tayyor/, { timeout: 15000 });
  await rectSite(page, 400, 400);
  await page.click('[data-step=kocha]');
  await page.click('[data-ktab=tor]');
  await expect(page.locator('#gridFitBox')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#gridFitBox')).toContainText('2');
  await page.click('#gridApply');
  // toʻr koʻchalari langar chiziqlari ustidan oʻtadi: gorizontal y ≈ 47, vertikal x ≈ −31 (mahalliy metr)
  const ok = async () => page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), my = 111132;
    const L = (ed.store.doc.streets as { axis: number[][] }[]).map(s => s.axis.map(p => [(p[0] - o[0]) * mx, (p[1] - o[1]) * my]));
    const hz = L.some(a => Math.abs(a[0][1] - 47) < 2 && Math.abs(a[a.length - 1][1] - 47) < 2 && Math.abs(a[0][0] - a[a.length - 1][0]) > 300);
    const vt = L.some(a => Math.abs(a[0][0] + 31) < 2 && Math.abs(a[a.length - 1][0] + 31) < 2 && Math.abs(a[0][1] - a[a.length - 1][1]) > 300);
    return hz && vt; });
  await expect.poll(ok).toBe(true);
  await expect(page.locator('#stubCard')).toHaveCount(0);                   // davomlar qoplangan — qayta taklif yoʻq
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/tor_davom_${w}${dark ? 'd' : 'l'}.png` }); }
});

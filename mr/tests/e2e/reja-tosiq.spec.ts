import { test, expect } from './fx';

// Saqlanadigan mavjud bino — generatsiya toʻsigʻi: ustiga qurilmaydi, ≥ 6 m oraliq
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`generatsiya saqlangan binoni chetlab oʻtadi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  // uchastka 160×120 m markazda; mavjud bino — janubiy chekka yonida (perimetr seksiyalari tushadigan joyda)
  const el = [{ type: 'way', id: 77, tags: { building: 'yes', 'building:levels': '5' }, geometry: [ll(-20, -52), ll(20, -52), ll(20, -38), ll(-20, -38), ll(-20, -52)] }];
  await context.route(/interpreter/, r => r.fulfill({ json: { elements: el } }));
  await context.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('1 bino', { timeout: 15000 });
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '120'); await page.click('#rectSite');
  await page.click('[data-step=parsel]');
  await page.click('#keepAll');
  await expect(page.locator('#demo')).toContainText('buziladi 0');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(0);
  // har bir yangi seksiya saqlangan binodan ≥ 5,5 m uzoqda (vertex–qirra masofasi, mahalliy metr)
  const minD = await page.evaluate(() => {
    const m = (window as any).__mr, d = m.store.doc, k = d.origin[1] * Math.PI / 180, mx = 111412.84 * Math.cos(k), my = 111132.92;
    const loc = (p: number[]) => [(p[0] - d.origin[0]) * mx, (p[1] - d.origin[1]) * my];
    const kept = m.scene.inSite.find((x: any) => x.id === 77).rings[0];
    const pd = (p: number[], a: number[], b: number[]) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
    const pin = (p: number[], r: number[][]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
    let best = Infinity;
    for (const b of d.buildings) { const r = b.footprint.map(loc);
      for (const p of r) { if (pin(p, kept)) return -1; for (let i = 0; i < kept.length; i++) best = Math.min(best, pd(p, kept[i], kept[(i + 1) % kept.length])); }
      for (const p of kept) { if (pin(p, r)) return -1; for (let i = 0; i < r.length; i++) best = Math.min(best, pd(p, r[i], r[(i + 1) % r.length])); } }
    return best;
  });
  expect(minD).toBeGreaterThanOrEqual(5.5);
  await expect(page.locator('#genNotes')).toContainText('mavjud');
  if (process.env.SHOT_DIR) { await page.click('[data-view=axo]').catch(() => {}); await page.waitForTimeout(1200); await page.screenshot({ path: `${process.env.SHOT_DIR}/tosiq_${w}${dark ? 'd' : 'l'}.png` }); }
});

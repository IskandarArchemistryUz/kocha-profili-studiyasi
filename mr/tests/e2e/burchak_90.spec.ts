import { test, expect } from './fx';

/**
 * 07.11 (egasi: «toʻgʻri kvadrat parseldayam burchak seksiyalari qiyshiq — nega 90° boʻlolmaydi?»; «koridorga tabiiy yorugʻlik»):
 * kvartal burchaklari 90° dan ≤ 4° farq qilsa burchak seksiyalari toʻgʻri burchakli; meʼyorlar roʻyxatida zina katagi va
 * umumiy yoʻlak tabiiy yoritilishi (ShNQ 2.08.01-24, 325, 168, 328-bandlar) qatorlari bor.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`burchak seksiyalari 90° va tabiiy yorugʻlik · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(240_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)/, r => r.abort());
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  // 150 × 130 m kvartal, bir burchagi 6 m siljigan (≈ 2,6°) — koʻzga toʻgʻri toʻrtburchak
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    ed.store.dispatch({ type: 'setSite', rings: [[[-75, -65], [75, -65], [81, 65], [-75, 65]].map(G)] }); });
  await page.click('[data-step=hajm]');
  await page.evaluate(() => { const m = (window as any).__mr; Object.assign(m.gen, { typology: 'perimetr', minF: 5, maxF: 9 }); m.renderPanel(); });
  await page.click('#genAll');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 4, null, { timeout: 90000 });
  const angs = await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180);
    const L = (p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132];
    return ed.store.doc.buildings.filter((b: any) => b.gen?.kind === 'burchak').map((b: any) => { const r = b.footprint.map(L); return r.map((p: number[], i: number) => { const a = r[(i + r.length - 1) % r.length], c = r[(i + 1) % r.length], u = [a[0] - p[0], a[1] - p[1]], v = [c[0] - p[0], c[1] - p[1]]; return Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(u[0], u[1]) / Math.hypot(v[0], v[1])) * 180 / Math.PI; }); }); });
  expect(angs.length).toBeGreaterThan(0);
  for (const r of angs) for (const a of r) expect(Math.abs(a - 90)).toBeLessThan(1);
  const rows = await page.evaluate(() => (window as any).__mr.allRules().filter((r: any) => ['plan-stairlight', 'plan-corrlight'].includes(r.id)).map((r: any) => r.id));
  expect(rows.sort()).toEqual(['plan-corrlight', 'plan-stairlight']);
  const sh = process.env.GX_SHOTS, tag = `${w}${dark ? 'd' : 'l'}`;
  if (sh) {
    for (const [nm, v] of [['reja', 'plan'], ['akso', 'axo']] as const) { await page.evaluate(([v]) => { const s = (window as any).__mr.scene; s.setView(v); s.frameView(0, 0, 110); }, [v]); await page.waitForTimeout(900); await page.screenshot({ path: `${sh}/bur_${nm}_${tag}.png` }); }
  }
  // qavat rejasi: burchak seksiyasi — zina hovli fasadida
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.click('#planEditBtn');
  await expect(page.locator('#albPlan svg path[data-apt]').first()).toBeAttached();
  if (sh) { await page.waitForTimeout(600); await page.screenshot({ path: `${sh}/bur_qavat_${tag}.png` }); }
});

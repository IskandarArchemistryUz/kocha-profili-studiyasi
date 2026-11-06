import { test, expect } from './fx';

/** 06.11 (egasi, 22:40, 23:10): loyiha koʻchasi geometriyasi kesilmaydi (mavjud koʻchagacha ulanadi), faqat grafika — uchastka ichidagi
 *  qismi loyiha uslubida, tashqarisi atrofdagi mavjud koʻchalar uslubida (qizil chiziq va daraxtlarsiz). Mavjud (OSM) koʻchalarda chorraha va burilishlarda 6 m bordyur yoyi (ANDOZA). */
function fixture(grid = 0): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = []; let id = 1;
  const g = (x: number, y: number) => ({ lon: c[0] + x * mx, lat: c[1] + y * my });
  el.push({ type: 'way', id: id++, tags: { highway: 'primary', lanes: '4' }, geometry: [g(-160, -400), g(-160, -150), g(-160, 150), g(-160, 400)] });   // gʻarbda magistral (tugunlar — chorrahalarda)
  el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [g(-400, 150), g(-160, 150), g(160, 150), g(400, 150)] });             // shimolda mahalliy (magistral bilan X)
  el.push({ type: 'way', id: id++, tags: { highway: 'tertiary' }, geometry: [g(-160, -150), g(60, -150), g(160, -60), g(160, 150)] }); // janubda burilishli
  // perf: zich OSM toʻri (FPS oʻlchovi uchun)
  const ks = Array.from({ length: 2 * grid + 2 }, (_, k) => (k - grid) * 70 - 35);   // har kesishmada umumiy tugun (OSM dagidek)
  if (grid > 0) for (let i = -grid; i <= grid; i++) {
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: ks.map(k => g(i * 70 + 35, k)) });
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: ks.map(k => g(k, i * 70 + 35)) });
  }
  return { elements: el };
}
async function setup(page: any, w: number, dark: boolean, grid = 0) {
  await page.route(/overpass|interpreter/, (r: any) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(grid)) }));
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:arcgisonline|terrain|amazonaws|elevation|openfreemap|tile|cartocdn|openstreetmap\.org))/, (r: any) => r.abort());
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad'); await page.waitForSelector('#ctxSt', { timeout: 60000 });
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
}

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`loyiha koʻchasi: ichida loyiha uslubi, tashqarida mavjud koʻcha uslubi; OSM chorrahada 6 m yoy · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await setup(page, w, dark);
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    // 1: magistraldan sharqqa — uchastka ichidan oʻtadi; 2: shimoldagi yoʻldan janubdagi burilishli yoʻlgacha (uchastkadan ikki tomonga chiqadi)
    ed.store.dispatch({ type: 'addStreet', axis: [[-160, 0], [40, 0]].map(G), profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addStreet', axis: [[40, 150], [40, -150]].map(G), profile: 'mahalla-15' }); });
  await page.click('[data-step=kocha]');
  await expect.poll(() => page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.isMesh && o.geometry?.attributes?.position?.count > 0) n++; }); return n; })).toBeGreaterThan(5);
  const sh = process.env.GX_SHOTS, tag = `${w}${dark ? 'd' : 'l'}`;
  if (sh) {
    for (const [nm, v, x, y, r] of [['reja', 'plan', 0, 0, 190], ['akso', 'axo', 0, 0, 190], ['osm_chorraha', 'plan', -160, 150, 30], ['osm_burilish', 'plan', 120, -110, 45]] as const) {
      await page.evaluate(([v, x, y, r]) => { const s = (window as any).__mr.scene; s.setView(v); s.frameView(x, y, r); }, [v, x, y, r]); await page.waitForTimeout(900);
      await page.screenshot({ path: `${sh}/yg_${nm}_${tag}.png` });
    }
    await page.evaluate(() => (window as any).__mr.scene.setView('plan'));
  }
  // loyiha koʻchasi qatlamlari: uchastka niqobi bilan (tashqarisi xira)
  const st = await page.evaluate(() => {
    const s = (window as any).__mr.scene, ed = (window as any).__mr, o = ed.store.doc.origin, f = o[1] * Math.PI / 180,
      my = 111132.92 - 559.82 * Math.cos(2 * f) + 1.175 * Math.cos(4 * f), mx = 111412.84 * Math.cos(f) - 93.5 * Math.cos(3 * f) + 0.118 * Math.cos(5 * f),
      site = ed.store.doc.site.rings.map((r: number[][]) => r.map((p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * my]));
    const inside = (p: number[]) => { let ins = false; for (const r of site) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
    let fade = 0, opaqueBad = 0, red = 0, redOut = 0, trees = 0, treesOut = 0;
    s.world.traverse((o: any) => {
      if (o.userData?.siteOut) { fade++; if (o.material.transparent && !o.userData.corrBase && o.renderOrder > 9) opaqueBad++; }
      if (o.userData?.redLine) { red++; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const q = [p.getX(i), -p.getZ(i)]; if (!inside(q)) { let d = Infinity; for (const r of site) for (let k = 0; k < r.length; k++) { const a = r[k], b = r[(k + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2)); d = Math.min(d, Math.hypot(a[0] + t * dx - q[0], a[1] + t * dy - q[1])); } if (d > 0.5) redOut++; } } }
      if (o.userData?.streetTrees && o.isInstancedMesh) { const m = new (o.matrix.constructor)(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); const e = m.elements; trees++; if (!inside([e[12], -e[14]])) treesOut++; } }
    });
    return { fade, opaqueBad, red, redOut, trees, treesOut };
  });
  expect(st.fade).toBeGreaterThan(3);
  expect(st.opaqueBad).toBe(0);
  expect(st.red).toBeGreaterThan(0);
  expect(st.redOut).toBe(0);
  expect(st.treesOut).toBe(0);
  // varaqlar: ichkarisi loyiha uslubida (#ichki bilan), tashqarisi — mavjud koʻchalar qatlamida (#Atrof_yollar, #tashqari maskasi bilan)
  const nR = await page.evaluate(() => (window as any).__mr.scene.ctx.roads.filter((r: any) => !/^(footway|path|steps|track|bridleway|corridor|cycleway)$/.test(r.cls)).length);
  await page.click('[data-step=eksport]'); await page.click('#exGx');
  await expect(page.locator('[data-sheet]').first()).toBeVisible();
  const view = page.locator('#gxView svg');
  await expect(view.locator('#Qizil_chiziqlar [clip-path="url(#ichki)"]')).toHaveCount(1);
  await expect(view.locator('#Atrof_yollar[mask="url(#tashqari)"]')).toHaveCount(1);
  // loyiha koʻchalari boʻlaklari ham atrof yoʻllar qatlamida (3 qatlam: chet, trotuar, asfalt)
  expect(await view.locator('#Atrof_yollar path').count()).toBeGreaterThan(3 * nR);
  if (sh) {
    await page.waitForTimeout(1200); await page.screenshot({ path: `${sh}/yg_genplan_${tag}.png` });
    const z = page.locator('[data-sheet]', { hasText: 'Zonalashtirish' }).first();
    if (await z.count()) { await z.click(); await page.waitForTimeout(1500); await page.screenshot({ path: `${sh}/yg_zonalashtirish_${tag}.png` }); }
  }
});

test('FPS: zich OSM toʻrida render vaqti', async ({ page }) => {
  test.setTimeout(240_000);
  await setup(page, 1440, false, 12);
  await page.click('[data-step=kocha]');
  await page.waitForTimeout(1500);
  const ms = await page.evaluate(() => { const s = (window as any).__mr.scene; s.setView('axo'); s.frameView(0, 0, 700);
    const c = s.rcam(); for (let i = 0; i < 3; i++) s.renderer.render(s.scene, c);
    const gl = s.renderer.getContext(), px = new Uint8Array(4), t0 = performance.now(), N = 20; for (let i = 0; i < N; i++) { s.renderer.render(s.scene, c); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return (performance.now() - t0) / N; });
  console.log(`[FPS] axo, 25×25 OSM toʻr: ${ms.toFixed(1)} ms/kadr (≈ ${(1000 / ms).toFixed(1)} FPS, SwiftShader)`);
  expect(ms).toBeLessThan(5000);
});

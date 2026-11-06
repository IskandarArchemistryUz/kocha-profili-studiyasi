import { test, expect } from './fx';

/** 07.11 (c69, egasi: «yongʻin yoʻllari koʻchalarga negadir ulanmayapti»): hovli yongʻin-qutqaruv yoʻlagi kvartal chetidan
 *  qatnov qismigacha davom etadi (trotuar va yashil tasma ustidan, pasaytirilgan bordyur, tutashish yoyi R 6 m — ANDOZA);
 *  binolar oraligʻidagi bogʻlovchi hovli halqasigacha yetadi; uchastka chegarasidagi ogʻiz — atrofdagi (OSM) yoʻlgacha; yetmagani — qizil «×». */
function fixture(): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = []; let id = 1;
  const g = (x: number, y: number) => ({ lon: c[0] + x * mx, lat: c[1] + y * my });
  el.push({ type: 'way', id: id++, tags: { highway: 'primary', lanes: '4' }, geometry: [g(-130, -300), g(-130, 300)] });   // gʻarbda magistral
  el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [g(-300, 110), g(300, 110)] });              // shimolda mahalliy koʻcha
  return { elements: el };
}
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`yongʻin yoʻlagi koʻchaga ulanadi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(240_000);
  await page.route(/overpass|interpreter/, (r: any) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture()) }));
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:arcgisonline|terrain|amazonaws|elevation|openfreemap|tile|cartocdn|openstreetmap\.org))/, (r: any) => r.abort());
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad'); await page.waitForSelector('#ctxSt', { timeout: 60000 });
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    ed.store.dispatch({ type: 'setSite', rings: [[[-120, -100], [120, -100], [120, 100], [-120, 100]].map(G)] });
    ed.store.dispatch({ type: 'addStreet', axis: [[-130, 0], [120, 0]].map(G), profile: 'mahalla-15' }); });
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 0, null, { timeout: 60000 });
  // H ≥ 28 m — hovlida yongʻin yoʻlagi (666-band)
  await page.evaluate(() => { const ed = (window as any).__mr; for (const b of ed.store.doc.buildings) if (b.floors >= 5) ed.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: 12 } }); });
  await expect.poll(() => page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData.fireCross) n++; }); return n; }), { timeout: 30000 }).toBeGreaterThan(1);
  await expect.poll(() => page.evaluate(() => (window as any).__mr.allRules().find((x: any) => x.id === 'fire-666')?.note ?? ''), { timeout: 30000 }).toContain('Koʻchaga ulanish');
  const st = await page.evaluate(() => {
    const s = (window as any).__mr.scene; let cross = 0, curb = 0, lane = 0, open = 0; const polys: number[][][] = [];
    s.world.traverse((o: any) => {
      if (o.userData.fireCross) { cross++; const p = o.geometry.attributes.position; const r: number[][] = []; for (let i = 0; i < p.count; i++) r.push([p.getX(i), -p.getZ(i)]); polys.push(r); }
      if (o.userData.fireCurb) curb++; if (o.userData.fireLane) lane++; if (o.userData.fireOpen) open++;
    });
    // oʻtish ustida koʻcha daraxti yoʻq (yaqinlik: uchburchaklar uchlari bilan — taxminiy, 1 m)
    let treesOn = 0; s.world.traverse((o: any) => { if (o.userData?.streetTrees && o.isInstancedMesh) { const m = new (o.matrix.constructor)(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); const e = m.elements, q = [e[12], -e[14]];
      if (polys.some(r => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const v of r) { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); } return q[0] > x0 + 1 && q[0] < x1 - 1 && q[1] > y0 + 1 && q[1] < y1 - 1 && Math.abs(q[0] - (x0 + x1) / 2) < 1.5; })) treesOn++; } } });
    const r = (window as any).__mr.allRules().find((x: any) => x.id === 'fire-666');
    return { cross, curb, lane, open, treesOn, status: r?.status, note: r?.note ?? '' };
  });
  expect(st.cross).toBeGreaterThanOrEqual(2);   // loyiha koʻchasiga (ikki tomondan) va shimoldagi mavjud koʻchaga
  expect(st.curb).toBe(st.cross);
  expect(st.lane).toBeGreaterThan(0);
  expect(st.open).toBeGreaterThanOrEqual(1);    // janubda koʻcha yoʻq — ogʻiz «×» bilan belgilanadi
  expect(st.treesOn).toBe(0);
  expect(st.status).not.toBe('fail');
  expect(st.note).toContain('Koʻchaga ulanish');
  const sh = process.env.GX_SHOTS, tag = `${w}${dark ? 'd' : 'l'}`;
  if (sh) for (const [nm, v, x, y, r] of [['reja', 'plan', 0, 0, 140], ['ogiz', 'plan', 0, 10, 35], ['osm', 'plan', 0, 90, 30], ['akso', 'axo', 0, 0, 140]] as const) {
    await page.evaluate(([v, x, y, r]) => { const s = (window as any).__mr.scene; s.setView(v); s.frameView(x, y, r); }, [v, x, y, r]); await page.waitForTimeout(900);
    await page.screenshot({ path: `${sh}/yo_${nm}_${tag}.png` });
  }
});

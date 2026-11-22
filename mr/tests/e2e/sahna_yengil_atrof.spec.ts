import { test, expect, type BrowserContext } from './fx';

/** 22.11 (egasi: sahnani yanada yengillashtirish): atrof (OSM) daraxtlari ham «Sodda» qoidasiga boʻysunadi; soya xaritasi
 *  piksel zichligi / kanvas oʻlchami oʻzgarganda qayta chizilmaydi. Retina (zichlik 2) — kamera harakatida zichlik 1 ↔ 2 almashadi */
test.use({ deviceScaleFactor: 2 });

const O = [69.2797, 41.3111];
const kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
/** Sinov shahri: har 150 m da koʻcha (chetida koʻcha daraxtlari chiqadi), kvartallarda binolar */
function city() {
  const el: unknown[] = []; let id = 1;
  for (const c of [-375, -225, -75, 75, 225, 375]) {
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [ll(c, -520), ll(c, 520)] });
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [ll(-520, c), ll(520, c)] });
  }
  for (let bx = -300; bx <= 300; bx += 150) for (let by = -300; by <= 300; by += 150) {
    if (bx === 0 && by === 0) continue;
    el.push({ type: 'way', id: id++, tags: { building: 'apartments', 'building:levels': '5' }, geometry: [ll(bx - 30, by - 20), ll(bx + 30, by - 20), ll(bx + 30, by + 20), ll(bx - 30, by + 20), ll(bx - 30, by - 20)] });
  }
  return { elements: el };
}
async function mockNet(ctx: BrowserContext) {
  await ctx.route(/overpass|interpreter/, r => r.fulfill({ json: city() }));
  await ctx.route(/elevation-tiles|arcgisonline|openfreemap\.org/, r => r.fulfill({ status: 404, body: '' }));
}

test('atrof daraxtlari uzoqdan soddalashadi, «Toʻliq» va sahna rasmida — toʻliq; soya zichlik oʻzgarganda qayta chizilmaydi', async ({ page, context }) => {
  test.setTimeout(120_000);
  await mockNet(context);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.scene);
  await page.click('#ctxLoad');
  await page.waitForFunction(() => !!(window as any).__mr.scene.ctx?.group.getObjectByName('daraxtlar'), null, { timeout: 30_000 });
  /** koʻrinish yarim kengligi (m) → daraxtlar holati: [toj uchlari soni, toj soya tashlaydimi, tana chiziladimi] */
  const at = (half: number) => page.evaluate(async (h) => {
    const s = (window as any).__mr.scene; s.setView('plan'); s.ortho.userData.s = h; s.ortho.zoom = 1; s.resize(); s.ctl.update(); s.ctl.dispatchEvent({ type: 'change' });
    await new Promise(f => setTimeout(f, 600));
    const c = s.ctx.group.getObjectByName('daraxtlar'), t = c.userData.trunk;
    return { r: Math.round(s.viewExtent().r), st: [c.geometry.attributes.position.count, c.castShadow, t.layers.mask !== 0, t.visible] };
  }, half);
  // yaqindan (yarim kenglik ≤ 150 m) — toʻliq
  const near = await at(40);
  expect(near.r).toBeLessThan(150); expect(near.st).toEqual([240, true, true, true]);
  // uzoqdan: tana chizilmaydi (qatlam bilan — `visible` ga tegilmaydi), toj soyasiz
  const mid = await at(110);
  expect(mid.r).toBeGreaterThan(150); expect(mid.r).toBeLessThan(300); expect(mid.st).toEqual([240, false, false, true]);
  // juda uzoqdan: toj 20 uchburchak (60 uch)
  const far = await at(400);
  expect(far.r).toBeGreaterThan(300); expect(far.st).toEqual([60, false, false, true]);
  // sahna rasmi — doim toʻliq; rasmdan keyin «Sodda» holati qaytadi
  const shot = await page.evaluate(() => {
    const s = (window as any).__mr.scene, c = s.ctx.group.getObjectByName('daraxtlar'), t = c.userData.trunk, seen: unknown[] = [];
    const orig = s.renderer.render.bind(s.renderer); s.renderer.render = (...a: unknown[]) => { seen.push([c.geometry.attributes.position.count, c.castShadow, t.layers.mask !== 0]); return orig(...a); };
    const url = s.snapshot(); s.renderer.render = orig;
    return { ok: url.startsWith('data:image/png'), seen: seen[seen.length - 1], after: [c.geometry.attributes.position.count, c.castShadow, t.layers.mask !== 0] };
  });
  expect(shot.ok).toBe(true); expect(shot.seen).toEqual([240, true, true]); expect(shot.after).toEqual([60, false, false]);
  // «Toʻliq» rejim — uzoqdan ham toʻliq
  await page.click('#liteSeg [data-lite=toliq]');
  expect((await at(400)).st).toEqual([240, true, true, true]);
  await page.click('#liteSeg [data-lite=sodda]');
  expect((await at(400)).st).toEqual([60, false, false, true]);

  // kamera harakati: zichlik 2 → 1 → 2, soya xaritasi bir marta ham qayta chizilmaydi
  const sh = await page.evaluate(async () => {
    const s = (window as any).__mr.scene, m = s.renderer.shadowMap; await new Promise(f => setTimeout(f, 600));
    let v = m.needsUpdate, n = 0; Object.defineProperty(m, 'needsUpdate', { get: () => v, set: (x: boolean) => { if (x) n++; v = x; }, configurable: true });
    const pr: number[] = [];
    for (let i = 0; i < 3; i++) { s.ctl.dispatchEvent({ type: 'change' }); pr.push(s.renderer.getPixelRatio()); await new Promise(f => setTimeout(f, 450)); pr.push(s.renderer.getPixelRatio()); }
    return { n, pr };
  });
  expect(sh.pr).toEqual([1, 2, 1, 2, 1, 2]);
  expect(sh.n).toBe(0);
});

test('loyiha daraxtlari juda uzoqdan kam uchburchakli, yaqindan va GLB da — toʻliq', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    ed.store.dispatch({ type: 'setSite', rings: [[[-115, -90], [115, -90], [115, 90], [-115, 90]].map(G)] });
    ed.store.dispatch({ type: 'addStreet', axis: [[-150, 0], [150, 0]].map(G), profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'setSettings', patch: { yards: true } }); });
  const crowns = () => page.evaluate(() => { const g: number[] = []; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.fullGeo) g.push(o.geometry.attributes.position.count); }); return g; });
  await expect.poll(async () => (await crowns()).length, { timeout: 30_000 }).toBeGreaterThan(0);
  const at = (half: number) => page.evaluate(async (h) => {
    const s = (window as any).__mr.scene; s.setView('plan'); s.ortho.userData.s = h; s.ortho.zoom = 1; s.resize(); s.ctl.update(); s.ctl.dispatchEvent({ type: 'change' });
    await new Promise(f => setTimeout(f, 600));
  }, half);
  await at(40); expect(new Set(await crowns())).toEqual(new Set([240]));
  await at(400); expect(new Set(await crowns())).toEqual(new Set([60]));
  // GLB eksporti — toʻliq toj; eksportdan keyin uzoq koʻrinish holati qaytadi
  const glb = await page.evaluate(async () => { const s = (window as any).__mr.scene, seen: number[] = [];
    const orig = s.world.clone.bind(s.world); s.world.clone = (r: boolean) => { s.world.traverse((o: any) => { if (o.userData?.fullGeo) seen.push(o.geometry.attributes.position.count); }); return orig(r); };
    const b = await s.exportGLB(false); s.world.clone = orig; return { size: b.size, seen: [...new Set(seen)] }; });
  expect(glb.size).toBeGreaterThan(1000); expect(glb.seen).toEqual([240]);
  expect(new Set(await crowns())).toEqual(new Set([60]));
  // «Toʻliq» — uzoqdan ham toʻliq
  await page.click('#liteSeg [data-lite=toliq]');
  expect(new Set(await crowns())).toEqual(new Set([240]));
});

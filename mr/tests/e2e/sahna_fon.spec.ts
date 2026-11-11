import { test, expect, type Page, type BrowserContext } from './fx';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * c76 (egasi 11.11): 3D sahna foni va grafika shablonlari.
 *  1) OSM kontekst daraxtlari shablonda — shablon toj shakllari va och ranglari (InstancedMesh); «Asl uslub»da — dumaloq.
 *  2) Shablon tanlanganda xarita qatlami — shablonning och vektor foni; sputnik faqat «Xarita» oynasida qoʻlda (context.gsSat, ustun);
 *     «Asl uslub»dagi tanlov (context.base) oʻzgarmaydi.
 *  3) Yer uchastkalari rejasi: «Bir xil kulrang» ochroq (#8c8a85), namunalar va HEX; legend shu rangda; yozuvlar kontrastli.
 * SF_SHOTS — «oldin / keyin» skrinshotlar papkasi; SF_ONLY=1440 — faqat bitta oʻlcham.
 */
const SHOTS = process.env.SF_SHOTS;
const O = [69.2797, 41.3111];
const kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
const ring = (x0: number, y0: number, x1: number, y1: number) => [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)];
const TILES = [0, 1, 2, 3].map(i => readFileSync(fileURLToPath(new URL(`./fixtures/sputnik_${i}.jpg`, import.meta.url))));

/** Koʻp daraxtli sinov shahri: koʻchalar har 150 m, kvartallarda binolar, oʻrmon, bogʻ, suv, kanal va 1500 alohida daraxt (bir qismi uchastka ichida — yashiriladi) */
function city() {
  const el: unknown[] = []; let id = 1;
  for (const c of [-450, -300, -150, 150, 300, 450]) {
    el.push({ type: 'way', id: id++, tags: { highway: c === 150 ? 'secondary' : 'residential' }, geometry: [ll(c, -560), ll(c, 560)] });
    el.push({ type: 'way', id: id++, tags: { highway: c === -150 ? 'primary' : 'residential' }, geometry: [ll(-560, c), ll(560, c)] });
  }
  for (let bx = -375; bx <= 375; bx += 150) for (let by = -375; by <= 375; by += 150) {
    if (Math.abs(bx) < 150 && Math.abs(by) < 150) continue;   // markaz — loyiha
    if ((bx === -375 || bx === -225) && by >= 225) continue;   // oʻrmon
    if (bx >= 225 && by <= -225) continue;                      // bogʻ
    for (const [dx, dy] of [[-30, -25], [30, 25]]) el.push({ type: 'way', id: id++, tags: { building: 'apartments', 'building:levels': String(4 + ((bx + by + dx) / 75 & 7)) }, geometry: ring(bx + dx - 22, by + dy - 16, bx + dx + 22, by + dy + 16) });
  }
  el.push({ type: 'way', id: id++, tags: { landuse: 'forest' }, geometry: ring(-440, 160, -160, 440) });
  el.push({ type: 'way', id: id++, tags: { leisure: 'park' }, geometry: ring(160, -440, 440, -160) });
  el.push({ type: 'way', id: id++, tags: { natural: 'water' }, geometry: ring(170, 320, 280, 420) });
  el.push({ type: 'way', id: id++, tags: { waterway: 'canal' }, geometry: [ll(-560, -40), ll(-200, -60), ll(-160, -500)] });
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 1500; i++) { const x = (rnd() - 0.5) * 1000, y = (rnd() - 0.5) * 1000; el.push({ type: 'node', id: 900000 + i, tags: { natural: 'tree' }, ...ll(x, y) }); }
  return { elements: el };
}

async function mockNet(ctx: BrowserContext) {
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1)/, r => r.abort());   // qolgan tashqi soʻrovlar (keyingi qoidalar ustun)
  await ctx.route(/overpass|interpreter/, r => r.fulfill({ json: city() }));
  await ctx.route(/elevation-tiles|terrain|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await ctx.route(/openfreemap\.org|cartocdn|tile\.openstreetmap/, r => r.fulfill({ status: 404, body: '' }));
  // sunʼiy yoʻldosh plitkalari — sinov tasviri (4 xil)
  await ctx.route(/arcgisonline|arcgis\.com/, r => { const m = r.request().url().match(/\/(\d+)\/(\d+)\/(\d+)(?:\?|$)/); const k = m ? (Number(m[2]) * 3 + Number(m[3]) * 7) % 4 : 0; return /World_Imagery|imagery/i.test(r.request().url()) ? r.fulfill({ body: TILES[k], contentType: 'image/jpeg' }) : r.fulfill({ status: 404, body: '' }); });
}

const st = (page: Page) => page.evaluate(() => { const ed = (window as any).__mr, sc = ed.scene, c = sc.ctx; return {
  gstyle: ed.store.doc.gstyle ?? 'joriy', base: ed.store.doc.context.base, gsSat: ed.store.doc.context.gsSat === true,
  map: !!c?.ground.material.map, trees: c?.treeStyle ?? null, ground: c ? '#' + c.ground.material.color.getHexString() : '', bg: '#' + sc.scene.background.getHexString(),
  bld: (() => { const b = c?.group.getObjectByName('binolar'); return b ? '#' + b.material.color.getHexString() : ''; })(),
  kerb: (() => { const k = c?.group.getObjectByName('bordyurlar'); return k ? (k.visible ? '#' + k.material.color.getHexString() : 'yashirin') : 'yoʻq'; })(),
}; });
/** shablon daraxtlari tojlari ranglari (instansiya ranglari, noyob) va eng katta toʻyinganlik (HSL) */
const crownCols = (page: Page) => page.evaluate(() => { const c = (window as any).__mr.scene.ctx, out = new Set<string>(); let sMax = 0;
  const sr = (v: number) => v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;   // instansiya ranglari chiziqli fazoda
  for (const o of c.group.children) if (o.userData.ctxTree && o.userData.tree !== 'trunk' && o.instanceColor) { const a = o.instanceColor.array as Float32Array;
    for (let j = 0; j < o.count; j++) { const r = sr(a[j * 3]), g = sr(a[j * 3 + 1]), b = sr(a[j * 3 + 2]), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      sMax = Math.max(sMax, d ? d / (1 - Math.abs(2 * l - 1)) : 0); out.add([r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')); } }
  return { cols: [...out], sMax }; });

/** Kadr oʻlchovlari: chizish chaqiruvlari va uchburchaklar (soyali toʻliq kadr va oddiy kadr), kadr vaqti, daraxtlar */
const measure = (page: Page) => page.evaluate(() => {
  const sc = (window as any).__mr.scene, R = sc.renderer, gl = R.getContext(), cam = sc.rcam(), px = new Uint8Array(4);
  R.info.autoReset = true;
  R.shadowMap.needsUpdate = true; R.render(sc.scene, cam); const full = { calls: R.info.render.calls, tris: R.info.render.triangles };
  R.render(sc.scene, cam); const steady = { calls: R.info.render.calls, tris: R.info.render.triangles };
  const t0 = performance.now(); for (let i = 0; i < 6; i++) { R.render(sc.scene, cam); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  const ms = (performance.now() - t0) / 6;
  let meshes = 0, inst = 0, tris = 0, trees = 0;
  for (const o of sc.ctx.group.children) if (o.isInstancedMesh) { const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3; meshes++; inst += o.count; tris += t * o.count; if (o.userData.tree !== 'trunk' && !/tana/.test(o.name) && (o.name === 'daraxtlar' || o.userData.ctxTree)) trees += o.count; }
  sc.invalidate();
  return { full, steady, ms: Math.round(ms * 10) / 10, ctxTrees: { meshes, instances: inst, trees, tris } };
});

async function pop(page: Page, open: boolean) {
  const on = (await page.locator('#stylePop').getAttribute('aria-expanded')) === 'true';
  if (on !== open) await page.click('#stylePop');
}
async function gs(page: Page, id: string) {
  await pop(page, true); await page.click(`#scGStyle [data-gstyle=${id}]`);
  await expect(page.locator(`#scGStyle [data-gstyle=${id}]`)).toHaveAttribute('aria-pressed', 'true'); await pop(page, false);
}
async function base(page: Page, k: 'maket' | 'sputnik') {
  await pop(page, true); await page.click(`#baseSw [data-base=${k}]`);
  await expect(page.locator(`#baseSw [data-base=${k}]`)).toHaveAttribute('aria-pressed', 'true'); await pop(page, false);
}

const SIZES = ([[1440, false], [1024, true]] as const).filter(([w]) => !process.env.SF_ONLY || String(w) === process.env.SF_ONLY);
for (const [w, dark] of SIZES) test(`sahna foni va shablon daraxtlari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  test.setTimeout(480_000);
  const tag = `${w}${dark ? 'd' : 'l'}`;
  await mockNet(context);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('bino', { timeout: 30000 });
  await expect.poll(() => page.evaluate(() => !!(window as any).__mr.scene.ctx?.group.getObjectByName('daraxtlar')), { timeout: 20000 }).toBe(true);
  // uchastka va koʻchalar; hajm — 2 kvartal
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    ed.store.dispatch({ type: 'setSite', rings: [[[-115, -90], [115, -90], [115, 90], [-115, 90]].map(G)] });
    ed.store.dispatch({ type: 'addStreet', axis: [[-150, 0], [150, 0]].map(G), profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addStreet', axis: [[15, -140], [15, 140]].map(G), profile: 'mahalla-15' }); });
  await page.click('[data-step=hajm]');
  const opts = await page.locator('#genBlock option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(v => /^\d+$/.test(v)));
  for (const v of opts.slice(0, 3)) { await page.selectOption('#genBlock', v); await page.click('#genGo'); await page.waitForTimeout(1200); }
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(0);
  await page.evaluate(() => { const ed = (window as any).__mr, z = ed.store.doc.zones; if (z.length > 2) ed.store.dispatch({ type: 'setZones', zones: z.map((q: any, i: number) => i === 1 ? { ...q, use: 'maktab' } : i === 2 ? { ...q, use: 'yashil' } : q) }); });
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setSettings', patch: { yards: true } }); });

  // kameralar: aksonometriya va reja (bir xil kadr hamma holat uchun)
  const cams = await page.evaluate(() => { const sc = (window as any).__mr.scene, d = (window as any).__mr.store.doc;
    sc.setView('plan'); sc.frameRadius(260); const plan = sc.getCamera(); sc.setView('axo'); sc.frameRadius(300); const axo = sc.getCamera(); return { plan, axo }; });
  const shot = async (name: string) => {
    if (!SHOTS) return;
    for (const v of ['axo', 'plan'] as const) {
      await page.evaluate(c => { const sc = (window as any).__mr.scene; sc.setCamera(c); }, cams[v]);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/${name}_${v}_${tag}.png` });
    }
  };
  const M: Record<string, unknown> = {};

  // ---------- (0) Asl uslub + maket: hozirgi koʻrinish ----------
  let s = await st(page);
  expect(s).toMatchObject({ gstyle: 'joriy', base: 'maket', map: false, trees: 'asl', kerb: 'yashirin' });
  const asl0 = s;
  await page.evaluate(c => (window as any).__mr.scene.setCamera(c), cams.axo);
  M.asl_maket = await measure(page);

  // ---------- (a) Asl uslub + sputnik ----------
  await base(page, 'sputnik');
  await expect.poll(async () => (await st(page)).map, { timeout: 20000 }).toBe(true);
  s = await st(page); expect(s).toMatchObject({ base: 'sputnik', gsSat: false, trees: 'asl', kerb: 'yashirin' });   // 11.11: asl uslubda bordyur yoʻq
  await shot('a_asl_sputnik');
  await page.evaluate(c => (window as any).__mr.scene.setCamera(c), cams.axo);
  M.asl_sputnik = await measure(page);

  // ---------- (b) Pastel landshaft: avtomatik och vektor fon + shablon daraxtlari ----------
  await gs(page, 'pastel');
  await expect.poll(async () => (await st(page)).map, { timeout: 20000 }).toBe(false);
  s = await st(page);
  expect(s).toMatchObject({ gstyle: 'pastel', base: 'sputnik', gsSat: false, trees: 'shablon' });   // asl uslubdagi tanlov saqlanadi
  expect(s.bld).toBe('#ffffff');                       // atrof binolari — shablon atrofi (oq)
  if (!dark) expect(s.bg).toBe(s.ground);               // fon va yer bir xil och rang (tungi rejimda fon qorongʻi — avvalgidek)
  await pop(page, true);
  await expect(page.locator('#baseSw [data-base=maket]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#baseGs')).toBeVisible();
  await pop(page, false);
  // OSM daraxtlari: 3 toj shakli + tana (InstancedMesh, kam poligon)
  const kinds = await page.evaluate(() => (window as any).__mr.scene.ctx.group.children.filter((o: any) => o.userData.ctxTree).map((o: any) => o.geometry.type));
  expect(kinds).toContain('IcosahedronGeometry'); expect(kinds.length).toBeGreaterThanOrEqual(2); expect(kinds.length).toBeLessThanOrEqual(4);
  // uchastka ichidagi OSM daraxtlari yashirin (shablon daraxtlarida ham)
  const inSite = await page.evaluate(() => { const ctx = (window as any).__mr.scene.ctx, m = ctx.group.children.find((o: any) => o.userData.ctxTree && o.userData.tree === 'trunk'), a = m.instanceMatrix.array as Float32Array; let z = 0; for (let j = 0; j < m.count; j++) if (a[j * 16] === 0 && a[j * 16 + 5] === 0) z++; return z; });
  expect(inSite).toBeGreaterThan(0);
  // 11.11: yoʻllar chetida bordyur tasmasi (shablon chiziq rangidan); sahna daraxtlari — xira ranglar
  expect(s.kerb).toMatch(/^#[0-9a-f]{6}$/); expect(s.kerb).not.toBe('#ffffff');
  { const T = await crownCols(page); expect(T.cols.length).toBeGreaterThan(0); expect(T.sMax).toBeLessThan(0.33); }
  await shot('b_pastel_vektor');
  await page.evaluate(c => (window as any).__mr.scene.setCamera(c), cams.axo);
  M.pastel_vektor = await measure(page);

  // ---------- (c) Oq atrof + yorqin funksiya ----------
  await gs(page, 'yorqin');
  s = await st(page); expect(s).toMatchObject({ gstyle: 'yorqin', map: false, trees: 'shablon' });
  expect(s.kerb).toMatch(/^#[0-9a-f]{6}$/);
  // 11.11 (egasi): sahnada yorqin shablon daraxtlari ham xira; varaq rasmida (drawingShot) — shablonning oʻz ranglari
  const muted = await crownCols(page); expect(muted.sMax).toBeLessThan(0.33);
  const sheetT = await page.evaluate(() => (window as any).__mr.scene.drawingShot(() => { const c = (window as any).__mr.scene.ctx, out = new Set<string>();
    const sr = (v: number) => v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    for (const o of c.group.children) if (o.userData.ctxTree && o.userData.tree !== 'trunk' && o.instanceColor) { const a = o.instanceColor.array as Float32Array;
      for (let j = 0; j < o.count; j++) out.add([a[j * 3], a[j * 3 + 1], a[j * 3 + 2]].map(v => Math.round(sr(v) * 255).toString(16).padStart(2, '0')).join('')); }
    return [...out].sort(); }));
  expect(sheetT).toEqual(['98cb72', 'a3d275', 'b2da8a', 'c1e19e']);   // gstyle.ts — «Oq atrof + yorqin funksiya» trees3d
  expect((await crownCols(page)).cols.sort()).toEqual(muted.cols.sort());   // rasmdan keyin sahna yana xira
  await shot('c_yorqin_vektor');
  if (SHOTS) { await page.waitForTimeout(800); await pop(page, true); await expect(page.locator('#baseGsNote')).toBeVisible(); await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/xarita_oynasi_${tag}.png` }); await pop(page, false); }
  await page.evaluate(c => (window as any).__mr.scene.setCamera(c), cams.axo);
  M.yorqin_vektor = await measure(page);

  // ---------- (d) shablon + qoʻlda sputnik: tanlov saqlanadi va ustun ----------
  await base(page, 'sputnik');
  await expect.poll(async () => (await st(page)).map, { timeout: 20000 }).toBe(true);
  s = await st(page); expect(s).toMatchObject({ gstyle: 'yorqin', gsSat: true, trees: 'shablon', kerb: 'yashirin' });   // sputnikda bordyur yoʻq
  await shot('d_yorqin_sputnik');
  await gs(page, 'pastel');   // boshqa shablonga oʻtganda ham — sputnik
  s = await st(page); expect(s).toMatchObject({ gstyle: 'pastel', gsSat: true, map: true });

  // ---------- Asl uslubga qaytish: hozirgi xatti-harakat (context.base = sputnik) ----------
  await gs(page, 'joriy');
  await expect.poll(async () => (await st(page)).trees).toBe('asl');
  s = await st(page); expect(s).toMatchObject({ gstyle: 'joriy', base: 'sputnik', map: true });
  await base(page, 'maket');
  await expect.poll(async () => (await st(page)).map).toBe(false);
  s = await st(page); expect(s.ground).toBe(asl0.ground); expect(s.bld).toBe(asl0.bld); expect(s.bg).toBe(asl0.bg);   // «Asl uslub» koʻrinishi oʻzgarmagan
  const crowns = await page.evaluate(() => (window as any).__mr.scene.ctx.group.getObjectByName('daraxtlar').geometry.parameters.detail);
  expect(crowns).toBe(1);

  expect(s.kerb).toBe('yashirin');

  // ---------- 11.11: varaqda daraxtlar shablonning oʻz (yorqin) ranglarida qoladi ----------
  await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
  await page.locator('[data-sheet]').first().click();
  await page.click('#shGStyle [data-gstyle=yorqin]');
  await expect(page.locator('#shGStyle [data-gstyle=yorqin]')).toHaveAttribute('aria-pressed', 'true');
  const sheetFills = await page.locator('#gxView svg').evaluate(sv => [...new Set([...sv.querySelectorAll('[fill]')].map(e => e.getAttribute('fill')))]);
  const YF = ['#a8d47e', '#9ccc65', '#b8dc8f', '#8fc46a', '#c2e19c'];   // gstyle.ts — yorqin.trees.fills
  expect(YF.filter(f => sheetFills.includes(f)).length).toBeGreaterThanOrEqual(2);
  if (SHOTS) { await page.waitForTimeout(300); await page.locator('#gxView').screenshot({ path: `${SHOTS}/varaq_daraxt_yorqin_${tag}.png` }); }
  await page.click('#gxClose');

  if (SHOTS) writeFileSync(`${SHOTS}/olchov_${tag}.json`, JSON.stringify(M, null, 2));
  console.log(`OLCHOV ${tag}`, JSON.stringify(M));
  const A = M.asl_maket as { ctxTrees: { tris: number } }, B = M.pastel_vektor as { ctxTrees: { tris: number } };
  expect(B.ctxTrees.tris).toBeLessThan(A.ctxTrees.tris * 0.5);   // shablon daraxtlari kamida 2 barobar yengil
});

test('yer uchastkalari rejasi: och kulrang, namunalar va HEX, legend va yozuvlar', async ({ page }) => {
  test.setTimeout(240_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)/, r => r.abort());
  for (const [w, dark] of SIZES) {
    const tag = `${w}${dark ? 'd' : 'l'}`;
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('./'); await page.evaluate(() => localStorage.clear()); await page.reload();   // oldingi varaq sozlamalari eslab qolinmasin
    await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
    await page.evaluate(d => d ? document.documentElement.setAttribute('data-theme', 'dark') : document.documentElement.removeAttribute('data-theme'), dark);
    await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
      ed.store.dispatch({ type: 'setSite', rings: [[[-110, -85], [110, -85], [110, 85], [-110, 85]].map(G)] });
      ed.store.dispatch({ type: 'addStreet', axis: [[-140, 0], [140, 0]].map(G), profile: 'mahalla-15' });
      ed.store.dispatch({ type: 'addStreet', axis: [[20, -110], [20, 110]].map(G), profile: 'mahalla-15' }); });
    await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
    const names = await page.locator('[data-sheet]').allTextContents(), i = names.findIndex(t => /Parsellar rejasi|Yer uchastkalari rejasi/.test(t));
    expect(i).toBeGreaterThanOrEqual(0);
    await page.locator('[data-sheet]').nth(i).click();
    const view = page.locator('#gxView svg');
    const fills = () => view.locator('#Parsellar path').evaluateAll(ps => [...new Set(ps.map(p => p.getAttribute('fill')))]);
    const ink = () => view.locator('#Yer_uchastkalari_yozuvlari g').evaluateAll(gs => [...new Set(gs.map(g => g.getAttribute('fill')))]);
    await page.click('#shParcel [data-parcel=kulrang]');
    await expect(page.locator('#shPGrey [data-grey]')).toHaveCount(7);
    expect(await fills()).toEqual(['#8c8a85']);
    expect(await view.locator('#Shartli_belgilar [fill="#8c8a85"]').count()).toBeGreaterThan(0);
    await expect(page.locator('#shPGrey [data-grey="#8c8a85"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => (window as any).__mr.store.doc.sheets.some((x: any) => x.opts.parcelGrey))).toBe(false);   // sukut saqlanmaydi
    const inkNew = await ink(); if (inkNew.length) expect(inkNew).toEqual(['#1d1d1b']);
    if (SHOTS) { await page.waitForTimeout(250); await view.screenshot({ path: `${SHOTS}/parsel_yangi_${tag}.png` }); await page.screenshot({ path: `${SHOTS}/parsel_panel_${tag}.png` }); }
    // avvalgi toʻq rang — namunalar oxirida
    await page.click('#shPGrey [data-grey="#4f4e4a"]');
    expect(await fills()).toEqual(['#4f4e4a']);
    expect(await view.locator('#Shartli_belgilar [fill="#4f4e4a"]').count()).toBeGreaterThan(0);
    const inkOld = await ink(); if (inkOld.length) expect(inkOld).toEqual(['#ffffff']);   // toʻq kulrangda — oq yozuv
    if (SHOTS) { await page.waitForTimeout(250); await view.screenshot({ path: `${SHOTS}/parsel_eski_${tag}.png` }); }
    expect(await page.evaluate(() => (window as any).__mr.store.doc.sheets.find((x: any) => x.opts.parcelGrey)?.opts.parcelGrey)).toBe('#4f4e4a');
    // istalgan HEX — ilovaning rang tanlash oynasi (native input yoʻq)
    expect(await page.locator('input[type=color]').count()).toBe(0);
    await page.click('#shPGreyHex');
    await expect(page.locator('.cp')).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/parsel_hex_${tag}.png` });
    await page.fill('.cp-hex', '#9b978f'); await page.click('.cp [data-cp=ok]');
    await expect.poll(fills).toEqual(['#9b978f']);
    await expect(page.locator('#shPGreyHex')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#shPGreyV')).toHaveText('#9b978f');
    // funksiya rangiga qaytish — rang tanlash yoʻqoladi, tanlov varaqda qoladi
    await page.click('#shParcel [data-parcel=rang]');
    await expect(page.locator('#shPGrey')).toHaveCount(0);
    await page.click('#shParcel [data-parcel=kulrang]');
    expect(await fills()).toEqual(['#9b978f']);
    await page.click('#gxClose');
  }
});

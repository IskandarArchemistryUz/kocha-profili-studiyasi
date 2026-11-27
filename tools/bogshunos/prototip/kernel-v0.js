/* Bogʻshunos — landshaft master reja matematik yadrosi (v0, 14.11.2026)
   Hudud (poligon, 2 m to‘r) → relyef va oqim → kirishlar → dastur (zonalar maydoni) → zonalarni o‘stirish (imkoniyat xaritasi)
   → yo‘llar grafi (MST + halqa, ierarxiya) → qoplamalar → ekish (Poisson-disk, qator, guruh, matritsa) → yillar bo‘yicha o‘sish
   → ko‘rsatkichlar (balans, BAF, kanopi, oqim, yomg‘ir bog‘i, sug‘orish, tuproq hajmi, sig‘im, xizmat) → tekshiruvlar.
   Belgilar: N — norma, A — amaliyot/xalqaro orientir, P — parametr (mahalliy qiymat bilan tekshirilsin). */
'use strict';

const BG_DEF = {
  mode: 'park',            // 'park' | 'hovli' | 'koridor'
  shape: 'rect',           // 'rect' | 'L' | 'trap'
  w: 220, h: 160,          // m
  cell: 2,                 // m
  entrances: 4,
  residents: 6000,         // atrof aholisi (hovli rejimida — hovli aholisi)
  year: 15,                // ekishdan keyingi yil
  month: 5,                // 1..12
  seed: 7,
  rainMM: 25,              // P: hisobiy yomg‘ir, mm
  et0: 1100,               // P: mavsumiy ET₀ (apr–okt), mm — iqlim faylidan
  load: 50,                // N: ShNQ 2.07.01-23, 464 — bog‘ ≤ 50 kishi/ga (shahar tashqarisi); P shahar ichi uchun
  rgShare: 0.10,           // A: yomg‘ir bog‘i ≥ 10 % o‘tkazmas maydonning (4 % — Kaliforniya min., 10–20 % — Buyuk Britaniya)
  weights: { noise: 1, access: 1, slope: 1, low: 1 },
};

// --- tasodif (qayta takrorlanadi)
function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// --- o‘simliklar (namuna — atributlar tekshirilsin; manba: mahalliy katalog, WUCOLS sinflari analogiyasi)
const SPECIES = [
  { id: 'platanus', uz: 'Chinor (Platanus orientalis)', type: 'tree', R: 9, k: 0.07, ks: 0.6, allergen: 1, col: ['#c9c2b8', '#c9c2b8', '#cfe3a8', '#8fbf5a', '#5f9e3c', '#4f8f35', '#4f8f35', '#5a9038', '#8a9a3a', '#c9a24a', '#b07a3a', '#c9c2b8'] },
  { id: 'celtis', uz: 'Togʻ qayragʻochi (Celtis caucasica)', type: 'tree', R: 5, k: 0.08, ks: 0.3, allergen: 0, col: ['#c8c4bd', '#c8c4bd', '#d4e4b0', '#9cc46c', '#6aa24a', '#5c9640', '#5c9640', '#6a9a44', '#a0a84a', '#d0b450', '#c8c4bd', '#c8c4bd'] },
  { id: 'ulmus', uz: 'Qayragʻoch (Ulmus pumila)', type: 'tree', R: 6, k: 0.1, ks: 0.3, allergen: 1, col: ['#c6c0b8', '#c6c0b8', '#d8e6b4', '#94c066', '#649e46', '#5a9440', '#5a9440', '#64963f', '#9aa848', '#d4c060', '#c6c0b8', '#c6c0b8'] },
  { id: 'styph', uz: 'Sofora (Styphnolobium japonicum)', type: 'tree', R: 6, k: 0.07, ks: 0.4, allergen: 0, col: ['#c8c3bb', '#c8c3bb', '#c8c3bb', '#b4d48a', '#78b050', '#6aa448', '#eae3b8', '#e8deb0', '#88a850', '#d6c25a', '#c8c3bb', '#c8c3bb'] },
  { id: 'morus', uz: 'Tut (Morus alba)', type: 'tree', R: 5, k: 0.1, ks: 0.4, allergen: 1, col: ['#c7c2ba', '#c7c2ba', '#c7c2ba', '#a8d07c', '#6aa84a', '#5c9c42', '#5c9c42', '#62a044', '#9cb04c', '#e0cc58', '#c7c2ba', '#c7c2ba'] },
  { id: 'cercis', uz: 'Serсis (Cercis siliquastrum)', type: 'tree', R: 3, k: 0.12, ks: 0.3, allergen: 0, col: ['#c9c3bd', '#c9c3bd', '#e3a2c6', '#d68ab8', '#8cbc5c', '#78ac4c', '#78ac4c', '#7aa84c', '#a8b050', '#d2b450', '#c9c3bd', '#c9c3bd'] },
  { id: 'koel', uz: 'Kelreyteriya (Koelreuteria paniculata)', type: 'tree', R: 4, k: 0.1, ks: 0.3, allergen: 0, col: ['#c7c2b9', '#c7c2b9', '#c7c2b9', '#b8d488', '#7cb052', '#e8d250', '#e2c84c', '#a0a854', '#c0a44a', '#d89a3c', '#c7c2b9', '#c7c2b9'] },
  { id: 'pinus', uz: 'Eldar qaragʻayi (Pinus eldarica)', type: 'tree', R: 3.5, k: 0.09, ks: 0.3, allergen: 0, ever: 1, col: Array(12).fill('#3f6e4a') },
  { id: 'junip', uz: 'Archa (Juniperus virginiana)', type: 'tree', R: 2, k: 0.1, ks: 0.2, allergen: 1, ever: 1, col: Array(12).fill('#466e52') },
  { id: 'elaeag', uz: 'Jiyda (Elaeagnus angustifolia)', type: 'tree', R: 3.5, k: 0.12, ks: 0.2, allergen: 0, col: ['#c9c6bf', '#c9c6bf', '#c9c6bf', '#cfd8b8', '#b4c4a0', '#e4d690', '#aebc98', '#aebc98', '#b8c09c', '#c8c6a0', '#c9c6bf', '#c9c6bf'] },
];
const SHRUB = { id: 'shrub', uz: 'Butalar guruhi (ligustrum, spireya, atirgul)', R: 1.2, ks: 0.4 };
// zonaga mos turlar aralashmasi (ulushlar)
const MIX = {
  wood: { platanus: .25, celtis: .2, ulmus: .15, styph: .15, pinus: .15, junip: .1 },
  quiet: { cercis: .3, koel: .25, styph: .2, pinus: .15, elaeag: .1 },
  lawn: { platanus: .5, styph: .3, celtis: .2 },
  meadow: { elaeag: .4, celtis: .3, junip: .3 },
  play: { styph: .5, celtis: .5 },              // allergen emas — bolalar zonasida
  sport: { celtis: .5, styph: .5 },
  rain: { elaeag: .5, celtis: .5 },
  entry: { cercis: .4, koel: .3, styph: .3 },
};
// qoplamalar: C — oqim koeff. (A), baf — BAF koeff. (Berlin), kl — landshaft koeff. K_L (A, sug‘orish), col
const SURF = {
  path1: { uz: 'Asosiy yoʻl — granit/plitka', C: .85, baf: 0, kl: 0, col: '#e7e1d8' },
  path2: { uz: 'Ikkinchi yoʻl — oʻtkazuvchan plitka', C: .6, baf: .3, kl: 0, col: '#ede8df' },
  trail: { uz: 'Soʻqmoq — shagʻal', C: .4, baf: .3, kl: 0, col: '#f1ebe0' },
  plaza: { uz: 'Maydon — plitka', C: .85, baf: 0, kl: 0, col: '#e2dbd0' },
  play: { uz: 'Bolalar — rezina qoplama', C: .9, baf: 0, kl: 0, col: '#f2c9a8' },
  sport: { uz: 'Sport — rezina/sintetika', C: .9, baf: 0, kl: 0, col: '#e8a98a' },
  lawn: { uz: 'Maysa (oʻyin)', C: .25, baf: 1, kl: .8, col: '#cfe3b0' },
  meadow: { uz: 'Oʻtloq (2 marta oʻriladi)', C: .15, baf: 1, kl: .3, col: '#e2e6b8' },
  wood: { uz: 'Oʻrmon massivi (toʻshama)', C: .1, baf: 1, kl: .4, col: '#bcd6a0' },
  quiet: { uz: 'Sokin bogʻ — koʻp yillik oʻtlar', C: .2, baf: 1, kl: .5, col: '#e4d8ea' },
  rain: { uz: 'Yomgʻir bogʻi / bioariq', C: 1, baf: .7, kl: .6, col: '#bfe0e6' },
  water: { uz: 'Suv', C: 1, baf: 0, kl: 0, col: '#9fcfe0' },
  bld: { uz: 'Pavilion / kafe', C: .95, baf: 0, kl: 0, col: '#d6cfc4' },
  entry: { uz: 'Kirish maydoni', C: .85, baf: 0, kl: 0, col: '#e2dbd0' },
};

function generatePark(input) {
  const p = Object.assign({}, BG_DEF, input || {}); p.weights = Object.assign({}, BG_DEF.weights, (input || {}).weights);
  const R = rng(p.seed), C = []; const chk = (id, st, msg, src) => C.push({ id, status: st, msg, src: src || '' });
  const cs = p.cell, nx = Math.round(p.w / cs), ny = Math.round(p.h / cs), N = nx * ny;
  const idx = (i, j) => j * nx + i;
  // ---- 1. hudud maskasi
  const inside = new Uint8Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = (i + .5) * cs, y = (j + .5) * cs; let ok = true;
    if (p.shape === 'L') ok = !(x > p.w * .6 && y < p.h * .45);
    if (p.shape === 'trap') ok = x > (p.h - y) * .35;
    if (p.mode === 'koridor') ok = ok && y > p.h * 0.14; // daryo tasmasi
    inside[idx(i, j)] = ok ? 1 : 0;
  }
  const river = new Uint8Array(N); if (p.mode === 'koridor') for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = i * cs; const yb = p.h * 0.08 + Math.sin(x / p.w * Math.PI * 2) * p.h * 0.03; if ((j + .5) * cs < yb + p.h * .05 && (j + .5) * cs > yb - p.h * .05) river[idx(i, j)] = 1; }
  const area = [...inside].reduce((a, b) => a + b, 0) * cs * cs;
  // ---- 2. relyef: umumiy nishab + tepaliklar/chuqurlar (sintetik; real loyihada DEM import)
  const z = new Float32Array(N); const bumps = []; for (let k = 0; k < 6; k++) bumps.push({ x: R() * p.w, y: R() * p.h, a: (R() - .5) * 3, r: 20 + R() * 50 });
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = (i + .5) * cs, y = (j + .5) * cs; let v = (p.mode === 'koridor' ? y / p.h * 4 : (x / p.w) * 1.5 + (y / p.h) * .8); bumps.forEach(b => { const d2 = ((x - b.x) ** 2 + (y - b.y) ** 2) / (b.r * b.r); v += b.a * Math.exp(-d2); }); z[idx(i, j)] = v; }
  // ---- 3. chegara masofasi (ko‘cha shovqini), kirishlar
  const distEdge = new Float32Array(N).fill(1e9);
  const edgeCells = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = idx(i, j); if (!inside[k]) continue; const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const ii = i + a, jj = j + b; return ii < 0 || jj < 0 || ii >= nx || jj >= ny || (!inside[idx(ii, jj)] && !river[idx(ii, jj)]); }); if (nb) edgeCells.push(k); }
  // daryo tomoni — shovqin manbai emas
  bfsDist(edgeCells, distEdge);
  // kirishlar: perimetr bo‘ylab teng (burchakdan biroz ichkari)
  const ents = [];
  const perim = edgeCells.map(k => ({ k, i: k % nx, j: Math.floor(k / nx) })).filter(c => !(p.mode === 'koridor' && c.j * cs < p.h * .2));
  const cx = nx / 2, cy = ny / 2; perim.sort((a, b) => Math.atan2(a.j - cy, a.i - cx) - Math.atan2(b.j - cy, b.i - cx));
  for (let e = 0; e < p.entrances; e++) { const c = perim[Math.floor((e + .37) / p.entrances * perim.length) % perim.length]; ents.push({ i: c.i, j: c.j, x: (c.i + .5) * cs, y: (c.j + .5) * cs }); }
  const distEnt = new Float32Array(N).fill(1e9); bfsDist(ents.map(e => idx(e.i, e.j)), distEnt);
  function bfsDist(src, out) { const q = []; src.forEach(k => { out[k] = 0; q.push(k); }); let h = 0; while (h < q.length) { const k = q[h++]; const i = k % nx, j = (k / nx) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const kk = idx(ii, jj); if (!inside[kk] || out[kk] <= out[k] + cs) continue; out[kk] = out[k] + cs; q.push(kk); } } }
  // ---- 4. oqim: D8 yo‘nalish + to‘planish → past joylar
  const order = [...Array(N).keys()].filter(k => inside[k]).sort((a, b) => z[b] - z[a]);
  const acc = new Float32Array(N); order.forEach(k => acc[k] += 1);
  const down = new Int32Array(N).fill(-1);
  order.forEach(k => { const i = k % nx, j = (k / nx) | 0; let best = -1, bz = z[k]; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const kk = idx(ii, jj); if (!inside[kk]) continue; const dz = (z[k] - z[kk]) / Math.hypot(a, b); if (z[kk] < bz && dz > 0) { bz = z[kk]; best = kk; } } down[k] = best; if (best >= 0) acc[best] += acc[k]; });
  // ---- 5. dastur (zonalar maydoni)
  const visitors = Math.round(area / 1e4 * p.load);
  let prog;
  if (p.mode === 'hovli') {
    // N: ShNQ 2.07.01-23 4-jadval (hovli maydonchalari, m²/kishi): bolalar 0,7; kattalar dam olishi 0,1; sport 2,0; xo‘jalik 0,3
    const r = p.residents;
    prog = [['play', .7 * r, 'Bolalar maydonchasi'], ['quiet', .1 * r + area * .08, 'Kattalar dam olishi'], ['sport', 2.0 * r, 'Sport maydonchasi'], ['lawn', area * .12, 'Maysa'], ['wood', area * .18, 'Daraxtzor']];
  } else {
    prog = [['entry', 0, 'Kirishlar'], ['play', area * .05, 'Bolalar'], ['sport', Math.min(area * .07, visitors / 1000 * 3900 + 400), 'Sport (33-jadval)'], ['plaza', area * .03, 'Markaziy maydon'], ['bld', Math.min(area * .01, 600), 'Kafe/pavilion'],
      ['lawn', area * .14, 'Tadbir maysasi'], ['quiet', area * .08, 'Sokin bogʻ'], ['wood', area * (p.mode === 'koridor' ? .3 : .28), 'Oʻrmon massivi'], ['meadow', area * .14, 'Oʻtloq']];
  }
  const target = {}; prog.forEach(([k, a]) => target[k] = a);
  // ---- 6. zonalarni o‘stirish (imkoniyat bo‘yicha urug‘ + BFS o‘sish)
  const zone = new Array(N).fill(null);
  const W = p.weights; const zmin = Math.min(...order.map(k => z[k])), zmax = Math.max(...order.map(k => z[k]));
  const slopeAt = k => { const i = k % nx, j = (k / nx) | 0; const kx = idx(Math.min(nx - 1, i + 1), j), ky = idx(i, Math.min(ny - 1, j + 1)); return Math.hypot(z[kx] - z[k], z[ky] - z[k]) / cs; };
  const maxE = Math.max(...order.map(k => distEdge[k])) || 1, maxA = Math.max(...order.map(k => distEnt[k])) || 1;
  const suit = {
    play: k => -distEnt[k] / maxA * W.access + distEdge[k] / maxE * .5 * W.noise - slopeAt(k) * 20 * W.slope,
    sport: k => -distEnt[k] / maxA * W.access - slopeAt(k) * 30 * W.slope,
    plaza: k => -Math.abs(distEnt[k] / maxA - .45) * 2 - slopeAt(k) * 20,
    bld: k => -Math.abs(distEnt[k] / maxA - .35) * 2 - slopeAt(k) * 20,
    lawn: k => distEdge[k] / maxE * W.noise - slopeAt(k) * 30 * W.slope,
    quiet: k => distEdge[k] / maxE * 2 * W.noise,
    wood: k => -distEdge[k] / maxE * 2 * W.noise,   // ko‘chaga yaqin — shovqin va chang to‘sig‘i
    meadow: k => (z[k] - zmin) / (zmax - zmin + 1e-6),
  };
  // yomg‘ir bog‘i: eng yuqori to‘planish nuqtalari, keyin hisob (12-bosqich) bilan maydon tekshiriladi
  const rainSeeds = order.slice().sort((a, b) => acc[b] - acc[a]).slice(0, 3);
  const grow = (key, seed, tgt) => { let got = 0; const q = [seed]; const seen = new Set([seed]); const f = suit[key] || (() => 0);
    const pq = [[f(seed), seed]];
    while (pq.length && got < tgt) { pq.sort((a, b) => b[0] - a[0]); const [, k] = pq.shift(); if (zone[k] || !inside[k]) continue; zone[k] = key; got += cs * cs; const i = k % nx, j = (k / nx) | 0;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const kk = idx(ii, jj); if (seen.has(kk) || zone[kk] || !inside[kk]) continue; seen.add(kk); pq.push([f(kk) + R() * .05, kk]); }
      if (pq.length > 4000) pq.length = 4000; }
    return got; };
  // kirish maydonlari
  ents.forEach(e => grow('entry', idx(e.i, e.j), 140));
  const got = {};
  const placeOrder = ['bld', 'plaza', 'play', 'sport', 'quiet', 'lawn', 'wood', 'meadow'].filter(k => target[k]);
  // yomg‘ir bog‘i (dastlabki — 3 % maydon), keyin hisob bilan tekshiriladi
  let rainGot = 0; rainSeeds.forEach(s => { if (!zone[s]) rainGot += grow('rain', s, area * .03 / rainSeeds.length); });
  got.rain = rainGot;
  placeOrder.forEach(key => {
    const f = suit[key]; let best = -1, bv = -1e9; for (const k of order) { if (zone[k]) continue; const v = f(k); if (v > bv) { bv = v; best = k; } }
    if (best < 0) { got[key] = 0; return; }
    // katta zona — bir nechta urug‘ (o‘rmon, o‘tloq) — tabiiyroq
    const parts = (key === 'wood' || key === 'meadow') ? 3 : (key === 'sport' && target[key] > 1500 ? 2 : 1);
    let g = 0; for (let s = 0; s < parts; s++) { let sd = best; if (s > 0) { let bv2 = -1e9; for (const k of order) { if (zone[k]) continue; const v = f(k) + R() * .3; if (v > bv2) { bv2 = v; sd = k; } } } g += grow(key, sd, target[key] / parts); }
    got[key] = g;
  });
  // qolgan bo‘sh kataklar — o‘tloq/maysa
  order.forEach(k => { if (!zone[k]) zone[k] = p.mode === 'hovli' ? 'lawn' : 'meadow'; });
  // ---- 7. yo‘llar: tugunlar = kirishlar + zona markazlari; MST + halqa
  const cent = {}; order.forEach(k => { const zz = zone[k]; if (!cent[zz]) cent[zz] = { x: 0, y: 0, n: 0 }; cent[zz].x += (k % nx + .5) * cs; cent[zz].y += (((k / nx) | 0) + .5) * cs; cent[zz].n++; });
  const nodes = ents.map((e, i) => ({ id: 'E' + (i + 1), x: e.x, y: e.y, kind: 'entry' }));
  ['plaza', 'play', 'sport', 'bld', 'quiet', 'lawn'].forEach(k => { if (cent[k]) nodes.push({ id: k, x: cent[k].x / cent[k].n, y: cent[k].y / cent[k].n, kind: k }); });
  const edges = []; for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) edges.push({ a, b, L: Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) });
  edges.sort((u, v) => u.L - v.L);
  const par = nodes.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
  const mst = []; edges.forEach(e => { const ra = find(e.a), rb = find(e.b); if (ra !== rb) { par[ra] = rb; mst.push(e); } });
  // halqa: kirishlar orasidagi to‘g‘ri chiziq grafdagi yo‘ldan 1,4 martadan qisqa bo‘lsa — qo‘shiladi (istak chizig‘i)
  const graphDist = (s, t, E) => { const d = nodes.map(() => 1e9); d[s] = 0; const vis = new Set(); while (vis.size < nodes.length) { let u = -1, du = 1e9; d.forEach((v, i) => { if (!vis.has(i) && v < du) { du = v; u = i; } }); if (u < 0) break; vis.add(u); E.forEach(e => { const o = e.a === u ? e.b : e.b === u ? e.a : -1; if (o >= 0 && d[u] + e.L < d[o]) d[o] = d[u] + e.L; }); } return d[t]; };
  const extra = [];
  for (let a = 0; a < ents.length; a++) for (let b = a + 1; b < ents.length; b++) { const L = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y); if (graphDist(a, b, mst.concat(extra)) > 1.4 * L) { // eng yaqin markaz orqali
      let best = null; edges.forEach(e => { if ((e.a === a || e.b === a) && !mst.includes(e) && !extra.includes(e)) { const o = e.a === a ? e.b : e.a; if (o >= ents.length && (!best || e.L < best.L)) best = e; } }); if (best) extra.push(best); } }
  const pathEdges = mst.concat(extra);
  // ierarxiya: kirishlar orasidagi eng qisqa yo‘llarda yotgan qirralar — asosiy
  const use = new Map(); pathEdges.forEach(e => use.set(e, 0));
  for (let a = 0; a < ents.length; a++) for (let b = a + 1; b < ents.length; b++) { const prev = sp(a, b); prev.forEach(e => use.set(e, use.get(e) + 1)); }
  function sp(s, t) { const d = nodes.map(() => 1e9), pe = nodes.map(() => null); d[s] = 0; const vis = new Set(); while (vis.size < nodes.length) { let u = -1, du = 1e9; d.forEach((v, i) => { if (!vis.has(i) && v < du) { du = v; u = i; } }); if (u < 0) break; vis.add(u); pathEdges.forEach(e => { const o = e.a === u ? e.b : e.b === u ? e.a : -1; if (o >= 0 && d[u] + e.L < d[o]) { d[o] = d[u] + e.L; pe[o] = e; } }); } const out = []; let c = t; while (pe[c]) { out.push(pe[c]); c = pe[c].a === c ? pe[c].b : pe[c].a; } return out; }
  const paths = pathEdges.map(e => { const u = use.get(e); const cls = u >= 2 ? 'path1' : 'path2'; const wdt = cls === 'path1' ? (area > 3e4 ? 5 : 3.5) : 2.5; return { a: nodes[e.a], b: nodes[e.b], cls, w: wdt, L: e.L }; });
  // so‘qmoq halqasi (yugurish) — hududdan 8 m ichkarida, maydon ≥ 2 ga
  const trailCells = [];
  if (area >= 2e4 && p.mode !== 'hovli') order.forEach(k => { if (Math.abs(distEdge[k] - 10) < cs * .5 && zone[k] !== 'entry') trailCells.push(k); });
  // rasterlash: yo‘l kataklari
  const surf = new Array(N).fill(null);
  order.forEach(k => surf[k] = zone[k]);
  const pathCell = new Uint8Array(N);
  const segDist = (px, py, s) => { const vx = s.b.x - s.a.x, vy = s.b.y - s.a.y; const t = Math.max(0, Math.min(1, ((px - s.a.x) * vx + (py - s.a.y) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(px - s.a.x - t * vx, py - s.a.y - t * vy); };
  order.forEach(k => { const x = (k % nx + .5) * cs, y = (((k / nx) | 0) + .5) * cs; for (const s of paths) { if (segDist(x, y, s) <= s.w / 2 + .01) { if (!['plaza', 'bld', 'entry', 'play', 'sport'].includes(zone[k])) surf[k] = s.cls; pathCell[k] = 1; break; } } });
  trailCells.forEach(k => { if (!pathCell[k] && !['play', 'sport', 'bld', 'plaza'].includes(zone[k])) { surf[k] = 'trail'; pathCell[k] = 1; } });
  // yo‘l nishabligi (DEM): har qirra bo‘ylab 10 nuqta
  const zAt = (x, y) => { const i = Math.max(0, Math.min(nx - 1, Math.floor(x / cs))), j = Math.max(0, Math.min(ny - 1, Math.floor(y / cs))); return z[idx(i, j)]; };
  paths.forEach(s => { let mx = 0; for (let t = 0; t < 10; t++) { const x0 = s.a.x + (s.b.x - s.a.x) * t / 10, y0 = s.a.y + (s.b.y - s.a.y) * t / 10, x1 = s.a.x + (s.b.x - s.a.x) * (t + 1) / 10, y1 = s.a.y + (s.b.y - s.a.y) * (t + 1) / 10; mx = Math.max(mx, Math.abs(zAt(x1, y1) - zAt(x0, y0)) / (s.L / 10 || 1)); } s.grade = mx; });
  // ---- 8. ekish: Poisson-disk (zona bo‘yicha zichlik), cheklovlar
  const trees = []; const grid = new Map(); const gk = (x, y) => Math.floor(x / 6) + ',' + Math.floor(y / 6);
  const near = (x, y, r) => { const gx = Math.floor(x / 6), gy = Math.floor(y / 6); const span = Math.ceil(r / 6) + 1; for (let a = -span; a <= span; a++) for (let b = -span; b <= span; b++) { const L = grid.get((gx + a) + ',' + (gy + b)); if (L) for (const t of L) if (Math.hypot(t.x - x, t.y - y) < Math.min(r, (t.Rm + r) * .5 + .5)) return true; } return false; };
  const spacingK = { wood: .9, quiet: 1.4, lawn: 2.6, meadow: 3.5, play: 1.6, sport: 1.6, rain: 1.8, entry: 1.5, plaza: 2.2 };
  const pickSp = zz => { const mix = MIX[zz] || MIX.wood; let r = R(), acc2 = 0; for (const [id, w] of Object.entries(mix)) { acc2 += w; if (r <= acc2) return SPECIES.find(s => s.id === id); } return SPECIES[0]; };
  const candidates = order.slice().sort(() => R() - .5);
  let rejDist = 0;
  for (const k of candidates) {
    const zz = zone[k]; if (!spacingK[zz] || pathCell[k]) continue;
    if (['play', 'sport', 'plaza', 'bld', 'entry'].includes(zz) && !edgeOfZone(k)) continue; // maydonchalarning chetida soya daraxtlari
    const sp0 = pickSp(zz); const x = (k % nx + .5) * cs + (R() - .5) * cs, y = (((k / nx) | 0) + .5) * cs + (R() - .5) * cs;
    const dmin = sp0.R * 2 * spacingK[zz];
    if (near(x, y, dmin)) continue;
    // N: 35-jadval — yo‘lak chetidan daraxt poyasigacha ≥ 0,7 m (bu yerda yo‘l kataklaridan ≥ 0,7 + yarim katak)
    if (pathNear(x, y, .7)) { rejDist++; continue; }
    if (p.mode === 'hovli' && distEdge[k] < 5) { rejDist++; continue; } // N: bino devoridan ≥ 5 m (hovli chegarasi = binolar)
    const t = { x, y, sp: sp0.id, Rm: sp0.R, zone: zz }; trees.push(t); const g = gk(x, y); if (!grid.has(g)) grid.set(g, []); grid.get(g).push(t);
  }
  function edgeOfZone(k) { const i = k % nx, j = (k / nx) | 0; return [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([a, b]) => { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) return false; const kk = idx(ii, jj); return inside[kk] && zone[kk] !== zone[k]; }); }
  function pathNear(x, y, d) { for (const s of paths) if (segDist(x, y, s) < s.w / 2 + d) return true; return false; }
  // butalar: sokin bog‘ va kirish chegaralarida guruhlar; ko‘p yillik: sokin bog‘ maydonida matritsa 8/m², 70/30
  const shrubs = []; order.forEach(k => { const zz = zone[k]; if ((zz === 'quiet' || zz === 'entry' || zz === 'play') && edgeOfZone(k) && !pathCell[k] && R() < .35) { const x = (k % nx + .5) * cs, y = (((k / nx) | 0) + .5) * cs; if (!pathNear(x, y, .5)) shrubs.push({ x, y }); } });
  // ---- 9. o‘sish: toj radiusi r(t) = Rmax·(1 − e^(−k·t)) + 0,6
  const rAt = (t, yr) => { const s = SPECIES.find(q => q.id === t.sp); return s.R * (1 - Math.exp(-s.k * yr)) + .6; };
  trees.forEach(t => { t.r = rAt(t, p.year); t.col = SPECIES.find(q => q.id === t.sp).col[(p.month - 1 + 12) % 12]; });
  // kanopi: kataklarni toj bilan qoplash
  const canopyAt = yr => { const cov = new Uint8Array(N); trees.forEach(t => { const r = rAt(t, yr); const i0 = Math.max(0, Math.floor((t.x - r) / cs)), i1 = Math.min(nx - 1, Math.floor((t.x + r) / cs)), j0 = Math.max(0, Math.floor((t.y - r) / cs)), j1 = Math.min(ny - 1, Math.floor((t.y + r) / cs)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { if (Math.hypot((i + .5) * cs - t.x, (j + .5) * cs - t.y) <= r && inside[idx(i, j)]) cov[idx(i, j)] = 1; } }); return cov.reduce((a, b) => a + b, 0) * cs * cs / area; };
  // ---- 10. ko‘rsatkichlar
  const sArea = {}; order.forEach(k => { const s = surf[k]; sArea[s] = (sArea[s] || 0) + cs * cs; });
  const sum = keys => keys.reduce((a, k) => a + (sArea[k] || 0), 0);
  const green = sum(['lawn', 'meadow', 'wood', 'quiet', 'rain']);
  const hard = sum(['path1', 'path2', 'plaza', 'play', 'sport', 'entry', 'bld', 'trail']);
  const pathsA = sum(['path1', 'path2', 'trail']);
  const imperv = Object.entries(sArea).reduce((a, [k, v]) => a + (SURF[k] && SURF[k].C >= .6 ? v : 0), 0);
  const baf = Object.entries(sArea).reduce((a, [k, v]) => a + v * (SURF[k] ? SURF[k].baf : 0), 0) / area;
  const runoff = Object.entries(sArea).reduce((a, [k, v]) => a + v * (SURF[k] ? SURF[k].C : 0), 0) * p.rainMM / 1000; // m³
  const rgNeed = imperv * p.rgShare, rgHave = sArea.rain || 0;
  const irr = Object.entries(sArea).reduce((a, [k, v]) => a + v * (SURF[k] ? SURF[k].kl : 0), 0) * p.et0 / 1000; // m³/mavsum
  const soil = trees.reduce((a, t) => a + .6 * Math.PI * (SPECIES.find(s => s.id === t.sp).R) ** 2, 0); // m³ (A: 0,6 m³/m² toj)
  const can = { 0: canopyAt(0.01), 10: canopyAt(10), 30: canopyAt(30), now: canopyAt(p.year) };
  const evergreen = trees.filter(t => SPECIES.find(s => s.id === t.sp).ever).length / (trees.length || 1);
  const allergNearPlay = trees.filter(t => t.zone === 'play' && SPECIES.find(s => s.id === t.sp).allergen).length;
  const perennials = Math.round((sArea.quiet || 0) * .6 * 8); // sokin bog‘ning 60 % — gulzor, 8 o‘simlik/m²
  const qty = { area: Math.round(area), ha: +(area / 1e4).toFixed(2), visitors, trees: trees.length, shrubs: shrubs.length * 5, perennials, perStruct: Math.round(perennials * .7), perFill: Math.round(perennials * .3),
    green: +(green / area).toFixed(3), hard: +(hard / area).toFixed(3), paths: +(pathsA / area).toFixed(3), baf: +baf.toFixed(2), runoff: Math.round(runoff), rgNeed: Math.round(rgNeed), rgHave: Math.round(rgHave), irr: Math.round(irr), soil: Math.round(soil), can, evergreen: +evergreen.toFixed(2),
    pathLen: Math.round(paths.reduce((a, s) => a + s.L, 0) + trailCells.length * cs * .5), cafeSeats: Math.round(visitors / 1000 * 28), sportNeed: Math.round(visitors / 1000 * 3900) };
  // ---- 11. tekshiruvlar
  if (p.mode === 'park') chk('N491', qty.green >= .7 ? 'PASS' : 'FAIL', `Koʻkalamzor ulushi ${(qty.green * 100).toFixed(1)} % (istirohat bogʻi ≥ 70 %)`, 'ShNQ 2.07.01-23, 491-band');
  if (p.mode === 'park') chk('N481', area >= 3e4 ? 'PASS' : 'INFO', `Maydon ${qty.ha} ga — turar joy tumani bogʻi ≥ 3 ga; xiyobon ≥ 0,5 ga`, 'ShNQ 2.07.01-23, 481-band');
  if (p.mode === 'hovli') chk('N474', qty.green >= .3 ? 'PASS' : 'FAIL', `Hovli koʻkalamzorligi ${(qty.green * 100).toFixed(1)} % (alohida bino hududi ≥ 30 %)`, 'ShNQ 2.07.01-23, 474-band');
  chk('Y1', qty.paths >= .06 && qty.paths <= .16 ? 'PASS' : 'WARN', `Yoʻllar ulushi ${(qty.paths * 100).toFixed(1)} % (orientir 8–12 %)`, 'ShNQ 2.07.01-23, 463-band (shahar tashqarisi bogʻi) — orientir');
  prog.forEach(([k, a, name]) => { if (!a || k === 'entry') return; const g = got[k] || 0; const r = g / a; if (r < .85) chk('Z1', 'WARN', `${name}: ${Math.round(g)} / ${Math.round(a)} m² (${Math.round(r * 100)} %) — joy yetmadi`, 'A'); });
  if (p.mode === 'hovli') { const play = got.play || 0, sport = got.sport || 0; chk('N4', play >= .7 * p.residents * .85 && sport >= 2 * p.residents * .85 ? 'PASS' : 'FAIL', `Hovli maydonchalari: bolalar ${Math.round(play)} / ${Math.round(.7 * p.residents)} m², sport ${Math.round(sport)} / ${Math.round(2 * p.residents)} m²`, 'ShNQ 2.07.01-23, 4-jadval'); }
  chk('K30', can[30] >= .3 ? 'PASS' : 'WARN', `Kanopi: 0 yil ${pct(can[0])}, 10 yil ${pct(can[10])}, 30 yil ${pct(can[30])} (3-30-300: ≥ 30 %)`, 'A: Konijnendijk 3-30-300');
  chk('BAF', baf >= .6 ? 'PASS' : 'WARN', `Yashillik koeffitsienti (BAF) ${qty.baf} (Berlin maqsadi 0,6; UGF turar joy 0,4)`, 'A: Berlin BAF; London UGF');
  chk('RG', rgHave >= rgNeed ? 'PASS' : 'WARN', `Yomgʻir bogʻi ${qty.rgHave} m² / kerak ${qty.rgNeed} m² (${Math.round(p.rgShare * 100)} % oʻtkazmas maydon ${Math.round(imperv)} m²)`, 'A: bioretensiya ≥ 4 %, BB 10–20 %');
  const steep = paths.filter(s => s.grade > 1 / 20); chk('UD', steep.length ? 'WARN' : 'PASS', steep.length ? `${steep.length} yoʻl boʻlagi 1:20 dan tik — pandus va dam olish maydonchalari kerak` : 'Barcha yoʻllar ≤ 1:20', 'A: universal dizayn (1:20 / 1:12)');
  chk('AL', allergNearPlay ? 'WARN' : 'PASS', allergNearPlay ? `${allergNearPlay} allergen daraxt bolalar zonasida` : 'Bolalar zonasida allergen daraxt yoʻq', 'A');
  chk('D35', 'PASS', `Daraxtlar yoʻlak chetidan ≥ 0,7 m${p.mode === 'hovli' ? ', binodan ≥ 5 m' : ''} (rad etilgan nomzodlar: ${rejDist})`, 'ShNQ 2.07.01-23, 35-jadval');
  chk('S33', 'INFO', `Sigʻim ${visitors} kishi bir vaqtda (${p.load} kishi/ga) → kafe ${qty.cafeSeats} oʻrin, sport maydonchalari ${qty.sportNeed} m²`, 'ShNQ 2.07.01-23, 464-band, 33-jadval');
  // ichki yaxlitlik
  const connected = (() => { const par2 = nodes.map((_, i) => i), f2 = i => par2[i] === i ? i : (par2[i] = f2(par2[i])); pathEdges.forEach(e => par2[f2(e.a)] = f2(e.b)); return nodes.every((_, i) => f2(i) === f2(0)); })();
  if (!connected) chk('INV', 'FAIL', 'Yoʻllar tarmogʻi bogʻlanmagan', '—');
  function pct(v) { return (v * 100).toFixed(0) + ' %'; }
  return { p, nx, ny, cs, inside, river, z, zmin, zmax, acc, zone, surf, ents, nodes, paths, trailCells, trees, shrubs, qty, sArea, checks: C, area, prog, got };
}

if (typeof module !== 'undefined') module.exports = { generatePark, SPECIES, SURF, BG_DEF };

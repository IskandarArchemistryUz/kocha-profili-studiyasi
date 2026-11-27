/* Binokor muharriri — yadro (v1, 14.11.2026)
   Bino qadamma-qadam quriladi: o‘qlar → qavatlar → devorlar → ustunlar → oyna/eshik → (avtomatik) xonalar va plita → zina → tom → poydevor.
   Har element o‘q nomlari orqali bog‘lanadi (A1, C5) — o‘q surilsa hammasi birga suriladi.
   Buyruq tili (agent ham, foydalanuvchi ham shu orqali): grid / levels / wall / column / window / door / stair / copy / roof / delete.
   Birlik: sm. Belgilar: N — norma, A — amaliyot, P — parametr. */
'use strict';

const TYPES = {
  wall: {
    'T400': { uz: 'Tashqi devor 400 (g‘isht 250 + issiqlik 100 + suvoq)', bearing: true, layers: [{ m: 'Suvoq', d: 20, l: 0.87 }, { m: 'G‘isht', d: 250, l: 0.81 }, { m: 'Mineral paxta', d: 100, l: 0.045 }, { m: 'Fasad suvog‘i', d: 30, l: 0.93 }] },
    'M200': { uz: 'Monolit devor 200 (yuk ko‘taruvchi)', bearing: true, layers: [{ m: 'Temirbeton', d: 200, l: 1.69 }] },
    'P120': { uz: 'To‘siq 120 (gazoblok)', bearing: false, layers: [{ m: 'Gazoblok D500', d: 100, l: 0.14 }, { m: 'Suvoq ×2', d: 20, l: 0.87 }] },
  },
  column: { 'C400': { uz: 'Ustun 400×400', b: 40 } },
  window: { 'O15': { uz: 'Deraza 1500×1500', w: 150, h: 150, sill: 85 }, 'O21': { uz: 'Deraza 2100×1500', w: 210, h: 150, sill: 85 }, 'O09': { uz: 'Deraza 900×1500', w: 90, h: 150, sill: 85 } },
  door: { 'D10': { uz: 'Kirish eshigi 1000×2100', w: 100, h: 210 }, 'D08': { uz: 'Xona eshigi 800×2100', w: 80, h: 210 }, 'D07': { uz: 'S/u eshigi 700×2100', w: 70, h: 210 } },
  slab: { t: 20 },
};
const thick = t => TYPES.wall[t].layers.reduce((s, l) => s + l.d, 0) / 10; // mm → sm
const uValue = t => { const R = TYPES.wall[t].layers.reduce((s, l) => s + (l.d / 1000) / l.l, 0) + 0.13 + 0.04; return 1 / R; }; // A: R_si 0,13, R_se 0,04

function newModel() { return { grid: { x: [], y: [] }, levels: [], el: [], roof: null, seq: 1, log: [], zones: [] }; }

// ---------- o‘q to‘ri
function setGrid(M, axis, stepsM) {
  const names = axis === 'x' ? i => String(i + 1) : i => 'АБВГДЕЖИКЛМН'[i] || ('Y' + i);
  let pos = 0; const out = [{ id: names(0), pos: 0 }];
  stepsM.forEach((s, i) => { pos += Math.round(s * 100); out.push({ id: names(i + 1), pos }); });
  M.grid[axis] = out;
}
const ax = (M, a, id) => M.grid[a].find(g => g.id === id);
// tugun nomi: "А1" (harf + raqam) yoki "1А"
function node(M, ref) {
  const m = String(ref).match(/^([А-ЯA-Z]+)(\d+)$/i) || String(ref).match(/^(\d+)([А-ЯA-Z]+)$/i);
  if (!m) return null; let ys = isNaN(+m[1]) ? m[1] : m[2], xs = isNaN(+m[1]) ? m[2] : m[1];
  ys = ys.toUpperCase().replace(/A/g, 'А').replace(/B/g, 'Б'); // lotin A/B → kirill
  const X = ax(M, 'x', xs), Y = ax(M, 'y', ys); if (!X || !Y) return null;
  return { x: X.pos, y: Y.pos, xi: M.grid.x.indexOf(X), yi: M.grid.y.indexOf(Y), ref: Y.id + X.id };
}
function setLevels(M, n, h, first) { M.levels = []; let z = 0; for (let i = 0; i < n; i++) { const hh = Math.round(((i === 0 && first) ? first : h) * 100); M.levels.push({ id: 'L' + (i + 1), name: (i + 1) + '-qavat', z, h: hh }); z += hh; } }

// ---------- elementlar
function add(M, e) { e.id = e.cat[0].toUpperCase() + (M.seq++); M.el.push(e); return e; }
function addWall(M, type, a, b, level) {
  const A = node(M, a), B = node(M, b); if (!A || !B) throw new Error(`Tugun topilmadi: ${a} / ${b}`);
  if (A.x !== B.x && A.y !== B.y) throw new Error(`Devor ${a}–${b}: faqat bitta o‘q bo‘ylab (gorizontal yoki vertikal)`);
  if (!TYPES.wall[type]) throw new Error(`Devor turi yo‘q: ${type}`);
  return add(M, { cat: 'wall', type, a: A.ref, b: B.ref, level });
}
function addColumn(M, at, level, type = 'C400') { const A = node(M, at); if (!A) throw new Error('Tugun topilmadi: ' + at); return add(M, { cat: 'column', type, at: A.ref, level }); }
// teshik: devor ichida, ikki tugun orasidagi oraliq o‘rtasiga (yoki offset sm)
function addOpening(M, kind, type, a, b, level, off) {
  const A = node(M, a), B = node(M, b); if (!A || !B) throw new Error(`Tugun topilmadi: ${a}–${b}`);
  const w = M.el.find(e => e.cat === 'wall' && e.level === level && onWall(M, e, A) && onWall(M, e, B));
  if (!w) throw new Error(`${a}–${b} oralig‘ida ${level} da devor yo‘q`);
  const W = wallGeom(M, w), L = Math.hypot(B.x - A.x, B.y - A.y);
  const sA = Math.abs((A.x - W.x0) + (A.y - W.y0)), sB = Math.abs((B.x - W.x0) + (B.y - W.y0));
  const mid = off != null ? Math.min(sA, sB) + off : (sA + sB) / 2;
  return add(M, { cat: kind, type, host: w.id, s: mid, level, span: [A.ref, B.ref], L });
}
function onWall(M, w, P) { const g = wallGeom(M, w); if (g.dir === 'x') return P.y === g.y0 && P.x >= Math.min(g.x0, g.x1) && P.x <= Math.max(g.x0, g.x1); return P.x === g.x0 && P.y >= Math.min(g.y0, g.y1) && P.y <= Math.max(g.y0, g.y1); }
function wallGeom(M, w) { const A = node(M, w.a), B = node(M, w.b); const dir = A.y === B.y ? 'x' : 'y'; const [p, q] = (dir === 'x' ? A.x <= B.x : A.y <= B.y) ? [A, B] : [B, A]; return { x0: p.x, y0: p.y, x1: q.x, y1: q.y, dir, L: Math.hypot(q.x - p.x, q.y - p.y), t: thick(w.type), A: p, B: q }; }
function addStair(M, x0, x1, y0, y1, level) { return add(M, { cat: 'stair', x0, x1, y0, y1, level }); }
function copyLevel(M, from, to) { const src = M.el.filter(e => e.level === from && e.cat !== 'stair' || (e.level === from && e.cat === 'stair')); const idMap = {}; src.filter(e => e.cat === 'wall' || e.cat === 'column' || e.cat === 'stair').forEach(e => { const c = Object.assign({}, e, { level: to }); delete c.id; const n = add(M, c); idMap[e.id] = n.id; }); src.filter(e => e.cat === 'window' || e.cat === 'door').forEach(e => { const c = Object.assign({}, e, { level: to, host: idMap[e.host] }); delete c.id; add(M, c); }); }
function del(M, id) { const e = M.el.find(q => q.id === id); if (!e) return; M.el = M.el.filter(q => q.id !== id && q.host !== id); }

// ---------- buyruq tili (agent / foydalanuvchi)
// grid x 3.6 3.3 3.6 | grid y 6 2 6 | levels 5 3.0 [first 3.3] | wall T400 А1 А6 [L1|all] | column А1 [L1]
// window O15 А1 А2 [L1|all] | door D10 Б3 Б4 | stair 3 4 А Б [L1|all] | copy L1 all | roof flat|gable 30 | delete W5
function run(M, text) {
  const out = [];
  text.split('\n').map(s => s.replace(/#.*/, '').trim()).filter(Boolean).flatMap(s => s.split(';')).map(s => s.trim()).filter(Boolean).forEach(line => {
    const t = line.split(/\s+/), c = t[0].toLowerCase();
    const lv = () => { const last = t[t.length - 1]; if (/^l\d+$/i.test(last)) return [last.toUpperCase()]; if (last === 'all') return M.levels.map(l => l.id); return [M.levels[0] ? M.levels[0].id : 'L1']; };
    try {
      if (c === 'grid') setGrid(M, t[1], t.slice(2).map(Number));
      else if (c === 'levels') { const fi = t.indexOf('first'); setLevels(M, +t[1], +t[2], fi > 0 ? +t[fi + 1] : null); }
      else if (c === 'wall') lv().forEach(l => addWall(M, t[1], t[2], t[3], l));
      else if (c === 'column') lv().forEach(l => addColumn(M, t[1], l));
      else if (c === 'window' || c === 'door') lv().forEach(l => addOpening(M, c, t[1], t[2], t[3], l));
      else if (c === 'stair') lv().forEach(l => addStair(M, t[1], t[2], t[3], t[4], l));
      else if (c === 'copy') { const from = t[1].toUpperCase(); const tos = t[2] === 'all' ? M.levels.map(l => l.id).filter(id => id !== from) : [t[2].toUpperCase()]; tos.forEach(to => copyLevel(M, from, to)); }
      else if (c === 'zone') lv().forEach(l => (M.zones = M.zones || []).push({ x: +t[1] * 100, y: +t[2] * 100, name: t.slice(3).filter(w => !/^l\d+$/i.test(w) && w !== 'all').join(' '), level: l }));
      else if (c === 'roof') M.roof = { type: t[1], slope: +(t[2] || 0) };
      else if (c === 'delete') del(M, t[1]);
      else throw new Error('Nomaʼlum buyruq: ' + c);
      out.push({ ok: true, line });
    } catch (e) { out.push({ ok: false, line, err: e.message }); }
  });
  M.log = M.log.concat(out); return out;
}

// ---------- hisob: xonalar (yopiq sikllar), plita, zina, tom, poydevor, jadvallar, tekshiruvlar
function analyze(M) {
  const C = []; const chk = (id, st, msg, src) => C.push({ id, status: st, msg, src: src || '' });
  const X = M.grid.x, Y = M.grid.y, levels = {};
  M.levels.forEach(L => {
    const walls = M.el.filter(e => e.cat === 'wall' && e.level === L.id).map(w => Object.assign({ w }, wallGeom(M, w)));
    // 1) devorlarni o‘q tugunlari bo‘yicha birlik qirralarga bo‘lish → tekis graf
    const edges = new Map(); // "xi,yi|xi,yi" → wall
    const nid = (xi, yi) => xi + ',' + yi;
    walls.forEach(g => {
      if (g.dir === 'x') { const yi = Y.findIndex(q => q.pos === g.y0); const i0 = X.findIndex(q => q.pos === g.x0), i1 = X.findIndex(q => q.pos === g.x1); for (let i = i0; i < i1; i++) edges.set(nid(i, yi) + '|' + nid(i + 1, yi), g); }
      else { const xi = X.findIndex(q => q.pos === g.x0); const j0 = Y.findIndex(q => q.pos === g.y0), j1 = Y.findIndex(q => q.pos === g.y1); for (let j = j0; j < j1; j++) edges.set(nid(xi, j) + '|' + nid(xi, j + 1), g); }
    });
    // 2) yuzalar: yarim qirralar, har tugunda qirralar burchak bo‘yicha saralangan; keyingi = teskari qirradan keyingi (soat yo‘nalishi)
    const adj = new Map(); const P = id => { const [i, j] = id.split(',').map(Number); return { x: X[i].pos, y: Y[j].pos }; };
    edges.forEach((g, k) => { const [u, v] = k.split('|'); [[u, v], [v, u]].forEach(([a, b]) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); }); });
    adj.forEach((nb, a) => { const pa = P(a); nb.sort((p, q) => Math.atan2(P(p).y - pa.y, P(p).x - pa.x) - Math.atan2(P(q).y - pa.y, P(q).x - pa.x)); });
    const used = new Set(), faces = [];
    adj.forEach((nb, a) => nb.forEach(b => {
      if (used.has(a + '>' + b)) return; const cyc = []; let u = a, v = b, guard = 0;
      while (!used.has(u + '>' + v) && guard++ < 10000) { used.add(u + '>' + v); cyc.push(u); const nv = adj.get(v); const k = nv.indexOf(u); const w2 = nv[(k - 1 + nv.length) % nv.length]; u = v; v = w2; }
      if (cyc.length >= 3) faces.push(cyc);
    }));
    const area = cyc => { let s = 0; cyc.forEach((id, i) => { const p = P(id), q = P(cyc[(i + 1) % cyc.length]); s += p.x * q.y - q.x * p.y; }); return s / 2; };
    // ekranda y pastga — ichki yuzalar musbat yo‘nalishda (sinov bilan tekshirilgan)
    const rooms = [], outer = [];
    faces.forEach(f => { const a = area(f); if (a > 0) rooms.push(f); else outer.push(f); });
    const roomData = rooms.map((f, i) => {
      const gross = area(f) / 1e4; let peri = 0, cut = 0;
      f.forEach((id, k) => { const p = P(id), q = P(f[(k + 1) % f.length]); const L = Math.hypot(q.x - p.x, q.y - p.y); peri += L; const key = edges.get(id + '|' + f[(k + 1) % f.length]) || edges.get(f[(k + 1) % f.length] + '|' + id); cut += L * (key ? key.t : 0) / 2; });
      // N: xona maydoni devorlarning ichki yuzalari bo‘yicha — o‘q bo‘yicha maydondan yarim devor qalinligi ayiriladi, burchaklar qaytariladi
      const corners = f.length; const tAvg = cut / (peri || 1) * 2; const net = Math.max(0, gross - cut / 1e4 + corners * (tAvg / 2) ** 2 / 1e4 * 0.5);
      const cx = f.reduce((s, id) => s + P(id).x, 0) / f.length, cy = f.reduce((s, id) => s + P(id).y, 0) / f.length;
      return { n: i + 1, poly: f.map(P), gross: +gross.toFixed(2), net: +net.toFixed(2), peri: +(peri / 100).toFixed(2), cx, cy };
    });
    // zonalar: nom nuqta orqali (nuqta ko‘pburchak ichida — nur kesishish sinovi)
    const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
    (M.zones || []).filter(z => z.level === L.id).forEach(z => { const r = roomData.find(q => inPoly(z, q.poly)); if (r) r.name = z.name; });
    // plita: barcha xonalar yig‘indisi (tashqi kontur bo‘yicha) − zinalar
    const stairs = M.el.filter(e => e.cat === 'stair' && e.level === L.id).map(s => stairGeom(M, s, L));
    const slabArea = rooms.reduce((s, f) => s + area(f), 0) / 1e4 + walls.reduce((s, g) => 0, 0);
    const openings = M.el.filter(e => (e.cat === 'window' || e.cat === 'door') && e.level === L.id);
    levels[L.id] = { L, walls, edges, rooms: roomData, outer: outer.map(f => f.map(P)), stairs, openings, slabArea: +(slabArea - stairs.reduce((s, q) => s + q.holeArea, 0)).toFixed(2) };
    // ---- tekshiruvlar (shu qavat)
    if (walls.length && !rooms.length) chk('S1', 'FAIL', `${L.name}: devorlar yopiq kontur hosil qilmaydi — plita va xonalar chiqmaydi`, 'model');
    // osilgan devor uchlari (faqat bitta qirra tutashgan tugun)
    let dangling = 0; adj.forEach(nb => { if (nb.length === 1) dangling++; }); if (dangling) chk('G1', 'WARN', `${L.name}: ${dangling} ta devor uchi hech narsaga tutashmagan`, 'model');
    // teshiklar
    openings.forEach(o => {
      const host = walls.find(g => g.w.id === o.host); if (!host) { chk('O0', 'FAIL', `${o.id}: xost devor yo‘q`, 'model'); return; }
      const T = TYPES[o.cat][o.type], half = T.w / 2, s0 = o.s - half, s1 = o.s + half;
      if (s0 < host.t / 2 || s1 > host.L - host.t / 2) chk('O1', 'FAIL', `${o.id} (${o.type}) devor ${host.w.id} chetidan chiqib ketadi`, 'model');
      // o‘q (kesishgan devor yoki ustun) teshik ichidan o‘tmasin — konstruktiv-oqlar T2
      const cross = (host.dir === 'x' ? X : Y).filter(g => { const s = host.dir === 'x' ? g.pos - host.x0 : g.pos - host.y0; return s > s0 - 15 && s < s1 + 15 && s > 0 && s < host.L; });
      if (cross.length) chk('O2', 'FAIL', `${o.id}: ${cross.map(c => c.id).join(', ')}-o‘q teshik ichidan o‘tadi`, 'konstruktiv-oqlar T2');
      openings.filter(q => q !== o && q.host === o.host).forEach(q => { const T2 = TYPES[q.cat][q.type]; if (Math.abs(q.s - o.s) < (T.w + T2.w) / 2 + 30 && o.id < q.id) chk('O3', 'FAIL', `${o.id} va ${q.id} ustma-ust (oraliq < 0,3 m)`, 'A'); });
    });
    roomData.forEach(r => { if (r.net < 2) chk('R0', 'WARN', `${L.name}, xona ${r.n}: ${r.net} m² — juda kichik`, 'A'); });
    stairs.forEach(s => { if (!s.fits) chk('ST1', 'FAIL', `${L.name}: zina (${(s.len / 100).toFixed(2)}×${(s.wid / 100).toFixed(2)} m) oraliqqa sig‘maydi (${(s.bx / 100).toFixed(2)}×${(s.by / 100).toFixed(2)} m)`, 'P: marsh eni 1,05; maydoncha 1,3'); });
  });
  // vertikal uzluksizlik: yuqori qavatdagi yuk ko‘taruvchi devor ostida devor yoki ikki uchida ustun bo‘lishi kerak (ShNQ 2.01.06-25, 34-band)
  for (let i = 1; i < M.levels.length; i++) {
    const up = levels[M.levels[i].id], dn = levels[M.levels[i - 1].id]; let bad = 0;
    up.edges.forEach((g, k) => { if (!TYPES.wall[g.w.type].bearing) return; const below = dn.edges.get(k); const [u, v] = k.split('|'); const colAt = id => M.el.some(e => e.cat === 'column' && e.level === M.levels[i - 1].id && (() => { const n = node(M, e.at); return n.xi + ',' + n.yi === id; })()); if (!(below && TYPES.wall[below.w.type].bearing) && !(colAt(u) && colAt(v))) bad++; });
    if (bad) chk('V1', 'FAIL', `${M.levels[i].name}: ${bad} ta yuk ko‘taruvchi devor bo‘lagi ostida tayanch yo‘q`, 'ShNQ 2.01.06-25, 34-band');
  }
  // ---- jadvallar
  const H = M.levels.reduce((s, l) => s + l.h, 0);
  const wallRows = {}; M.levels.forEach(L => levels[L.id].walls.forEach(g => { const r = wallRows[g.w.type] || (wallRows[g.w.type] = { type: g.w.type, L: 0, A: 0, V: 0, n: 0 }); const lnet = g.L; const openA = levels[L.id].openings.filter(o => o.host === g.w.id).reduce((s, o) => { const T = TYPES[o.cat][o.type]; return s + T.w * T.h; }, 0); r.n++; r.L += lnet / 100; r.A += (lnet * L.h - openA) / 1e4; r.V += (lnet * L.h - openA) * g.t / 1e6; }));
  const opRows = {}; M.el.filter(e => e.cat === 'window' || e.cat === 'door').forEach(o => { const k = o.type; opRows[k] = opRows[k] || { type: k, cat: o.cat, n: 0 }; opRows[k].n++; });
  const roomsTot = M.levels.reduce((s, l) => s + levels[l.id].rooms.reduce((a, r) => a + r.net, 0), 0);
  const slabTot = M.levels.reduce((s, l) => s + levels[l.id].slabArea, 0);
  const L1 = levels[M.levels[0] && M.levels[0].id];
  const found = L1 ? { stripL: L1.walls.filter(g => TYPES.wall[g.w.type].bearing).reduce((s, g) => s + g.L / 100, 0), w: 0.6, d: 1.5 } : null; // P: lenta eni va chuqurligi — geologiya
  if (found) found.V = +(found.stripL * found.w * found.d).toFixed(1);
  const top = M.levels.length ? levels[M.levels[M.levels.length - 1].id] : null;
  let roof = null; if (M.roof && top) { const xs = top.outer.flat().map(p => p.x), ys = top.outer.flat().map(p => p.y); const W = (Math.max(...xs) - Math.min(...xs)) / 100, D = (Math.max(...ys) - Math.min(...ys)) / 100; const plan = top.slabArea; if (M.roof.type === 'gable') { const span = Math.min(W, D), rise = span / 2 * Math.tan(M.roof.slope * Math.PI / 180); roof = { type: 'Ikki nishabli', plan, area: +(plan / Math.cos(M.roof.slope * Math.PI / 180)).toFixed(1), rise: +rise.toFixed(2) }; } else roof = { type: 'Tekis, parapet 1,2 m', plan, area: plan, rise: 0 }; }
  const wallTypes = Object.keys(TYPES.wall).map(k => ({ type: k, uz: TYPES.wall[k].uz, t: thick(k), U: +uValue(k).toFixed(2), R: +(1 / uValue(k)).toFixed(2) }));
  const summary = { levels: M.levels.length, H: H / 100, rooms: roomsTot, slab: slabTot, walls: Object.values(wallRows), openings: Object.values(opRows), found, roof, wallTypes, concrete: +(Object.values(wallRows).filter(r => r.type === 'M200').reduce((s, r) => s + r.V, 0) + slabTot * TYPES.slab.t / 100).toFixed(1) };
  return { levels, checks: C, summary };
}
// zina: N/P — h ≤ 18 sm, 2h+b ∈ [60;64], marsh 105, maydoncha 130 (P)
function stairGeom(M, s, L) {
  const x0 = ax(M, 'x', s.x0).pos, x1 = ax(M, 'x', s.x1).pos, y0 = ax(M, 'y', s.y0).pos, y1 = ax(M, 'y', s.y1).pos;
  const bx = Math.abs(x1 - x0) - 20, by = Math.abs(y1 - y0) - 20; // devor qalinligi yarimlari (taxminan)
  let n = Math.ceil(L.h / 18), h, b = 30; for (; n < 40; n++) { h = L.h / n; const bb = Math.min(32, Math.max(26, 62 - 2 * h)); if (2 * h + bb >= 60 && 2 * h + bb <= 64) { b = bb; break; } } if (n % 2) n++; h = L.h / n;
  const len = (n / 2 - 1) * b + 2 * 130, wid = 2 * 105 + 10;
  const along = by >= bx ? 'y' : 'x'; const fits = (along === 'y' ? (by >= len && bx >= wid) : (bx >= len && by >= wid)) || (bx >= len && by >= wid) || (by >= len && bx >= wid);
  return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), n, h: +(h / 100).toFixed(3), b: b / 100, len, wid, bx, by, fits, along, holeArea: Math.abs(x1 - x0) * Math.abs(y1 - y0) / 1e4 };
}

const SAMPLES = {
  seksiya: `# 1. O'qlar (agent shu buyruqlarni yozadi)
grid x 3.6 3.3 3.6 3.6 3.3 3.6
grid y 6.0 1.8 6.0
# 2. Qavatlar: 5 ta, 3,0 m; 1-qavat 3,3 m
levels 5 3.0 first 3.3
# 3. Tashqi devorlar
wall T400 А1 А7 L1
wall T400 Г1 Г7 L1
wall T400 А1 Г1 L1
wall T400 А7 Г7 L1
# 4. Ichki yuk ko'taruvchi devorlar (o'qlarda)
wall M200 А2 Б2 L1
wall M200 А3 Б3 L1
wall M200 А5 Б5 L1
wall M200 А6 Б6 L1
wall M200 В2 Г2 L1
wall M200 В3 Г3 L1
wall M200 В5 Г5 L1
wall M200 В6 Г6 L1
wall M200 Б1 Б7 L1
wall M200 В1 В7 L1
wall M200 А4 Г4 L1
# 5. Zina-lift yadrosi
stair 3 4 А Б L1
# 6. Derazalar va eshiklar
window O15 А1 А2 L1
window O15 А2 А3 L1
window O15 А4 А5 L1
window O15 А5 А6 L1
window O15 А6 А7 L1
window O21 Г1 Г2 L1
window O15 Г2 Г3 L1
window O21 Г3 Г4 L1
window O15 Г4 Г5 L1
window O15 Г5 Г6 L1
window O21 Г6 Г7 L1
door D10 Б1 Б2 L1
door D10 Б5 Б6 L1
door D10 В1 В2 L1
door D10 В5 В6 L1
door D10 Б3 Б4 L1
# 7. Qavatni nusxalash va tom
copy L1 all
roof flat`,
  uy: `# Yakka uy: 2 qavat
grid x 4.2 3.6 4.2
grid y 4.5 1.5 4.5
levels 2 3.0
wall T400 А1 А4 L1
wall T400 Г1 Г4 L1
wall T400 А1 Г1 L1
wall T400 А4 Г4 L1
wall M200 Б1 Б4 L1
wall P120 В1 В4 L1
wall M200 А2 Б2 L1
wall M200 В3 Г3 L1
window O21 А1 А2 L1
window O15 А2 А3 L1
window O15 А3 А4 L1
window O21 Г1 Г2 L1
window O09 Г3 Г4 L1
door D10 Г2 Г3 L1
copy L1 L2
roof gable 30`,
};

if (typeof module !== 'undefined') module.exports = { newModel, run, analyze, TYPES, thick, uValue, SAMPLES, node, wallGeom, stairGeom };

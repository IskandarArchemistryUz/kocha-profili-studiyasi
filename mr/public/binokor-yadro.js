/* Binokor — yadro v2 (0-bosqich, 14.11.2026)
   Asosiy farq v1 dan: element o'qqa qulflanmagan. Har nuqta — erkin koordinata (mm) yoki o'q tuguniga bog'langan
   nuqta + siljish. O'q surilsa, bog'langan nuqtalar birga suriladi; erkin nuqtalar joyida qoladi.
   Buyruq tili v1 bilan mos (eski seksiya/uy namunalari o'zgarishsiz ishlaydi) + yangi buyruqlar.
   Birlik: ichkarida mm; buyruqlarda metr (nuqta bilan: 3.6). Koordinata o'qi: x o'ngga, y pastga (ekran). */
'use strict';

const TYPES = {
  wall: {
    'T400': { uz: 'Tashqi devor 400 (g‘isht 250 + issiqlik 100 + suvoq)', bearing: true, layers: [{ m: 'Suvoq', d: 20, l: 0.87 }, { m: 'G‘isht', d: 250, l: 0.81 }, { m: 'Mineral paxta', d: 100, l: 0.045 }, { m: 'Fasad suvog‘i', d: 30, l: 0.93 }] },
    'M200': { uz: 'Monolit devor 200 (yuk ko‘taruvchi)', bearing: true, layers: [{ m: 'Temirbeton', d: 200, l: 1.69 }] },
    'P120': { uz: 'To‘siq 120 (gazoblok)', bearing: false, layers: [{ m: 'Gazoblok D500', d: 100, l: 0.14 }, { m: 'Suvoq ×2', d: 20, l: 0.87 }] },
    'V60': { uz: 'Vitraj / shisha devor 60', bearing: false, glass: true, layers: [{ m: 'Shisha paket', d: 60, l: 0.1 }] },
  },
  column: { 'C400': { uz: 'Ustun 400×400', b: 400, d: 400 }, 'C300': { uz: 'Ustun 300×300', b: 300, d: 300 }, 'C500x300': { uz: 'Ustun 500×300', b: 500, d: 300 } },
  window: { 'O15': { uz: 'Deraza 1500×1500', w: 1500, h: 1500, sill: 850 }, 'O21': { uz: 'Deraza 2100×1500', w: 2100, h: 1500, sill: 850 }, 'O09': { uz: 'Deraza 900×1500', w: 900, h: 1500, sill: 850 }, 'O12': { uz: 'Deraza 1200×1500', w: 1200, h: 1500, sill: 850 }, 'O24': { uz: 'Panorama deraza 2400×2200 (past tokcha)', w: 2400, h: 2200, sill: 200 }, 'O06': { uz: 'Tor deraza 600×1500', w: 600, h: 1500, sill: 850 } },
  door: { 'D10': { uz: 'Kirish eshigi 1000×2100', w: 1000, h: 2100 }, 'D08': { uz: 'Xona eshigi 800×2100', w: 800, h: 2100 }, 'D07': { uz: 'S/u eshigi 700×2100', w: 700, h: 2100 }, 'D16': { uz: 'Ikki tabaqali kirish eshigi 1600×2300', w: 1600, h: 2300 }, 'D24': { uz: 'Surma oynali eshik 2400×2300 (terrasa)', w: 2400, h: 2300 } },
  slab: { t: 200 },
  beam: { 'B300x500': { uz: 'To‘sin 300×500', b: 300, h: 500 }, 'B400x600': { uz: 'To‘sin 400×600', b: 400, h: 600 }, 'B250x400': { uz: 'To‘sin 250×400', b: 250, h: 400 } },
};
const thick = t => TYPES.wall[t].layers.reduce((s, l) => s + l.d, 0); // mm
const uValue = t => 1 / (TYPES.wall[t].layers.reduce((s, l) => s + (l.d / 1000) / l.l, 0) + 0.13 + 0.04); // A: R_si 0,13, R_se 0,04
const PREFIX = { balcony: 'Y', seksiya: 'J', lenta: 'E', pixel: 'T', oval: 'V', ring: 'R', bar: 'U', shell: 'Q', form: 'K', dim: 'A', text: 'X', line: 'N', wall: 'W', column: 'C', window: 'O', door: 'D', stair: 'S', zone: 'Z', slab: 'P', hole: 'H', beam: 'B', footing: 'F' };
const LETTERS = 'АБВГДЕЖИКЛМНПРСТУФШЭЮЯ';

function newModel() { return { layers: [], grids: [], cgrids: [], levels: [], base: 0, el: [], roof: null, seq: 1, sections: [], site: null }; }

// ---------- vektor
const V = { add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }), sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }), mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
  dot: (a, b) => a.x * b.x + a.y * b.y, cross: (a, b) => a.x * b.y - a.y * b.x, len: a => Math.hypot(a.x, a.y), unit: a => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; } };
const mm = m => Math.round(+m * 1000);
// to'g'ri chiziqlar kesishmasi (p + t·d)
function lineX(p1, d1, p2, d2) { const c = V.cross(d1, d2); if (Math.abs(c) < 1e-12) return null; const t = V.cross(V.sub(p2, p1), d2) / c; return V.add(p1, V.mul(d1, t)); }

// ---------- o'qlar: cheksiz to'g'ri chiziq {name, fam, p, d}
function gridFamily(M, fam, stepsM) {
  M.grids = M.grids.filter(g => g.fam !== fam);
  let pos = 0; const P = [0]; stepsM.forEach(s => { pos += mm(s); P.push(pos); });
  P.forEach((v, i) => M.grids.push(fam === 'x' ? { name: String(i + 1), fam, p: { x: v, y: 0 }, d: { x: 0, y: 1 } } : { name: LETTERS[i] || ('Y' + i), fam, p: { x: 0, y: v }, d: { x: 1, y: 0 } }));
}
const normName = s => String(s).toUpperCase().replace(/A/g, 'А').replace(/B/g, 'Б').replace(/V/g, 'В').replace(/G/g, 'Г').replace(/D/g, 'Д').replace(/E/g, 'Е');
const gridBy = (M, n) => M.grids.find(g => g.name === n) || M.grids.find(g => g.name === normName(n));
// tugun nomi → ikki o'q: "А1", "1А", "А:1", "Б/1:3"
function nodeGrids(M, ref) {
  ref = String(ref);
  if (ref.includes(':')) { const [a, b] = ref.split(':'); const ga = gridBy(M, a), gb = gridBy(M, b); return ga && gb ? [ga, gb] : null; }
  let best = null;
  M.grids.forEach(a => { [a.name, normName(a.name)].forEach(an => { const R = normName(ref); if (R.startsWith(normName(an)) && R.length > an.length) { const b = gridBy(M, ref.slice(an.length)) || M.grids.find(g => normName(g.name) === R.slice(an.length)); if (b && b !== a && (!best || an.length > best[0].name.length)) best = [a, b]; } }); });
  return best;
}
function node(M, ref) { const g = nodeGrids(M, ref); if (!g) return null; const p = lineX(g[0].p, g[0].d, g[1].p, g[1].d); return p ? { x: Math.round(p.x), y: Math.round(p.y), ref } : null; }

// ---------- nuqta: {ref|null, dx, dy, cx, cy}  (cx,cy — oxirgi hisoblangan joy, bog'lanish uzilsa zaxira)
function parsePt(M, s, prev) {
  s = String(s); let m;
  if ((m = s.match(/^@(-?[\d.]+),(-?[\d.]+)$/))) { if (!prev) throw new Error('@ nisbiy nuqta uchun oldingi nuqta yo‘q'); const b = resolve(M, prev); return { ref: null, dx: b.x + mm(m[1]), dy: b.y + mm(m[2]) }; }
  if ((m = s.match(/^(-?[\d.]+),(-?[\d.]+)$/))) return { ref: null, dx: mm(m[1]), dy: mm(m[2]) };
  const [ref, off] = s.split('+'); const n = node(M, ref); if (!n) throw new Error('Tugun topilmadi: ' + ref);
  let dx = 0, dy = 0; if (off) { const o = off.split(','); dx = mm(o[0]); dy = mm(o[1] || 0); }
  return { ref, dx, dy, cx: n.x + dx, cy: n.y + dy };
}
function resolve(M, p) { if (p.ref) { const n = node(M, p.ref); if (n) { p.cx = n.x + p.dx; p.cy = n.y + p.dy; return { x: p.cx, y: p.cy, ok: true }; } return { x: p.cx, y: p.cy, ok: false }; } return { x: p.dx, y: p.dy, ok: true }; }
const freeAt = (x, y) => ({ ref: null, dx: Math.round(x), dy: Math.round(y) });

// ---------- qavatlar: ro'yxat pastdan yuqoriga; z = base + oldingilar yig'indisi
function levelsReset(M, n, h, first) { M.levels = []; for (let i = 0; i < n; i++) M.levels.push({ id: 'L' + (i + 1), name: (i + 1) + '-qavat', h: mm((i === 0 && first) ? first : h) }); }
function levelZ(M) { let z = M.base; M.levels.forEach(l => { l.z = z; z += l.h; }); }
const newLevelId = M => 'L' + (M.levels.reduce((s, l) => Math.max(s, +l.id.slice(1)), 0) + 1);

// ---------- elementlar
function add(M, e) { e.id = PREFIX[e.cat] + (M.seq++); M.el.push(e); return e; }
const byId = (M, id) => { const e = M.el.find(q => q.id === id); if (!e) throw new Error('Element yo‘q: ' + id); return e; };
function wallAB(M, w) { const a = resolve(M, w.a), b = resolve(M, w.b); return { a, b, ok: a.ok && b.ok }; }
// devor tanasi chap normalga nisbatan [lo, hi]: c — o'rtada, l — chapda, r — o'ngda
function wallSpan(w) { if (w.__b) return [-w.__b / 2, w.__b / 2]; const t = thick(w.type); return w.ref === 'l' ? [0, t] : w.ref === 'r' ? [-t, 0] : [-t / 2, t / 2]; }
// yoy devor: uch nuqtadan aylana, ≤ 8° li to'g'ri bo'laklarga bo'linadi (har bo'lak — shu devorning qismi)
function arcSegs(M, w) { const { a, b, ok } = wallAB(M, w), m = resolve(M, w.arc); const c = circ(a, m, b); if (!c) return [Object.assign({ w }, wallGeom(M, w))];
  const ang = p => Math.atan2(p.y - c.y, p.x - c.x); let a0 = ang(a), a1 = ang(b), am = ang(m); const norm = x => (x % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  let sw = norm(a1 - a0); if (norm(am - a0) > sw) sw = sw - 2 * Math.PI; const len = Math.abs(sw) * c.r, st = 8 * Math.PI / 180;
  // teshiklar: yoy uzunligi bo'yicha s (devor boshidan); har teshik oralig'i — bitta to'g'ri vatar (yassi rom, amaliyotdagidek), qolgan qism ≤ 8° bo'laklar
  const ops = M.el.filter(e => (e.cat === 'window' || e.cat === 'door') && e.host === w.id).map(o => { const T = TYPES[o.cat][o.type]; return T ? { id: o.id, s0: o.s - T.w / 2, s1: o.s + T.w / 2 } : null; }).filter(q => q && q.s0 > 0 && q.s1 < len).sort((x, y) => x.s0 - y.s0);
  const ivs = []; let cur = 0; ops.forEach(q => { if (q.s0 < cur) return; ivs.push([cur, q.s0, null]); ivs.push([q.s0, q.s1, q.id]); cur = q.s1; }); ivs.push([cur, len, null]);
  const at = sl => { const t = a0 + sw * (sl / len); return sl <= 0 ? a : sl >= len ? b : { x: c.x + c.r * Math.cos(t), y: c.y + c.r * Math.sin(t) }; };
  const out = []; let k = 0; ivs.forEach(([u0, u1, oid]) => { if (u1 - u0 < 1) return; const n = oid ? 1 : Math.max(1, Math.ceil((u1 - u0) / c.r / st)); for (let i = 0; i < n; i++) { const g = geomPts(w, at(u0 + (u1 - u0) * i / n), at(u0 + (u1 - u0) * (i + 1) / n)); g.ok = ok; g.arcR = c.r; g.seg = k++; g.s0arc = u0 + (u1 - u0) * i / n; if (oid) g.op = oid; out.push(Object.assign({ w }, g)); } });
  if (out.length < 4 && !ops.length) { /* juda qisqa yoy — kamida 4 bo'lak */ }
  return out; }
function circ(a, b, c) { const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); if (Math.abs(d) < 1e-6) return null; const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d; return { x, y, r: Math.hypot(a.x - x, a.y - y) }; }
function geomPts(w, a, b) { const d = V.sub(b, a), L = V.len(d), u = V.unit(d), n = { x: -u.y, y: u.x }, [lo, hi] = wallSpan(w);
  return { a, b, L, u, n, lo, hi, t: hi - lo, body: [V.add(a, V.mul(n, lo)), V.add(b, V.mul(n, lo)), V.add(b, V.mul(n, hi)), V.add(a, V.mul(n, hi))], ang: Math.atan2(d.y, d.x) * 180 / Math.PI }; }
function wallGeom(M, w) {
  const { a, b, ok } = wallAB(M, w), d = V.sub(b, a), L = V.len(d), u = V.unit(d), n = { x: -u.y, y: u.x }, [lo, hi] = wallSpan(w);
  const body = [V.add(a, V.mul(n, lo)), V.add(b, V.mul(n, lo)), V.add(b, V.mul(n, hi)), V.add(a, V.mul(n, hi))];
  return { a, b, L, u, n, lo, hi, t: hi - lo, body, ok, ang: Math.atan2(d.y, d.x) * 180 / Math.PI };
}
function onSeg(p, a, b, tol = 2) { const d = V.sub(b, a), L = V.len(d); if (L < 1) return false; const t = V.dot(V.sub(p, a), d) / (L * L); if (t < -1e-6 || t > 1 + 1e-6) return false; return Math.abs(V.cross(V.sub(p, a), d)) / L <= tol; }
function addOpening(M, kind, type, a, b, level) {
  if (!TYPES[kind][type]) throw new Error(`${kind === 'window' ? 'Deraza' : 'Eshik'} turi yo‘q: ${type}`);
  // shakl 1: window O15 W12 1.2  (devor ID, boshidan markazgacha m)
  if (/^W\d+$/i.test(a)) { const w = byId(M, a.toUpperCase()); if (w.cat !== 'wall') throw new Error(a + ' devor emas'); return add(M, { cat: kind, type, host: w.id, s: mm(b), level: w.level }); }
  // shakl 3: window O15 x,y L1 — bitta nuqta (teshik markazi): shu qavatdagi eng yaqin devorga (≤ 0,6 m), egri devorda ham (s — yoy bo'ylab)
  if (b == null) { const P = resolve(M, parsePt(M, a)); let best = null; M.el.filter(e => e.cat === 'wall' && e.level === level).forEach(e => { (e.arc ? arcSegs(M, e) : [Object.assign({ w: e, s0arc: 0 }, wallGeom(M, e))]).forEach(g => { const t = Math.max(0, Math.min(g.L, V.dot(V.sub(P, g.a), g.u))), q = V.add(g.a, V.mul(g.u, t)), d = V.len(V.sub(P, q)); if (!best || d < best.d) best = { d, w: e, s: (g.s0arc || 0) + t }; }); });
    if (!best || best.d > 600) throw new Error(`${a} yonida (≤ 0,6 m) ${level} da devor yo‘q`); return add(M, { cat: kind, type, host: best.w.id, s: Math.round(best.s), level }); }
  // shakl 2: window O15 А1 А2 L1 — ikki nuqta orasining o'rtasi, shu nuqtalardan o'tadigan devorga
  const A = resolve(M, parsePt(M, a)), B = resolve(M, parsePt(M, b));
  const w = M.el.find(e => e.cat === 'wall' && e.level === level && (() => { const g = wallGeom(M, e); return onSeg(A, g.a, g.b) && onSeg(B, g.a, g.b); })());
  if (!w) throw new Error(`${a}–${b} oralig‘ida ${level} da devor yo‘q`);
  const g = wallGeom(M, w), mid = V.mul(V.add(A, B), .5);
  return add(M, { cat: kind, type, host: w.id, s: Math.round(V.dot(V.sub(mid, g.a), g.u)), level });
}
function copyLevel(M, from, to) {
  const idMap = {};
  M.el.filter(e => e.level === from && !e.host).forEach(e => { const c = JSON.parse(JSON.stringify(e)); c.level = to; delete c.id; idMap[e.id] = add(M, c).id; });
  M.el.filter(e => e.level === from && e.host && idMap[e.host]).forEach(e => { const c = JSON.parse(JSON.stringify(e)); c.level = to; c.host = idMap[e.host]; delete c.id; add(M, c); });
}
// qulf: qulflangan element (yoki uning xosti) surilmaydi, burilmaydi, o'zgartirilmaydi, o'chirilmaydi — avval unlock
// qatlamlar (Archicad kabi): har element qatlamda (e.layer yoki toifa bo'yicha sukut); qatlam yashirin — ko'rinishlarda chizilmaydi, qulf — tahrir qilinmaydi
const LAYER_DEF = { balcony: 'Plitalar', line: 'Chiziqlar', wall: 'Devorlar', column: 'Konstruksiya', beam: 'Konstruksiya', footing: 'Konstruksiya', slab: 'Plitalar', hole: 'Plitalar', window: 'Teshiklar', door: 'Teshiklar', stair: 'Zinalar', zone: 'Zonalar', dim: 'O‘lchamlar', text: 'Matn' };
const layerOf = e => e.layer || LAYER_DEF[e.cat] || 'Massa';
function layerList(M) { const L = (M.layers || []).slice(), has = n => L.some(q => q.name === n); M.el.forEach(e => { const n = layerOf(e); if (!has(n)) L.push({ name: n }); }); return L; }
const layerLocked = (M, e) => !!(M.layers || []).find(q => q.name === layerOf(e) && q.lock);
function chkLock(M, id) { const e0 = byId(M, String(id).split('.')[0]); if (layerLocked(M, e0)) throw new Error(`Qatlam qulflangan: «${layerOf(e0)}» (${e0.id})`); const e = e0; const h = e.host && M.el.find(q => q.id === e.host); if (e.lock || (h && h.lock)) throw new Error('Qulflangan: ' + (e.lock ? e.id : h.id) + ' (avval unlock ' + (e.lock ? e.id : h.id) + ')'); return e; }
function del(M, id) { chkLock(M, id); M.el = M.el.filter(q => q.id !== id && q.host !== id); }
// elementning nuqtalari (move/rotate/mirror uchun)
function ptsOf(e) { if (e.cat === 'form' || e.cat === 'shell' || e.cat === 'bar' || e.cat === 'ring' || e.cat === 'oval' || (typeof MODS !== 'undefined' && MODS[e.cat])) return [['at', e.at]]; if (e.pts) return e.pts.map((p, i) => [i, p, e.pts]); if (e.cat === 'wall' && e.arc) return [['a', e.a], ['b', e.b], ['arc', e.arc]]; return (e.cat === 'wall' || e.cat === 'beam' || e.cat === 'dim') ? [['a', e.a], ['b', e.b]] : e.cat === 'stair' ? [['p', e.p], ['q', e.q]] : (e.cat === 'column' || e.cat === 'zone' || e.cat === 'footing' || e.cat === 'text') ? [['p', e.p]] : []; }
function moveEl(M, id, dx, dy) {
  const [eid, part] = id.split('.'); const e = byId(M, eid);
  if (e.host) { const g = wallGeom(M, byId(M, e.host)); e.s += Math.round(dx * g.u.x + dy * g.u.y); return; }
  ptsOf(e).filter(([k]) => !part || String(k).toLowerCase() === String(part).toLowerCase()).forEach(([, p]) => { p.dx += dx; p.dy += dy; if (p.cx != null) { p.cx += dx; p.cy += dy; } });
  if (!part) M.el.filter(h => h.cat === 'hole' && h.host === e.id).forEach(h => h.pts.forEach(p => { p.dx += dx; p.dy += dy; if (p.cx != null) { p.cx += dx; p.cy += dy; } }));
}
// chiziqlar: element yoki o'q → {p, d}; ikki chiziq kesishmasi; devor/to'sin uchini yangi nuqtaga qo'yish (teshiklar devorda joyida qoladi)
function lineOf(M, ref) { const g = gridBy(M, ref); if (g) return { p: g.p, d: g.d }; const e = byId(M, String(ref).toUpperCase()); if ((e.cat !== 'wall' && e.cat !== 'beam' && e.cat !== 'dim') || e.arc) throw new Error(ref + ': chiziq emas (devor, to‘sin yoki o‘q kerak)'); const a = resolve(M, e.a), b = resolve(M, e.b); return { p: a, d: V.sub(b, a) }; }
function lineX(p, d, q, e) { const c = d.x * e.y - d.y * e.x; if (Math.abs(c) < 1e-9 * V.len(d) * V.len(e)) return null; const t = ((q.x - p.x) * e.y - (q.y - p.y) * e.x) / c; return { x: p.x + d.x * t, y: p.y + d.y * t }; }
function setEnd(M, e, part, P) { const a = resolve(M, e.a), b = resolve(M, e.b), u = V.unit(V.sub(b, a)); if (part === 'a') { const sh = V.dot(V.sub(a, P), u); M.el.filter(h => h.host === e.id).forEach(h => { h.s += sh; }); e.a = freeAt(P.x, P.y); } else e.b = freeAt(P.x, P.y);
  const a2 = resolve(M, e.a), b2 = resolve(M, e.b), L2 = V.len(V.sub(b2, a2)); if (L2 < 10) throw new Error(e.id + ': uzunligi 0 bo‘lib qoladi'); if (V.dot(V.sub(b2, a2), u) < 0) throw new Error(e.id + ': yo‘nalishi teskari bo‘lib qoladi');
  M.el.filter(h => h.host === e.id && (h.s < 0 || h.s > L2)).forEach(h => del(M, h.id)); }
// burish / ko'zgu: nuqtalar erkin bo'lib qoladi (o'qdan uziladi)
function xformEl(M, id, f) {
  const e = byId(M, id); if (e.host) return;
  ptsOf(e).forEach(([k, p, arr]) => { const r = resolve(M, p), q = f(r); if (arr) arr[k] = freeAt(q.x, q.y); else e[k] = freeAt(q.x, q.y); });
  if (e.cat === 'column' || e.cat === 'form' || e.cat === 'shell' || e.cat === 'bar' || e.cat === 'ring' || e.cat === 'oval' || MODS[e.cat]) e.rot = ((e.rot || 0) + (f.rot || 0)) % 360;
}
const LV_RE = /^(l\d+|all)$/i;

// ---------- buyruq tili
// v1: grid x 3.6 3.3 | grid y 6 1.8 | levels 5 3.0 [first 3.3] | wall T400 А1 А7 [L1|all] | column [C400] А1 | window O15 А1 А2 | door D10 Б3 Б4
//     stair 3 4 А Б | zone 3.2 4.5 Nomi | copy L1 all | roof flat|gable 30 | delete W5
// v2: nuqta = А1 | А1+0.5,0 | 3.6,6 | @1.2,0 (oldingi nuqtadan)
//     wall T400 0,0 12,0 [ref=l|c|r] [h=2.4] L1 | wall T400 0,0 @6,0 @0,4 ... (zanjir) | column C400 3.2,4.5 [rot=30]
//     window O15 W12 1.2 (devor, boshidan m) | stair P1 P2 L1 | zone P Nomi L1
//     grid add N P burchak | grid move N dx,dy | grid del N | grid name N YANGI
//     level add [h] | level below [h] | level h L2 3.3 | level name L1 Yerto‘la | level del L3 | base -3.0
//     move ID[,ID..] dx,dy | move W3.b dx,dy | dup ID[,..] dx,dy [L2] | rotate ID[,..] cx,cy burchak | mirror ID[,..] P1 P2
//     set ID kalit=qiymat (type, ref, h, s, rot, name) | unbind ID | delete ID[,..]
//     dup ID dx,dy n=6 (massiv) | extend ID[.a|.b][,ID] MAQSAD | join ID1 ID2 | trim ID x,y | lock / unlock ID[,..]
function run(M, text) {
  const out = [];
  text.split('\n').map(s => s.replace(/#.*/, '').trim()).filter(Boolean).flatMap(s => s.split(';')).map(s => s.trim()).filter(Boolean).forEach(line => {
    let t = line.split(/\s+/); const c = t[0].toLowerCase();
    const kv = {}; t = t.filter(w => { const m = w.match(/^([a-z][a-z0-9]*)=(.+)$/i); if (m && !/^[\d.,@-]/.test(w)) { kv[m[1].toLowerCase()] = m[2]; return false; } return true; });
    const lv = () => { const last = t[t.length - 1]; if (/^l\d+$/i.test(last)) return [last.toUpperCase()]; if (last === 'all') return M.levels.map(l => l.id); return [M.levels[0] ? M.levels[0].id : 'L1']; };
    const args = () => t.slice(1).filter(w => !LV_RE.test(w));
    const ids = s => s.split(',').map(x => x.toUpperCase());
    const needLv = l => { if (!M.levels.find(q => q.id === l)) throw new Error('Qavat yo‘q: ' + l); return l; };
    const vec = s => { const v = s.split(','); return [mm(v[0]), mm(v[1] || 0)]; };
    const seq0 = M.seq, lay = kv.layer ? kv.layer.replace(/_/g, ' ') : null; if (c !== 'set' && c !== 'layer') delete kv.layer;
    try {
      if (c === 'layer') { // layer add|hide|show|lock|unlock|del NOMI
        const sub = (t[1] || '').toLowerCase(), nm = t.slice(2).join(' ').replace(/_/g, ' '); if (!nm) throw new Error('layer add|hide|show|lock|unlock|del NOMI'); M.layers = M.layers || []; let q = M.layers.find(x => x.name === nm); if (!q && sub !== 'del') { q = { name: nm }; M.layers.push(q); }
        if (sub === 'hide') q.hide = 1; else if (sub === 'show') delete q.hide; else if (sub === 'lock') q.lock = 1; else if (sub === 'unlock') delete q.lock; else if (sub === 'del') { if (M.el.some(e => layerOf(e) === nm)) throw new Error('Qatlamda elementlar bor: ' + nm); M.layers = M.layers.filter(x => x.name !== nm); } else if (sub !== 'add') throw new Error('layer add|hide|show|lock|unlock|del NOMI'); }
      else if (c === 'grid') {
        const sub = t[1].toLowerCase();
        if (sub === 'x' || sub === 'y') gridFamily(M, sub, t.slice(2).map(Number));
        else if (sub === 'add') { if (gridBy(M, t[2])) throw new Error('Bu nomli o‘q bor: ' + t[2]); const p = resolve(M, parsePt(M, t[3])), a = (+(t[4] || 90)) * Math.PI / 180; M.grids.push({ name: t[2], fam: 'free', p: { x: p.x, y: p.y }, d: { x: +Math.cos(a).toFixed(12), y: +Math.sin(a).toFixed(12) } }); }
        // radial o'qlar: grid polar R cx,cy n=12 step=30 [a0=0] — markazdan chiquvchi nurlar R1…Rn (burchak reja koordinatalarida, x dan y ga); aylana o'q: grid circ K1 cx,cy r
        else if (sub === 'polar') { const pre = t[2], C = resolve(M, parsePt(M, t[3])), n = Math.round(+(kv.n || 12)), st = +(kv.step || 360 / n), a0 = +(kv.a0 || 0); if (!(n >= 1 && n <= 72)) throw new Error('n = 1…72'); if (!/^[A-Za-z]\w{0,5}$/.test(pre)) throw new Error('Radial o‘qlar prefiksi lotincha: R, S…');
          for (let i = 0; i < n; i++) { const nm = pre + (i + 1); if (gridBy(M, nm)) throw new Error('Bu nomli o‘q bor: ' + nm); const a = (a0 + st * i) * Math.PI / 180; M.grids.push({ name: nm, fam: 'free', ray: 1, p: { x: C.x, y: C.y }, d: { x: +Math.cos(a).toFixed(12), y: +Math.sin(a).toFixed(12) } }); } }
        else if (sub === 'circ') { const nm = t[2]; if (gridBy(M, nm) || (M.cgrids || []).some(q => q.name === nm)) throw new Error('Bu nomli o‘q bor: ' + nm); const C = resolve(M, parsePt(M, t[3])), r = mm(t[4]); if (!(r > 100)) throw new Error('Radius > 0,1 m'); (M.cgrids = M.cgrids || []).push({ name: nm, c: { x: C.x, y: C.y }, r }); }
        else if ((sub === 'move' || sub === 'del') && (M.cgrids || []).some(q => q.name === t[2])) { const k = M.cgrids.findIndex(q => q.name === t[2]); if (sub === 'del') M.cgrids.splice(k, 1); else { const [dx, dy] = vec(t[3]); const q = M.cgrids[k]; q.c = { x: q.c.x + dx, y: q.c.y + dy }; } }
        else if (sub === 'move') { const g = gridBy(M, t[2]); if (!g) throw new Error('O‘q yo‘q: ' + t[2]); const [dx, dy] = vec(t[3]); g.p = { x: g.p.x + dx, y: g.p.y + dy }; }
        else if (sub === 'del') { const g = gridBy(M, t[2]); if (!g) throw new Error('O‘q yo‘q: ' + t[2]); M.grids = M.grids.filter(q => q !== g); }
        else if (sub === 'name') { const g = gridBy(M, t[2]); if (!g) throw new Error('O‘q yo‘q: ' + t[2]); if (gridBy(M, t[3])) throw new Error('Bu nomli o‘q bor: ' + t[3]); M.el.forEach(e => ptsOf(e).forEach(([, p]) => { if (p.ref) { const gs = nodeGrids(M, p.ref); if (gs && gs.includes(g)) p.ref = gs.map(q => q === g ? t[3] : q.name).join(':'); } })); g.name = t[3]; }
        else throw new Error('grid: x | y | add | polar | circ | move | del | name');
      }
      else if (c === 'levels') { const fi = t.indexOf('first'); levelsReset(M, +t[1], +t[2], fi > 0 ? +t[fi + 1] : null); }
      else if (c === 'base') M.base = mm(t[1]);
      else if (c === 'konsol') { const v = +t[1]; if (!(v >= 0 && v <= 12)) throw new Error('konsol M — ruxsat etilgan konsol chiqishi, metr (0–12)'); M.cMax = v * 1000; }
      else if (c === 'project') M.name = t.slice(1).join(' ').replace(/_/g, ' ');
      else if (c === 'site') { // site lat=41.3111 lon=69.2797 [elev=455] [addr=Ko‘cha_1] [town=Toshkent] [region=…] [country=O‘zbekiston] [epsg=32642] [e= n=] [rot=0]
        const S = M.site = Object.assign({}, M.site || {}); ['lat', 'lon', 'elev', 'epsg', 'e', 'n', 'rot'].forEach(k => { if (kv[k] != null) { if (!isFinite(+kv[k])) throw new Error(k + ' son bo‘lishi kerak'); S[k] = +kv[k]; } }); ['addr', 'town', 'region', 'country'].forEach(k => { if (kv[k] != null) S[k] = kv[k].replace(/_/g, ' '); });
        if (S.lat != null && (Math.abs(S.lat) > 90 || Math.abs(S.lon) > 180)) throw new Error('lat ≤ 90, lon ≤ 180'); if (S.lat != null && S.lon == null) throw new Error('site: lat va lon birga'); }
      else if (c === 'level') {
        const sub = t[1].toLowerCase();
        if (sub === 'add') { const top = M.levels[M.levels.length - 1]; const id = newLevelId(M); M.levels.push({ id, name: (M.levels.length + 1) + '-qavat', h: t[2] ? mm(t[2]) : (top ? top.h : 3000) }); }
        else if (sub === 'below') { const h = t[2] ? mm(t[2]) : 3000; M.levels.unshift({ id: newLevelId(M), name: 'Yerto‘la', h }); M.base -= h; }
        else if (sub === 'h') { const L = M.levels.find(l => l.id === needLv(t[2].toUpperCase())); L.h = mm(t[3]); }
        else if (sub === 'name') { const L = M.levels.find(l => l.id === needLv(t[2].toUpperCase())); L.name = t.slice(3).join(' '); }
        else if (sub === 'del') { const id = needLv(t[2].toUpperCase()); const i = M.levels.findIndex(l => l.id === id); if (i === 0) M.base += M.levels[0].h; M.levels.splice(i, 1); M.el = M.el.filter(e => e.level !== id); }
        else throw new Error('level: add | below | h | name | del');
      }
      else if (c === 'wall') {
        const type = t[1]; if (!TYPES.wall[type]) throw new Error('Devor turi yo‘q: ' + type);
        const P = args().slice(1); if (P.length < 2) throw new Error('Devorga kamida 2 nuqta kerak');
        const ref = (kv.ref || 'c').toLowerCase(); if (!/^[lcr]$/.test(ref)) throw new Error('ref = l | c | r');
        lv().forEach(l => { needLv(l); let prev = null; const pts = P.map(s => (prev = parsePt(M, s, prev))); for (let i = 0; i + 1 < pts.length; i++) { const a = resolve(M, pts[i]), b = resolve(M, pts[i + 1]); if (V.len(V.sub(b, a)) < 10) throw new Error('Devor uzunligi 0'); const e = { cat: 'wall', type, a: JSON.parse(JSON.stringify(pts[i])), b: JSON.parse(JSON.stringify(pts[i + 1])), ref, h: kv.h ? mm(kv.h) : null, level: l }; if (kv.arc) { if (pts.length !== 2) throw new Error('Yoy devor: faqat 2 nuqta + arc=O‘RTA_NUQTA'); e.arc = parsePt(M, kv.arc); const m = resolve(M, e.arc); if (Math.abs(V.cross(V.sub(m, a), V.sub(b, a))) < 1e3) throw new Error('Yoy: o‘rta nuqta to‘g‘ri chiziqda yotibdi'); } add(M, e); } });
      }
      else if (c === 'balcony') { const a = args(), W0 = kv.w != null ? mm(kv.w) : BAL.w, D0 = kv.d != null ? mm(kv.d) : BAL.d, rail = (kv.rail || 'glass').toLowerCase(); if (!/^(glass|bar)$/.test(rail)) throw new Error('rail = glass | bar'); if (!(W0 >= 600 && D0 >= 400 && D0 <= 3000)) throw new Error('Balkon: eni ≥ 0,6 m, chiqishi 0,4–3 m');
        if (/^W\d+$/i.test(a[0])) { const w = byId(M, a[0].toUpperCase()); if (w.cat !== 'wall') throw new Error(a[0] + ' devor emas'); add(M, { cat: 'balcony', host: w.id, s: mm(a[1]), w: W0, d: D0, rail, h: kv.h != null ? mm(kv.h) : undefined, level: w.level }); }
        else lv().forEach(l => { needLv(l); const P = resolve(M, parsePt(M, a[0])); let best = null; M.el.filter(e => e.cat === 'wall' && e.level === l && !e.arc).forEach(e => { const g = wallGeom(M, e), t = Math.max(0, Math.min(g.L, V.dot(V.sub(P, g.a), g.u))), q = V.add(g.a, V.mul(g.u, t)), d = V.len(V.sub(P, q)); if (!best || d < best.d) best = { d, w: e, s: t }; }); if (!best || best.d > 800) throw new Error('Balkon: yonida (≤ 0,8 m) devor yo‘q'); add(M, { cat: 'balcony', host: best.w.id, s: Math.round(best.s), w: W0, d: D0, rail, level: l }); }); }
      else if (c === 'column') { let a = args(); let type = 'C400'; if (TYPES.column[a[0]]) { type = a[0]; a = a.slice(1); } lv().forEach(l => { needLv(l); add(M, { cat: 'column', type, p: parsePt(M, a[0]), rot: +(kv.rot || 0), level: l }); }); }
      else if (c === 'window' || c === 'door') { const a = args(); if (/^W\d+$/i.test(a[1])) addOpening(M, c, a[0], a[1], a[2]); else lv().forEach(l => addOpening(M, c, a[0], a[1], a[2], needLv(l))); }
      else if (c === 'stair') {
        const a = args(); let p, q;
        if (a.length === 4) { p = parsePt(M, normName(a[2]) + a[0]); q = parsePt(M, normName(a[3]) + a[1]); } // v1: stair 3 4 А Б
        else { p = parsePt(M, a[0]); q = parsePt(M, a[1], p); }
        const sk = (kv.type || 'u').toLowerCase(); if (!/^[uil]$/.test(sk)) throw new Error('zina turi: type=u (ikki marshli) | i (to‘g‘ri) | l (burchakli)');
        lv().forEach(l => { needLv(l); add(M, { cat: 'stair', p: JSON.parse(JSON.stringify(p)), q: JSON.parse(JSON.stringify(q)), level: l, kind: sk, w: kv.w ? mm(kv.w) : null, rail: kv.rail != null ? +kv.rail : 1, flip: +(kv.flip || 0), rev: +(kv.rev || 0) }); });
      }
      else if (c === 'zone') {
        const a = args(); let p, rest;
        if (/^-?[\d.]+$/.test(a[0]) && /^-?[\d.]+$/.test(a[1] || '')) { p = freeAt(mm(a[0]), mm(a[1])); rest = a.slice(2); } else { p = parsePt(M, a[0]); rest = a.slice(1); } // v1: zone 3.2 4.5 Nomi
        lv().forEach(l => { needLv(l); add(M, { cat: 'zone', p: JSON.parse(JSON.stringify(p)), name: rest.join(' ').replace(/_/g, ' '), level: l }); });
      }
      else if (c === 'copy') { const from = needLv(t[1].toUpperCase()); const tos = t[2] === 'all' ? M.levels.map(l => l.id).filter(id => id !== from) : [needLv(t[2].toUpperCase())]; tos.forEach(to => copyLevel(M, from, to)); }
      else if (c === 'roof') { if (!/^(flat|gable|hip)$/.test(t[1])) throw new Error('roof flat | gable 30 | hip 30'); M.roof = { type: t[1], slope: +(t[2] || (t[1] === 'flat' ? 0 : 30)), over: kv.over != null ? mm(kv.over) : (t[1] === 'flat' ? 0 : 500) }; }
      else if (c === 'slab' || c === 'hole') { // slab P1 P2 P3 ... [t=0.2] L1 | hole PLITA_ID P1 P2 P3 ...
        const a = args(); let host = null, P = a; if (c === 'hole') { host = byId(M, a[0].toUpperCase()); if (host.cat !== 'slab') throw new Error(a[0] + ' plita emas'); P = a.slice(1); }
        if (P.length < 3) throw new Error('Kamida 3 nuqta kerak'); const mk = l => { let prev = null; const pts = P.map(x => (prev = parsePt(M, x, prev))); if (Math.abs(polyArea(pts.map(p => resolve(M, p)))) < 1e4) throw new Error('Kontur maydoni 0'); return pts; };
        if (c === 'hole') add(M, { cat: 'hole', host: host.id, pts: mk(), level: host.level }); else lv().forEach(l => { needLv(l); add(M, { cat: 'slab', pts: mk(), t: kv.t ? mm(kv.t) : TYPES.slab.t, level: l }); }); }
      else if (c === 'beam') { const a = args(); const type = TYPES.beam[a[0]] ? a[0] : 'B300x500'; const P = TYPES.beam[a[0]] ? a.slice(1) : a; if (P.length < 2) throw new Error('To‘singa 2 nuqta kerak'); lv().forEach(l => { needLv(l); const p = parsePt(M, P[0]), q = parsePt(M, P[1], p); add(M, { cat: 'beam', type, a: p, b: q, level: l }); }); }
      else if (c === 'foundation') { if (t[1] === 'none') M.found = null; else if (t[1] === 'strip') M.found = { type: 'strip', w: mm(kv.w || 0.6), d: mm(kv.d || 1.5) }; else throw new Error('foundation strip [w=0.6 d=1.5] | none'); }
      else if (c === 'footing') { const a = args(); if (!M.levels.length) throw new Error('Avval qavat kerak'); add(M, { cat: 'footing', p: parsePt(M, a[0]), b: mm(kv.b || 1.5), l: mm(kv.l || kv.b || 1.5), d: mm(kv.d || 1.5), level: M.levels[0].id }); }
      else if (c === 'dim') { const a = args(); const p = parsePt(M, a[0]), q = parsePt(M, a[1], p); lv().forEach(l => { needLv(l); add(M, { cat: 'dim', a: JSON.parse(JSON.stringify(p)), b: JSON.parse(JSON.stringify(q)), off: mm(kv.off || 0.8), level: l }); }); }
      else if (c === 'line') { // line P1 P2 [P3…] [style=solid|dash|dot|dashdot] [w=0.25] L1 — 2D chiziq (hujjat elementi)
        const a = args(); if (a.length < 2) throw new Error('Chiziqqa kamida 2 nuqta'); const st = (kv.style || 'solid').toLowerCase(); if (!/^(solid|dash|dot|dashdot)$/.test(st)) throw new Error('style = solid | dash | dot | dashdot'); lv().forEach(l => { needLv(l); let prev = null; add(M, { cat: 'line', pts: a.map(x => (prev = parsePt(M, x, prev))), style: st, w: +(kv.w || 0.25), level: l }); }); }
      else if (c === 'text') { const a = args(); const p = parsePt(M, a[0]); const str = a.slice(1).join(' ').replace(/_/g, ' '); if (!str) throw new Error('Matn bo‘sh'); lv().forEach(l => { needLv(l); add(M, { cat: 'text', p: JSON.parse(JSON.stringify(p)), s: str, level: l }); }); }
      else if (c === 'walltype') { // walltype T300 bearing|partition Material:mm:lambda ... [uz=Nomi]
        const name = t[1], kind = (t[2] || '').toLowerCase(); if (!/^[A-Za-z][\w-]{0,15}$/.test(name)) throw new Error('Tur nomi lotincha: T300, G250…'); if (!/^(bearing|partition)$/.test(kind)) throw new Error('walltype NOMI bearing|partition Qatlam:mm:λ …');
        const layers = t.slice(3).map(x => { const m = x.split(':'); if (m.length !== 3 || !(+m[1] > 0) || !(+m[2] > 0)) throw new Error('Qatlam: Material:qalinlik_mm:λ — ' + x); return { m: m[0].replace(/_/g, ' '), d: +m[1], l: +m[2] }; }); if (!layers.length) throw new Error('Kamida bitta qatlam');
        TYPES.wall[name] = { uz: (kv.uz || '').replace(/_/g, ' ') || `${name}: ` + layers.map(q => q.m + ' ' + q.d).join(' + '), bearing: kind === 'bearing', layers, custom: true }; }
      else if (c === 'wintype' || c === 'doortype') { // wintype O12 1200 1500 [sill=0.85] | doortype D09 900 2100
        const name = t[1], w = +t[2], h = +t[3]; if (!/^[A-Za-z][\w-]{0,15}$/.test(name) || !(w >= 300 && w <= 6000) || !(h >= 300 && h <= 4000)) throw new Error(c + ' NOMI eni_mm balandligi_mm');
        if (c === 'wintype') TYPES.window[name] = { uz: `Deraza ${w}×${h}`, w, h, sill: kv.sill ? mm(kv.sill) : 850, custom: true }; else TYPES.door[name] = { uz: `Eshik ${w}×${h}`, w, h, custom: true }; }
      else if (c === 'bar') { // bar P [rot=°] [kalit=qiymat …] — qatlamli turar-joy bloki (BAR_DEF)
        const a = args(); const p = {}; Object.entries(kv).forEach(([k0, v]) => { if (k0 === 'rot') return; const k = barKey(k0); if (!(k in BAR_DEF)) throw new Error('Uy parametri yo‘q: ' + k0 + ' (bor: ' + Object.keys(BAR_DEF).join(', ') + ')'); if (!isFinite(+v)) throw new Error(k + ' son bo‘lishi kerak'); p[k] = +v; });
        if ((p.nHi || BAR_DEF.nHi) > 60) throw new Error('nHi ≤ 60'); add(M, { cat: 'bar', at: parsePt(M, a[0] || '0,0'), rot: +(kv.rot != null ? kv.rot : 90), p }); }
      else if (MODS[c]) { // lenta / pixel P [rot=°] [kalit=qiymat …] — umumiy modullar (MODS)
        const D = MODS[c].def, a = args(); const p = {}; Object.entries(kv).forEach(([k0, v]) => { if (k0 === 'rot') return; const k = modKey(c, k0); if (!(k in D)) throw new Error(MODS[c].title + ' parametri yo‘q: ' + k0 + ' (bor: ' + Object.keys(D).join(', ') + ')'); if (!isFinite(+v)) throw new Error(k + ' son bo‘lishi kerak'); p[k] = +v; });
        add(M, { cat: c, at: parsePt(M, a[0] || '0,0'), rot: +(kv.rot || 0), p }); }
      else if (c === 'oval') { // oval P [rot=°] [kalit=qiymat …] — oval zal: «yostiq» hajm, uchburchakli to'r fasad, kirish arkasi (OVAL_DEF)
        const a = args(); const p = {}; Object.entries(kv).forEach(([k0, v]) => { if (k0 === 'rot') return; const k = ovalKey(k0); if (!(k in OVAL_DEF)) throw new Error('Oval parametri yo‘q: ' + k0 + ' (bor: ' + Object.keys(OVAL_DEF).join(', ') + ')'); if (!isFinite(+v)) throw new Error(k + ' son bo‘lishi kerak'); p[k] = +v; });
        add(M, { cat: 'oval', at: parsePt(M, a[0] || '0,0'), rot: +(kv.rot || 0), p }); }
      else if (c === 'stadium' || c === 'ring') { // stadium P [rot=°] [kalit=qiymat …] — stadion: maydon, tribuna, donut-tom (RING_DEF)
        const a = args(); const p = {}; Object.entries(kv).forEach(([k0, v]) => { if (k0 === 'rot') return; const k = ringKey(k0); if (!(k in RING_DEF)) throw new Error('Stadion parametri yo‘q: ' + k0 + ' (bor: ' + Object.keys(RING_DEF).join(', ') + ')'); if (!isFinite(+v)) throw new Error(k + ' son bo‘lishi kerak'); p[k] = +v; });
        if ((p.n || RING_DEF.n) > 160 || (p.nv || RING_DEF.nv) > 400) throw new Error('n ≤ 160, nv ≤ 400'); add(M, { cat: 'ring', at: parsePt(M, a[0] || '0,0'), rot: +(kv.rot || 0), p }); }
      else if (c === 'shell') { // shell P [rot=°] [kalit=qiymat …] — parametrik qobiq (SHELL_DEF)
        const a = args(); const p = {}; Object.entries(kv).forEach(([k0, v]) => { if (k0 === 'rot') return; const k = shellKey(k0); if (SHELL_LEGACY[k]) return; if (!(k in SHELL_DEF)) throw new Error('Qobiq parametri yo‘q: ' + k + ' (bor: ' + Object.keys(SHELL_DEF).join(', ') + ')'); if (!isFinite(+v)) throw new Error(k + ' son bo‘lishi kerak'); p[k] = +v; });
        if ((p.nu || SHELL_DEF.nu) > 400 || (p.nv || SHELL_DEF.nv) > 160) throw new Error('nu ≤ 400, nv ≤ 160'); add(M, { cat: 'shell', at: parsePt(M, a[0] || '0,0'), rot: +(kv.rot || 0), p }); }
      else if (c === 'form') { // form P [rot=°] [kalit=qiymat …] — qavatma-qavat kontur shakli (parametrlar: FORM_DEF)
        const a = args(); const p = {}; Object.entries(kv).forEach(([k, v]) => { if (k === 'rot') return; if (!(k in FORM_DEF)) throw new Error('Shakl parametri yo‘q: ' + k + ' (bor: ' + Object.keys(FORM_DEF).join(', ') + ')'); if (!isFinite(+v)) throw new Error(k + ' son bo‘lishi kerak'); p[k] = +v; });
        if ((p.n1 || FORM_DEF.n1) > 200 || (p.n2 || FORM_DEF.n2) > 200) throw new Error('Qavatlar ≤ 200'); add(M, { cat: 'form', at: parsePt(M, a[0] || '0,0'), rot: +(kv.rot || 0), p }); }
      else if (c === 'section') { // section 1 P1 P2 — kesim chizig'i; qarash yo'nalishi chizilgan yo'nalishning o'ng tomoniga | section del 1
        if (t[1] === 'del') { const i = M.sections.findIndex(q => q.name === t[2]); if (i < 0) throw new Error('Kesim yo‘q: ' + t[2]); M.sections.splice(i, 1); }
        else { if (M.sections.some(q => q.name === t[1])) throw new Error('Bu nomli kesim bor: ' + t[1]); const p = parsePt(M, t[2]), q = parsePt(M, t[3], p); M.sections.push({ name: t[1], p, q }); } }
      else if (c === 'delete') { ids(t[1]).forEach(id => chkLock(M, id)); ids(t[1]).forEach(id => del(M, id)); }
      else if (c === 'lock' || c === 'unlock') ids(t[1]).forEach(id => { const e = byId(M, id); if (c === 'lock') e.lock = 1; else delete e.lock; });
      else if (c === 'move') { const [dx, dy] = vec(t[2]); ids(t[1]).forEach(id => chkLock(M, id)); ids(t[1]).forEach(id => moveEl(M, id, dx, dy)); }
      else if (c === 'dup') { const [dx0, dy0] = vec(t[2]); const toL = t[3] ? needLv(t[3].toUpperCase()) : null; const nRep = kv.n != null ? Math.round(+kv.n) : 1; if (!(nRep >= 1 && nRep <= 200)) throw new Error('n = 1…200 (nusxalar soni)');
        for (let k = 1; k <= nRep; k++) { const dx = dx0 * k, dy = dy0 * k, map = {}; ids(t[1]).map(id => byId(M, id)).sort((a, b) => !!a.host - !!b.host).forEach(e => { const cl = JSON.parse(JSON.stringify(e)); delete cl.id; delete cl.lock; if (toL) cl.level = toL; if (cl.host) { if (map[cl.host]) cl.host = map[cl.host]; else if (toL) return; else cl.s += 0; }
          const n = add(M, cl); map[e.id] = n.id; if (!n.host) moveEl(M, n.id, dx, dy); else if (!map[e.host]) moveEl(M, n.id, dx, dy); }); } }
      else if (c === 'extend') { // extend ID[.a|.b][,ID…] MAQSAD — uchini maqsad (devor/to'sin/o'q) chizig'igacha cho'zish yoki qisqartirish
        const T0 = lineOf(M, t[2]); ids(t[1]).forEach(id => { const [eid, part] = id.split('.'); const e = chkLock(M, eid); if (e.cat !== 'wall' && e.cat !== 'beam') throw new Error(eid + ': faqat devor yoki to‘sin'); if (e.arc) throw new Error(eid + ': yoy devor cho‘zilmaydi');
          const a = resolve(M, e.a), b = resolve(M, e.b), X = lineX(a, V.sub(b, a), T0.p, T0.d); if (!X) throw new Error(eid + ' va ' + t[2] + ' parallel'); const pt = part ? part.toLowerCase() : (V.len(V.sub(X, a)) < V.len(V.sub(X, b)) ? 'a' : 'b'); setEnd(M, e, pt, X); }); }
      else if (c === 'join') { // join ID1 ID2 — ikki devor/to'sinni burchakka keltirish (ikkalasi kesishmagacha cho'ziladi yoki qisqaradi)
        const [i1, i2] = ids(t[1]).concat(t[2] ? ids(t[2]) : []); if (!i1 || !i2) throw new Error('join ID1 ID2'); const e1 = chkLock(M, i1), e2 = chkLock(M, i2); [e1, e2].forEach(e => { if ((e.cat !== 'wall' && e.cat !== 'beam') || e.arc) throw new Error(e.id + ': faqat to‘g‘ri devor yoki to‘sin'); });
        const L1 = lineOf(M, i1), L2 = lineOf(M, i2), X = lineX(L1.p, L1.d, L2.p, L2.d); if (!X) throw new Error('Parallel — kesishmaydi');
        [[e1, L1], [e2, L2]].forEach(([e, Ln]) => { const a = resolve(M, e.a), b = resolve(M, e.b); setEnd(M, e, V.len(V.sub(X, a)) < V.len(V.sub(X, b)) ? 'a' : 'b', X); }); }
      else if (c === 'trim') { // trim ID x,y — bosilgan joydagi bo'lakni boshqa devorlar (to'sin uchun — devor va to'sinlar) kesishmalari orasidan olib tashlash
        const e = chkLock(M, t[1].toUpperCase()); if ((e.cat !== 'wall' && e.cat !== 'beam') || e.arc) throw new Error(e.id + ': faqat to‘g‘ri devor yoki to‘sin'); const P = resolve(M, parsePt(M, t[2])), a = resolve(M, e.a), b = resolve(M, e.b), d = V.sub(b, a), Lw = V.len(d), u = V.unit(d);
        const ts = []; M.el.filter(q => q !== e && q.level === e.level && (q.cat === 'wall' || (e.cat === 'beam' && q.cat === 'beam')) && !q.arc).forEach(q => { const qa = resolve(M, q.a), qb = resolve(M, q.b), qd = V.sub(qb, qa), qL = V.len(qd); const X = lineX(a, d, qa, qd); if (!X) return; const tq = V.dot(V.sub(X, qa), qd) / (qL * qL), tol = 5 / qL; if (tq < -tol || tq > 1 + tol) return; const tw = V.dot(V.sub(X, a), u); if (tw > 5 && tw < Lw - 5) ts.push(tw); });
        const tc = V.dot(V.sub(P, a), u); ts.sort((x, y) => x - y); const t0 = ts.filter(x => x < tc).pop(), t1 = ts.find(x => x > tc);
        if (t0 == null && t1 == null) { del(M, e.id); } else if (t0 == null) setEnd(M, e, 'a', V.add(a, V.mul(u, t1))); else if (t1 == null) setEnd(M, e, 'b', V.add(a, V.mul(u, t0)));
        else { const cl = JSON.parse(JSON.stringify(e)); delete cl.id; delete cl.lock; cl.a = freeAt(a.x + u.x * t1, a.y + u.y * t1); cl.b = JSON.parse(JSON.stringify(e.b)); const n2 = add(M, cl);
          M.el.filter(h => h.host === e.id && h.s > t1).forEach(h => { h.host = n2.id; h.s -= t1; }); setEnd(M, e, 'b', V.add(a, V.mul(u, t0))); } }
      else if (c === 'rotate') { const C = resolve(M, parsePt(M, t[2])), a = +t[3] * Math.PI / 180, co = Math.cos(a), si = Math.sin(a); const f = p => ({ x: C.x + (p.x - C.x) * co - (p.y - C.y) * si, y: C.y + (p.x - C.x) * si + (p.y - C.y) * co }); f.rot = +t[3]; ids(t[1]).forEach(id => chkLock(M, id)); ids(t[1]).forEach(id => xformEl(M, id, f)); }
      else if (c === 'mirror') { const P1 = resolve(M, parsePt(M, t[2])), P2 = resolve(M, parsePt(M, t[3])); const u = V.unit(V.sub(P2, P1)); const f = p => { const r = V.sub(p, P1), k = V.dot(r, u); return V.add(P1, V.sub(V.mul(u, 2 * k), r)); }; f.rot = 0; ids(t[1]).forEach(id => chkLock(M, id)); ids(t[1]).forEach(id => { xformEl(M, id, f); const e = byId(M, id); if (e.cat === 'wall' && e.ref !== 'c') e.ref = e.ref === 'l' ? 'r' : 'l'; }); }
      else if (c === 'set') { const e = chkLock(M, t[1].toUpperCase()); if (!Object.keys(kv).length) throw new Error('set ID kalit=qiymat');
        Object.entries(kv).forEach(([k, v]) => {
          if (MODS[e.cat]) { const k2 = modKey(e.cat, k); if (k2 in MODS[e.cat].def) { if (!isFinite(+v)) throw new Error(k2 + ' son bo‘lishi kerak'); e.p[k2] = +v; return; } }
          if (e.cat === 'oval') { const k2 = ovalKey(k); if (k2 in OVAL_DEF) { if (!isFinite(+v)) throw new Error(k2 + ' son bo‘lishi kerak'); e.p[k2] = +v; return; } }
          if (e.cat === 'ring') { const k2 = ringKey(k); if (k2 in RING_DEF) { if (!isFinite(+v)) throw new Error(k2 + ' son bo‘lishi kerak'); e.p[k2] = +v; return; } }
          if (e.cat === 'bar') { const k2 = barKey(k); if (k2 in BAR_DEF) { if (!isFinite(+v)) throw new Error(k2 + ' son bo‘lishi kerak'); e.p[k2] = +v; return; } }
          if (e.cat === 'shell') { const k2 = shellKey(k); if (SHELL_LEGACY[k2]) return; if (k2 in SHELL_DEF) { if (!isFinite(+v)) throw new Error(k2 + ' son bo‘lishi kerak'); e.p[k2] = +v; return; } }
          if (e.cat === 'form' && k in FORM_DEF) { if (!isFinite(+v)) throw new Error(k + ' son bo‘lishi kerak'); e.p[k] = +v; return; }
          if (k === 'layer') { e.layer = v.replace(/_/g, ' '); M.layers = M.layers || []; if (!M.layers.some(x => x.name === e.layer)) M.layers.push({ name: e.layer }); return; }
          if ((e.cat === 'door' || e.cat === 'window') && /^(flip|hand)$/.test(k)) { e[k] = +v ? 1 : 0; return; }
          if (e.cat === 'stair' && /^(type|w|rail|flip|rev)$/.test(k)) { if (k === 'type') { if (!/^[uil]$/i.test(v)) throw new Error('zina turi: u | i | l'); e.kind = v.toLowerCase(); } else if (k === 'w') e.w = v === 'auto' || !+v ? null : mm(v); else e[k] = +v ? 1 : 0; return; }
          if (k === 'type') { if (!(TYPES[e.cat] || {})[v]) throw new Error(`${e.cat} uchun tur yo‘q: ${v}`); e.type = v; }
          else if (k === 'ref') { if (e.cat !== 'wall' || !/^[lcr]$/.test(v)) throw new Error('ref faqat devorga: l | c | r'); e.ref = v; }
          else if (k === 'h') e.h = v === 'auto' ? null : mm(v);
          else if (k === 's') { if (e.cat === 'text') e.s = v.replace(/_/g, ' '); else { if (!e.host) throw new Error('s faqat teshikka'); e.s = mm(v); } }
          else if (k === 'off') { if (e.cat !== 'dim') throw new Error('off faqat o‘lchamga'); e.off = mm(v); }
          else if (k === 't') { if (e.cat !== 'slab') throw new Error('t faqat plitaga'); e.t = mm(v); }
          else if (k === 'rot') e.rot = +v;
          else if (k === 'name') e.name = v.replace(/_/g, ' ');
          else throw new Error('Nomaʼlum xossa: ' + k);
        }); }
      else if (c === 'unbind') ids(t[1]).forEach(id => { const e = chkLock(M, id); ptsOf(e).forEach(([k, p, arr]) => { const r = resolve(M, p); if (arr) arr[k] = freeAt(r.x, r.y); else e[k] = freeAt(r.x, r.y); }); });
      else throw new Error('Nomaʼlum buyruq: ' + c);
      if (lay && c !== 'set' && c !== 'layer') { M.el.forEach(e => { if (+String(e.id).replace(/^\D+/, '') >= seq0) e.layer = lay; }); M.layers = M.layers || []; if (!M.layers.some(x => x.name === lay)) M.layers.push({ name: lay }); }
      out.push({ ok: true, line });
    } catch (e) { out.push({ ok: false, line, err: e.message }); }
  });
  levelZ(M); return out;
}

// ---------- tekis graf: devor chiziqlari kesishmalarda bo'linadi → yarim qirralar → yuzalar (xonalar)
const key = p => Math.round(p.x) + ',' + Math.round(p.y);
const unkey = k => { const [x, y] = k.split(',').map(Number); return { x, y }; };
function planarGraph(walls) {
  // uchni ulash: devor uchi boshqa devorning chizig'iga uning yarim qalinligi ichida yetib kelsa — shu chiziqqa tortiladi (Archicad: tayanch chiziqlari bo'yicha ulanish)
  const touch = (p, self) => walls.some(h => h !== self && (V.len(V.sub(p, h.a)) <= 2 || V.len(V.sub(p, h.b)) <= 2 || onSeg(p, h.a, h.b, 2)));
  const pull = (p, self) => { if (touch(p, self)) return p; let best = null; walls.forEach(h => { if (h === self) return; const d = V.sub(h.b, h.a), L = V.len(d); if (L < 1) return; const t = V.dot(V.sub(p, h.a), d) / (L * L); if (t < 0 || t > 1) return; const q = V.add(h.a, V.mul(d, t)), dist = V.len(V.sub(p, q)); if (dist <= h.t / 2 + 1 && (!best || dist < best.d)) best = { q, d: dist }; }); return best ? best.q : p; };
  const segs = walls.map(g => ({ g, a: pull(g.a, g), b: pull(g.b, g), cuts: [0, 1] }));
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const A = segs[i], B = segs[j], d1 = V.sub(A.b, A.a), d2 = V.sub(B.b, B.a), c = V.cross(d1, d2), L1 = V.len(d1), L2 = V.len(d2);
    if (Math.abs(c) / (L1 * L2) < 1e-9) { // parallel: kollinear bo'lsa uchlarni bir-biriga qo'shamiz
      if (Math.abs(V.cross(V.sub(B.a, A.a), d1)) / L1 > 1) continue;
      [B.a, B.b].forEach(p => { const t = V.dot(V.sub(p, A.a), d1) / (L1 * L1); if (t > 1e-9 && t < 1 - 1e-9) A.cuts.push(t); });
      [A.a, A.b].forEach(p => { const t = V.dot(V.sub(p, B.a), d2) / (L2 * L2); if (t > 1e-9 && t < 1 - 1e-9) B.cuts.push(t); });
      continue;
    }
    const w = V.sub(B.a, A.a), t = V.cross(w, d2) / c, u = V.cross(w, d1) / c, et = 1 / L1, eu = 1 / L2; // 1 mm tolerans
    if (t > -et && t < 1 + et && u > -eu && u < 1 + eu) { A.cuts.push(Math.min(1, Math.max(0, t))); B.cuts.push(Math.min(1, Math.max(0, u))); }
  }
  // tugunlarni 2 mm ichida birlashtirish (hisoblangan kesishmalar yaxlitlanganda 1 mm farq qilishi mumkin)
  const cell = new Map(), snapK = p => { const gx = Math.floor(p.x / 4), gy = Math.floor(p.y / 4); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = cell.get((gx + i) + ':' + (gy + j)); if (L) for (const q of L) if (Math.abs(q.x - p.x) <= 2 && Math.abs(q.y - p.y) <= 2) return q.k; }
    const q = { x: p.x, y: p.y, k: key(p) }; const ck = gx + ':' + gy; if (!cell.has(ck)) cell.set(ck, []); cell.get(ck).push(q); return q.k; };
  const edges = new Map(), overlap = [];
  segs.forEach(S => { const ts = [...new Set(S.cuts.map(x => +x.toFixed(9)))].sort((a, b) => a - b); const d = V.sub(S.b, S.a);
    for (let k = 0; k + 1 < ts.length; k++) { const p = snapK(V.add(S.a, V.mul(d, ts[k]))), q = snapK(V.add(S.a, V.mul(d, ts[k + 1]))); if (p === q) continue; const ek = p < q ? p + '|' + q : q + '|' + p;
      // qirra kanonik yo'nalishda (kichik kalitdan kattaga); ustma-ust devorlarning tanasi birlashtiriladi
      const fw = p < q, lo = fw ? S.g.lo : -S.g.hi, hi = fw ? S.g.hi : -S.g.lo;
      if (edges.has(ek)) { const E = edges.get(ek); if (!E.ws.includes(S.g.w.id)) { overlap.push([E.g.w.id, S.g.w.id]); E.ws.push(S.g.w.id); } E.lo = Math.min(E.lo, lo); E.hi = Math.max(E.hi, hi); if (S.g.t > E.g.t) E.g = S.g; continue; }
      edges.set(ek, { g: S.g, lo, hi, ws: [S.g.w.id] }); } });
  const adj = new Map(); edges.forEach((v, k) => { const [u, w] = k.split('|'); [[u, w], [w, u]].forEach(([a, b]) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); }); });
  adj.forEach((nb, a) => { const pa = unkey(a); nb.sort((p, q) => { const P = unkey(p), Q = unkey(q); return Math.atan2(P.y - pa.y, P.x - pa.x) - Math.atan2(Q.y - pa.y, Q.x - pa.x); }); });
  const used = new Set(), faces = [];
  adj.forEach((nb, a) => nb.forEach(b => { if (used.has(a + '>' + b)) return; const cyc = []; let u = a, v = b, guard = 0;
    while (!used.has(u + '>' + v) && guard++ < 20000) { used.add(u + '>' + v); cyc.push(u); const nv = adj.get(v); const k = nv.indexOf(u); const w2 = nv[(k - 1 + nv.length) % nv.length]; u = v; v = w2; }
    if (cyc.length >= 2) faces.push(cyc); }));
  return { edges, adj, faces, overlap };
}
const polyArea = P => { let s = 0; P.forEach((p, i) => { const q = P[(i + 1) % P.length]; s += p.x * q.y - q.x * p.y; }); return s / 2; };
// yozuv nuqtasi: xona ichida, ichidagi boshqa xonalardan (yadro va h.k.) tashqarida, devorlardan eng uzoq nuqta (12×12 to'r + markaz)
function labelPt(P, holes, c0) { const segD = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
  const rings = [P].concat(holes), ok = q => inPoly(q, P) && !holes.some(H => inPoly(q, H)), sc = q => { let m = Infinity; rings.forEach(R => { for (let i = 0; i < R.length; i++) { const d = segD(q, R[i], R[(i + 1) % R.length]); if (d < m) m = d; } }); return m; };
  let best = ok(c0) ? { q: c0, d: sc(c0) * 1.15 } : null; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; P.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) { const q = { x: x0 + (i + .5) / 12 * (x1 - x0), y: y0 + (j + .5) / 12 * (y1 - y0) }; if (!ok(q)) continue; const d = sc(q); if (!best || d > best.d) best = { q, d }; }
  return best ? best.q : P[0]; }
function inPoly(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
// toza (ichki) kontur: har qirra o'z devorining shu xona tomonidagi yuzasigacha suriladi, qo'shni chiziqlar kesishmasi
function netPoly(cyc, edges) {
  const c = cyc.slice(), stubs = [];
  for (;;) { const n = c.length; if (n < 3) break; let f = -1; for (let i = 0; i < n; i++) if (c[(i - 1 + n) % n] === c[(i + 1) % n]) { f = i; break; } if (f < 0) break;
    const j = (f + 1) % n, ek = c[f] < c[j] ? c[f] + '|' + c[j] : c[j] + '|' + c[f]; stubs.push({ E: edges.get(ek), u: unkey(c[f]), v: unkey(c[j]) }); [f, j].sort((x, y) => y - x).forEach(k => c.splice(k, 1)); }
  const P = c.map(unkey); if (P.length < 3) return { poly: [], stubs };
  const lines = P.map((p, i) => { const q = P[(i + 1) % P.length], ek = c[i] < c[(i + 1) % P.length] ? c[i] + '|' + c[(i + 1) % P.length] : c[(i + 1) % P.length] + '|' + c[i]; const E = edges.get(ek); const d = V.sub(q, p), u = V.unit(d), nIn = { x: -u.y, y: u.x };
    let off = 0; if (E) { const canon = c[i] < c[(i + 1) % P.length]; off = canon ? Math.max(0, E.hi) : Math.max(0, -E.lo); } return { p: V.add(p, V.mul(nIn, off)), d: u, off, nIn }; });
  const out = []; lines.forEach((Ln, i) => { const Lp = lines[(i - 1 + lines.length) % lines.length]; const x = lineX(Lp.p, Lp.d, Ln.p, Ln.d);
    if (x) out.push(x); else { out.push(V.add(P[i], V.mul(Lp.nIn, Lp.off))); if (Math.abs(Lp.off - Ln.off) > .5) out.push(V.add(P[i], V.mul(Ln.nIn, Ln.off))); } });
  return { poly: out, stubs };
}

// kesmaning ko'pburchak ichidagi uzunligi (aniq: chegaralar bilan kesishish parametrlari bo'yicha)
function clipLen(a, b, poly) { const d = V.sub(b, a), ts = [0, 1]; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length], e = V.sub(q, p), c = V.cross(d, e); if (Math.abs(c) < 1e-12) return; const w = V.sub(p, a), t = V.cross(w, e) / c, u = V.cross(w, d) / c; if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t); });
  ts.sort((x, y) => x - y); let L = 0; for (let i = 0; i + 1 < ts.length; i++) { const m = V.add(a, V.mul(d, (ts[i] + ts[i + 1]) / 2)); if (inPoly(m, poly)) L += (ts[i + 1] - ts[i]) * V.len(d); } return L; }

// ---------- devor tutashuvlari: har uchdagi devorlar burchak bo'yicha saralanadi; qo'shni devorlarning qarama-qarshi yuzalari kesishmasi — burchak nuqtasi.
// T-tutashuv: devor uchi boshqa devorning o'rtasiga tushsa, shu devorning yaqin yuzasigacha qisqartiriladi / uzaytiriladi.
function joinWalls(walls) {
  const ends = []; walls.forEach(g => { ends.push({ g, at: 'a', P: g.a }); ends.push({ g, at: 'b', P: g.b }); });
  const cl = []; ends.forEach(e => { let c = cl.find(q => Math.abs(q.P.x - e.P.x) <= 2 && Math.abs(q.P.y - e.P.y) <= 2); if (!c) cl.push(c = { P: e.P, list: [] }); c.list.push(e); });
  const face = (P, d, off) => ({ p: V.add(P, V.mul({ x: -d.y, y: d.x }, off)), d });
  cl.forEach(C => {
    // har uch uchun: tashqariga yo'nalish d, chap/o'ng yuza ofsetlari
    C.list.forEach(e => { const g = e.g; e.d = e.at === 'a' ? g.u : V.mul(g.u, -1); e.hiL = e.at === 'a' ? g.hi : -g.lo; e.loR = e.at === 'a' ? g.lo : -g.hi; e.ang = Math.atan2(e.d.y, e.d.x); });
    const N = C.list.length, P = C.P;
    if (N === 1) {
      const e = C.list[0]; const thru = walls.find(h => h !== e.g && onSeg(P, h.a, h.b, h.t / 2 + 1) && V.len(V.sub(P, h.a)) > h.t / 2 && V.len(V.sub(P, h.b)) > h.t / 2);
      if (thru && Math.abs(V.cross(e.d, thru.u)) > 0.05) { const side = V.dot(e.d, thru.n) > 0 ? thru.hi : thru.lo, F = { p: V.add(thru.a, V.mul(thru.n, side)), d: thru.u };
        const L = lineX(face(P, e.d, e.hiL).p, e.d, F.p, F.d), R = lineX(face(P, e.d, e.loR).p, e.d, F.p, F.d); if (L && R && V.len(V.sub(L, P)) < 4 * e.g.t + 1 && V.len(V.sub(R, P)) < 4 * e.g.t + 1) { e.L = L; e.R = R; e.T = thru.w.id; return; } }
      e.L = face(P, e.d, e.hiL).p; e.R = face(P, e.d, e.loR).p; return; }
    C.list.sort((a, b) => a.ang - b.ang); const tmax = Math.max(...C.list.map(e => e.g.t));
    C.list.forEach((e, i) => { const nx = C.list[(i + 1) % N], pv = C.list[(i - 1 + N) % N];
      const cL = Math.abs(V.cross(e.d, nx.d)) > 1e-6 ? lineX(face(P, e.d, e.hiL).p, e.d, face(P, nx.d, nx.loR).p, nx.d) : null;
      const cR = Math.abs(V.cross(e.d, pv.d)) > 1e-6 ? lineX(face(P, e.d, e.loR).p, e.d, face(P, pv.d, pv.hiL).p, pv.d) : null;
      e.joined = true;
      e.L = cL && V.len(V.sub(cL, P)) < 4 * tmax ? cL : face(P, e.d, e.hiL).p; e.R = cR && V.len(V.sub(cR, P)) < 4 * tmax ? cR : face(P, e.d, e.loR).p; e.C = N >= 3 ? P : null; });
  });
  // tana ko'pburchagi (A→B ramkasida): A_lo → B_lo → [B] → B_hi → A_hi → [A]
  walls.forEach(g => { g.poly = null; });
  cl.forEach(C => C.list.forEach(e => { e.g['end_' + e.at] = e; }));
  walls.forEach(g => { const A = g.end_a, B = g.end_b; g.ja = !!(A.C || A.T || A.joined); g.jb = !!(B.C || B.T || B.joined); const P = [A.R, B.L]; if (B.C) P.push(B.C); P.push(B.R, A.L); if (A.C) P.push(A.C); g.poly = P.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })); g.area = Math.abs(polyArea(g.poly)); delete g.end_a; delete g.end_b; });
}
// ---------- SHAKL (forma): qavatma-qavat kontur. Har qavatda maydon funksiyasi d(x,y) — ikki doiraning silliq birlashmasi (SDF smooth-min);
// kontur = {d = 0} (marching squares), keyin teng bo'laklarga qayta bo'linadi. Pastki qavatlarda terrasa — {d = +terrasa_chuqurligi}.
const FORM_DEF = { n1: 40, n2: 56, h: 4.2, rb: 26, rt1: 7.5, rt2: 9, sep: 14, d0: 5, split: 0.12, merge: 0.40, flare: 0.13, k0: 18, kmin: 1.5, pod: 7, terr: 3.5, fin: 0.9, fd: 0.55, fw: 0.16, crown: 3, seg: 72, ell: 1.25, lean: 0 };
const FORM_HELP = { n1: 'chap minora qavatlari', n2: 'o‘ng minora qavatlari', h: 'qavat balandligi, m', rb: 'pastki (baza) radiusi, m', rt1: 'chap minora radiusi tepada, m', rt2: 'o‘ng minora radiusi tepada, m', sep: 'minoralar markazlari orasining yarmi (tepada), m', d0: 'shu yarim masofa pastda, m', split: 'ajralish boshlanadigan balandlik (0…1)', merge: 'ajralish tugaydigan balandlik (0…1)', flare: 'pastki kengayish egriligi (0…1)', k0: 'pastda birlashish radiusi, m', kmin: 'tepada birlashish radiusi, m', pod: 'terrasali podium qavatlari', terr: 'terrasa chuqurligi pastda, m', fin: 'lamel qadami, m', fd: 'lamel chuqurligi, m', fw: 'lamel qalinligi, m', crown: 'toj pog‘onalari soni', seg: 'kontur bo‘laklari', ell: 'baza cho‘ziqligi (x/y)', lean: 'minoralar og‘ishi, m' };
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / ((b - a) || 1e-9))); return t * t * (3 - 2 * t); };
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4; };
function formField(P, z) { // mm → m ichki hisob; qaytaradi: (x, y) → d (m)
  const H2 = P.n2 * P.h, H1 = P.n1 * P.h, t = z / H2, s = sstep(P.split, P.merge, t), d = P.d0 + (P.sep - P.d0) * s, k = P.kmin + (P.k0 - P.kmin) * (1 - s);
  const rad = (rt, n) => { let r = rt + (P.rb - rt) * Math.exp(-t / Math.max(0.02, P.flare)); const i = Math.round(z / P.h), c0 = n - 2 * P.crown; if (P.crown > 0 && i >= c0) r -= 0.9 * Math.ceil((i - c0 + 1) / 2); return r; };
  const ex = 1 + (P.ell - 1) * (1 - s); // pastda baza x bo'ylab cho'ziq
  const on1 = z < H1 - 1e-6, on2 = z < H2 - 1e-6, r1 = rad(P.rt1, P.n1), r2 = rad(P.rt2, P.n2), lean = P.lean * t;
  return (x, y) => { const d1 = on1 ? Math.hypot((x + d + lean) / ex, y) - r1 / 1 : 1e9, d2 = on2 ? Math.hypot((x - d - lean) / ex, y) - r2 : 1e9; return on1 && on2 ? smin(d1, d2, k) : Math.min(d1, d2); };
}
// marching squares: maydon qiymatlari bir marta hisoblanadi (V), turli iso uchun qayta ishlatiladi → yopiq halqalar (m)
function fieldGrid(f, box, g) { const nx = Math.ceil((box[2] - box[0]) / g), ny = Math.ceil((box[3] - box[1]) / g), V0 = new Float64Array((nx + 1) * (ny + 1)); for (let j = 0; j <= ny; j++) { const y = box[1] + j * g; for (let i = 0; i <= nx; i++) V0[j * (nx + 1) + i] = f(box[0] + i * g, y); } return { V0, nx, ny, box, g }; }
function isoLoops(f, box, g, iso, GR) {
  GR = GR || fieldGrid(f, box, g); const { V0, nx, ny } = GR, W = nx + 1; const val = (i, j) => V0[j * W + i] - iso;
  const ept = new Map(); // kalit: gorizontal qirra 2·(j·W+i), vertikal 2·(j·W+i)+1
  const cross = (i0, j0, horiz) => { const key = 2 * (j0 * W + i0) + (horiz ? 0 : 1); if (ept.has(key)) return key; const i1 = horiz ? i0 + 1 : i0, j1 = horiz ? j0 : j0 + 1; const a = val(i0, j0), b = val(i1, j1), t = a / (a - b); ept.set(key, [box[0] + (i0 + (i1 - i0) * t) * g, box[1] + (j0 + (j1 - j0) * t) * g]); return key; };
  const adj = new Map(); const link = (a, b) => { let A = adj.get(a); if (!A) adj.set(a, A = []); let B = adj.get(b); if (!B) adj.set(b, B = []); A.push(b); B.push(a); };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = val(i, j), b = val(i + 1, j), c = val(i + 1, j + 1), d = val(i, j + 1); const idx = (a < 0 ? 1 : 0) | (b < 0 ? 2 : 0) | (c < 0 ? 4 : 0) | (d < 0 ? 8 : 0); if (idx === 0 || idx === 15) continue;
    const eB = () => cross(i, j, true), eR = () => cross(i + 1, j, false), eT = () => cross(i, j + 1, true), eL = () => cross(i, j, false);
    switch (idx) { case 1: case 14: link(eL(), eB()); break; case 2: case 13: link(eB(), eR()); break; case 3: case 12: link(eL(), eR()); break; case 4: case 11: link(eR(), eT()); break; case 6: case 9: link(eB(), eT()); break; case 7: case 8: link(eL(), eT()); break;
      default: { const ctr = (a + b + c + d) / 4; if ((idx === 5) === (ctr < 0)) { link(eL(), eT()); link(eB(), eR()); } else { link(eL(), eB()); link(eR(), eT()); } } }
  }
  const used = new Set(), loops = []; adj.forEach((nb, s) => { if (used.has(s)) return; const L = []; let prev = null, cur = s; while (cur != null && !used.has(cur)) { used.add(cur); L.push(ept.get(cur)); const nb2 = adj.get(cur); const nx2 = nb2.find(q => q !== prev && !used.has(q)); prev = cur; cur = nx2; } if (L.length > 4) loops.push(L); });
  return loops;
}
function resample(L, n) { const segs = []; let tot = 0; for (let i = 0; i < L.length; i++) { const a = L[i], b = L[(i + 1) % L.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push(l); tot += l; } const out = []; let k = 0, acc = 0;
  for (let m = 0; m < n; m++) { const tgt = tot * m / n; while (k < L.length - 1 && acc + segs[k] < tgt) { acc += segs[k]; k++; } const a = L[k], b = L[(k + 1) % L.length], u = segs[k] ? (tgt - acc) / segs[k] : 0; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); } return { pts: out, len: tot }; }
const loopArea = L => { let s = 0; L.forEach((p, i) => { const q = L[(i + 1) % L.length]; s += p[0] * q[1] - q[0] * p[1]; }); return s / 2; };
const FORM_CACHE = new Map();
function formGeom(M, e) {
  const P = Object.assign({}, FORM_DEF, e.p || {}); const at = resolve(M, e.at), rot = (e.rot || 0) * Math.PI / 180, co = Math.cos(rot), si = Math.sin(rot);
  const key = JSON.stringify(P); let G = FORM_CACHE.get(key);
  if (!G) { const n = Math.max(P.n1, P.n2), R = Math.max(P.rb * P.ell, P.rt1, P.rt2) + P.terr + 3, W = P.sep + Math.abs(P.lean) + R, box = [-W, -R, W, R], g = Math.max(0.35, (2 * W) / 150);
    const floors = []; for (let i = 0; i < n; i++) { const z = i * P.h, f = formField(P, z + P.h * 0.5), GR = fieldGrid(f, box, g); let loops = isoLoops(f, box, g, 0, GR).filter(L => Math.abs(loopArea(L)) > 2);
      const ti = i < P.pod ? P.terr * (1 - i / Math.max(1, P.pod)) : 0; let terr = ti > 0.2 ? isoLoops(f, box, g, ti, GR).filter(L => Math.abs(loopArea(L)) > 2) : null;
      const rs = loops.map(L => { const r = resample(L, Math.max(12, Math.round(P.seg * (Math.abs(loopArea(L)) > 400 ? 1 : 0.7)))); if (loopArea(r.pts) < 0) r.pts.reverse(); return r; });
      const tr = terr ? terr.map(L => { const r = resample(L, P.seg); if (loopArea(r.pts) < 0) r.pts.reverse(); return r.pts; }) : null;
      floors.push({ i, z, loops: rs.map(r => r.pts), perim: rs.reduce((s, r) => s + r.len, 0), area: rs.reduce((s, r) => s + Math.abs(loopArea(r.pts)), 0), terr: tr, terrArea: tr ? tr.reduce((s, L) => s + Math.abs(loopArea(L)), 0) : 0 }); }
    G = { P, floors }; FORM_CACHE.set(key, G); if (FORM_CACHE.size > 40) FORM_CACHE.delete(FORM_CACHE.keys().next().value); }
  const T = p => ({ x: at.x + (p[0] * co - p[1] * si) * 1000, y: at.y + (p[0] * si + p[1] * co) * 1000 });
  const floors = G.floors.map(F => ({ i: F.i, z: F.z * 1000, h: P.h * 1000, loops: F.loops.map(L => L.map(T)), terr: F.terr ? F.terr.map(L => L.map(T)) : null, area: F.area, perim: F.perim, terrArea: F.terrArea }));
  const fins = floors.reduce((s, F) => s + Math.round(F.perim / Math.max(0.3, P.fin)), 0);
  return { e, P, floors, H: Math.max(P.n1, P.n2) * P.h, gfa: +floors.reduce((s, F) => s + F.area, 0).toFixed(0), facade: +floors.reduce((s, F) => s + F.perim * P.h, 0).toFixed(0), terrace: +floors.reduce((s, F) => s + Math.max(0, F.terrArea - F.area), 0).toFixed(0), fins };
}

// ---------- QOBIQ (shell): parametrik sirt S(u,v) — bo'ylama o'q u (0…1) bo'ylab ko'ndalang kesimlar loft'i.
// Kesim — tekislikdagi egri chiziq (z = f(y) emas!): nazorat nuqtalari orqali Catmull-Rom (sentripetal) splayn, egrilik bo'yicha zichlashtirib qayta bo'linadi.
// Chet ko'tarilgan joyda (λ = E_f(u)) kesim: vitraj tepasi → shift (soffit) tashqariga → yumaloq hoshiya (lab) → ustki sirt orqaga qaytib cho'qqiga →
// orqa tomon yerga. Ya'ni sirt o'z ostiga buraladi (bitta y da bir nechta z). Chet yerda bo'lsa (λ → 0) — o'sha nuqtalar yerga urinma
// maydon-pandusga (land) aylanadi: sirt yer sathiga sinmasdan, gorizontal urinma bilan qo'shiladi. Ikki holat orasida silliq aralashma.
const SHELL_DEF = { L: 150, W: 60, h0: 22, p1h: 24, p1c: 0.06, p1s: 0.07, p2h: 12, p2c: 0.48, p2s: 0.12, p3h: 20, p3c: 0.88, p3s: 0.09,
  e1h: 21, e1c: 0.48, e1w: 0.12, e2h: 30, e2c: 1.0, e2w: 0.10, e3h: 6, e3c: 0.22, e3w: 0.07, eb: 0, top: 0.45, curl: 5, lip: 1.6, land: 12, tail: 0.10, soft: 4, tw: 32, twc: 0.80, rib: 5, ribn: 5, wn: 0.55, t: 0.9, setb: 9, fh: 6, clr: 3, room: 12, cor: 2.4, core: 40, wc: 6, audH: 14, audL: 42, evac: 40, fire: 2500, nu: 240, nv: 72 };
const SHELL_LEGACY = { k: 1 };
const shellKey = k => Object.keys(SHELL_DEF).find(q => q.toLowerCase() === String(k).toLowerCase()) || k; // buyruq kalitlari kichik harfga o'tadi (L, W) // eski fayllardagi kalitlar — e'tiborsiz
const SHELL_HELP = { L: 'uzunligi, m', W: 'chuqurligi (eni), m', h0: 'asosiy balandlik, m', p1h: '1-cho‘qqi balandligi (qo‘shimcha), m', p1c: '1-cho‘qqi joyi (0…1)', p1s: '1-cho‘qqi kengligi', p2h: '2-cho‘qqi, m', p2c: '2-cho‘qqi joyi', p2s: '2-cho‘qqi kengligi', p3h: '3-cho‘qqi (to‘lqin), m', p3c: '3-cho‘qqi joyi', p3s: '3-cho‘qqi kengligi',
  e1h: 'kirish: old chet ko‘tarilishi, m', e1c: 'kirish joyi (0…1)', e1w: 'kirish kengligi', e2h: 'oxirgi to‘lqin cheti ko‘tarilishi, m', e2c: 'uning joyi', e2w: 'uning kengligi', e3h: 'chap arka ko‘tarilishi, m', e3c: 'chap arka joyi', e3w: 'chap arka kengligi', eb: 'orqa chet ko‘tarilishi, m', top: 'cho‘qqining kesimdagi joyi (0 — old, 1 — orqa)',
  curl: 'buralish: hoshiya oldinga chiqishi (konsol), m', lip: 'hoshiya (lab) radiusi, m', land: 'yerga qo‘shilish pandusi uzunligi, m', tail: 'chap dum: yerdan ko‘tarilish uzunligi (0…0.4)', soft: 'arka oyoqlarini silliqlash, m', tw: 'o‘ng uchda lentaning buralishi (o‘z o‘qi atrofida), °', twc: 'buralish boshlanadigan joy (0…1)', rib: 'chap cho‘qqi qovurg‘alari bo‘rtishi, m', ribn: 'qovurg‘alar (pog‘onalar) soni', fh: 'ichki qavat balandligi, m (0 — qavatsiz)', clr: 'qavatda shiftgacha eng kam balandlik, m', room: 'xona moduli (bo‘ylama), m', cor: 'koridor eni, m', wc: 'sanuzel uzunligi (yadro yonida), m', audH: 'auditoriya uchun eng kam shift balandligi, m (0 — auditoriyasiz)', audL: 'auditoriya eng katta uzunligi, m', core: 'zina-lift yadrolari orasidagi eng katta masofa, m', evac: 'xonadan zinagacha ruxsat etilgan masofa, m (normaga qarab qo‘ying)', fire: 'yong‘in bo‘linmasi eng katta maydoni, m² (normaga qarab qo‘ying)', wn: 'uchlarda torayish (0…1)', t: 'qobiq qalinligi, m', setb: 'vitraj hoshiyadan ichkarida, m', nu: 'bo‘ylama bo‘laklar', nv: 'ko‘ndalang bo‘laklar' };
// sentripetal Catmull-Rom: nuqtalar → zich chiziq
function crDense(Pt, per) { const out = [], n = Pt.length; const ext = [[2 * Pt[0][0] - Pt[1][0], 2 * Pt[0][1] - Pt[1][1]]].concat(Pt, [[2 * Pt[n - 1][0] - Pt[n - 2][0], 2 * Pt[n - 1][1] - Pt[n - 2][1]]]);
  const tj = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]) + 1e-4, 0.5);
  for (let i = 1; i < n; i++) { const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2]; const t0 = 0, t1 = t0 + tj(p0, p1), t2 = t1 + tj(p1, p2), t3 = t2 + tj(p2, p3);
    for (let k = 0; k < per; k++) { const t = t1 + (t2 - t1) * k / per; const L = (a, b, ta, tb) => [(tb - t) / (tb - ta) * a[0] + (t - ta) / (tb - ta) * b[0], (tb - t) / (tb - ta) * a[1] + (t - ta) / (tb - ta) * b[1]];
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3); out.push(L(B1, B2, t1, t2)); } }
  out.push(Pt[n - 1].slice()); return out; }
// egrilik og'irligi bilan qayta bo'lish (hoshiyada nuqtalar zichroq)
function crResample(D, n, kw) { const w = [0]; for (let i = 1; i < D.length; i++) { const ds = Math.hypot(D[i][0] - D[i - 1][0], D[i][1] - D[i - 1][1]); let dth = 0; if (i > 1) { const a1 = Math.atan2(D[i - 1][1] - D[i - 2][1], D[i - 1][0] - D[i - 2][0]), a2 = Math.atan2(D[i][1] - D[i - 1][1], D[i][0] - D[i - 1][0]); dth = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))); } w.push(w[i - 1] + ds + kw * dth); }
  const out = []; let k = 1; for (let m = 0; m <= n; m++) { const tg = w[w.length - 1] * m / n; while (k < D.length - 1 && w[k] < tg) k++; const f = (tg - w[k - 1]) / ((w[k] - w[k - 1]) || 1); out.push([D[k - 1][0] + (D[k][0] - D[k - 1][0]) * f, D[k - 1][1] + (D[k][1] - D[k - 1][1]) * f]); } return out; }
function shellGeom(M, e) {
  const P = Object.assign({}, SHELL_DEF, e.p || {}); const at = resolve(M, e.at), rot = (e.rot || 0) * Math.PI / 180, co = Math.cos(rot), si = Math.sin(rot);
  const g = (u, c, s) => Math.exp(-Math.pow((u - c) / Math.max(1e-3, s), 2)), gf = (u, c, w) => Math.exp(-Math.pow(Math.abs(u - c) / Math.max(1e-3, w), 2.5)); // gf — arka shakli (yumaloq tepa, tik oyoqlar)
  const tl = Math.max(0.01, Math.min(0.4, P.tail)), endL = u => { const s = sstep(0, tl, u); return s * s * (3 - 2 * s); };
  const H = u => endL(u) * (P.h0 + P.p1h * g(u, P.p1c, P.p1s) + P.p2h * g(u, P.p2c, P.p2s) + P.p3h * g(u, P.p3c, P.p3s));
  const Ef = u => endL(u) * (P.e1h * gf(u, P.e1c, P.e1w) + P.e2h * gf(u, P.e2c, P.e2w) + P.e3h * gf(u, P.e3c, P.e3w)), Eb = u => P.eb * endL(u);
  const W = u => P.W * (1 - P.wn * (1 - sstep(0, 0.18, u)));
  const nu = Math.max(8, Math.round(P.nu)), nv = Math.max(12, Math.round(P.nv)), r = Math.max(0.3, P.lip), c = Math.max(0, P.curl), land = Math.max(1, P.land), Z0 = 0.02;
  const mix = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  // 11 nazorat nuqtasi → 10 segment; nisbiy zichlik (hoshiya atrofi zichroq)
  const RW = [3, 2, 3, 3, 4, 6, 7, 6, 3, 2], RS = RW.reduce((a, b) => a + b, 0); let SEGW = RW.map(x => Math.max(1, Math.round(x / RS * nv))); SEGW[6] += nv - SEGW.reduce((a, b) => a + b, 0); const SEGW_T = nv, SEGW_N = 48;
  // bitta kesim: [[y, z] …] (oldindan orqaga), va aralashma koeffitsiyentlari
  // λ(u) qatorlar bo'yicha Gauss bilan silliqlanadi (soft m) — arka oyog'i yerga bir necha qatorda keskin emas, ravon tushadi
  // qatorlar uchlarda zichroq: u = t − κ·sin(2πt)/(2π) (uchlarda qadam (1−κ) marta kichik) — tik uch yuzalari va qovurg'alar uchun
  // qator zichligi ρ(u) = 1 + 0.6·uchlar + min(5, 1.5·|dH/dx|): tik joylarda (cho'qqi yonbag'ri, qovurg'alar) qatorlar zichroq; U — ρ ning teskari integrali
  const U = []; { const NQ = 2000, cum = [0]; let prev = 0; for (let q = 0; q <= NQ; q++) { const u = q / NQ, e = 0.5 / NQ; const sl = Math.abs(H(Math.min(1, u + e)) - H(Math.max(0, u - e))) / (2 * e * P.L); const rho = 1 + 0.6 * (1 - Math.sin(Math.PI * u)) + Math.min(5, 1.5 * sl); if (q) cum.push(cum[q - 1] + (rho + prev) / 2); prev = rho; }
    const tot = cum[NQ]; let q = 0; for (let i = 0; i <= nu; i++) { const tg = tot * i / nu; while (q < NQ && cum[q + 1] < tg) q++; const f = q < NQ ? (tg - cum[q]) / ((cum[q + 1] - cum[q]) || 1) : 0; U.push(Math.min(1, (q + f) / NQ)); } U[0] = 0; U[nu] = 1; } const DX = i => P.L * ((U[Math.min(nu, i + 1)] - U[Math.max(0, i - 1)]) / ((i === 0 || i === nu) ? 2 : 2));
  const lamRaw = []; for (let i = 0; i <= nu; i++) { const u = U[i]; lamRaw.push(Math.max(0, Math.min(Ef(u), H(u) + 40))); }
  const sm = Math.max(0, P.soft) / P.L, lamA = sm * P.L < 0.3 ? lamRaw : lamRaw.map((_, i) => { let s = 0, ws = 0; for (let j = 0; j <= nu; j++) { const d = U[j] - U[i]; if (Math.abs(d) > 3 * sm) continue; const w = Math.exp(-d * d / (2 * sm * sm)); s += lamRaw[j] * w; ws += w; } return s / ws; });
  const section = i => { const u = U[i], w = W(u), h = H(u), yf = -w / 2, yb = w / 2, yt = yf + P.top * w; const lam = lamA[i], a = sstep(1.5, 12, lam), eb = Math.min(Eb(u), h), ab = sstep(1.5, 12, eb);
    const ce = c * sstep(0.45, 1, a), re = r * (0.15 + 0.85 * sstep(0.2, 1, a)); // kichik ko'tarilishda hoshiya yerga «tirnoq» bo'lib chiqmasin
    const hh = Math.max(h, a * (lam + 2 * re + 1.5), eb + 1, 0.3), lz = Math.max(Z0, lam), q = hh - lz;
    // ko'tarilgan (buralgan) holat
    const Lf = [[yf + P.setb, lz + 0.12 * q], [yf - ce * 0.25, lz + 0.03 * q], [yf - ce, lz], [yf - ce - 0.95 * re, lz + re], [yf - ce * 0.55, lz + 2 * re], [yf + (yt - yf) * 0.45, lz + 2 * re + (hh - lz - 2 * re) * 0.72]];
    // yerga qo'shilgan holat (gorizontal urinma bilan pandus)
    const Gf = [[yf - land, Z0], [yf - land * 0.66, Z0], [yf - land * 0.33, Z0 + 0.05], [yf, 0.10 * hh], [yf + (yt - yf) * 0.22, 0.42 * hh], [yf + (yt - yf) * 0.6, 0.84 * hh]];
    const av = Math.pow(a, 1.7), F = Lf.map((p, k) => [Gf[k][0] + (p[0] - Gf[k][0]) * a, Gf[k][1] + (p[1] - Gf[k][1]) * av]); /* tik bo'yicha sekinroq: kichik ko'tarilishda chet havoda osilib qolmaydi */ const dB = yb - yt;
    const Gb = [[yt + dB * 0.45, 0.80 * hh], [yb - dB * 0.12, 0.22 * hh], [yb + land * 0.4, Z0 + 0.05], [yb + land, Z0]], Lb = [[yt + dB * 0.45, eb + (hh - eb) * 0.8], [yb - dB * 0.08, eb + (hh - eb) * 0.25], [yb, eb], [yb - 0.6, Math.max(Z0, eb - 0.4)]];
    const Bk = Gb.map((p, k) => mix(p, Lb[k], ab)); const pts = F.concat([[yt, hh]], Bk);
    for (let k = 1; k < pts.length; k++) if (Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]) < 0.05) pts[k] = [pts[k][0] + 0.05, pts[k][1]];
    // har segmentga qat'iy nuqta soni — qo'shni kesimlarda j indekslari bir xil joyga to'g'ri keladi (sirt burishmaydi)
    const D = crDense(pts, SEGW_N); let out = []; SEGW.forEach((m, sgi) => { for (let k = 0; k < m; k++) out.push(D[Math.round((sgi + k / m) * SEGW_N)]); }); out.push(D[D.length - 1]);
    // o'ng uchda lenta o'z o'qi atrofida buraladi: kesim cho'qqi asosi (yt, 0) atrofida oldinga ag'dariladi (tepasi old tomonga engashadi).
    // Burilish burchagi nuqta balandligiga bog'liq: yerdagi chet va pandus joyida qoladi, yuqori qism to'liq buriladi — lenta tayanchidan uzilmaydi
    const th = (P.tw || 0) * Math.PI / 180 * Math.pow(sstep(P.twc, 1, u), 1.3); let gy = 0;
    if (Math.abs(th) > 1e-4) { const rt = p => { const t2 = th * sstep(0.4, Math.max(1, 0.35 * hh), p[1]), cs = Math.cos(t2), sn = Math.sin(t2), dy = p[0] - yt, dz = p[1]; return [yt + dy * cs - dz * sn, Math.max(Z0, dy * sn + dz * cs)]; };
      const f0 = out[0]; out = out.map(rt); gy = out[0][0] - f0[0]; }
    return { pts: out, a, lam, w, yf, yb, yt, th, gy }; };
  const O = [], I = [], SEC = [];
  for (let i = 0; i <= nu; i++) { const u = U[i], S = section(i), x = P.L * (0.5 - u); SEC.push(S); const C = S.pts.map(p => [p[0], Math.max(0, p[1])]);
    O.push(C.map(p => [x, p[0], p[1]]));
    // ichki sirt: kesim tekisligida o'ng normal bo'yicha (old→orqa yo'nalishda o'ng = material tomoni) t ga
    I.push(C.map((p, j) => { const pa = C[Math.max(0, j - 1)], pb = C[Math.min(nv, j + 1)]; const dy = pb[0] - pa[0], dz = pb[1] - pa[1], l = Math.hypot(dy, dz) || 1; return [x, p[0] + dz / l * P.t, p[1] - dy / l * P.t]; })); }
  // chap cho'qqi qovurg'alari: cho'qqining chap (uch) yonbag'rida gorizontal pog'ona-bo'rtmalar. Har nuqta sirt normali bo'yicha suriladi;
  // bo'rtma balandlik bo'yicha davriy (sin), oraliqda chuqur chok — «yostiqcha» qatorlari
  if (P.rib > 0 && P.ribn >= 1) { const Hp = Math.max(1, H(P.p1c)); const bump = z => { const f = z / Hp * P.ribn; if (f <= 0 || f >= P.ribn) return 0; return Math.pow(Math.sin(Math.PI * (f % 1)), 0.7) * (1 - 0.4 * f / P.ribn) * sstep(0.25, 0.9, f) * (1 - sstep(0.62, 0.95, f / P.ribn)); }; // pastda yerga, tepada cho'qqiga ravon so'nadi
    const D0 = O.map(r => r.map(p => p.slice())); const sb = (q, p) => [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    // avval surilish maydoni d[i][j] va normal hisoblanadi, keyin d ikki marta 3×3 o'rtacha bilan silliqlanadi (qirrali yuzachalar bo'lmasin)
    let Dd = D0.map(r => r.map(() => 0)); const NN = D0.map(r => r.map(() => [0, 0, 0])); const xh = P.L * (0.5 - P.p1c);
    // yo'nalish — cho'qqi o'qidan gorizontal radial (sirt normali emas: normal shovqini yamoqli soya berardi); uch tomonga qaragan qismda to'liq
    for (let i = 0; i <= nu; i++) { const u = U[i], env = (1 - sstep(P.p1c - 0.2 * P.p1s, P.p1c + 1.2 * P.p1s, u)) * sstep(0, 0.5 * tl, u); if (env < 1e-3) continue; const yax = SEC[i].yt;
      for (let j = 0; j <= nv; j++) { const p = D0[i][j]; if (p[2] < 0.3) continue; let dx2 = p[0] - xh, dy2 = p[1] - yax; const l = Math.hypot(dx2, dy2); if (l < 0.5) continue; dx2 /= l; dy2 /= l; const wv = Math.pow(Math.max(0, dx2 * 0.8 + 0.2), 0.8);
        NN[i][j] = [dx2, dy2, 0]; Dd[i][j] = P.rib * env * bump(p[2]) * wv; } }
    for (let pass = 0; pass < 0; pass++) Dd = Dd.map((r, i) => r.map((v, j) => { let s2 = 0, w = 0; for (let a2 = -1; a2 <= 1; a2++) for (let b2 = -1; b2 <= 1; b2++) { const ii = i + a2, jj = j + b2; if (ii < 0 || ii > nu || jj < 0 || jj > nv) continue; s2 += Dd[ii][jj]; w++; } return s2 / w; }));
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const d = Dd[i][j], n = NN[i][j]; if (!d) continue; const q = O[i][j]; q[0] += n[0] * d; q[1] += n[1] * d; q[2] = Math.max(0, q[2] + n[2] * d); } }
  // ichki sirt: to'liq 3D normal bo'yicha t ga (yo'nalishi — kesimdagi material tomoni); uchlarda sirt x bo'yicha tik bo'lsa ham ichki qatlam tashqisini teshmaydi
  { const sb = (q, p) => [q[0] - p[0], q[1] - p[1], q[2] - p[2]]; const I2 = O.map((row, i) => row.map((p, j) => { const du = sb(O[Math.min(nu, i + 1)][j], O[Math.max(0, i - 1)][j]), dv = sb(O[i][Math.min(nv, j + 1)], O[i][Math.max(0, j - 1)]);
      let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]]; const l = Math.hypot(...n); if (l < 1e-9) return I[i][j]; n = n.map(x => x / l); const ref = sb(I[i][j], p); if (n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2] < 0) n = n.map(x => -x);
      return [p[0] + n[0] * P.t, p[1] + n[1] * P.t, Math.max(0, p[2] + n[2] * P.t)]; })); for (let i = 0; i <= nu; i++) I[i] = I2[i]; } // pandusning ichki qatlami yer ostiga tushmaydi
  // shift ostidagi ichki bo'shliq: y bo'yicha eng past kesishma (shift yoki tom osti) — vitraj va hajm uchun
  const ceil = (C, y) => { let zmin = Infinity; for (let j = 0; j < C.length - 1; j++) { const a = C[j], b = C[j + 1]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) { const f = (y - a[1]) / (b[1] - a[1]); const z = a[2] + (b[2] - a[2]) * f; if (z > 0.3 && z < zmin) zmin = z; } } return zmin === Infinity ? 0 : zmin; };
  const span = i => { const C = I[i]; const ys = C.filter(p => p[2] > 0.3).map(p => p[1]); if (!ys.length) return null; const y0 = SEC[i].a > 0.35 ? Math.max(Math.min(...ys), SEC[i].yf + P.setb + SEC[i].gy) : Math.min(...ys); return [y0, Math.max(...ys)]; };
  // vitraj: shiftning ichki uchidan (j = 0) yergacha
  // vitraj chizig'i qat'iy: old chetdan setb ichkarida; balandligi — shu chiziq ustidagi eng past sirt (shift yoki tom osti)
  const gtop = i => { const yg = SEC[i].yf + P.setb + SEC[i].gy; return SEC[i].a > 0.35 ? [O[i][0][0], yg, ceil(I[i], yg)] : null; };
  let iEnd = nu - 1; while (iEnd > 1 && U[iEnd] > 1 - 0.6 * P.setb / P.L) iEnd--; const hasEnd = SEC[iEnd].a > 0.55; // o'ng uch ochiq bo'lsa, old vitraj uch vitrajida tugaydi
  const glass = []; for (let i = 0; i < (hasEnd ? iEnd : nu); i++) { const a = gtop(i), b = gtop(i + 1); if (a && b && a[2] > 0.8 && b[2] > 0.8) glass.push([[a[0], a[1], 0], [b[0], b[1], 0], b, a]); }
  // o'ng uch ochiq bo'lsa — uchga yaqin kesimda vitraj (yer → shift/tom osti)
  const endGlass = []; { const i = iEnd; const sp = span(i); if (sp && hasEnd) { const C = I[i], x = C[0][0], pts = []; const n = 40; for (let k = 0; k <= n; k++) { const y = sp[0] + (sp[1] - sp[0]) * k / n; const z = ceil(C, y); if (z > 0.3) pts.push([x, y, z]); }
    if (pts.length > 3) endGlass.push(pts.concat([[x, pts[pts.length - 1][1], 0], [x, pts[0][1], 0]])); } }
  // hisob (m)
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let area = 0; for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = O[i][j], b = O[i + 1][j], cc = O[i + 1][j + 1], d = O[i][j + 1]; if (Math.max(a[2], b[2], cc[2], d[2]) < 0.3) continue; area += Math.hypot(...crs(sub(b, a), sub(d, a))) / 2 + Math.hypot(...crs(sub(cc, b), sub(cc, d))) / 2; }
  let vol = 0, foot = 0; for (let i = 0; i <= nu; i++) { const sp = span(i); if (!sp) continue; const dx = DX(i), k = 1; foot += (sp[1] - sp[0]) * dx * k; const n = 60; let s = 0; for (let m = 0; m < n; m++) s += ceil(I[i], sp[0] + (sp[1] - sp[0]) * (m + 0.5) / n); vol += s * (sp[1] - sp[0]) / n * dx * k; }
  const gl = glass.reduce((s, q) => s + Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) * (q[2][2] + q[3][2]) / 2, 0);
  const glEnd = endGlass.reduce((s, L) => { let a = 0; L.forEach((p, k) => { const q = L[(k + 1) % L.length]; a += p[1] * q[2] - q[1] * p[2]; }); return s + Math.abs(a) / 2; }, 0);
  // buralish o'lchovi: kesimda bitta y ustida eng ko'p sirt qatlami (≥ 3 — sirt o'z ostiga qaytgan)
  let layers = 1; SEC.forEach((S, i) => { if (i % 5) return; const C = O[i]; for (let y = S.yf - c - r; y < S.yf + 2; y += 0.5) { let n = 0; for (let j = 0; j < nv; j++) if ((C[j][1] - y) * (C[j + 1][1] - y) < 0 && Math.max(C[j][2], C[j + 1][2]) > 0.3) n++; layers = Math.max(layers, n); } });
  const T = p => ({ x: at.x + (p[0] * co - p[1] * si) * 1000, y: at.y + (p[0] * si + p[1] * co) * 1000, z: p[2] * 1000 });
  // ---- ichki reja: qavatlar, auditoriya, koridor, zina-lift yadrolari, sanuzellar, funksional xonalar, yong'in bo'linmalari
  // Asosiy tamoyil — qobiq shaffof emas: kunduzgi yorug'lik faqat vitraj (old arkalar, o'ng uch) orqali kiradi. Shuning uchun:
  //   yorug' old zona → odamlar uzoq bo'ladigan joylar (foye, kafe, o'quv zali, ofis); qorong'i orqa zona → xizmat (yadro, sanuzel, ombor, texnik),
  //   yorug'lik kerak bo'lmagan zallar (ko'rgazma, auditoriya). Eng baland shift ostida — ikki-uch qavat balandlikdagi auditoriya (ustidagi plitalar olinadi).
  // Koridor bo'ylama: chuqur qavatda o'rtada (ikki tomonda xona), tor qavatda orqa chetda (xonalar yorug' old tomonda).
  // Zina-lift yadrosi: ikki marshli zina (pog'ona 150×300 mm, marsh eni 1,35 m) + lift; koridorga orqa tomondan yopishadi; har ≤ `core` m.
  // Sanuzel — har yadro yonida, har qavatda. Ofis va o'quv xonalari `room` m modul bilan bo'linadi, zallar bir butun qoladi.
  const floors = [], parts = [], cores = [], shChecks = []; let hall = null;
  const FN = { foye: 'Foye (kirish)', kafe: 'Kafe', korg: 'Ko‘rgazma zali', aud: 'Auditoriya', kut: 'Kutubxona o‘quv zali', ofis: 'Ofis', wc: 'Sanuzel', gard: 'Garderob', omb: 'Fond ombori / texnik', yuk: 'Yuk qabul', art: 'Sahna orti (artistlar)', tex: 'Texnik qavat', zl: 'Zina-lift' };
  const SPLIT = { ofis: 1, kut: 0 }, NEEDLIGHT = { foye: 1, kafe: 1, kut: 1, ofis: 1 };
  if (P.fh > 0) { const fh = Math.max(2.5, P.fh), clr = Math.max(2.2, P.clr), NS = 96, cor = Math.max(1.2, P.cor), X = i => P.L * (0.5 - U[i]);
    // zina geometriyasi: ko'tarilish ≤ 150 mm, pog'ona 300 mm, ikki marsh; yadro o'lchami shundan
    const nR = Math.ceil(fh * 1000 / 150), perM = Math.ceil(nR / 2), mLen = (perM - 1) * 0.3, mW = 1.35, land = 1.6, wall = 0.25, liftW = 2.4;
    const CX = 2 * wall + 2 * mW + 0.2 + 0.2 + liftW, CY = 2 * wall + mLen + 2 * land; // yadro: x bo'ylab CX, y bo'ylab CY
    // 1) qavat oraliqlari
    const IV = [];
    for (let k = 0; k < 40; k++) { const z = k * fh; const iv = []; let any = false;
      for (let i = 0; i <= nu; i++) { const sp = hasEnd && i >= iEnd ? null : span(i); /* o'ng uch vitrajidan tashqarisi — ochiq halqa, ichki makon emas */ if (!sp) { iv.push(null); continue; } let best = null, cur = null;
        for (let m = 0; m <= NS; m++) { const y = sp[0] + (sp[1] - sp[0]) * m / NS, ok = ceil(I[i], y) - z >= clr; if (ok) { if (!cur) cur = [y, y]; cur[1] = y; } if (!ok || m === NS) { if (cur && (!best || cur[1] - cur[0] > best[1] - best[0])) best = cur; cur = null; } }
        iv.push(best && best[1] - best[0] > 3 ? best : null); if (best) any = true; }
      if (!any) break; IV.push(iv); }
    const runsOf = iv => { const R = []; let r0 = null; for (let i = 0; i <= nu + 1; i++) { const on = i <= nu && iv[i]; if (on && r0 === null) r0 = i; if (!on && r0 !== null) { if (i - 1 - r0 >= 2) R.push([r0, i - 1]); r0 = null; } } return R; };
    const smooth = iv => runsOf(iv).forEach(([i0, i1]) => { const sm2 = iv.slice(i0, i1 + 1).map((_, q0) => { let a2 = 0, b2 = 0, n2 = 0; for (let q = -3; q <= 3; q++) { const j = i0 + q0 + q; if (j < i0 || j > i1) continue; a2 += iv[j][0]; b2 += iv[j][1]; n2++; } return [a2 / n2, b2 / n2]; }); sm2.forEach((v, q0) => { const o = iv[i0 + q0]; iv[i0 + q0] = [Math.max(o[0], v[0]), Math.min(o[1], v[1])]; }); });
    IV.forEach(smooth);
    // 2) auditoriya: o'ng yarmida (u 0.5…0.97) o'rta chiziqdagi shift eng baland joy; shift ≥ audH bo'lgan uzluksiz oraliq, uzunligi ≤ audL
    if (IV.length > 1 && P.audH > 0) { const hc = i => { const sp = span(i); return sp ? ceil(I[i], (sp[0] + sp[1]) / 2) : 0; }; let ip = -1; for (let i = 0; i <= nu; i++) if (U[i] > 0.5 && U[i] < 0.97 && IV[0][i] && (ip < 0 || hc(i) > hc(ip))) ip = i;
      if (ip >= 0 && hc(ip) >= P.audH) { let a0 = ip, a1 = ip; const ok = i => i >= 0 && i <= nu && IV[0][i] && hc(i) >= 0.85 * P.audH && Math.abs(X(i) - X(ip)) <= P.audL / 2; while (ok(a0 - 1)) a0--; while (ok(a1 + 1)) a1++;
        let A = 0; for (let i = a0; i <= a1; i++) A += (IV[0][i][1] - IV[0][i][0]) * DX(i); if (A >= 400 && a1 - a0 >= 4) { hall = { i0: a0, i1: a1, area: A, h: hc(ip) }; for (let k = 1; k < IV.length; k++) for (let i = a0; i <= a1; i++) IV[k][i] = null; } } }
    // 3) qavatlar (kontur bo'laklari)
    IV.forEach((iv, k) => { const z = k * fh, fl = { k, z, polys: [], area: 0, rooms: [], corr: [], runs: [] };
      runsOf(iv).forEach(([i0, i1]) => { let A = 0; for (let i = i0; i <= i1; i++) A += (iv[i][1] - iv[i][0]) * DX(i) * ((i === i0 || i === i1) ? 0.5 : 1); if (A < 80) { for (let i = i0; i <= i1; i++) iv[i] = null; return; }
        const poly = []; for (let i = i0; i <= i1; i++) poly.push([X(i), iv[i][0], z]); for (let i = i1; i >= i0; i--) poly.push([X(i), iv[i][1], z]); fl.polys.push(poly); fl.area += A; fl.runs.push([i0, i1]); });
      if (fl.area > 0 && floors.length === k) floors.push(fl); });
    const inHall = i => hall && i >= hall.i0 && i <= hall.i1;
    // koridor: chuqur — o'rtada; tor — orqa chetda (xonalar yorug' old tomonda); juda tor — koridorsiz zal
    const corLine = (iv, i) => { if (!iv[i]) return null; const [ya, yb] = iv[i], d = yb - ya; if (d >= 2 * 6 + cor) { const m = ya + Math.min(0.5 * d, Math.max(9, 0.42 * d)); return { two: true, c0: m - cor / 2, c1: m + cor / 2 }; } if (d >= cor + 4) return { two: false, c0: yb - cor, c1: yb }; return null; };
    // yorug'lik: shu qatorda vitraj tepasi qavatdan ≥ 2,2 m baland; yoki o'ng uch vitrajidan ≤ 12 m
    const lit = (i, z) => { const g = i < (hasEnd ? iEnd : nu) ? gtop(i) : null; if (g && g[2] > z + 2.2) return true; return hasEnd && i <= iEnd && X(i) - X(iEnd) < 12 && ceil(I[iEnd], 0) > z + 2.2; };
    const glassRuns = (() => { const R = []; let r0 = null; for (let i = 0; i <= nu + 1; i++) { const on = i <= nu && lit(i, 0); if (on && r0 === null) r0 = i; if (!on && r0 !== null) { R.push([r0, i - 1]); r0 = null; } } return R.sort((a, b) => (X(a[0]) - X(a[1])) < (X(b[0]) - X(b[1])) ? 1 : -1); })();
    const mainGlass = glassRuns[0] || null, cafeGlass = glassRuns[1] || null;
    // 4) yadrolar: 1-qavatda bo'ylama har ≤ core m; koridorning orqa tomonida (sig'masa — old tomonda); auditoriya oralig'iga kirmaydi
    const place = (xc, k0) => { const rows = []; for (let i = 0; i <= nu; i++) if (X(i) <= xc + CX / 2 && X(i) >= xc - CX / 2) rows.push(i); if (!rows.length || rows.some(inHall)) return null;
      const ic = rows[Math.floor(rows.length / 2)], cl = corLine(IV[k0], ic); if (!cl) return null;
      const frontOk = !rows.some(i => lit(i, 0)); /* yorug' old zonaga (foye) yadro qo'yilmaydi */
      for (const y0 of (cl.two ? [cl.c1].concat(frontOk ? [cl.c0 - CY] : []) : (frontOk ? [cl.c0 - CY] : []))) { let top = -1; for (let k = 0; k < floors.length; k++) { if (rows.every(i => IV[k][i] && IV[k][i][0] <= y0 + 0.01 && IV[k][i][1] >= y0 + CY - 0.01)) top = k; else break; }
        if (top >= k0) { const zTop = Math.min(floors[top].z + fh - 0.3, ...rows.map(i => Math.min(ceil(I[i], y0), ceil(I[i], y0 + CY / 2), ceil(I[i], y0 + CY)) - 0.5)); return { xc, y0, top, rows, z1: Math.max(floors[top].z + clr, zTop) }; } }
      return null; };
    const addCore = c => { const { xc, y0 } = c, x0 = xc - CX / 2, x1 = xc + CX / 2; c.n = cores.length + 1; c.rect = [[x1, y0], [x0, y0], [x0, y0 + CY], [x1, y0 + CY]];
      // zina marshlari (x bo'ylab yonma-yon, y bo'ylab yo'nalgan), maydonchalar, lift shaxtasi
      const sx = x1 - wall; c.flights = [[sx - mW, y0 + wall + land, sx, y0 + wall + land + mLen], [sx - 2 * mW - 0.2, y0 + wall + land, sx - mW - 0.2, y0 + wall + land + mLen]]; c.steps = perM;
      c.lift = [x0 + wall, y0 + wall, x0 + wall + liftW, y0 + wall + liftW]; cores.push(c); };
    if (floors.length) floors[0].runs.forEach(([i0, i1]) => { const segs = []; let s0 = i0; for (let i = i0; i <= i1 + 1; i++) { const br = i > i1 || inHall(i); if (br) { if (i - 1 - s0 >= 3) segs.push([s0, i - 1]); s0 = i + 1; } }
      segs.forEach(([a0, a1]) => { const xa = X(a0), xb = X(a1), Lr = xa - xb; if (Lr < CX + 4) return; const nC = Math.max(1, Math.ceil(Lr / Math.max(15, P.core)));
        for (let q = 0; q < nC; q++) { const xt = xa - Lr * (q + 0.5) / nC; let c = null; for (let d = 0; d <= 12 && !c; d += 1.5) c = place(xt - d, 0) || place(xt + d, 0); if (c) addCore(c); } }); });
    // yuqori qavat bo'lagiga yadro yetmasa — shu bo'lak ichida pastdan yetib keladigan joy
    floors.forEach((fl, k) => { if (!k) return; fl.runs.forEach(([i0, i1]) => { if (cores.some(C => C.top >= k && C.xc <= X(i0) && C.xc >= X(i1))) return; let best = null;
      for (let i = i0; i <= i1; i++) { const xc = X(i); if (cores.some(C => Math.abs(C.xc - xc) < (C.top >= k ? 15 : CX + 2))) continue; const c = place(xc, k); if (c && (!best || Math.abs(i - (i0 + i1) / 2) < Math.abs(best.i - (i0 + i1) / 2))) best = Object.assign(c, { i }); }
      if (best) addCore(best); }); });
    // 5) xonalar: har qator va tomon uchun funksiya; bir xil funksiyali qo'shni qatorlar bir xona (ofis — modul bilan bo'linadi)
    floors.forEach((fl, fk) => { const iv = IV[fl.k], z = fl.z, last = fk === floors.length - 1;
      const coreAt = i => cores.find(C => C.top >= fl.k && X(i) <= C.xc + CX / 2 + 1e-6 && X(i) >= C.xc - CX / 2 - 1e-6);
      const coreSide = C => C.y0 >= (corLine(iv, C.rows[Math.floor(C.rows.length / 2)]) || { c1: 1e9 }).c1 - 0.01 ? 'orqa' : 'old';
      const label = (i, side0, two) => { if (fl.k === 0 && inHall(i)) return 'aud'; const side = side0.replace(/[23]$/, ''), C = coreAt(i), onC = C && coreSide(C) === side; if (onC && side0 === side) return 'zl'; if (onC && /2$/.test(side0)) return 'wc'; const L = lit(i, z);
        if (side === 'orqa') { if (fl.k === 0) { if (mainGlass && Math.abs(X(i) - (X(mainGlass[0]) + X(mainGlass[1])) / 2) < 5) return 'gard'; if (hall && !inHall(i) && Math.min(Math.abs(X(i) - X(hall.i0)), Math.abs(X(i) - X(hall.i1))) < 16) return 'art'; const rn = fl.runs.find(r => i >= r[0] && i <= r[1]); if (rn && mainGlass) { const ends = [rn[0], rn[1]].filter(e => !hall || Math.min(Math.abs(X(e) - X(hall.i0)), Math.abs(X(e) - X(hall.i1))) > 20); const far = ends.sort((a, b) => Math.abs(X(b) - X(mainGlass[0])) - Math.abs(X(a) - X(mainGlass[0])))[0]; if (far === undefined) return 'omb'; if (Math.abs(X(i) - X(far)) < 12) return 'yuk'; } return 'omb'; } /* garderob — foye ro'parasida, ~10 m */ if (last && fl.area < 800) return 'tex'; return 'korg'; }
        // old (yorug') tomon
        if (fl.k === 0) { if (mainGlass && i >= mainGlass[0] && i <= mainGlass[1]) { const hx2 = hall ? (X(hall.i0) + X(hall.i1)) / 2 : X(nu), far = Math.abs(X(mainGlass[0]) - hx2) > Math.abs(X(mainGlass[1]) - hx2) ? mainGlass[0] : mainGlass[1]; if (X(mainGlass[0]) - X(mainGlass[1]) > 30 && Math.abs(X(i) - X(far)) < 14) return 'kafe'; return 'foye'; } /* kafe — asosiy vitrajning auditoriyadan uzoq uchida, yorug' */ if (cafeGlass && L && i >= cafeGlass[0] && i <= cafeGlass[1] && !inHall(i)) return 'kafe'; return L ? 'foye' : 'korg'; }
        if (last && fl.area < 800) return 'tex'; if (!L) return 'korg'; return fl.k === 1 ? 'kut' : 'ofis'; };
      // yong'in bo'linmasi chegaralari (qatorlar bo'yicha yig'ma maydon)
      const fireAt = new Set(); fl.comps = 1;
      const modOf = i => Math.floor((X(fl.runs.find(r => i >= r[0] && i <= r[1])[0]) - X(i)) / Math.max(4, P.room));
      fl.runs.forEach(([i0, i1]) => {
        const cl = []; for (let i = i0; i <= i1; i++) cl.push(inHall(i) && fl.k === 0 ? null : corLine(iv, i)); const C_ = i => cl[i - i0];
        // koridor ko'pburchagi (auditoriyada uziladi)
        { let s0 = null; const flush = e => { if (s0 === null) return; if (e - s0 >= 2) { const pp = []; for (let i = s0; i <= e; i++) pp.push([X(i), C_(i).c0, z]); for (let i = e; i >= s0; i--) pp.push([X(i), C_(i).c1, z]); fl.corr.push(pp); } s0 = null; };
          for (let i = i0; i <= i1; i++) { if (C_(i)) { if (s0 === null) s0 = i; } else flush(i - 1); } flush(i1); }
        // tomonlar: old (ya → c0), orqa (c1 → yb); koridorsiz qatorda — bitta «old» (ya → yb)
        // tomon y-oralig'i; yadro qatorlarida tomon uchga bo'linadi: S — yadro, S2 — sanuzel (yadro ortida ≤ 6 m), S3 — qolgani (oddiy funksiya)
        const baseY = (i, sd) => { const c = C_(i), [ya, yb] = iv[i]; if (!c) return sd === 'old' ? [ya, yb] : null; if (sd === 'old') return [ya, c.c0]; return c.two ? [c.c1, yb] : null; };
        const sideY = (i, side) => { const sd = side.slice(0, side.length - (/[23]$/.test(side) ? 1 : 0)), part = /2$/.test(side) ? 2 : /3$/.test(side) ? 3 : 1, B = baseY(i, sd); if (!B) return null;
          const C = coreAt(i), on = C && coreSide(C) === sd; if (!on) return part === 1 ? B : null;
          const back = sd === 'orqa', y0 = C.y0, y1 = C.y0 + CY; let r;
          if (part === 1) r = [Math.max(B[0], y0), Math.min(B[1], y1)]; else if (part === 2) r = back ? [y1, Math.min(B[1], y1 + 6)] : [Math.max(B[0], y0 - 6), y0]; else r = back ? [y1 + 6, B[1]] : [B[0], y0 - 6];
          return r[1] - r[0] > 1.5 ? r : null; };
        // qator × tomon funksiyalari; 4 m dan qisqa «qoldiq» bo'laklar qo'shnisiga qo'shiladi (mayda xonalar bo'lmasin)
        const SIDES = ['old', 'old2', 'old3', 'orqa', 'orqa2', 'orqa3'], FIX = { wc: 1, zl: 1, aud: 1 }, LB = {};
        SIDES.forEach(sd => { const A2 = LB[sd] = {}; for (let i = i0; i <= i1; i++) A2[i] = sideY(i, sd) ? label(i, sd, !!(C_(i) && C_(i).two)) : null;
          let j = i0; while (j <= i1) { if (A2[j] === null) { j++; continue; } let e = j; while (e + 1 <= i1 && A2[e + 1] === A2[j]) e++; if (X(j) - X(e) < 4 && !FIX[A2[j]]) { const pv = j > i0 ? A2[j - 1] : null, nx = e < i1 ? A2[e + 1] : null, rep = pv && !FIX[pv] ? pv : nx && !FIX[nx] ? nx : null; if (rep) for (let q = j; q <= e; q++) A2[q] = rep; } j = e + 1; } });
        // yong'in bo'linmasi chegaralari: yig'ma maydon `fire` dan oshsa — oxirgi funksiya almashgan qatorda (bo'lmasa shu qatorda)
        { const chg = i => SIDES.some(sd => LB[sd][i] !== LB[sd][i + 1]); const ra = i => (iv[i][1] - iv[i][0]) * DX(i); let acc = 0, cand = -1, last = i0 - 1;
          for (let i = i0; i <= i1; i++) { acc += ra(i); if (i < i1 && chg(i)) cand = i; if (acc > P.fire && i < i1 - 2) { const b = cand > last ? cand : i; fireAt.add(b); fl.comps++; last = b; cand = -1; acc = 0; for (let q = b + 1; q <= i; q++) acc += ra(q); } } }
        SIDES.forEach(side => { let g0 = null, gl = null; const close = (e) => { if (g0 === null) return; const a0 = g0, a1 = e; const rp = []; for (let i = a0; i <= a1; i++) rp.push([X(i), sideY(i, side)[0], z]); for (let i = a1; i >= a0; i--) rp.push([X(i), sideY(i, side)[1], z]);
            let ra = 0; for (let i = a0; i <= a1; i++) { const s = sideY(i, side); ra += (s[1] - s[0]) * DX(i) * (i === a0 || i === a1 ? 0.5 : 1); } const im = Math.round((a0 + a1) / 2), sm = sideY(im, side);
            if (ra > 8 || (gl === 'wc' && ra > 4)) fl.rooms.push({ n: fl.rooms.length + 1, fn: gl, name: FN[gl], side: (C_(im) ? side.replace(/[23]$/, '') : 'zal'), poly: rp, area: +ra.toFixed(1), lit: side.startsWith('old') && lit(im, z), c: [(X(a0) + X(a1)) / 2, (sm[0] + sm[1]) / 2, z] });
            // xona chegarasidagi to'siq (shu tomon kengligida); bo'lak oxirida emas
            if (a1 < i1 && sideY(a1, side)) { const ys = sideY(a1, side), pts = []; for (let m = 0; m <= 12; m++) { const y = ys[0] + 0.15 + (ys[1] - ys[0] - 0.3) * m / 12; pts.push([X(a1), y, (inHall(a1) || inHall(a1 + 1)) && fl.k === 0 ? ceil(I[a1], y) - 0.1 : Math.min(z + fh - 0.3, ceil(I[a1], y))]); } const pt = pts.concat([[X(a1), ys[1] - 0.15, z], [X(a1), ys[0] + 0.15, z]]); pt.fire = fireAt.has(a1); pt.k = fl.k; parts.push(pt); }
            g0 = null; };
          for (let i = i0; i <= i1; i++) { const s = sideY(i, side); if (!s) { close(i - 1); continue; } const lb = LB[side][i];
            const brk = g0 !== null && (lb !== gl || fireAt.has(i - 1) || (SPLIT[lb] && modOf(i) !== modOf(i - 1)));
            if (brk) close(i - 1); if (g0 === null) { g0 = i; gl = lb; } }
          close(i1); });
        // yong'in devori koridorni ham kesadi (yong'in eshigi bilan)
        fireAt.forEach(i => { if (i < i0 || i > i1 || !C_(i)) return; const c = C_(i), pts = [[X(i), c.c0, Math.min(z + fh - 0.3, ceil(I[i], c.c0))], [X(i), c.c1, Math.min(z + fh - 0.3, ceil(I[i], c.c1))], [X(i), c.c1, z], [X(i), c.c0, z]]; pts.fire = true; pts.k = fl.k; pts.door = true; parts.push(pts); });
      });
      fl.area = Math.round(fl.area); fl.net = Math.round(fl.rooms.filter(r => r.fn !== 'zl').reduce((s2, r) => s2 + r.area, 0)); fl.corA = Math.round(fl.corr.reduce((s2, pp) => { let a3 = 0; pp.forEach((p, q) => { const t2 = pp[(q + 1) % pp.length]; a3 += p[0] * t2[1] - t2[0] * p[1]; }); return s2 + Math.abs(a3) / 2; }, 0));
      // tekshiruvlar
      fl.runs.forEach(([i0, i1]) => { const xa = X(i0), xb = X(i1), cs = cores.filter(C => C.top >= fl.k && C.xc <= xa + 1e-6 && C.xc >= xb - 1e-6), rs = fl.rooms.filter(r => r.c[0] <= xa + 1e-6 && r.c[0] >= xb - 1e-6), ar = Math.round(rs.reduce((s2, r) => s2 + r.area, 0));
        if (fl.k === 0) return; // 1-qavat: chiqish — vitraj eshiklari orqali tashqariga
        if (!cs.length) { shChecks.push([ar > 300 ? 'FAIL' : 'WARN', `${fl.k + 1}-qavat, ${xb.toFixed(0)}…${xa.toFixed(0)} m bo'lagi (${ar} m²): zina-lift yadrosi sig'maydi — chiqish yo'q`]); return; }
        const far = rs.reduce((m, r) => Math.max(m, Math.min(...cs.map(C => Math.abs(r.c[0] - C.xc) + Math.abs(r.c[1] - (C.y0 + CY / 2))))), 0); if (far > P.evac) shChecks.push(['WARN', `${fl.k + 1}-qavat: eng uzoq xonadan zinagacha ≈ ${far.toFixed(0)} m > ${P.evac} m (evac parametri)`]); });
      fl.rooms.filter(r => NEEDLIGHT[r.fn] && !r.lit).forEach(r => shChecks.push(['WARN', `${fl.k + 1}-qavat, ${r.name} ${r.n}: kunduzgi yorug'lik yo'q`]));
      if (!fl.rooms.some(r => r.fn === 'wc') && fl.rooms.some(r => r.fn !== 'tex')) shChecks.push(['WARN', `${fl.k + 1}-qavat: sanuzel yo'q (yadro yo'q yoki sig'madi)`]);
    });
    if (hall) { const ends = [X(hall.i0), X(hall.i1)]; const ex = cores.filter(C => Math.min(...ends.map(e => Math.abs(C.xc - e))) < 20).length + (glassRuns.some(([a, b]) => a <= hall.i1 && b >= hall.i0) ? 1 : 0);
      hall.seats = Math.floor(hall.area * 0.75 / 0.9); hall.exits = ex; hall.x0 = X(hall.i0); hall.x1 = X(hall.i1);
      if (ex < 2) shChecks.push(['WARN', `Auditoriya (${Math.round(hall.area)} m², ~${hall.seats} o'rin): chiqishlar ${ex} ta — kamida 2 ta kerak`]); }
    // sahna va o'rindiq qatorlari (rejada): sahna o'ng (x kichik) uchida, qatorlar 0,9 m qadam bilan, orqaga ko'tariladi
    if (hall) { const iv = IV[0]; hall.rows = []; const xs = X(hall.i1) + 0, xe = X(hall.i0); const stage = Math.min(10, 0.22 * (xe - xs)); hall.stage = [xs, xs + stage];
      for (let x = xs + stage + 2; x < xe - 1.5; x += 0.9) { let i = hall.i0; while (i < hall.i1 && X(i + 1) >= x) i++; const [ya, yb] = iv[i]; hall.rows.push([x, ya + 1.5, yb - 1.5, 0.15 * (x - xs - stage)]); }
      hall.poly = []; for (let i = hall.i0; i <= hall.i1; i++) hall.poly.push([X(i), iv[i][0], 0]); for (let i = hall.i1; i >= hall.i0; i--) hall.poly.push([X(i), iv[i][1], 0]); }
  }
  const Hmax = Math.max(...O.flat().map(p => p[2]));
  return { e, P, nu, nv, O: O.map(rw => rw.map(T)), I: I.map(rw => rw.map(T)), glass: glass.map(q => q.map(T)), endGlass: endGlass.map(q => q.map(T)), lift: SEC.map(S => S.a), layers, floors: floors.map(F => ({ k: F.k, z: F.z * 1000, area: F.area, net: F.net, corA: F.corA, comps: F.comps, polys: F.polys.map(L => L.map(T)), corr: F.corr.map(L => L.map(T)), rooms: F.rooms.map(r => ({ n: r.n, fn: r.fn, name: r.name, side: r.side, lit: r.lit, area: r.area, poly: r.poly.map(T), c: T(r.c) })) })), parts: parts.map(L => { const m = L.map(T); m.fire = L.fire; m.k = L.k; m.door = L.door; return m; }), cores: cores.map(C => { const R4 = (q, zz) => [[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]].map(p => T([p[0], p[1], zz || 0])); return { n: C.n, top: C.top, z1: C.z1 * 1000, steps: C.steps, poly: C.rect.map(p => T([p[0], p[1], 0])), flights: C.flights.map(f => R4(f)), lift: R4(C.lift) }; }), hall: hall && { area: Math.round(hall.area), seats: hall.seats, exits: hall.exits, h: +hall.h.toFixed(1), poly: hall.poly.map(T), stage: hall.stage, rows: hall.rows.map(r => ({ a: T([r[0], r[1], r[3]]), b: T([r[0], r[2], r[3]]) })), stagePoly: (() => { const iv = hall.poly; return null; })() }, checks: shChecks, gfa: floors.reduce((a, F) => a + F.area, 0), nRooms: floors.reduce((a, F) => a + F.rooms.length, 0), H: +Hmax.toFixed(1), area: Math.round(area), foot: Math.round(foot), vol: Math.round(vol), glassA: Math.round(gl + glEnd) };
}

// ---------- hisob
function analyze(M) {
  levelZ(M);
  const C = []; const chk = (id, st, msg, src) => C.push({ id, status: st, msg, src: src || '' });
  const levels = {};
  M.levels.forEach(L => {
    const wallsAll = M.el.filter(e => e.cat === 'wall' && e.level === L.id).flatMap(w => w.arc ? arcSegs(M, w) : [Object.assign({ w }, wallGeom(M, w))]);
    wallsAll.filter(g => !g.ok).forEach(g => chk('B1', 'WARN', `${g.w.id}: o‘qqa bog‘lanish uzildi (o‘q o‘chirilgan) — oxirgi joyida qoldi`, 'model'));
    const walls = wallsAll.filter(g => g.L >= 10);
    joinWalls(walls);
    const G = planarGraph(walls);
    G.overlap.forEach(([a, b]) => chk('W2', 'WARN', `${L.name}: ${a} va ${b} devorlari ustma-ust tushgan`, 'model'));
    const rooms = [], outer = [];
    G.faces.forEach(f => { const P = f.map(unkey), a = polyArea(P); if (a > 1) rooms.push({ f, P, a }); else if (a < -1) outer.push(P); });
    const zones = M.el.filter(e => e.cat === 'zone' && e.level === L.id).map(z => Object.assign({ z }, resolve(M, z.p)));
    const roomData = rooms.map((r, i) => {
      const np = netPoly(r.f, G.edges); let net = np.poly.length ? polyArea(np.poly) : 0; const inv = net <= 0 || net > r.a + 1;
      np.stubs.forEach(st => { if (st.E && np.poly.length) net -= clipLen(st.u, st.v, np.poly) * (st.E.hi - st.E.lo); });
      let peri = 0; r.P.forEach((p, k) => peri += V.len(V.sub(r.P[(k + 1) % r.P.length], p)));
      const cx = r.P.reduce((s, p) => s + p.x, 0) / r.P.length, cy = r.P.reduce((s, p) => s + p.y, 0) / r.P.length;
      const inner = rooms.filter(q => q !== r && Math.abs(q.a) < Math.abs(r.a) && inPoly(q.P[0], r.P)).map(q => q.P), lab = labelPt(r.P, inner, { x: cx, y: cy });
      const zIn = zones.filter(q => inPoly(q, r.P) && !inner.some(H => inPoly(q, H))), z = zIn[zIn.length - 1]; if (zIn.length > 1) chk('Z1', 'INFO', `${L.name}: bir xonada ${zIn.length} ta zona (${zIn.map(q => q.z.id + ' «' + q.z.name + '»').join(', ')}) — oxirgisi olindi; ortiqchasini o‘chiring`, 'model'); // zona nuqtasi ichki xonada (yadro) bo'lsa — o'sha xonaniki
      if (inv) { net = 0; chk('R1', 'WARN', `${L.name}, xona ${i + 1}: devorlar orasida bo‘sh joy qolmagan (juda tor yoki o‘tkir burchak)`, 'model'); }
      return { n: i + 1, poly: r.P, netPoly: np.poly, gross: +(r.a / 1e6).toFixed(2), net: +(Math.max(0, net) / 1e6).toFixed(2), peri: +(peri / 1000).toFixed(2), cx: lab.x, cy: lab.y, name: z ? z.z.name : '' };
    });
    const stairs = M.el.filter(e => e.cat === 'stair' && e.level === L.id).map(s => stairGeom(M, s, L));
    const openings = M.el.filter(e => (e.cat === 'window' || e.cat === 'door') && e.level === L.id).map(o => { const T = TYPES[o.cat][o.type]; let h = walls.find(g => g.w.id === o.host); if (h && h.w.arc) { const hs = walls.find(g => g.w.id === o.host && g.op === o.id); if (!hs) return Object.assign({ o, bad: true, arc: true, arcOut: true }); return { o, T, host: hs, arcHost: true, c: V.add(hs.a, V.mul(hs.u, hs.L / 2)), s0: hs.L / 2 - T.w / 2, s1: hs.L / 2 + T.w / 2 }; }
      if (!h) return Object.assign({ o, bad: true }); return { o, T, host: h, c: V.add(h.a, V.mul(h.u, o.s)), s0: o.s - T.w / 2, s1: o.s + T.w / 2 }; });
    const columns = M.el.filter(e => e.cat === 'column' && e.level === L.id).map(c => { const p = resolve(M, c.p), T = TYPES.column[c.type], a = (c.rot || 0) * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
      return { c, p, T, poly: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => ({ x: p.x + i * T.b / 2 * co - j * T.d / 2 * si, y: p.y + i * T.b / 2 * si + j * T.d / 2 * co })) }; });
    const outerArea = outer.reduce((s, P) => s + Math.abs(polyArea(P)), 0) / 1e6;
    const holesAll = M.el.filter(e => e.cat === 'hole' && e.level === L.id).map(h => ({ h, poly: h.pts.map(p => resolve(M, p)) }));
    const slabs = M.el.filter(e => e.cat === 'slab' && e.level === L.id).map(sl => { const poly = sl.pts.map(p => resolve(M, p)), holes = holesAll.filter(h => h.h.host === sl.id); const A0 = Math.abs(polyArea(poly)) / 1e6, Ah = holes.reduce((s, h) => s + Math.abs(polyArea(h.poly)), 0) / 1e6;
      holes.forEach(h => { if (!h.poly.every(p => inPoly(p, poly))) chk('S2', 'WARN', `${h.h.id}: teshik ${sl.id} plitasidan chiqib ketgan`, 'model'); }); return { s: sl, poly, holes, area: +(A0 - Ah).toFixed(2), t: sl.t, V: +((A0 - Ah) * sl.t / 1000).toFixed(2) }; });
    const beams = M.el.filter(e => e.cat === 'beam' && e.level === L.id).map(bm => { const g = geomPts({ type: null, ref: 'c', __b: TYPES.beam[bm.type].b }, resolve(M, bm.a), resolve(M, bm.b)); return Object.assign(g, { bm, T: TYPES.beam[bm.type] }); });
    beams.forEach(g => { const half = g.T.b / 2; g.body = [V.add(g.a, V.mul(g.n, -half)), V.add(g.b, V.mul(g.n, -half)), V.add(g.b, V.mul(g.n, half)), V.add(g.a, V.mul(g.n, half))]; g.t = g.T.b;
      const sup = p => walls.some(w => TYPES.wall[w.w.type].bearing && inPoly(p, (w.poly || w.body))) || columns.some(c => inPoly(p, c.poly)) || walls.some(w => TYPES.wall[w.w.type].bearing && onSeg(p, w.a, w.b, w.t / 2 + 50));
      const bad = [g.a, g.b].filter(p => !sup(p)).length; if (bad) chk('BM1', 'FAIL', `${g.bm.id}: to‘sinning ${bad} ta uchi tayanchsiz (yuk ko‘taruvchi devor yoki ustunga tushmaydi)`, 'konstruktiv'); });
    const footings = M.el.filter(e => e.cat === 'footing' && e.level === L.id).map(f => { const p = resolve(M, f.p); return { f, p, poly: [{ x: p.x - f.b / 2, y: p.y - f.l / 2 }, { x: p.x + f.b / 2, y: p.y - f.l / 2 }, { x: p.x + f.b / 2, y: p.y + f.l / 2 }, { x: p.x - f.b / 2, y: p.y + f.l / 2 }], V: +(f.b * f.l * f.d / 1e9).toFixed(2) }; });
    const dims = M.el.filter(e => e.cat === 'dim' && e.level === L.id).map(d => ({ d, a: resolve(M, d.a), b: resolve(M, d.b) })), lines2d = M.el.filter(e => e.cat === 'line' && e.level === L.id).map(e => ({ ln: e, pts: e.pts.map(p => resolve(M, p)) })), texts = M.el.filter(e => e.cat === 'text' && e.level === L.id).map(x => Object.assign({ tx: x }, resolve(M, x.p)));
    // avtomatik pol plitasi: tashqi kontur − pastki qavat zinasi teshigi (zina pastdan shu qavat poligacha chiqadi)
    const prevL = M.levels[M.levels.indexOf(L) - 1], stairsBelow = prevL && levels[prevL.id] ? levels[prevL.id].stairs : [];
    const slabAuto = +(outerArea - stairsBelow.reduce((s, q) => s + q.holeArea, 0)).toFixed(2);
    levels[L.id] = { L, walls, graph: G, rooms: roomData, outer, stairs, openings, columns, zones, slabs, holes: holesAll, beams, footings, dims, texts, lines2d, stairsBelow, slabArea: slabs.length ? +slabs.reduce((s, q) => s + q.area, 0).toFixed(2) : slabAuto };
    // ---- tekshiruvlar
    if (walls.length && !rooms.length) chk('S1', 'FAIL', `${L.name}: devorlar yopiq kontur hosil qilmaydi — plita va xonalar chiqmaydi`, 'model');
    let dangling = 0; G.adj.forEach(nb => { if (nb.length === 1) dangling++; }); if (dangling) chk('G1', 'WARN', `${L.name}: ${dangling} ta devor uchi hech narsaga tutashmagan`, 'model');
    openings.forEach(O => {
      if (O.bad) { chk(O.arc ? 'O1' : 'O0', 'FAIL', O.arc ? `${O.o.id}: egri devor ${O.o.host} chetidan chiqib ketadi yoki boshqa teshik bilan ustma-ust` : `${O.o.id}: xost devor yo‘q`, 'model'); return; }
      if (O.arcHost) { const W0 = M.el.find(e => e.id === O.o.host), T2 = O.host.t / 2, Lw = walls.filter(g => g.w.id === O.o.host).reduce((q, g) => q + g.L, 0); if (O.o.s - O.T.w / 2 < T2 || O.o.s + O.T.w / 2 > Lw - T2) chk('O1', 'FAIL', `${O.o.id} egri devor ${W0.id} chetiga juda yaqin`, 'model'); return; }
      const h = O.host, adj = P => Math.max(h.t / 2, ...walls.filter(q => q !== h && q.w.id !== h.w.id && (V.len(V.sub(q.a, P)) < 5 || V.len(V.sub(q.b, P)) < 5 || onSeg(P, q.a, q.b, 5))).map(q => q.t / 2)), cA = adj(h.a), cB = adj(h.b);
      if (O.s0 < cA || O.s1 > h.L - cB) chk('O1', 'FAIL', `${O.o.id} (${O.o.type}) devor ${h.w.id} chetidan yoki burchakdagi qo‘shni devor ichiga kirib ketadi (bo‘sh joy: ${Math.round(Math.max(0, h.L - cA - cB))} mm)`, 'model');
      const cross = M.grids.filter(g => { const c = V.cross(h.u, g.d); if (Math.abs(c) < 1e-9) return false; const x = lineX(h.a, h.u, g.p, g.d), s = V.dot(V.sub(x, h.a), h.u); return s > O.s0 - 150 && s < O.s1 + 150 && s > 0 && s < h.L; });
      if (cross.length) chk('O2', 'FAIL', `${O.o.id}: ${cross.map(c => c.name).join(', ')}-o‘q teshik ichidan o‘tadi`, 'konstruktiv-oqlar T2');
      openings.filter(Q => Q !== O && !Q.bad && Q.o.host === O.o.host).forEach(Q => { if (Math.abs(Q.o.s - O.o.s) < (O.T.w + Q.T.w) / 2 + 300 && O.o.id < Q.o.id) chk('O3', 'FAIL', `${O.o.id} va ${Q.o.id} ustma-ust (oraliq < 0,3 m)`, 'A'); });
    });
    roomData.forEach(r => { if (r.net < 2) chk('R0', 'WARN', `${L.name}, xona ${r.n}: ${r.net} m² — juda kichik`, 'A'); });
    stairs.forEach(s => { if (!s.fits) chk('ST1', 'FAIL', `${L.name}: zina (${(s.len / 1000).toFixed(2)}×${(s.wid / 1000).toFixed(2)} m) joyga sig‘maydi (${(s.bx / 1000).toFixed(2)}×${(s.by / 1000).toFixed(2)} m)`, 'P: marsh eni 1,05; maydoncha 1,3'); });
  });
  const forms = M.el.filter(e => e.cat === 'form').map(e => formGeom(M, e)), shells = M.el.filter(e => e.cat === 'shell').map(e => shellGeom(M, e)), bars = M.el.filter(e => e.cat === 'bar').map(e => barGeom(M, e)), rings = M.el.filter(e => e.cat === 'ring').map(e => ringGeom(M, e)), ovals = M.el.filter(e => e.cat === 'oval').map(e => ovalGeom(M, e)); const mods = M.el.filter(e => MODS[e.cat]).map(e => modGeom(M, e));
  // vertikal uzluksizlik (ShNQ 2.01.06-25, 34-band): yuqoridagi yuk ko‘taruvchi qirra ostida yuk ko‘taruvchi qirra yoki ikki uchida ustun
  for (let i = 1; i < M.levels.length; i++) {
    const up = levels[M.levels[i].id], dn = levels[M.levels[i - 1].id]; let bad = 0;
    const colAt = k => dn.columns.some(c => key(c.p) === k);
    // tayanch: ostida yuk ko'taruvchi qirra, ikki uchida ustun yoki to'sin. Aks holda — konsol (pastki tayanchdan ≤ cMax va plita ustida) yoki tayanchsiz
    const cMax = M.cMax != null ? M.cMax : 3000, pt = q => { const [x, y] = q.split(',').map(Number); return { x, y }; }, dSeg = (p, a, b) => { const d = V.sub(b, a), L2 = V.dot(d, d) || 1, t = Math.max(0, Math.min(1, V.dot(V.sub(p, a), d) / L2)); return V.len(V.sub(p, V.add(a, V.mul(d, t)))); };
    const supSegs = []; dn.graph.edges.forEach((E, k) => { if (TYPES.wall[E.g.w.type].bearing) { const [u, v] = k.split('|'); supSegs.push([pt(u), pt(v)]); } }); dn.beams.forEach(g => supSegs.push([g.a, g.b])); dn.columns.forEach(c => supSegs.push([c.p, c.p]));
    let cant = 0, cmx = 0; up.graph.edges.forEach((E, k) => { if (!TYPES.wall[E.g.w.type].bearing) return; const below = dn.graph.edges.get(k); const [u, v] = k.split('|'); if ((below && TYPES.wall[below.g.w.type].bearing) || (colAt(u) && colAt(v))) return;
      const a = pt(u), b = pt(v); { const Ln = V.len(V.sub(b, a)), n = Math.max(2, Math.ceil(Ln / 200)); let ok = true; for (let q = 0; q <= n && ok; q++) { const p = V.add(a, V.mul(V.sub(b, a), q / n)); ok = supSegs.some(([p0, p1]) => p0 !== p1 && dSeg(p, p0, p1) < 60); } if (ok) return; } if (dn.beams.some(g => dSeg(a, g.a, g.b) < g.T.b / 2 + 100 && dSeg(b, g.a, g.b) < g.T.b / 2 + 100)) return;
      const far = Math.max(...[a, b].map(p => supSegs.reduce((m, [p0, p1]) => Math.min(m, dSeg(p, p0, p1)), Infinity))), onSlab = [a, b].every(p => up.slabs.concat(dn.slabs).some(sl => inPoly(p, sl.poly) || sl.poly.some((q, i) => dSeg(p, q, sl.poly[(i + 1) % sl.poly.length]) < 250)));
      if (far <= cMax && onSlab) { cant++; cmx = Math.max(cmx, far); } else bad++; });
    if (bad) chk('V1', 'FAIL', `${M.levels[i].name}: ${bad} ta yuk ko‘taruvchi devor bo‘lagi ostida tayanch yo‘q`, 'ShNQ 2.01.06-25, 34-band');
    if (cant) chk('V3', 'WARN', `${M.levels[i].name}: ${cant} ta devor bo‘lagi konsolda (pastki tayanchdan ${(cmx / 1000).toFixed(1)} m gacha) — konsol plita yoki to‘sin hisobi kerak`, `konsol ≤ ${(cMax / 1000).toFixed(1)} m (parametr: konsol M)`);
  }
  // ---- jadvallar
  const H = M.levels.reduce((s, l) => s + l.h, 0);
  const wallRows = {}; M.levels.forEach(L => levels[L.id].walls.forEach(g => { const r = wallRows[g.w.type] || (wallRows[g.w.type] = { type: g.w.type, L: 0, A: 0, V: 0, n: 0 }); const hh = g.w.h || L.h; const openA = levels[L.id].openings.filter(o => !o.bad && o.o.host === g.w.id).reduce((s, o) => s + o.T.w * o.T.h, 0); if (!(r.ids = r.ids || new Set()).has(g.w.id)) { r.ids.add(g.w.id); r.n++; } r.L += g.L / 1000; r.A += (g.L * hh - openA) / 1e6; r.V += (g.area * hh - openA * g.t) / 1e9; }));
  Object.values(wallRows).forEach(r => { delete r.ids; r.L = +r.L.toFixed(2); r.A = +r.A.toFixed(2); r.V = +r.V.toFixed(2); });
  const opRows = {}; M.el.filter(e => e.cat === 'window' || e.cat === 'door').forEach(o => { opRows[o.type] = opRows[o.type] || { type: o.type, cat: o.cat, n: 0 }; opRows[o.type].n++; });
  const roomsTot = M.levels.reduce((s, l) => s + levels[l.id].rooms.reduce((a, r) => a + r.net, 0), 0);
  const slabTot = M.levels.reduce((s, l) => s + levels[l.id].slabArea, 0);
  const L1 = M.levels[0] && levels[M.levels[0].id];
  let found = null, strips = [];
  if (L1) { const F = M.found || { type: 'strip', w: 600, d: 1500, est: true }; strips = L1.walls.filter(g => TYPES.wall[g.w.type].bearing).map(g => Object.assign({ w: { id: 'S' + g.w.id, type: null } }, geomPts({ __b: F.w }, g.a, g.b)));
    joinWalls(strips); const area = strips.reduce((s, g) => s + g.area, 0) / 1e6; found = { type: F.type, est: !!F.est, stripL: +strips.reduce((s, g) => s + g.L, 0).toFixed(0) / 1000, w: F.w / 1000, d: F.d / 1000, area: +area.toFixed(2), V: +(area * F.d / 1000).toFixed(1) };
    if (!M.found) strips = []; }
  const pads = M.levels.flatMap(l => levels[l.id].footings); const padV = +pads.reduce((s, f) => s + f.V, 0).toFixed(2);
  const beamV = +M.levels.reduce((s, l) => s + levels[l.id].beams.reduce((a, g) => a + g.L * g.T.b * g.T.h / 1e9, 0), 0).toFixed(2);
  const slabV2 = M.levels.reduce((s, l) => { const a = levels[l.id]; return s + (a.slabs.length ? a.slabs.reduce((x, q) => x + q.V, 0) : a.slabArea * TYPES.slab.t / 1000); }, 0);
  const wallTypes = Object.keys(TYPES.wall).map(k => ({ type: k, uz: TYPES.wall[k].uz, t: thick(k), U: +uValue(k).toFixed(2), R: +(1 / uValue(k)).toFixed(2) }));
  const roofG = roofGeom(M, { levels });
  const concrete = +((wallRows.M200 ? wallRows.M200.V : 0) + slabV2 + beamV + padV + (found && !found.est ? found.V : 0)).toFixed(1);
  const summary = { strips, pads: { n: pads.length, V: padV }, beamV, slabV: +slabV2.toFixed(2), concrete, roof: roofG && { type: roofG.type, plan: roofG.plan, area: roofG.area, rise: roofG.rise, ridge: roofG.ridge }, levels: M.levels.length, H: H / 1000, rooms: +roomsTot.toFixed(2), slab: +slabTot.toFixed(2), H: H / 1000, walls: Object.values(wallRows), openings: Object.values(opRows), found, wallTypes, elements: M.el.length };
  summary.forms = forms.map(F => ({ id: F.e.id, floors: F.floors.length, H: F.H, gfa: F.gfa, facade: F.facade, terrace: F.terrace, fins: F.fins }));
  shells.forEach(S => S.checks.forEach(([st, m]) => chk(st === 'FAIL' ? 'Q2' : 'Q1', st, `${S.e.id}: ${m}`, 'qobiq — hajmiy qoralama'))); summary.shells = shells.map(S => ({ id: S.e.id, H: S.H, area: S.area, foot: S.foot, vol: S.vol, glass: S.glassA, floors: S.floors.length, gfa: S.gfa, rooms: S.nRooms, cores: S.cores.length }));
  // insolyatsiya: modeldagi boshqa binolar soyasi (boshqa «uy»lar, shakllar, qavat konturli oddiy binolar) — ikkinchi o'tish
  { const box = (b, x, y) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
    const fObs = forms.map(F => { const P2 = F.floors.flatMap(fl => fl.loops.flat()); const b = [Math.min(...P2.map(p => p.x)), Math.min(...P2.map(p => p.y)), Math.max(...P2.map(p => p.x)), Math.max(...P2.map(p => p.y))]; return { H: F.H, f: (x, y, z) => { if (!box(b, x, y)) return false; const fl = F.floors.find(q => z >= q.z && z < q.z + q.h); return !!fl && fl.loops.some(L => inPoly({ x, y }, L)); } }; });
    const lObs = M.levels.length && Object.values(levels).some(L => L.outer.length) ? [{ H: (M.levels[M.levels.length - 1].z + M.levels[M.levels.length - 1].h) / 1000, f: (x, y, z) => { const Lv = M.levels.find(l => z >= l.z && z < l.z + l.h); return !!Lv && levels[Lv.id].outer.some(P2 => inPoly({ x, y }, P2)); } }] : [];
    const mObs = mods.map(G => { const B2 = G.base; if (!B2 || B2.length < 3) return null; const bb = [Math.min(...B2.map(p => p.x)), Math.min(...B2.map(p => p.y)), Math.max(...B2.map(p => p.x)), Math.max(...B2.map(p => p.y))]; return { G, H: G.H, f: (x, y, z) => z < G.H * 1000 && box(bb, x, y) && inPoly({ x, y }, B2) }; }).filter(Boolean);
    bars.forEach(B => { const others = bars.filter(o => o !== B).map(o => ({ H: o.Hm, f: (x, y, z) => box(o.bbox, x, y) && o.inMassW(x, y, z) })).concat(fObs, lObs, mObs.map(o => ({ H: o.H, f: o.f }))); if (others.length) B.reins({ list: others.map(o => o.f), H: Math.max(...others.map(o => o.H)) }); });
    mods.forEach(G => { if (!G.reins) return; const others = mObs.filter(o => o.G !== G).map(o => ({ H: o.H, f: o.f })).concat(bars.map(o => ({ H: o.Hm, f: (x, y, z) => box(o.bbox, x, y) && o.inMassW(x, y, z) })), fObs, lObs); if (others.length) G.reins({ list: others.map(o => o.f), H: Math.max(...others.map(o => o.H)) }); }); }
  bars.forEach(B => B.checks.forEach(([st, m]) => chk(st === 'FAIL' ? 'U2' : st === 'INFO' ? 'U0' : 'U1', st, `${B.e.id}: ${m}`, 'uy — hajmiy qoralama'))); summary.bars = bars.map(B => ({ id: B.e.id, H: B.H, gfa: B.gfa, net: B.net, apts: B.nApt, floors: B.floors.length, noSun: B.apts.filter(a => a.t >= 1 && !a.insOk).length }));
  rings.forEach(G => G.checks.forEach(([st, m]) => chk(st === 'FAIL' ? 'H2' : st === 'INFO' ? 'H0' : 'H1', st, `${G.e.id}: ${m}`, 'stadion — hajmiy qoralama'))); summary.rings = rings.map(G => ({ id: G.e.id, H: G.H, gfa: G.gfa, floors: G.floors.length, lamL: G.lamL, skin: G.skinA, seats: G.seats, covP: G.covP, tEv: G.tEv, cars: G.tr.cars }));
  ovals.forEach(G => G.checks.forEach(([st, m]) => chk(st === 'FAIL' ? 'V2' : st === 'INFO' ? 'V0' : 'V1', st, `${G.e.id}: ${m}`, 'oval zal — hajmiy qoralama'))); summary.ovals = ovals.map(G => ({ id: G.e.id, H: G.H, gfa: G.gfa, floors: G.floors.length, memL: G.memL, facA: G.facA, solid: G.nSolid, seats: G.sport ? G.sport.seats : 0, tEv: G.sport ? G.sport.tEv : 0 }));
  mods.forEach(G => G.checks.forEach(([st, m]) => chk(MODS[G.kind].prefix + '·' + (st === 'FAIL' ? '2' : st === 'INFO' ? '0' : '1'), st, `${G.e.id}: ${m}`, MODS[G.kind].title + ' — hajmiy qoralama'))); summary.mods = mods.map(G => ({ id: G.e.id, kind: G.kind, H: G.H, gfa: G.gfa, floors: G.floors.length }));
  M.levels.forEach(l => balcGeom(M, { levels }, l.id).forEach(B => { if (B.bad) chk('BK0', 'WARN', `${B.e.id}: balkon devori topilmadi (o‘chirilgan yoki egri)`, 'model'); else if (!B.door) chk('BK1', 'WARN', `${l.name}: ${B.e.id} balkonga chiqish eshigi yo‘q (devorda balkon eni oralig‘ida)`, 'model'); }));
  return { levels, checks: C, summary, forms, shells, bars, rings, ovals, mods };
}

// ---------- tom: asosiy yo'nalish — yuqori qavatdagi eng uzun devor; ramkada devor tanalarining chegarasi + osilma (over)
function roofGeom(M, A) {
  if (!M.roof || !M.levels.length) return null; const top = M.levels[M.levels.length - 1], L = A.levels[top.id]; if (!L || !L.walls.length) return null;
  const z = top.z + top.h; const R = M.roof;
  if (R.type === 'flat') { const low = L.walls.filter(g => g.w.h && g.w.h < top.h - 100), dS = (p, a, b) => { const d = V.sub(b, a), L2 = V.dot(d, d) || 1, t = Math.max(0, Math.min(1, V.dot(V.sub(p, a), d) / L2)); return V.len(V.sub(p, V.add(a, V.mul(d, t)))); }; const open = r => { let lo = 0, pe = 0; r.poly.forEach((p, i) => { const q = r.poly[(i + 1) % r.poly.length], l = V.len(V.sub(q, p)), m = V.mul(V.add(p, q), .5); pe += l; if (low.some(g => dS(m, g.a, g.b) < (g.t || 100) / 2 + 60)) lo += l; }); return pe > 0 && lo / pe > 0.3; }; let roofP = L.outer; if (low.length) { try { const G2 = planarGraph(L.walls.filter(g => !(g.w.h && g.w.h < top.h - 100))), O2 = G2.faces.map(f => f.map(unkey)).filter(P => polyArea(P) < -1).map(P => P.filter((p, i) => { const a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length]; return Math.abs((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) > 1e3; })); if (O2.length) roofP = O2; else roofP = L.rooms.filter(r => !open(r)).map(r => r.poly); } catch (e) { roofP = L.rooms.filter(r => !open(r)).map(r => r.poly); } } const faces = roofP.map(P => ({ pts: P.map(p => ({ x: p.x, y: p.y, z: z + TYPES.slab.t })), kind: 'roof', n: { x: 0, y: 0, z: 1 } })); const plan = L.outer.reduce((s, P) => s + Math.abs(polyArea(P)), 0) / 1e6; return { type: 'flat', faces, plan: +plan.toFixed(2), area: +plan.toFixed(2), rise: 0, z }; }
  const lw = L.walls.reduce((m, g) => g.L > m.L ? g : m); let ua = lw.u; if (ua.x < 0 || (Math.abs(ua.x) < 1e-9 && ua.y < 0)) ua = V.mul(ua, -1); const ub = { x: -ua.y, y: ua.x };
  const pts = L.walls.flatMap(g => g.poly); const as = pts.map(p => V.dot(p, ua)), bs = pts.map(p => V.dot(p, ub)), o = R.over || 0;
  let a0 = Math.min(...as) - o, a1 = Math.max(...as) + o, b0 = Math.min(...bs) - o, b1 = Math.max(...bs) + o;
  let A_ = ua, B_ = ub; if (a1 - a0 < b1 - b0) { [a0, a1, b0, b1] = [b0, b1, a0, a1]; [A_, B_] = [ub, ua]; } // tizma uzun tomon bo'ylab
  const P = (a, b, zz) => ({ x: A_.x * a + B_.x * b, y: A_.y * a + B_.y * b, z: zz }), bm = (b0 + b1) / 2, half = (b1 - b0) / 2, tg = Math.tan(R.slope * Math.PI / 180), rise = half * tg;
  const faces = [];
  if (R.type === 'gable') {
    faces.push({ pts: [P(a0, b0, z), P(a1, b0, z), P(a1, bm, z + rise), P(a0, bm, z + rise)], kind: 'roof' }, { pts: [P(a1, b1, z), P(a0, b1, z), P(a0, bm, z + rise), P(a1, bm, z + rise)], kind: 'roof' });
    faces.push({ pts: [P(a0, b1, z), P(a0, b0, z), P(a0, bm, z + rise)], kind: 'gable' }, { pts: [P(a1, b0, z), P(a1, b1, z), P(a1, bm, z + rise)], kind: 'gable' });
  } else { const r0 = a0 + half, r1 = a1 - half; // hip: barcha nishablar teng
    faces.push({ pts: [P(a0, b0, z), P(a1, b0, z), P(r1, bm, z + rise), P(r0, bm, z + rise)], kind: 'roof' }, { pts: [P(a1, b1, z), P(a0, b1, z), P(r0, bm, z + rise), P(r1, bm, z + rise)], kind: 'roof' });
    faces.push({ pts: [P(a0, b1, z), P(a0, b0, z), P(r0, bm, z + rise)], kind: 'roof' }, { pts: [P(a1, b0, z), P(a1, b1, z), P(r1, bm, z + rise)], kind: 'roof' }); }
  const plan = (a1 - a0) * (b1 - b0) / 1e6;
  return { type: R.type, faces, plan: +plan.toFixed(2), area: +(plan / Math.cos(R.slope * Math.PI / 180)).toFixed(2), rise: +(rise / 1000).toFixed(2), z, ridge: R.type === 'gable' ? +((a1 - a0) / 1000).toFixed(2) : +(Math.max(0, a1 - a0 - 2 * half) / 1000).toFixed(2), frame: { A: A_, B: B_, a0, a1, b0, b1 } };
}
// zina (mm): ko'tarilish h ≤ 180, 2h + b ∈ [600; 640] (qadam formulasi), marsh eni ≥ 1050, maydoncha ≥ max(marsh eni, 1300) — parametr (P);
// turlari (Archicad / IFC): U — ikki marshli, oraliq maydoncha bilan (HALF_TURN_STAIR); I — bir marshli (STRAIGHT_RUN_STAIR); L — burchakli, maydoncha burchakda (QUARTER_TURN_STAIR).
// To'rtburchak (p, q) — zina katagi; ichida 100 mm bo'shliq. Marsh — monolit: pog'onalar + qiya osti (waist 150 mm); har marsh profili (s, z) — IFC da yon profil eni bo'ylab cho'ziladi.
const STAIR = { hMax: 180, b2h: [600, 640], wMin: 1050, land: 1300, waist: 150, gap: 100, rail: 900 };
function stairGeom(M, s, L) {
  const p = resolve(M, s.p), q = resolve(M, s.q); const x0 = Math.min(p.x, q.x), x1 = Math.max(p.x, q.x), y0 = Math.min(p.y, q.y), y1 = Math.max(p.y, q.y);
  const bx = x1 - x0 - 200, by = y1 - y0 - 200, kind = (s.kind || 'u').toLowerCase();
  let n = Math.ceil(L.h / STAIR.hMax), h, b = 300; for (; n < 60; n++) { h = L.h / n; const bb = Math.min(320, Math.max(260, 620 - 2 * h)); if (2 * h + bb >= STAIR.b2h[0] && 2 * h + bb <= STAIR.b2h[1]) { b = bb; break; } } if (kind === 'u' && n % 2) n++; h = L.h / n; b = Math.round(Math.min(320, Math.max(260, 620 - 2 * h)) / 5) * 5; // qadam formulasi: 2h + b ≈ 620
  const along = by >= bx ? 'y' : 'x', La = Math.max(bx, by), Wc = Math.min(bx, by); // a — uzun o'q, c — qisqa o'q (ichki o'lchamlar)
  const ua = along === 'y' ? { x: 0, y: 1 } : { x: 1, y: 0 }, uc = along === 'y' ? { x: 1, y: 0 } : { x: 0, y: 1 }, O = { x: x0 + 100, y: y0 + 100 };
  const W = (av, cv) => { const A2 = s.rev ? La - av : av, C2 = s.flip ? Wc - cv : cv; return { x: O.x + ua.x * A2 + uc.x * C2, y: O.y + ua.y * A2 + uc.y * C2 }; };
  const dirW = (da, dc) => ({ x: ua.x * da * (s.rev ? -1 : 1) + uc.x * dc * (s.flip ? -1 : 1), y: ua.y * da * (s.rev ? -1 : 1) + uc.y * dc * (s.flip ? -1 : 1) });
  const flights = [], landings = [], rails = [], need = []; let wF, fits = true;
  // marsh: boshlanish (a, c), yo'nalish (da, dc) — ko'tarilish tomoni; eni (en tomoni) — o'ng yoki chap; nR ko'tarilish, nT = nR − 1 pog'ona (oxirgisi — maydoncha/pol)
  const flight = (a0, c0, da, dc, ea, ec, nR, z0) => { const nT = nR - 1, o = W(a0, c0), u = dirW(da, dc), e2 = dirW(ea, ec), run = nT * b; flights.push({ o, u, n: e2, w: wF, nR, nT, h, b, z0, run, poly: [o, { x: o.x + u.x * run, y: o.y + u.y * run }, { x: o.x + u.x * run + e2.x * wF, y: o.y + u.y * run + e2.y * wF }, { x: o.x + e2.x * wF, y: o.y + e2.y * wF }] }); };
  const landing = (a0, c0, a1, c1, z) => landings.push({ poly: [W(a0, c0), W(a1, c0), W(a1, c1), W(a0, c1)], z, t: 200 });
  if (kind === 'i') { wF = Math.min(s.w || Wc, Wc); const run = (n - 1) * b, a0 = Math.max(0, (La - run) / 2); flight(a0, (Wc - wF) / 2, 1, 0, 0, 1, n, 0); need.push([run + 600, wF]); fits = La >= run + 600 && Wc >= STAIR.wMin; }
  else if (kind === 'l') { wF = Math.min(s.w || Math.max(STAIR.wMin, Math.min(1400, Wc / 2)), Wc); const n1 = Math.ceil(n / 2), n2 = n - n1, r1 = (n1 - 1) * b, r2 = (n2 - 1) * b, a0 = Math.max(0, La - wF - r1);
    flight(a0, 0, 1, 0, 0, 1, n1, 0); landing(a0 + r1, 0, a0 + r1 + wF, wF, n1 * h); flight(a0 + r1, wF, 0, 1, 1, 0, n2, n1 * h); need.push([r1 + wF, wF + r2]); fits = La >= r1 + wF && Wc >= wF + r2 && wF >= STAIR.wMin; }
  else { wF = Math.min(s.w || (Wc - STAIR.gap) / 2, (Wc - STAIR.gap) / 2); const n1 = n / 2, n2 = n - n1, r1 = (n1 - 1) * b, r2 = (n2 - 1) * b, lD = Math.max(wF, STAIR.land), aL = La - lD;
    flight(aL - r1, 0, 1, 0, 0, 1, n1, 0); landing(aL, 0, La, Wc, n1 * h); flight(aL, Wc, -1, 0, 0, -1, n2, n1 * h); need.push([lD + Math.max(r1, r2) + STAIR.land, 2 * wF + STAIR.gap]); fits = La >= lD + Math.max(r1, r2) + STAIR.land && wF >= STAIR.wMin; }
  // to'siqlar: U — ichki (marshlar orasidagi) chet; I va L — ochiq chetlar; balandligi 900 mm pog'ona burnidan
  if (s.rail !== 0) flights.forEach((F, i) => { const inner = kind === 'u' ? F.w : kind === 'l' ? (i === 0 ? F.w : 0) : null; [inner == null ? 0 : inner].concat(inner == null ? [F.w] : []).forEach(off => { const P0 = { x: F.o.x + F.n.x * off, y: F.o.y + F.n.y * off }; rails.push({ a: { x: P0.x, y: P0.y, z: F.z0 + F.h }, b: { x: P0.x + F.u.x * F.run, y: P0.y + F.u.y * F.run, z: F.z0 + F.nR * F.h }, ht: STAIR.rail }); }); });
  const len = need.length ? need[0][0] : 0, wid = need.length ? need[0][1] : 0;
  return { s, x0, x1, y0, y1, n, h: +(h / 1000).toFixed(3), b: b / 1000, hmm: h, bmm: b, len, wid, bx, by, fits, along, kind, wF, flights, landings, rails, pdt: kind === 'i' ? '.STRAIGHT_RUN_STAIR.' : kind === 'l' ? '.QUARTER_TURN_STAIR.' : '.HALF_TURN_STAIR.', holeArea: (x1 - x0) * (y1 - y0) / 1e6 };
}
// marsh profili (s, z), mm: pog'onalar + qiya osti; s — yo'nalish bo'ylab, z — marsh boshidan
function flightProfile(F) { const P = [[0, 0]]; for (let i = 0; i < F.nT; i++) P.push([i * F.b, (i + 1) * F.h], [(i + 1) * F.b, (i + 1) * F.h]); // oxirgi ko'tarilish — maydoncha/yuqori plita chetida
  const sl = F.nR * F.h / Math.max(1, F.run + F.b), cosA = Math.cos(Math.atan(sl)), dz = STAIR.waist / cosA + F.h; P.push([F.run, Math.max(0, F.nR * F.h - dz)], [Math.min(F.run - 1, dz / sl), 0]); return P; }
// loyiha fayli: buyruqlar ro'yxati (model ulardan qayta quriladi)
const toFile = (cmds, meta) => JSON.stringify(Object.assign({ format: 'binokor', v: 2, saved: new Date().toISOString(), cmds }, meta || {}), null, 1);
function fromFile(text) { const j = JSON.parse(text); if (j.format !== 'binokor' || !Array.isArray(j.cmds)) throw new Error('Binokor loyiha fayli emas'); return j.cmds; }
function build(cmds) { const M = newModel(); const out = run(M, cmds.join('\n')); return { M, out, A: analyze(M) }; }

// ---------- UY (qatlamli turar-joy bloki, «bar»): egilgan plastina, qavatlar soni bo'ylab ko'tariladi (qiya tom), har qavatda oqib turgan balkon
// lentalari, fasadda yog'och/oyna/oq naqsh; ichida — koridor, zina-lift yadrolari, kvartiralar (xonalari bilan).
// Lokal koordinata (m): s — o'q bo'ylab (0…L), t — ko'ndalang (chap +). O'q: s < L·bp — 0° yo'nalish, keyin `bend`° ga buriladi (radiusli bo'g'in).
const BAR_DEF = { L: 92, W: 17.5, bp: 0.45, bend: 22, nLo: 8, nHi: 13, sw0: 0.35, sw1: 0.95, tip: 6, h: 3.15, rc: 5, bal: 2.2, balL: 23, balK: 0.21, wood: 0.30, white: 0.28, woodL: 19, woodK: 0.17, para: 0.55, cor: 1.8, evac: 25, minw: 2.6, mix1: 25, mix2: 45, mix3: 30, seed: 3, ns: 0.5, rmp: 2, rmpL: 8, rmpS: 5, woodE: 1, lat: 41.3, day: 81, ins: 2, wA0: 200, wA1: 290 };
const BAR_HELP = { L: 'o‘q uzunligi, m', W: 'korpus chuqurligi, m', bp: 'egilish joyi (0…1)', bend: 'egilish burchagi, °', nLo: 'past qanot qavatlari', nHi: 'baland uch qavatlari', sw0: 'tom ko‘tarila boshlaydigan joy (0…1)', sw1: 'tom eng balandga yetadigan joy (0…1)', tip: 'baland uchdagi «tumshuq» qo‘shimcha balandligi, m', h: 'qavat balandligi, m', rc: 'burchak radiusi (rejada), m',
  bal: 'balkon eng katta chiqishi, m', balL: 'balkon to‘lqini uzunligi, m', balK: 'qavatdan qavatga to‘lqin siljishi (0…1)', wood: 'yog‘och qoplama ulushi (0…1)', white: 'oq yopiq devor ulushi (0…1)', para: 'balkonlarda oq (yopiq) parapet ulushi (0…1, qolgani — shisha)', woodL: 'yog‘och naqsh qadami, m', woodK: 'naqshning qavatlar bo‘ylab siljishi (diagonal)', cor: 'koridor eni, m', evac: 'kvartira eshigidan zinagacha eng katta masofa, m (normaga qarab qo‘ying)', minw: 'xonaning eng kam eni, m (normaga qarab qo‘ying)',
  mix1: '1 xonali kvartiralar ulushi, %', mix2: '2 xonali, %', mix3: '3 xonali, %', seed: 'tasodifiy naqsh urug‘i', ns: 'o‘q bo‘ylab namunalash qadami, m', rmp: 'har fasadda qiya oq lentalar soni (0 — yo‘q)', rmpL: 'lentaning bir qavatdan keyingisiga o‘tish uzunligi, m', rmpS: 'lentaning har qavatda siljishi (diagonal), m', woodE: 'yog‘och zonasida plita cheti ham yog‘och bilan o‘ralsin (1/0)',
  lat: 'geografik kenglik, ° (Toshkent 41,3; Milan 45,5)', day: 'insolyatsiya kuni (yil kuni: 81 — 22 mart, 265 — 22 sentabr)', ins: 'xonada talab qilinadigan uzluksiz quyosh, soat (normaga qarab qo‘ying)', wA0: 'g‘arb sektori boshi, ° (yashash xonasi uchun cheklangan, normaga qarab)', wA1: 'g‘arb sektori oxiri, °' };
const barKey = k => Object.keys(BAR_DEF).find(q => q.toLowerCase() === String(k).toLowerCase()) || k;
function barGeom(M, e) {
  const P = Object.assign({}, BAR_DEF, e.p || {}); const at = resolve(M, e.at), rot = (e.rot || 0) * Math.PI / 180, co = Math.cos(rot), si = Math.sin(rot);
  const L = Math.max(20, P.L), W = Math.max(8, P.W), h = Math.max(2.6, P.h), ds = Math.max(0.25, P.ns), NSs = Math.round(L / ds), rnd = (() => { let s9 = (Math.abs(Math.round(P.seed)) % 2147483646) + 1; return () => (s9 = (s9 * 16807) % 2147483647) / 2147483647; })();
  const ph = [rnd(), rnd(), rnd(), rnd()].map(v => v * 2 * Math.PI);
  // o'q chizig'i: ikki to'g'ri bo'lak + radiusli bo'g'in (burilish burchagi bo'g'in uzunligi bo'ylab tekis taqsimlanadi)
  const th0 = 0, th1 = P.bend * Math.PI / 180, sb = L * P.bp, jl = Math.min(18, 0.25 * L); const ang = s => th0 + (th1 - th0) * sstep(sb - jl / 2, sb + jl / 2, s);
  const C = [], Nn = []; { let x = 0, y = 0; for (let q = 0; q <= NSs; q++) { const s = q * ds; if (q) { const a = ang(s - ds / 2); x += Math.cos(a) * ds; y += Math.sin(a) * ds; } C.push([x, y]); const a = ang(s); Nn.push([-Math.sin(a), Math.cos(a)]); } }
  const cx = C.reduce((a, p) => a + p[0], 0) / C.length, cy = C.reduce((a, p) => a + p[1], 0) / C.length; C.forEach(p => { p[0] -= cx; p[1] -= cy; });
  // yarim eni: uchlarda burchak radiusi rc bilan yumaloq
  const hw = s => { const r = Math.min(P.rc, W / 2), d = Math.min(s, L - s); return d >= r ? W / 2 : W / 2 - r + Math.sqrt(Math.max(0, r * r - (r - d) * (r - d))); };
  // tom chizig'i: past qanotdan baland uchgacha silliq ko'tariladi, oxirida «tumshuq»
  const u = s => s / L, roofZ = s => h * P.nLo + h * (P.nHi - P.nLo) * sstep(P.sw0, P.sw1, u(s)) + P.tip * Math.pow(Math.max(0, (u(s) - P.sw1) / (1 - P.sw1 || 1)), 2) + 0.6;
  const nF = Math.max(1, Math.round(P.nHi + Math.ceil(P.tip / h)));
  // balkon chiqishi d(s, k, tomon) ∈ [0, bal]: ikki to'lqin + qavat siljishi; uchlarda 0
  const balD = (s, k, side) => { const w = Math.sin(2 * Math.PI * (s / P.balL + k * P.balK) + ph[side]) + 0.55 * Math.sin(2 * Math.PI * (s / (P.balL * 0.47) - k * P.balK * 1.7) + ph[side + 2]); const v = Math.max(0, Math.min(1, 0.5 + 0.45 * w)); return P.bal * v * sstep(0, P.rc + 2, s) * sstep(0, P.rc + 2, L - s); };
  const pt = (q, t) => [C[q][0] + Nn[q][0] * t, C[q][1] + Nn[q][1] * t];
  const ptc = (s, t) => { const x = Math.max(0, Math.min(NSs, s / ds)), q = Math.min(NSs - 1, Math.floor(x)), f = x - q, a = pt(q, t), b = pt(q + 1, t); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
  const T = p => ({ x: at.x + (p[0] * co - p[1] * si) * 1000, y: at.y + (p[0] * si + p[1] * co) * 1000, z: (p[2] || 0) * 1000 });
  // qavatlar: k-qavat s oralig'ida mavjud, agar tom − k·h ≥ h (to'liq balandlik)
  const floors = []; let gfa = 0;
  for (let k = 0; k < nF; k++) { const z = k * h; let q0 = -1, q1 = -1; for (let q = 0; q <= NSs; q++) if (roofZ(q * ds) - z >= h) { if (q0 < 0) q0 = q; q1 = q; } if (q0 < 0 || q1 - q0 < 6 / ds) break;
    const base = [], outer = []; for (let q = q0; q <= q1; q++) { const s = q * ds; base.push(pt(q, hw(s))); outer.push(pt(q, hw(s) + balD(s, k, 0))); } for (let q = q1; q >= q0; q--) { const s = q * ds; base.push(pt(q, -hw(s))); outer.push(pt(q, -hw(s) - balD(s, k, 1))); }
    let A = 0; for (let q = q0; q < q1; q++) A += (hw(q * ds) + hw((q + 1) * ds)) * ds; gfa += A; floors.push({ k, z, q0, q1, base, outer, area: A }); }
  // ---- ichki reja (har qavat): koridor o'q bo'ylab; yadrolar (zina + 2 lift) yomon tomondagi (shimolga yaqinroq) qatorda; kvartiralar
  const fh = h, nR = Math.ceil(fh * 1000 / 150) + (Math.ceil(fh * 1000 / 150) % 2), perM = nR / 2, mW = 1.2, mLen = (perM - 1) * 0.3, landg = 1.4, wall = 0.25, liftW = 2.1;
  const CS = 2 * wall + 2 * mW + 0.2 + 2 * liftW + 0.2 + 0.25, cor = Math.max(1.4, P.cor); // yadro bo'ylama o'lchami
  // tomonlar yo'nalishi (dunyo): chap (+t) normal o'q o'rtasida; plan y pastga = janub
  const qm = Math.round(NSs / 2), nW = side => { const n = Nn[qm], v = side ? [-n[0], -n[1]] : n; return [v[0] * co - v[1] * si, v[0] * si + v[1] * co]; };
  const azOf = v => (Math.atan2(v[0], -v[1]) * 180 / Math.PI + 360) % 360; // 0 — shimol, 90 — sharq (rejada y pastga)
  const az = [azOf(nW(0)), azOf(nW(1))], northish = a => a > 300 || a < 60, worse = Math.abs(((az[0] + 180) % 360) - 180) < Math.abs(((az[1] + 180) % 360) - 180) ? 0 : 1; // shimolga yaqinroq tomon
  const D = W / 2 - cor / 2; // kvartira chuqurligi (koridordan fasadgacha)
  const qS = s => Math.round(s / ds);
  // yadrolar: biri — eng yuqori qavat oralig'i o'rtasida (baland uchga yetsin), qolganlari pastki qavat bo'ylab ≤ 2·evac oraliq bilan (kvartira eshigidan zinagacha ≤ evac)
  const cores = []; { const F0 = floors[0], Ft = floors.slice().reverse().find(F => (F.q1 - F.q0) * ds >= CS + 6 && F.area >= 250) || floors[0], sA = F0.q0 * ds + P.rc + 2, sB = F0.q1 * ds - P.rc - 2, step = Math.max(CS + 6, 2 * P.evac - CS);
    const tA = Math.max(sA, Ft.q0 * ds + 1), tB = Math.min(sB, Ft.q1 * ds - 1); const cTop = Math.max(sA + CS / 2, Math.min(sB - CS / 2, (tA + tB) / 2)); const pos = [cTop];
    let x = cTop - step; while (x - CS / 2 > sA - step / 2 + 2) { pos.unshift(Math.max(sA + CS / 2, x)); x -= step; } x = cTop + step; while (x + CS / 2 < sB + step / 2 - 2) { pos.push(Math.min(sB - CS / 2, x)); x += step; }
    // oraliqlarni tekislash: chetdagilar orasida teng
    const uniq = pos.filter((p, i) => !i || p - pos[i - 1] > CS + 2);
    uniq.forEach(sc => { let top = -1; floors.forEach(F => { if (qS(sc - CS / 2) >= F.q0 && qS(sc + CS / 2) <= F.q1) top = Math.max(top, F.k); }); cores.push({ n: cores.length + 1, s0: sc - CS / 2, s1: sc + CS / 2, side: worse, top }); }); }
  const MIX = [[1, P.mix1], [2, P.mix2], [3, P.mix3]].filter(m => m[1] > 0), mixSum = MIX.reduce((a, m) => a + m[1], 0) || 1, AREA = { 1: 42, 2: 62, 3: 84 };
  const apts = [], parts = [], corr = [], chk = []; let seq = 0;
  floors.forEach(F => { const sA = F.q0 * ds, sB = F.q1 * ds;
    // koridor: uchlarda burchak yumaloqligi tufayli korpus torayadi — koridor rc dan ichkarida tugaydi
    const cA = sA + Math.min(P.rc, 2), cB = sB - Math.min(P.rc, 2); /* koridor uchlarda yumaloq devorgacha 2 m qolguncha yetadi — chekka kvartiralarga ham kirish bo'lsin */ if (cB - cA > 4) { const pp = []; for (let q = qS(cA); q <= qS(cB); q++) pp.push(pt(q, cor / 2)); for (let q = qS(cB); q >= qS(cA); q--) pp.push(pt(q, -cor / 2)); corr.push({ k: F.k, poly: pp.map(p => T([p[0], p[1], F.z])) }); }
    if (F.k === 0) { /* 1-qavat: kirish holli, yadrolar va noturar (tijorat) — kvartirasiz */ }
    [0, 1].forEach(side => { const sg = side ? -1 : 1; // tomonni yadrolar va uchlar bo'yicha bo'laklarga ajratish
      const blocks = []; let a = sA; const cs = cores.filter(C => C.top >= F.k && C.side === side).sort((x, y) => x.s0 - y.s0); cs.forEach(C => { if (C.s0 > a + 1) blocks.push([a, C.s0]); a = C.s1; }); if (sB > a + 1) blocks.push([a, sB]);
      blocks.forEach(([b0, b1]) => { const len = b1 - b0; if (len < 3) return; const isEnd0 = b0 <= sA + 0.01, isEnd1 = b1 >= sB - 0.01;
        // kvartiralar: aralashma bo'yicha navbat (mix ulushlari) — kenglik = maydon / chuqurlik; oxirgisi blokka moslab cho'ziladi
        let widths = []; if (F.k === 0) { // 1-qavat: har yadro oldida aholi kirish holli (6 m), qolgani ~15 m li do'konlar (noturar)
          // holl yadrodan oldingi blokda (sig'masa — keyingisida)
          const before = cs.find(C => Math.abs(C.s0 - b1) < 0.01), after = cs.find(C => Math.abs(C.s1 - b0) < 0.01), beforeShort = C => { const prev = cs.filter(D => D.s1 <= C.s0 + 0.01 && D !== C).reduce((m, D) => Math.max(m, D.s1), sA); return C.s0 - prev <= 9; };
          const lobEnd = !!before && len > 9, lobStart = !!after && beforeShort(after) && len > (lobEnd ? 15 : 9), lob = (lobEnd ? 6 : 0) + (lobStart ? 6 : 0), rest = len - lob, nS2 = Math.max(1, Math.round(rest / 15));
          if (lobStart) { const o = new Number(6); o.t = 0; o.kind = 'lobby'; widths.push(o); } for (let q = 0; q < nS2; q++) { const o = new Number(rest / nS2); o.t = 0; o.kind = 'shop'; widths.push(o); } if (lobEnd) { const o = new Number(6); o.t = 0; o.kind = 'lobby'; widths.push(o); } } else { let acc = 0, ix = seq; while (acc < len - 0.5) { let best = MIX[0], bv = -1e9; MIX.forEach(m => { const have = widths.filter(w => w.t === m[0]).length, v = m[1] / mixSum * (widths.length + 1) - have + (rnd() - 0.5) * 0.1; if (v > bv) { bv = v; best = m; } }); const wdt = AREA[best[0]] / D; const o = new Number(wdt); o.t = best[0]; widths.push(o); acc += wdt; ix++; }
          // so'nggi kvartirani blok oxiriga moslash (yoki qisqasini qo'shnisiga qo'shish)
          let tot = widths.reduce((x, y) => x + +y, 0); if (widths.length > 1 && tot - len > 0.5 * widths[widths.length - 1]) { tot -= widths[widths.length - 1]; widths.pop(); } const k2 = len / tot; /* oxirgisi yarmidan ko'p sig'masa — olib tashlanib, qolganlari kengaytiriladi */ widths = widths.map(w => { const o = new Number(+w * k2); let tt = w.t; const need = q => q === 1 ? 4.6 : 3.6 + (q - 1) * (P.minw + 0.3) + 0.1; while (tt > 1 && +o < need(tt)) tt--; o.t = tt; return o; }); } /* siqilgan kvartira xonalari minw dan torayib ketsa — xonalar soni kamaytiriladi */
        let s0 = b0; widths.forEach((w, wi) => { const s1 = wi === widths.length - 1 ? b1 : s0 + +w; const t = F.k === 0 ? 0 : w.t; seq++;
          const q0 = Math.max(F.q0, qS(s0)), q1 = Math.min(F.q1, qS(s1)); if (q1 - q0 < 2) { s0 = s1; return; }
          const inner = s => s < cA || s > cB ? 0 : cor / 2; // uchlarda koridor yo'q — kvartira o'qgacha
          const poly = []; for (let q = q0; q <= q1; q++) poly.push(pt(q, sg * hw(q * ds))); for (let q = q1; q >= q0; q--) poly.push(pt(q, sg * inner(q * ds)));
          let area = 0; for (let q = q0; q < q1; q++) area += (hw(q * ds) - inner(q * ds)) * ds;
          // xonalar: koridor tomonda 2,6 m tasma — dahliz (hamma xonaga yetadi), sanuzel, 3 xonalida mehmon sanuzeli; fasad tomonda — mehmonxona (oshxona bilan) va yotoqxonalar.
          // Koridor yo'q uchda (s < cA) kvartira teskari (ko'zgu) joylashadi — kirish eshigi koridorga tushishi uchun.
          const rooms = [], doors = [], furn = []; const wTot = (q1 - q0) * ds, dB = 2.6, nBed = t >= 2 ? t - 1 : 0, mir = s0 < cA + 1.2 && s1 > cA + 1.2, U = u => mir ? s1 - u : s0 + u;
          const W2 = (s, tt) => T([...ptc(s, sg * tt), F.z]), sc0 = (s0 + s1) / 2, tI = inner(Math.max(cA, Math.min(cB, sc0))), tM = tI + dB, tF = hw(sc0);
          const mk = (u0, u1, tA, tB, name) => { const n0 = Math.min(U(u0), U(u1)), n1 = Math.max(U(u0), U(u1)); const a0 = Math.max(q0, qS(n0)), a1 = Math.min(q1, qS(n1)); if (a1 <= a0) return null; const fa = s => typeof tA === 'function' ? tA(s) : tA, fb = s => typeof tB === 'function' ? tB(s) : tB; const rp = []; for (let q = a0; q <= a1; q++) rp.push(pt(q, sg * fa(q * ds))); for (let q = a1; q >= a0; q--) rp.push(pt(q, sg * fb(q * ds))); let ra = 0; for (let q = a0; q < a1; q++) ra += Math.abs(fa(q * ds) - fb(q * ds)) * ds; const r = { name, w: (a1 - a0) * ds, s0: n0, s1: n1, poly: rp.map(p => T([p[0], p[1], F.z])), area: +ra.toFixed(1) }; rooms.push(r); return r; };
          // eshik: ilgak (u, t), devor bo'ylab yo'nalish (du, dt), ochilish tomoni (vu, vt), eni w
          const door = (uh, th, du, dt, vu, vt, w, kind) => { if (kind !== 'tashqi') th = th - tI + inner(U(uh + du * w / 2)); else th = hw(U(uh + du * w / 2)); doors.push({ kind, w, h: W2(U(uh), th), b: W2(U(uh + du * w), th + dt * w), c: W2(U(uh + vu * w), th + vt * w) }); };
          const fur = (u0, u1, tA, tB, name) => { const n0 = U(u0), n1 = U(u1), lim = Math.min(hw(n0), hw(n1)) - 0.1, ex = Math.max(tA, tB) - lim; if (ex > 0.5) return; if (ex > 0) { tA -= ex; tB -= ex; } if (Math.min(tA, tB) < tI - 0.01 || Math.min(n0, n1) < s0 - 0.01 || Math.max(n0, n1) > s1 + 0.01) return; /* yumaloq uchda devorga sig'dirish */ furn.push({ name, poly: [W2(n0, tA), W2(n1, tA), W2(n1, tB), W2(n0, tB)] }); };
          if (t >= 1) { const liv = t === 1 ? wTot : Math.max(3.6, Math.min(wTot * 0.45, wTot - nBed * (P.minw + 0.3))), bedW = nBed ? (wTot - liv) / nBed : 0, fac = s => hw(s), mid = s => inner(s) + dB;
            mk(0, liv, fac, mid, t === 1 ? 'Xona-oshxona' : 'Mehmonxona-oshxona'); for (let b2 = 0; b2 < nBed; b2++) mk(liv + b2 * bedW, liv + (b2 + 1) * bedW, fac, mid, 'Yotoqxona');
            const ms = t >= 3 ? 1.6 : 0, dS = ms, lastBed = nBed ? liv + (nBed - 1) * bedW : 0, dE = Math.min(wTot - 2.2, Math.max(dS + 3.0, lastBed + 1.15)), sE = wTot; // dahliz [dS, dE], sanuzel [dE, oxir]
            if (ms) mk(0, ms, mid, inner, 'Mehmon sanuzeli'); mk(dS, dE, mid, inner, 'Dahliz'); mk(dE, sE, mid, inner, 'Sanuzel');
            // eshiklar: kirish (koridordan), har xonaga dahlizdan, sanuzellarga
            door(dS + 0.25, tI, 1, 0, 0, 1, 1.0, 'kirish'); door(Math.max(dS, 0) + 0.2, tM, 1, 0, 0, 1, 0.9, 'xona'); for (let b2 = 0; b2 < nBed; b2++) door(liv + b2 * bedW + 0.15, tM, 1, 0, 0, 1, 0.8, 'xona');
            door(dE, tI + 0.8, 0, 1, 1, 0, 0.7, 'sanuzel'); if (ms) door(ms, tI + 0.9, 0, 1, -1, 0, 0.7, 'sanuzel');
            // mebel (ko'rsatma): oshxona qatori, stol, divan/karavot, shkaflar, santexnika
            fur(0.02, 0.62, tM + 0.25, tM + Math.min(3.2, tF - tM - 1.2), 'Oshxona qatori'); fur(1.5, 2.4, tM + 1.1, tM + 2.5, 'Stol');
            if (t === 1) fur(liv - 2.05, liv - 0.05, tF - 2.3, tF - 0.7, 'Karavot'); else fur(liv - 0.95, liv - 0.05, tF - 3.3, tF - 1.1, 'Divan');
            for (let b2 = 0; b2 < nBed; b2++) { const ua = liv + b2 * bedW, ub = ua + bedW, tc = (tM + tF) / 2; fur(ub - 2.05, ub - 0.05, tc - 0.8, tc + 0.8, 'Karavot'); if (bedW > 1.9) fur(ua + 1.0, ub - 0.05, tM + 0.05, tM + 0.65, 'Shkaf'); }
            fur(sE - 1.75, sE - 0.05, tM - 0.8, tM - 0.05, 'Vanna'); fur(sE - 0.75, sE - 0.1, tI + 0.15, tI + 0.8, 'Unitaz'); fur(dE + 0.95, dE + 1.5, tI + 0.05, tI + 0.5, 'Rakovina');
            if (ms) { fur(0.45, 1.1, tI + 0.15, tI + 0.8, 'Unitaz'); fur(0.1, 0.55, tM - 0.5, tM - 0.05, 'Rakovina'); }
            if (dE - dS > 2.6) fur(dS + 1.4, dE - 0.1, tI + 0.05, tI + 0.65, 'Shkaf'); }
          else if (F.k === 0) { // 1-qavat: ko'chadan kirish (fasadda) va holldan koridorga
            const um = wTot / 2; door(um - (w.kind === 'lobby' ? 0.9 : 0.6), tF, 1, 0, 0, -1, w.kind === 'lobby' ? 1.8 : 1.2, 'tashqi'); if (w.kind === 'lobby') door(um - 0.6, tI, 1, 0, 0, 1, 1.2, 'kirish'); }
          // ichki devorlar (IFC uchun; eshiklar shularda): koridor devori, tasma devori, xonalar orasidagi va tasmadagi ko'ndalang devorlar
          const walls = []; { const lw = (n0, n1, tf, th, kind) => { const a = Math.min(n0, n1), b = Math.max(n0, n1), n = Math.max(1, Math.ceil((b - a) / ds)), P3 = []; for (let i = 0; i <= n; i++) { const sx = a + (b - a) * i / n; P3.push(W2(sx, tf(sx))); } walls.push({ kind, th, pts: P3 }); }, cw = (u, tA, tB, th, kind) => { const sh = inner(U(u)) - tI, fx = v => Math.abs(v - tF) < 1e-9 ? hw(U(u)) : v + sh; walls.push({ kind, th, pts: [W2(U(u), fx(tA)), W2(U(u), fx(tB))] }); };
            lw(s0, s1, sx => inner(sx), 0.2, 'koridor');
            if (t >= 1) { const liv = t === 1 ? wTot : Math.max(3.6, Math.min(wTot * 0.45, wTot - nBed * (P.minw + 0.3))), bedW = nBed ? (wTot - liv) / nBed : 0, ms = t >= 3 ? 1.6 : 0, lastBed = nBed ? liv + (nBed - 1) * bedW : 0, dE = Math.min(wTot - 2.2, Math.max(ms + 3.0, lastBed + 1.15));
              lw(s0, s1, sx => inner(sx) + dB, 0.12, 'tasma'); for (let b2 = 0; b2 < nBed; b2++) cw(liv + b2 * bedW, tM, tF, 0.12, 'xona'); cw(dE, tI, tM, 0.12, 'sanuzel'); if (ms) cw(ms, tI, tM, 0.12, 'sanuzel'); } }
          // eng tor xona; eshikdan zinagacha (koridor bo'ylab, zina qafasining eshigigacha)
          const dual = (isEnd0 && wi === 0) || (isEnd1 && wi === widths.length - 1);
          const minW = rooms.filter(r => /^(Xona|Mehmonxona|Yotoq)/.test(r.name)).reduce((m, r) => Math.min(m, r.w), 99);
          const dEnt = doors.find(d => d.kind === 'kirish'), door0 = t >= 1 ? U((t >= 3 ? 1.6 : 0) + 0.75) : (s0 + s1) / 2, cs2 = cores.filter(C => C.top >= F.k), dist = cs2.length ? Math.min(...cs2.map(C => Math.max(0, C.s0 - door0, door0 - C.s1))) : 1e9;
          apts.push({ n: seq, k: F.k, side, t, s0, s1, lobby: w.kind === 'lobby', type: t ? t + ' xonali' : w.kind === 'lobby' ? 'Kirish holli (aholi)' : 'Noturar (do‘kon)', area: +area.toFixed(1), poly: poly.map(p => T([p[0], p[1], F.z])), rooms, doors, furn, walls, dual, north: false, minW, dist, door0, c: T([...pt(Math.round((q0 + q1) / 2), sg * (hw(((q0 + q1) / 2) * ds) + inner(((q0 + q1) / 2) * ds)) / 2), F.z]) });
          // kvartiralararo devor (s1 da)
          if (wi < widths.length - 1) { const q = qS(s1); parts.push({ k: F.k, a: T([...pt(q, sg * inner(q * ds)), F.z]), b: T([...pt(q, sg * hw(q * ds)), F.z]), apt: true }); }
          s0 = s1; }); }); }); });
  // yadro geometriyasi (dunyo): to'rtburchak, marshlar, liftlar
  const coreG = cores.map(C => { const sg = C.side ? -1 : 1, ta = cor / 2, tb = cor / 2 + Math.min(D, 2 * wall + mLen + 2 * landg); const R = (sA, sB, tA, tB) => [[sA, tA], [sB, tA], [sB, tB], [sA, tB]].map(([s, t]) => { const q = Math.max(0, Math.min(NSs, qS(s))); const p = pt(q, sg * t); return T([p[0], p[1], 0]); });
    const s0 = C.s0 + wall, fl = [R(s0, s0 + mW, ta + wall + landg, ta + wall + landg + mLen), R(s0 + mW + 0.2, s0 + 2 * mW + 0.2, ta + wall + landg, ta + wall + landg + mLen)], l0 = s0 + 2 * mW + 0.4;
    const z1 = (floors[Math.max(0, C.top)] || floors[0]).z + h + 1.2; return { n: C.n, top: C.top, side: C.side, s0: C.s0, s1: C.s1, poly: R(C.s0, C.s1, ta, tb), flights: fl, lifts: [R(l0, l0 + liftW, ta + wall, ta + wall + liftW), R(l0 + liftW + 0.2, l0 + 2 * liftW + 0.2, ta + wall, ta + wall + liftW)], z1: z1 * 1000, steps: perM }; });
  // eng yuqori kichik qavatlar (< 400 m²), yadro yetmaydigan — pastki kvartiralarning ikkinchi sathi (dupleks, ichki zina): alohida yadro talab qilinmaydi
  const dup = new Set(floors.filter(F => F.k > 0 && !cores.some(C => C.top >= F.k) && F.area < 400).map(F => F.k)); apts.filter(a => dup.has(a.k)).forEach(a => { a.t = 0; a.type = 'Dupleks (2-sath)'; a.duplex = true; a.rooms = []; a.doors = []; a.furn = []; });
  // ---- insolyatsiya (soatlar bo'yicha): har yashash xonasi derazasi (fasad, pol + 1,5 m) — quyosh yo'li (kenglik lat, kun day, haqiqiy quyosh vaqti, 10 daqiqa qadam, balandlik > 3°),
  // to'siqlar: yuqori qavat balkoni (osilma) va binoning o'z hajmi (egilgan korpus, baland uch). Atrofdagi binolar hisobga olinmaydi.
  const sunP = (() => { const la = P.lat * Math.PI / 180, de = 23.45 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + P.day) / 365), out = [];
    for (let m = 0; m < 24 * 60; m += 10) { const H = (m / 60 - 12) * 15 * Math.PI / 180, sa = Math.sin(la) * Math.sin(de) + Math.cos(la) * Math.cos(de) * Math.cos(H), alt = Math.asin(sa); if (alt < 3 * Math.PI / 180) continue;
      const A = Math.atan2(-Math.cos(de) * Math.sin(H), Math.sin(de) * Math.cos(la) - Math.cos(de) * Math.cos(H) * Math.sin(la)); const wx = Math.sin(A), wy = -Math.cos(A); out.push({ m, alt, A, d: [wx * co + wy * si, -wx * si + wy * co] }); } return out; })();
  const Hmax = Math.max(...Array.from({ length: NSs + 1 }, (_, q) => roofZ(q * ds)));
  const inMass = (x, y, z) => { let bq = 0, bd = 1e18; for (let q = 0; q <= NSs; q += 4) { const d2 = (C[q][0] - x) ** 2 + (C[q][1] - y) ** 2; if (d2 < bd) { bd = d2; bq = q; } } for (let q = Math.max(0, bq - 4); q <= Math.min(NSs, bq + 4); q++) { const d2 = (C[q][0] - x) ** 2 + (C[q][1] - y) ** 2; if (d2 < bd) { bd = d2; bq = q; } }
    const vx = x - C[bq][0], vy = y - C[bq][1], so = vx * Nn[bq][1] - vy * Nn[bq][0], tt = vx * Nn[bq][0] + vy * Nn[bq][1], s = bq * ds + so; if (s < 0 || s > L || Math.abs(so) > ds) return false; return Math.abs(tt) < hw(s) && z < roofZ(s); };
  const sunHours = (s, k, side, obs) => { const q = qS(s), sg = side ? -1 : 1, n = [Nn[q][0] * sg, Nn[q][1] * sg], p = pt(q, sg * (hw(s) + 0.05)), z0 = k * h + 1.5, up = floors[k + 1] && q >= floors[k + 1].q0 && q <= floors[k + 1].q1 ? balD(s, k + 1, side) : 0, zU = (k + 1) * h - 0.15;
    let best = 0, run = 0, prev = -99; sunP.forEach(S => { const c = S.d[0] * n[0] + S.d[1] * n[1]; let ok = c > Math.cos(85 * Math.PI / 180);
      if (ok && up > 0.05) { const tp = Math.tan(S.alt) / c; if (z0 + up * tp > zU) ok = false; } // balkon osilmasi
      if (ok) { const ta = Math.tan(S.alt), dmax = Math.min(obs ? 400 : 150, (Math.max(Hmax, obs ? obs.H : 0) - z0) / ta); for (let d = 1; d < dmax; d += 2) { const x = p[0] + S.d[0] * d, y = p[1] + S.d[1] * d, z = z0 + d * ta; if (inMass(x, y, z)) { ok = false; break; } if (obs) { const Wp = T([x, y, z]); if (obs.list.some(f => f(Wp.x, Wp.y, Wp.z))) { ok = false; break; } } } } // o'z hajmi + atrofdagi binolar (modeldagi)
      if (ok) { run = S.m - prev === 10 ? run + 10 : 10; prev = S.m; best = Math.max(best, run); } }); return best / 60; };
  const doIns = obs => apts.filter(a => a.t >= 1).forEach(a => { a.rooms.forEach(r => { if (!/^(Xona|Mehmonxona|Yotoq)/.test(r.name)) return; const sm = (r.s0 + r.s1) / 2, q = qS(sm), sg = a.side ? -1 : 1, v = [Nn[q][0] * sg, Nn[q][1] * sg]; r.az = Math.round(azOf([v[0] * co - v[1] * si, v[0] * si + v[1] * co])); r.sun = +sunHours(sm, a.k, a.side, obs).toFixed(1); });
    const liv = a.rooms.filter(r => r.sun != null); a.sun = liv.reduce((m, r) => Math.max(m, r.sun), 0); a.insOk = liv.filter(r => r.sun >= P.ins).length >= 1; a.north = !a.insOk; a.west = liv.filter(r => r.az >= P.wA0 && r.az <= P.wA1).length; });
  doIns(null);
  // tekshiruvlar
  const res = apts.filter(a => a.t >= 1), lobbies = apts.filter(a => a.lobby);
  if (cores.length && lobbies.length < cores.length) chk.push(['WARN', `${cores.length - lobbies.length} ta yadro oldida 1-qavatda kirish holli yo'q`]);
  const north = res.filter(a => !a.insOk), far = res.filter(a => a.dist > P.evac), narrow = res.filter(a => a.minW < P.minw), west = res.filter(a => a.west > 0);
  const dayN = P.day === 81 ? '22 mart' : P.day === 265 ? '22 sentabr' : P.day + '-kun';
  const insChk = nObs => { const nn = res.filter(a => !a.insOk).length, src = nObs ? `balkon osilmasi, binoning o‘zi va modeldagi ${nObs} ta boshqa bino soyasi bilan` : 'balkon osilmasi va binoning o‘zi soyasi bilan; atrofdagi binolar modelda yo‘q'; return nn ? ['WARN', `${nn} ta kvartirada birorta yashash xonasiga ${P.ins} soat uzluksiz quyosh tushmaydi (${dayN}, ${P.lat}° kenglik; ${src}) — korpusni burish (rot) yoki shu tomonga yordamchi xonalar`] : ['PASS', `Insolyatsiya: hamma kvartirada kamida bitta yashash xonasiga ≥ ${P.ins} soat (${dayN}, ${P.lat}°; ${src})`]; };
  const insIdx = res.length ? chk.push(insChk(0)) - 1 : -1;
  if (west.length) chk.push(['WARN', `${west.length} ta kvartirada yashash xonasi ${P.wA0}–${P.wA1}° (g‘arb) sektoriga qaragan — yozda qizib ketadi; amaldagi normadagi cheklovni tekshiring`]);
  if (far.length) chk.push(['WARN', `${far.length} ta kvartira eshigidan zina qafasigacha > ${P.evac} m`]);
  if (narrow.length) chk.push(['WARN', `${narrow.length} ta kvartirada xona eni < ${P.minw} m`]);
  if (dup.size) chk.push(['INFO', `${[...dup].map(k => k + 1).join(', ')}-qavat(lar) — pastki kvartiralarning ikkinchi sathi (dupleks, ichki zina bilan)`]);
  floors.forEach(F => { if (F.k > 0 && !cores.some(C => C.top >= F.k) && !dup.has(F.k)) chk.push(['FAIL', `${F.k + 1}-qavatga zina-lift yadrosi yetmaydi (${Math.round(F.area)} m²)`]); });
  // balkon to'sig'i: oq yopiq (parapet) yoki shisha — s va qavatga qarab
  const railSolid = (s, k) => ((Math.sin(s / 7.3 + k * 1.9) + 1) / 2) < P.para;
  // qiya oq lentalar: balkon tashqi chetida k-qavat plitasidan (k+1)-qavatgacha ravon o'tadi; har qavatda rmpS ga siljiydi — fasad bo'ylab diagonal zanjir
  const ribbons = []; if (P.rmp > 0) [0, 1].forEach(side => { const sg = side ? -1 : 1; for (let j = 0; j < Math.round(P.rmp); j++) { const sBase = L * (j + 0.5 + side * 0.5) / Math.round(P.rmp);
    for (let k = 0; k + 1 < floors.length; k++) { const Fa = floors[k], Fb = floors[k + 1], span = Math.max(1, (Math.min(Fa.q1, Fb.q1) - Math.max(Fa.q0, Fb.q0)) * ds - 2 * P.rc - P.rmpL); const sc = Math.max(Fa.q0, Fb.q0) * ds + P.rc + P.rmpL / 2 + (((sBase + k * P.rmpS) % span) + span) % span;
      const sA2 = sc - P.rmpL / 2, nS = Math.max(4, Math.ceil(P.rmpL / ds)), top = [], bot = []; for (let i = 0; i <= nS; i++) { const sx = sA2 + P.rmpL * i / nS, g = sstep(0, 1, i / nS), zz = k * h + h * g, tt = hw(sx) + balD(sx, k, side) * (1 - g) + balD(sx, k + 1, side) * g + 0.03, p = ptc(sx, sg * tt); top.push(T([p[0], p[1], zz + 0.35])); bot.push(T([p[0], p[1], zz - 0.15])); }
      ribbons.push({ side, k, s: sc, top, bot }); } } });
  // tom: qiya yuza (s bo'ylab), korpus eni + kichik osilma; yuqori qavat shiftidan tomgacha — oq devor
  const roof = []; for (let q = 0; q <= NSs; q += 2) { const s = q * ds; roof.push([T([...pt(q, hw(s) + 0.3), roofZ(s)]), T([...pt(q, -hw(s) - 0.3), roofZ(s)])]); }
  const skirt = []; for (let q = 0; q < NSs; q += 2) { const s = q * ds, s2 = Math.min(NSs, q + 2) * ds; const topK = floors.filter(F => q >= F.q0 && q <= F.q1).length; const zc = topK * h; if (roofZ(s) - zc > 0.05 || roofZ(s2) - zc > 0.05) skirt.push({ q, zc, s, s2 }); }
  const wallZone = (s, k) => { const f = ((s / P.woodL + k * P.woodK + ph[0] / 6.283) % 1 + 1) % 1; return f < P.wood ? 'wood' : f < P.wood + P.white ? 'white' : 'glass'; };
  const tw = { area: res.reduce((a, x) => a + x.area, 0) }; const byT = {}; apts.forEach(a => { const q = byT[a.type] || (byT[a.type] = { n: 0, a: 0 }); q.n++; q.a += a.area; });
  return { e, P, L, W, h, ds, NSs, C, Nn, hw, roofZ, balD, pt, T, floors: floors.map(F => ({ k: F.k, z: F.z * 1000, area: Math.round(F.area), q0: F.q0, q1: F.q1, base: F.base.map(p => T([p[0], p[1], F.z])), outer: F.outer.map(p => T([p[0], p[1], F.z])) })), cores: coreG, apts, parts, corr, roof, skirt, wallZone, railSolid, ribbons, az, checks: chk, sunP, Hm: Hmax,
    inMassW: (x, y, z) => { const dx = x - at.x, dy = y - at.y; return inMass((dx * co + dy * si) / 1000, (-dx * si + dy * co) / 1000, z / 1000); },
    bbox: (() => { const P2 = floors.flatMap(F => F.outer.map(p => T(p))); return [Math.min(...P2.map(p => p.x)), Math.min(...P2.map(p => p.y)), Math.max(...P2.map(p => p.x)), Math.max(...P2.map(p => p.y))]; })(),
    reins: obs => { doIns(obs); if (insIdx >= 0) chk[insIdx] = insChk(obs.list.length); },
    H: +(Math.max(...Array.from({ length: NSs + 1 }, (_, q) => roofZ(q * ds)))).toFixed(1), gfa: Math.round(gfa), net: Math.round(tw.area), nApt: res.length, byT };
}

// ---------- STADION (ring): o'rtada maydon (futbol 105×68 + yugurish chizig'i oralig'i), atrofida tribuna (qatorlar ko'rinish chizig'i C bo'yicha),
// ustida donut-tom: profil egri chizig'i vertikal o'q atrofida aylanadi, ichki cheti (okulus) maydon ustida ochiq. Tom — to'lqinsimon yog'och lamellar
// (qo'shni lamellar qarama-qarshi fazada → linza teshiklar) + ostida membrana; tashqi fasad pastida vitraj. Ostida — konkors qavatlari.
const RING_DEF = { R: 105, ri: 50, H: 44, crown: 0.45, bulge: 3, n: 72, f: 7, amp: 1, w: 1.2, tw: 0.3, gl: 4, pL: 105, pW: 68, run: 8, sx: 4, rows: 36, tread: 0.8, c: 0.09, eye: 1.2, wall0: 1.1, seat: 0.5, rows2: 20, tread2: 0.9, c2: 0.06, ov: -6, boxH: 4.5, box: 4, boxS: 12, media: 60, vom: 14, vomW: 2.4, flow: 60, tEv: 8, row: 40, conc: 10, fh: 5.5, clr: 3.2, cores: 8, mPT: 45, mCar: 30, mTaxi: 10, occ: 2.5, bus: 80, tOut: 60, tPed: 20, qPed: 50, stall: 25, plat: 30, arms: 4, armA: 45, armW: 22, armL: 50, isl: 4, seed: 2, nv: 160 };
const RING_HELP = { R: 'tom tashqi radiusi (eng bo‘rtgan joyi), m', ri: 'tom ichki cheti radiusi (maydon ustidagi teshik), m', H: 'tom balandligi, m', crown: 'tom cho‘qqisi joyi (0 — ichki chet, 1 — tashqi)', bulge: 'tashqi fasad bo‘rtishi, m', n: 'lamellar soni (juft)', f: 'lamel to‘lqinlari soni', amp: 'to‘lqin amplitudasi (1 — qo‘shnisiga tegadi)', w: 'lamel chuqurligi, m', tw: 'lamel qalinligi, m', gl: 'membrana/vitraj lamellardan ichkarida, m',
  pL: 'maydon uzunligi, m', pW: 'maydon eni, m', run: 'maydon chetidan birinchi qatorgacha (yugurish oralig‘i), m', sx: 'tribuna burchaklari egriligi (superellips darajasi)', rows: 'qatorlar soni (eng ko‘p)', tread: 'qator chuqurligi, m', c: 'ko‘rinish chizig‘i C, m (normaga qarab qo‘ying)', eye: 'ko‘z balandligi o‘rindiqdan, m', wall0: 'birinchi qator balandligi (maydon devori), m', seat: 'o‘rindiq eni, m',
  rows2: 'ikkinchi yarus qatorlari (0 — bitta yarus)', tread2: 'ikkinchi yarus qator chuqurligi, m', c2: 'ikkinchi yarus ko‘rinish chizig‘i C, m (normaga qarab qo‘ying)', ov: 'ikkinchi yarus pastki yarus ustiga chiqishi, m (manfiy — orqaga surilgan)', boxH: 'yaruslar orasidagi lojalar qavati balandligi, m', box: 'VIP loja eni, m', boxS: 'lojadagi o‘rinlar', media: 'matbuot tribunasi uzunligi (g‘arbiy uzun tomon markazida), m',
  vom: 'vomitoriyalar (tribunadan chiqishlar) qadami, m', vomW: 'vomitoriya eni, m', flow: 'o‘tkazuvchanlik, kishi/m/daqiqa (normaga qarab qo‘ying)', tEv: 'tribunani bo‘shatish vaqti chegarasi, daqiqa (normaga qarab qo‘ying)', row: 'qatordagi o‘rindiqdan o‘tish yo‘ligacha eng ko‘p, o‘rin (normaga qarab qo‘ying)', conc: 'tribuna orqasidagi konkors eni, m', cpp: 'konkorsda bir tomoshabinga maydon, m² (normaga qarab qo‘ying)', tExit: 'binodan chiqish vaqti chegarasi, daqiqa (normaga qarab qo‘ying)', doorW: 'tashqi eshik (juft tabaqa) eni, m', kT: 'tom fermasi: balandlik = oraliq / kT (15–20 odatiy diapazon)', fh: 'konkors qavat balandligi, m', clr: 'shiftgacha eng kam balandlik, m', cores: 'zina-lift yadrolari soni',
  mPT: 'jamoat transporti ulushi, %', mCar: 'shaxsiy avtomobil ulushi, %', mTaxi: 'taksi ulushi, % (qolgani — piyoda/velosiped)', occ: 'avtomobildagi odam (o‘rtacha)', bus: 'avtobus sig‘imi, kishi', tOut: 'stadiondan tarqalish vaqti (transport), daqiqa', tPed: 'ko‘priklardan o‘tish vaqti, daqiqa', qPed: 'piyoda o‘tkazuvchanligi, kishi/m/daqiqa (normaga qarab qo‘ying)', stall: 'bitta avtomobil joyi yo‘laklar bilan, m²',
  plat: 'platforma (atrof maydon) eni, m', arms: 'radial ko‘priklar soni', armA: 'birinchi ko‘prik burchagi, °', armW: 'ko‘prik eni, m', armL: 'ko‘prik platformadan tashqari uzunligi, m', isl: 'ko‘kalamzor orolchalar soni', seed: 'daraxtlar urug‘i', nv: 'tom profili nuqtalari' };
const ringKey = k => Object.keys(RING_DEF).find(q => q.toLowerCase() === String(k).toLowerCase()) || k;
function ringGeom(M, e) {
  const P = Object.assign({}, RING_DEF, e.p || {}); const at = resolve(M, e.at), rot = (e.rot || 0) * Math.PI / 180, co = Math.cos(rot), si = Math.sin(rot);
  const R = Math.max(30, P.R), ri = Math.max(10, Math.min(R - 10, P.ri)), H = Math.max(8, P.H), rc = ri + Math.max(0.1, Math.min(0.9, P.crown)) * (R - ri), nv = Math.max(40, Math.round(P.nv)), N = Math.max(6, 2 * Math.round(P.n / 2));
  const T = p => ({ x: at.x + (p[0] * co - p[1] * si) * 1000, y: at.y + (p[0] * si + p[1] * co) * 1000, z: (p[2] || 0) * 1000 });
  const chk = [];
  // ---- tom profili (ρ, z): tashqi tovon → bo'rtma → cho'qqi → maydon ustidagi ichki lab (pastga egilgan konsol)
  const ctrl = [[R - 3, 0], [R + P.bulge, 0.3 * H], [R - 0.5, 0.68 * H], [rc + 0.45 * (R - rc), 0.95 * H], [rc, H], [ri + 0.4 * (rc - ri), 0.93 * H], [ri + 2, 0.8 * H], [ri, 0.68 * H]];
  const prof = crResample(crDense(ctrl, 40), nv, 0).map(p => [p[0], Math.max(0, p[1])]);
  const nrm = prof.map((p, j) => { const a = prof[Math.max(0, j - 1)], b = prof[Math.min(nv, j + 1)], dr = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dr, dz) || 1; return [dz / l, -dr / l]; });
  const sAt = (th, j, off) => { const p = prof[j], n = nrm[j], r = p[0] + n[0] * off, z = Math.max(0, p[1] + n[1] * off); return [r * Math.cos(th), r * Math.sin(th), z]; };
  const ribs = []; const dth = 2 * Math.PI / N;
  for (let i = 0; i < N; i++) { const th0 = i * dth, out = [], inn = [], bin = [];
    for (let j = 0; j <= nv; j++) { const u = j / nv, th = th0 + 0.5 * dth * P.amp * Math.sin(2 * Math.PI * P.f * u + i * Math.PI); out.push(sAt(th, j, 0)); inn.push(sAt(th, j, -P.w)); }
    for (let j = 0; j <= nv; j++) { const a = out[Math.max(0, j - 1)], b = out[Math.min(nv, j + 1)], t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], n = [out[j][0] - inn[j][0], out[j][1] - inn[j][1], out[j][2] - inn[j][2]]; const c = [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]]; const l = Math.hypot(...c) || 1; bin.push(c.map(x => x / l * P.tw / 2)); }
    ribs.push({ out: out.map(T), inn: inn.map(T), bin: bin.map(b => ({ x: (b[0] * co - b[1] * si) * 1000, y: (b[0] * si + b[1] * co) * 1000, z: b[2] * 1000 })) }); }
  const gp = prof.map((p, j) => [p[0] - nrm[j][0] * P.gl, Math.max(0, p[1] - nrm[j][1] * P.gl)]);
  const NT = 96, skin = []; for (let k = 0; k <= NT; k++) { const th = 2 * Math.PI * k / NT; skin.push(prof.map((_, j) => T(sAt(th, j, -P.gl)))); }
  const roofUnder = r => { let z = 0; for (let j = 0; j < nv; j++) { const a = gp[j], b = gp[j + 1]; if ((a[0] - r) * (b[0] - r) <= 0 && a[0] !== b[0]) z = Math.max(z, a[1] + (b[1] - a[1]) * (r - a[0]) / (b[0] - a[0])); } return z; };
  const facR = z => { let r = 0; for (let j = 0; j < nv && prof[j][1] < H * 0.99; j++) { const a = gp[j], b = gp[j + 1]; if ((a[1] - z) * (b[1] - z) <= 0 && a[1] !== b[1]) { r = Math.max(r, a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])); } } return r || gp[0][0]; }; // fasad (tashqi shisha) radiusi z balandlikda
  // ---- maydon va tribuna ichki chegarasi: superellips |x/a|^n + |y/b|^n = 1 (a = L/2 + run, b = W/2 + run)
  const a0 = P.pL / 2 + P.run, b0 = P.pW / 2 + P.run, ne = Math.max(2, P.sx), NS = 144;
  const se = t => { const c = Math.cos(t), s = Math.sin(t); return [a0 * Math.sign(c) * Math.pow(Math.abs(c), 2 / ne), b0 * Math.sign(s) * Math.pow(Math.abs(s), 2 / ne)]; };
  const base = Array.from({ length: NS }, (_, q) => { const t = 2 * Math.PI * q / NS, p = se(t), p2 = se(t + 1e-4), d = [p2[0] - p[0], p2[1] - p[1]], l = Math.hypot(...d) || 1; return { p, n: [d[1] / l, -d[0] / l] }; }); // tashqi normal
  // ---- qatorlar: ko'rinish chizig'i — R(k+1) = (R(k) + C)(D(k) + T)/D(k); D — ko'zdan maydon chetigacha (focal = yon chiziq), ko'tarilish 0,05 m ga yaxlitlanadi
  const Rlim = R - P.conc; let Rk = P.wall0 + P.eye, Dk = P.run + 0.4, zr = [P.wall0], dd = [0], rakeMax = 0;
  for (let k = 1; k < Math.max(1, Math.round(P.rows)); k++) { const Rn = (Rk + P.c) * (Dk + P.tread) / Dk; let rs = Math.ceil((Rn - Rk) / 0.05) * 0.05; rs = Math.max(0.15, rs); rakeMax = Math.max(rakeMax, Math.atan(rs / P.tread) * 180 / Math.PI); Rk += rs; Dk += P.tread; zr.push(zr[k - 1] + rs); dd.push(k * P.tread); }
  const n1 = zr.length; if (P.rows2 > 0) { // ikkinchi yarus: lojalar qavati ustida, pastki yarus ustiga ov m chiqib turadi; ko'rinish chizig'i shu joydan davom etadi
    const d0 = dd[n1 - 1] + P.tread - P.ov, z0 = zr[n1 - 1] + P.boxH, t2 = P.tread2 || P.tread; let R2 = z0 + P.eye, D2 = d0 + P.run; zr.push(z0); dd.push(d0);
    for (let k = 1; k < Math.round(P.rows2); k++) { const Rn = (R2 + P.c2) * (D2 + t2) / D2; let rs = Math.max(0.15, Math.ceil((Rn - R2) / 0.05) * 0.05); rakeMax = Math.max(rakeMax, Math.atan(rs / t2) * 180 / Math.PI); R2 += rs; D2 += t2; zr.push(zr[zr.length - 1] + rs); dd.push(d0 + k * t2); } }
  if (rakeMax > 34) chk.push(['WARN', `Tribuna qiyaligi ${rakeMax.toFixed(0)}° > 34° (yuqori qatorlar juda tik) — qator chuqurligini (tread) oshiring yoki C ni kamaytiring`]);
  const rows = []; let seats = 0, cov = 0; zr.forEach((z, k) => { const tr = k < n1 ? P.tread : (P.tread2 || P.tread), pts = base.map(B => { const d = dd[k] + tr / 2; return [B.p[0] + B.n[0] * d, B.p[1] + B.n[1] * d]; }); let L = 0, Lc = 0; const on = pts.map(p => { const rr = Math.hypot(...p); return rr <= Rlim && (rr < ri || roofUnder(rr) - z >= 2.6 + P.eye); }); /* qator tom ostiga sig'masa yoki konkorsga chiqsa — yo'q */
    for (let q = 0; q < NS; q++) { const p = pts[q], r = pts[(q + 1) % NS]; if (!on[q] || !on[(q + 1) % NS]) continue; const l = Math.hypot(r[0] - p[0], r[1] - p[1]); L += l; if (Math.hypot(...p) >= ri) Lc += l; }
    const n = Math.floor(L * 0.9 / P.seat); seats += n; cov += Math.floor(Lc * 0.9 / P.seat); rows.push({ k, z, d: dd[k], on, pts, seats: n, tier: k < n1 ? 1 : 2 }); });
  // tribuna geometriyasi (har qator: pog'ona tepasi), dunyo
  const tiers = rows.map(r => ({ k: r.k, tier: r.tier, z: r.z, on: r.on, a: base.map(B => T([B.p[0] + B.n[0] * r.d, B.p[1] + B.n[1] * r.d, r.z])), b: base.map(B => { const tr = r.tier === 1 ? P.tread : (P.tread2 || P.tread); return T([B.p[0] + B.n[0] * (r.d + tr), B.p[1] + B.n[1] * (r.d + tr), r.z]); }) }));
  // lojalar (VIP) — yaruslar orasida, ikkinchi yarus birinchi qatori bor joyda, uzun tomonlarda (|sin θ| > 0,7); matbuot tribunasi — pastki yarus yuqori 6 qatori, g'arbiy uzun tomon markazida
  const boxes = []; let boxSeats = 0, mediaSeats = 0; if (P.rows2 > 0 && rows[n1]) { const r2 = rows[n1], zb = zr[n1 - 1]; let acc = 0, q0 = -1; for (let q = 0; q < NS; q++) { const p = base[q].p, side = Math.abs(p[1]) / Math.hypot(...p) > 0.7; if (r2.on[q] && side) { const pn = base[(q + 1) % NS].p; acc += Math.hypot(pn[0] - p[0], pn[1] - p[1]); if (q0 < 0) q0 = q; if (acc >= P.box) { boxes.push({ q0, q1: q + 1, z: zb }); acc = 0; q0 = -1; } } else { acc = 0; q0 = -1; } }
    boxSeats = boxes.length * P.boxS; }
  { const top = rows.slice(Math.max(0, n1 - 6), n1); top.forEach(r => { let L = 0; for (let q = 0; q < NS; q++) { const p = r.pts[q], c = Math.hypot(...p); if (!r.on[q] || p[1] / c > -0.7) continue; const pn = r.pts[(q + 1) % NS]; if (Math.abs(p[0]) < P.media / 2) L += Math.hypot(pn[0] - p[0], pn[1] - p[1]); } mediaSeats += Math.floor(L / 0.9); }); }
  const boxG = boxes.map(b => { const d1 = dd[n1 - 1] + P.tread, d0 = d1 - P.ov, P4 = [[b.q0, d0], [b.q1 % NS, d0], [b.q1 % NS, d1 + 3], [b.q0, d1 + 3]].map(([q, d]) => T([base[q].p[0] + base[q].n[0] * d, base[q].p[1] + base[q].n[1] * d, b.z])); return { poly: P4, z: b.z * 1000, h: P.boxH * 1000 }; });
  const seats1 = rows.filter(r => r.tier === 1).reduce((a, r) => a + r.seats, 0), seats2 = seats - seats1;
  const zTop = zr[zr.length - 1], pitch = { field: [[-P.pL / 2, -P.pW / 2], [P.pL / 2, -P.pW / 2], [P.pL / 2, P.pW / 2], [-P.pL / 2, P.pW / 2]].map(p => T([p[0], p[1], 0.05])), apron: base.map(B => T([B.p[0], B.p[1], 0.02])) };
  const line = (x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 0.06, ny = dx / l * 0.06; return [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]].map(p => T([p[0], p[1], 0.07])); };
  const hl = P.pL / 2, hw2 = P.pW / 2, lines = [line(-hl, -hw2, hl, -hw2), line(hl, -hw2, hl, hw2), line(hl, hw2, -hl, hw2), line(-hl, hw2, -hl, -hw2), line(0, -hw2, 0, hw2)];
  for (let q = 0; q < 36; q++) { const t0 = 2 * Math.PI * q / 36, t1 = 2 * Math.PI * (q + 1) / 36; lines.push(line(9.15 * Math.cos(t0), 9.15 * Math.sin(t0), 9.15 * Math.cos(t1), 9.15 * Math.sin(t1))); }
  [-1, 1].forEach(sg => { const x0 = sg * hl, x1 = sg * (hl - 16.5), x2 = sg * (hl - 5.5); lines.push(line(x0, -20.16, x1, -20.16), line(x1, -20.16, x1, 20.16), line(x1, 20.16, x0, 20.16), line(x0, -9.16, x2, -9.16), line(x2, -9.16, x2, 9.16), line(x2, 9.16, x0, 9.16)); });
  // ---- tekshiruvlar: tom tribunaga tegmaydi; qamrov; vomitoriyalar va bo'shatish vaqti; qatordagi o'rinlar
  let hit = 0; rows.forEach(r => r.pts.forEach((p, q) => { if (!r.on[q]) return; const rr = Math.hypot(...p); if (rr >= ri && roofUnder(rr) - r.z < 2.6 + P.eye) hit++; }));
  if (hit) chk.push(['FAIL', `Tom ${hit} ta tribuna nuqtasida yuqori qatorlarga juda yaqin (< ${(2.6 + P.eye).toFixed(1)} m) — H ni oshiring yoki qatorlarni kamaytiring`]);
  const midPer = (() => { const r = rows[Math.floor(rows.length / 2)]; let L = 0; for (let q = 0; q < NS; q++) { const p = r.pts[q], s = r.pts[(q + 1) % NS]; L += Math.hypot(s[0] - p[0], s[1] - p[1]); } return L; })();
  const nVom = Math.max(4, Math.ceil(midPer / Math.max(10, P.vom))), tEv = seats / (nVom * P.vomW * Math.max(1, P.flow)), perRow = Math.floor(P.vom / 2 / P.seat);
  chk.push([tEv > P.tEv ? 'WARN' : 'PASS', `Tribunani bo‘shatish: ${seats.toLocaleString('ru')} o‘rin / (${nVom} vomitoriya × ${P.vomW} m × ${P.flow} kishi/m/daq) ≈ ${tEv.toFixed(1)} daqiqa ${tEv > P.tEv ? '>' : '≤'} ${P.tEv} (parametrlar — normaga qarab)`]);
  if (perRow > P.row) chk.push(['WARN', `Qatorda o‘tish yo‘ligacha ${perRow} o‘rin > ${P.row} — vomitoriya qadamini (vom) kamaytiring`]);
  const covP = seats ? Math.round(cov / seats * 100) : 0; chk.push([covP < 90 ? 'WARN' : 'PASS', `Tom qamrovi: o‘rinlarning ${covP} % i tom ostida (ichki chet radiusi ${ri} m)`]);
  const vomA = Array.from({ length: nVom }, (_, q) => 2 * Math.PI * (q + 0.5) / nVom);
  // ---- konkors qavatlari: tribuna ostida (qator balandligi ≥ z + clr) va fasad orasida; har burchak bo'yicha ichki chegara
  const floors = [], cores = []; let gfa = 0;
  if (P.fh > 0) { const fh = Math.max(3, P.fh); for (let k = 0; k < 12; k++) { const z = k * fh, ro = facR(z + 0.5) - 0.3; if (ro <= 0) break; const kk = zr.findIndex(h => h - 0.4 >= z + P.clr); if (kk < 0) break;
      const inner = base.map(B => [B.p[0] + B.n[0] * dd[kk], B.p[1] + B.n[1] * dd[kk]]).map(p => { const r = Math.hypot(...p); return r > ro - 3 ? [p[0] / r * (ro - 3), p[1] / r * (ro - 3)] : p; });
      const outer = Array.from({ length: NS }, (_, q) => { const t = 2 * Math.PI * q / NS; return [ro * Math.cos(t), ro * Math.sin(t)]; }); const ar = Math.abs(loopArea(outer)) - Math.abs(loopArea(inner)); if (ar < 200) break; gfa += ar;
      floors.push({ k, z: z * 1000, area: Math.round(ar), ro, outer: outer.map(p => T([p[0], p[1], z])), hole: inner.map(p => T([p[0], p[1], z])) }); }
    const nC = Math.max(2, Math.round(P.cores)); for (let c = 0; c < nC; c++) { const ang = (P.armA + (c + 0.5) * 360 / nC) * Math.PI / 180, F1 = floors[floors.length - 1]; if (!F1) break; const rm = Math.min(...floors.map(F => F.ro), facR(0.5)) - 6, /* fasad eng tor joyidan ichkarida */ er = [Math.cos(ang), Math.sin(ang)], et = [-Math.sin(ang), Math.cos(ang)];
      const Rq = (r0, r1, t0, t1) => [[r0, t0], [r1, t0], [r1, t1], [r0, t1]].map(([r, t]) => T([er[0] * r + et[0] * t, er[1] * r + et[1] * t, 0]));
      cores.push({ n: c + 1, ang, top: F1.k, poly: Rq(rm - 4, rm + 4, -3.2, 3.2), flights: [Rq(rm - 3.6, rm - 2.4, -3.2 + 1.4, 3.2 - 1.4), Rq(rm - 2.2, rm - 1.0, -3.2 + 1.4, 3.2 - 1.4)], lift: Rq(rm + 0.8, rm + 3.2, -1.2, 1.2), z1: (F1.z / 1000 + fh) * 1000, steps: Math.ceil(fh * 1000 / 150 / 2) }); }
    floors.forEach(F => chk.push(['INFO', `Konkors ${F.k + 1}-qavat: ${F.area.toLocaleString('ru')} m² (tribuna ostida, fasadgacha)`])); }
  // ---- atrof: platforma, ko'priklar, orolchalar, palmalar
  const disk = Array.from({ length: 144 }, (_, q) => { const t = 2 * Math.PI * q / 144; return T([(R + P.plat) * Math.cos(t), (R + P.plat) * Math.sin(t), 0]); });
  const arms = []; for (let a = 0; a < Math.round(P.arms); a++) { const ang = (P.armA + a * 360 / Math.round(P.arms)) * Math.PI / 180, er = [Math.cos(ang), Math.sin(ang)], et = [-Math.sin(ang), Math.cos(ang)], r0 = R - 4, r1 = R + P.plat + P.armL, w2 = P.armW / 2;
    arms.push({ ang, poly: [[r0, -w2], [r1, -w2], [r1, w2], [r0, w2]].map(([r, t]) => T([er[0] * r + et[0] * t, er[1] * r + et[1] * t, 0])) }); }
  const rnd = (() => { let s9 = (Math.abs(Math.round(P.seed)) % 2147483646) + 1; return () => (s9 = (s9 * 16807) % 2147483647) / 2147483647; })();
  const islands = [], trees = []; for (let q = 0; q < Math.round(P.isl); q++) { const ang = (P.armA + (q + 0.5) * 360 / Math.max(1, Math.round(P.isl))) * Math.PI / 180, rr = R + 0.52 * P.plat, A2 = 0.3 * P.plat, B2 = Math.max(4, Math.min(0.5 * rr * 2 * Math.PI / Math.max(1, P.isl) - P.armW / 2 - 6, 3 * A2)), er = [Math.cos(ang), Math.sin(ang)], et = [-Math.sin(ang), Math.cos(ang)];
    const pl = Array.from({ length: 48 }, (_, k) => { const t = 2 * Math.PI * k / 48, c = Math.cos(t), s = Math.sin(t), x = A2 * Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.6), y = B2 * Math.sign(s) * Math.pow(Math.abs(s), 2 / 2.6); return T([er[0] * (rr + x) + et[0] * y, er[1] * (rr + x) + et[1] * y, 0.45]); });
    islands.push({ ang, poly: pl, area: Math.round(Math.PI * A2 * B2 * 0.9) }); for (let t = 0; t < 12; t++) { const x = (rnd() - 0.5) * 1.3 * A2, y = (rnd() - 0.5) * 1.5 * B2; trees.push({ p: T([er[0] * (rr + x) + et[0] * y, er[1] * (rr + x) + et[1] * y, 0.45]), h: 7 + rnd() * 6 }); } }
  // ---- transport va avtoturargoh (tadbirdan keyin tarqalish): talab ulushlar bo'yicha; ko'priklar eni — piyoda oqimi; avtoturargohlar ko'priklar uchida (quruqlikda)
  const S0 = seats + boxSeats, cars = Math.ceil(S0 * P.mCar / 100 / Math.max(1, P.occ)), parkA = cars * P.stall, buses = Math.ceil(S0 * P.mPT / 100 / Math.max(1, P.bus)), busH = Math.ceil(buses / (P.tOut / 60)), taxis = Math.ceil(S0 * P.mTaxi / 100 / 2), taxiBays = Math.ceil(taxis / P.tOut * 1.5);
  const nA = Math.max(1, Math.round(P.arms)), wNeed = S0 / (P.tPed * Math.max(1, P.qPed)), wHave = nA * P.armW;
  chk.push([wHave >= wNeed ? 'PASS' : 'WARN', `Ko‘priklar: ${S0.toLocaleString('ru')} kishi ${P.tPed} daqiqada → kerakli umumiy eni ${wNeed.toFixed(0)} m, bor ${nA} × ${P.armW} = ${wHave} m (${P.qPed} kishi/m/daq — parametr)`]);
  chk.push(['INFO', `Transport (tarqalish ${P.tOut} daq): avtomobil ${cars.toLocaleString('ru')} joy (${Math.round(parkA / 10000 * 10) / 10} ga), jamoat transporti ≈ ${buses} avtobus reysi (${busH} reys/soat), taksi to‘xtash joyi ${taxiBays} ta — ulushlar parametr`]);
  const lots = []; if (cars > 0) { const Wp = Math.max(P.armW + 32, 96), Lp = parkA / nA / Wp; for (let a = 0; a < nA; a++) { const ang = (P.armA + a * 360 / nA) * Math.PI / 180, er = [Math.cos(ang), Math.sin(ang)], et = [-Math.sin(ang), Math.cos(ang)], r0 = R + P.plat + P.armL, r1 = r0 + Lp, w2 = Wp / 2;
      const Lt = (r, t) => T([er[0] * r + et[0] * t, er[1] * r + et[1] * t, 0.05]); const rowsL = []; for (let t = -w2 + 8; t < w2 - 4; t += 16) rowsL.push([Lt(r0 + 3, t), Lt(r1 - 3, t)]);
      lots.push({ poly: [Lt(r0, -w2), Lt(r1, -w2), Lt(r1, w2), Lt(r0, w2)], rows: rowsL, cars: Math.round(cars / nA), L: Lp, W: Wp, bus: a === 0 }); } }
  const lam = ribs.reduce((s, r) => { let L = 0; for (let j = 0; j < nv; j++) { const a = r.out[j], b = r.out[j + 1]; L += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / 1000; } return s + L; }, 0);
  let skinA = 0; for (let j = 0; j < nv; j++) { const a = prof[j], b = prof[j + 1]; skinA += 2 * Math.PI * (a[0] + b[0]) / 2 * Math.hypot(b[0] - a[0], b[1] - a[1]); }
  return { e, P, N, nv, NS, prof, gp, ribs, skin, NT, rows, tiers, n1, seats1, seats2, boxes: boxG, boxSeats, mediaSeats, lots, tr: { cars, parkA, buses, busH, taxiBays, wNeed: +wNeed.toFixed(1), wHave }, pitch, lines, vomA, nVom, seats, covP, tEv: +tEv.toFixed(1), rakeMax: +rakeMax.toFixed(1), zTop: +zTop.toFixed(2), floors, cores, disk, arms, islands, trees, checks: chk, T, facR, H: +Math.max(...prof.map(p => p[1])).toFixed(1), gfa: Math.round(gfa), lamL: Math.round(lam), lamV: +(lam * P.w * P.tw).toFixed(0), skinA: Math.round(skinA), hole: ri };
}

// ---------- OVAL ZAL (oval): rejada superellips, kesimda bo'rtgan «yostiq» (pastda va tepada yumaloq); fasad — uchburchakli to'r (ikki diagonal + gorizontal),
// ba'zi kataklar yopiq oq panel; to'r ortida `gl` m ichkarida shisha. Kirishda fasadning pastki cheti arka bo'lib ko'tariladi (archH, archW), ostida shisha chuqurroq (archD).
const OVAL_DEF = { fn: 1, cL: 44, cW: 24, run: 6, rows: 26, tread: 0.85, c: 0.06, eye: 1.2, wall0: 1.1, seat: 0.5, conc: 7, cpp: 0.3, tExit: 6, doorW: 1.8, kT: 18, vom: 12, vomW: 1.8, flow: 60, tEv: 6, A: 120, B: 76, ne: 2.6, H: 26, bulge: 4, rtop: 5, cell: 5, solid: 0.18, w: 0.6, tw: 0.25, gl: 2.5, arches: 1, archA: 270, archH: 14, archW: 34, archD: 6, fh: 6, clr: 3.5, void: 0.45, cores: 8, evac: 40, plazaW: 120, plazaD: 70, stripe: 2.4, seed: 5 };
const OVAL_HELP = { fn: 'vazifasi: 1 — sport saroyi (arena + tribunalar), 0 — universal (qavatlar + atrium)', cL: 'arena maydoni uzunligi, m (gandbol/futzal 40 × 20 + zona)', cW: 'arena maydoni eni, m', run: 'maydon chetidan birinchi qatorgacha, m', rows: 'tribuna qatorlari (eng ko‘p)', tread: 'qator chuqurligi, m', c: 'ko‘rinish chizig‘i C, m (normaga qarab qo‘ying)', eye: 'ko‘z balandligi o‘rindiqdan, m', wall0: 'birinchi qator balandligi (to‘siq), m', seat: 'o‘rindiq eni, m', conc: 'tribuna orqasidagi konkors eni, m', vom: 'tribunadan chiqishlar qadami, m', vomW: 'chiqish eni, m', flow: 'o‘tkazuvchanlik, kishi/m/daqiqa (normaga qarab qo‘ying)', tEv: 'tribunani bo‘shatish chegarasi, daqiqa (normaga qarab qo‘ying)', A: 'uzunligi (rejada), m', B: 'eni (rejada), m', ne: 'reja shakli: 2 — ellips, katta — to‘rtburchakka yaqin', H: 'balandligi, m', bulge: 'fasad bo‘rtishi (o‘rtada), m', rtop: 'tepa cheti yumaloqligi, m', cell: 'to‘r katagi (perimetr bo‘ylab), m', solid: 'yopiq oq panellar ulushi (0…1)', w: 'to‘r elementi chuqurligi, m', tw: 'to‘r elementi qalinligi, m', gl: 'shisha to‘rdan ichkarida, m',
  arches: 'kirish arkalari soni (0, 1 yoki 2 — qarama-qarshi)', archA: 'birinchi arka yo‘nalishi, ° (0 — sharq, 90 — janub, 270 — shimol; rejada)', archH: 'arka balandligi, m', archW: 'arka yarim kengligi (perimetr bo‘ylab), m', archD: 'arka ostida shisha qancha ichkarida, m', fh: 'qavat balandligi, m', clr: 'shiftgacha eng kam balandlik, m', void: 'yuqori qavatlarda o‘rtadagi bo‘shliq (atrium) ulushi (0…0,8)', cores: 'zina-lift yadrolari soni', evac: 'eng uzoq nuqtadan zinagacha ruxsat, m (normaga qarab qo‘ying)',
  plazaW: 'kirish oldidagi maydon eni, m (0 — yo‘q)', plazaD: 'maydon chuqurligi, m', stripe: 'yo‘l-yo‘l qoplama tasmasi eni, m', seed: 'panellar urug‘i' };
const ovalKey = k => Object.keys(OVAL_DEF).find(q => q.toLowerCase() === String(k).toLowerCase()) || k;
function ovalGeom(M, e) {
  const P = Object.assign({}, OVAL_DEF, e.p || {}); const at = resolve(M, e.at), rot = (e.rot || 0) * Math.PI / 180, co = Math.cos(rot), si = Math.sin(rot);
  const T = p => ({ x: at.x + (p[0] * co - p[1] * si) * 1000, y: at.y + (p[0] * si + p[1] * co) * 1000, z: (p[2] || 0) * 1000 });
  const a = Math.max(10, P.A / 2), b = Math.max(8, P.B / 2), ne = Math.max(2, P.ne), H = Math.max(6, P.H), chk = [];
  // reja konturi — yoy uzunligi bo'yicha teng bo'lingan (u ∈ [0, 1)), tashqi normal
  const se = t => { const c = Math.cos(t), s = Math.sin(t); return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / ne), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / ne)]; };
  const NB = 720, raw = Array.from({ length: NB }, (_, q) => se(2 * Math.PI * q / NB)), cum = [0]; for (let q = 1; q <= NB; q++) { const p = raw[q - 1], r = raw[q % NB]; cum.push(cum[q - 1] + Math.hypot(r[0] - p[0], r[1] - p[1])); } const Lp = cum[NB];
  const baseAt = u => { const s = ((u % 1) + 1) % 1 * Lp; let lo = 0, hi = NB; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; } const f = (s - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1), p = raw[lo], r = raw[(lo + 1) % NB]; const d = [r[0] - p[0], r[1] - p[1]], l = Math.hypot(...d) || 1; return { p: [p[0] + d[0] * f, p[1] + d[1] * f], n: [d[1] / l, -d[0] / l] }; };
  // kesim profili (offset d, z) — yoy uzunligi σ bo'yicha
  const ctrl = [[-0.6, 0], [P.bulge * 0.55, 0.16 * H], [P.bulge, 0.48 * H], [P.bulge * 0.6, 0.8 * H], [P.bulge * 0.1 - P.rtop * 0.3, 0.96 * H], [-P.rtop, H]];
  const prof = crResample(crDense(ctrl, 40), 200, 0); const sg = [0]; for (let j = 1; j < prof.length; j++) sg.push(sg[j - 1] + Math.hypot(prof[j][0] - prof[j - 1][0], prof[j][1] - prof[j - 1][1])); const SL = sg[sg.length - 1];
  const profAt = s => { s = Math.max(0, Math.min(SL, s)); let j = 1; while (j < sg.length - 1 && sg[j] < s) j++; const f = (s - sg[j - 1]) / ((sg[j] - sg[j - 1]) || 1), p = prof[j - 1], q = prof[j]; const dd = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dd, dz) || 1; return { d: p[0] + dd * f, z: p[1] + dz * f, nd: dz / l, nz: -dd / l }; };
  const zToS = z => { for (let j = 1; j < prof.length; j++) if (prof[j][1] >= z) { const f = (z - prof[j - 1][1]) / ((prof[j][1] - prof[j - 1][1]) || 1); return sg[j - 1] + (sg[j] - sg[j - 1]) * f; } return SL; };
  // arka(lar): u markazi — archA yo'nalishidagi kontur nuqtasi
  const nArch = Math.max(0, Math.min(2, Math.round(P.arches))), uc = []; if (nArch) { const ang = P.archA * Math.PI / 180; let best = 0, bd = -1e9; for (let q = 0; q < 360; q++) { const u = q / 360, B0 = baseAt(u), v = B0.p[0] * Math.cos(ang) + B0.p[1] * Math.sin(ang); if (v > bd) { bd = v; best = u; } } uc.push(best); if (nArch > 1) uc.push((best + 0.5) % 1); }
  const wu = Math.max(2, P.archW) / Lp, gA = u => uc.reduce((m, c) => { const d = Math.abs(((u - c + 1.5) % 1) - 0.5); return Math.max(m, d < wu ? Math.pow(Math.cos(Math.PI / 2 * d / wu), 2) : 0); }, 0);
  const zb = u => P.archH * gA(u); // fasad pastki cheti balandligi
  const pt = (u, s, off) => { const B0 = baseAt(u), pr = profAt(s), dd = pr.d + pr.nd * (off || 0), z = pr.z + pr.nz * (off || 0); return [B0.p[0] + B0.n[0] * dd, B0.p[1] + B0.n[1] * dd, Math.max(0, z)]; };
  // to'r: ikki diagonal oila (u ± σ·k) va gorizontal halqalar (σ = j·dz); arka ostida kesiladi
  const nU = Math.max(12, Math.round(Lp / Math.max(1.5, P.cell))), du = 1 / nU, dz = Math.max(1.2, P.cell * 0.9), kU = du / dz * 0.5, members = [], nS = Math.ceil(SL / 0.5);
  const cut = (u, s) => profAt(s).z < zb(u) + 0.15;
  const addLine = pts => { if (pts.length < 2) return; const out = pts.map(([u, s]) => pt(u, s, 0)), inn = pts.map(([u, s]) => pt(u, s, -P.w)); members.push({ out, inn }); };
  for (let fam = -1; fam <= 1; fam += 2) for (let i = 0; i < nU; i++) { let cur = []; for (let k = 0; k <= nS; k++) { const s = SL * k / nS, u = i * du + fam * s * kU; if (cut(u, s) || profAt(s).z > H - 0.2) { addLine(cur); cur = []; continue; } cur.push([u, s]); } addLine(cur); }
  for (let j = 1; j * dz < SL - 0.5; j++) { const s = j * dz, NU = Math.round(Lp / 0.8); let cur = []; for (let k = 0; k <= NU; k++) { const u = k / NU; if (cut(u, s)) { addLine(cur); cur = []; continue; } cur.push([u, s]); } addLine(cur); }
  // arka cheti — qalin oq tasma (fasaddan shishagacha)
  const edge = []; if (nArch) { const NU = 600; for (let k = 0; k <= NU; k++) { const u = k / NU, z = zb(u); if (z < 0.05) { if (edge.length && edge[edge.length - 1].length) edge.push([]); continue; } const s = zToS(z); if (!edge.length) edge.push([]); edge[edge.length - 1].push({ o: pt(u, s, 0.15), i: pt(u, s, -P.gl - P.archD * gA(u)) }); } }
  const edges = edge.filter(L => L.length > 1).map(L => L.map(q => ({ o: T(q.o), i: T(q.i) })));
  // panellar: uchburchak kataklar (diagonal × gorizontal) — `solid` ulushi yopiq
  const rnd = (() => { let s9 = (Math.abs(Math.round(P.seed)) % 2147483646) + 1; return () => (s9 = (s9 * 16807) % 2147483647) / 2147483647; })();
  const panels = []; let nCells = 0; for (let j = 0; (j + 1) * dz < SL - 0.5; j++) for (let i = 0; i < nU; i++) { const s0 = j * dz, s1 = (j + 1) * dz, sm = (s0 + s1) / 2; [0, 1].forEach(h => { const uC = i * du + (h ? du / 2 : 0); const P3 = h ? [[uC - du / 2 + s0 * 0, s1], [uC + du / 2, s1], [uC, s0]] : [[uC - du / 2, s0], [uC + du / 2, s0], [uC, s1]]; if (P3.some(([u, s]) => cut(u, s) || profAt(s).z > H - 0.3)) return; nCells++; if (rnd() < P.solid) panels.push(P3.map(([u, s]) => T(pt(u, s, -0.08)))); }); }
  // shisha qobiq: d(σ) − gl, arka ostida archD chuqurroq va tik
  const NUg = 240, NSg = 40, glass = []; for (let k = 0; k <= NUg; k++) { const u = k / NUg, g = gA(u), row = []; for (let q = 0; q <= NSg; q++) { const s = SL * q / NSg, pr = profAt(s), z = pr.z, B0 = baseAt(u); let dd = pr.d - P.gl; if (z < zb(u) + 1) dd = Math.min(dd, -P.gl - P.archD * g); dd -= P.archD * g * (1 - sstep(zb(u), zb(u) + 3, z)) * (z >= zb(u) ? 1 : 0); row.push(T([B0.p[0] + B0.n[0] * dd, B0.p[1] + B0.n[1] * dd, Math.min(z, H - P.rtop * 0.2)])); } glass.push(row); }
  const roof = Array.from({ length: 180 }, (_, q) => { const B0 = baseAt(q / 180), dd = profAt(SL).d; return T([B0.p[0] + B0.n[0] * dd, B0.p[1] + B0.n[1] * dd, H]); });
  // qavatlar: shisha ichida (z da shisha offseti), yuqorida o'rtada atrium
  const glassD = (u, z) => { const s = zToS(z), pr = profAt(s); let dd = pr.d - P.gl; if (z < zb(u) + 1) dd = Math.min(dd, -P.gl - P.archD * gA(u)); return dd - 0.3; };
  const floors = [], cores = []; let gfa = 0; const NF = 180; let sport = null;
  const ringAt = (z, inset) => Array.from({ length: NF }, (_, q) => { const u = q / NF, B0 = baseAt(u), dd = Math.min(glassD(u, z), glassD(u, z + P.clr)) - (inset || 0); return [B0.p[0] + B0.n[0] * dd, B0.p[1] + B0.n[1] * dd]; });
  const inPl = (p, L) => { let c = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const A2 = L[i], B2 = L[j]; if ((A2[1] > p[1]) !== (B2[1] > p[1]) && p[0] < (B2[0] - A2[0]) * (p[1] - A2[1]) / (B2[1] - A2[1]) + A2[0]) c = !c; } return c; };
  if (P.fn === 1) { // ---- SPORT SAROYI: arena + tribunalar (ko'rinish chizig'i), tribuna ostida xizmat xonalari, tepada konkors
    const a0 = P.cL / 2 + P.run, b0 = P.cW / 2 + P.run, ns2 = 4, NS = 144, se2 = t => { const c = Math.cos(t), s2 = Math.sin(t); return [a0 * Math.sign(c) * Math.pow(Math.abs(c), 2 / ns2), b0 * Math.sign(s2) * Math.pow(Math.abs(s2), 2 / ns2)]; };
    const bas = Array.from({ length: NS }, (_, q) => { const t = 2 * Math.PI * q / NS, p = se2(t), p2 = se2(t + 1e-4), d = [p2[0] - p[0], p2[1] - p[1]], l = Math.hypot(...d) || 1; return { p, n: [d[1] / l, -d[0] / l] }; });
    let Rk = P.wall0 + P.eye, Dk = P.run + 0.4, rake = 0; const zr = [P.wall0], dd = [0];
    for (let k = 1; k < Math.max(1, Math.round(P.rows)); k++) { const Rn = (Rk + P.c) * (Dk + P.tread) / Dk; let rs = Math.max(0.15, Math.ceil((Rn - Rk) / 0.05) * 0.05); rake = Math.max(rake, Math.atan(rs / P.tread) * 180 / Math.PI); Rk += rs; Dk += P.tread; zr.push(zr[k - 1] + rs); dd.push(k * P.tread); }
    const rows = []; let seats = 0; zr.forEach((z, k) => { const lim = ringAt(z, P.conc), roofOk = z + P.eye + 2.6 <= H - P.rtop; const pts = bas.map(B0 => [B0.p[0] + B0.n[0] * (dd[k] + P.tread / 2), B0.p[1] + B0.n[1] * (dd[k] + P.tread / 2)]); const on = pts.map(p => roofOk && inPl(p, lim)); let L = 0; for (let q = 0; q < NS; q++) { const q1 = (q + 1) % NS; if (on[q] && on[q1]) L += Math.hypot(pts[q1][0] - pts[q][0], pts[q1][1] - pts[q][1]); } const n = Math.floor(L * 0.9 / P.seat); seats += n; rows.push({ k, z, d: dd[k], on, seats: n }); });
    const rowsOn = rows.filter(r => r.seats > 0), last = rowsOn[rowsOn.length - 1] || rows[0], zTop = last.z;
    if (rake > 34) chk.push(['WARN', `Tribuna qiyaligi ${rake.toFixed(0)}° > 34° — qator chuqurligini oshiring yoki C ni kamaytiring`]);
    const tiers = rows.map(r => ({ k: r.k, z: r.z, on: r.on, a: bas.map(B0 => T([B0.p[0] + B0.n[0] * r.d, B0.p[1] + B0.n[1] * r.d, r.z])), b: bas.map(B0 => T([B0.p[0] + B0.n[0] * (r.d + P.tread), B0.p[1] + B0.n[1] * (r.d + P.tread), r.z])) }));
    const midR = rows[Math.floor(rowsOn.length / 2)] || rows[0]; let per = 0; for (let q = 0; q < NS; q++) { const p = bas[q], r2 = bas[(q + 1) % NS], d = midR.d; per += Math.hypot(r2.p[0] + r2.n[0] * d - p.p[0] - p.n[0] * d, r2.p[1] + r2.n[1] * d - p.p[1] - p.n[1] * d); }
    const nVom = Math.max(4, Math.ceil(per / Math.max(6, P.vom))), tEv = seats / (nVom * P.vomW * Math.max(1, P.flow)), perRow = Math.floor(P.vom / 2 / P.seat);
    chk.push([tEv > P.tEv ? 'WARN' : 'PASS', `Tribunani bo‘shatish: ${seats.toLocaleString('ru')} o‘rin / (${nVom} chiqish × ${P.vomW} m × ${P.flow} kishi/m/daq) ≈ ${tEv.toFixed(1)} daqiqa ${tEv > P.tEv ? '>' : '≤'} ${P.tEv} (parametrlar — normaga qarab)`]);
    // 1-qavat: arena (maydon) + tribuna ostidagi xizmat halqasi (qator balandligi ≥ clr dan boshlab fasadgacha)
    const outer0 = ringAt(0, 0), kk = zr.findIndex(h => h - 0.4 >= P.clr), dIn = kk >= 0 ? dd[kk] : dd[dd.length - 1] + P.tread;
    const hole0 = bas.map(B0 => [B0.p[0] + B0.n[0] * dIn, B0.p[1] + B0.n[1] * dIn]), arena = bas.map(B0 => B0.p);
    const servA = Math.max(0, Math.abs(loopArea(outer0)) - Math.abs(loopArea(hole0))), arenaA = Math.abs(loopArea(arena));
    const PROG = [['Kiyinish xonalari (4 jamoa, dush bilan)', 4 * 70], ['Hakamlar xonalari', 2 * 25], ['Tibbiyot punkti', 40], ['Doping nazorati', 35], ['Murabbiylar / jamoa xodimlari', 60], ['Matbuot zali va ish joylari', 150], ['Ombor (sport jihozlari)', 120], ['Texnik xonalar (ventilyatsiya, issiqlik, elektr)', 0.12 * (servA + arenaA)], ['Isinish zali', 300], ['Ma’muriyat', 100]];
    const progA = PROG.reduce((x, r) => x + r[1], 0); chk.push([progA <= servA ? 'PASS' : 'WARN', `Tribuna ostidagi xizmat halqasi ${Math.round(servA).toLocaleString('ru')} m² — dastur ${Math.round(progA).toLocaleString('ru')} m² (kiyinish, hakamlar, tibbiyot, matbuot, isinish zali, texnik) ${progA <= servA ? 'sig‘adi' : 'sig‘maydi'}`]);
    floors.push({ k: 0, z: 0, area: Math.round(servA + arenaA), outer: outer0.map(p => T([p[0], p[1], 0])), hole: null, ring: outer0, vr: 0, arena: true }); gfa += servA + arenaA;
    // konkors: o'rta sathda (z = fh) — yuqori qatorlar ostida (shift ≥ clr) yoki pastroq tribuna orqasida, fasadgacha; tribunasiz joy (kirish) — ikki qavatli holl
    const zc = Math.max(3, P.fh), oc = ringAt(zc, 0), hc = bas.map((B0, q) => { let kb = -1; rows.forEach((r, k) => { if (r.on[q]) kb = k; }); if (kb < 0) return null; const ku = rows.findIndex(r => r.on[q] && r.z - 0.4 >= zc + P.clr); const db = ku >= 0 ? dd[ku] : dd[kb] + P.tread + 0.3; return [B0.p[0] + B0.n[0] * db, B0.p[1] + B0.n[1] * db]; });
    const hcM = oc.map(po => { const th = Math.atan2(po[1], po[0]); let best = null, bd = 9; bas.forEach((B0, q) => { let d = Math.abs(Math.atan2(B0.p[1], B0.p[0]) - th); d = Math.min(d, 2 * Math.PI - d); if (d < bd) { bd = d; best = hc[q]; } }); return best || [po[0] * 0.995, po[1] * 0.995]; }); const ac = Math.abs(loopArea(oc)) - Math.abs(loopArea(hcM));
    chk.push([ac / Math.max(1, seats) >= P.cpp ? 'PASS' : 'WARN', `Konkors: ${Math.round(ac).toLocaleString('ru')} m² — bir tomoshabinga ${(ac / Math.max(1, seats)).toFixed(2)} m² (chegara ${P.cpp} — parametr); kam bo‘lsa konkors enini (conc) oshiring`]);
    if (ac > 100) { floors.push({ k: 1, z: zc * 1000, area: Math.round(ac), outer: oc.map(p => T([p[0], p[1], zc])), hole: oc.map((po, qi) => { const th = Math.atan2(po[1], po[0]); let best = null, bd = 9; bas.forEach((B0, q) => { let d = Math.abs(Math.atan2(B0.p[1], B0.p[0]) - th); d = Math.min(d, 2 * Math.PI - d); if (d < bd) { bd = d; best = hc[q]; } }); return best || [po[0] * 0.995, po[1] * 0.995]; }).map(p => T([p[0], p[1], zc])), /* qutb burchagi bo'yicha moslash */ ring: oc, vr: 0, conc: true }); gfa += ac; }
    // arena tomining kolonnasiz oralig'i (eng tor joyi) — fazoviy ferma kerak
    const roofR = ringAt(H - P.rtop - 1, 0); let span = 1e9; for (let q = 0; q < NF / 2; q++) { const p = roofR[q], r2 = roofR[q + NF / 2]; span = Math.min(span, Math.hypot(p[0] - r2[0], p[1] - r2[1])); }
    const trussH = span / Math.max(8, P.kT); chk.push(['INFO', `Arena ${P.cL} × ${P.cW} m (${Math.round(arenaA)} m² zona bilan), tribuna ${rowsOn.length} qator (tepasi ${zTop.toFixed(1)} m), tomning kolonnasiz oralig‘i ≈ ${span.toFixed(0)} m — fazoviy ferma balandligi ≈ ${trussH.toFixed(1)} m (oraliq / ${P.kT}, dastlabki taxmin)`]); if (zTop + P.eye + 2.6 + trussH > H - 0.5) chk.push(['WARN', `Ferma (${trussH.toFixed(1)} m) yuqori qatorlar ustida joy yetishmaydi — H ni oshiring`]);
    const lines = [], ln = (x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 0.05, ny = dx / l * 0.05; lines.push([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]].map(p => T([p[0], p[1], 0.06]))); }; const hl = P.cL / 2 - 2, hw = P.cW / 2 - 2;
    ln(-hl, -hw, hl, -hw); ln(hl, -hw, hl, hw); ln(hl, hw, -hl, hw); ln(-hl, hw, -hl, -hw); ln(0, -hw, 0, hw); for (let q = 0; q < 24; q++) { const t0 = 2 * Math.PI * q / 24, t1 = 2 * Math.PI * (q + 1) / 24; ln(3 * Math.cos(t0), 3 * Math.sin(t0), 3 * Math.cos(t1), 3 * Math.sin(t1)); }
    [-1, 1].forEach(sg => { for (let q = 0; q < 12; q++) { const t0 = -Math.PI / 2 + Math.PI * q / 12, t1 = -Math.PI / 2 + Math.PI * (q + 1) / 12; ln(sg * (hl - 6 * Math.cos(t0)), 6 * Math.sin(t0), sg * (hl - 6 * Math.cos(t1)), 6 * Math.sin(t1)); } });
    const vomA = Array.from({ length: nVom }, (_, q) => 2 * Math.PI * (q + 0.5) / nVom);
    // ---- transformatsiya: doimiy tribuna ichki cheti (a0, b0) o'zgarmaydi; kichik maydonda bo'shliqqa yig'iladigan (teleskopik) qatorlar chiqadi, katta maydonda (muz) pastki qatorlar olinadi
    const perAt = d => { let L = 0; for (let q = 0; q < NS; q++) { const p = bas[q], r2 = bas[(q + 1) % NS]; L += Math.hypot(r2.p[0] + r2.n[0] * d - p.p[0] - p.n[0] * d, r2.p[1] + r2.n[1] * d - p.p[1] - p.n[1] * d); } return L; };
    const CFG = [['Gandbol / futzal', 40, 20, 2], ['Basketbol', 28, 15, 2], ['Voleybol', 18, 9, 3], ['Muz xokkeyi (60 × 30)', 60, 30, 2], ['Konsert (sahna bir uchida, maydonda tik turish)', 40, 20, 2]];
    const cfgs = CFG.map(([nm, L2, W2, r2]) => { const gx = a0 - (L2 / 2 + r2), gy = b0 - (W2 / 2 + r2), g = Math.min(gx, gy); let ret = 0, nr = 0, lost = 0;
      if (g >= P.tread) { nr = Math.floor(g / P.tread); for (let k = 1; k <= nr; k++) ret += Math.floor(perAt(-k * P.tread + P.tread / 2) * 0.9 / P.seat); } else if (g < 0) { const nl = Math.ceil(-g / P.tread); lost = rows.slice(0, nl).reduce((x, r) => x + r.seats, 0); }
      const stand = nm.startsWith('Konsert') ? Math.floor(L2 * W2 * 0.75 / 0.5) : 0, stage = nm.startsWith('Konsert') ? Math.floor(rows.reduce((x, r) => x + r.seats, 0) * 0.25) : 0; // konsert: sahna orqasidagi ~25 % o'rin yopiladi; maydonda 2 kishi/m² (75 % maydon)
      return { nm, L: L2, W: W2, ret, nr, lost, total: seats + ret - lost - stage + stand, stand, stage }; });
    // ---- tashqi eshiklar: (tomoshabin + 5 % xodim) / (tExit × flow) → umumiy eni; juft tabaqali eshiklar soni
    const occ = Math.ceil((seats + Math.max(...cfgs.map(c => c.ret))) * 1.05), wDoor = occ / (Math.max(1, P.tExit) * Math.max(1, P.flow)), nDoor = Math.ceil(wDoor / Math.max(0.9, P.doorW));
    chk.push(['INFO', `Tashqi eshiklar: eng ko‘p ${occ.toLocaleString('ru')} kishi ${P.tExit} daqiqada → umumiy eni ${wDoor.toFixed(1)} m → ${nDoor} ta ${P.doorW} m li eshik (kamida 2 yo‘nalishga taqsimlanadi; parametrlar — normaga qarab)`]);
    sport = { cfgs, occ, wDoor: +wDoor.toFixed(1), nDoor, trussH: +trussH.toFixed(1), seats, rows: rowsOn.length, rake: +rake.toFixed(1), zTop: +zTop.toFixed(2), nVom, tEv: +tEv.toFixed(1), perRow, servA: Math.round(servA), arenaA: Math.round(arenaA), prog: PROG.map(r => [r[0], Math.round(r[1])]), progA: Math.round(progA), span: Math.round(span), tiers, NS, court: [[-P.cL / 2, -P.cW / 2], [P.cL / 2, -P.cW / 2], [P.cL / 2, P.cW / 2], [-P.cL / 2, P.cW / 2]].map(p => T([p[0], p[1], 0.04])), zone: arena.map(p => T([p[0], p[1], 0.02])), lines, vomA, serv: { outer: outer0.map(p => T([p[0], p[1], 0])), hole: hole0.map(p => T([p[0], p[1], 0])) } }; }
  else if (P.fh > 0) for (let k = 0; k < 20; k++) { const z = k * Math.max(3, P.fh); if (z + P.clr > H - P.rtop * 0.5) break; const ring = Array.from({ length: NF }, (_, q) => { const u = q / NF, B0 = baseAt(u), dd = Math.min(glassD(u, z), glassD(u, z + P.clr)); return [B0.p[0] + B0.n[0] * dd, B0.p[1] + B0.n[1] * dd]; });
    const vr = k ? Math.max(0, Math.min(0.8, P.void)) : 0, hole = vr > 0 ? ring.map(p => [p[0] * Math.sqrt(vr), p[1] * Math.sqrt(vr)]) : null; const ar = Math.abs(loopArea(ring)) - (hole ? Math.abs(loopArea(hole)) : 0); if (ar < 150) break; gfa += ar;
    floors.push({ k, z: z * 1000, area: Math.round(ar), outer: ring.map(p => T([p[0], p[1], z])), hole: hole ? hole.map(p => T([p[0], p[1], z])) : null, ring, vr }); }
  const nC = Math.max(1, Math.round(P.cores)); if (floors.length > 1) { const F1 = floors[1], vr = Math.sqrt(F1.vr || 0), sportC = !!F1.conc; const uOf = ang => { const v = se(ang); let bu = 0, bd = 1e9; for (let q = 0; q < 360; q++) { const B1 = baseAt(q / 360), d = Math.hypot(B1.p[0] - v[0], B1.p[1] - v[1]); if (d < bd) { bd = d; bu = q / 360; } } return bu; };
    for (let c = 0; c < nC; c++) { let ang = 2 * Math.PI * (c + 0.5) / nC; for (let g = 0; g < 24 && gA(uOf(ang)) > 0.02; g++) ang += 0.04 * (g % 2 ? -g : g); /* arka (kirish) ro'parasiga yadro qo'yilmaydi */ const B0 = se(ang), f = sportC ? 1 : (vr + 1) / 2 * 0.98; let cx = B0[0] * f, cy = B0[1] * f; if (sportC) { let bq = 0, bd = 1e9; F1.ring.forEach((p, q) => { const d = Math.abs(Math.atan2(p[1], p[0]) - Math.atan2(B0[1], B0[0])); const dd2 = Math.min(d, 2 * Math.PI - d); if (dd2 < bd) { bd = dd2; bq = q; } }); const p = F1.ring[bq], l = Math.hypot(...p); cx = p[0] - p[0] / l * 6; cy = p[1] - p[1] / l * 6; } const Rq = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => T([cx + x, cy + y, 0]));
      cores.push({ n: c + 1, c: [cx, cy], poly: Rq(-3.2, 3.2, -4.2, 4.2), flights: [Rq(-2.8, -1.6, -2.8, 2.8), Rq(-1.4, -0.2, -2.8, 2.8)], lift: Rq(0.4, 2.8, -1.2, 1.2), top: floors.length - 1, z1: (floors[floors.length - 1].z / 1000 + P.fh) * 1000, steps: Math.ceil(P.fh * 1000 / 150 / 2) }); }
    floors.forEach(F => { if (!F.k) return; let far = 0; (F.conc ? F.ring : F.ring).forEach(p => { const d = Math.min(...cores.map(C => Math.hypot(p[0] - C.c[0], p[1] - C.c[1]))); far = Math.max(far, d); }); F.far = far; if (far > P.evac) chk.push(['WARN', `${F.k + 1}-qavat: eng uzoq nuqtadan zinagacha ≈ ${far.toFixed(0)} m > ${P.evac} m — yadrolar (cores) sonini oshiring`]); }); }
  if (floors.length && !sport) chk.push(['INFO', `${floors.length} qavat, umumiy ${Math.round(gfa).toLocaleString('ru')} m²; yuqori qavatlarda atrium ${Math.round(P.void * 100)} %`]);
  // yo'l-yo'l maydon (birinchi arka oldida)
  const plaza = []; if (P.plazaW > 0 && uc.length) { const B0 = baseAt(uc[0]), n = B0.n, t = [-n[1], n[0]], o = [B0.p[0] + n[0] * (P.bulge + 2), B0.p[1] + n[1] * (P.bulge + 2)]; for (let d = 0, q = 0; d < P.plazaD; d += P.stripe, q++) { const d1 = Math.min(P.plazaD, d + P.stripe); plaza.push({ dark: q % 2 === 1, poly: [[-1, d], [1, d], [1, d1], [-1, d1]].map(([sx, dd]) => T([o[0] + n[0] * dd + t[0] * sx * P.plazaW / 2, o[1] + n[1] * dd + t[1] * sx * P.plazaW / 2, 0.02])) }); } }
  const memL = members.reduce((s2, m) => { let L = 0; for (let q = 1; q < m.out.length; q++) L += Math.hypot(m.out[q][0] - m.out[q - 1][0], m.out[q][1] - m.out[q - 1][1], m.out[q][2] - m.out[q - 1][2]); return s2 + L; }, 0);
  let facA = 0; for (let q = 0; q < NUg; q++) for (let k = 0; k < NSg; k++) { const p = glass[q][k], r = glass[q + 1][k], s2 = glass[q][k + 1]; facA += Math.hypot(r.x - p.x, r.y - p.y) / 1000 * Math.hypot(s2.z - p.z, Math.hypot(s2.x - p.x, s2.y - p.y)) / 1000; }
  const W = members.map(m => ({ out: m.out.map(T), inn: m.inn.map(T), tw: P.tw }));
  return { e, P, sport, members: W, panels, glass, NUg, NSg, edges, roof, floors, cores, plaza, checks: chk, T, H: +H.toFixed(1), gfa: Math.round(gfa), foot: Math.round(Math.abs(loopArea(raw))), memL: Math.round(memL), nCells, nSolid: panels.length, facA: Math.round(facA), perim: Math.round(Lp), arches: uc.length, base: raw.filter((_, q) => q % 4 === 0).map(p => T([p[0], p[1], 0])) };
}


// ---------- UMUMIY MODULLAR (MODS): har modul — parametrlar (def/help) va geom(M, e) → { prims, plan, floors, ifc, table, checks, H, gfa, foot, label }
// prims: { t: 'q' | 'p', p: [dunyo nuqtalari, mm], c: [r, g, b], x: ichini ko'rishda ham chiziladi }; plan: { p, fill, stroke, w, dash, shf (qavat; yo'q — hammasi) }
// ifc: { cls, name, desc, pt (PredefinedType), tess: { V, T } | extr: { p, z0, h, holes } }
const MODS = {};
const modKey = (kind, k) => Object.keys(MODS[kind].def).find(q => q.toLowerCase() === String(k).toLowerCase()) || k;
const COL = { white: [.95, .95, .94], glass: [.36, .45, .52], green: [.55, .68, .52], greenD: [.40, .52, .40], wood: [.62, .42, .28], slab: [.88, .87, .84], core: [.58, .58, .59], road: [.62, .62, .63], plant: [.36, .52, .30], dark: [.22, .24, .26], hole: [.30, .38, .33] };
function modTools(e, P) { const at = { x: 0, y: 0 }, rot = (e.rot || 0) * Math.PI / 180, co = Math.cos(rot), si = Math.sin(rot); return { rot, co, si, T: (A0) => p => ({ x: A0.x + (p[0] * co - p[1] * si) * 1000, y: A0.y + (p[0] * si + p[1] * co) * 1000, z: (p[2] || 0) * 1000 }) }; }
// yordamchi: ko'pburchakli prizma → prims (yon yuzalar + tepa/pastki)
function prismPrims(out, poly2, z0, z1, col, opt) { opt = opt || {}; const n = poly2.length; for (let i = 0; i < n; i++) { const a = poly2[i], b = poly2[(i + 1) % n]; out.push({ t: 'q', p: [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], c: opt.side || col, x: opt.x }); } if (opt.top !== false) out.push({ t: 'p', p: poly2.map(q => [q[0], q[1], z1]), c: opt.topc || col, x: opt.x }); if (opt.bot) out.push({ t: 'p', p: poly2.map(q => [q[0], q[1], z0]), c: col, x: opt.x }); }
// ---- POG'ONALI «PIKSEL» UY (pixel): uzunlik bo'yicha N blok (modul), har biri ko'ndalangiga siljigan (zig-zag yoki pog'ona); qavatlar bir uchidan ikkinchisiga pasayadi —
// past blok tomi qo'shnisi uchun terrasa; ikki tomonlama yo'lak, ikki tomonda kvartiralar; uzun fasadlarda chiqib turgan oq balkon «qutilari» (ba'zilarida gulzor);
// 1-qavat — shishali savdo, ustida egri chetli soyabon-plita; yerto'la avtoturargoh va pandus.
MODS.pixel = { prefix: 'T', title: 'Pog‘onali uy', def: { N: 14, bw: 7.2, D: 17, sh: 2.4, zz: 0, nHi: 11, nLo: 4, gH: 5.2, fh: 3.1, cw: 1.8, aw: 7.2, sbG: 1.5, ov: 3, tail: 28, bx: 1, bxW: 5.6, bxD: 1.9, plant: 0.65, coreE: 4, evac: 25, pk: 1, pkX: 12, rs: 15, pkR: 1, stall: 28, seed: 3 },
  help: { N: 'bloklar (modullar) soni', bw: 'blok uzunligi, m', D: 'blok chuqurligi (korpus eni), m', sh: 'bloklarning ko‘ndalang siljishi, m', zz: '1 — zig-zag (navbatma-navbat), 0 — bir tomonga pog‘ona', nHi: 'eng baland blok qavatlari (1-qavat bilan)', nLo: 'eng past blok qavatlari', gH: '1-qavat (savdo) balandligi, m', fh: 'turar joy qavati balandligi, m', cw: 'yo‘lak eni, m', aw: 'kvartira eni (fasad bo‘ylab), m', sbG: 'savdo vitraji chekinishi, m', ov: 'soyabon-plita chiqishi, m', tail: 'soyabon cheti past uchida egilib yerga tushadigan uzunlik, m (0 — yo‘q)', bx: 'balkon romlari ulushi (1 — har uyachada)', bxW: 'rom eni, m', bxD: 'rom chiqishi (chuqurligi), m', plant: 'gulzorli romlar ulushi', coreE: 'har nechta blokda zina-lift yadrosi', evac: 'kvartira eshigidan zinagacha eng ko‘p, m (normaga qarab qo‘ying)', pk: 'yerto‘la avtoturargoh qavatlari', pkX: 'yerto‘la bino chizig‘idan tashqariga chiqishi, m', rs: 'pandus nishabi, % (normaga qarab qo‘ying)', pkR: 'kvartiraga talab qilinadigan joy (normaga qarab qo‘ying)', stall: 'bir joyga yalpi maydon, m² (yo‘laklar bilan)', seed: 'naqsh urug‘i' },
  geom(M, e) { const P = Object.assign({}, this.def, e.p || {}), A0 = resolve(M, e.at), tt = modTools(e, P), T = tt.T(A0), chk = [], prims = [], plan = [], ifc = [], floors = [], zones = {};
    const N = Math.max(1, Math.round(P.N)), L = N * P.bw, rnd = (() => { let s9 = (Math.abs(Math.round(P.seed)) % 2147483646) + 1; return () => (s9 = (s9 * 16807) % 2147483647) / 2147483647; })();
    const offs = Array.from({ length: N }, (_, i) => P.zz ? (i % 2 ? P.sh / 2 : -P.sh / 2) : (i - (N - 1) / 2) * P.sh);
    const nF = Array.from({ length: N }, (_, i) => Math.max(1, Math.round(P.nHi - (P.nHi - P.nLo) * (N > 1 ? i / (N - 1) : 0))));
    const blk = offs.map((o, i) => ({ i, x0: -L / 2 + i * P.bw, x1: -L / 2 + (i + 1) * P.bw, y0: o - P.D / 2, y1: o + P.D / 2, n: nF[i], r: nF[i] - 1, top: P.gH + (nF[i] - 1) * P.fh, core: i % Math.max(1, Math.round(P.coreE)) === 0 }));
    const stair = (ex, ey) => { const top = [], bot = []; blk.forEach((B, k) => { const xa = B.x0 - (k === 0 ? ex : 0), xb = B.x1 + (k === N - 1 ? ex : 0); top.push([xa, B.y1 + ey], [xb, B.y1 + ey]); bot.push([xa, B.y0 - ey], [xb, B.y0 - ey]); }); return top.concat(bot.reverse()); };
    const chaikin = (Lp, it) => { for (let q = 0; q < it; q++) { const o = []; Lp.forEach((p, i) => { const r = Lp[(i + 1) % Lp.length]; o.push([p[0] * .75 + r[0] * .25, p[1] * .75 + r[1] * .25], [p[0] * .25 + r[0] * .75, p[1] * .25 + r[1] * .75]); }); Lp = o; } return Lp; };
    const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const box = (x0, y0, x1, y1, z0, z1, col, x) => prismPrims(prims, rect(x0, y0, x1, y1), z0, z1, col, { x, bot: true });
    // rom: fasaddagi o'rta nuqta o, fasad bo'ylab t, tashqi normal n; sakkizburchak (kesilgan burchaklar) chiqishi bxD; orqa devor yog'och, oldida gulzor/shisha
    const frame = (o, t, n, z, w, pl) => { const h = P.fh - 0.12, c = Math.min(0.5, w * 0.16), D = P.bxD, th = 0.2, oct = (wi, hi, cc, dz) => [[-wi / 2, cc], [-wi / 2 + cc, 0], [wi / 2 - cc, 0], [wi / 2, cc], [wi / 2, hi - cc], [wi / 2 - cc, hi], [-wi / 2 + cc, hi], [-wi / 2, hi - cc]].map(([a, b]) => [a, b + dz]);
      const Ou = oct(w, h, c, 0), In = oct(w - 2 * th, h - 2 * th, Math.max(0.05, c - th * 0.6), th), Pt = (q, d) => [o[0] + t[0] * q[0] + n[0] * d, o[1] + t[1] * q[0] + n[1] * d, z + 0.06 + q[1]];
      for (let i = 0; i < 8; i++) { const j = (i + 1) % 8; prims.push({ t: 'q', p: [Pt(Ou[i], 0.02), Pt(Ou[j], 0.02), Pt(Ou[j], D), Pt(Ou[i], D)], c: COL.white }); prims.push({ t: 'q', p: [Pt(Ou[i], D), Pt(Ou[j], D), Pt(In[j], D), Pt(In[i], D)], c: COL.white }); prims.push({ t: 'q', p: [Pt(In[i], 0.04), Pt(In[j], 0.04), Pt(In[j], D), Pt(In[i], D)], c: [.86, .86, .85] }); }
      prims.push({ t: 'p', p: In.map(q => Pt(q, 0.05)), c: COL.wood });
      const fl = In[1][1], a0 = In[0][0] + 0.1, a1 = In[3][0] - 0.1; if (pl) { const q4 = [[a0, fl], [a1, fl], [a1, fl + 0.6], [a0, fl + 0.6]]; const d0 = D - 0.55, d1 = D - 0.05; [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([i, j]) => prims.push({ t: 'q', p: [Pt(q4[i], d0), Pt(q4[j], d0), Pt(q4[j], d1), Pt(q4[i], d1)], c: COL.plant })); prims.push({ t: 'q', p: [Pt([a0, fl + 0.6], d0), Pt([a1, fl + 0.6], d0), Pt([a1, fl + 0.6], d1), Pt([a0, fl + 0.6], d1)], c: [.30, .50, .26] }); const nb = 3; for (let q = 0; q < nb; q++) { const xm = a0 + (a1 - a0) * (q + 0.5) / nb, r = 0.32; prims.push({ t: 'q', p: [Pt([xm - r, fl + 0.6], D - 0.3), Pt([xm + r, fl + 0.6], D - 0.3), Pt([xm, fl + 1.3], D - 0.3), Pt([xm - r * 0.2, fl + 1.2], D - 0.3)], c: [.30, .52, .26] }); } }
      else prims.push({ t: 'q', p: [Pt([a0, fl], D - 0.08), Pt([a1, fl], D - 0.08), Pt([a1, fl + 1.1], D - 0.08), Pt([a0, fl + 1.1], D - 0.08)], c: [.80, .86, .88] }); };
    // 1-qavat: shishali savdo (chekingan), soyabon-plita (egri chet)
    const shop = stair(-P.sbG, -P.sbG), shopA = Math.abs(loopArea(shop)), foot = Math.abs(loopArea(stair(0, 0)));
    prismPrims(prims, shop, 0, P.gH, COL.glass, { top: false }); prims.push({ t: 'p', p: shop.map(q => [q[0], q[1], 0.02]), c: COL.slab, x: true });
    const can = chaikin(stair(P.ov, P.ov), 4), canA = Math.abs(loopArea(can)); prismPrims(prims, can, P.gH - 0.45, P.gH, COL.white, { bot: true });
    floors.push({ k: 0, z: 0, area: Math.round(shopA), apts: 0 }); plan.push({ p: can, fill: 'none', stroke: '#555', w: .8, dash: true, shf: 0 }); plan.push({ p: shop, fill: '#f6e7c8', stroke: '#141414', w: 1.4, shf: 0 });
    ifc.push({ cls: 'IfcSlab', name: 'Soyabon-plita (egri chet)', desc: Math.round(canA) + ' m2', pt: '.ROOF.', extr: { p: can, z0: P.gH - 0.45, h: 0.45 } });
    { const V = [], Tt = []; shop.forEach(q => V.push([q[0], q[1], 0], [q[0], q[1], P.gH - 0.45])); for (let k = 0; k < shop.length; k++) { const o = 2 * k, o2 = 2 * ((k + 1) % shop.length); Tt.push([o, o2, o2 + 1], [o, o2 + 1, o + 1]); } ifc.push({ cls: 'IfcCurtainWall', name: 'Savdo vitraji (1-qavat)', desc: Math.round(shopA) + ' m2', tess: { V, T: Tt } }); }
    // bloklar: tashqi devor + deraza lentalari, tom, yadrolar, kvartiralar, balkon qutilari
    const nA = Math.max(1, Math.round(P.bw / P.aw)), uw = P.bw / nA, ad = (P.D - P.cw) / 2, aptA = uw * ad, apts = [], balc = []; let nTerr = 0, terrA = 0;
    const rot = tt.rot, north = s2 => { const ny = Math.cos(rot) * s2, nx = -Math.sin(rot) * s2; return -ny > Math.abs(nx) * 0.7; }; // tashqi normal shimolga qaraydi (rejada +y — janub, shimol — −y)
    const cS = Math.cos(rot) >= 0 ? -1 : 1; // shimolga yaqinroq tomon (burilishsiz — lokal −y)
    blk.forEach(B => { const yc = (B.y0 + B.y1) / 2, sides = [[-1, B.y0], [1, B.y1]];
      // fasad: har qavatda — pastki oq lenta, shisha, yuqori oq lenta (uzun tomonlar); uchlari — oq
      for (let k = 1; k <= B.r; k++) { const z = P.gH + (k - 1) * P.fh; sides.forEach(([sg, y]) => { const q = (z0, z1, c) => prims.push({ t: 'q', p: sg < 0 ? [[B.x0, y, z0], [B.x1, y, z0], [B.x1, y, z1], [B.x0, y, z1]] : [[B.x1, y, z0], [B.x0, y, z0], [B.x0, y, z1], [B.x1, y, z1]], c }); q(z, z + 0.9, COL.white); q(z + 0.9, z + P.fh - 0.35, COL.glass); q(z + P.fh - 0.35, z + P.fh, COL.white); });
        [[B.x0, -1], [B.x1, 1]].forEach(([x, sg]) => prims.push({ t: 'q', p: sg < 0 ? [[x, B.y1, z], [x, B.y0, z], [x, B.y0, z + P.fh], [x, B.y1, z + P.fh]] : [[x, B.y0, z], [x, B.y1, z], [x, B.y1, z + P.fh], [x, B.y0, z + P.fh]], c: COL.white }));
        prims.push({ t: 'p', p: rect(B.x0, B.y0, B.x1, B.y1).map(q => [q[0], q[1], z + 0.02]), c: COL.slab, x: true });
        ifc.push({ cls: 'IfcSlab', name: `Blok ${B.i + 1}: ${k + 1}-qavat plitasi`, pt: '.FLOOR.', storey: k, mat: 'slab', typ: 'slab', ps: { Pset_SlabCommon: { IsExternal: false, LoadBearing: true } }, extr: { p: rect(B.x0, B.y0, B.x1, B.y1), z0: z - 0.25, h: 0.25 } }); }
      const roofP = rect(B.x0, B.y0, B.x1, B.y1); prims.push({ t: 'p', p: roofP.map(q => [q[0], q[1], B.top]), c: [.86, .86, .84] });
      ifc.push({ cls: 'IfcWall', name: `Blok ${B.i + 1}: tashqi devor`, desc: `${B.r} qavat`, pt: '.SOLIDWALL.', mat: 'extRC', typ: 'ext', ps: { Pset_WallCommon: { IsExternal: true, LoadBearing: true, ThermalTransmittance: ['IFCTHERMALTRANSMITTANCEMEASURE', +(1 / matR('extRC')).toFixed(3)] } }, extr: { p: roofP, z0: P.gH, h: B.top - P.gH, holes: [rect(B.x0 + .3, B.y0 + .3, B.x1 - .3, B.y1 - .3)] } });
      ifc.push({ cls: 'IfcRoof', name: `Blok ${B.i + 1}: tom`, pt: '.FLAT_ROOF.', extr: { p: roofP, z0: B.top, h: 0.3 } });
      // terrasa: qo'shni blok balandroq bo'lsa — tom foydalaniladigan terrasa (chetida gulzor)
      const nb = Math.max(B.i ? blk[B.i - 1].n : 0, B.i < N - 1 ? blk[B.i + 1].n : 0); if (nb > B.n) { nTerr++; terrA += P.bw * P.D; const pl = 0.8; [[B.x0, B.y0, B.x1, B.y0 + pl], [B.x0, B.y1 - pl, B.x1, B.y1]].forEach(r => box(r[0], r[1], r[2], r[3], B.top, B.top + 0.7, COL.plant)); prims.push({ t: 'p', p: rect(B.x0 + 1, B.y0 + pl, B.x1 - 1, B.y1 - pl).map(q => [q[0], q[1], B.top + 0.03]), c: COL.wood });
        plan.push({ p: roofP, fill: '#e3ecd8', stroke: '#6b8f5a', w: .8, shf: B.r + 1 }); }
      // yadro (zina + lift) — janubiy (−y) tomondagi 1-uyacha o'rnida
      const coreR = B.core ? (cS < 0 ? rect(B.x0 + P.sbG + 0.2, B.y0 + P.sbG + 0.2, B.x0 + uw - 0.2, B.y0 + ad - 0.2) : rect(B.x0 + P.sbG + 0.2, B.y1 - ad + 0.2, B.x0 + uw - 0.2, B.y1 - P.sbG - 0.2)) : null; /* yadro — shimolga yaqinroq (yomonroq) tomonda */
      if (coreR) { prismPrims(prims, coreR, 0, B.top + 1.2, COL.core, { x: true }); ifc.push({ cls: 'IfcWall', name: `Blok ${B.i + 1}: zina-lift yadrosi`, pt: '.SHEAR.', mat: 'core', typ: 'core', ps: { Pset_WallCommon: { IsExternal: false, LoadBearing: true } }, extr: { p: coreR, z0: -3.3 * P.pk, h: B.top + 1.2 + 3.3 * P.pk } }); }
      for (let k = 1; k <= B.r; k++) { const z = P.gH + (k - 1) * P.fh;
        plan.push({ p: rect(B.x0, B.y0, B.x1, B.y1), fill: '#fff', stroke: '#141414', w: 1.4, shf: k }); plan.push({ p: rect(B.x0, yc - P.cw / 2, B.x1, yc + P.cw / 2), fill: '#f1f0ec', stroke: '#888', w: .5, shf: k });
        if (coreR) plan.push({ p: coreR, fill: '#d8d8d8', stroke: '#141414', w: 1.2, shf: k });
        sides.forEach(([sg, y]) => { for (let u = 0; u < nA; u++) { if (coreR && sg === cS && u === 0) continue; const xa = B.x0 + u * uw, ya = sg < 0 ? B.y0 : yc + P.cw / 2, r = rect(xa + 0.1, ya + 0.1, xa + uw - 0.1, ya + ad - 0.1), end = (B.i === 0 && u === 0) || (B.i === N - 1 && u === nA - 1);
          const A = { blk: B.i, k, side: sg, area: +(aptA - 0.8).toFixed(1), rooms: aptA > 62 ? 3 : aptA > 42 ? 2 : 1, north: north(sg) && !end, end, x: xa + uw / 2, r, z }; apts.push(A);
          plan.push({ p: r, fill: A.north ? '#dfe7f2' : ['#fff', '#fdeedd', '#f9e0c4', '#f4cf9f'][A.rooms], stroke: '#141414', w: .6, shf: k });
          { const nmA = `${B.i + 1}.${k + 1}.${sg < 0 ? 'J' : 'Sh'}${u + 1}`, zn = 'Kvartira ' + nmA, yC = sg < 0 ? r[2][1] : r[0][1], yF = sg < 0 ? r[0][1] : r[2][1], RM = aptSingle(r[0][0], r[2][0], yC, yF, A.rooms - 1, 6);
            RM.forEach((q, i) => { const Rn = q.r.map((p, j2) => [p[0] + (j2 === 0 || j2 === 3 ? 0.05 : -0.05), p[1] + (j2 < 2 ? 0.05 : -0.05)]), ar = +(Math.abs(loopArea(Rn))).toFixed(1); plan.push({ p: q.r, fill: 'none', stroke: '#141414', w: .35, shf: k, t: q.c === 'hl' ? nmA : q.n.replace('Oshxona-mehmonxona', 'Osh.-mehm.') });
              ifc.push({ cls: 'IfcSpace', name: `${nmA}-${i + 1}`, long: q.n, desc: ar + ' m²', storey: k, zone: zn, uc: UC_ROOM[q.n], ps: { Pset_SpaceCommon: { Reference: ['IFCIDENTIFIER', UC_REF[q.c] || q.c], IsExternal: false, NetPlannedArea: ['IFCAREAMEASURE', ar] } }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', ar], ['Height', 'L', (P.fh - 0.3) * 1000]] }, extr: { p: Rn, z0: z, h: P.fh - 0.3 } }); });
            zones[zn] = { ot: 'Kvartira', long: `${A.rooms} xonali · ${A.area} m²`, ps: { Binokor_Kvartira: { Xonalar: A.rooms, UmumiyMaydon: ['IFCAREAMEASURE', A.area], Qavat: k + 1, Blok: B.i + 1, FaqatShimolga: !!A.north } } }; }
          // balkon romi (piksel): har uyachada chiqib turgan oq rom (burchaklari kesilgan), orqasi yog'och, oldida gulzor yoki shisha to'siq
          if (rnd() < P.bx) { const cx = xa + uw / 2, w2 = Math.min(P.bxW, uw - 0.3) / 2, yb = sg < 0 ? B.y0 : B.y1, yo = yb + sg * P.bxD, pl = rnd() < P.plant, Y0 = Math.min(yb, yo), Y1 = Math.max(yb, yo);
            frame([cx, yb], [1, 0], [0, sg], z, 2 * w2, pl); balc.push({ k, pl }); plan.push({ p: rect(cx - w2, Y0, cx + w2, Y1), fill: pl ? '#dfe9d6' : '#fff', stroke: '#555', w: .6, shf: k });
            ifc.push({ cls: 'IfcSlab', name: `Balkon romi ${B.i + 1}.${k + 1}`, desc: pl ? 'gulzor bilan' : 'shisha to‘siq', pt: '.LANDING.', storey: k, extr: { p: rect(cx - w2, Y0, cx + w2, Y1), z0: z, h: 0.2 } }); } } }); } });
    // baland uchining yon fasadi: romlar qavatma-qavat yarim qadamga siljigan (piksel naqsh)
    { const B = blk[0], pitch = P.bxW + 0.5, nS = Math.max(1, Math.floor((P.D - 0.6) / pitch)); for (let k = 1; k <= B.r; k++) { const z = P.gH + (k - 1) * P.fh, odd = k % 2, n2 = odd ? nS - 1 : nS, y0 = (B.y0 + B.y1) / 2 - (n2 - 1) * pitch / 2;
      for (let q = 0; q < n2; q++) { const yc = y0 + q * pitch, pl = rnd() < P.plant; frame([B.x0, yc], [0, -1], [-1, 0], z, P.bxW, pl); balc.push({ k, pl }); plan.push({ p: rect(B.x0 - P.bxD, yc - P.bxW / 2, B.x0, yc + P.bxW / 2), fill: pl ? '#dfe9d6' : '#fff', stroke: '#555', w: .6, shf: k }); } } }
    // soyabon dumi: past uchida plita cheti egilib, landshaftga tushadi
    if (P.tail > 0) { const Bz = blk[N - 1], S0 = [Bz.x1 + P.ov * 0.6, Bz.y0 - P.ov * 0.6], NT = 40, wT = 2.4, top = [], ins = []; for (let k = 0; k <= NT; k++) { const s2 = k / NT, x = S0[0] + P.tail * s2, y = S0[1] - P.tail * 0.45 * s2 * s2, zz = P.gH * (1 - s2 * s2 * (3 - 2 * s2)) + 0.3 * s2, dx = 1, dy = -P.tail * 0.9 * s2 / P.tail, l = Math.hypot(dx, dy); top.push([x, y, zz]); ins.push([x - dy / l * wT, y + dx / l * wT, zz]); }
      for (let k = 0; k < NT; k++) { prims.push({ t: 'q', p: [top[k], top[k + 1], ins[k + 1], ins[k]], c: COL.white }); prims.push({ t: 'q', p: [[top[k][0], top[k][1], top[k][2] - 0.45], [top[k + 1][0], top[k + 1][1], Math.max(0, top[k + 1][2] - 0.45)], top[k + 1], top[k]], c: COL.white }); }
      plan.push({ p: top.map(q => [q[0], q[1]]).concat(ins.map(q => [q[0], q[1]]).reverse()), fill: '#f4f3ef', stroke: '#555', w: .6, shf: 0 }); }
    // qavatlar jadvali
    const maxR = Math.max(...blk.map(B => B.r)); for (let k = 1; k <= maxR; k++) { const bs = blk.filter(B => B.r >= k); floors.push({ k, z: (P.gH + (k - 1) * P.fh) * 1000, area: Math.round(bs.length * P.bw * P.D), apts: apts.filter(a => a.k === k).length, blocks: bs.length }); }
    const gfa = floors.reduce((s, F) => s + F.area, 0), nApt = apts.length, nNorth = apts.filter(a => a.north).length;
    // evakuatsiya: har qavatda bloklar 0..m ketma-ket (pasayish bir tomonga) — eng uzoq kvartira eshigidan eng yaqin yadrogacha (yo'lak bo'ylab; siljish sakrashi qo'shiladi)
    let far = 0, noCore = 0; floors.forEach(F => { if (!F.k) return; const bs = blk.filter(B => B.r >= F.k), cs = bs.filter(B => B.core); if (!cs.length) { noCore++; return; } apts.filter(a => a.k === F.k).forEach(a => { const d = Math.min(...cs.map(c => Math.abs(a.x - (c.x0 + uw / 2)) + Math.abs(a.blk - c.i) * (P.sh > P.cw ? P.sh : 0))); far = Math.max(far, d); }); });
    if (noCore) chk.push(['FAIL', `${noCore} qavatda yadroga yetib bo‘lmaydi — coreE ni kamaytiring`]); if (far > P.evac) chk.push(['WARN', `Kvartira eshigidan zinagacha ≈ ${far.toFixed(0)} m > ${P.evac} m — yadrolarni ko‘paytiring (coreE)`]);
    if (P.zz && P.sh > P.cw * 0.6) chk.push(['INFO', `Bloklar ${P.sh} m siljigan — yo‘lak bloklar chegarasida ${P.sh} m «sinadi» (o‘tish joyi kerak)`]);
    if (nNorth) chk.push(['WARN', `${nNorth} kvartira faqat shimolga qaragan (bir tomonlama) — insolatsiya talabini tekshiring (normaga qarab); burilishni o‘zgartiring yoki yo‘lakni bir tomonlama qiling`]);
    // yerto'la avtoturargoh va pandus (oxirgi blokdan keyin)
    const pkPoly = stair(P.pkX, P.pkX), pkA = Math.abs(loopArea(pkPoly)) * P.pk, spaces = Math.floor(pkA / P.stall), need = Math.ceil(nApt * P.pkR), rL = 3.3 * P.pk / (P.rs / 100), Bz = blk[N - 1], rx0 = Bz.x1 + P.ov + 1, ry = (Bz.y0 + Bz.y1) / 2, rW = 6.5;
    const rp = rect(rx0, ry - rW / 2, rx0 + rL, ry + rW / 2); prims.push({ t: 'p', p: rp.map(q => [q[0], q[1], 0.01]), c: COL.dark }); [[ry - rW / 2 - 0.25, ry - rW / 2], [ry + rW / 2, ry + rW / 2 + 0.25]].forEach(([a, b]) => box(rx0, a, rx0 + rL, b, 0, 1.1, [.75, .75, .73])); box(rx0 - 0.25, ry - rW / 2 - 0.25, rx0, ry + rW / 2 + 0.25, 0, 1.1, [.75, .75, .73]);
    plan.push({ p: rp, fill: '#e9e7e2', stroke: '#141414', w: 1, shf: 0 }); for (let k = 1; k < 8; k++) { const x = rx0 + rL * k / 8; plan.push({ p: [[x, ry - rW / 2], [x + 0.05, ry - rW / 2], [x + 0.05, ry + rW / 2], [x, ry + rW / 2]], fill: '#999', stroke: 'none', w: 0, shf: 0 }); }
    { const D3 = -3.3 * P.pk, V = [[rx0 + rL, ry - rW / 2, 0], [rx0 + rL, ry + rW / 2, 0], [rx0, ry + rW / 2, D3], [rx0, ry - rW / 2, D3]]; ifc.push({ cls: 'IfcRamp', name: 'Avtoturargoh pandusi', desc: `${rL.toFixed(0)} m, ${P.rs} %`, pt: '.STRAIGHT_RUN_RAMP.', tess: { V, T: [[0, 1, 2], [0, 2, 3]] } }); }
    ifc.push({ cls: 'IfcSlab', name: 'Yerto‘la avtoturargoh plitasi', desc: `${Math.round(pkA)} m2, ${spaces} joy`, pt: '.BASESLAB.', extr: { p: pkPoly, z0: -3.3 * P.pk - 0.4, h: 0.4 } }); plan.push({ p: pkPoly, fill: 'none', stroke: '#999', w: .6, dash: true, shf: 0 });
    if (spaces < need) chk.push(['WARN', `Avtoturargoh: ${spaces} joy < talab ${need} (${P.pkR}/kv., normaga qarab) — pk ni oshiring`]); else chk.push(['INFO', `Avtoturargoh: ${spaces} joy (talab ${need}); pandus ${rL.toFixed(0)} m, ${P.rs} %`]);
    plan.push({ p: stair(0, 0), fill: 'none', stroke: '#141414', w: 2, hit: true });
    const mix = [1, 2, 3].map(r => apts.filter(a => a.rooms === r).length), H = Math.max(...blk.map(B => B.top));
    const table = { title: 'Pog‘onali uy: ko‘rsatkichlar', rows: [['Bloklar', `${N} × ${P.bw} m, chuqurligi ${P.D} m, siljish ${P.sh} m (${P.zz ? 'zig-zag' : 'pog‘ona'}); uzunligi ${L.toFixed(0)} m`], ['Qavatlar', `${P.nHi} → ${P.nLo} (1-qavat — savdo); eng baland ${H.toFixed(1)} m`], ['Tagi', Math.round(foot).toLocaleString('ru') + ' m²'], ['Savdo (1-qavat)', Math.round(shopA).toLocaleString('ru') + ' m², soyabon ' + Math.round(canA).toLocaleString('ru') + ' m²'], ['Umumiy maydon (yer usti)', gfa.toLocaleString('ru') + ' m²'], ['Kvartiralar', `${nApt} (1 xonali ${mix[0]}, 2 xonali ${mix[1]}, 3 xonali ${mix[2]}), har biri ≈ ${(aptA - 0.8).toFixed(0)} m²`], ['Faqat shimolga qaragan', nNorth + ' kv.'], ['Balkon romlari', `${balc.length} (gulzorli ${balc.filter(b => b.pl).length}); chiqishi ${P.bxD} m`], ['Tom terrasalari', `${nTerr} ta, ${Math.round(terrA).toLocaleString('ru')} m²`], ['Avtoturargoh', `${P.pk} qavat, ${spaces} joy (talab ${need}); pandus ${rL.toFixed(0)} m`], ['Zinagacha eng uzoq', far.toFixed(0) + ' m']] };
    const tables = [{ title: 'bloklar', head: ['Blok', 'Qavatlar', 'Balandlik, m', 'Kvartiralar', 'Yadro', 'Terrasa'], rows: blk.map(B => [B.i + 1, B.n, B.top.toFixed(1), apts.filter(a => a.blk === B.i).length, B.core ? 'bor' : '—', (Math.max(B.i ? blk[B.i - 1].n : 0, B.i < N - 1 ? blk[B.i + 1].n : 0) > B.n) ? Math.round(P.bw * P.D) + ' m²' : '—']) },
      { title: 'qavatlar', head: ['Qavat', 'Sath, m', 'Bloklar', 'Maydon, m²', 'Kvartiralar'], rows: floors.map(F => [F.k + 1, (F.z / 1000).toFixed(1), F.k ? F.blocks : 'savdo', F.area.toLocaleString('ru'), F.apts]) }];
    const storeys = floors.map(F => ({ k: F.k, z: F.z / 1000, name: (F.k + 1) + '-qavat' })), types = { ext: { cls: 'IfcWallType', name: MATLIB.extRC.uz, pt: '.SOLIDWALL.' }, core: { cls: 'IfcWallType', name: MATLIB.core.uz, pt: '.SHEAR.' }, slab: { cls: 'IfcSlabType', name: MATLIB.slab.uz, pt: '.FLOOR.' } };
    return { e, P, kind: 'pixel', T, prims, plan, floors, ifc, storeys, zones, types, table, tables, checks: chk, H, gfa, foot: Math.round(foot), base: stair(P.ov, P.ov).map(q => T([q[0], q[1], 0])), label: `pog‘onali uy · ${nApt} kv. · ${gfa.toLocaleString('ru')} m²`, metrics: [['Kvartiralar', nApt], ['Umumiy maydon', gfa.toLocaleString('ru') + ' m²'], ['Balkon romlari', balc.length], ['Avtoturargoh', spaces + ' / ' + need]] }; } };
// ---- MATERIAL KUTUBXONASI (MATLIB): devor va plita qatlamlari — tashqaridan ichkariga; [nomi, qalinlik mm, λ W/(m·K), toifa, shamollatiladi]
// Tarkiblar namunaviy IFC lardan (Esplanades — Tallin, Schependomlaan — Niderlandiya) va mahalliy amaliyotdan; λ — taxminiy hisob qiymatlari (tekshiring).
// R = 0,13 + 0,04 + Σ d/λ (shamollatiladigan qatlam va undan tashqaridagilar hisobga olinmaydi), U = 1/R.
const MATLIB = {
  extGB: { uz: 'Tashqi devor: suvoq + mineral paxta 100 + gazoblok 300', col: [.93, .92, .88], lb: false, L: [['Fasad suvog‘i (to‘r bilan)', 10, .87, 'Pardozlash'], ['Mineral paxta plita', 100, .04, 'Issiqlik izolyatsiyasi'], ['Gazobeton blok D500', 300, .14, 'Devor bloki'], ['Ichki suvoq', 15, .87, 'Pardozlash']] },
  extRC: { uz: 'Tashqi devor: ventfasad + mineral paxta 150 + monolit temirbeton 200', col: [.72, .73, .72], lb: true, L: [['Fibrobeton fasad plitasi', 12, .5, 'Pardozlash', true], ['Shamollatiladigan havo qatlami', 40, 0, 'Havo', true], ['Mineral paxta plita', 150, .04, 'Issiqlik izolyatsiyasi'], ['Monolit temirbeton', 200, 2.04, 'Konstruksiya'], ['Ichki suvoq', 10, .87, 'Pardozlash']] },
  extSW: { uz: 'Tashqi devor: uch qatlamli panel TB 80 + mineral paxta 250 + TB 200 (Esplanades turi)', col: [.83, .81, .77], lb: true, L: [['Temirbeton (tashqi qatlam)', 80, 2.04, 'Konstruksiya'], ['Mineral paxta', 250, .04, 'Issiqlik izolyatsiyasi'], ['Temirbeton (ichki qatlam)', 200, 2.04, 'Konstruksiya']] },
  extBR: { uz: 'Tashqi devor: g‘isht 100 + havo 40 + mineral paxta 120 + silikat g‘isht 214 (Schependomlaan turi)', col: [.63, .37, .27], lb: true, L: [['Pishiq g‘isht (fasad)', 100, .7, 'G‘isht', true], ['Shamollatiladigan havo qatlami', 40, 0, 'Havo', true], ['Mineral paxta', 120, .04, 'Issiqlik izolyatsiyasi'], ['Silikat g‘isht', 214, .87, 'G‘isht'], ['Ichki suvoq', 10, .87, 'Pardozlash']] },
  sep: { uz: 'Kvartiralararo devor: suvoq + temirbeton 200 + suvoq', lb: true, L: [['Suvoq', 10, .87, 'Pardozlash'], ['Monolit temirbeton', 200, 2.04, 'Konstruksiya'], ['Suvoq', 10, .87, 'Pardozlash']] },
  part: { uz: 'Xonalararo to‘siq: gipsokarton 12,5 + mineral paxta 75 + gipsokarton 12,5', lb: false, L: [['Gipsokarton', 12.5, .21, 'Pardozlash'], ['Mineral paxta (tovush)', 75, .04, 'Izolyatsiya'], ['Gipsokarton', 12.5, .21, 'Pardozlash']] },
  core: { uz: 'Yadro devori: monolit temirbeton 200', lb: true, L: [['Monolit temirbeton', 200, 2.04, 'Konstruksiya']] },
  slab: { uz: 'Oraliq yopma: pol 10 + styajka 60 + tovush izolyatsiyasi 30 + temirbeton 200', lb: true, L: [['Pol qoplamasi', 10, .2, 'Pardozlash'], ['Sement-qum styajka', 60, .93, 'Styajka'], ['Tovush izolyatsiyasi', 30, .04, 'Izolyatsiya'], ['Monolit temirbeton plita', 200, 2.04, 'Konstruksiya']] }
};
const matT = k => MATLIB[k].L.reduce((s, l) => s + l[1], 0) / 1000; // qalinlik, m
const matR = k => { let R = 0.17, out = false; MATLIB[k].L.forEach(l => { if (l[4]) { out = true; return; } if (l[2] > 0) R += l[1] / 1000 / l[2]; }); return R; };
// Uniclass 2015 (NBS): SL v1.22 (2021-10), EF v1.10 (2021-07) — kodlar github.com/buildig/uniclass-2015 CSV jadvallaridan
const UNICLASS = { SL_45_10_49: 'Living rooms', SL_45_10_45: 'Kitchen-dining-living rooms', SL_45_10_23: 'Domestic kitchens', SL_45_10_09: 'Bedrooms', SL_45_10_06: 'Balconies', SL_45_10: 'Living spaces', SL_35_80_08: 'Bathrooms', SL_35_80_89: 'Toilets', SL_90_10_36: 'Hallways', SL_90_50_84: 'Storage rooms', SL_90_10_15: 'Corridors', SL_90_10_51: 'Lobbies', SL_90_10_27: 'Entrance halls', SL_90_10_87: 'Stairways', SL_20_50: 'Commercial spaces', SL_20_55_65: 'Post rooms',
  EF_25_10: 'Walls', EF_25_30: 'Doors and windows', EF_25_55: 'Barriers', EF_30_10: 'Roofs', EF_30_20: 'Floors', EF_35_10_40: 'Internal stairs', EF_35_20_30: 'External ramps', EF_80_50: 'Lifts' };
const UC_ROOM = { Mehmonxona: 'SL_45_10_49', 'Oshxona-mehmonxona': 'SL_45_10_45', 'Mehmonxona-oshxona': 'SL_45_10_45', 'Xona-oshxona': 'SL_45_10_45', Oshxona: 'SL_45_10_23', Yotoqxona: 'SL_45_10_09', Hammom: 'SL_35_80_08', Sanuzel: 'SL_35_80_08', Hojatxona: 'SL_35_80_89', 'Mehmon sanuzeli': 'SL_35_80_89', Dahliz: 'SL_90_10_36', Omborxona: 'SL_90_50_84', 'Kiyim xonasi': 'SL_90_50_84', Balkon: 'SL_45_10_06' };
const UC_REF = { lv: 'umumiy', bd: 'yotoq', kt: 'oshxona', bt: 'hammom', wc: 'hojatxona', hl: 'dahliz', st: 'omborxona' };
// kvartira xonalari (Seksiya va Pixel uchun umumiy): fasad qatori — xonalar (oshxona-mehmonxona + yotoqxonalar), kirish tomonida — hammom, dahliz, hojatxona (3+ xonali) yoki omborxona
const aptRect = (x0, y0, x1, y1) => [[Math.min(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.max(y0, y1)], [Math.min(x0, x1), Math.max(y0, y1)]];
const aptROOMS = t => t === 0 ? [['Mehmonxona', 16, 'lv'], ['Oshxona', 9, 'kt']] : [['Oshxona-mehmonxona', 24, 'lv']].concat(Array.from({ length: t }, (_, i) => ['Yotoqxona', i ? 10 : 13, 'bd']));
const aptSVC = (t, w) => { const L = [['Hammom', t ? 2.0 : 1.7, 'bt'], ['Dahliz', 0, 'hl']]; if (t >= 2) L.push(['Hojatxona', 1.1, 'wc']); else if (t >= 1 && w >= 7.2) L.push(['Omborxona', 1.3, 'st']); return L; }; // hammom va hojatxona — dahliz yonida
const aptSplit = (x0, x1, y0, y1, list, fac) => { const tot = list.reduce((s, r) => s + (r[1] || 0), 0); let x = x0; const w = x1 - x0, out = [];
  if (fac) list.forEach((r, i) => { const xe = i === list.length - 1 ? x1 : x + w * r[1] / tot; out.push({ n: r[0], c: r[2], r: aptRect(x, y0, xe, y1) }); x = xe; });
  else { const fw = list.reduce((s, r) => s + (r[2] === 'hl' ? 0 : r[1]), 0), hw2 = Math.max(1.2, w - fw), k2 = (w - hw2) / (fw || 1); list.forEach(r => { const ww = r[2] === 'hl' ? hw2 : r[1] * k2; out.push({ n: r[0], c: r[2], r: aptRect(x, y0, x + ww, y1) }); x += ww; }); }
  return out; };
// bir tomonlama kvartira: ya — kirish (yo'lak) tomoni, yb — fasad; xonalar chuqurligi ≤ rD
const aptSingle = (x0, x1, ya, yb, t, rD) => { const s = Math.sign(yb - ya), dep = Math.abs(yb - ya), rd = Math.min(rD, dep - 2.2), yf = yb - s * rd; return aptSplit(x0, x1, yf, yb, aptROOMS(t), true).concat(aptSplit(x0, x1, ya, yf, aptSVC(t, x1 - x0), false)); };
// quyosh yo'li (haqiqiy quyosh vaqti, 10 daqiqa qadam, balandlik > 3°): d — rejadagi yo'nalish (dunyo, y pastga = janub)
const sunPath = (lat, day) => { const la = lat * Math.PI / 180, de = 23.45 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + day) / 365), out = [];
  for (let m = 0; m < 24 * 60; m += 10) { const H = (m / 60 - 12) * 15 * Math.PI / 180, alt = Math.asin(Math.sin(la) * Math.sin(de) + Math.cos(la) * Math.cos(de) * Math.cos(H)); if (alt < 3 * Math.PI / 180) continue;
    const A = Math.atan2(-Math.cos(de) * Math.sin(H), Math.sin(de) * Math.cos(la) - Math.cos(de) * Math.cos(H) * Math.sin(la)); out.push({ m, alt, w: [Math.sin(A), -Math.cos(A)] }); } return out; };
// ---- SEKSIYA (turar joy, kvartirografiya qoidalari bilan): nS seksiya qatorda (har biri nM fasad moduli); har seksiyada zina-lift yadrosi: zina | lift holli (fasadgacha, yorug') | liftlar.
// Chuqurlik D ≥ dC → o'rta yo'lak, ikki qator kvartira, uchlarida to'liq chuqurlikdagi (ikki tomonlama) katta kvartiralar; D < dC → yo'lak orqa (shimolga yaqin) fasad bo'ylab, kvartiralar bir qatorda, uchlarida burchak kvartiralar.
// Kvartira o'lchami — S/M/L to'plam (umumiy maydon ≈ reja × kNet), aralash (m1…m4) ulushlari bo'yicha yarim modul qadamida to'ldiriladi; xonalar: fasad qatori (chuqurligi ≤ rD), kirish tomonida dahliz va sanuzel.
// Me'yoriy qiymatlar — parametr (normaga qarab qo'ying): ShNQ 2.01.02-04 5.13 / 5.27 / 5.31 / 5.40, SP 54.13330.2022 5.11, SanQvaN insolyatsiya.
MODS.seksiya = { prefix: 'J', title: 'Seksiya (kvartirografiya)',
  def: { nS: 2, nM: 8, mod: 3.3, D: 16, dC: 13, nF: 9, gH: 3.3, fh: 3.0, gf: 0, sz: 1, m1: 30, m2: 40, m3: 25, m4: 5, endB: 1, cw: 1.8, lb: 1.8, lifts: 2, stairs: 1, rD: 6, dMax: 10.5, kNet: 0.85, mat: 0,
    winW: 1.5, winH: 1.5, sill: 0.9, evac: 25, aMax: 8, cMax: 20, fA: 500, h28: 28, hw: 2.4, nAng: 45, ins: 1, ins4: 2, insH: 2, lat: 41.3, day: 81, bal: 1, balD: 1.2, kBal: 0.3, lv: 16, bd: 8, kt: 8, a1: 28, a2: 44, a3: 56, a4: 70, Rq: 2.0 },
  help: { nS: 'seksiyalar soni (qatorda)', nM: 'seksiya uzunligi, fasad modullarida', mod: 'fasad moduli, m', D: 'korpus chuqurligi, m', dC: 'shu chuqurlikdan boshlab o‘rta yo‘lak, m (kichikda — orqa fasad bo‘ylab yo‘lak)', nF: 'qavatlar soni', gH: '1-qavat balandligi, m', fh: 'tipik qavat balandligi, m', gf: '1-qavat: 0 — kvartiralar + o‘tuvchi kirish holli, 1 — tijorat + kirish holli', sz: 'kvartira o‘lchami: 0 — S, 1 — M, 2 — L', m1: '1 xonali ulushi, %', m2: '2 xonali, %', m3: '3 xonali, %', m4: '4 xonali, %', endB: 'uchlarida (toretsda) katta kvartira: 1 — ha, 0 — yo‘q', cw: 'yo‘lak eni, m (normaga qarab; tavsiya 1,8)', lb: 'lift holli eni, m (normaga qarab)', lifts: 'liftlar soni (yadroda)', stairs: 'zinalar soni (yadroda)', rD: 'xona chuqurligi eng ko‘pi, m (normaga qarab)', dMax: 'bir tomonlama kvartira chuqurligi eng ko‘pi, m (normaga qarab)', kNet: 'umumiy maydon / reja maydoni (o‘lcham tanlash uchun)', mat: 'tashqi devor: 0 — gazoblok, 1 — ventfasad TB, 2 — uch qatlamli panel, 3 — g‘isht (spouw)', winW: 'deraza eni, m', winH: 'deraza balandligi, m', sill: 'deraza tagligi, m', evac: 'kvartira eshigidan zinagacha eng ko‘pi, m (normaga qarab)', aMax: 'bir yadroga qavatda kvartiralar eng ko‘pi (normaga qarab)', cMax: 'bir yo‘lakda kvartiralar eng ko‘pi (normaga qarab)', fA: 'seksiya qavat maydoni shundan katta bo‘lsa — 2 zina, m² (normaga qarab)', h28: 'yuqori qavat poli shundan baland bo‘lsa — tutunsiz (Н1) zina, m (normaga qarab)', hw: '1-qavat o‘tuvchi holl eni eng kami, m', nAng: 'shimol sektori yarim burchagi, ° (fasad normali shimoldan shu burchak ichida — «shimoliy»)', ins: '1–3 xonali kvartirada insolyatsiyalanadigan xonalar eng kami (normaga qarab)', ins4: '4 xonalida (normaga qarab)', insH: 'xonaga uzluksiz quyosh, soat (normaga qarab qo‘ying)', lat: 'geografik kenglik, ° (site buyrug‘i bo‘lsa — undan)', day: 'insolyatsiya kuni (81 — 22 mart, 265 — 22 sentabr)', bal: 'balkon: 1 — har kvartirada kunduzgi xona oldida (2-qavatdan), 0 — yo‘q', balD: 'balkon chiqishi, m', kBal: 'balkon maydoni koeffitsiyenti umumiy maydonga (normaga qarab)', lv: 'umumiy xona (mehmonxona) eng kami, m² (normaga qarab)', bd: 'yotoqxona eng kami, m² (normaga qarab)', kt: 'oshxona eng kami, m² (normaga qarab)', a1: '1 xonali kvartira eng kami, m² (normaga qarab)', a2: '2 xonali, m²', a3: '3 xonali, m²', a4: '4 xonali, m²', Rq: 'tashqi devor issiqlik qarshiligi talabi R, m²·K/W (normaga qarab qo‘ying)' },
  geom(M, e) { const P = Object.assign({}, this.def, e.p || {}), A0 = resolve(M, e.at), tt = modTools(e, P), T = tt.T(A0), chk = [], prims = [], plan = [], ifc = [], floors = [], storeys = [], zones = {};
    const ci = (v, a, b) => Math.max(a, Math.min(b, Math.round(v))), co = tt.co, si = tt.si, r1 = v => Math.round(v * 10) / 10;
    const nS = ci(P.nS, 1, 8), nM = ci(P.nM, 4, 16), nF = ci(P.nF, 1, 30), hm = P.mod / 2, Ls = nM * P.mod, Lt = nS * Ls, D = P.D, C = D >= P.dC;
    const MK = ['extGB', 'extRC', 'extSW', 'extBR'][ci(P.mat, 0, 3)], tE = matT(MK), tS = matT('sep'), tP = matT('part'), tC = matT('core'), RE = matR(MK);
    const b = co >= 0 ? -1 : 1, fr = -b; // b — shimolga yaqin (orqa) fasad tomoni (lokal y ishorasi); rejada +y — janub
    const nCos = Math.cos(P.nAng * Math.PI / 180), isN = (nx, ny) => -(nx * si + ny * co) >= nCos - 1e-9; // tashqi normal shimol sektorida
    const zOf = k => k === 0 ? 0 : P.gH + (k - 1) * P.fh, hOf = k => k === 0 ? P.gH : P.fh, H = P.gH + (nF - 1) * P.fh;
    const rect = (x0, y0, x1, y1) => [[Math.min(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.max(y0, y1)], [Math.min(x0, x1), Math.max(y0, y1)]];
    const band = (a, c, t) => { const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1, n = [-dy / l * t / 2, dx / l * t / 2]; return [[a[0] - n[0], a[1] - n[1]], [c[0] - n[0], c[1] - n[1]], [c[0] + n[0], c[1] + n[1]], [a[0] + n[0], a[1] + n[1]]]; };
    // kvartira o'lchamlari (umumiy maydon, m²): S / M / L; 4 xonali — taxminiy
    const PRE = [[36, 52, 70, 85], [42, 60, 80, 100], [50, 72, 95, 115]], AT = PRE[ci(P.sz, 0, 2)], SZN = 'SML'[ci(P.sz, 0, 2)];
    const sh0 = [P.m1, P.m2, P.m3, P.m4].map(v => Math.max(0, +v || 0)), sSum = sh0.reduce((a, c) => a + c, 0) || 1, sh = sh0.map(v => v / sSum);
    let types = [0, 1, 2, 3].filter(i => sh[i] > 0); if (!types.length) types = [1];
    const units = (t, d) => Math.max(2, Math.round(AT[t] / P.kNet / d / (P.mod / 2))), tBig = types.slice().reverse().find(t => sh[t] >= 0.15) ?? Math.max(...types); // torets uchun — ulushi sezilarli eng katta tur
    const placed = [0, 0, 0, 0]; let nPl = 0;
    // segmentni to'ldirish: U yarim modulga sig'adigan tur to'plamlari (har tur eni — maqsaddan −15 %…+20 % oralig'ida) ichidan aralash ulushlariga va maqsad o'lchamga eng yaqini
    const uT = (t, d) => AT[t] / P.kNet / d / hm, uLo = (t, d) => Math.max(2, Math.ceil(uT(t, d) * 0.85 - 1e-9)), uHi = (t, d) => Math.max(uLo(t, d), Math.floor(uT(t, d) * 1.2 + 1e-9));
    const dist = (items, U) => { items.forEach(q => q.u = Math.max(q.lo, Math.min(q.hi, Math.round(q.ut)))); let diff = U - items.reduce((s, q) => s + q.u, 0), g = 0;
      while (diff !== 0 && g++ < 200) { const cand = items.filter(q => diff > 0 ? q.u < q.hi : q.u > q.lo); if (!cand.length) return null; cand.sort((p, q) => diff > 0 ? (q.ut - q.u) - (p.ut - p.u) || q.t - p.t : (p.ut - p.u) - (q.ut - q.u)); cand[0].u += Math.sign(diff); diff -= Math.sign(diff); }
      return diff === 0 ? items : null; };
    const fill = (U, d, big, dry) => { const pl = dry ? placed.slice() : placed, lo = types.map(t => uLo(t, d)), hi = types.map(t => uHi(t, d)); let best = null;
      const rec = (i, cnt, sLo) => { if (sLo > U) return; if (i === types.length) { const n = cnt.reduce((s, v) => s + v, 0); if (!n) return; const sHi = cnt.reduce((s, v, k) => s + v * hi[k], 0); if (sHi < U) return;
          const items = []; types.forEach((t, k) => { for (let m = 0; m < cnt[k]; m++) items.push({ t, lo: lo[k], hi: hi[k], ut: uT(t, d) }); }); if (!dist(items, U)) return;
          const n2 = nPl + n; let s2 = 0; types.forEach((t, k) => { s2 += (pl[t] + cnt[k] - sh[t] * n2) ** 2; }); s2 += items.reduce((s, q) => s + Math.abs(q.u - q.ut), 0) * 0.12 + (big && !cnt[types.indexOf(tBig)] ? 2 : 0);
          if (!best || s2 < best.s) best = { s: s2, items }; return; }
        for (let m = 0; sLo + m * lo[i] <= U; m++) { cnt[i] = m; rec(i + 1, cnt, sLo + m * lo[i]); } cnt[i] = 0; };
      rec(0, types.map(() => 0), 0);
      let out = [], sq = 0; if (best) out = best.items.map(q => ({ t: q.t, u: q.u })); else if (U >= 2) { out = [{ t: types[0], u: U }]; sq = Math.max(0, uLo(types[0], d) - U) * 4 + 3; }
      // tartib: katta — chetda (big), qolganlari navbatma-navbat (katta, kichik, …)
      out.sort((p, q) => q.t - p.t); if (!big && out.length > 2) { const o2 = []; while (out.length) { o2.push(out.shift()); if (out.length) o2.push(out.pop()); } out = o2; }
      out.forEach(q => { pl[q.t]++; }); if (!dry) nPl += out.length;
      return { out, bad: sq + (best ? best.s * 0.5 : 0) + (U > 0 && !out.length ? 50 : 0) }; };
    // xonalar: fasad qatori (xonalar) + kirish tomonidagi xizmat qatori; ikki tomonlama — o'rtada xizmat qatori
    const ROOMS = aptROOMS, SVC = aptSVC, split = aptSplit;
    const inX0 = -Lt / 2 + tE, inX1 = Lt / 2 - tE, inY0 = -D / 2 + tE, inY1 = D / 2 - tE;
    const netR = R => { const x0 = Math.max(R[0][0] + tP / 2, inX0), x1 = Math.min(R[2][0] - tP / 2, inX1), y0 = Math.max(R[0][1] + tP / 2, inY0), y1 = Math.min(R[2][1] - tP / 2, inY1); return rect(x0, y0, x1, y1); };
    const ar = R => Math.abs((R[2][0] - R[0][0]) * (R[2][1] - R[0][1]));
    const facesOf = R => { const f = []; if (Math.abs(R[0][1] + D / 2) < 1e-6) f.push([0, -1]); if (Math.abs(R[2][1] - D / 2) < 1e-6) f.push([0, 1]); if (Math.abs(R[0][0] + Lt / 2) < 1e-6) f.push([-1, 0]); if (Math.abs(R[2][0] - Lt / 2) < 1e-6) f.push([1, 0]); return f; };
    const layout = A => { const { x0, x1, ya, yb, t } = A, w = x1 - x0, R = [];
      if (!A.through) { const s = Math.sign(yb - ya), dep = Math.abs(yb - ya), rd = Math.min(P.rD, dep - 2.2), yf = yb - s * rd; // fasad qatori [yf, yb], xizmat qatori [ya, yf]
        R.push(...aptSingle(x0, x1, ya, yb, t, P.rD)); A.entrY = ya; }
      else { const sd = Math.max(2.4, D - 2 * P.rD), ys0 = -sd / 2, ys1 = sd / 2, nS2 = isN(0, -1) ? 1 : 0, sun = isN(0, -1) && !isN(0, 1) ? 1 : isN(0, 1) && !isN(0, -1) ? -1 : fr; // quyoshli tomon
        const RL = ROOMS(t), dayA = t >= 2 ? RL.slice(0, 2) : RL.slice(0, 1), rest = t >= 2 ? RL.slice(2) : RL.slice(1);
        const yS = sun > 0 ? [ys1, D / 2] : [-D / 2, ys0], yN = sun > 0 ? [-D / 2, ys0] : [ys1, D / 2];
        R.push(...split(x0, x1, yS[0], yS[1], dayA, true)); if (rest.length) R.push(...split(x0, x1, yN[0], yN[1], rest, true)); else R.push({ n: 'Kiyim xonasi', c: 'st', r: rect(x0, yN[0], x1, yN[1]) });
        R.push(...split(x0, x1, ys0, ys1, SVC(t, w), false)); A.entrY = 0; }
      R.forEach(q => { q.face = facesOf(q.r); q.net = netR(q.r); q.area = r1(ar(q.net)); q.north = q.face.length > 0 && q.face.every(n => isN(n[0], n[1])); q.live = q.c === 'lv' || q.c === 'bd'; });
      A.rooms = R; A.area = r1(R.reduce((s, q) => s + q.area, 0)); A.liveA = r1(R.filter(q => q.live).reduce((s, q) => s + q.area, 0));
      const lit = R.filter(q => q.live && q.face.length && !q.north).length; A.lit = lit; A.northOnly = R.some(q => q.live) && lit === 0; A.hall = R.find(q => q.c === 'hl'); return A; };
    // seksiyalar: yadro (o'rni — qatorni to'ldirishga eng qulay, markazga yaqin), qatorlar, kvartiralar
    const secs = [], cRaw = P.stairs * 2.8 + P.lb + (P.lifts > 0 ? 2.3 : 0), cU = Math.ceil(cRaw / hm - 1e-6), cWd = cU * hm, lbW = P.lb + (cWd - cRaw);
    const uMn0 = Math.min(...types.map(t => units(t, (D - P.cw) / 2))), capE = (eL, eR) => Math.max(0, Math.floor((nM * 2 - cU - uMn0) / (eL && eR ? 2 : 1)));
    if (C && P.endB) { const nE = nS === 1 ? 2 : 2; if (capE(true, nS === 1) >= 3) { placed[tBig] += nE; nPl += nE; } } // torets kvartiralari oldindan hisobga olinadi
    for (let j = 0; j < nS; j++) { const x0 = -Lt / 2 + j * Ls, x1 = x0 + Ls, endL = P.endB && j === 0, endR = P.endB && j === nS - 1;
      const rows = C ? [{ s: b, ya: b * P.cw / 2, yb: b * D / 2, core: true }, { s: fr, ya: fr * P.cw / 2, yb: fr * D / 2 }] : [{ s: fr, ya: b * (D / 2 - P.cw), yb: fr * D / 2, core: true }];
      rows.forEach(r => r.d = Math.abs(r.yb - r.ya));
      const corr = C ? rect(x0, -P.cw / 2, x1, P.cw / 2) : rect(x0, b * D / 2, x1, b * (D / 2 - P.cw));
      const apts = []; let uEL = 0, uER = 0;
      if (C) { const cap = capE(endL, endR); if (cap >= 3) { if (endL) uEL = Math.min(cap, Math.max(3, units(tBig, D))); if (endR) uER = Math.min(cap, Math.max(3, units(tBig, D))); } }
      const rx0 = x0 + uEL * hm, rx1 = x1 - uER * hm, U = Math.round((rx1 - rx0) / hm);
      // yadro o'rni: barcha yarim modul o'rinlarini sinab ko'rish (quruq to'ldirish), markazga yaqinini afzal ko'rish
      const cr = rows.find(r => r.core); let best = null;
      for (let u0 = 0; u0 + cU <= U; u0++) { const a = fill(u0, cr.d, !C && endL, true), c = fill(U - u0 - cU, cr.d, !C && endR, true), sc = a.bad + c.bad + Math.abs(u0 + cU / 2 - U / 2) * 0.35 + (u0 > 0 && u0 < 2 ? 30 : 0) + (U - u0 - cU > 0 && U - u0 - cU < 2 ? 30 : 0); if (!best || sc < best.sc) best = { u0, sc }; }
      const cx0 = rx0 + (best ? best.u0 : 0) * hm, cx1 = cx0 + cWd, core = rect(cx0, cr.ya, cx1, cr.yb);
      const put = (xa, xb, row, end) => { const F = fill(Math.round((xb - xa) / hm), row.d, end, false); let x = xa; F.out.forEach(q => { const xe = x + q.u * hm; apts.push({ j, t: q.t, x0: x, x1: xe, ya: row.ya, yb: row.yb, through: false }); x = xe; }); };
      if (uEL) apts.push({ j, t: tBig, x0, x1: rx0, ya: 0, yb: 0, through: true, endX: -1 });
      rows.forEach(row => { if (row.core) { put(rx0, cx0, row, !C && endL); put(cx1, rx1, row, !C && endR); } else put(rx0, rx1, row, false); });
      if (uER) apts.push({ j, t: tBig, x0: rx1, x1, ya: 0, yb: 0, through: true, endX: 1 });
      // orqa yo'lakli sxemada o'ng uchdagi burchak kvartira kattaroq bo'lsin: oxirgi segmentni teskari tartibda
      if (!C && endR) { const seg = apts.filter(a => !a.through && a.x0 >= cx1 - 1e-6 && Math.sign(a.yb) === Math.sign(cr.yb)); if (seg.length > 1) { const ws = seg.map(a => a.x1 - a.x0).reverse(), ts = seg.map(a => a.t).reverse(); let x = cx1; seg.forEach((a, i) => { a.x0 = x; a.x1 = x + ws[i]; a.t = ts[i]; x = a.x1; }); } }
      apts.forEach(layout);
      // yadro ichi: zina(lar) | lobbi | lift(lar) — x bo'ylab; zina yo'lak tomonidan boshlanadi
      const yA = cr.ya, yB = cr.yb, sgn = Math.sign(yB - yA), cdep = Math.abs(yB - yA), stW = 2.8; let xx = cx0; const stairsR = []; for (let q = 0; q < P.stairs; q++) { stairsR.push(rect(xx, yA, xx + stW, yB)); xx += stW; }
      const lobby = rect(xx, yA, xx + lbW, yB); xx += lbW; const lifts = []; for (let q = 0; q < P.lifts; q++) { const ya2 = yA + sgn * (0.3 + q * 2.3); lifts.push(rect(xx, ya2, xx + 2.3, ya2 + sgn * 2.2)); }
      secs.push({ j, x0, x1, rows, corr, core, cx0, cx1, apts, stairsR, lobby, lifts, cdep, corrX: [rx0 - (C ? 0 : uEL * hm), rx1 + (C ? 0 : uER * hm)] }); }
    // qavatlar: 1-qavat (o'tuvchi holl / tijorat) va tipik qavatlar
    const nameC = { lv: 'umumiy', bd: 'yotoq', kt: 'oshxona', bt: 'hammom', wc: 'hojatxona', hl: 'dahliz', st: 'omborxona' };
    let num = 0; const all = [], commons = []; const WT = { ext: { cls: 'IfcWallType', name: MATLIB[MK].uz, pt: '.SOLIDWALL.' }, sep: { cls: 'IfcWallType', name: MATLIB.sep.uz, pt: '.SOLIDWALL.' }, part: { cls: 'IfcWallType', name: MATLIB.part.uz, pt: '.PARTITIONING.' }, core: { cls: 'IfcWallType', name: MATLIB.core.uz, pt: '.SHEAR.' }, slab: { cls: 'IfcSlabType', name: MATLIB.slab.uz, pt: '.FLOOR.' }, win: { cls: 'IfcWindowType', name: `Deraza ${Math.round(P.winW * 1000)}×${Math.round(P.winH * 1000)}`, tail: '.WINDOW.,.SINGLE_PANEL.,.F.,$' }, door: { cls: 'IfcDoorType', name: 'Kvartira kirish eshigi 1000×2100', tail: '.DOOR.,.SINGLE_SWING_LEFT.,.F.,$' }, doorI: { cls: 'IfcDoorType', name: 'Xona eshigi 800×2100', tail: '.DOOR.,.SINGLE_SWING_LEFT.,.F.,$' }, doorS: { cls: 'IfcDoorType', name: 'Sanuzel eshigi 700×2100', tail: '.DOOR.,.SINGLE_SWING_LEFT.,.F.,$' } }; const FW = {}, bals = [];
    const psW = (ext, lb, U) => Object.assign({ Pset_WallCommon: Object.assign({ IsExternal: ext, LoadBearing: lb }, U ? { ThermalTransmittance: ['IFCTHERMALTRANSMITTANCEMEASURE', Math.round(U * 1000) / 1000] } : {}) });
    const wallC = { ext: MATLIB[MK].col || [.9, .9, .88] }, colA = ['#ffffff', '#fdeedd', '#f9e0c4', '#f4cf9f'];
    for (let k = 0; k < nF; k++) { const z = zOf(k), h = hOf(k); storeys.push({ k, z, name: `${k + 1}-qavat` }); let fApts = 0, fArea = 0;
      // tashqi devor (butun bino bo'yicha bitta halqa) — derazalar shunga o'rnatiladi
      const outer = rect(-Lt / 2, -D / 2, Lt / 2, D / 2), inner = rect(inX0, inY0, inX1, inY1), extKey = 'ext' + k;
      ifc.push({ cls: 'IfcWall', name: `Tashqi devor · ${k + 1}-qavat`, desc: `${Math.round(tE * 1000)} mm, R ≈ ${RE.toFixed(2)}`, pt: '.SOLIDWALL.', storey: k, key: extKey, mat: MK, typ: 'ext', ps: psW(true, MATLIB[MK].lb, 1 / RE), extr: { p: outer, z0: z, h: h - 0.3, holes: [inner] }, qto: { n: 'Qto_WallBaseQuantities', q: [['Height', 'L', (h - 0.3) * 1000], ['Width', 'L', tE * 1000], ['GrossSideArea', 'A', Math.round(2 * (Lt + D) * (h - 0.3) * 10) / 10]] } });
      ifc.push({ cls: 'IfcSlab', name: `Yopma · ${k + 1}-qavat poli`, pt: '.FLOOR.', storey: k, mat: 'slab', typ: 'slab', ps: { Pset_SlabCommon: { IsExternal: k === 0, LoadBearing: true } }, extr: { p: outer, z0: z - 0.3, h: 0.3 }, qto: { n: 'Qto_SlabBaseQuantities', q: [['Width', 'L', 300], ['GrossArea', 'A', r1(Lt * D)]] } });
      prims.push({ t: 'p', p: outer.map(q => [q[0], q[1], z + 0.01]), c: COL.slab, x: true });
      plan.push({ p: outer, fill: '#fff', stroke: '#141414', w: 2.4, shf: k }); plan.push({ p: inner, fill: '#fff', stroke: '#141414', w: .8, shf: k });
      secs.forEach(S => { const { j, x0, x1 } = S;
        if (j > 0) ifc.push({ cls: 'IfcWall', name: `Seksiyalararo devor ${j}/${j + 1} · ${k + 1}-qavat`, pt: '.SOLIDWALL.', storey: k, key: `sec${j}_${k}`, mat: 'sep', typ: 'sep', ps: psW(false, true), extr: { p: band([x0, inY0], [x0, inY1], tS), z0: z, h: h - 0.3 } });
        // yadro: qavatma-qavat devor (halqa), zina marshlari, lobbi va zina xonasi (IfcSpace)
        const cP = S.core, cIn = rect(cP[0][0] + tC, cP[0][1] + tC, cP[2][0] - tC, cP[2][1] - tC);
        ifc.push({ cls: 'IfcWall', name: `Yadro devori · S${j + 1} · ${k + 1}-qavat`, pt: '.SHEAR.', storey: k, key: `core${j}_${k}`, mat: 'core', typ: 'core', ps: psW(false, true), extr: { p: cP, z0: z, h: h - 0.3, holes: [cIn] } });
        S.stairsR.forEach((R, q) => { const dz = h / 2, nR = Math.ceil(dz / 0.165), rh = dz / nR, run = (nR - 1) * 0.3, land = (S.cdep - run) / 2, sg = Math.sign(R[2][1] - R[0][1]) || 1, yA = Math.min(R[0][1], R[2][1]), xm = (R[0][0] + R[2][0]) / 2, wF = 1.3;
          if (k === 0 && land < 1.2) chk.push(['WARN', `S${j + 1}: zina katagiga marsh sig‘maydi — ${nR} ko‘tarilish × 0,3 m + ikki maydoncha > ${S.cdep.toFixed(1)} m (fh yoki chuqurlikni o‘zgartiring)`]);
          const fl = (xa, ya0, ya1, z0, z1) => { const top = [[xa, ya0, z0], [xa + wF, ya0, z0], [xa + wF, ya1, z1], [xa, ya1, z1]], bot = top.map(p => [p[0], p[1], p[2] - 0.2]); return { V: top.concat(bot), T: [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0]] }; };
          const y0 = yA + Math.max(0.2, land), y1 = y0 + run, xa = R[0][0] + 0.1, xb = R[2][0] - 0.1 - wF;
          ifc.push({ cls: 'IfcStairFlight', name: `Zina ${j + 1}.${q + 1} · ${k + 1}-qavat · 1-marsh`, storey: k, att: [String(nR), String(nR - 1), (rh * 1000).toFixed(1), '300.0', '.STRAIGHT.'], tess: fl(xa, y0, y1, z, z + dz) });
          ifc.push({ cls: 'IfcStairFlight', name: `Zina ${j + 1}.${q + 1} · ${k + 1}-qavat · 2-marsh`, storey: k, att: [String(nR), String(nR - 1), (rh * 1000).toFixed(1), '300.0', '.STRAIGHT.'], tess: fl(xb, y1, y0, z + dz, z + h) });
          plan.push({ p: R, fill: '#e6e6e6', stroke: '#141414', w: .8, shf: k }); for (let s2 = 0; s2 <= 6; s2++) { const yy = y0 + run * s2 / 6; plan.push({ p: [[xa, yy], [xb + wF, yy], [xb + wF, yy + 0.02], [xa, yy + 0.02]], fill: '#999', stroke: 'none', w: 0, shf: k }); }
          plan.push({ p: R, fill: 'none', stroke: 'none', w: 0, shf: k, t: 'Zina' });
          ifc.push({ cls: 'IfcSpace', name: `Z${j + 1}.${q + 1}-${k + 1}`, long: 'Zina katagi', storey: k, zone: 'Umumiy foydalanish joylari', uc: 'SL_90_10_87', bnd: [{ host: `core${j}_${k}`, ext: false }], ps: { Pset_SpaceCommon: { Reference: ['IFCIDENTIFIER', 'zina'], IsExternal: false, PubliclyAccessible: true } }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', r1(ar(R))], ['Height', 'L', (h - 0.3) * 1000]] }, extr: { p: R, z0: z, h: h - 0.3 } }); });
        S.lifts.forEach((R, q) => { if (k === 0) ifc.push({ cls: 'IfcTransportElement', name: `Lift ${j + 1}.${q + 1}`, desc: `${nF} to‘xtash`, pt: '.ELEVATOR.', extr: { p: R, z0: -1.5, h: H + 1.5 + 2.7 } }); plan.push({ p: R, fill: '#cfcfcf', stroke: '#141414', w: .8, shf: k, t: 'L' }); });
        const lob = S.lobby; plan.push({ p: lob, fill: '#f3f2ee', stroke: '#888', w: .5, shf: k, t: k === 0 && !C ? 'Kirish holli' : 'Lift holli' });
        ifc.push({ cls: 'IfcSpace', name: `LH${j + 1}-${k + 1}`, long: k === 0 && !C ? 'Kirish holli (o‘tuvchi)' : 'Lift holli', storey: k, zone: 'Umumiy foydalanish joylari', uc: k === 0 && !C ? 'SL_90_10_27' : 'SL_90_10_51', bnd: [{ host: `core${j}_${k}`, ext: false }], ps: { Pset_SpaceCommon: { Reference: ['IFCIDENTIFIER', 'lobbi'], IsExternal: false, PubliclyAccessible: true } }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', r1(ar(lob))], ['Height', 'L', (h - 0.3) * 1000]] }, extr: { p: lob, z0: z, h: h - 0.3 } });
        // yo'lak
        const cx = S.corrX, corrP = C ? rect(cx[0], -P.cw / 2 + tS / 2, cx[1], P.cw / 2 - tS / 2) : rect(Math.max(cx[0], inX0), b > 0 ? D / 2 - P.cw + tS / 2 : inY0, Math.min(cx[1], inX1), b > 0 ? inY1 : -D / 2 + P.cw - tS / 2);
        const corrKey = `corr${j}_${k}`, corrKey2 = `corrb${j}_${k}`; let hallR = null;
        if (k === 0 && P.gf) { // tijorat: yadrodan chap va o'ngda to'liq chuqurlik; o'rtada — o'tuvchi holl (yadro + yo'lak bo'lagi)
          const shops = [rect(Math.max(x0, inX0) + (j ? tS / 2 : 0), inY0, S.cx0, inY1), rect(S.cx1, inY0, Math.min(x1, inX1) - (j < nS - 1 ? tS / 2 : 0), inY1)].filter(R => ar(R) > 4);
          hallR = C ? rect(S.cx0, fr > 0 ? -P.cw / 2 : inY0, S.cx1, fr > 0 ? inY1 : P.cw / 2) : rect(S.cx0, b > 0 ? D / 2 - P.cw : inY0, S.cx1, b > 0 ? inY1 : -D / 2 + P.cw);
          shops.forEach((R, q) => { const nm = `Tijorat ${j + 1}.${q + 1}`; plan.push({ p: R, fill: '#f6e7c8', stroke: '#141414', w: .8, shf: 0, t: `${nm}|${r1(ar(R))} m²` }); ifc.push({ cls: 'IfcSpace', name: nm, long: 'Tijorat binosi (1-qavat)', storey: 0, uc: 'SL_20_50', bnd: [{ host: extKey, ext: true }], ps: { Pset_SpaceCommon: { Reference: ['IFCIDENTIFIER', 'tijorat'], IsExternal: false, PubliclyAccessible: true } }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', r1(ar(R))], ['Height', 'L', (h - 0.3) * 1000]] }, extr: { p: R, z0: z, h: h - 0.3 } }); });
          plan.push({ p: hallR, fill: '#f3f2ee', stroke: '#888', w: .5, shf: 0, t: 'O‘tuvchi kirish holli' }); ifc.push({ cls: 'IfcSpace', name: `KH${j + 1}`, long: 'Kirish holli (o‘tuvchi, ko‘cha ↔ hovli)', storey: 0, zone: 'Umumiy foydalanish joylari', uc: 'SL_90_10_27', bnd: [{ host: extKey, ext: true }], extr: { p: hallR, z0: z, h: h - 0.3 }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', r1(ar(hallR))]] } });
          commons.push({ k, a: ar(hallR) + ar(lob) + S.stairsR.reduce((s, R) => s + ar(R), 0) }); return; }
        plan.push({ p: corrP, fill: '#f1f0ec', stroke: '#888', w: .5, shf: k, t: 'Yo‘lak' }); ifc.push({ cls: 'IfcSpace', name: `Y${j + 1}-${k + 1}`, long: 'Yo‘lak (kvartiralararo)', storey: k, zone: 'Umumiy foydalanish joylari', uc: 'SL_90_10_15', bnd: (C ? [corrKey, corrKey2] : [corrKey]).map(host => ({ host, ext: false })).concat([{ host: `core${j}_${k}`, ext: false }], C ? [] : [{ host: extKey, ext: true }]), ps: { Pset_SpaceCommon: { Reference: ['IFCIDENTIFIER', 'yolak'], IsExternal: false, PubliclyAccessible: true } }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', r1(ar(corrP))], ['Height', 'L', (h - 0.3) * 1000], ['GrossPerimeter', 'L', 2 * ((corrP[2][0] - corrP[0][0]) + (corrP[2][1] - corrP[0][1])) * 1000]] }, extr: { p: corrP, z0: z, h: h - 0.3 } });
        commons.push({ k, a: ar(corrP) + ar(lob) + S.stairsR.reduce((s, R) => s + ar(R), 0) });
        // yo'lak devorlari (kvartiralar va yo'lak orasida) — kirish eshiklari shunga
        if (C) { ifc.push({ cls: 'IfcWall', name: `Yo‘lak devori (shimol) · S${j + 1} · ${k + 1}-qavat`, pt: '.SOLIDWALL.', storey: k, key: b < 0 ? corrKey : corrKey2, mat: 'sep', typ: 'sep', ps: psW(false, true), extr: { p: band([cx[0], -P.cw / 2], [cx[1], -P.cw / 2], tS), z0: z, h: h - 0.3 } });
          ifc.push({ cls: 'IfcWall', name: `Yo‘lak devori (janub) · S${j + 1} · ${k + 1}-qavat`, pt: '.SOLIDWALL.', storey: k, key: b < 0 ? corrKey2 : corrKey, mat: 'sep', typ: 'sep', ps: psW(false, true), extr: { p: band([cx[0], P.cw / 2], [cx[1], P.cw / 2], tS), z0: z, h: h - 0.3 } }); }
        else { const yw = b * (D / 2 - P.cw); ifc.push({ cls: 'IfcWall', name: `Yo‘lak devori · S${j + 1} · ${k + 1}-qavat`, pt: '.SOLIDWALL.', storey: k, key: corrKey, mat: 'sep', typ: 'sep', ps: psW(false, true), extr: { p: band([Math.max(cx[0], inX0), yw], [Math.min(cx[1], inX1), yw], tS), z0: z, h: h - 0.3 } }); }
        // kvartiralar
        const gHall = k === 0 && C ? [S.cx0, S.cx1] : null; // 1-qavat, o'rta yo'lak: yadro qarshisidagi old qator — o'tuvchi holl
        if (gHall) { hallR = rect(S.cx0, fr > 0 ? P.cw / 2 : inY0, S.cx1, fr > 0 ? inY1 : -P.cw / 2); plan.push({ p: hallR, fill: '#f3f2ee', stroke: '#888', w: .5, shf: 0, t: 'O‘tuvchi kirish holli' }); ifc.push({ cls: 'IfcSpace', name: `KH${j + 1}`, long: 'Kirish holli (o‘tuvchi, ko‘cha ↔ hovli)', storey: 0, zone: 'Umumiy foydalanish joylari', uc: 'SL_90_10_27', bnd: [{ host: extKey, ext: true }], extr: { p: hallR, z0: z, h: h - 0.3 }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', r1(ar(hallR))]] } }); commons.push({ k, a: ar(hallR) }); }
        S.apts.forEach(A0a => { const A = A0a; if (gHall && !A.through && Math.sign(A.yb) === fr && A.x1 > S.cx0 + 1e-6 && A.x0 < S.cx1 - 1e-6) { // hollga to'g'ri kelgan kvartira — xizmat xonalari
            [[A.x0, S.cx0], [S.cx1, A.x1]].forEach(([xa, xb], q) => { if (xb - xa < 1.2) return; const R = rect(xa, A.ya, xb, A.yb), Rn = netR(R); plan.push({ p: Rn, fill: '#eeeae2', stroke: '#141414', w: .6, shf: 0, t: q ? 'Pochta' : 'Kolyaska' }); ifc.push({ cls: 'IfcSpace', name: `X${j + 1}.${q + 1}`, long: q ? 'Pochta xonasi' : 'Kolyaska xonasi', storey: 0, zone: 'Umumiy foydalanish joylari', uc: q ? 'SL_20_55_65' : 'SL_90_50_84', bnd: [{ host: extKey, ext: true }], extr: { p: Rn, z0: z, h: h - 0.3 }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', r1(ar(Rn))]] } }); commons.push({ k, a: ar(Rn) }); }); return; }
          const madeW = FW[k] || (FW[k] = new Set()); num++; fApts++; const nm = `Kv ${num}`, zn = 'Kvartira ' + num; const rec = { num, k, j, t: A.t, area: A.area, liveA: A.liveA, northOnly: A.northOnly, lit: A.lit, through: A.through, end: !!A.endX || facesOf(rect(A.x0, Math.min(A.ya, A.yb), A.x1, Math.max(A.ya, A.yb))).some(n => n[0]), rooms: A.rooms, x: (A.x0 + A.x1) / 2, A }; all.push(rec); fArea += A.area;
          const yy0 = A.through ? -D / 2 : Math.min(A.ya, A.yb), yy1 = A.through ? D / 2 : Math.max(A.ya, A.yb), AR = rect(A.x0, yy0, A.x1, yy1);
          plan.push({ p: AR, fill: A.northOnly ? '#dfe7f2' : colA[Math.min(3, A.t)], stroke: '#141414', w: 1.1, shf: k });
          zones[zn] = { long: `${A.t + 1} xonali (${SZN}) · ${A.area} m²`, ot: 'Kvartira', ps: { Binokor_Kvartira: { Xonalar: A.t + 1, OlchamTuri: SZN, UmumiyMaydon: ['IFCAREAMEASURE', A.area], TurarMaydon: ['IFCAREAMEASURE', A.liveA], Qavat: k + 1, Seksiya: j + 1, IkkiTomonlama: !!A.through, FaqatShimolga: !!A.northOnly, InsolyatsiyaliXonalar: A.lit } } };
          A.rooms.forEach((q, i) => { const Rn = q.net; plan.push({ p: q.r, fill: 'none', stroke: '#141414', w: .45, shf: k, t: q.c === 'hl' ? `${nm} · ${A.t + 1}x|${A.area} m²` : `${q.n.replace('Oshxona-mehmonxona', 'Osh.-mehm.')}|${q.area}` });
            q.win = []; q.rec = { cls: 'IfcSpace', name: `${num}-${i + 1}`, long: q.n, desc: `${q.area} m²`, storey: k, zone: zn, uc: UC_ROOM[q.n], ps: { Pset_SpaceCommon: { Reference: ['IFCIDENTIFIER', nameC[q.c] || q.c], IsExternal: false, NetPlannedArea: ['IFCAREAMEASURE', q.area] } }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', q.area], ['Height', 'L', (h - 0.3) * 1000], ['GrossPerimeter', 'L', Math.round(2 * ((Rn[2][0] - Rn[0][0]) + (Rn[2][1] - Rn[0][1])) * 1000)], ['NetVolume', 'V', r1(q.area * (h - 0.3))]] }, extr: { p: Rn, z0: z, h: h - 0.3 } }; ifc.push(q.rec);
            // derazalar: har yashash xonasi va oshxona — har tashqi fasadida bittadan
            if (q.c === 'lv' || q.c === 'bd' || q.c === 'kt') q.face.forEach(nv => { const along = nv[0] ? [q.r[0][1], q.r[2][1]] : [q.r[0][0], q.r[2][0]], len = along[1] - along[0], ww = Math.min(P.winW, len - 0.6); if (ww < 0.6) return; const m = (along[0] + along[1]) / 2, wz = z + P.sill;
              const fx = nv[0] ? nv[0] * Lt / 2 : 0, fy = nv[1] ? nv[1] * D / 2 : 0, seg2 = nv[0] ? [[fx, m - ww / 2], [fx, m + ww / 2]] : [[m - ww / 2, fy], [m + ww / 2, fy]], inw = nv[0] ? [-nv[0] * tE, 0] : [0, -nv[1] * tE];
              const box = (t0, t1) => { const a = seg2[0], c = seg2[1]; return rect(a[0] + inw[0] * t0, a[1] + inw[1] * t0, c[0] + inw[0] * t1, c[1] + inw[1] * t1); };
              q.win.push({ x: nv[0] ? fx : m, y: nv[1] ? fy : m, n: nv, z: wz + P.winH / 2 });
              ifc.push({ cls: 'IfcWindow', name: `Deraza · ${nm} · ${q.n}`, storey: k, typ: 'win', att: [(P.winH * 1000).toFixed(1), (ww * 1000).toFixed(1), '.WINDOW.', '.SINGLE_PANEL.', '$'], extr: { p: box(0.45, 0.55), z0: wz, h: P.winH }, host: extKey, open: { p: box(-0.1, 1.1), z0: wz, h: P.winH } });
              plan.push({ p: box(0, 1), fill: '#fff', stroke: '#141414', w: .5, shf: k }); plan.push({ p: box(0.47, 0.53), fill: '#141414', stroke: 'none', w: 0, shf: k });
              // 3D: shisha (tashqi yuzadan biroz oldinda)
              const o = 0.03, g = nv[0] ? [[fx + nv[0] * o, m - ww / 2], [fx + nv[0] * o, m + ww / 2]] : [[m - ww / 2, fy + nv[1] * o], [m + ww / 2, fy + nv[1] * o]], gg = (nv[0] > 0 || nv[1] < 0) ? g : [g[1], g[0]];
              prims.push({ t: 'q', p: [[gg[0][0], gg[0][1], wz], [gg[1][0], gg[1][1], wz], [gg[1][0], gg[1][1], wz + P.winH], [gg[0][0], gg[0][1], wz + P.winH]], c: COL.glass }); }); });
          // kirish eshigi: dahliz markazida, yo'lak devorida (o'rta yo'lak uchidagi kvartira — yon devorida)
          const hl = A.hall; if (hl) { let seg2, host;
            if (A.through) { const xw = A.endX < 0 ? A.x1 : A.x0, yc = C ? 0 : b * (D / 2 - P.cw / 2); seg2 = [[xw, yc - 0.5], [xw, yc + 0.5]]; host = `endw${j}_${k}_${A.endX}`; }
            else { const xm = (hl.r[0][0] + hl.r[2][0]) / 2; seg2 = [[xm - 0.5, A.ya], [xm + 0.5, A.ya]]; host = corrKey; if (C && Math.sign(A.ya) !== b) host = corrKey2; }
            const vert = seg2[0][0] === seg2[1][0], th = (t2) => vert ? rect(seg2[0][0] - t2, seg2[0][1], seg2[0][0] + t2, seg2[1][1]) : rect(seg2[0][0], seg2[0][1] - t2, seg2[1][0], seg2[0][1] + t2);
            ifc.push({ cls: 'IfcDoor', name: `Kirish eshigi · ${nm}`, storey: k, typ: 'door', att: ['2100.0', '1000.0', '.DOOR.', '.SINGLE_SWING_LEFT.', '$'], extr: { p: th(0.03), z0: z, h: 2.1 }, host, open: { p: th(tS / 2 + 0.05), z0: z, h: 2.1 } });
            plan.push({ p: th(tS / 2 + 0.02), fill: '#fff', stroke: 'none', w: 0, shf: k }); plan.push({ p: th(0.04), fill: '#141414', stroke: 'none', w: 0, shf: k }); }
          // kvartiralararo devorlar (yon chegaralar; uchdagi ikki tomonlama kvartirada — ichki yon devor to'liq chuqurlikda)
          if (A.through) { const xw = A.endX < 0 ? A.x1 : A.x0; ifc.push({ cls: 'IfcWall', name: `Kvartiralararo devor · ${nm}`, pt: '.SOLIDWALL.', storey: k, key: `endw${j}_${k}_${A.endX}`, mat: 'sep', typ: 'sep', ps: psW(false, true), extr: { p: band([xw, inY0], [xw, inY1], tS), z0: z, h: h - 0.3 } }); }
          else [A.x0, A.x1].forEach((xw, q) => { if (Math.abs(xw + Lt / 2) < 1e-6 || Math.abs(xw - Lt / 2) < 1e-6) return; if (Math.abs(xw - S.x0) < 1e-6 || Math.abs(xw - S.x1) < 1e-6) return; if (Math.sign(A.yb) === Math.sign(S.core[0][1] + S.core[2][1]) && (Math.abs(xw - S.cx0) < 1e-6 || Math.abs(xw - S.cx1) < 1e-6)) return; if (S.apts.some(o => o.through && Math.abs((o.endX < 0 ? o.x1 : o.x0) - xw) < 1e-6)) return; const sk = `sw${k}_${xw.toFixed(2)}_${Math.sign(A.yb)}`; if (madeW.has(sk)) return; madeW.add(sk); // qo'shni bilan umumiy — bir marta
            const ya = A.ya + Math.sign(A.yb - A.ya) * tS / 2, yb = A.yb - Math.sign(A.yb - A.ya) * tE; ifc.push({ cls: 'IfcWall', name: `Kvartiralararo devor · ${nm} (${q ? 'o‘ng' : 'chap'})`, pt: '.SOLIDWALL.', storey: k, key: sk, mat: 'sep', typ: 'sep', ps: psW(false, true), extr: { p: band([xw, ya], [xw, yb], tS), z0: z, h: h - 0.3 } }); });
          // xonalararo to'siqlar: bir chiziqdagi ichki qirralar birlashtiriladi (chiziq — bitta devor); eshiklar va xona chegaralari shularga bog'lanadi
          const lines = {}; A.rooms.forEach(q => { const R = q.r; [[R[0], R[1]], [R[1], R[2]], [R[2], R[3]], [R[3], R[0]]].forEach(([p0, p1]) => { const vert = Math.abs(p0[0] - p1[0]) < 1e-6, c0 = vert ? p0[0] : p0[1]; const onB = vert ? (Math.abs(c0 - A.x0) < 1e-6 || Math.abs(c0 - A.x1) < 1e-6) : (Math.abs(c0 - yy0) < 1e-6 || Math.abs(c0 - yy1) < 1e-6); if (onB) return;
            const lk = (vert ? 'v' : 'h') + c0.toFixed(3), lo = vert ? Math.min(p0[1], p1[1]) : Math.min(p0[0], p1[0]), hi = vert ? Math.max(p0[1], p1[1]) : Math.max(p0[0], p1[0]); (lines[lk] = lines[lk] || { vert, c: c0, iv: [] }).iv.push([lo, hi]); }); });
          const pws = []; Object.values(lines).forEach(Ln => { Ln.iv.sort((p, q) => p[0] - q[0]); const mg = []; Ln.iv.forEach(I => { if (mg.length && I[0] <= mg[mg.length - 1][1] + 1e-6) mg[mg.length - 1][1] = Math.max(mg[mg.length - 1][1], I[1]); else mg.push(I.slice()); });
            mg.forEach(I => { const lo = Ln.vert ? Math.max(I[0], inY0) : Math.max(I[0], inX0), hi = Ln.vert ? Math.min(I[1], inY1) : Math.min(I[1], inX1); if (hi - lo < 0.3) return; const key = `pt${num}_${pws.length}`; pws.push({ vert: Ln.vert, c: Ln.c, lo: I[0], hi: I[1], key });
              const pa = Ln.vert ? [Ln.c, lo] : [lo, Ln.c], pb = Ln.vert ? [Ln.c, hi] : [hi, Ln.c]; ifc.push({ cls: 'IfcWall', name: `To‘siq · ${nm}`, pt: '.PARTITIONING.', storey: k, key, mat: 'part', typ: 'part', ps: psW(false, false), extr: { p: band(pa, pb, tP), z0: z, h: h - 0.3 } }); }); });
          const pwAt = (vert, c0, m) => pws.find(w => w.vert === vert && Math.abs(w.c - c0) < 1e-6 && m >= w.lo - 1e-6 && m <= w.hi + 1e-6);
          // ichki eshiklar: har xona dahlizga (umumiy qirra ≥ 0,9 m); bo'lmasa — dahlizga ulangan quruq xona orqali (o'tish xonasi); sanuzel — faqat dahlizdan
          const shared = (q1, q2) => { const R1 = q1.r, R2 = q2.r, ox = [Math.max(R1[0][0], R2[0][0]), Math.min(R1[2][0], R2[2][0])], oy = [Math.max(R1[0][1], R2[0][1]), Math.min(R1[2][1], R2[2][1])];
            if (Math.abs(ox[1] - ox[0]) < 1e-6 && oy[1] - oy[0] > 1e-6) return { vert: true, c: ox[0], lo: oy[0], hi: oy[1] }; if (Math.abs(oy[1] - oy[0]) < 1e-6 && ox[1] - ox[0] > 1e-6) return { vert: false, c: oy[0], lo: ox[0], hi: ox[1] }; return null; };
          const wet = q => q.c === 'bt' || q.c === 'wc' || q.c === 'st', reach = [A.hall].filter(Boolean); let passN = 0, nDoor = 0; const todo = A.rooms.filter(q => q !== A.hall);
          for (let g = 0; g < 6 && todo.length; g++) for (let i = todo.length - 1; i >= 0; i--) { const q = todo[i], from = reach.find(f => { const s2 = shared(q, f); return s2 && s2.hi - s2.lo >= 0.9 && (f === A.hall || (!wet(f) && !wet(q))); }); if (!from) continue;
            const s2 = shared(q, from), dw = wet(q) ? 0.7 : 0.8, m = (s2.lo + s2.hi) / 2, host = pwAt(s2.vert, s2.c, m), th2 = t2 => s2.vert ? rect(s2.c - t2, m - dw / 2, s2.c + t2, m + dw / 2) : rect(m - dw / 2, s2.c - t2, m + dw / 2, s2.c + t2);
            ifc.push({ cls: 'IfcDoor', name: `Ichki eshik · ${nm} · ${q.n}`, storey: k, typ: wet(q) ? 'doorS' : 'doorI', att: ['2100.0', (dw * 1000).toFixed(1), '.DOOR.', '.SINGLE_SWING_LEFT.', '$'], extr: { p: th2(0.02), z0: z, h: 2.1 }, host: host && host.key, open: host ? { p: th2(tP / 2 + 0.05), z0: z, h: 2.1 } : null });
            plan.push({ p: th2(tP / 2 + 0.01), fill: '#fff', stroke: 'none', w: 0, shf: k }); nDoor++; if (from !== A.hall) { passN++; q.via = from.n; } reach.push(q); todo.splice(i, 1); }
          rec.pass = passN; rec.noDoor = todo.length; rec.doors = nDoor;
          // xona chegaralari (IfcRelSpaceBoundary, 1-daraja): har qirra — fasad, yo'lak, qo'shni kvartira, yadro, seksiya devori yoki to'siq
          const sideKey = (x, ym) => { if (j > 0 && Math.abs(x - S.x0) < 1e-6) return `sec${j}_${k}`; if (j < nS - 1 && Math.abs(x - S.x1) < 1e-6) return `sec${j + 1}_${k}`; const te = S.apts.find(o => o.through && Math.abs((o.endX < 0 ? o.x1 : o.x0) - x) < 1e-6); if (te) return `endw${j}_${k}_${te.endX}`;
            if ((Math.abs(x - S.cx0) < 1e-6 || Math.abs(x - S.cx1) < 1e-6) && ym >= Math.min(S.core[0][1], S.core[2][1]) - 1e-6 && ym <= Math.max(S.core[0][1], S.core[2][1]) + 1e-6) return `core${j}_${k}`; return `sw${k}_${x.toFixed(2)}_${Math.sign(A.yb)}`; };
          A.rooms.forEach(q => { const R = q.r, Bm = new Map(); [[R[0], R[1]], [R[1], R[2]], [R[2], R[3]], [R[3], R[0]]].forEach(([p0, p1]) => { const vert = Math.abs(p0[0] - p1[0]) < 1e-6, c0 = vert ? p0[0] : p0[1], m = vert ? (p0[1] + p1[1]) / 2 : (p0[0] + p1[0]) / 2; let kk = null, ext = false;
              if (vert ? Math.abs(Math.abs(c0) - Lt / 2) < 1e-6 : Math.abs(Math.abs(c0) - D / 2) < 1e-6) { kk = extKey; ext = true; }
              else { const pw = pwAt(vert, c0, m); if (pw) kk = pw.key; else if (!vert && !A.through && Math.abs(c0 - A.ya) < 1e-6) kk = C && Math.sign(A.ya) !== b ? corrKey2 : corrKey; else if (vert) kk = sideKey(c0, m); }
              if (kk) Bm.set(kk, ext); }); q.rec.bnd = [...Bm].map(([host, ext]) => ({ host, ext })); });
          // balkon: 2-qavatdan, kunduzgi xona oldida (shimoliy bo'lmagan fasadda) — plita, to'siq, IfcSpace (kvartira zonasida)
          rec.balA = 0; if (P.bal && k > 0) { const lv = A.rooms.filter(q => q.c === 'lv' && q.face.length).map(q => ({ q, nv: q.face.find(n => !isN(n[0], n[1])) || q.face[0] }))[0];
            if (lv) { const nv = lv.nv, R = lv.q.r, along = nv[0] ? [R[0][1], R[2][1]] : [R[0][0], R[2][0]], bw = Math.min(4.2, along[1] - along[0] - 0.6), d = P.balD;
              if (bw >= 1.5 && d > 0.3) { const mm2 = (along[0] + along[1]) / 2, a0 = mm2 - bw / 2, a1 = mm2 + bw / 2, fx = nv[0] * Lt / 2, fy = nv[1] * D / 2, P2 = (u, v) => nv[0] ? [fx + nv[0] * v, u] : [u, fy + nv[1] * v], BR = rect(...P2(a0, 0), ...P2(a1, d)), tR = 0.05;
                bals.push({ R: BR, z }); rec.balA = r1(bw * d); prismPrims(prims, BR, z - 0.18, z, COL.white, { bot: true });
                const U = [[a0, 0], [a0, d], [a1, d], [a1, 0], [a1 - tR, 0], [a1 - tR, d - tR], [a0 + tR, d - tR], [a0 + tR, 0]].map(([u, v]) => P2(u, v));
                [[a0, 0, a0, d], [a0, d, a1, d], [a1, d, a1, 0]].forEach(([u0, v0, u1, v1]) => { const p0 = P2(u0, v0), p1 = P2(u1, v1); prims.push({ t: 'q', p: [[p0[0], p0[1], z], [p1[0], p1[1], z], [p1[0], p1[1], z + 1.1], [p0[0], p0[1], z + 1.1]], c: [.80, .86, .88] }); });
                ifc.push({ cls: 'IfcSlab', name: `Balkon plitasi · ${nm}`, pt: '.LANDING.', storey: k, extr: { p: BR, z0: z - 0.18, h: 0.18 } });
                ifc.push({ cls: 'IfcRailing', name: `Balkon to‘sig‘i · ${nm}`, pt: '.GUARDRAIL.', storey: k, extr: { p: U, z0: z, h: 1.1 } });
                ifc.push({ cls: 'IfcSpace', name: `${num}-B`, long: 'Balkon', desc: `${rec.balA} m² (k = ${P.kBal})`, storey: k, zone: zn, uc: 'SL_45_10_06', ps: { Pset_SpaceCommon: { Reference: ['IFCIDENTIFIER', 'balkon'], IsExternal: true, NetPlannedArea: ['IFCAREAMEASURE', rec.balA] } }, qto: { n: 'Qto_SpaceBaseQuantities', q: [['NetFloorArea', 'A', rec.balA]] }, extr: { p: BR, z0: z, h: 2.5 }, bnd: [{ host: extKey, ext: true }] });
                plan.push({ p: BR, fill: '#fff', stroke: '#141414', w: .6, shf: k, t: 'Balkon' }); } } } }); });
      floors.push({ k, z: z * 1000, area: Math.round(Lt * D), apts: fApts, net: r1(fArea) }); }
    // 3D: fasad devorlari (qavat bo'yicha, plita chizig'i bilan), 1-qavat tijorat vitraji, tom, parapet, yadro ustidagi mashina xonasi, kirish soyabonlari
    const sideQ = (nv, z0, z1, c) => { const x0 = -Lt / 2, x1 = Lt / 2, y0 = -D / 2, y1 = D / 2; if (nv[1] < 0) prims.push({ t: 'q', p: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], c }); else if (nv[1] > 0) prims.push({ t: 'q', p: [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], c }); else if (nv[0] < 0) prims.push({ t: 'q', p: [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], c }); else prims.push({ t: 'q', p: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], c }); };
    const wc = wallC.ext, wc2 = wc.map(v => v * 0.9); [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(nv => { for (let k = 0; k < nF; k++) { const z = zOf(k), h = hOf(k); if (k === 0 && P.gf && nv[1]) { sideQ(nv, z, z + h - 0.3, COL.glass); sideQ(nv, z + h - 0.3, z + h, wc2); continue; } sideQ(nv, z, z + h - 0.3, wc); sideQ(nv, z + h - 0.3, z + h, wc2); } sideQ(nv, H, H + 0.6, wc2); });
    prims.push({ t: 'p', p: rect(-Lt / 2, -D / 2, Lt / 2, D / 2).map(q => [q[0], q[1], H + 0.05]), c: [.80, .80, .78] });
    ifc.push({ cls: 'IfcRoof', name: 'Tom (tekis, parapet bilan)', pt: '.FLAT_ROOF.', extr: { p: rect(-Lt / 2, -D / 2, Lt / 2, D / 2), z0: H - 0.3, h: 0.3 } });
    secs.forEach(S => { const cP = S.core.map(q => [Math.max(inX0 + 0.05, Math.min(inX1 - 0.05, q[0])), Math.max(inY0 + 0.05, Math.min(inY1 - 0.05, q[1]))]); prismPrims(prims, cP, H, H + 2.7, COL.core, {}); prismPrims(prims, cP, 0, H, COL.core, { x: true, top: false });
      [fr, b].forEach(s => { const y = s * D / 2, cx = (S.cx0 + S.cx1) / 2, w2 = 1.8, d2 = 1.6; prismPrims(prims, rect(cx - w2, y, cx + w2, y + s * d2), (P.gf ? P.gH : 2.7) - 0.25, (P.gf ? P.gH : 2.7), COL.white, { bot: true }); const g = s < 0 ? [[cx - 0.9, y - 0.04], [cx + 0.9, y - 0.04]] : [[cx + 0.9, y + 0.04], [cx - 0.9, y + 0.04]]; prims.push({ t: 'q', p: [[g[0][0], g[0][1], 0.02], [g[1][0], g[1][1], 0.02], [g[1][0], g[1][1], 2.4], [g[0][0], g[0][1], 2.4]], c: COL.dark }); });
      ifc.push({ cls: 'IfcWall', name: `Mashina xonasi · S${S.j + 1}`, pt: '.SOLIDWALL.', mat: 'core', typ: 'core', extr: { p: S.core, z0: H, h: 2.7 } }); });
    plan.push({ p: rect(-Lt / 2, -D / 2, Lt / 2, D / 2), fill: 'none', stroke: '#141414', w: 2, hit: true });
    // ---- tekshiruvlar
    const typ = all.filter(a => a.k === Math.min(1, nF - 1)), nApt = all.length, perCoreF = Math.max(...secs.map(S => all.filter(a => a.k === Math.min(1, nF - 1) && a.j === S.j).length));
    const secA = Ls * D; if (secA > P.fA && P.stairs < 2) chk.push(['WARN', `Seksiya qavati ${Math.round(secA)} m² > ${P.fA} m² — 2 zina kerak (ShNQ 2.01.02-04 5.13, normaga qarab): stairs=2 yoki nM ni kamaytiring`]);
    if (P.cw < 1.2) chk.push(['FAIL', `Yo‘lak eni ${P.cw} m < 1,2 m (ShNQ 2.01.02-04 5.27, normaga qarab)`]); else if (P.cw < 1.4) chk.push(['WARN', `Yo‘lak eni ${P.cw} m < 1,4 m (tavsiya 1,8 m)`]);
    if (lbW < 1.6) chk.push(['FAIL', `Lift holli eni ${lbW.toFixed(2)} m < 1,6 m (ShNQ 2.01.02-04 5.31, normaga qarab)`]);
    const zTop = zOf(nF - 1); if (zTop > P.h28) chk.push(['WARN', `Yuqori qavat poli ${zTop.toFixed(1)} m > ${P.h28} m — tutunsiz (Н1) zina katagi kerak (ShNQ 2.01.02-04 5.40, normaga qarab); hozirgi yadro — oddiy zina`]);
    if (perCoreF > P.aMax) chk.push(['WARN', `Bir yadroga qavatda ${perCoreF} kvartira > ${P.aMax} (normaga qarab) — nM ni kamaytiring yoki seksiya qo‘shing`]);
    if (perCoreF > P.cMax) chk.push(['WARN', `Bir yo‘lakda ${perCoreF} kvartira > ${P.cMax}`]);
    if (nF > 5 && P.lifts < 1) chk.push(['FAIL', `${nF} qavat — lift kerak (normaga qarab)`]); else if (nF >= 10 && P.lifts < 2) chk.push(['WARN', `${nF} qavat — 2 lift tavsiya etiladi (normaga qarab)`]);
    let far = 0; secs.forEach(S => S.apts.forEach(A => { if (!A.hall) return; const xd = A.through ? (A.endX < 0 ? A.x1 : A.x0) : (A.hall.r[0][0] + A.hall.r[2][0]) / 2; const xs = S.stairsR.map(R => (R[0][0] + R[2][0]) / 2); far = Math.max(far, Math.min(...xs.map(x => Math.abs(x - xd))) + (C ? 0 : 0)); }));
    if (far > P.evac) chk.push(['WARN', `Kvartira eshigidan zinagacha ≈ ${far.toFixed(1)} m > ${P.evac} m (normaga qarab)`]);
    const rowD = C ? (D - P.cw) / 2 : D - P.cw; if (rowD > P.dMax) chk.push(['WARN', `Bir tomonlama kvartira chuqurligi ${rowD.toFixed(1)} m > ${P.dMax} m (normaga qarab) — D ni o‘zgartiring`]);
    if (rowD - Math.min(P.rD, rowD - 2.2) > 4.5) chk.push(['INFO', `Xizmat qatori chuqurligi ${(rowD - Math.min(P.rD, rowD - 2.2)).toFixed(1)} m — dahliz katta (chuqur korpus); chuqurlikni kamaytirish yoki ikki tomonlama kvartiralar`]);
    const nNo = typ.filter(a => a.northOnly).length; if (nNo) chk.push(['WARN', `Tipik qavatda ${nNo} kvartira faqat shimolga qaragan — ${C ? 'o‘rta yo‘lakli sxema faqat meridional (sharq–g‘arb) fasadlarda (burilishni ~90° qiling)' : 'yo‘lakni shimoliy tomonga o‘tkazing (burilish)'}; insolyatsiyani tekshiring`]);
    // soatbay insolyatsiya: har yashash xonasi derazasi markazi — quyosh yo'li (lat, day), balkonlar osilmasi va (analyze dan) modeldagi boshqa binolar soyasi
    const lat = e.p && e.p.lat != null ? P.lat : (M.site && M.site.lat != null ? M.site.lat : P.lat), dayN = P.day === 81 ? '22 mart' : P.day === 265 ? '22 sentabr' : P.day + '-kun';
    const SUN = sunPath(lat, P.day).map(S => ({ m: S.m, ta: Math.tan(S.alt), d: [S.w[0] * co + S.w[1] * si, -S.w[0] * si + S.w[1] * co] })), cos85 = Math.cos(85 * Math.PI / 180);
    const sunAt = (w, obs) => { let best = 0, run = 0, prev = -99; SUN.forEach(S => { let ok = S.d[0] * w.n[0] + S.d[1] * w.n[1] > cos85;
        if (ok) for (const B of bals) { if (B.z <= w.z) continue; const t2 = (B.z - 0.18 - w.z) / S.ta, x = w.x + S.d[0] * t2, y = w.y + S.d[1] * t2, R = B.R; if (x >= R[0][0] - 1e-6 && x <= R[2][0] + 1e-6 && y >= R[0][1] - 1e-6 && y <= R[2][1] + 1e-6) { ok = false; break; } }
        if (ok && obs) { const dmax = Math.min(300, (obs.H - w.z) / S.ta); for (let d = 2; d < dmax; d += 2) { const Wp = T([w.x + S.d[0] * d, w.y + S.d[1] * d, w.z + d * S.ta]); if (obs.list.some(f => f(Wp.x, Wp.y, Wp.z))) { ok = false; break; } } }
        if (ok) { run = S.m - prev === 10 ? run + 10 : 10; prev = S.m; best = Math.max(best, run); } }); return best / 60; };
    const doIns = obs => all.forEach(a => { let n2 = 0, mx = 0; a.rooms.forEach(q => { if (!q.live || !q.win || !q.win.length) return; q.sun = r1(Math.max(...q.win.map(w => sunAt(w, obs)))); mx = Math.max(mx, q.sun); if (q.sun >= P.insH) n2++; }); a.sun = mx; a.insN = n2; a.insOk = n2 >= (a.t >= 3 ? P.ins4 : P.ins);
      const Z = zones['Kvartira ' + a.num]; if (Z) Object.assign(Z.ps.Binokor_Kvartira, { QuyoshSoati: a.sun, InsolyatsiyaTalabi: a.insOk }); });
    const insChk = nObs => { const bad = all.filter(a => !a.insOk), src = nObs ? `balkonlar va modeldagi ${nObs} ta boshqa bino soyasi bilan` : 'balkonlar soyasi bilan; atrofdagi binolar modelda yo‘q';
      return bad.length ? ['WARN', `${bad.length} / ${all.length} kvartirada ≥ ${P.insH} soat quyosh oladigan xonalar yetarli emas (1–3 xonali ≥ ${P.ins}, 4 xonali ≥ ${P.ins4}; ${dayN}, ${lat}°; ${src}; eng past qavat ${Math.min(...bad.map(a => a.k)) + 1}) — normaga qarab`] : ['PASS', `Insolyatsiya: barcha ${all.length} kvartirada ≥ ${P.insH} soat (${dayN}, ${lat}°; ${src})`]; };
    doIns(null); const insIdx = chk.push(insChk(0)) - 1;
    const pass = typ.reduce((s, a) => s + (a.pass || 0), 0), noDoor = typ.reduce((s, a) => s + (a.noDoor || 0), 0); if (noDoor) chk.push(['WARN', `Tipik qavatda ${noDoor} xonaga eshik qo‘yib bo‘lmadi (dahliz yoki quruq xona bilan umumiy qirra < 0,9 m)`]); if (pass) chk.push(['INFO', `Tipik qavatda ${pass} xona o‘tish xonasi orqali kiriladi (dahlizga bevosita chiqmaydi) — reja ishlanmasida tekshiring`]);
    const amin = [P.a1, P.a2, P.a3, P.a4], small = typ.filter(a => a.area < amin[a.t]); if (small.length) chk.push(['WARN', `${small.length} kvartira me’yoriy eng kam maydondan kichik (masalan, Kv ${small[0].num}: ${small[0].area} < ${amin[small[0].t]} m²; SP 54.13330.2022 5.11, normaga qarab)`]);
    const rmin = { lv: P.lv, bd: P.bd, kt: P.kt }, rBad = []; typ.forEach(a => a.rooms.forEach(q => { const mn = q.c === 'lv' && a.t === 0 ? Math.min(P.lv, 14) : rmin[q.c]; if (mn && q.area < mn) rBad.push(`Kv ${a.num} ${q.n} ${q.area}`); }));
    if (rBad.length) chk.push(['WARN', `${rBad.length} xona eng kam maydondan kichik (${rBad.slice(0, 3).join('; ')} m²) — normaga qarab`]);
    if (RE < P.Rq) chk.push(['WARN', `Tashqi devor R ≈ ${RE.toFixed(2)} < ${P.Rq} m²·K/W (normaga qarab; λ taxminiy)`]);
    if (!C && lbW < P.hw) chk.push(['INFO', `1-qavatda o‘tuvchi kirish — lift holli orqali (${lbW.toFixed(2)} m < ${P.hw} m): lb ni oshiring`]);
    const shA = [0, 1, 2, 3].map(t => all.filter(a => a.t === t).length / (nApt || 1)); const dev = Math.max(...[0, 1, 2, 3].map(t => Math.abs(shA[t] - sh[t]))); const devOk = Math.max(0.12, 1 / Math.max(1, typ.length)); chk.push([dev > devOk ? 'WARN' : 'INFO', `Kvartirografiya (qavatda ${typ.length} kv., bitta kvartira ≈ ${Math.round(100 / Math.max(1, typ.length))} %): reja ${sh.map(v => Math.round(v * 100)).join('/')} %, amalda ${shA.map(v => Math.round(v * 100)).join('/')} % (1/2/3/4 xonali)`]);
    // ---- jadvallar
    { const fT = Lt * D, cT = commons.filter(c2 => c2.k === Math.min(1, nF - 1)).reduce((s, c2) => s + c2.a, 0); if (cT / fT > 0.2) chk.push(['INFO', `Umumiy joylar tipik qavatda ${(cT / fT * 100).toFixed(0)} % (> 20 %) — ${C ? 'yadro va yo‘lak' : 'butun fasad bo‘ylab yo‘lak'} samarasiz; ${C ? 'nM ni oshiring' : 'D ≥ ' + P.dC + ' (o‘rta yo‘lak) yoki galereyani qisqartiring'}`]); }
    const netA = r1(all.reduce((s, a) => s + a.area, 0)), gfa = Math.round(Lt * D * nF), comA = r1(commons.reduce((s, c) => s + c.a, 0)), K1 = netA / gfa;
    const floorTyp = Lt * D, comTyp = commons.filter(c => c.k === Math.min(1, nF - 1)).reduce((s, c) => s + c.a, 0);
    const table = { title: 'Seksiya: ko‘rsatkichlar', rows: [['Seksiyalar', `${nS} × ${Ls.toFixed(1)} m (${nM} modul × ${P.mod} m); chuqurligi ${D} m; bino ${Lt.toFixed(1)} × ${D} m`], ['Sxema', C ? `o‘rta yo‘lak (${P.cw} m), ikki qator; uchlarida ikki tomonlama kvartiralar` : `yo‘lak ${b < 0 ? 'shimoliy' : 'janubiy'} (orqa) fasad bo‘ylab (${P.cw} m), bir qator; uchlarida burchak kvartiralar`], ['Qavatlar', `${nF} (1-qavat ${P.gH} m — ${P.gf ? 'tijorat' : 'kvartiralar'}, tipik ${P.fh} m); balandligi ${H.toFixed(1)} m`], ['Yadro', `${P.stairs} zina | lift holli ${lbW.toFixed(2)} m | ${P.lifts} lift; eni ${cWd.toFixed(2)} m`], ['Kvartiralar', `${nApt} (${[0, 1, 2, 3].map(t => `${t + 1}x — ${all.filter(a => a.t === t).length}`).join(', ')}); o‘lcham ${SZN}`], ['Kvartiralar maydoni', netA.toLocaleString('ru') + ' m²'], ['Yalpi maydon (yer usti)', gfa.toLocaleString('ru') + ' m²'], ['K (kvartira / yalpi)', K1.toFixed(2)], ['Umumiy joylar (tipik qavat)', `${Math.round(comTyp)} m², ${(comTyp / floorTyp * 100).toFixed(1)} %`], ['Bir yadroga (qavatda)', perCoreF + ' kv.'], ['Tashqi devor', `${MATLIB[MK].uz}; ${Math.round(tE * 1000)} mm, R ≈ ${RE.toFixed(2)}, U ≈ ${(1 / RE).toFixed(2)} W/(m²·K)`], ['Zinagacha eng uzoq', far.toFixed(1) + ' m'], ['Balkonlar', P.bal ? `${all.filter(a => a.balA).length} ta, ${r1(all.reduce((s, a) => s + (a.balA || 0), 0))} m² (umumiy maydonga k = ${P.kBal})` : 'yo‘q'], ['Ichki eshiklar (tipik qavat)', `${typ.reduce((s, a) => s + (a.doors || 0), 0)}; o‘tish xonalari ${pass}`]] };
    const typRows = [0, 1, 2, 3].map(t => { const L2 = all.filter(a => a.t === t); if (!L2.length && !sh[t]) return null; const A2 = L2.map(a => a.area); return [`${t + 1} xonali`, L2.length, Math.round(sh[t] * 100) + ' %', Math.round(L2.length / (nApt || 1) * 100) + ' %', L2.length ? r1(A2.reduce((s, v) => s + v, 0) / L2.length) : '—', L2.length ? `${Math.min(...A2)}–${Math.max(...A2)}` : '—', AT[t], amin[t]]; }).filter(Boolean);
    const rowOf = a => [a.num, a.j + 1, `${a.t + 1}x`, a.area, a.liveA, a.rooms.filter(q => q.c !== 'hl').map(q => `${q.n.replace('Oshxona-mehmonxona', 'O-M')} ${q.area}`).join(', '), a.through ? 'ikki tomonlama' + (a.end ? ' + torets' : '') : a.end ? 'burchak' : 'bir tomonlama', (a.northOnly ? 'faqat shimol · ' : '') + `${a.sun} soat (${a.insN} xona ≥ ${P.insH})`] ;
    const tables = [{ title: 'kvartirografiya', head: ['Tur', 'Soni', 'Ulushi (reja)', 'Ulushi (amalda)', 'O‘rtacha, m²', 'Oraliq, m²', 'Maqsad, m²', 'Eng kami, m²'], rows: typRows },
      { title: 'kvartiralar (tipik qavat)', head: ['Kv', 'Seksiya', 'Tur', 'Maydon, m²', 'Turar, m²', 'Xonalar', 'Fasad', 'Quyosh, eng ko‘p'], rows: typ.map(rowOf) },
      { title: 'qavatlar', head: ['Qavat', 'Sath, m', 'Yalpi, m²', 'Kvartiralar', 'Kvartiralar maydoni, m²'], rows: floors.map(F => [F.k + 1, (F.z / 1000).toFixed(1), F.area.toLocaleString('ru'), F.apts, F.net]) },
      { title: 'devor va yopma turlari', head: ['Tur', 'Qatlamlar (tashqaridan)', 'Qalinlik, mm', 'R, m²·K/W', 'U, W/(m²·K)'], rows: [MK, 'sep', 'part', 'core', 'slab'].map(k2 => [MATLIB[k2].uz.split(':')[0], MATLIB[k2].L.map(l => `${l[0]} ${l[1]}`).join(' / '), Math.round(matT(k2) * 1000), k2 === MK ? RE.toFixed(2) : '—', k2 === MK ? (1 / RE).toFixed(2) : '—']) }];
    return { e, P, kind: 'seksiya', T, prims, plan, floors, ifc, storeys, zones, types: WT, table, tables, checks: chk, reins: obs => { doIns(obs); chk[insIdx] = insChk(obs.list.length); tables[1].rows = typ.map(rowOf); }, H: H + 2.7, gfa, foot: Math.round(Lt * D), base: rect(-Lt / 2, -D / 2, Lt / 2, D / 2).map(q => T([q[0], q[1], 0])), label: `seksiya · ${nApt} kv. · ${netA.toLocaleString('ru')} m²`, metrics: [['Kvartiralar', nApt], ['Kvartiralar maydoni', netA.toLocaleString('ru') + ' m²'], ['K', K1.toFixed(2)], ['Faqat shimolga', nNo]] }; } };
// modul natijasini dunyo koordinatalariga (mm) o'tkazish
function modGeom(M, e) { const G = MODS[e.cat].geom(M, e), T = G.T, W2 = q => T([q[0], q[1], 0]), W3 = q => T(q);
  G.prims = G.prims.map(r => ({ t: r.t, c: r.c, x: r.x, p: r.p.map(W3) }));
  G.plan = G.plan.map(r => Object.assign({}, r, { p: r.p.map(W2) }));
  G.ifc = G.ifc.map(r => Object.assign({}, r, r.extr ? { extr: { p: r.extr.p.map(W2), z0: r.extr.z0 * 1000, h: r.extr.h * 1000, holes: r.extr.holes ? r.extr.holes.map(h => h.map(W2)) : null } } : {}, r.tess ? { tess: { V: r.tess.V.map(W3), T: r.tess.T } } : {}, r.open ? { open: { p: r.open.p.map(W2), z0: r.open.z0 * 1000, h: r.open.h * 1000 } } : {}));
  G.storeys = (G.storeys || []).map(q => Object.assign({}, q, { z: q.z * 1000 }));
  return G; }
// ---- LENTA (ko'rgazma binosi, Ningbo turi): rejada burchakli kontur, bir uchida o'tkir «tumshuq» (kuchli konsol); 1-qavat — ichkariga chekingan to'q vitraj;
// yuqorida teshikli och yashil keramik «tasma» — yuqori VA pastki cheti to'lqinlanadi (tasma bukiladi), tepaga qarab tashqariga og'adi (tumshuqda ko'proq);
// tasma bir joyda binodan ajralib, pandus bo'lib tomga ko'tariladi (pandus devori — o'sha tasma). Atrofda ko'l va daraxtlar.
MODS.lenta = { prefix: 'E', title: 'Lenta (ko‘rgazma)', def: { L: 120, W: 52, prow: 0.22, ch: 1, gH: 6.5, sb: 4, Hb: 17, Ha: 7, Hl: 3.5, nw: 1.5, ph: 0.6, lean: 1.5, leanP: 5, pw: 1.0, phh: 0.5, hole: 0.45, fh: 5.5, clr: 3.5, atr: 0.12, cores: 4, evac: 40, rw: 4.5, rs: 10, ru: 0.5, rm: 0, rr: 14, lake: 1, trees: 60, seed: 4 },
  help: { L: 'uzunligi, m', W: 'eni, m', prow: 'tumshuq o‘tkirligi (uchidan qanchada to‘liq enga yetadi, ulush)', ch: 'burchaklarni silliqlash (0 — o‘tkir, 3 — yumaloq)', gH: '1-qavat (vitraj) balandligi, m', sb: 'vitraj tasmadan ichkarida, m (konsol)', Hb: 'tom (terrasa) balandligi, m', Ha: 'tasma yuqori cheti to‘lqini, m', Hl: 'tasma pastki cheti to‘lqini (pastga bukilishi), m', nw: 'perimetr bo‘ylab to‘lqinlar soni', ph: 'to‘lqin fazasi (0…1)', lean: 'tasma tashqariga og‘ishi (tepada), m', leanP: 'tumshuqda qo‘shimcha og‘ish, m', pw: 'panel eni, m', phh: 'panel balandligi, m', hole: 'teshiklar ulushi (0…0,6)', fh: 'yuqori qavat balandligi, m', clr: 'shiftgacha eng kam, m', atr: 'atrium ulushi', cores: 'zina-lift yadrolari', evac: 'zinagacha eng uzoq, m (normaga qarab qo‘ying)', rw: 'pandus eni, m', rs: 'pandus nishabi, % (normaga qarab qo‘ying)', ru: 'pandus boshlanish joyi (perimetr ulushi, 0 — tumshuq)', rm: 'pandus turi: 0 — tasmadan ajralib chiqadi, 1 — alohida vintsimon minora', rr: 'vintsimon pandus radiusi, m (rm = 1)', lake: 'ko‘l: 1 — bor, 0 — yo‘q', trees: 'daraxtlar soni', seed: 'naqsh urug‘i' },
  geom(M, e) { const P = Object.assign({}, this.def, e.p || {}), A0 = resolve(M, e.at), tt = modTools(e, P), T = tt.T(A0), chk = [], prims = [], plan = [], ifc = [], floors = [];
    const a = P.L / 2, b = P.W / 2, NB = 400, pr = Math.max(0.05, Math.min(0.45, P.prow));
    // burchakli kontur: tumshuq (−x), pastki uzun tomon, o'ng uch (ikki sinish), yuqori tomon; Chaikin bilan biroz silliqlanadi
    let ctl = [[-a, -0.1 * b], [-a + pr * P.L, -b], [a - 0.14 * P.L, -0.96 * b], [a, -0.4 * b], [a - 0.03 * P.L, 0.55 * b], [a - 0.22 * P.L, b], [-a + 0.4 * P.L, 0.92 * b], [-a + 0.12 * P.L, 0.45 * b]];
    for (let q = 0; q < Math.round(P.ch); q++) { const o = []; ctl.forEach((p, i) => { const r = ctl[(i + 1) % ctl.length]; o.push([p[0] * .75 + r[0] * .25, p[1] * .75 + r[1] * .25], [p[0] * .25 + r[0] * .75, p[1] * .25 + r[1] * .75]); }); ctl = o; }
    if (loopArea(ctl) < 0) ctl.reverse();
    // tumshuq nuqtasi (eng chap) — u = 0 shu yerdan boshlanadi
    { let k0 = 0; ctl.forEach((p, i) => { if (p[0] < ctl[k0][0]) k0 = i; }); ctl = ctl.slice(k0).concat(ctl.slice(0, k0)); }
    const cl = [0]; for (let q = 1; q <= ctl.length; q++) cl.push(cl[q - 1] + Math.hypot(ctl[q % ctl.length][0] - ctl[q - 1][0], ctl[q % ctl.length][1] - ctl[q - 1][1]));
    const raw = Array.from({ length: NB }, (_, q) => { const s = cl[ctl.length] * q / NB; let k = 0; while (k < ctl.length - 1 && cl[k + 1] <= s) k++; const f = (s - cl[k]) / ((cl[k + 1] - cl[k]) || 1), p = ctl[k], r = ctl[(k + 1) % ctl.length]; return [p[0] + (r[0] - p[0]) * f, p[1] + (r[1] - p[1]) * f]; });
    const cum = [0]; for (let q = 1; q <= NB; q++) cum.push(cum[q - 1] + Math.hypot(raw[q % NB][0] - raw[q - 1][0], raw[q % NB][1] - raw[q - 1][1])); const Lp = cum[NB];
    // normal: qo'shni nuqtalar bo'yicha (o'tkir burchakda silliq)
    const at = u => { const x = (((u % 1) + 1) % 1) * NB, lo = Math.floor(x) % NB, f = x - Math.floor(x), p = raw[lo], r = raw[(lo + 1) % NB], pa = raw[(lo - 2 + NB) % NB], pb = raw[(lo + 3) % NB], d = [pb[0] - pa[0], pb[1] - pa[1]], l = Math.hypot(...d) || 1; return { p: [p[0] + (r[0] - p[0]) * f, p[1] + (r[1] - p[1]) * f], n: [d[1] / l, -d[0] / l] }; };
    const off = (u, d) => { const B0 = at(u); return [B0.p[0] + B0.n[0] * d, B0.p[1] + B0.n[1] * d]; };
    const wav = (u, sh) => 0.5 + 0.5 * Math.sin(2 * Math.PI * (u * P.nw + P.ph + sh));
    const topZ = u => P.Hb + 1.2 + P.Ha * wav(u, 0), botZ = u => Math.max(2.6, P.gH - P.Hl * Math.pow(1 - wav(u, 0), 2)); /* tasma past joyida butunicha pastga bukiladi */
    const pd = u => { const d = Math.min(((u % 1) + 1) % 1, 1 - ((u % 1) + 1) % 1); return Math.exp(-Math.pow(d / 0.07, 2)); }; // tumshuqqa yaqinlik
    const leanAt = (u, f) => (P.lean + P.leanP * pd(u)) * f, sbAt = u => P.sb + P.leanP * 0.6 * pd(u);
    const rnd = (() => { let s9 = (Math.abs(Math.round(P.seed)) % 2147483646) + 1; return () => (s9 = (s9 * 16807) % 2147483647) / 2147483647; })();
    const GL = [.20, .25, .30], PAN = [.68, .78, .66], HOLE = COL.hole;
    // 1-qavat vitraj (to'q, chekingan; tumshuqda chuqurroq)
    const gl = Array.from({ length: 200 }, (_, q) => off(q / 200, -sbAt(q / 200)));
    prismPrims(prims, gl, 0, P.gH, GL, { top: false });
    // tasma: panellar (u — perimetr, z — botZ dan topZ gacha), tepaga qarab tashqariga og'adi; har panelda 2 ta romb teshik (qatorlar bo'yicha siljigan)
    const nU = Math.round(Lp / P.pw); let clad = 0, holes = 0, nP = 0;
    for (let i = 0; i < nU; i++) { const u0 = i / nU, u1 = (i + 1) / nU, zb = Math.max(botZ(u0), botZ(u1)), zt = Math.min(topZ(u0), topZ(u1)), Hs = zt - zb; let r = 0;
      for (let z = zb; z < zt - 0.01; z += P.phh, r++) { const z1 = Math.min(zt, z + P.phh), f0 = (z - zb) / Hs, f1 = (z1 - zb) / Hs;
        const A = off(u0, leanAt(u0, f0)), B = off(u1, leanAt(u1, f0)), C2 = off(u1, leanAt(u1, f1)), D = off(u0, leanAt(u0, f1)), sh = 0.94 + 0.08 * rnd();
        prims.push({ t: 'q', p: [[A[0], A[1], z], [B[0], B[1], z], [C2[0], C2[1], z1], [D[0], D[1], z1]], c: PAN.map(v => v * sh) }); nP++; const pa = P.pw * (z1 - z); clad += pa;
        if (P.hole > 0) { const nb = at((u0 + u1) / 2).n, hs = Math.min(0.3, Math.sqrt(P.hole) * 0.32); [r % 2 ? 0.25 : 0.75].forEach(fu => { const cx = A[0] + (B[0] - A[0]) * fu + (D[0] - A[0]) * 0.5, cy = A[1] + (B[1] - A[1]) * fu + (D[1] - A[1]) * 0.5, cz = (z + z1) / 2, tx = (B[0] - A[0]), ty = (B[1] - A[1]);
          const pt = (du, dz) => [cx + tx * du + nb[0] * 0.03, cy + ty * du + nb[1] * 0.03, cz + dz * (z1 - z)]; prims.push({ t: 'q', p: [pt(-hs, 0), pt(0, -hs * 1.6), pt(hs, 0), pt(0, hs * 1.6)], c: HOLE }); holes += 2 * hs * hs * 1.6 * pa; }); } } }
    // tasma pastki cheti (qalinlik) va ichki yuzasi tepada (parapet ichi)
    for (let i = 0; i < 200; i++) { const u0 = i / 200, u1 = (i + 1) / 200, A = off(u0, 0), B = off(u1, 0), Ai = off(u0, -0.5), Bi = off(u1, -0.5); prims.push({ t: 'q', p: [[A[0], A[1], botZ(u0)], [B[0], B[1], botZ(u1)], [Bi[0], Bi[1], botZ(u1)], [Ai[0], Ai[1], botZ(u0)]], c: PAN.map(v => v * .8) }); }
    // tom (terrasa) va ichki qavatlar
    const roofP = Array.from({ length: 200 }, (_, q) => off(q / 200, -0.4)); prims.push({ t: 'p', p: roofP.map(q => [q[0], q[1], P.Hb]), c: [.80, .80, .78] });
    let gfa = 0; const zs = [0]; for (let z = P.gH; z + P.clr <= P.Hb - 0.3; z += P.fh) zs.push(z);
    zs.forEach((z, k) => { const out = k ? Array.from({ length: 200 }, (_, q) => off(q / 200, -0.5)) : gl; const hole = k && P.atr > 0 ? out.map(q => [q[0] * Math.sqrt(P.atr), q[1] * Math.sqrt(P.atr)]) : null; const ar = Math.abs(loopArea(out)) - (hole ? Math.abs(loopArea(hole)) : 0); gfa += ar;
      floors.push({ k, z: z * 1000, area: Math.round(ar), outer: out.map(q => T([q[0], q[1], z])), hole: hole ? hole.map(q => T([q[0], q[1], z])) : null });
      prims.push({ t: 'p', p: out.map(q => [q[0], q[1], k ? z : 0.02]), c: COL.slab, x: true });
      plan.push({ p: out, fill: k ? '#dfe7f2' : '#f6e7c8', stroke: '#141414', w: 1.4, shf: k }); if (hole) plan.push({ p: hole, fill: '#fff', stroke: '#141414', w: .8, dash: true, shf: k });
      ifc.push({ cls: 'IfcSlab', name: (k + 1) + '-qavat plitasi', desc: Math.round(ar) + ' m2', pt: '.FLOOR.', storey: k, extr: { p: out, z0: z - 0.3, h: 0.3, holes: hole ? [hole] : null } }); });
    // yadrolar
    const cores = []; for (let c = 0; c < Math.max(1, Math.round(P.cores)); c++) { const u = (c + 0.5) / P.cores, B0 = at(u), cx = B0.p[0] - B0.n[0] * (sbAt(u) + 7), cy = B0.p[1] - B0.n[1] * (sbAt(u) + 7), sq = [[cx - 3.2, cy - 4], [cx + 3.2, cy - 4], [cx + 3.2, cy + 4], [cx - 3.2, cy + 4]]; cores.push([cx, cy]); prismPrims(prims, sq, 0, P.Hb + 1.2, COL.core, { x: true }); plan.push({ p: sq, fill: '#fff', stroke: '#141414', w: 1.4 }); ifc.push({ cls: 'IfcWall', name: 'Zina-lift yadrosi ' + (c + 1), pt: '.SHEAR.', extr: { p: sq, z0: 0, h: (P.Hb + 1.2) } }); }
    let far = 0; floors.forEach(F => { if (!F.k) return; for (let q = 0; q < 200; q += 4) { const p = off(q / 200, -0.5); far = Math.max(far, Math.min(...cores.map(c => Math.hypot(p[0] - c[0], p[1] - c[1])))); } }); if (far > P.evac) chk.push(['WARN', `Eng uzoq nuqtadan zinagacha ≈ ${far.toFixed(0)} m > ${P.evac} m — yadrolar sonini oshiring`]);
    // pandus: tasmadan ajralib chiqadigan keng pandus — tasma tashqarisida (yopishgan), yerdan tomgacha; tashqi devori yerdan parapetgacha yaxlit yashil (o'sha tasma)
    const rLen = P.Hb / (P.rs / 100), du = rLen / Lp, NR = Math.max(30, Math.ceil(rLen / 1.5)), rIn = [], rOut = [];
    const hx = P.rm ? (() => { const B0 = at(P.ru), d = P.lean + 2 + P.rr + P.rw; return [B0.p[0] + B0.n[0] * d, B0.p[1] + B0.n[1] * d, Math.atan2(-B0.n[1], -B0.n[0])]; })() : null, turns = P.rm ? rLen / (2 * Math.PI * (P.rr + P.rw / 2)) : 0;
    if (hx) { for (let k = 0; k <= NR; k++) { const t = hx[2] + Math.PI + 2 * Math.PI * turns * k / NR, z = P.Hb * k / NR, c = Math.cos(t), s2 = Math.sin(t); rIn.push([hx[0] + c * P.rr, hx[1] + s2 * P.rr, z]); rOut.push([hx[0] + c * (P.rr + P.rw), hx[1] + s2 * (P.rr + P.rw), z]); }
      const core = Array.from({ length: 24 }, (_, q) => [hx[0] + Math.cos(q / 24 * 2 * Math.PI) * 0.8, hx[1] + Math.sin(q / 24 * 2 * Math.PI) * 0.8]); prismPrims(prims, core, 0, P.Hb, COL.white); }
    else for (let k = 0; k <= NR; k++) { const s = k / NR, u = P.ru + du * s, z = P.Hb * Math.pow(s, 1), zb = botZ(u), zt = topZ(u), f = Math.max(0, Math.min(1, (z - zb) / (zt - zb))), d0 = (z < zb ? 0 : leanAt(u, f)) + 0.15 + (du > 0.92 ? (P.rw + 0.6) * du * s : 0);
      // boshlanishida pandus tasmadan ravon uzoqlashadi (ajralish)
      const peel = 3 * (1 - Math.min(1, s / 0.15)); rIn.push([...off(u, d0 + peel), z]); rOut.push([...off(u, d0 + peel + P.rw), z]); }
    for (let k = 0; k < NR; k++) { prims.push({ t: 'q', p: [rIn[k], rIn[k + 1], rOut[k + 1], rOut[k]], c: [.80, .80, .78] }); const o0 = rOut[k], o1 = rOut[k + 1], i0 = rIn[k], i1 = rIn[k + 1];
      prims.push({ t: 'q', p: [[o0[0], o0[1], 0], [o1[0], o1[1], 0], [o1[0], o1[1], o1[2] + 1.3], [o0[0], o0[1], o0[2] + 1.3]], c: PAN.map(v => v * (0.94 + 0.06 * ((k % 3) / 2))) }); // tashqi yashil devor (yerdan)
      prims.push({ t: 'q', p: [[o0[0], o0[1], o0[2]], [o1[0], o1[1], o1[2]], [o1[0], o1[1], o1[2] + 1.3], [o0[0], o0[1], o0[2] + 1.3]].map(q => { const n = at(P.ru).n; return q; }), c: PAN.map(v => v * .9) });
      prims.push({ t: 'q', p: [[i0[0], i0[1], i0[2]], [i1[0], i1[1], i1[2]], [i1[0], i1[1], i1[2] + 1.1], [i0[0], i0[1], i0[2] + 1.1]], c: [.55, .56, .57] }); }
    plan.push({ p: rIn.map(q => [q[0], q[1]]).concat(rOut.map(q => [q[0], q[1]]).reverse()), fill: '#eeeae3', stroke: '#555', w: .8 });
    { const V = [], Tt = []; for (let k = 0; k <= NR; k++) V.push(rIn[k], rOut[k]); for (let k = 0; k < NR; k++) { const o = 2 * k; Tt.push([o, o + 2, o + 3], [o, o + 3, o + 1]); } ifc.push({ cls: 'IfcRamp', name: 'Tashqi pandus (tomga)', desc: `${rLen.toFixed(0)} m, ${P.rs} %`, pt: P.rm ? '.SPIRAL_RAMP.' : '.NOTDEFINED.', tess: { V, T: Tt } }); }
    chk.push(['INFO', `Pandus: ${rLen.toFixed(0)} m, nishab ${P.rs} % (${P.Hb} m ga) — ${P.rm ? 'vintsimon minora, ' + turns.toFixed(1) + ' aylanish, Ø ' + (2 * (P.rr + P.rw)).toFixed(0) + ' m' : 'tasma bo‘ylab perimetrning ' + Math.round(du * 100) + ' % i'}; oraliq maydonchalar (har ~9 m) hisobga olinmagan`]);
    if (!P.rm && du > 0.92) chk.push(['INFO', `Pandus ${Math.ceil(du)} aylanishli — nishabni oshiring yoki rm = 1`]);
    // qoplama va vitraj IFC (tess)
    { const V = [], Tt = []; const N2 = 240; for (let k = 0; k <= N2; k++) { const u = k / N2, A = off(u, 0), B = off(u, leanAt(u, 1)); V.push([A[0], A[1], botZ(u)], [B[0], B[1], topZ(u)]); } for (let k = 0; k < N2; k++) { const o = 2 * k; Tt.push([o, o + 2, o + 3], [o, o + 3, o + 1]); } ifc.push({ cls: 'IfcCovering', name: 'Teshikli keramik qoplama (tasma)', desc: `${Math.round(clad)} m2, teshiklar ${Math.round(holes / clad * 100)} %`, pt: '.CLADDING.', tess: { V, T: Tt } }); }
    { const V = [], Tt = []; gl.forEach(q => V.push([q[0], q[1], 0], [q[0], q[1], P.gH])); for (let k = 0; k < gl.length; k++) { const o = 2 * k, o2 = 2 * ((k + 1) % gl.length); Tt.push([o, o2, o2 + 1], [o, o2 + 1, o + 1]); } ifc.push({ cls: 'IfcCurtainWall', name: '1-qavat vitraji', tess: { V, T: Tt } }); }
    // konsol osti (soffit)
    for (let q = 0; q < 200; q++) { const u0 = q / 200, u1 = (q + 1) / 200, A1 = off(u0, -sbAt(u0)), A2 = off(u1, -sbAt(u1)), B1 = off(u0, 0), B2 = off(u1, 0); prims.push({ t: 'q', p: [[A1[0], A1[1], P.gH], [A2[0], A2[1], P.gH], [B2[0], B2[1], Math.min(P.gH, botZ(u1))], [B1[0], B1[1], Math.min(P.gH, botZ(u0))]], c: [.90, .90, .88] }); }
    // landshaft: ko'l (−y tomonda) va daraxtlar
    const pip = (pt, L) => { let c = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const a1 = L[i], b1 = L[j]; if ((a1[1] > pt[1]) !== (b1[1] > pt[1]) && pt[0] < (b1[0] - a1[0]) * (pt[1] - a1[1]) / (b1[1] - a1[1]) + a1[0]) c = !c; } return c; };
    let lake = null, lakeA = 0; if (P.lake) { const cy = -(b + 0.38 * P.W + 14); lake = Array.from({ length: 72 }, (_, q) => { const t = 2 * Math.PI * q / 72, r = 1 + 0.08 * Math.sin(3 * t + P.seed) + 0.05 * Math.cos(5 * t); return [0.6 * P.L * r * Math.cos(t), cy + 0.32 * P.W * r * Math.sin(t)]; }); lakeA = Math.abs(loopArea(lake));
      prismPrims(prims, lake, -0.6, 0.01, [.40, .58, .66], { side: [.55, .55, .52] }); plan.push({ p: lake, fill: '#cfe3ea', stroke: '#4a7d92', w: 1 }); ifc.push({ cls: 'IfcGeographicElement', name: 'Ko‘l', desc: Math.round(lakeA) + ' m2', pt: '.TERRAIN.', extr: { p: lake, z0: -0.6, h: 0.6 } }); }
    const big = Array.from({ length: 80 }, (_, q) => off(q / 80, 8 + P.leanP + (P.rm ? 0 : P.rw + 4))), tr = []; let tries = 0;
    while (tr.length < P.trees && tries++ < P.trees * 40) { const x = (rnd() * 2 - 1) * 0.95 * P.L, y = -(b + 0.75 * P.W + 14) + rnd() * (2 * b + 1.2 * P.W + 14), pt = [x, y]; if (pip(pt, big) || (lake && pip(pt, lake.map(q => [q[0] * 1.08, (q[1] - lake[0][1]) * 1.15 + lake[0][1]]))) || (hx && Math.hypot(x - hx[0], y - hx[1]) < P.rr + P.rw + 4) || tr.some(t => Math.hypot(t[0] - x, t[1] - y) < 6)) continue; tr.push(pt); }
    tr.forEach(t => { const r = 2.0 + rnd() * 1.2, h = 3 + r * 1.6, cn = Array.from({ length: 8 }, (_, q) => [t[0] + r * Math.cos(q * Math.PI / 4), t[1] + r * Math.sin(q * Math.PI / 4)]), tk = [[t[0] - .15, t[1] - .15], [t[0] + .15, t[1] - .15], [t[0] + .15, t[1] + .15], [t[0] - .15, t[1] + .15]]; prismPrims(prims, tk, 0, 3, COL.wood); prismPrims(prims, cn, 3, h, COL.plant, { bot: true }); plan.push({ p: cn, fill: '#dfe9d6', stroke: '#6b8f5a', w: .6 }); });
    plan.push({ p: Array.from({ length: 240 }, (_, q) => off(q / 240, 0)), fill: 'none', stroke: '#141414', w: 2.2, hit: true });
    const foot = Math.abs(loopArea(raw)), maxCant = sbAt(0) + leanAt(0, 1);
    const table = { title: 'Lenta (ko‘rgazma binosi): ko‘rsatkichlar', rows: [['O‘lcham', `${P.L} × ${P.W} m, tom ${P.Hb} m, tasma ${(P.gH - P.Hl).toFixed(1)}–${(P.Hb + 1.2 + P.Ha).toFixed(1)} m`], ['Tagi', Math.round(foot).toLocaleString('ru') + ' m²'], ['Konsol', `${P.sb} m, tumshuqda ${maxCant.toFixed(1)} m (vitrajdan tasma tepasigacha)`], ['Qoplama', `${Math.round(clad).toLocaleString('ru')} m², ${nP.toLocaleString('ru')} panel (${P.pw} × ${P.phh} m)`], ['Teshiklar', Math.round(holes / Math.max(1, clad) * 100) + ' % (yorug‘lik va havo o‘tadi)'], ['Pandus', `${rLen.toFixed(0)} m, ${P.rs} %, eni ${P.rw} m → tom terrasasi`], ['Qavatlar', floors.map(F => (F.k + 1) + ': ' + F.area.toLocaleString('ru') + ' m²').join(' · ')], ['Umumiy maydon', Math.round(gfa).toLocaleString('ru') + ' m²'], ['Zinagacha eng uzoq', far.toFixed(0) + ' m'], ['Landshaft', (lake ? 'ko‘l ' + Math.round(lakeA).toLocaleString('ru') + ' m², ' : '') + tr.length + ' daraxt']] };
    if (maxCant > 8) chk.push(['INFO', `Tumshuq konsoli ≈ ${maxCant.toFixed(1)} m — konstruktiv yechim (ferma / po‘lat karkas) kerak`]);
    return { e, P, kind: 'lenta', T, prims, plan, floors, ifc, table, checks: chk, H: P.Hb + 1.2 + P.Ha, gfa: Math.round(gfa), foot: Math.round(foot), base: raw.filter((_, q) => q % 8 === 0).map(q => T([q[0], q[1], 0])), label: `lenta · ${floors.length} qavat · ${Math.round(gfa).toLocaleString('ru')} m²`, metrics: [['Umumiy maydon', Math.round(gfa).toLocaleString('ru') + ' m²'], ['Qoplama', Math.round(clad).toLocaleString('ru') + ' m²'], ['Pandus', rLen.toFixed(0) + ' m']] }; } };

// ---------- Agent javobini tozalash (rasm → model): topologiyani saqlab rasm siyohiga moslash
// 1) tugunlar va T-tutashuvlarni aniqlash (≤ tol); 2) har devor chizig'i siyohdan (o'q markazi — PCA, qalinlik — mediana); 3) to'g'ri burchak (asosiy yo'nalish ±4°);
// 4) tugunlarni qayta hisoblash: tugundagi chiziqlar kesishmasi (eng kichik kvadratlar), T-uch — o'z chizig'i × tayanch devor chizig'i; 5) teshik bo'shliqlarini yopish, osilgan uchlarni uzaytirish; 6) tur — o'lchangan qalinlik bo'yicha
// lines — DSL qatorlari (metr); opt.ink = { w, h, gray: Uint8Array (0 qora … 255 oq), toImg: p(mm) → {x,y} px, mmpx }
function planCleanup(lines, opt) {
  lines = lines.slice(); opt = opt || {}; const info = { walls: 0, ink: 0, retype: 0, ortho: 0, nodes: 0, tee: 0, bridge: 0, extend: 0, noInk: [], types: [] };
  const num = s => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(s), P = s => { const [x, y] = s.split(',').map(Number); return { x: x * 1000, y: y * 1000 }; }, f3 = v => String(+(v / 1000).toFixed(3)), S = p => f3(Math.round(p.x)) + ',' + f3(Math.round(p.y));
  const segs = [];
  lines.forEach((ln, i) => { const t = ln.trim().split(/\s+/); if (t[0] !== 'wall' || !TYPES.wall[t[1]] && !lines.some(l => new RegExp('^walltype\\s+' + t[1] + '\\s').test(l.trim()))) return;
    const pts = [], rest = []; let arc = null; t.slice(2).forEach(x => { if (num(x)) pts.push(P(x)); else if (/^arc=/.test(x)) arc = x; else rest.push(x); });
    if (pts.length < 2 || t.slice(2).some(x => !num(x) && !/=/.test(x) && !/^(L\d+|all)$/i.test(x))) return; // tugun nomlari (А1) — tegmaymiz
    const lv = rest.find(x => /^(L\d+|all)$/i.test(x)) || 'L1', o2 = rest.filter(x => x !== lv && !/^ref=/.test(x)), tt = TYPES.wall[t[1]] ? thick(t[1]) : (+((lines.find(l => new RegExp('^walltype\\s+' + t[1] + '\\s').test(l.trim())) || '').match(/:(\d+):/) || [0, 200])[1]);
    for (let k = 0; k + 1 < pts.length; k++) segs.push({ i, type: t[1], a: pts[k], b: pts[k + 1], lv, o2, arc: pts.length === 2 ? arc : null, t: tt }); });
  info.walls = segs.length; const st = segs.filter(s => !s.arc && V.len(V.sub(s.b, s.a)) > 1);
  const dir = s => V.unit(V.sub(s.b, s.a)), tolOf = (s1, s2) => Math.max(opt.tol || 300, (s1.tm || s1.t) * 0.8, (s2.tm || s2.t) * 0.8);
  // 1) topologiya
  const E = []; st.forEach(s => { E.push({ s, k: 'a' }, { s, k: 'b' }); }); const par = E.map((_, i) => i), fd = i => par[i] === i ? i : (par[i] = fd(par[i]));
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) { if (E[i].s === E[j].s) continue; const p = E[i].s[E[i].k], q = E[j].s[E[j].k]; if (V.len(V.sub(p, q)) <= tolOf(E[i].s, E[j].s)) { const a = fd(i), b = fd(j); if (a !== b) { par[a] = b; if (V.len(V.sub(p, q)) > 1) info.nodes++; } } }
  const grp = new Map(); E.forEach((e, i) => { const r = fd(i); if (!grp.has(r)) grp.set(r, []); grp.get(r).push(e); });
  E.forEach(e => { e.g = null; }); grp.forEach(G => G.forEach(e => { e.g = G; }));
  const onSeg = (p, h, e) => { const uh = dir(h), Lh = V.len(V.sub(h.b, h.a)), tp = V.dot(V.sub(p, h.a), uh); return tp > -e && tp < Lh + e && Math.abs(V.cross(uh, V.sub(p, h.a))) < e; };
  E.forEach(e => { if (e.g.length > 1 && e.g.some(f => f.s !== e.s && Math.abs(V.cross(dir(f.s), dir(e.s))) > 0.3)) return; const p = e.s[e.k], u = dir(e.s); let best = null;
    st.forEach(h => { if (h === e.s || e.g.some(f => f.s === h)) return; const tol = tolOf(e.s, h), uh = dir(h); if (Math.abs(V.cross(u, uh)) < 0.3 || !onSeg(p, h, tol)) return; const d = Math.abs(V.cross(uh, V.sub(p, h.a))); if (!best || d < best.d) best = { h, d }; });
    if (best) { e.T = best.h; info.tee++; } });
  // 2) siyoh: har devor uchun yangi chiziq (m, v) va qalinlik
  st.forEach(s => { s.m = V.mul(V.add(s.a, s.b), 0.5); s.v = dir(s); });
  const ink = opt.ink; if (ink) { const g = ink.gray, W = ink.w, H = ink.h, px = ink.mmpx; // qora chegarasi: rasmdagi eng to'q 2 % + 50 (40…120) — devor quyuq, ingichka kulrang chiziqlar (deraza, o'lcham) hisobga kirmaydi
    const hs = new Uint32Array(256); for (let i = 0; i < g.length; i += 7) hs[g[i]]++; let cum = 0, tot = Math.ceil(g.length / 7), p2 = 0; for (let v = 0; v < 256; v++) { cum += hs[v]; if (cum >= tot * 0.02) { p2 = v; break; } } const thr = Math.max(40, Math.min(120, p2 + 50)); info.thr = thr;
    const dark = (x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < W && y < H && g[y * W + x] < thr; };
    st.forEach(s => { const L = V.len(V.sub(s.b, s.a)), u = s.v, n = { x: -u.y, y: u.x }, N = Math.max(3, Math.min(40, Math.round(L / 300))), R = Math.max(450, s.t * 1.2), C = [], Wd = [];
      for (let k = 1; k < N; k++) { const q = V.add(s.a, V.mul(u, L * (0.1 + 0.8 * k / N))); const prof = []; for (let d = -R; d <= R; d += px / 2) { const p = ink.toImg(V.add(q, V.mul(n, d))); prof.push([d, dark(p.x, p.y)]); }
        const runs = []; let r0 = null; prof.forEach(([d, on], j) => { if (on && r0 == null) r0 = d; if ((!on || j === prof.length - 1) && r0 != null) { runs.push([r0, on ? d : d - px / 2]); r0 = null; } });
        if (!runs.length) continue; const best = runs.reduce((m, r) => { const c = (r[0] + r[1]) / 2; return !m || Math.abs(c) < Math.abs((m[0] + m[1]) / 2) ? r : m; }, null), c = (best[0] + best[1]) / 2, w = best[1] - best[0] + px;
        if (Math.abs(c) > R * 0.85 || w > 900 || best[0] === -R || best[1] >= R - px) continue; C.push(V.add(q, V.mul(n, c))); Wd.push(w); }
      if (C.length < Math.max(2, (N - 1) * 0.45)) { if (!(TYPES.wall[s.type] && TYPES.wall[s.type].glass)) info.noInk.push(S(s.a) + ' → ' + S(s.b)); s.noInk = true; return; }
      const m = C.reduce((a, p) => ({ x: a.x + p.x / C.length, y: a.y + p.y / C.length }), { x: 0, y: 0 }); let sxx = 0, sxy = 0, syy = 0; C.forEach(p => { const dx = p.x - m.x, dy = p.y - m.y; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; });
      let v = { x: Math.cos(0.5 * Math.atan2(2 * sxy, sxx - syy)), y: Math.sin(0.5 * Math.atan2(2 * sxy, sxx - syy)) }; if (V.dot(v, u) < 0) v = V.mul(v, -1); if (C.length < 4 || Math.abs(V.cross(v, u)) > Math.sin(8 * Math.PI / 180)) v = u;
      if (V.len(V.sub(m, s.m)) > 2 || Math.abs(V.cross(v, u)) > 1e-4) info.ink++; s.m = m; s.v = v; Wd.sort((p, q) => p - q); s.tm = Wd[Math.floor(Wd.length / 2)]; }); }
  // 3) to'g'ri burchak
  if (st.length) { const ang = s => ((Math.atan2(s.v.y, s.v.x) * 180 / Math.PI) % 90 + 90) % 90, len = s => V.len(V.sub(s.b, s.a)), hist = new Map(); st.forEach(s => { const k = Math.round(ang(s) * 2) / 2 % 90; hist.set(k, (hist.get(k) || 0) + len(s)); });
    let a0 = [...hist.entries()].sort((p, q) => q[1] - p[1])[0][0]; { const D = []; st.forEach(s => { let d = ang(s) - a0; if (d > 45) d -= 90; if (d < -45) d += 90; if (Math.abs(d) < 1.5) D.push([d, len(s)]); }); D.sort((p, q) => p[0] - q[0]); const tot = D.reduce((a, q) => a + q[1], 0); let c = 0; for (const [d, w] of D) { c += w; if (c >= tot / 2) { a0 += d; break; } } } // uzunlik bo'yicha mediana
    st.forEach(s => { const a = Math.atan2(s.v.y, s.v.x) * 180 / Math.PI; let d = ((a - a0) % 90 + 90) % 90; if (d > 45) d -= 90; if (Math.abs(d) > 4 || Math.abs(d) < 1e-6) return; const r = -d * Math.PI / 180; s.v = { x: s.v.x * Math.cos(r) - s.v.y * Math.sin(r), y: s.v.x * Math.sin(r) + s.v.y * Math.cos(r) }; info.ortho++; }); }
  // 4) uchlarni qayta hisoblash
  const prj = (s, p) => V.add(s.m, V.mul(s.v, V.dot(V.sub(p, s.m), s.v))), X2 = (s, h) => lineX(s.m, s.v, h.m, h.v);
  const solved = new Map(); grp.forEach(G => { if (G.length < 2) return; const old = G.reduce((a, e) => ({ x: a.x + e.s[e.k].x / G.length, y: a.y + e.s[e.k].y / G.length }), { x: 0, y: 0 });
    let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0; const Ls = [...new Set(G.map(e => e.s))]; Ls.forEach(s => { const n = { x: -s.v.y, y: s.v.x }, c = V.dot(n, s.m); a11 += n.x * n.x; a12 += n.x * n.y; a22 += n.y * n.y; b1 += n.x * c; b2 += n.y * c; });
    const det = a11 * a22 - a12 * a12, ok = Ls.some((s, i) => Ls.some((h, j) => j > i && Math.abs(V.cross(s.v, h.v)) > 0.2)); let X = ok && Math.abs(det) > 1e-9 ? { x: (b1 * a22 - b2 * a12) / det, y: (a11 * b2 - a12 * b1) / det } : null;
    if (!X || V.len(V.sub(X, old)) > 1500) X = Ls.length === 1 ? prj(Ls[0], old) : V.mul(Ls.reduce((a, s) => V.add(a, prj(s, old)), { x: 0, y: 0 }), 1 / Ls.length); G.forEach(e => solved.set(e, X)); });
  E.forEach(e => { let X = solved.get(e); if (!X && e.T) { const Y = X2(e.s, e.T); if (Y && V.len(V.sub(Y, e.s[e.k])) < 1500) X = Y; } if (!X) X = prj(e.s, e.s[e.k]); e.X = X; });
  E.forEach(e => { e.s[e.k] = { x: e.X.x, y: e.X.y }; });
  // 5) teshik bo'shliqlari (bir chiziqdagi ikki bo'lak orasi ≤ 3,5 m va u yerda teshik bor yoki ≤ 1,1 m) — ko'prik; osilgan uch — eng yaqin devorgacha (≤ 1,3 m; teshik bo'lsa ≤ 2,5 m)
  const ops = []; lines.forEach(ln => { const t = ln.trim().split(/\s+/); if ((t[0] === 'window' || t[0] === 'door') && num(t[2] || '')) ops.push(P(t[2])); });
  const linked = (s, k) => { const p = s[k]; return st.some(h => h !== s && (V.len(V.sub(h.a, p)) < 1 || V.len(V.sub(h.b, p)) < 1 || onSeg(p, h, 1))); };
  const opIn = (p, q, w) => ops.some(o => { const u = V.sub(q, p), L = V.len(u); if (L < 1) return false; const v = V.mul(u, 1 / L), tp = V.dot(V.sub(o, p), v); return tp > -200 && tp < L + 200 && Math.abs(V.cross(v, V.sub(o, p))) < w; });
  const add = []; for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) { const s1 = st[i], s2 = st[j], u1 = dir(s1); if (Math.abs(V.cross(u1, dir(s2))) > 0.035 || Math.abs(V.cross(u1, V.sub(s2.a, s1.a))) > tolOf(s1, s2) * 0.6) continue;
    let best = null; ['a', 'b'].forEach(k1 => ['a', 'b'].forEach(k2 => { const p = s1[k1], q = s2[k2], g = V.len(V.sub(q, p)); if (g < 1 || (best && best.g < g)) return; const o1 = k1 === 'a' ? s1.b : s1.a, o2 = k2 === 'a' ? s2.b : s2.a; if (V.dot(V.sub(p, o1), V.sub(q, p)) <= 0 || V.dot(V.sub(q, o2), V.sub(p, q)) <= 0) return; best = { k1, k2, p, q, g }; }));
    if (!best || best.g > 3500 || linked(s1, best.k1) || linked(s2, best.k2) || !(best.g <= 1100 || opIn(best.p, best.q, 600))) continue;
    add.push({ i: s1.i, type: (s1.tm || s1.t) <= (s2.tm || s2.t) ? s1.type : s2.type, a: { ...best.p }, b: { ...best.q }, lv: s1.lv, o2: s1.o2, t: Math.min(s1.t, s2.t), tm: s1.tm && s2.tm ? Math.min(s1.tm, s2.tm) : null }); info.bridge++; }
  add.forEach(s => { segs.push(s); st.push(s); });
  st.forEach(s => ['a', 'b'].forEach(k => { if (linked(s, k)) return; const p = s[k], u = k === 'b' ? dir(s) : V.mul(dir(s), -1); let best = null;
    st.forEach(h => { if (h === s) return; const uh = dir(h); if (Math.abs(V.cross(u, uh)) < 0.3) return; const X = lineX(p, u, h.a, uh); if (!X || !onSeg(X, h, 1)) return; const d = V.dot(V.sub(X, p), u); if (d <= 1) return; if (d > 1300 && !(d <= 2500 && opIn(p, X, 600))) return; if (!best || d < best.d) best = { X, d }; });
    if (best) { s[k] = { x: best.X.x, y: best.X.y }; info.extend++; } }));
  // 6) tur: o'lchangan qalinlik — mavjud turlardan eng yaqini (±20 %), aks holda yangi tur (≥ 180 mm — yuk ko'taruvchi). Shisha (V60) turi o'zgarmaydi
  const newTypes = new Map(); if (ink) st.forEach(s => { if (!s.tm || (TYPES.wall[s.type] && TYPES.wall[s.type].glass)) return; const tm = Math.max(50, Math.round(s.tm / 10) * 10); const cand = Object.keys(TYPES.wall).filter(k => !TYPES.wall[k].glass).map(k => [k, thick(k)]).sort((p, q) => Math.abs(p[1] - tm) - Math.abs(q[1] - tm))[0];
    if (cand && Math.abs(cand[1] - tm) <= Math.max(25, tm * 0.2)) { if (cand[0] !== s.type) { s.type = cand[0]; info.retype++; } return; }
    const r = Math.round(tm / 50) * 50 || 50, nm = 'K' + r; if (!newTypes.has(nm) && !TYPES.wall[nm] && !lines.some(l => new RegExp('^walltype\\s+' + nm + '\\s').test(l.trim()))) newTypes.set(nm, r >= 180 ? `walltype ${nm} bearing Temirbeton:${r}:1.69 uz=Devor_${r}_(rasmdan)` : `walltype ${nm} partition Gazoblok:${r}:0.14 uz=To‘siq_${r}_(rasmdan)`); if (s.type !== nm) { s.type = nm; info.retype++; } });
  // 7) teshik devor bo'lagiga sig'masa (chetlardan 150 mm) — kichikroq tur yoki yangi tur (eni 50 mm ga yaxlitlab, ≥ 600)
  info.opfit = 0; const opRe = new Map(); lines.forEach((ln, i) => { const t = ln.trim().split(/\s+/); if (!(t[0] === 'window' || t[0] === 'door') || !num(t[2] || '')) return; const cat = t[0], TT = TYPES[cat], T0 = TT[t[1]]; if (!T0) return; const p = P(t[2]);
    let h = null, hd = 600;  st.forEach(s => { if (s.lv !== (t[3] || 'L1')) return; const L = V.len(V.sub(s.b, s.a)); if (L < 50) return; const u = dir(s), tp = V.dot(V.sub(p, s.a), u); if (tp < 0 || tp > L) return; const d = Math.abs(V.cross(u, V.sub(p, s.a))); if (d < hd) { hd = d; h = { s, tp, L }; } }); if (!h) return;
    const mg = 120 + Math.max(150, h.s.tm || h.s.t), u = dir(h.s), at = c => S(V.add(h.s.a, V.mul(u, c))) + '';
    if (h.tp - T0.w / 2 >= mg && h.tp + T0.w / 2 <= h.L - mg) return; // sig'adi
    const c0 = Math.max(mg + T0.w / 2, Math.min(h.L - mg - T0.w / 2, h.tp)); if (h.L - 2 * mg >= T0.w && Math.abs(c0 - h.tp) <= 600) { const c = c0; opRe.set(i, [t[0], t[1], at(c)].concat(t.slice(3)).join(' ')); info.opfit++; return; } // surish
    const room = Math.min(h.L - 2 * mg, 2 * Math.min(h.tp, h.L - h.tp) - 2 * mg), alt = Object.entries(TT).filter(([k, q]) => q.w <= room).sort((a, b) => b[1].w - a[1].w)[0], w = Math.floor(room / 50) * 50;
    let nm = null, def = null; if (alt && alt[1].w >= room * 0.75) nm = alt[0]; else if (w >= 600) { nm = (cat === 'window' ? 'OK' : 'DK') + w; def = `${cat === 'window' ? 'wintype' : 'doortype'} ${nm} ${w} ${T0.h}`; } else return;
    if (def && !newTypes.has(nm)) newTypes.set(nm, def); opRe.set(i, [t[0], nm, at(h.tp)].concat(t.slice(3)).join(' ')); info.opfit++; });
  opRe.forEach((v, i) => { lines = lines.slice(); lines[i] = v; });
  info.types = [...newTypes.keys()];
  const out = [...newTypes.values()]; const byI = new Map(); segs.forEach(s => { if (!byI.has(s.i)) byI.set(s.i, []); byI.get(s.i).push(s); });
  lines.forEach((ln, i) => { if (!byI.has(i)) { out.push(ln); return; } byI.get(i).forEach(s => { if (V.len(V.sub(s.b, s.a)) < 50) return; out.push(['wall', s.type, S(s.a), S(s.b)].concat(s.arc ? [s.arc] : [], ['ref=c'], s.o2, [s.lv]).join(' ')); }); });
  return { lines: out, info };
}


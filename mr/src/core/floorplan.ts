/**
 * Seksiya qavat rejasi — SXEMA (Planimetric «Floor plan» darajasida): tashqi devor, markaziy zina-lift yadrosi,
 * oʻrta koridor (ikki tomonlama seksiya), kvartiralar (fasad modullari guruhi × yarim chuqurlik), xona boʻlinmalari,
 * kirishlar, oʻqlar va oʻlcham zanjirlari. Xonalar ichki rejasi emas — hajm bosqichi uchun tekshiruv sxemasi.
 * SVG — mm da, masshtab bilan (1:100 … 1:500).
 */
import polygonClipping, { type Polygon, type MultiPolygon } from 'polygon-clipping';
import { area, obb2, signedArea, type XY } from './geo';
import { MOD_W, aptArea, sectionFrame, type SecPlan } from './apartments';
import { insetRing } from './tiers';

export const APT_FILL: Record<number, string> = { 1: '#f6d58f', 2: '#f4b08a', 3: '#9bd3b8', 4: '#8fa5cc' };
export interface PlanOpts { scale: number; /** oʻqlar va oʻlchamlar */ dims: boolean; title: string; floor: number }
export interface PlanResult { svg: string; widthMm: number; heightMm: number; apts: { rooms: number; area: number; ring: XY[] }[]; core: XY[]; corridor: XY[]; kind: 'seksiya' | 'koridor' }

const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
export const ROOM_NAMES: Record<string, string> = { M: 'mehmonxona', Y: 'yotoqxona', O: 'oshxona', S: 'sanuzel + dahliz' };
const openR = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]]);
const n1 = (v: number) => (Math.round(v * 100) / 100).toString().replace('.', ',');

export interface PlanApt { rooms: number; area: number; ring: XY[]; mods: number[]; forced?: boolean; entry: XY; /** xonalar: modul boʻyicha tur (M — mehmonxona, Y — yotoqxona, O — oshxona) */ roomOf: Record<number, 'M' | 'Y' | 'O'>; /** sanuzel + dahliz zonasi (kirish yonida) */ wet: XY[] }
export interface PlanGeo { kind: 'seksiya' | 'koridor'; core: XY[]; lobby: XY[]; corridor: XY[]; apts: PlanApt[]; /** kvartiralarga kirmagan ichki qism (ombor, texnik) */ rest: XY[][] }

const lerp = (a: XY, b: XY, t: number): XY => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** nuqtadan toʻrtburchak (halqa) chegarasidagi eng yaqin nuqta */
function nearestOnRing(p: XY, r: XY[]): XY {
  let best: XY = r[0], bd = Infinity;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), q: XY = [a[0] + t * dx, a[1] + t * dy], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
const largest = (mp: MultiPolygon): XY[] => { let best: XY[] = [], ba = 0; for (const pp of mp) { const q = openR(pp[0]); const ar = area(q); if (ar > ba) { ba = ar; best = q; } } return best; };

/**
 * Reja geometriyasi (mahalliy metrda). Ikki tur:
 *  · seksiya (odatiy koʻp kvartirali uy, qavatda ≤ 8 kvartira): zina-lift yadrosi «orqa» fasadga yopishgan (zinaga deraza),
 *    oldida maydoncha; har kvartira fasaddan maydonchaga qarab «boʻlak» — qoʻshni kvartiralar chegarasi fasaddagi boʻlinish
 *    nuqtasidan maydonchaning eng yaqin nuqtasiga; har kvartira maydonchaga kiradi;
 *  · koridor (uzun seksiya, > 8 kvartira yoki L > 42 m): oʻrta koridor, yadro markazda, kvartiralar — tasmalar.
 * Xonalar: fasad modullari — mehmonxona (kirishga eng yaqin katta modul) va yotoqxonalar; oshxona — kirish yonidagi modul;
 * sanuzel + dahliz — kirish oldidagi ichki zona (~2,2 m). Sxema, ishchi chizma emas.
 */
export function planGeometry(pl: SecPlan, blindAt: (p: XY) => boolean = () => false): PlanGeo {
  const r = signedArea(pl.ring) < 0 ? [...pl.ring].reverse() : pl.ring, ringP: Polygon = [close(r)];
  const F = sectionFrame(r, blindAt), { S, u0, u1, v0, v1, um, vm, back, cw, cd, P } = F;
  const apts0 = pl.layout.apts, mods = pl.layout.mods;
  const corridorKind = F.corridor || apts0.length > 8;
  let core: XY[], lobby: XY[], corridor: XY[] = [];
  if (corridorKind) {
    core = [P(um - cw / 2, vm - cd / 2), P(um + cw / 2, vm - cd / 2), P(um + cw / 2, vm + cd / 2), P(um - cw / 2, vm + cd / 2)];
    const kw = 1.6; corridor = [P(u0 + 0.6, vm - kw / 2), P(u1 - 0.6, vm - kw / 2), P(u1 - 0.6, vm + kw / 2), P(u0 + 0.6, vm + kw / 2)];
    lobby = corridor;
  } else {
    const vb = back > 0 ? v1 - 0.3 : v0 + 0.3, vIn = vb - back * cd;            // yadro fasadga yopishgan
    core = [P(um - cw / 2, vb), P(um + cw / 2, vb), P(um + cw / 2, vIn), P(um - cw / 2, vIn)];
    const lw = Math.min(cw, 5.4), ld = Math.min(3.6, Math.max(2.4, S * 0.25)), vL = vIn - back * ld;   // maydoncha yadro oldida
    lobby = [P(um - lw / 2, vIn), P(um + lw / 2, vIn), P(um + lw / 2, vL), P(um - lw / 2, vL)];
    // 4 tadan koʻp kvartira yoki murakkab (L) shakl — oʻrta chiziq boʻylab koridor: seksiya konturini (yarim chuqurlik − 0,75) ga cheginish
    if (apts0.length > 4 || r.length > 4) { const sp = insetRing(r, pl.halfDepth - 0.75, undefined, 4); if (sp && area(sp) > 4) corridor = sp; }
    // maydoncha koridorgacha choʻziladi (ulanish)
    if (corridor.length) { const vs = corridor.map(p => p[0] * F.V[0] + p[1] * F.V[1]), near = back > 0 ? Math.max(...vs) : Math.min(...vs); if (Math.abs(near - vIn) < 8 && (back > 0 ? near < vIn : near > vIn)) lobby = [P(um - lw / 2, vIn), P(um + lw / 2, vIn), P(um + lw / 2, near), P(um - lw / 2, near)]; }
  }
  const cut: Polygon[] = [[close(core)], [close(lobby)], ...(corridor.length && !corridorKind ? [[close(corridor)] as Polygon] : [])];
  const access: XY[][] = corridor.length ? [lobby, corridor] : [lobby];

  const taken: Polygon[] = [];
  const apts: PlanApt[] = apts0.map(a => {
    const first = mods[a.mods[0]], last = mods[a.mods[a.mods.length - 1]];
    let ring: XY[] = [];
    {
      // modul tasmalari fasaddan oʻrta chiziqqacha (yarim chuqurlik); burchakda ikki tasma birlashadi (L shakl)
      const strips: Polygon[] = a.mods.map(mi => { const m = mods[mi], dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, d = pl.halfDepth; return [close([m.a, m.b, [m.b[0] + nx * d, m.b[1] + ny * d], [m.a[0] + nx * d, m.a[1] + ny * d]])]; });
      try { const u = strips.length > 1 ? polygonClipping.union(strips[0], ...strips.slice(1)) : [strips[0]]; const subs = [...cut, ...taken]; ring = largest(polygonClipping.difference(polygonClipping.intersection(u, ringP), subs[0], ...subs.slice(1))); } catch { ring = []; }
    }
    void first; void last;
    if (ring.length >= 3) taken.push([close(ring)]);
    const c: XY = ring.length ? [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length] : [0, 0];
    let entry: XY = c;   // kvartira chegarasida, maydoncha/koridorga eng yaqin nuqta
    if (ring.length) { let bd = Infinity; for (const ar of access) for (let i = 0; i < ar.length; i++) { const v = ar[i], w = ar[(i + 1) % ar.length]; for (const t of [0, 0.25, 0.5, 0.75]) { const q0 = lerp(v, w, t), q = nearestOnRing(q0, ring), d = Math.hypot(q[0] - q0[0], q[1] - q0[1]); if (d < bd) { bd = d; entry = q; } } } }
    // xonalar: oshxona — kirishga eng yaqin modul; mehmonxona — qolganlardan kirishga eng yaqini; qolgani yotoqxona
    const dist = (mi: number) => { const m = mods[mi]; return Math.hypot((m.a[0] + m.b[0]) / 2 - entry[0], (m.a[1] + m.b[1]) / 2 - entry[1]); };
    const order = [...a.mods].sort((x, y) => dist(x) - dist(y)), roomOf: PlanApt['roomOf'] = {};
    const kitchen = order.find(mi => !a.living.includes(mi)) ?? order[0];
    roomOf[kitchen] = 'O';
    const liv = order.filter(mi => mi !== kitchen); if (liv.length) roomOf[liv[0]] = 'M'; liv.slice(1).forEach(mi => { roomOf[mi] = 'Y'; });
    // sanuzel + dahliz: kirish oldida 2,2 × 3 m (kvartira ichida)
    let wet: XY[] = [];
    if (ring.length) {
      // kirish turgan devor boʻylab (devorga parallel), ichkariga 2,2 m
      let ei = 0, bd = Infinity;
      for (let i = 0; i < ring.length; i++) { const a2 = ring[i], b2 = ring[(i + 1) % ring.length], dx = b2[0] - a2[0], dy = b2[1] - a2[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((entry[0] - a2[0]) * dx + (entry[1] - a2[1]) * dy) / L2)), d = Math.hypot(a2[0] + t * dx - entry[0], a2[1] + t * dy - entry[1]); if (d < bd) { bd = d; ei = i; } }
      const a2 = ring[ei], b2 = ring[(ei + 1) % ring.length], tl = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1, tx = (b2[0] - a2[0]) / tl, ty = (b2[1] - a2[1]) / tl;
      let nx = -ty, ny = tx; if ((c[0] - entry[0]) * nx + (c[1] - entry[1]) * ny < 0) { nx = -nx; ny = -ny; }
      const w = 1.5, d = 2.2, z: XY[] = [[entry[0] - tx * w, entry[1] - ty * w], [entry[0] + tx * w, entry[1] + ty * w], [entry[0] + tx * w + nx * d, entry[1] + ty * w + ny * d], [entry[0] - tx * w + nx * d, entry[1] - ty * w + ny * d]];
      try { wet = largest(polygonClipping.intersection([close(z)], [close(ring)])); } catch { wet = []; }
    }
    return { rooms: a.rooms, area: aptArea(a.mods.length, pl.halfDepth), ring, mods: a.mods, forced: a.forced, entry, roomOf, wet };
  }).filter(a => a.ring.length);
  // kvartira maydoni — rejadagi haqiqiy koʻpburchak boʻyicha (sxema), netto 0,85
  for (const a of apts) a.area = area(a.ring) * 0.85;
  let rest: XY[][] = [];
  try { const subs = [...cut, ...taken]; rest = polygonClipping.difference(ringP, subs[0], ...subs.slice(1)).map(pp => openR(pp[0])).filter(q => area(q) > 2); } catch { rest = []; }
  return { kind: corridorKind ? 'koridor' : 'seksiya', core, lobby, corridor, apts, rest };
}

export function floorPlanSvg(pl0: SecPlan, o: PlanOpts): PlanResult {
  // chizma OBB oʻqlariga buriladi: uzun tomon gorizontal (oʻlcham zanjirlari va oʻqlar toʻgʻri)
  const { U } = obb2(pl0.ring), V: XY = [-U[1], U[0]], T = (p: XY): XY => [p[0] * U[0] + p[1] * U[1], p[0] * V[0] + p[1] * V[1]];
  const pl: SecPlan = { ...pl0, ring: pl0.ring.map(T), layout: { mods: pl0.layout.mods.map(m => ({ ...m, a: T(m.a), b: T(m.b), p: T(m.p) })), apts: pl0.layout.apts } };
  const northDeg = Math.atan2(U[0], U[1]) * 180 / Math.PI;   // shimol yoʻnalishi chizmada (soat strelkasi boʻyicha, 0 — yuqoriga)
  // berk fasadlar — modullar belgisidan (orqa tomonni aniqlash uchun)
  const blindAt = (p: XY) => pl.layout.mods.some(m => m.blind && Math.hypot((m.a[0] + m.b[0]) / 2 - p[0], (m.a[1] + m.b[1]) / 2 - p[1]) < 3);
  const G = planGeometry(pl, blindAt), r = pl.ring, k = 1000 / o.scale;   // m → mm
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of r) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const pad = o.dims ? 28 : 8, W = (x1 - x0) * k + 2 * pad + 10, H = (y1 - y0) * k + 2 * pad + 16;
  const X = (x: number) => ((x - x0) * k + pad + 5).toFixed(2), Y = (y: number) => ((y1 - y) * k + pad + 12).toFixed(2);
  const path = (ring: XY[]) => ring.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])} ${Y(p[1])}`).join('') + 'Z';
  const out: string[] = [];
  out.push(`<defs><pattern id="hatch" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V1.4" stroke="#b9b5ab" stroke-width="0.3"/></pattern></defs>`);
  out.push(`<rect x="0" y="0" width="${W.toFixed(1)}" height="${H.toFixed(1)}" fill="#fff"/>`);
  out.push(`<text x="${pad + 5}" y="9" font-size="4.2" font-weight="600" fill="#141414">${esc(o.title)}</text>`);
  // kvartiralar
  for (const a of G.apts) {
    out.push(`<path d="${path(a.ring)}" fill="${APT_FILL[Math.min(4, a.rooms)]}" stroke="#141414" stroke-width="0.5" stroke-linejoin="round"${a.forced ? ' stroke-dasharray="1.2 0.8"' : ''}/>`);
    // xona boʻlinmalari: modullar orasida ichkariga (yarim chuqurlikning 55 %); xona turi harfi
    for (let j = 0; j < a.mods.length; j++) {
      const m = pl.layout.mods[a.mods[j]], dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, d = pl.halfDepth * 0.55;
      if (j) { const pm = pl.layout.mods[a.mods[j - 1]]; if (Math.hypot(m.a[0] - pm.b[0], m.a[1] - pm.b[1]) < 0.05) out.push(`<path d="M${X(m.a[0])} ${Y(m.a[1])}L${X(m.a[0] + nx * d)} ${Y(m.a[1] + ny * d)}" stroke="#141414" stroke-width="0.25" stroke-dasharray="0.8 0.6"/>`); }
      const t = a.roomOf[a.mods[j]]; if (t) { const cx = (m.a[0] + m.b[0]) / 2 + nx * d * 0.45, cy = (m.a[1] + m.b[1]) / 2 + ny * d * 0.45; out.push(`<text x="${X(cx)}" y="${Y(cy)}" font-size="1.9" text-anchor="middle" fill="#3a3936">${t}</text>`); }
    }
    if (a.wet.length) out.push(`<path d="${path(a.wet)}" fill="rgba(255,255,255,.55)" stroke="#141414" stroke-width="0.25" stroke-dasharray="0.6 0.5"/><text x="${X(a.wet.reduce((s, p) => s + p[0], 0) / a.wet.length)}" y="${(Number(Y(a.wet.reduce((s, p) => s + p[1], 0) / a.wet.length)) + 0.6).toFixed(2)}" font-size="1.6" text-anchor="middle" fill="#3a3936">S</text>`);
    const c = a.ring.reduce((s, p) => [s[0] + p[0], s[1] + p[1]] as XY, [0, 0]).map(x => x / a.ring.length);
    out.push(`<text x="${X(c[0])}" y="${Y(c[1])}" font-size="2.6" font-weight="600" text-anchor="middle" fill="#141414">${a.rooms}x</text><text x="${X(c[0])}" y="${(Number(Y(c[1])) + 3.2).toFixed(2)}" font-size="2.1" text-anchor="middle" fill="#3a3936">${n1(Math.round(a.area))} m²</text>`);
    // kirish eshigi — maydoncha tomondan
    out.push(`<circle cx="${X(a.entry[0])}" cy="${Y(a.entry[1])}" r="0.9" fill="#fff" stroke="#141414" stroke-width="0.3"/>`);
  }
  // qolgan ichki qism — ombor / texnik (shtrix)
  for (const q of G.rest) { const cc = q.reduce((s, p) => [s[0] + p[0], s[1] + p[1]] as XY, [0, 0]).map(x => x / q.length); out.push(`<path d="${path(q)}" fill="url(#hatch)" stroke="#141414" stroke-width="0.3"/>`); if (area(q) > 8) out.push(`<text x="${X(cc[0])}" y="${Y(cc[1])}" font-size="1.8" text-anchor="middle" fill="#6b6965">ombor / texnik</text>`); }
  // maydoncha / koridor va yadro
  out.push(`<path d="${path(G.lobby)}" fill="#f1efea" stroke="#141414" stroke-width="0.3"/>`);
  if (G.corridor.length) out.push(`<path d="${path(G.corridor)}" fill="#f1efea" stroke="#141414" stroke-width="0.3"/>`);
  out.push(`<path d="${path(G.core)}" fill="#cfcac1" stroke="#141414" stroke-width="0.5"/>`);
  { // zina (chap yarmi) va lift (oʻng yarmi)
    const c = G.core;
    for (let i = 1; i < 8; i++) { const t = i / 16; out.push(`<path d="M${X(lerp(c[0], c[1], t)[0])} ${Y(lerp(c[0], c[1], t)[1])}L${X(lerp(c[3], c[2], t)[0])} ${Y(lerp(c[3], c[2], t)[1])}" stroke="#141414" stroke-width="0.2"/>`); }
    const l0 = lerp(c[0], c[1], 0.56), l1 = lerp(c[0], c[1], 0.98), l2 = lerp(c[3], c[2], 0.98), l3 = lerp(c[3], c[2], 0.56);
    out.push(`<path d="M${X(l0[0])} ${Y(l0[1])}L${X(l1[0])} ${Y(l1[1])}L${X(l2[0])} ${Y(l2[1])}L${X(l3[0])} ${Y(l3[1])}Z M${X(l0[0])} ${Y(l0[1])}L${X(l2[0])} ${Y(l2[1])} M${X(l1[0])} ${Y(l1[1])}L${X(l3[0])} ${Y(l3[1])}" fill="none" stroke="#141414" stroke-width="0.25"/>`);
    const cc = c.reduce((s, p) => [s[0] + p[0], s[1] + p[1]] as XY, [0, 0]); out.push(`<text x="${X(cc[0] / 4)}" y="${(Number(Y(cc[1] / 4)) + 0.7).toFixed(2)}" font-size="1.6" text-anchor="middle" fill="#141414">zina · lift</text>`);
  }
  // tashqi devor
  out.push(`<path d="${path(r)}" fill="none" stroke="#141414" stroke-width="1.1" stroke-linejoin="miter"/>`);
  // derazalar: har modul oʻrtasida fasadda 1,6 m li belgi
  const used = new Set(G.apts.flatMap(a => a.mods));
  pl.layout.mods.forEach((m, i) => { if (!used.has(i) || m.blind) return; const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, w = Math.min(1.6, l * 0.5), c: XY = [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], ux = dx / l * w / 2, uy = dy / l * w / 2;
    out.push(`<path d="M${X(c[0] - ux)} ${Y(c[1] - uy)}L${X(c[0] + ux)} ${Y(c[1] + uy)}" stroke="#fff" stroke-width="0.9"/><path d="M${X(c[0] - ux)} ${Y(c[1] - uy)}L${X(c[0] + ux)} ${Y(c[1] + uy)}" stroke="#141414" stroke-width="0.25"/>`); });
  // oʻqlar va oʻlchamlar: OBB boʻyicha, pastda — modullar, chapda — chuqurlik
  if (o.dims) {
    const { U, L, S } = obb2(r), V: XY = [-U[1], U[0]];
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of r) { const u = p[0] * U[0] + p[1] * U[1], v = p[0] * V[0] + p[1] * V[1]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const yb = (H - 6).toFixed(1), xl = (pad - 14).toFixed(1);
    // uzunlik zanjiri (pastda): modul chegaralari (u koordinatasi boʻyicha, eng uzun fasad modullari)
    const long = pl.layout.mods.filter(m => Math.abs((m.b[0] - m.a[0]) * U[0] + (m.b[1] - m.a[1]) * U[1]) > Math.abs((m.b[0] - m.a[0]) * V[0] + (m.b[1] - m.a[1]) * V[1]));
    const us = [...new Set(long.flatMap(m => [m.a, m.b]).map(p => Math.round((p[0] * U[0] + p[1] * U[1]) * 100) / 100))].sort((a, b) => a - b);
    const xu = (u: number) => ((u - u0) * k + pad + 5).toFixed(2);   // chizma OBB ga burilgan: u = x
    out.push(`<path d="M${xu(u0)} ${yb}H${xu(u1)}" stroke="#141414" stroke-width="0.25"/>`);
    let prev = us[0] ?? u0;
    for (const u of us) { out.push(`<path d="M${xu(u)} ${(Number(yb) - 1.5).toFixed(1)}v3" stroke="#141414" stroke-width="0.25"/>`); if (u - prev > 0.5) out.push(`<text x="${((Number(xu(u)) + Number(xu(prev))) / 2).toFixed(2)}" y="${(Number(yb) - 1.2).toFixed(1)}" font-size="1.9" text-anchor="middle" fill="#141414">${n1(u - prev)}</text>`); prev = u; }
    out.push(`<text x="${((Number(xu(u0)) + Number(xu(u1))) / 2).toFixed(2)}" y="${(Number(yb) + 4).toFixed(1)}" font-size="2.2" font-weight="600" text-anchor="middle" fill="#141414">${n1(L)} m</text>`);
    // oʻqlar: aylana belgilar modul chegaralarida
    us.forEach((u, i) => { out.push(`<circle cx="${xu(u)}" cy="${(Number(yb) + 9).toFixed(1)}" r="2" fill="#fff" stroke="#141414" stroke-width="0.25"/><text x="${xu(u)}" y="${(Number(yb) + 9.7).toFixed(1)}" font-size="1.8" text-anchor="middle" fill="#141414">${i + 1}</text>`); });
    // chuqurlik (chapda)
    const yv = (v: number) => ((v1 - v) * k + pad + 12).toFixed(2);
    out.push(`<path d="M${xl} ${yv(v1)}V${yv(v0)}" stroke="#141414" stroke-width="0.25"/><path d="M${(Number(xl) - 1.5).toFixed(1)} ${yv(v1)}h3 M${(Number(xl) - 1.5).toFixed(1)} ${yv(v0)}h3" stroke="#141414" stroke-width="0.25"/>`);
    out.push(`<text transform="translate(${(Number(xl) - 1.5).toFixed(1)} ${((Number(yv(v0)) + Number(yv(v1))) / 2).toFixed(1)}) rotate(-90)" font-size="2.2" font-weight="600" text-anchor="middle" fill="#141414">${n1(S)} m</text>`);
    ['А', 'Б'].forEach((t, i) => { const y = i ? yv(v0) : yv(v1); out.push(`<circle cx="${(Number(xl) - 6).toFixed(1)}" cy="${y}" r="2" fill="#fff" stroke="#141414" stroke-width="0.25"/><text x="${(Number(xl) - 6).toFixed(1)}" y="${(Number(y) + 0.7).toFixed(1)}" font-size="1.8" text-anchor="middle" fill="#141414">${t}</text>`); });
  }
  out.push(`<g transform="translate(${(W - 10).toFixed(1)} 11) rotate(${(-northDeg).toFixed(1)})"><path d="M0 5L-2.2 2.5 0 -5 2.2 2.5Z" fill="#141414"/><text y="-6" font-size="2.4" text-anchor="middle" fill="#141414">N</text></g>`);
  out.push(`<text x="${(W - 4).toFixed(1)}" y="${(H - 2).toFixed(1)}" font-size="2.2" text-anchor="end" fill="#6b6965">M 1:${o.scale} · ${o.floor}-qavat · sxema, ishchi chizma emas</text>`);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(1)}mm" height="${H.toFixed(1)}mm" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" font-family="Archivo, system-ui, sans-serif">${out.join('')}</svg>`;
  return { svg, widthMm: W, heightMm: H, apts: G.apts.map(a => ({ rooms: a.rooms, area: a.area, ring: a.ring })), core: G.core, corridor: G.corridor, kind: G.kind };
}

/** Barcha seksiyalar rejalari — bitta SVG, toʻrga joylangan */
export function allPlansSvg(plans: SecPlan[], floor: number, scale = 200, names: (pl: SecPlan, i: number) => string): string {
  const items = plans.filter(pl => floor > pl.f0 && floor <= pl.f1).map((pl, i) => floorPlanSvg(pl, { scale, dims: true, title: names(pl, i), floor }));
  if (!items.length) return '';
  const cols = Math.max(1, Math.round(Math.sqrt(items.length * 1.4))), gap = 12;
  const colW: number[] = [], rowH: number[] = [];
  items.forEach((it, i) => { const c = i % cols, rr = Math.floor(i / cols); colW[c] = Math.max(colW[c] ?? 0, it.widthMm); rowH[rr] = Math.max(rowH[rr] ?? 0, it.heightMm); });
  const W = colW.reduce((a, b) => a + b, 0) + gap * (cols + 1), H = rowH.reduce((a, b) => a + b, 0) + gap * (rowH.length + 1) + 10;
  const body = items.map((it, i) => { const c = i % cols, rr = Math.floor(i / cols); const x = gap + colW.slice(0, c).reduce((a, b) => a + b, 0) + gap * c, y = 10 + gap + rowH.slice(0, rr).reduce((a, b) => a + b, 0) + gap * rr; return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${it.svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`; }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(1)}mm" height="${H.toFixed(1)}mm" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" font-family="Archivo, system-ui, sans-serif"><rect width="100%" height="100%" fill="#fff"/><text x="${gap}" y="8" font-size="4.5" font-weight="600">Seksiyalar rejalari · ${floor}-qavat · M 1:${scale}</text>${body}</svg>`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
void MOD_W;

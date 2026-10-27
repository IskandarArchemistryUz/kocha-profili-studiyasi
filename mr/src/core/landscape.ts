/**
 * Hovli obodonlashtirish — turar joy kvartali (parseli) ichida avtomatik:
 *  · binolar atrofida 3 m trotuar (otmostka va kirish yoʻllari);
 *  · ShNQ 2.07.01-23, 89-band 4-jadval maydonchalari: bolalar 0,7 m²/kishi (binodan ≥ 10 m), kattalar dam olishi 0,1 (≥ 6 m),
 *    sport 2,0 (≥ 10 m), xoʻjalik 0,3 (≥ 20 m); 91-band — birlashtirilsa ≥ 150 m²;
 *  · qolgan qismi — maysa va daraxtlar (binodan ≥ 5 m, 485-band 35-jadval);
 *  · ichki yoʻlak — hovli boʻylab halqa (2 m).
 * Yashillik balansi: 86-band — koʻp kvartirali turar joy zonasi yashil hududi (maktab/MTM uchastkalarisiz) ≥ 25 %;
 * 87-band — maydonchalar va yoʻlaklar uchastkaning 30 % idan oshmasa yashil hududga qoʻshiladi.
 * Bu sxema — eskiz: aniq joylashtirish loyihachining qarori.
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import type { Building, Project } from './doc';
import { frame, area, type XY } from './geo';
import { computePlan, corridor, safeUnion, pointIn } from './plan';
import { useDef } from './uses';
import { inset, clean } from './generator';

/**
 * Ochiq joylar eskizi (generator): park — halqa va diagonal yoʻlaklar, markazda maydoncha, daraxtlar toʻri (9 m);
 * skver/maydon — markazda qoplama maydon (kvartalning ~45 %), chetlarida daraxt qatorlari, qolgani maysa; sport — maydonchalar.
 * 86-bandda yashil hudud balansiga kiradi (yashil kvartal butunlay). Eskiz — loyihachi aniqlashtiradi.
 */
function openSpace(blk: { rings: XY[][]; area: number; use: string; centroid: XY }, bi: number): Yard | null {
  const outer = clean(blk.rings[0], 4); if (outer.length < 3 || blk.area < 400) return null;
  const B: Polygon = [close(outer)], c = blk.centroid;
  let paving: MultiPolygon = [], paths: MultiPolygon = [];
  const play: Yard['play'] = [];
  if (blk.use === 'yashil') {
    const loop = inset(outer, Math.min(6, Math.sqrt(blk.area) * 0.08));
    if (loop) paths.push(...corridor([...loop, loop[0]], 1.25));
    // diagonallar: markazdan halqaning har 2-chi uchiga
    if (loop) loop.forEach((p, i) => { if (i % 2 === 0) paths.push(...corridor([c, p], 1)); });
    const R = Math.max(5, Math.min(14, Math.sqrt(blk.area) * 0.09)), circ: XY[] = []; for (let k = 0; k < 20; k++) circ.push([c[0] + Math.cos(k / 20 * Math.PI * 2) * R, c[1] + Math.sin(k / 20 * Math.PI * 2) * R]);
    paving = [[close(circ)]];
  } else if (blk.use === 'maydon') {
    const pl = inset(outer, Math.sqrt(blk.area) * 0.16); if (pl) paving = [[close(clean(pl, 3))]];
  } else {
    // sport: 2–3 ta maydoncha (≤ 40 m), markaz atrofida
    const a = Math.min(1800, blk.area * 0.22); let dx = -Math.sqrt(a) * 0.6;
    for (let k = 0; k < 3; k++, dx += Math.sqrt(a) * 1.25) { const r = rectAt([c[0] + dx, c[1]], a); if (r.every(q => pointIn(q, blk.rings))) play.push({ kind: 'sport', ring: r, need: a, area: a }); }
  }
  const taken: MultiPolygon = play.length ? safeUnion(play.map(p => [close(p.ring)] as Polygon)) : [];
  const clipB = (m: MultiPolygon) => m.length ? tryOp(() => polygonClipping.intersection(m, B), [] as MultiPolygon) : [];
  paving = clipB(paving); paths = clipB(paths.length ? safeUnion(paths) : []);
  const green = tryOp(() => polygonClipping.difference(B, ...[paving, paths, taken].filter(m => m.length)), [B]);
  const gR = toMP(green), pR = toMP(paving), trees: XY[] = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of outer) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const step = blk.use === 'yashil' ? 9 : 7;
  for (let x = x0 + 4; x < x1; x += step) for (let y = y0 + 4; y < y1; y += step) {
    const p: XY = [x + ((Math.round(y) * 7) % 3) - 1, y + ((Math.round(x) * 5) % 3) - 1];
    if (!gR.some(q => pointIn(p, q))) continue;
    if (blk.use === 'maydon' && !pR.some(q => ringD(p, q[0]) < 6)) continue;   // skver: daraxtlar maydon chetida qator
    if (ringD(p, outer) < 2.5) continue;
    trees.push(p);
  }
  return { block: bi, paving: pR, green: gR, paths: toMP(paths), play, trees, areas: { block: blk.area, paving: mpArea(paving), green: mpArea(green), play: play.reduce((t, q) => t + q.area, 0), paths: mpArea(paths) } };
}

export const PLAY_NORM = { bolalar: 0.7, kattalar: 0.1, sport: 2.0, xojalik: 0.3 };
const RES_USES = new Set(['turar', 'aralash']);

export interface Yard {
  /** kvartal indeksi (computePlan blocks) */
  block: number;
  paving: XY[][][]; green: XY[][][]; paths: XY[][][];
  play: { kind: keyof typeof PLAY_NORM; ring: XY[]; need: number; area: number }[];
  trees: XY[];
  areas: { block: number; paving: number; green: number; play: number; paths: number };
}

const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
const open = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]] as XY);
const mpArea = (mp: MultiPolygon) => mp.reduce((s, p) => s + p.reduce((t, r, k) => t + (k ? -1 : 1) * area(open(r)), 0), 0);
const toMP = (mp: MultiPolygon): XY[][][] => mp.map(p => p.map(open));
const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
const ringD = (p: XY, r: XY[]) => { let m = Infinity; for (let i = 0; i < r.length; i++) m = Math.min(m, segD(p, r[i], r[(i + 1) % r.length])); return m; };
const tryOp = <T>(f: () => T, fb: T): T => { try { return f(); } catch { return fb; } };

/** Toʻrtburchak maydoncha: markaz, oʻlcham (kvadratga yaqin, eni ≤ 40 m) */
const rectAt = (c: XY, a: number): XY[] => { const w = Math.min(40, Math.sqrt(a * 1.5)), h = a / w; return [[c[0] - w / 2, c[1] - h / 2], [c[0] + w / 2, c[1] - h / 2], [c[0] + w / 2, c[1] + h / 2], [c[0] - w / 2, c[1] + h / 2]]; };

let memo: { k: unknown[]; v: Yard[] } | null = null;
export function landscape(doc: Project): Yard[] {
  const k = [doc.site, doc.buildings, doc.streets, doc.zones, doc.parcels, doc.garages, doc.origin, doc.settings.m2PerPerson, doc.settings.netToGross, doc.keepRings];
  if (memo && memo.k.every((x, i) => x === k[i])) return memo.v;
  const v = landscapeRaw(doc); memo = { k, v }; return v;
}
/** Qavariq qobiq (avtoturargoh maydoni yaxlit — joylar orasidagi kichik boʻshliqlarga maydoncha tushmaydi) */
function hull(P: XY[]): XY[] {
  const p = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: XY[] = [], up: XY[] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
function landscapeRaw(doc: Project): Yard[] {
  const fr = frame(doc.origin), plan = computePlan(doc), out: Yard[] = [];
  const bl = doc.buildings.map(b => ({ b, r: b.footprint.map(fr.toLocal) }));
  // saqlanadigan mavjud binolar — hovlida toʻsiq (trotuar, daraxt va maydonchalar ularga tushmaydi); aholi hisobiga kirmaydi
  for (const r of Object.values(doc.keepRings ?? {})) bl.push({ b: { id: '', footprint: r, floors: 0, nonRes: 0, use: 'texnik' } as unknown as Building, r: r.map(fr.toLocal) });
  plan.blocks.forEach((blk, bi) => {
    if (blk.use === 'yashil' || blk.use === 'maydon' || blk.use === 'sport') { const y = openSpace(blk, bi); if (y) out.push(y); return; }
    if (!RES_USES.has(blk.use)) return;
    const own = bl.filter(x => pointIn(x.r.reduce((s, p) => [s[0] + p[0] / x.r.length, s[1] + p[1] / x.r.length] as XY, [0, 0] as XY), blk.rings) && !x.b.z0);
    if (!own.length) return;
    const B: Polygon = blk.rings.map(close);
    const fp = safeUnion(own.map(x => [close(x.r)] as Polygon));
    // binolar atrofidagi 3 m trotuar
    const ring3 = safeUnion(own.flatMap(x => corridor([...x.r, x.r[0]], 3)));
    const paveAll = tryOp(() => polygonClipping.intersection(polygonClipping.difference(ring3, fp), B), [] as MultiPolygon);
    // yer usti avtoturargoh (joylar va boʻlaklar) — hovli maydonchalari uning ustiga tushmaydi
    const park: Polygon[] = doc.garages.flatMap(g => g.kind === 'yer_usti' && g.stalls?.length ? [[close(hull([...g.stalls, ...(g.aisles ?? [])].flat().map(fr.toLocal)))] as Polygon] : []);
    const free = tryOp(() => polygonClipping.difference(B, fp, paveAll, ...park), [] as MultiPolygon);
    if (!free.length) return;
    // aholi (shu kvartal binolari)
    const pop = own.reduce((t, x) => t + area(x.r) * Math.max(0, x.b.floors - x.b.nonRes) * useDef(x.b.use).res * doc.settings.netToGross / doc.settings.m2PerPerson, 0);
    // nomzod nuqtalar: erkin hududda, binolardan uzoqligi bilan
    const freeR = toMP(free), cand: { p: XY; d: number }[] = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of blk.rings[0]) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const step = Math.max(3, Math.sqrt((x1 - x0) * (y1 - y0) / 2500));
    for (let x = x0 + step / 2; x < x1; x += step) for (let y = y0 + step / 2; y < y1; y += step) {
      const p: XY = [x, y]; if (!freeR.some(q => pointIn(p, q))) continue;
      cand.push({ p, d: Math.min(...own.map(o => ringD(p, o.r)), ringD(p, blk.rings[0]) + 4) });
    }
    cand.sort((a, b) => b.d - a.d); cand.length = Math.min(cand.length, 400);
    const play: Yard['play'] = []; let taken: MultiPolygon = []; const takenBB: [number, number, number, number][] = [];
    const place = (kind: keyof typeof PLAY_NORM, minD: number, cap: number) => {
      const need = pop * PLAY_NORM[kind]; if (need < 15) return;
      for (let a = Math.min(need, cap); a >= Math.min(need, cap) * 0.4; a *= 0.8) {
        for (const c of cand) {
          if (c.d < minD) break;
          const r = rectAt(c.p, a), poly: Polygon = [close(r)];
          // tez tekshiruvlar: burchaklar erkin hududda, band qilinganlar bilan toʻqnashmaydi, binolardan uzoq
          if (!r.every(q => freeR.some(f => pointIn(q, f)))) continue;
          const bx: [number, number, number, number] = [Math.min(...r.map(q => q[0])), Math.min(...r.map(q => q[1])), Math.max(...r.map(q => q[0])), Math.max(...r.map(q => q[1]))];
          if (takenBB.some(t => bx[0] < t[2] && bx[2] > t[0] && bx[1] < t[3] && bx[3] > t[1])) continue;
          if (Math.min(...r.map(q => Math.min(...own.map(o => ringD(q, o.r))))) < minD - 1) continue;
          const inside = tryOp(() => mpArea(polygonClipping.intersection(poly, free)), 0);
          if (inside < a * 0.97) continue;
          play.push({ kind, ring: r, need, area: a }); taken = taken.length ? safeUnion([taken, poly]) : [poly]; takenBB.push([bx[0] - 2, bx[1] - 2, bx[2] + 2, bx[3] + 2]); return;
        }
      }
    };
    const freeA = mpArea(free);
    place('sport', 12, freeA * 0.35); place('bolalar', 10, freeA * 0.25); place('kattalar', 6, freeA * 0.1); place('xojalik', 20, freeA * 0.1);
    // ichki yoʻlak: erkin hudud chegarasidan 5 m ichkarida (taxminan) — halqa
    const paths: MultiPolygon = [];
    for (const poly of freeR) {
      const outer = poly[0]; if (area(outer) < 600) continue;
      const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length, cy = outer.reduce((s, p) => s + p[1], 0) / outer.length;
      const loop = outer.map(p => { const dx = cx - p[0], dy = cy - p[1], L = Math.hypot(dx, dy) || 1, k = Math.min(5, L * 0.35); return [p[0] + dx / L * k, p[1] + dy / L * k] as XY; });
      const c = corridor([...loop, loop[0]], 1); if (c.length) paths.push(...c);
    }
    let pathsIn: MultiPolygon = paths.length ? tryOp(() => polygonClipping.intersection(safeUnion(paths), free), [] as MultiPolygon) : [];
    if (pathsIn.length && taken.length) pathsIn = tryOp(() => polygonClipping.difference(pathsIn, taken), pathsIn);
    const green = tryOp(() => polygonClipping.difference(free, ...(taken.length ? [taken] : []), ...(pathsIn.length ? [pathsIn] : [])), free);
    // daraxtlar: maysada, 8 m qadam, binodan ≥ 5 m, maydonchalarda emas
    const trees: XY[] = [], gR = toMP(green), tk = toMP(taken);
    for (let x = x0 + 4; x < x1; x += 8) for (let y = y0 + 4; y < y1; y += 8) {
      const p: XY = [x + ((Math.round(y) * 7) % 3) - 1, y + ((Math.round(x) * 5) % 3) - 1];
      if (!gR.some(q => pointIn(p, q)) || tk.some(q => pointIn(p, q))) continue;
      if (Math.min(...own.map(o => ringD(p, o.r))) < 5) continue;
      trees.push(p);
    }
    out.push({
      block: bi, paving: toMP(paveAll), green: gR, paths: toMP(pathsIn), play, trees,
      areas: { block: blk.area, paving: mpArea(paveAll), green: mpArea(green), play: play.reduce((t, q) => t + q.area, 0), paths: mpArea(pathsIn) },
    });
  });
  return out;
}

/** Yashillik balansi: yashil kvartallar + hovli maysasi (+ 87-band: maydoncha va yoʻlaklar, agar ≤ 30 %) */
export function greenBalance(doc: Project, yards: Yard[]): { blocksGreen: number; yardGreen: number; yardPlay: number; counted: number; base: number; share: number; trees: number } {
  const plan = computePlan(doc);
  const blocksGreen = plan.blocks.filter(b => b.use === 'yashil').reduce((t, b) => t + b.area, 0);
  // 86-band: maktab va MTM uchastkalarisiz
  const base = plan.blocks.filter(b => b.use !== 'maktab' && b.use !== 'mtm').reduce((t, b) => t + b.area, 0) + plan.corridorArea;
  let yardGreen = 0, yardPlay = 0;
  const greenBlocks = new Set(plan.blocks.map((b, i) => b.use === 'yashil' ? i : -1).filter(i => i >= 0));
  // yashil kvartal butunlay hisoblangan — uning hovli eskizi (yoʻlaklar, maysa) ikkinchi marta qoʻshilmaydi
  for (const y of yards) { if (greenBlocks.has(y.block)) continue; yardGreen += y.areas.green; const pp = y.areas.play + y.areas.paths; yardPlay += pp <= 0.3 * y.areas.block ? pp : 0.3 * y.areas.block; }
  const counted = blocksGreen + yardGreen + yardPlay;
  return { blocksGreen, yardGreen, yardPlay, counted, base, share: base > 0 ? counted / base : 0, trees: yards.reduce((t, y) => t + y.trees.length, 0) };
}

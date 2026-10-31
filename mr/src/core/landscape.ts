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
import { frame, area, signedArea, type XY } from './geo';
import { computePlan, corridor, safeUnion, pointIn } from './plan';
import { useDef } from './uses';
import { inset, clean } from './generator';
import { sportPark, type SportItem } from './sportpark';
import { playKit, type KitPart } from './playkit';

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
  }
  // sport (31.10): stadion / futbol, yopiq majmua, basseyn, kortlar va workout — standart oʻlchamlarda (core/sportpark); atrofida yoʻlak halqasi
  const sport: SportItem[] = blk.use === 'sport' ? sportPark(outer, blk.area) : [];
  if (sport.length) { const loop = inset(outer, 2.5); if (loop) paths.push(...corridor([...loop, loop[0]], 1.25)); }
  const taken: MultiPolygon = play.length || sport.length ? safeUnion([...play.map(p => [close(p.ring)] as Polygon), ...sport.map(q => [close(q.lines.length && (q.k === 'basseyn') ? q.lines[0].slice(0, -1) : q.ring)] as Polygon)]) : [];
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
    if (sport.length && taken.some(poly => pointIn(p, [open(poly[0])]) || ringD(p, open(poly[0])) < 3)) continue;
    trees.push(p);
  }
  return { block: bi, paving: pR, green: gR, paths: toMP(paths), play, trees, ...(sport.length ? { sport } : {}), areas: { block: blk.area, paving: mpArea(paving), green: mpArea(green), play: play.reduce((t, q) => t + q.area, 0), paths: mpArea(paths) } };
}

export const PLAY_NORM = { bolalar: 0.7, kattalar: 0.1, sport: 2.0, xojalik: 0.3 };
/** maydoncha turlari: 4-jadval + «tajriba» (maktabning oʻquv-tajriba uchastkasi, MTM bogʻi) */
export type PlayKind = keyof typeof PLAY_NORM | 'tajriba';
const RES_USES = new Set(['turar', 'aralash']);
/**
 * Maktab va MTM uchastkasi zonalari (andoza, eskiz): maktab — sport zonasi (kortlar, yugurish), boshlangʻich sinflar oʻyin maydoni,
 * dam olish, oʻquv-tajriba bogʻi, xoʻjalik; MTM — guruh maydonchalari (qum, soyabon, jihoz), sport, bogʻ, xoʻjalik.
 * Ulushlar — erkin hududdan, binodan masofa (minD) — taxminiy; aniq tarkib — ShNQ 2.08 (taʼlim binolari) va topshiriq.
 * ShNQ 2.07.01-23, 4-jadval 1-izoh: mavzedagi katta yoshdagilar sport maydonchalari maktab sport maydonlari bilan birlashtiriladi.
 */
const SOCIAL_ZONES: Record<'maktab' | 'mtm', { kind: PlayKind; minD: number; share: number; cap: number }[]> = {
  maktab: [{ kind: 'sport', minD: 6, share: 0.3, cap: 4500 }, { kind: 'tajriba', minD: 6, share: 0.08, cap: 1200 }, { kind: 'bolalar', minD: 8, share: 0.08, cap: 900 }, { kind: 'kattalar', minD: 6, share: 0.05, cap: 400 }, { kind: 'xojalik', minD: 10, share: 0.03, cap: 300 }],
  mtm: [{ kind: 'bolalar', minD: 6, share: 0.4, cap: 4000 }, { kind: 'sport', minD: 8, share: 0.12, cap: 900 }, { kind: 'tajriba', minD: 6, share: 0.06, cap: 400 }, { kind: 'xojalik', minD: 10, share: 0.04, cap: 200 }],
};

export interface Entry { kind: 'arka' | 'oraliq' | 'podyezd'; p: XY; d: XY; w?: number }
export interface Yard {
  /** kvartal indeksi (computePlan blocks) */
  block: number;
  paving: XY[][][]; green: XY[][][]; paths: XY[][][];
  play: { kind: PlayKind; ring: XY[]; need: number; area: number; kit?: KitPart[] }[];
  /** 31.10: maktab / MTM uchastkasi — turar joy hovlisi hisoblariga (86-band balansi, 4-jadval maydonchalari) kirmaydi */
  social?: 'maktab' | 'mtm';
  trees: XY[];
  /** hovliga kirishlar (genplanda): arka, binolar oraligʻi (torets orasidan), podyezd — p nuqta, d hovli tomon yoʻnalish (birlik) */
  entries?: Entry[];
  /** yongʻin-qutqaruv yoʻlagi hovlida (faqat kerak boʻlsa): lane — qoplama, w — eni, d — devorgacha (ichki chetidan), hmax — eng baland bino */
  fire?: { lane: XY[][][]; w: number; d: number; hmax: number; area: number };
  /** past qavatli uylar uchastkalari chegarasi (devor / panjara) — 31.10 */
  fences?: XY[][];
  /** uchastkalar ichidagi bezak (ekin pushtalari) — maydonchalardan tashqari */
  kit?: KitPart[];
  /** sport hududi inshootlari (31.10): stadion, maydonlar, basseyn, yopiq majmua */
  sport?: SportItem[];
  areas: { block: number; paving: number; green: number; play: number; paths: number };
  /** 31.10: stilobat tomi landshafti — tom sathi (yerdan, m) va stilobat binosi id */
  z?: number; roofOf?: string;
  /** yongʻin-qutqaruv texnikasi rampasi (yerdan stilobat tomiga): ring — rejadagi izi, lo — pastki (yer) uchi oʻrtasi, hi — yuqori uchi */
  ramp?: Ramp;
}
export interface Ramp { ring: XY[]; lo: XY; hi: XY; len: number; w: number; slope: number; h: number; /** stilobat ichiga qaragan normal */ n: XY; /** stilobat ichida (tashqarida sigʻmadi) */ inside: boolean }
/** Rampa nishabi (andoza, meʼyor emas): yongʻin avtomobili uchun ≤ 10 % — aniq qiymat avtomobil texnik tavsifi boʻyicha */
export const RAMP_SLOPE = 0.1;

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
  const sig = (r: XY[]) => r.map(p => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`).join(';');
  const parkAll = doc.garages.filter(g => g.kind === 'yer_usti' && g.stalls?.length).map(g => ({ g, h: hull([...g.stalls!, ...(g.aisles ?? [])].flat().map(fr.toLocal)) }));
  plan.blocks.forEach((blk, bi) => {
    const bsig = `${blk.use}|${blk.rings.map(sig).join('/')}`;
    if (blk.use === 'yashil' || blk.use === 'maydon' || blk.use === 'sport') { const y = cached(`o|${bsig}`, () => openSpace(blk, bi)); if (y) out.push({ ...y, block: bi }); return; }
    if (blk.use === 'maktab' || blk.use === 'mtm') {
      // 31.10 (egasi: «maktab va MTM hududlari landshafti»): uchastka zonalari — andoza (zonalar maydoni meʼyor matnidan emas)
      const ownS = bl.filter(x => !x.b.z0 && x.b.floors > 0 && pointIn(x.r.reduce((s2, p) => [s2[0] + p[0] / x.r.length, s2[1] + p[1] / x.r.length] as XY, [0, 0] as XY), blk.rings));
      const kind = blk.use as 'maktab' | 'mtm';
      const y = cached(`m|${bsig}|${ownS.map(x => sig(x.r)).join('#')}`, () => { const z = yardOf(blk, bi, ownS.length ? ownS : [], [], doc, [], undefined, SOCIAL_ZONES[kind]); if (!z) return null;
        // daraxtlar: uchastka chegarasi boʻylab yashil tasma (chekdan ≤ 10 m) + ichkarida siyrak (har uchinchisi) — ochiq maydon koʻproq qoladi
        const trees = z.trees.filter((p, i) => ringD(p, blk.rings[0]) < 10 || i % 3 === 0);
        return { ...z, trees, social: kind }; });
      if (y) out.push({ ...y, block: bi });
      return;
    }
    if (!RES_USES.has(blk.use)) return;
    const inBlk = (x: Own) => pointIn(x.r.reduce((s, p) => [s[0] + p[0] / x.r.length, s[1] + p[1] / x.r.length] as XY, [0, 0] as XY), blk.rings);
    const own = bl.filter(x => inBlk(x) && !x.b.z0), arches = bl.filter(x => x.b.gen?.kind === 'arka' && inBlk(x));
    if (!own.length) return;
    // 31.10: past qavatli uylar (uchastkali) — oʻz hovlisi: bogʻ, kirish yoʻlagi, avtomobil joyi, panjara, daraxtlar
    if (own.every(x => x.b.gen?.plot)) { const y = cached(`l|${bsig}|${own.map(x => sig(x.r)).join('#')}|${doc.settings.m2PerPerson}`, () => lowYard(blk, bi, own, fr, undefined, doc)); if (y) out.push({ ...y, block: bi }); return; }
    // 31.10 (egasi: «taunhauslar oʻtmagan»): bloklangan uylar — har uyning orqa bogʻi (hovli tomonda, chuqurligi andoza 6 m) va panjara
    if (own.every(x => x.b.gen?.kind === 'taunhaus' || x.b.gen?.plot)) { const y = cached(`t|${bsig}|${own.map(x => sig(x.r)).join('#')}|${doc.settings.m2PerPerson}`, () => lowYard(blk, bi, own, fr, townPlots(blk.rings[0], own), doc)); if (y) out.push({ ...y, block: bi }); return; }
    // 27.10 yengillik: kvartal hovlisi faqat shu kvartal binolari, avtoturargohi yoki shakli oʻzgarsa qayta hisoblanadi
    const parkIn = parkAll.filter(p => p.h.length && pointIn(p.h.reduce((a, q) => [a[0] + q[0] / p.h.length, a[1] + q[1] / p.h.length] as XY, [0, 0] as XY), blk.rings));
    // 31.10: stilobat tomi — landshaft, yongʻin yoʻlagi (666, 667, 675–677-bandlar) va yerdan rampa
    const roofs: Yard[] = [], ramps: Polygon[] = [];
    for (const pod of own.filter(x => x.b.gen?.kind === 'stilobat' && x.b.floors > 0)) {
      const tw = bl.filter(x => (x.b.z0 ?? 0) > 0 && x.b.floors > 0 && pointIn(x.r.reduce((a, q) => [a[0] + q[0] / x.r.length, a[1] + q[1] / x.r.length] as XY, [0, 0] as XY), [pod.r]));
      const z = pod.b.floors * doc.settings.floorHeight;
      const k = `s|${bsig}|${sig(pod.r)}|${z}|${doc.settings.m2PerPerson}|${doc.settings.netToGross}|${tw.map(x => `${x.b.floors},${x.b.z0},${x.b.use},${sig(x.r)}`).join('#')}|${own.filter(x => x !== pod).map(x => sig(x.r)).join('#')}`;
      const y = cached(k, () => podiumRoof(pod, tw, own.filter(x => x !== pod), blk, bi, z, doc));
      if (y) { roofs.push({ ...y, block: bi }); if (y.ramp && !y.ramp.inside) ramps.push([close(y.ramp.ring)]); }
    }
    const key = `r|${bsig}|${arches.map(x => sig(x.r)).join('#')}|${doc.settings.m2PerPerson}|${doc.settings.netToGross}|${own.map(x => `${x.b.floors},${x.b.nonRes},${x.b.use},${sig(x.r)}`).join('#')}|${parkIn.map(p => sig(p.h)).join('#')}`;
    const y0 = cached(key + `|${ramps.map(r => sig(open(r[0]))).join('#')}`, () => { const y = yardOf(blk, bi, own, [...parkIn.map(p => [close(p.h)] as Polygon), ...ramps], doc, arches); if (y) y.entries = entriesOf(blk.rings[0], own, arches); return y; });
    if (y0) out.push({ ...y0, block: bi });
    out.push(...roofs);
  });
  return out;
}
/**
 * Past qavatli uylar hovlisi (31.10, «past-qavatli-uylar-qoidalari»): har uchastka — bogʻ (uy va oldi yoʻlagidan tashqari);
 * oldi: uydan qizil chiziqqacha kirish yoʻlagi 1,4 m va avtomobil joyi 3 × 5,5 m (misollar: avtomobil oldi hovlida);
 * orqa bogʻda 1–2 daraxt chegaradan ≥ 1,5 m (96-band: 1–3 m); uchastka chegarasi — panjara; uchastkalardan tashqari qism — umumiy yashil.
 */
/** Bloklangan uylar: har uyning hovli tomondagi uzun qirrasidan orqa bogʻ (andoza 6 m), kvartal chegarasi va boshqa uylar bilan kesilgan */
function townPlots(outer: XY[], own: Own[]): { x: Own; plot: XY[] }[] {
  const D = 6, out: { x: Own; plot: XY[] }[] = [];
  for (const x of own) {
    if (x.b.gen?.plot) continue;
    const r = signedArea(x.r) > 0 ? x.r : [...x.r].reverse();
    let best: { a: XY; b: XY; n: XY; s: number } | null = null;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 3) continue;
      const n: XY = [(b[1] - a[1]) / L, -(b[0] - a[0]) / L], m: XY = [(a[0] + b[0]) / 2 + n[0] * 3, (a[1] + b[1]) / 2 + n[1] * 3];
      if (!pointIn(m, [outer])) continue;
      const sc = ringD(m, outer) + L * 0.01;   // kvartal chetidan eng uzoq — hovli tomoni
      if (!best || sc > best.s) best = { a, b, n, s: sc };
    }
    if (!best) continue;
    const { a, b, n } = best, P = (p: XY, k: number): [number, number] => [p[0] + n[0] * k, p[1] + n[1] * k];
    const back: Polygon = [[[a[0], a[1]], [b[0], b[1]], P(b, D), P(a, D), [a[0], a[1]]]];
    let mp = tryOp(() => polygonClipping.union(back, [close(x.r)]), [] as MultiPolygon);
    mp = tryOp(() => polygonClipping.intersection(mp, [close(outer)]), mp);
    const others = own.filter(o => o !== x).map(o => [close(o.r)] as Polygon); if (others.length) mp = tryOp(() => polygonClipping.difference(mp, ...others), mp);
    const big = mp.sort((p, q) => area(open(q[0])) - area(open(p[0])))[0];
    if (big) out.push({ x, plot: open(big[0]) });
  }
  return out;
}
function lowYard(blk: { rings: XY[][]; area: number }, bi: number, own: Own[], fr: { toLocal: (p: [number, number]) => XY }, plotsIn?: { x: Own; plot: XY[] }[], doc?: Project): Yard | null {
  const B: Polygon = blk.rings.map(close);
  const plots = plotsIn ?? own.map(x => ({ x, plot: x.b.gen!.plot!.map(p => fr.toLocal(p)) }));
  const pave: Polygon[] = [], trees: XY[] = [], fences: XY[][] = [];
  for (const { x, plot } of plots) {
    fences.push(plot);
    // oldi tomon: uchastkaning uy qirrasiga parallel va undan ~5 m (lowrise: oldi chekinish) dagi qirrasi
    const c = x.r.reduce((s, p) => [s[0] + p[0] / x.r.length, s[1] + p[1] / x.r.length] as XY, [0, 0] as XY);
    let ux = 0, uy = 0, bd = Infinity, half = 0;
    for (let i = 0; i < x.r.length; i++) {
      const a = x.r[i], b = x.r[(i + 1) % x.r.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue;
      const ex = (b[0] - a[0]) / l, ey = (b[1] - a[1]) / l, nx0 = ey, ny0 = -ex;   // qirra normali (tashqariga yoki ichkariga)
      const out = ((a[0] + b[0]) / 2 - c[0]) * nx0 + ((a[1] + b[1]) / 2 - c[1]) * ny0 > 0 ? 1 : -1, nx = nx0 * out, ny = ny0 * out, hh = ((a[0] + b[0]) / 2 - c[0]) * nx + ((a[1] + b[1]) / 2 - c[1]) * ny;
      for (let j = 0; j < plot.length; j++) { const p = plot[j], q = plot[(j + 1) % plot.length], pl = Math.hypot(q[0] - p[0], q[1] - p[1]); if (pl < 1 || Math.abs(((q[0] - p[0]) * ex + (q[1] - p[1]) * ey) / pl) < 0.98) continue;
        const d = ((p[0] + q[0]) / 2 - (a[0] + b[0]) / 2) * nx + ((p[1] + q[1]) / 2 - (a[1] + b[1]) / 2) * ny; if (d > 4.4 && d < 5.6 && d < bd) { bd = d; ux = nx; uy = ny; half = hh; } }
    }
    const nx = -uy, ny = ux, len = Number.isFinite(bd) ? bd : 0;
    const f0: XY = [c[0] + ux * half, c[1] + uy * half];
    if (len > 0.5) {
      let wHalf = 0; for (const p of x.r) wHalf = Math.max(wHalf, Math.abs((p[0] - c[0]) * nx + (p[1] - c[1]) * ny));
      const off = Math.max(0, wHalf - 1.6), pc: XY = [f0[0] + nx * off, f0[1] + ny * off], rect = (o: XY, w: number, l: number): Polygon => [close([[o[0] - nx * w / 2, o[1] - ny * w / 2], [o[0] + nx * w / 2, o[1] + ny * w / 2], [o[0] + nx * w / 2 + ux * l, o[1] + ny * w / 2 + uy * l], [o[0] - nx * w / 2 + ux * l, o[1] - ny * w / 2 + uy * l]])];
      pave.push(rect(pc, wHalf > 4 ? 3 : 1.4, len));                                   // avtomobil / kirish yoʻlagi (tor uyda — faqat yoʻlak)
    }
    // orqa bogʻ: uydan chegaragacha orqa tomonda daraxt
    let back = 0; for (const p of plot) back = Math.max(back, (c[0] - p[0]) * ux + (c[1] - p[1]) * uy);
    if (back - half > 4) { const tb: XY = [c[0] - ux * (half + (back - half) * 0.6), c[1] - uy * (half + (back - half) * 0.6)]; if (pointIn(tb, [plot])) trees.push(tb); }
    else {
      // oldi topilmadi (hovli uy — uy chegarada): daraxt hovlida — uchastkaning uydan eng uzoq ichki nuqtasi
      let best: XY | null = null, bd2 = 2.5;
      const P0 = plot.reduce((m, p) => [Math.min(m[0], p[0]), Math.min(m[1], p[1]), Math.max(m[2], p[0]), Math.max(m[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
      for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) { const q: XY = [P0[0] + (P0[2] - P0[0]) * i / 8, P0[1] + (P0[3] - P0[1]) * j / 8]; if (!pointIn(q, [plot]) || pointIn(q, [x.r])) continue; const d = Math.min(ringD(q, x.r), ringD(q, plot) + 1.5); if (d > bd2) { bd2 = d; best = q; } }
      if (best) trees.push(best);
    }
  }
  // berk koʻcha (klaster, K-01): bir-biriga qaragan ikki uchastka qirrasi orasidagi 5,5–7 m oraliq — qoplama (piyoda va kirish yoʻli)
  if (plots.length >= 4) {
    const E = plots.map(p => p.plot.map((a, i) => { const b = p.plot[(i + 1) % p.plot.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { a, b, l, u: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] as XY }; }).filter(e => e.l >= 5));
    for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) for (const e of E[i]) for (const f of E[j]) {
      if (e.u[0] * f.u[0] + e.u[1] * f.u[1] > -0.99) continue;
      const n: XY = [-e.u[1], e.u[0]], d = (f.a[0] - e.a[0]) * n[0] + (f.a[1] - e.a[1]) * n[1];
      if (Math.abs(d) < 5.5 || Math.abs(d) > 7) continue;
      const t = (p: XY) => (p[0] - e.a[0]) * e.u[0] + (p[1] - e.a[1]) * e.u[1], lo = Math.max(0, Math.min(t(f.a), t(f.b))), hi = Math.min(e.l, Math.max(t(f.a), t(f.b)));
      if (hi - lo < 5) continue;
      const P = (s2: number, k: number): [number, number] => [e.a[0] + e.u[0] * s2 + n[0] * d * k, e.a[1] + e.u[1] * s2 + n[1] * d * k];
      pave.push([[P(lo, 0), P(hi, 0), P(hi, 1), P(lo, 1), P(lo, 0)]]);
    }
  }
  // 31.10 (egasi: «yakka uylar, taunhauslar oʻtmagan»): uchastka ichida — uy orqasida supa/terrasa (3 m, andoza) va ekin pushtalari
  const kit: KitPart[] = [];
  for (const { x, plot } of plots) {
    const r = signedArea(x.r) > 0 ? x.r : [...x.r].reverse();
    let best: { a: XY; u: XY; n: XY; L: number; dep: number } | null = null;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 3) continue;
      const u: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n: XY = [u[1], -u[0]], m: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      let dep = 0; for (let k = 1; k <= 25; k++) { const q: XY = [m[0] + n[0] * k, m[1] + n[1] * k]; if (!pointIn(q, [plot]) || own.some(o => o !== x && pointIn(q, [o.r]))) break; dep = k; }
      if (!best || dep > best.dep) best = { a, u, n, L, dep };
    }
    if (!best || best.dep < 4) continue;
    const { a, u, n, L, dep } = best, Q = (t: number, k: number): XY => [a[0] + u[0] * t + n[0] * k, a[1] + u[1] * t + n[1] * k];
    const tw = Math.max(3, L * 0.8), t0 = (L - tw) / 2;
    pave.push([close([Q(t0, 0), Q(t0 + tw, 0), Q(t0 + tw, 3), Q(t0, 3)])]);   // supa / terrasa
    if (dep >= 9) {   // ekin pushtalari: terrasadan 1,5 m nariroqda, 1 m eni, 0,5 m oraliq
      const k0 = 4.5, k1 = Math.min(dep - 1.5, k0 + 6), bw = Math.min(L * 0.6, 8), b0 = (L - bw) / 2;
      for (let k = k0; k + 1 <= k1; k += 1.5) kit.push({ c: 'ekin', f: [Q(b0, k), Q(b0 + bw, k), Q(b0 + bw, k + 1), Q(b0, k + 1)] });
    }
  }
  // umumiy hudud (uchastkalardan tashqari): bolalar va kattalar maydonchasi — aholi boʻyicha (4-jadval), joy boʻlsa
  const play: Yard['play'] = [];
  if (doc) {
    const pop = own.reduce((t, x) => t + area(x.r) * Math.max(0, x.b.floors - x.b.nonRes) * useDef(x.b.use).res * doc.settings.netToGross / doc.settings.m2PerPerson, 0);
    const plotMP = tryOp(() => safeUnion(plots.map(p => [close(p.plot)] as Polygon)), [] as MultiPolygon);
    const common = tryOp(() => polygonClipping.difference(B, ...(plotMP.length ? [plotMP] : []), ...own.map(x => [close(x.r)] as Polygon)), [] as MultiPolygon);
    const cR = toMP(common).filter(p => area(p[0]) > 250);
    for (const kind of ['bolalar', 'kattalar'] as const) {
      const need = pop * PLAY_NORM[kind]; if (need < 30) continue;
      let done = false;
      for (const poly of cR) {
        if (done) break;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of poly[0]) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
        const cands: { p: XY; d: number }[] = [];
        for (let x = x0 + 2; x < x1; x += 3) for (let y = y0 + 2; y < y1; y += 3) { const q: XY = [x, y]; if (!pointIn(q, poly) || play.some(pl => pointIn(q, [pl.ring]))) continue; cands.push({ p: q, d: Math.min(...poly.map(rr => ringD(q, rr))) }); }
        cands.sort((p1, p2) => p2.d - p1.d);
        for (let a = need; a >= Math.min(need, 60) * 0.99 && !done; a *= 0.8) for (const c of cands.slice(0, 40)) {
          const rr = rectAt(c.p, a);
          if (!rr.every(q => pointIn(q, poly)) || play.some(pl => rr.some(q => pointIn(q, [pl.ring])) || pl.ring.some(q => pointIn(q, [rr])))) continue;
          play.push({ kind, ring: rr, need, area: a, kit: playKit(kind, rr) }); done = true; break;
        }
      }
    }
  }
  const houses = own.map(x => [close(x.r)] as Polygon);
  const pavMP = pave.length ? tryOp(() => polygonClipping.intersection(polygonClipping.union(pave[0], ...pave.slice(1)), B), [] as MultiPolygon) : [];
  const playMP: Polygon[] = play.map(q => [close(q.ring)]);
  const green = tryOp(() => polygonClipping.difference(B, ...houses, ...(pavMP.length ? [pavMP] : []), ...playMP), [] as MultiPolygon);
  const treesOk = trees.filter(t => !play.some(q => pointIn(t, [q.ring])));
  return { block: bi, paving: toMP(pavMP), green: toMP(green), paths: [], play, trees: treesOk, fences, entries: [], ...(kit.length ? { kit } : {}), areas: { block: blk.area, paving: mpArea(pavMP), green: mpArea(green), play: play.reduce((t, q) => t + q.area, 0), paths: 0 } };
}
/**
 * Stilobat tomi (31.10, egasi: «stilobat ustigayam oʻsha landshaftlarni qoʻshish va pojar rampasi va pojar proyezdini norma boʻyicha
 * … stilobat nech qavat boʻlsa shunga moslab»): tom — ustidagi binolar atrofida hovli (maysa, maydonchalar, yoʻlaklar, daraxtlar);
 * ustidagi binolar baland boʻlsa (666-band: F1.3 ≥ 28 m, jamoat ≥ 18 m) — tomda yongʻin yoʻlagi (667, 675, 676-bandlar),
 * 677-band: tom konstruksiyasi har oʻqdan ≥ 16 t yukka hisoblanadi; yerdan tomga rampa: uzunligi = stilobat balandligi / nishab
 * (nishab ≤ 10 % — andoza), eni = yoʻlak eni; stilobat devori boʻylab tashqarida (chekinish ichida), kvartal chegarasidan chiqmaydi.
 */
function podiumRoof(pod: Own, towers: Own[], ground: Own[], blk: { rings: XY[][] }, bi: number, z: number, doc: Project): Yard | null {
  const fh = doc.settings.floorHeight, H = (x: Own) => (x.b.floors + (x.b.z0 ?? 0)) * fh;
  const needFire = towers.some(x => (useDef(x.b.use).res > 0 ? H(x) >= 28 : H(x) >= 18));
  const hmax = Math.max(0, ...towers.map(H)), w = hmax > 46 ? 6 : hmax > 13 ? 4.2 : 3.5;
  const ramp = needFire ? rampOf(pod.r, blk.rings[0], ground, z, w, towers) : null;
  const extra: MultiPolygon[] = [];
  if (ramp) {   // rampa yuqori uchidan tom ichiga 14 m ulanish (yoʻlak halqasiga)
    const k = ramp.inside ? 0 : w / 2 + 0.3, p0: XY = [ramp.hi[0] + ramp.n[0] * k, ramp.hi[1] + ramp.n[1] * k];
    extra.push(corridor([p0, [p0[0] + ramp.n[0] * 14, p0[1] + ramp.n[1] * 14]], w / 2)); }
  const y = yardOf({ rings: [pod.r], area: area(pod.r) }, bi, towers, ramp?.inside ? [[close(ramp.ring)]] : [], doc, [], { extra });
  if (!y) return ramp ? { block: bi, paving: [], green: [], paths: [], play: [], trees: [], areas: { block: area(pod.r), paving: 0, green: 0, play: 0, paths: 0 }, z, roofOf: pod.b.id, ramp } : null;
  return { ...y, z, roofOf: pod.b.id, ...(ramp ? { ramp } : {}) };
}
/** Rampa: stilobat devori boʻylab tashqarida, burchakdan boshlanadi (pastki uchi qoʻshni fasad tomonda); kvartal ichida, binolarga tegmaydi */
export function rampOf(pod: XY[], block: XY[], ground: Own[], h: number, w: number, towers: Own[] = []): Ramp | null {
  const len = Math.ceil(h / RAMP_SLOPE), r = signedArea(pod) > 0 ? pod : [...pod].reverse();
  let best: Ramp | null = null, bs = -Infinity;
  // 1) tashqarida (chekinish ichida); sigʻmasa 2) stilobat ichida (devor boʻylab, ustidagi binolar ostida emas)
  for (const inside of [false, true]) { if (best) break;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < w + 2) continue;
    const u: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], out: XY = [u[1], -u[0]];   // CCW: tashqi normal
    const blocked = (ring: XY[], probe: XY[]) => [...ground, ...(inside ? towers : [])].some(x => probe.some(q => pointIn(q, [x.r])) || x.r.some(q => pointIn(q, [ring])));
    if (inside) {
      // 2b) devorga perpendikulyar: pastki uchi fasadda (koʻchadan kirish), ichkariga koʻtariladi — ustidagi binolar orasidan
      for (let t = w / 2 + 1; t <= L - w / 2 - 1; t += 2) {
        const P = (tt: number, k: number): XY => [a[0] + u[0] * tt - out[0] * k, a[1] + u[1] * tt - out[1] * k];
        const ring = [P(t - w / 2, 0.01), P(t + w / 2, 0.01), P(t + w / 2, len), P(t - w / 2, len)];
        const probe = [...ring, P(t, len / 2), P(t, len / 4), P(t, len * 0.75), P(t, len + 8)];
        if (!probe.every(q => pointIn(q, [r]))) continue;
        // rampa stilobat hajmi ichida ustidagi binolar ostidan oʻtishi mumkin — faqat yuqori chiqishi (oxirgi w m va 8 m davomi) ochiq tomda
        const top = [P(t - w / 2, len - w), P(t + w / 2, len - w), P(t + w / 2, len + 8), P(t - w / 2, len + 8)];
        if (blocked(top, [...top, P(t, len), P(t, len + 4)])) continue;
        if (ground.some(x => probe.some(q => pointIn(q, [x.r])))) continue;
        const sc = -Math.abs(t - L / 2) - 1000;   // devor oʻrtasiga yaqin; parallel variantdan keyin
        if (sc > bs) { bs = sc; best = { ring, lo: P(t, 0.01), hi: P(t, len), len, w, slope: RAMP_SLOPE, h, n: [-out[0], -out[1]], inside }; }
      }
    }
    if (L < len + 2) continue;
    for (const [s0, dir] of [[a, u], [b, [-u[0], -u[1]] as XY]] as [XY, XY][]) {
      const g = 0.3, P = (t: number, k: number): XY => [s0[0] + dir[0] * t + out[0] * k, s0[1] + dir[1] * t + out[1] * k];
      const k0 = inside ? -(g + w) : g, k1 = inside ? -g : g + w, km = (k0 + k1) / 2;
      const ring = [P(0, k0), P(len, k0), P(len, k1), P(0, k1)];
      const probe = [...ring, P(len / 2, km), P(len / 4, km), P(len * 0.75, km)];
      if (!probe.every(q => pointIn(q, [block]))) continue;
      if (inside && !probe.every(q => pointIn(q, [r]))) continue;
      if (blocked(ring, probe)) continue;
      const sc = L - Math.hypot(s0[0] - a[0], s0[1] - a[1]) * 0.001;   // uzun devor afzal
      if (sc > bs) { bs = sc; best = { ring, lo: P(0, km), hi: P(len, km), len, w, slope: RAMP_SLOPE, h, n: [-out[0], -out[1]], inside }; }
    }
  } }
  return best;
}
const CACHE = new Map<string, Yard | null>();
function cached(k: string, f: () => Yard | null): Yard | null {
  if (CACHE.has(k)) { const v = CACHE.get(k)!; CACHE.delete(k); CACHE.set(k, v); return v; }
  const v = f(); CACHE.set(k, v); if (CACHE.size > 600) CACHE.delete(CACHE.keys().next().value!); return v;
}
type Own = { b: Building; r: XY[] };

/**
 * Hovlidagi yongʻin-qutqaruv yoʻlagi (ShNQ 2.07.01-23):
 *  666-band — F1.3 (koʻp kvartirali turar joy) H ≥ 28 m boʻlsa binoning ikkala uzun tomonidan yetib kelish (biri — koʻcha, ikkinchisi — hovli);
 *  667-band — eni: H ≤ 13 m — 3,5 m; 13–46 m — 4,2 m; > 46 m — 6,0 m;
 *  675-band — yoʻlakning ichki chetidan devorgacha: H < 28 m — 5–8 m; H > 28 m — 8–10 m (bu yerda 9 m);
 *  676-band — yoʻlak va bino orasida daraxt qatorlari, toʻsiqlar yoʻq.
 * H < 28 m binolar uchun bitta uzun tomon (koʻcha) yetarli deb olinadi — hovli yoʻlagi chizilmaydi. Eskiz: aniq trassa — loyihachi.
 */
function fireLane(own: Own[], free: MultiPolygon, fh: number, arches: Own[] = [], B?: Polygon, roof?: { extra: MultiPolygon[] }): { mp: MultiPolygon; w: number; d: number; hmax: number; tall: Own[] } | null {
  const H = (x: Own) => (x.b.floors + (x.b.z0 ?? 0)) * fh;
  // 666-band: F1.3 (turar joy) H ≥ 28 m; stilobat tomida jamoat binolari (F2, F3, F4.2–F4.4) H ≥ 18 m ham
  const tall = own.filter(x => x.b.floors > 0 && (useDef(x.b.use).res > 0 ? H(x) >= 28 : !!roof && H(x) >= 18));
  if (!tall.length) return null;
  const hmax = Math.max(...tall.map(H)), w = hmax > 46 ? 6 : hmax > 13 ? 4.2 : 3.5, d = 9;
  const buf = (rs: Own[], k: number) => safeUnion(rs.flatMap(x => [[close(x.r)] as Polygon, ...corridor([...x.r, x.r[0]], k)]));
  // yoʻlak uzluksiz halqa boʻlsin: past binolar atrofida ham (mashina aylanib chiqadi), arkalardan yoʻlakka ulanish
  const all = own.filter(x => x.b.floors > 0);
  let mp = !free.length ? [] as MultiPolygon : tryOp(() => polygonClipping.intersection(polygonClipping.difference(buf(all, d + w), buf(all, d)), free), [] as MultiPolygon);
  if (mp.length && arches.length && B) {
    const links: MultiPolygon[] = arches.map(a => { const r = a.r, c = r.reduce((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length] as XY, [0, 0] as XY);
      let e: XY = [1, 0], L = 0; for (let i = 0; i < r.length; i++) { const v: XY = [r[(i + 1) % r.length][0] - r[i][0], r[(i + 1) % r.length][1] - r[i][1]], l = Math.hypot(v[0], v[1]); if (l > L) { L = l; e = [v[0] / l, v[1] / l]; } }
      const k = L / 2 + d + w; return corridor([[c[0] - e[0] * k, c[1] - e[1] * k], [c[0] + e[0] * k, c[1] + e[1] * k]], w / 2); }).filter(m => m.length);
    if (links.length) mp = tryOp(() => polygonClipping.union(mp, ...links.map(l => tryOp(() => polygonClipping.intersection(l, B, ...[]) , [] as MultiPolygon)).filter(l => l.length)), mp);
    mp = tryOp(() => polygonClipping.difference(mp, ...all.map(x => [close(x.r)] as Polygon)), mp);
  }
  // stilobat tomi: rampadan yoʻlakka ulanish
  if (roof?.extra.length && free.length) { const ex = roof.extra.map(e => tryOp(() => polygonClipping.intersection(e, free), [] as MultiPolygon)).filter(e => e.length); if (ex.length) mp = tryOp(() => polygonClipping.union(mp, ...ex), mp); }
  // burchaklar radiusli (andoza: ichki radius 6 m, tashqi 6 + w — oʻq boʻyicha ≈ 8 m): mashina burilishi uchun
  if (mp.length) { const rd = tryOp(() => safeUnion(mp.map(p => p.map(r => close(roundRing(open(r), FIRE_R + w, FIRE_R))) as Polygon)), mp); if (rd.length) mp = B ? tryOp(() => polygonClipping.intersection(rd, B), rd) : rd; }
  mp = mp.filter(p => area(open(p[0])) >= w * 12);   // mayda boʻlaklar — yoʻlak emas
  return { mp, w, d, hmax, tall: all };   // tall — daraxt cheklovi uchun: yoʻlak butun halqa boʻylab   // mp boʻsh — hovlida joy yetmadi (meʼyorlar roʻyxatida «mos emas»)
}

/** Yongʻin yoʻlagi ichki burilish radiusi (andoza, meʼyor emas) */
export const FIRE_R = 6;
/**
 * Halqa burchaklarini yoy bilan yumaloqlash: qavariq uch (ichki burchak < 180°) — rc, botiq — rr radius.
 * polygon-clipping chiqishida tashqi halqa CCW, teshik CW — ikkalasida ham ichki hudud chapda, shuning uchun chapga burilish = qavariq.
 * Yoy tutash nuqtalari qirraning 48 % idan oshmaydi (qisqa qirrada radius kichrayadi).
 */
export function roundRing(r: XY[], rc: number, rr: number): XY[] {
  const n = r.length; if (n < 3) return r;
  const out: XY[] = [];
  for (let i = 0; i < n; i++) {
    const a = r[(i + n - 1) % n], b = r[i], c = r[(i + 1) % n];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (l1 < 1e-6 || l2 < 1e-6) { out.push(b); continue; }
    const u1: XY = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], u2: XY = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
    const cr = u1[0] * u2[1] - u1[1] * u2[0], phi = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (phi < 0.2 || phi > 2.8) { out.push(b); continue; }
    const R0 = cr > 0 ? rc : rr, tn = Math.tan(phi / 2), t = Math.min(R0 * tn, 0.48 * Math.min(l1, l2)), R = t / tn;
    if (R < 0.3) { out.push(b); continue; }
    const p1: XY = [b[0] - u1[0] * t, b[1] - u1[1] * t], sgn = cr > 0 ? 1 : -1;
    const o: XY = [p1[0] - u1[1] * R * sgn, p1[1] + u1[0] * R * sgn];   // markaz: p1 dan burilish tomoniga
    const a0 = Math.atan2(p1[1] - o[1], p1[0] - o[0]), k = Math.max(2, Math.ceil(phi / (Math.PI / 12)));
    for (let j = 0; j <= k; j++) { const th = a0 + sgn * phi * j / k; out.push([o[0] + Math.cos(th) * R, o[1] + Math.sin(th) * R]); }
  }
  return out;
}
/** Chaikin silliqlash (yopiq halqa) — egri yoʻlaklar uchun */
const chaikin = (r: XY[], it = 2): XY[] => { let q = r; for (let k = 0; k < it; k++) { const o: XY[] = []; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } q = o; } return q; };

/**
 * Hovliga kirishlar (eskiz): 1) arka — oʻtish markazi, yoʻnalish oʻtish boʻylab; 2) binolar oraligʻi — kvartal chetiga yaqin,
 * eni ≥ 3,5 m (ShNQ 2.07.01-23, 667-band: yongʻin mashinasi yoʻlagi eni ≥ 3,5 m) boʻshliq; 3) podyezd — har turar joy seksiyasining
 * hovli tomonidagi uzun devori oʻrtasi. Hovli tomoni — kvartal chegarasidan uzoqroq tomon.
 */
export function entriesOf(outer: XY[], own: Own[], arches: Own[]): Entry[] {
  const out: Entry[] = [], cen = outer.reduce((s, p) => [s[0] + p[0] / outer.length, s[1] + p[1] / outer.length] as XY, [0, 0] as XY);
  const unit = (v: XY): XY => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
  const inward = (p: XY, d: XY): XY => (ringD([p[0] + d[0] * 3, p[1] + d[1] * 3], outer) >= ringD([p[0] - d[0] * 3, p[1] - d[1] * 3], outer) ? d : [-d[0], -d[1]]);
  // 1) arkalar
  for (const a of arches) {
    const r = a.r, c = r.reduce((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length] as XY, [0, 0] as XY);
    let best: XY = [1, 0], bl = 0; for (let i = 0; i < r.length; i++) { const e: XY = [r[(i + 1) % r.length][0] - r[i][0], r[(i + 1) % r.length][1] - r[i][1]], L = Math.hypot(e[0], e[1]); if (L > bl) { bl = L; best = e; } }
    const d = inward(c, unit(best));   // belgi — arkaning hovli tomondagi ogʻzida (tom ostida koʻrinmaydi)
    out.push({ kind: 'arka', p: [c[0] + d[0] * (bl / 2 + 3), c[1] + d[1] * (bl / 2 + 3)], d });
  }
  // 2) binolar oraligʻi (chetga yaqin, ≥ 3,5 m)
  const res = own.filter(x => x.b.floors > 0);
  const near = (p: XY) => ringD(p, outer);
  for (let i = 0; i < res.length; i++) for (let j = i + 1; j < res.length; j++) {
    let bd = Infinity, pa: XY = [0, 0], pb: XY = [0, 0];
    for (const p of res[i].r) for (let k = 0; k < res[j].r.length; k++) { const a = res[j].r[k], b = res[j].r[(k + 1) % res[j].r.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0, q: XY = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; pa = p; pb = q; } }
    for (const p of res[j].r) for (let k = 0; k < res[i].r.length; k++) { const a = res[i].r[k], b = res[i].r[(k + 1) % res[i].r.length], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0, q: XY = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; pa = q; pb = p; } }
    if (bd < 3.5 || bd > 40) continue;
    const m: XY = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]; if (near(m) > 30) continue;
    if (res.some((x, k) => k !== i && k !== j && pointIn(m, [x.r]))) continue;
    if (arches.some(x => pointIn(m, [x.r]) || ringD(m, x.r) < 1.5)) continue;   // arka ostidagi oʻtish — «arka» sifatida
    const g = unit([pb[0] - pa[0], pb[1] - pa[1]]), d = inward(m, [-g[1], g[0]]);
    // haqiqiy oʻtish: koʻcha tomon (−d) binoga urilmasdan kvartal chetiga yetadi (ichki burchak — oʻtish emas)
    let reach = false;
    for (let t = 1; t <= 60; t += 1) { const q: XY = [m[0] - d[0] * t, m[1] - d[1] * t]; if (res.some(x => pointIn(q, [x.r]))) break; if (near(q) < 2 || !pointIn(q, [outer])) { reach = true; break; } }
    if (!reach) continue;
    if (out.some(e => Math.hypot(e.p[0] - m[0], e.p[1] - m[1]) < 8)) continue;
    out.push({ kind: 'oraliq', p: m, d, w: Math.round(bd * 10) / 10 });
  }
  // 3) podyezdlar: turar joy seksiyasining hovli tomonidagi eng uzun devori oʻrtasi (1,5 m tashqarida)
  for (const x of res) {
    if (!useDef(x.b.use).res) continue;
    const r = x.r; let best: { m: XY; n: XY; L: number; s: number } | null = null;
    const ccw = signedArea(r) > 0;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 6) continue;
      const n: XY = ccw ? [(b[1] - a[1]) / L, -(b[0] - a[0]) / L] : [-(b[1] - a[1]) / L, (b[0] - a[0]) / L], m: XY = [(a[0] + b[0]) / 2 + n[0] * 1.5, (a[1] + b[1]) / 2 + n[1] * 1.5];
      const sc = near(m) + L * 0.15 - Math.hypot(m[0] - cen[0], m[1] - cen[1]) * 0.05;
      if (!best || sc > best.s) best = { m, n, L, s: sc };
    }
    if (best) out.push({ kind: 'podyezd', p: best.m, d: [-best.n[0], -best.n[1]] });
  }
  return out;
}
function yardOf(blk: { rings: XY[][]; area: number }, bi: number, own: Own[], park: Polygon[], doc: Project, arches: Own[] = [], roof?: { extra: MultiPolygon[] }, zones?: { kind: PlayKind; minD: number; share: number; cap: number }[]): Yard | null {
    const B: Polygon = blk.rings.map(close);
    const fp = safeUnion(own.map(x => [close(x.r)] as Polygon));
    // binolar atrofidagi 3 m trotuar
    const ring3 = safeUnion(own.flatMap(x => corridor([...x.r, x.r[0]], 3)));
    const paveAll = tryOp(() => polygonClipping.intersection(polygonClipping.difference(ring3, fp), B), [] as MultiPolygon);
    // yer usti avtoturargoh (joylar va boʻlaklar) — hovli maydonchalari uning ustiga tushmaydi
    let free = tryOp(() => polygonClipping.difference(B, fp, paveAll, ...park), [] as MultiPolygon);
    // yongʻin-qutqaruv yoʻlagi: maydonchalar va maysa unga tushmaydi
    const fire = fireLane(own, free, doc.settings.floorHeight, arches, B, roof);
    if (fire?.mp.length) free = tryOp(() => polygonClipping.difference(free, fire.mp), free);
    if (!free.length) return null;
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
    const place = (kind: PlayKind, minD: number, cap: number, need0?: number) => {
      const need = need0 ?? (kind === 'tajriba' ? 0 : pop * PLAY_NORM[kind]); if (need < 15) return;
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
          play.push({ kind, ring: r, need, area: a, kit: playKit(kind, r) }); taken = taken.length ? safeUnion([taken, poly]) : [poly]; takenBB.push([bx[0] - 2, bx[1] - 2, bx[2] + 2, bx[3] + 2]); return;
        }
      }
    };
    const freeA = mpArea(free);
    // 31.10: bolalar maydonchasi birinchi (aks holda katta sport maydoni joyni egallab, bolalar maydonchasi tushmay qolardi)
    if (zones) for (const z of zones) place(z.kind, z.minD, Math.min(z.cap, freeA * z.share), Math.min(z.cap, freeA * z.share));   // maktab / MTM uchastkasi zonalari (andoza)
    else { place('bolalar', 10, freeA * 0.2); place('kattalar', 6, freeA * 0.08); place('sport', 12, freeA * 0.3); place('xojalik', 20, freeA * 0.08); }
    // ichki yoʻlak: erkin hudud chegarasidan 5 m ichkarida (taxminan) — halqa
    const paths: MultiPolygon = [];
    for (const poly of freeR) {
      const outer = poly[0]; if (area(outer) < 600) continue;
      const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length, cy = outer.reduce((s, p) => s + p[1], 0) / outer.length;
      const loop = outer.map(p => { const dx = cx - p[0], dy = cy - p[1], L = Math.hypot(dx, dy) || 1, k = Math.min(5, L * 0.35); return [p[0] + dx / L * k, p[1] + dy / L * k] as XY; });
      const sm = chaikin(loop, 2);   // egri halqa (canvas namunasi: toʻgʻri oʻq + egri yoʻlaklar)
      const c = corridor([...sm, sm[0]], 1); if (c.length) paths.push(...c);
      // toʻgʻri oʻq: har maydoncha markazidan halqaning eng yaqin nuqtasigacha (maydonchaga yetib keladigan yoʻlak)
      for (const q of play) {
        const qc = q.ring.reduce((s2, p) => [s2[0] + p[0] / q.ring.length, s2[1] + p[1] / q.ring.length] as XY, [0, 0] as XY);
        if (!pointIn(qc, [outer])) continue;
        let bp: XY = sm[0], bd = Infinity; for (const p of sm) { const d = Math.hypot(p[0] - qc[0], p[1] - qc[1]); if (d < bd) { bd = d; bp = p; } }
        if (bd > 2 && bd < 60) { const s3 = corridor([qc, bp], 0.75); if (s3.length) paths.push(...s3); }
      }
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
      if (fire && Math.min(...fire.tall.map(o => ringD(p, o.r))) < fire.d + fire.w + 1) continue;   // 676-band: yoʻlak va bino orasida daraxt qatori yoʻq
      trees.push(p);
    }
    return {
      block: bi, paving: toMP(paveAll), green: gR, paths: toMP(pathsIn), play, trees,
      ...(fire ? { fire: { lane: toMP(fire.mp), w: fire.w, d: fire.d, hmax: fire.hmax, area: mpArea(fire.mp) } } : {}),
      areas: { block: blk.area, paving: mpArea(paveAll) + (fire ? mpArea(fire.mp) : 0), green: mpArea(green), play: play.reduce((t, q) => t + q.area, 0), paths: mpArea(pathsIn) },
    };
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
  // stilobat tomi maysasi (y.z) yer yashil hududi hisobiga kirmaydi (ehtiyot: 86-band «yashil hudud» — yer sathida); maydonchalari — 4-jadvalda
  for (const y of yards) { if (greenBlocks.has(y.block)) continue; if (y.z || y.social) continue; yardGreen += y.areas.green; const pp = y.areas.play + y.areas.paths; yardPlay += pp <= 0.3 * y.areas.block ? pp : 0.3 * y.areas.block; }
  const counted = blocksGreen + yardGreen + yardPlay;
  return { blocksGreen, yardGreen, yardPlay, counted, base, share: base > 0 ? counted / base : 0, trees: yards.reduce((t, y) => t + y.trees.length, 0) };
}

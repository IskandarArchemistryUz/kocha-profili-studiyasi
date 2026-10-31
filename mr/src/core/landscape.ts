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
const RES_USES = new Set(['turar', 'aralash']);

export interface Entry { kind: 'arka' | 'oraliq' | 'podyezd'; p: XY; d: XY; w?: number }
export interface Yard {
  /** kvartal indeksi (computePlan blocks) */
  block: number;
  paving: XY[][][]; green: XY[][][]; paths: XY[][][];
  play: { kind: keyof typeof PLAY_NORM; ring: XY[]; need: number; area: number }[];
  trees: XY[];
  /** hovliga kirishlar (genplanda): arka, binolar oraligʻi (torets orasidan), podyezd — p nuqta, d hovli tomon yoʻnalish (birlik) */
  entries?: Entry[];
  /** yongʻin-qutqaruv yoʻlagi hovlida (faqat kerak boʻlsa): lane — qoplama, w — eni, d — devorgacha (ichki chetidan), hmax — eng baland bino */
  fire?: { lane: XY[][][]; w: number; d: number; hmax: number; area: number };
  /** past qavatli uylar uchastkalari chegarasi (devor / panjara) — 31.10 */
  fences?: XY[][];
  /** sport hududi inshootlari (31.10): stadion, maydonlar, basseyn, yopiq majmua */
  sport?: SportItem[];
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
  const sig = (r: XY[]) => r.map(p => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`).join(';');
  const parkAll = doc.garages.filter(g => g.kind === 'yer_usti' && g.stalls?.length).map(g => ({ g, h: hull([...g.stalls!, ...(g.aisles ?? [])].flat().map(fr.toLocal)) }));
  plan.blocks.forEach((blk, bi) => {
    const bsig = `${blk.use}|${blk.rings.map(sig).join('/')}`;
    if (blk.use === 'yashil' || blk.use === 'maydon' || blk.use === 'sport') { const y = cached(`o|${bsig}`, () => openSpace(blk, bi)); if (y) out.push({ ...y, block: bi }); return; }
    if (!RES_USES.has(blk.use)) return;
    const inBlk = (x: Own) => pointIn(x.r.reduce((s, p) => [s[0] + p[0] / x.r.length, s[1] + p[1] / x.r.length] as XY, [0, 0] as XY), blk.rings);
    const own = bl.filter(x => inBlk(x) && !x.b.z0), arches = bl.filter(x => x.b.gen?.kind === 'arka' && inBlk(x));
    if (!own.length) return;
    // 31.10: past qavatli uylar (uchastkali) — oʻz hovlisi: bogʻ, kirish yoʻlagi, avtomobil joyi, panjara, daraxtlar
    if (own.every(x => x.b.gen?.plot)) { const y = cached(`l|${bsig}|${own.map(x => sig(x.r)).join('#')}`, () => lowYard(blk, bi, own, fr)); if (y) out.push({ ...y, block: bi }); return; }
    // 27.10 yengillik: kvartal hovlisi faqat shu kvartal binolari, avtoturargohi yoki shakli oʻzgarsa qayta hisoblanadi
    const parkIn = parkAll.filter(p => p.h.length && pointIn(p.h.reduce((a, q) => [a[0] + q[0] / p.h.length, a[1] + q[1] / p.h.length] as XY, [0, 0] as XY), blk.rings));
    const key = `r|${bsig}|${arches.map(x => sig(x.r)).join('#')}|${doc.settings.m2PerPerson}|${doc.settings.netToGross}|${own.map(x => `${x.b.floors},${x.b.nonRes},${x.b.use},${sig(x.r)}`).join('#')}|${parkIn.map(p => sig(p.h)).join('#')}`;
    const y0 = cached(key, () => { const y = yardOf(blk, bi, own, parkIn.map(p => [close(p.h)] as Polygon), doc, arches); if (y) y.entries = entriesOf(blk.rings[0], own, arches); return y; });
    if (y0) out.push({ ...y0, block: bi });
  });
  return out;
}
/**
 * Past qavatli uylar hovlisi (31.10, «past-qavatli-uylar-qoidalari»): har uchastka — bogʻ (uy va oldi yoʻlagidan tashqari);
 * oldi: uydan qizil chiziqqacha kirish yoʻlagi 1,4 m va avtomobil joyi 3 × 5,5 m (misollar: avtomobil oldi hovlida);
 * orqa bogʻda 1–2 daraxt chegaradan ≥ 1,5 m (96-band: 1–3 m); uchastka chegarasi — panjara; uchastkalardan tashqari qism — umumiy yashil.
 */
function lowYard(blk: { rings: XY[][]; area: number }, bi: number, own: Own[], fr: { toLocal: (p: [number, number]) => XY }): Yard | null {
  const B: Polygon = blk.rings.map(close);
  const plots = own.map(x => ({ x, plot: x.b.gen!.plot!.map(p => fr.toLocal(p)) }));
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
  const houses = own.map(x => [close(x.r)] as Polygon);
  const pavMP = pave.length ? tryOp(() => polygonClipping.intersection(polygonClipping.union(pave[0], ...pave.slice(1)), B), [] as MultiPolygon) : [];
  const green = tryOp(() => polygonClipping.difference(B, ...houses, ...(pavMP.length ? [pavMP] : [])), [] as MultiPolygon);
  return { block: bi, paving: toMP(pavMP), green: toMP(green), paths: [], play: [], trees, fences, entries: [], areas: { block: blk.area, paving: mpArea(pavMP), green: mpArea(green), play: 0, paths: 0 } };
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
function fireLane(own: Own[], free: MultiPolygon, fh: number, arches: Own[] = [], B?: Polygon): { mp: MultiPolygon; w: number; d: number; hmax: number; tall: Own[] } | null {
  const H = (x: Own) => (x.b.floors + (x.b.z0 ?? 0)) * fh;
  const tall = own.filter(x => x.b.floors > 0 && useDef(x.b.use).res > 0 && H(x) >= 28);
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
  mp = mp.filter(p => area(open(p[0])) >= w * 12);   // mayda boʻlaklar — yoʻlak emas
  return { mp, w, d, hmax, tall: all };   // tall — daraxt cheklovi uchun: yoʻlak butun halqa boʻylab   // mp boʻsh — hovlida joy yetmadi (meʼyorlar roʻyxatida «mos emas»)
}

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
function yardOf(blk: ReturnType<typeof computePlan>['blocks'][number], bi: number, own: Own[], park: Polygon[], doc: Project, arches: Own[] = []): Yard | null {
    const B: Polygon = blk.rings.map(close);
    const fp = safeUnion(own.map(x => [close(x.r)] as Polygon));
    // binolar atrofidagi 3 m trotuar
    const ring3 = safeUnion(own.flatMap(x => corridor([...x.r, x.r[0]], 3)));
    const paveAll = tryOp(() => polygonClipping.intersection(polygonClipping.difference(ring3, fp), B), [] as MultiPolygon);
    // yer usti avtoturargoh (joylar va boʻlaklar) — hovli maydonchalari uning ustiga tushmaydi
    let free = tryOp(() => polygonClipping.difference(B, fp, paveAll, ...park), [] as MultiPolygon);
    // yongʻin-qutqaruv yoʻlagi: maydonchalar va maysa unga tushmaydi
    const fire = fireLane(own, free, doc.settings.floorHeight, arches, B);
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
  for (const y of yards) { if (greenBlocks.has(y.block)) continue; yardGreen += y.areas.green; const pp = y.areas.play + y.areas.paths; yardPlay += pp <= 0.3 * y.areas.block ? pp : 0.3 * y.areas.block; }
  const counted = blocksGreen + yardGreen + yardPlay;
  return { blocksGreen, yardGreen, yardPlay, counted, base, share: base > 0 ? counted / base : 0, trees: yards.reduce((t, y) => t + y.trees.length, 0) };
}

/**
 * Reja geometriyasi: koʻcha koridorlari (qizil chiziqlar orasi) va kvartallar = uchastka − koridorlar.
 * Hujjatda faqat koʻcha oʻqi va profili saqlanadi; kvartallar har safar shu yerda hisoblanadi.
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import type { Project, Use } from './doc';
import { frame, type XY } from './geo';
import { profileById, profileWidth } from './profiles';

/** Rejaning birligi: butun kvartal yoki uning parseli. grp — generator guruhi (parsel id si yoki kvartal belgisi id si) */
export interface Block { rings: XY[][]; area: number; use: Use; labelId: string | null; centroid: XY; parcelId?: string; blockKey: number }
export interface PlanGeo { corridors: XY[][][]; corridorArea: number; blocks: Block[] }

const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
const open = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]] as XY);

/** Siniq chiziq atrofidagi koridor (segment toʻrtburchaklari + boʻgʻinlarda doira), toʻgʻri uchlar */
export function corridor(axis: XY[], half: number): MultiPolygon {
  // burchaklari kesishgan (miter) yaxlit koʻpburchak — qizil chiziqlar toʻgʻri burchakli; oʻz-oʻzini kessa polygon-clipping normallashtiradi
  if (axis.length >= 2) {
    try {
      const L = offsetLine(axis, half), Rr = offsetLine(axis, -half).reverse();
      const ring = [...L, ...Rr]; if (ring.length >= 3) { const u = polygonClipping.union([close(ring)]); if (u.length) return u; }
    } catch { /* zaxira: toʻrtburchak + doira */ }
  }
  const parts: Polygon[] = [];
  for (let i = 1; i < axis.length; i++) {
    const a = axis[i - 1], b = axis[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 0.01) continue;
    const nx = -dy / L * half, ny = dx / L * half;
    parts.push([close([[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]])]);
    // boʻgʻin doirasi: uchlari toʻrtburchak burchaklari bilan ustma-ust tushmasin (polygon-clipping aniqligi uchun)
    if (i < axis.length - 1) { const c: XY[] = []; for (let k = 0; k < 24; k++) { const t = (k + 0.37) / 24 * Math.PI * 2; c.push([b[0] + Math.cos(t) * half * 1.003, b[1] + Math.sin(t) * half * 1.003]); } parts.push([close(c)]); }
  }
  if (!parts.length) return [];
  return safeUnion(parts);
}

/** Qizil chiziq: oʻqdan ±d siljigan siniq chiziq (boʻgʻinlarda burchak kesishmasi, oʻtkir burchakda cheklangan) */
export function offsetLine(axis: XY[], d: number): XY[] {
  const n = axis.length, out: XY[] = [];
  const nrm = (a: XY, b: XY): XY => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
  for (let i = 0; i < n; i++) {
    const n0 = i > 0 ? nrm(axis[i - 1], axis[i]) : null, n1 = i < n - 1 ? nrm(axis[i], axis[i + 1]) : null;
    let m: XY = n0 && n1 ? [n0[0] + n1[0], n0[1] + n1[1]] : (n0 ?? n1)!;
    const ml = Math.hypot(m[0], m[1]) || 1; m = [m[0] / ml, m[1] / ml];
    const cos = n0 && n1 ? Math.max(0.35, m[0] * n0[0] + m[1] * n0[1]) : 1;
    out.push([axis[i][0] + m[0] * d / cos, axis[i][1] + m[1] * d / cos]);
  }
  return out;
}

/** Koʻchalar koridorlari birlashmasining konturlari (qizil chiziqlar): chorrahada kesishmaydi, T-ulanishda uzilib ulanadi */
export function corridorOutlines(list: { axis: XY[]; half: number }[], cutters: { axis: XY[]; half: number }[] = []): XY[][] {
  const corr = list.map(s => corridor(s.axis, s.half)).filter(m => m.length);
  if (!corr.length) return [];
  let u = safeUnion(corr);
  // mavjud (OSM) yoʻllar zonasi (qatnov + trotuar) koridorlardan olib tashlanadi — qizil chiziq yoʻl chetida tugaydi, uni kesib oʻtmaydi
  const cut = cutters.map(c => corridor(c.axis, c.half)).filter(m => m.length);
  if (cut.length) { try { u = polygonClipping.difference(u, safeUnion(cut)); } catch { /* aniqlik xatosi — kesilmagan kontur */ } }
  return u.flatMap(p => p.map(open)).filter(r => r.length >= 3);
}

/** Birlashtirish; aniqlik xatosida — bittadan qoʻshib, muammoli boʻlakni biroz kattalashtirib qayta */
export function safeUnion(parts: (Polygon | MultiPolygon)[]): MultiPolygon {
  try { return polygonClipping.union(parts[0] as Polygon, ...(parts.slice(1) as Polygon[])); }
  catch {
    let acc: MultiPolygon = [];
    for (const p of parts) {
      try { acc = acc.length ? polygonClipping.union(acc, p as Polygon) : polygonClipping.union(p as Polygon); }
      catch { try { acc = acc.length ? polygonClipping.union(acc, jitter(p)) : jitter(p); } catch { /* boʻlak tashlab ketildi */ } }
    }
    return acc;
  }
}
const jr = (r: [number, number][]) => r.map(([x, y]) => [x + 1e-4 * Math.sin(y * 7), y + 1e-4 * Math.cos(x * 7)] as [number, number]);
const jitter = (p: Polygon | MultiPolygon): MultiPolygon => typeof (p as Polygon)[0][0][0] === 'number' ? [(p as Polygon).map(jr)] : (p as MultiPolygon).map(q => q.map(jr));

/** ikki halqaning umumiy chegara uzunligi (taxminiy: birinchi halqa segmentlari oʻrtasi ikkinchisiga ≤ 5 sm) */
function sharedLen(A: XY[], B: XY[]): number {
  const dSeg = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t); };
  const dRing = (p: XY) => { let m = Infinity; for (let i = 0; i < B.length; i++) m = Math.min(m, dSeg(p, B[i], B[(i + 1) % B.length])); return m; };
  let t = 0;
  for (let i = 0; i < A.length; i++) { const a = A[i], b = A[(i + 1) % A.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue; const n = Math.max(1, Math.ceil(L / 2)); let on = 0; for (let k = 0; k < n; k++) { const q: XY = [a[0] + (b[0] - a[0]) * (k + 0.5) / n, a[1] + (b[1] - a[1]) * (k + 0.5) / n]; if (dRing(q) < 0.05) on++; } t += L * on / n; }
  return t;
}
const ringArea = (r: XY[]) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; };

export function pointIn(p: XY, rings: XY[][]): boolean {
  const inR = (r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  return inR(rings[0]) && !rings.slice(1).some(inR);
}

/** Koʻpburchak ichidagi nuqta (markaz tashqarida boʻlsa — gorizontal kesim oʻrtasi) */
export function interiorPoint(rings: XY[][]): XY {
  const r = rings[0]; let cx = 0, cy = 0; r.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= r.length; cy /= r.length;
  if (pointIn([cx, cy], rings)) return [cx, cy];
  const xs: number[] = [];
  for (const rr of rings) for (let i = 0, j = rr.length - 1; i < rr.length; j = i++) if ((rr[i][1] > cy) !== (rr[j][1] > cy)) xs.push(rr[i][0] + (cy - rr[i][1]) / (rr[j][1] - rr[i][1]) * (rr[j][0] - rr[i][0]));
  xs.sort((a, b) => a - b);
  return xs.length >= 2 ? [(xs[0] + xs[1]) / 2, cy] : [cx, cy];
}

/** 27.10 yengillik: bir oʻzgarishda 5+ joydan chaqiriladi — natija faqat uchastka, koʻchalar, zonalar, parsellar yoki markaz oʻzgarsa qayta hisoblanadi */
let planMemo: { k: unknown[]; v: PlanGeo } | null = null;
export function computePlan(doc: Project): PlanGeo {
  const k = [doc.site, doc.streets, doc.zones, doc.parcels, doc.origin];
  if (planMemo && planMemo.k.every((x, i) => x === k[i])) return planMemo.v;
  const v = computePlanRaw(doc); planMemo = { k, v }; return v;
}
function computePlanRaw(doc: Project): PlanGeo {
  const fr = frame(doc.origin);
  const corr: MultiPolygon[] = doc.streets.map(s => corridor(s.axis.map(fr.toLocal), profileWidth(profileById(s.profile)) / 2)).filter(m => m.length);
  const corrU: MultiPolygon = corr.length ? safeUnion(corr) : [];
  if (!doc.site) return { corridors: corrU.map(p => p.map(open)), corridorArea: 0, blocks: [] };
  const site: Polygon = doc.site.rings.map(r => close(r.map(fr.toLocal)));
  const tryOp = <T>(f: () => T, fb: T): T => { try { return f(); } catch { return fb; } };
  const inSite = corrU.length ? tryOp(() => polygonClipping.intersection(site, corrU), []) : [];
  const blocksMP = corrU.length ? tryOp(() => polygonClipping.difference(site, corrU), [site]) : [site];
  const area = (mp: MultiPolygon) => mp.reduce((s, p) => s + p.reduce((t, r, k) => t + (k ? -1 : 1) * Math.abs(ringArea(open(r))), 0), 0);
  const labels = doc.zones.map(z => ({ z, p: fr.toLocal(z.at) }));
  const whole = blocksMP.map(p => {
    const rings = p.map(open);
    const a = Math.abs(ringArea(rings[0])) - rings.slice(1).reduce((s, h) => s + Math.abs(ringArea(h)), 0);
    const lab = labels.find(l => pointIn(l.p, rings));
    return { rings, area: a, use: lab?.z.use ?? 'turar', labelId: lab?.z.id ?? null, centroid: interiorPoint(rings), blockKey: 0 } as Block;
  }).filter(b => b.area > 20).sort((a, b) => b.area - a.area);
  whole.forEach((b, i) => { b.blockKey = i; });
  // parsellarga boʻlingan kvartallar — parsellar bilan almashtiriladi (kvartal chegarasiga qirqib)
  const blocks: Block[] = [];
  for (const b of whole) {
    const ps = b.labelId ? doc.parcels.filter(p => p.block === b.labelId) : [];
    if (!ps.length) { blocks.push(b); continue; }
    const bp: Polygon = b.rings.map(close), got: { p: typeof ps[number]; poly: Polygon }[] = [];
    for (const p of ps) {
      let mp: MultiPolygon = [];
      try { mp = polygonClipping.intersection(p.rings.map(r => close(r.map(fr.toLocal))), bp); } catch { continue; }
      for (const q of mp) { const rings = q.map(open), a = Math.abs(ringArea(rings[0])) - rings.slice(1).reduce((s, h) => s + Math.abs(ringArea(h)), 0); if (a > 20) got.push({ p, poly: q }); }
    }
    // koʻcha siljiganda kvartal kengaygan boʻlsa (30.10): parsellar qoplamagan boʻlaklar eng uzun umumiy chegarali qoʻshni parselga qoʻshiladi — kvartal ichi ochiq qolmaydi
    try {
      const rest = polygonClipping.difference(bp, ...got.map(g => g.poly));
      // parsellar orasidagi ichki chegaralar boʻsh boʻlak boʻylab davom ettiriladi (kesish chiziqlari) — boʻlak parsellar orasida toʻgʻri boʻlinadi
      const cuts: [XY, XY][] = [];
      const near = (p: XY, R: XY[]) => { for (let i = 0; i < R.length; i++) { const a2 = R[i], b2 = R[(i + 1) % R.length], dx = b2[0] - a2[0], dy = b2[1] - a2[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a2[0]) * dx + (p[1] - a2[1]) * dy) / L2)); if (Math.hypot(p[0] - a2[0] - dx * t, p[1] - a2[1] - dy * t) < 0.05) return true; } return false; };
      got.forEach((g, i) => { const R = g.poly[0].slice(0, -1) as XY[];
        for (let k = 0; k < R.length; k++) { const v = R[k];
          for (const w of [R[(k + 1) % R.length], R[(k - 1 + R.length) % R.length]]) {
            const mid: XY = [(v[0] + w[0]) / 2, (v[1] + w[1]) / 2];
            // v — boshqa parsel bilan umumiy chegaraning uchi (segment oʻrtasi ham qoʻshnida), v esa kvartal ichida emas — eski chegarada
            if (got.some((o, j) => j !== i && near(mid, o.poly[0] as XY[]) && near(v, o.poly[0] as XY[]))) { const L = Math.hypot(v[0] - w[0], v[1] - w[1]) || 1; cuts.push([v, [(v[0] - w[0]) / L, (v[1] - w[1]) / L]]); }
          } } });
      let pieces: Polygon[] = rest.map(x => x);
      for (const [v, dir] of cuts) {
        const n: XY = [-dir[1], dir[0]], far = 1e4, H = (sg: number): Polygon => [[[v[0] - dir[0] * far + n[0] * sg * far, v[1] - dir[1] * far + n[1] * sg * far], [v[0] + dir[0] * far + n[0] * sg * far, v[1] + dir[1] * far + n[1] * sg * far], [v[0] + dir[0] * far, v[1] + dir[1] * far], [v[0] - dir[0] * far, v[1] - dir[1] * far], [v[0] - dir[0] * far + n[0] * sg * far, v[1] - dir[1] * far + n[1] * sg * far]]];
        const next: Polygon[] = [];
        for (const pc of pieces) { if (!near(v, pc[0] as XY[])) { next.push(pc); continue; } for (const sg of [1, -1]) for (const q of polygonClipping.intersection(pc, H(sg))) next.push(q); }
        pieces = next;
      }
      for (const piece of pieces) {
        const a = Math.abs(ringArea(piece[0].slice(0, -1) as XY[])); if (a < 1 || !got.length) continue;
        let best = -1, bl = 0;
        got.forEach((g, i) => { const l = sharedLen(piece[0] as XY[], g.poly[0] as XY[]); if (l > bl) { bl = l; best = i; } });
        if (best < 0) continue;
        const u = polygonClipping.union(got[best].poly, piece);
        if (u.length === 1) got[best].poly = u[0];
      }
    } catch { /* kesish xatosi — parsellar oʻzgarmaydi */ }
    for (const g of got) {
      const rings = g.poly.map(open), a = Math.abs(ringArea(rings[0])) - rings.slice(1).reduce((s, h) => s + Math.abs(ringArea(h)), 0);
      if (a > 20) blocks.push({ rings, area: a, use: g.p.use, labelId: b.labelId, centroid: interiorPoint(rings), parcelId: g.p.id, blockKey: b.blockKey });
    }
  }
  return { corridors: corrU.map(p => p.map(open)), corridorArea: area(inSite), blocks };
}

/** Butun kvartal (parsellarsiz) — blockKey boʻyicha */
export function computeWhole(doc: Project, key: number): { rings: XY[][]; centroid: XY } | null {
  const d = { ...doc, parcels: [] }, b = computePlan(d).blocks.find(x => x.blockKey === key);
  return b ? { rings: b.rings, centroid: b.centroid } : null;
}

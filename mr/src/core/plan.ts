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

export function computePlan(doc: Project): PlanGeo {
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
    const bp: Polygon = b.rings.map(close);
    for (const p of ps) {
      let mp: MultiPolygon = [];
      try { mp = polygonClipping.intersection(p.rings.map(r => close(r.map(fr.toLocal))), bp); } catch { continue; }
      for (const q of mp) {
        const rings = q.map(open), a = Math.abs(ringArea(rings[0])) - rings.slice(1).reduce((s, h) => s + Math.abs(ringArea(h)), 0);
        if (a > 20) blocks.push({ rings, area: a, use: p.use, labelId: b.labelId, centroid: interiorPoint(rings), parcelId: p.id, blockKey: b.blockKey });
      }
    }
  }
  return { corridors: corrU.map(p => p.map(open)), corridorArea: area(inSite), blocks };
}

/** Butun kvartal (parsellarsiz) — blockKey boʻyicha */
export function computeWhole(doc: Project, key: number): { rings: XY[][]; centroid: XY } | null {
  const d = { ...doc, parcels: [] }, b = computePlan(d).blocks.find(x => x.blockKey === key);
  return b ? { rings: b.rings, centroid: b.centroid } : null;
}

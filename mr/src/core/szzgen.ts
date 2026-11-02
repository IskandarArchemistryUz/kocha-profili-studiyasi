/**
 * Cheklovlar 3b (02.11): generator SMZ ichiga taqiqlangan funksiyani qoʻymaydi; SMZ koʻkalamzorligi.
 *
 * Asl matn (egasining normalar papkasi, SanPiN RUz № 0350-17):
 *  - 2.17 — SMZ ichida turar joy, MTM, taʼlim, sport, parklar … joylashtirilmaydi (ilovada SZZ_DENY);
 *  - 2.19 — «Санитарно-защитная зона для предприятий IV, V классов должна быть максимально озеленена (не менее 60% площадки);
 *    для предприятий II и III класса — не менее 50%; для предприятий I класса и зон большой протяженности — не менее 40% ее
 *    территории». Avtomagistral qatnov qismi koʻkalamzorlik foizini kamaytirishga asos boʻlmaydi — shuning uchun koʻcha koridorlari
 *    hisob maydonidan chiqarilmaydi.
 * ShNQ 2.07.01-23, 146 — ishlab chiqarish zonasi SMZ ida turar joy va ijtimoiy binolar yoʻq (prodcheck.DENY_146).
 * Koʻkalam deb «Himoya koʻkalamzorligi (SMZ)» va «Park / bogʻ» kvartallari olinadi (TALQIN: hovli maysasi va koʻcha tasmalari
 * hisobga olinmaydi). Qabriston SMZ i uchun 2.19 ni qoʻllash — TALQIN (matn korxonalar haqida).
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import type { Project } from './doc';
import { frame, type XY } from './geo';
import { limitZones, bufferLocal } from './limits';
import { szzVerdict } from './limitcheck';
import { prodChecks, DENY_146 } from './prodcheck';
import { computePlan } from './plan';
import { useDef, type Use } from './uses';
import type { GenSection } from './generator';

const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
const open = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]]);
const ringA = (r: [number, number][]) => { let a = 0; for (let i = 1; i < r.length; i++) a += r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]; return Math.abs(a) / 2; };
export const mpArea = (mp: MultiPolygon) => mp.reduce((t, p) => t + ringA(p[0]) - p.slice(1).reduce((u, h) => u + ringA(h), 0), 0);
const tryMP = (f: () => MultiPolygon, d: MultiPolygon): MultiPolygon => { try { return f(); } catch { return d; } };

/** Funksiya uchun taqiqlangan SMZ hududi (mahalliy metr): cheklov obyektlari SMZ (2.17) + ishlab chiqarish SMZ (146); own — shu kvartalning oʻzi (ishlab chiqarish kvartalining oʻz SMZ i oʻziga taqiq emas) */
export function denyZone(doc: Project, use: Use): MultiPolygon {
  const parts: MultiPolygon[] = [];
  if (szzVerdict(use) === 'deny') for (const s of limitZones(doc).soft) parts.push(s.polys.map(p => p.map(close)) as MultiPolygon);
  if (DENY_146.includes(use) || useDef(use).res > 0) for (const z of prodChecks(doc).zones) {
    const own: Polygon = z.rings.map(close);
    parts.push(tryMP(() => polygonClipping.difference(bufferLocal(z.rings[0], z.szz, true), own), []));
  }
  const nz = parts.filter(p => p.length); if (!nz.length) return [];
  return tryMP(() => polygonClipping.union(nz[0], ...nz.slice(1)), nz.flat());
}

/**
 * Generatsiya natijasini SMZ dan tozalash: uchastkali uy — uchastkasi SMZ ga tegsa olinadi; seksiya — SMZ dan tashqaridagi eng katta
 * qismi qoladi (≥ 120 m² va asl maydonning ≥ 50 % i), aks holda olinadi. Qirqilgan seksiyada derazasiz torets va dok belgilari tushiriladi.
 */
export function clipToSzz(sections: GenSection[], deny: MultiPolygon, notes: string[]): GenSection[] {
  if (!deny.length) return sections;
  let cut = 0, gone = 0; const out: GenSection[] = [];
  for (const s of sections) {
    const shape: Polygon = [close(s.plot ?? s.ring)];
    const hit = mpArea(tryMP(() => polygonClipping.intersection(shape, deny), []));
    if (hit < 1) { out.push(s); continue; }
    if (s.plot) { gone++; continue; }
    const a0 = ringA(close(s.ring)), rest = tryMP(() => polygonClipping.difference([close(s.ring)], deny), []).sort((p, q) => ringA(q[0]) - ringA(p[0]))[0];
    if (!rest || ringA(rest[0]) < Math.max(120, 0.5 * a0)) { gone++; continue; }
    const { blind: _b, docks: _d, face: _f, ...base } = s;
    out.push({ ...base, ring: open(rest[0]) }); cut++;
  }
  if (gone) notes.push(`${gone} ta bino SMZ ichiga tushgani uchun qoʻyilmadi (SanPiN 0350-17, 2.17; ShNQ 2.07.01-23, 146)`);
  if (cut) notes.push(`${cut} ta seksiya SMZ chegarasi boʻyicha qisqartirildi (SanPiN 0350-17, 2.17)`);
  return out;
}

export interface SzzGreen { id: string; label: string; cls: string; need: number; area: number; green: number; share: number; rings: XY[][] }
const needOf = (cls?: string) => cls === 'I' ? 0.4 : cls === 'II' || cls === 'III' ? 0.5 : 0.6;
/** ishlab chiqarish SMZ masofasidan sinf (SanPiN 0350-17: I — 1000, II — 500, III — 300, IV — 100, V — 50 m) */
const clsOfM = (m: number) => m >= 1000 ? 'I' : m >= 500 ? 'II' : m >= 300 ? 'III' : m >= 100 ? 'IV' : 'V';

let memo: { k: unknown[]; v: SzzGreen[] } | null = null;
/** 2.19: har SMZ ning uchastka ichidagi qismi va undagi koʻkalam ulushi */
export function szzGreen(doc: Project): SzzGreen[] {
  const k = [doc.limits, doc.site, doc.origin, doc.zones, doc.parcels, doc.streets];
  if (memo && memo.k.every((x, i) => x === k[i])) return memo.v;
  const v = raw(doc); memo = { k, v }; return v;
}
function raw(doc: Project): SzzGreen[] {
  if (!doc.site) return [];
  const fr = frame(doc.origin), site: Polygon = doc.site.rings.map(r => close(r.map(fr.toLocal))), plan = computePlan(doc);
  const greenMP = plan.blocks.filter(b => b.use === 'himoya' || b.use === 'yashil').map(b => b.rings.map(close) as Polygon);
  const out: SzzGreen[] = [];
  const add = (id: string, label: string, cls: string, mp: MultiPolygon) => {
    const zone = tryMP(() => polygonClipping.intersection(mp, site), []), area = mpArea(zone); if (area < 50) return;
    const green = greenMP.reduce((t, g) => t + mpArea(tryMP(() => polygonClipping.intersection(zone, g), [])), 0);   // yashil kvartallar bir-birini qoplamaydi
    out.push({ id, label, cls, need: needOf(cls), area, green, share: area ? green / area : 0, rings: zone.map(p => open(p[0])) });
  };
  for (const s of limitZones(doc).soft) add(s.id, s.kind, s.cls ?? 'IV', s.polys.map(p => p.map(close)) as MultiPolygon);
  for (const z of prodChecks(doc).zones) add(`prod${z.block}`, z.use, clsOfM(z.szz), tryMP(() => polygonClipping.difference(bufferLocal(z.rings[0], z.szz, true), z.rings.map(close) as Polygon), []));
  return out;
}

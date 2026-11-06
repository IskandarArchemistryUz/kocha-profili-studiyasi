/**
 * Cheklovlar boʻyicha meʼyoriy tekshiruvlar (02.11, cheklovlar 3-bosqichi) — sof funksiyalar, reyestr (norms/rules.ts) uchun.
 *
 * Asl matn (egasining normalar papkasi):
 *  - SanQvaN 0103-25, 12-band: SMZ da aholi turar joylari; oziq-ovqat ishlab chiqaruvchi korxonalar, oziq-ovqat omborxonalari, ichimlik
 *    suvi inshootlari; ijtimoiy soha obyektlari (MTM, taʼlim va sogʻliqni saqlash muassasalari), aholi dam olish joylari, sport inshootlari
 *    joylashtirilmaydi.
 *  - 14-band: SMZ ga xavflilik sinfi past obyektlar; obyekt tarkibidagi oʻquv binolari, ishlab chiqarishga taalluqli savdo, umumiy
 *    ovqatlanish, poliklinika va ilmiy-tadqiqot laboratoriyalari joylashtiriladi.
 *  - Qabriston SMZ i — VM 101-son qarori, 1-ilova, 50-band (06.11, c63): «SҲZ ҳудудида бирор-бир турар жой ва жамоат биноларини
 *    қуриш тақиқланади» — 12-band roʻyxati bilan birga tekshiriladi (NORMA). AMALIYOT zonasi qolsa — taqiq «koʻrib chiqish» ga tushiriladi.
 *  - VMQ № 1050, 14-band (muhofaza zonasi), 17-band (zonada bino qurish — egasining yozma roziligi bilan).
 *  - ShNQ 2.07.01-23, 251-band: 35 kV va undan yuqori havo ELU turar joy hududlaridan tashqarida oʻtkaziladi; 253-band —
 *    rekonstruksiyada chiqarish yoki kabelga almashtirish.
 */
import polygonClipping, { type Polygon } from 'polygon-clipping';
import type { Project } from './doc';
import { frame, type XY } from './geo';
import { limitZones, eluZone, szzOf, suvZones, limitAreaHa, bufferLocal, isActive, SZZ_DENY, SZZ_ALLOW, SZZ_FOOD_LOGI, type LimitKind } from './limits';
import { computePlan } from './plan';
import { useDef, type Use } from './uses';

const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [p[0], p[1]]);
const ringArea = (r: [number, number][]) => { let a = 0; for (let i = 1; i < r.length; i++) a += r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]; return Math.abs(a) / 2; };
const mpArea = (mp: [number, number][][][]) => mp.reduce((t, p) => t + ringArea(p[0]) - p.slice(1).reduce((u, h) => u + ringArea(h), 0), 0);
/** kesishma maydoni, m² (xato geometriya — 0) */
function overlap(a: Polygon, polys: XY[][][]): number {
  let t = 0;
  for (const p of polys) { try { t += mpArea(polygonClipping.intersection(a, p.map(close)) as [number, number][][][]); } catch { /* */ } }
  return t;
}

export type SzzVerdict = 'deny' | 'review' | 'allow';
/** Funksiya SMZ ichida: 0103-25, 12-band — taqiq; 14-band — ruxsat; roʻyxatda yoʻq — koʻrib chiqish */
export function szzVerdict(u: Use, logi?: string): SzzVerdict { return SZZ_DENY.includes(u) || (u === 'logistika' && !!logi && SZZ_FOOD_LOGI.includes(logi)) ? 'deny' : SZZ_ALLOW.includes(u) ? 'allow' : 'review'; }

export interface SzzHit { bid: string; use: Use; limit: string; kind: LimitKind; m: number; cls?: string; area: number; verdict: SzzVerdict; /** AMALIYOT zonasida (qabriston) — 12-band taqiqi qoʻllanmaydi */ amal?: boolean }
export interface EluHit { bid: string; limit: string; kv: number; m: number; area: number }
export interface Elu251 { limit: string; kv: number; blocks: number }
export interface Manual { limit: string; kind: LimitKind; m: number; table: number }
/** 04.11 (audit): SMZ ga tushgan taqiqli funksiyali kvartal/parsellar (park, sport, turar joy …) — binosiz ham */
export interface SzzBlockHit { block: number; use: Use; limit: string; area: number; rings: XY[][]; amal?: boolean }
/** 04.11: suvni muhofaza qilish zonasidagi bino (981-son nizom) va qirgʻoq boʻyi mintaqasiga tushgan bino */
export interface SuvHit { bid: string; limit: string; m: number; area: number; shore: boolean }
export interface LimitChecks { szz: SzzHit[]; szzBlocks: SzzBlockHit[]; elu: EluHit[]; elu251: Elu251[]; manual: Manual[]; suv: SuvHit[]; suvRings: XY[][]; any: boolean; zoneRings: XY[][] }

let memo: { k: unknown[]; v: LimitChecks } | null = null;
export function limitChecks(doc: Project): LimitChecks {
  const k = [doc.limits, doc.buildings, doc.site, doc.origin, doc.streets, doc.zones, doc.parcels];
  if (memo && memo.k.every((x, i) => x === k[i])) return memo.v;
  const v = raw(doc); memo = { k, v }; return v;
}

function raw(doc: Project): LimitChecks {
  const ls = doc.limits ?? [], out: LimitChecks = { szz: [], szzBlocks: [], elu: [], elu251: [], manual: [], suv: [], suvRings: [], any: ls.length > 0, zoneRings: [] };
  if (!ls.length || !doc.site) return out;
  const fr = frame(doc.origin), z = limitZones(doc);
  const fps = doc.buildings.map(b => ({ b, poly: [close(b.footprint.map(fr.toLocal))] as Polygon }));
  const plan0 = computePlan(doc), inBl = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  // logistika binosining turi (oziq-ovqat omborxonasi — 12-band taqiqi): bino turgan kvartal/parsel yorligʻidan
  const logiOf = (b: Project['buildings'][number]): string | undefined => { if (b.use !== 'logistika') return undefined; const r = b.footprint.map(fr.toLocal), c: XY = [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length]; const bl = plan0.blocks.find(k => inBl(c, k.rings[0])); return bl?.labelId ? doc.zones.find(q => q.id === bl.labelId)?.sub : undefined; };
  // 1) SMZ ichidagi binolar (12 / 14-band); AMALIYOT zonasi (qabriston) — taqiq «koʻrib chiqish» ga tushiriladi
  for (const s of z.soft) {
    out.zoneRings.push(...s.rings);
    const amal = s.flag === 'AMALIYOT';
    for (const { b, poly } of fps) {
      const a = overlap(poly, s.polys); if (a < 1) continue;
      const v = szzVerdict(b.use, logiOf(b));
      out.szz.push({ bid: b.id, use: b.use, limit: s.id, kind: s.kind, m: s.m, cls: s.cls, area: a, verdict: amal && v === 'deny' ? 'review' : v, ...(amal ? { amal: true } : {}) });
    }
    plan0.blocks.forEach((bl, i) => {
      // hudud boʻyicha taqiq (12-band): aholi dam olish joylari (park), sport inshootlari, turar joy (yakka uylar uchastkalari), taʼlim va sogʻliqni saqlash muassasalari hududi;
      // koʻp kvartirali turar joy — binolar boʻyicha (yuqorida)
      if (!['yashil', 'sport', 'yakka', 'maktab', 'mtm', 'poliklinika', 'ijtimoiy'].includes(bl.use)) return;
      const a = overlap(bl.rings.map(close) as Polygon, s.polys); if (a >= 10) out.szzBlocks.push({ block: i, use: bl.use, limit: s.id, area: a, rings: bl.rings, ...(amal ? { amal: true } : {}) });
    });
  }
  // 2) ELU muhofaza zonasidagi binolar (VMQ 1050, 14 va 17-band) va 3) ≥ 35 kV havo ELU turar joy kvartallari ustidan (ShNQ 251)
  const plan = computePlan(doc), resBlocks = plan.blocks.filter(b => useDef(b.use).res > 0);
  for (const l of ls) {
    if (l.kind !== 'elu' || !isActive(l) || !l.axis || l.axis.length < 2) continue;
    const ax = l.axis.map(fr.toLocal), zn = eluZone(l), kv = l.kv ?? 0;
    if (zn.m > 0) {
      const mp = bufferLocal(ax, zn.m, false).map(p => p.map(r => r.slice(0, -1).map(q => [q[0], q[1]] as XY)));
      out.zoneRings.push(...mp.map(p => p[0]));
      for (const { b, poly } of fps) { const a = overlap(poly, mp); if (a >= 1) out.elu.push({ bid: b.id, limit: l.id, kv, m: zn.m, area: a }); }
    }
    if (kv >= 35 && l.elu !== 'kabel') {
      // muhofaza zonasi kvartallardan ayirilgan — zona chetidan 2 m kengroq tekshiriladi (liniya turar joy hududi orqali oʻtadimi)
      const thin = bufferLocal(ax, zn.m + 2, false).map(p => p.map(r => r.slice(0, -1).map(q => [q[0], q[1]] as XY)));
      const n = resBlocks.filter(bl => thin.some(p => overlap([close(p[0])], [bl.rings]) > 1)).length;
      if (n) out.elu251.push({ limit: l.id, kv, blocks: n });
    }
  }
  // 3b) suv obyektlari (04.11): zonadagi binolar — koʻrib chiqish; qirgʻoq boʻyi mintaqasidagi binolar — taqiq
  for (const w of z.water) { out.suvRings.push(...w.rings); for (const { b, poly } of fps) { const a = overlap(poly, w.polys); if (a >= 1) out.suv.push({ bid: b.id, limit: w.id, m: w.m, area: a, shore: false }); } }
  for (const l of ls) {
    if (l.kind !== 'suv' || !isActive(l) || l.suv?.t === 'bezak') continue;   // 06.11 (c63): bezak suvi — zona yoʻq
    const line = !l.rings?.length && !!l.axis && l.axis.length >= 2, pts = line ? l.axis!.map(fr.toLocal) : l.rings?.[0]?.map(fr.toLocal); if (!pts) continue;
    const sh = suvZones(l).shore; if (sh.m <= 0 && line) continue;
    const mp = bufferLocal(pts, sh.m, !line).map(p => p.map(r => r.slice(0, -1).map(q => [q[0], q[1]] as XY)));
    out.suvRings.push(...mp.map(p => p[0]));
    for (const { b, poly } of fps) { const a = overlap(poly, mp); if (a >= 1) out.suv.push({ bid: b.id, limit: l.id, m: sh.m, area: a, shore: true }); }
  }
  // 4) qoʻlda kamaytirilgan bufer (jadvaldagidan kichik) — davlat sanitariya nazorati xulosasi kerak
  for (const l of ls) {
    if (!isActive(l) || l.szz == null || l.kind === 'suv') continue;   // suv — alohida qoida (water-981)
    const s = l.kind === 'elu' ? eluZone(l) : szzOf(l, limitAreaHa(l, doc.origin));
    if (s.table != null && s.m < s.table) out.manual.push({ limit: l.id, kind: l.kind, m: s.m, table: s.table });
  }
  return out;
}

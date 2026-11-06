/**
 * Cheklovlar 3b (02.11): generator SMZ ichiga taqiqlangan funksiyani qoʻymaydi; SMZ koʻkalamzorligi.
 *
 * Asl matn (egasining normalar papkasi, SanQvaN 0103-25):
 *  - 12-band — SMZ da aholi turar joylari, MTM, taʼlim, sogʻliqni saqlash, dam olish joylari, sport … joylashtirilmaydi (ilovada SZZ_DENY);
 *  - 13-band — «1-sinfga kiruvchi obyektlar SMZning 40 foizi, 2 va 3-sinflarga kiruvchi obyektlar SMZning 50 foizi, 4 va 5-sinflarga
 *    kiruvchi obyektlar SMZning 60 foizi koʻkalamzorlashtirilishi va obodonlashtirilishi kerak». Koʻcha koridorlari hisob maydonidan
 *    chiqarilmaydi (TALQIN; oldingi 0350-17, 2.19 dagi «avtomagistral foizni kamaytirmaydi» izohi 0103-25 da yoʻq).
 * ShNQ 2.07.01-23, 146 — ishlab chiqarish zonasi SMZ ida turar joy va ijtimoiy binolar yoʻq (prodcheck.DENY_146).
 * Koʻkalam deb «Himoya koʻkalamzorligi (SMZ)» va «Park / bogʻ» kvartallari olinadi (TALQIN: hovli maysasi va koʻcha tasmalari
 * hisobga olinmaydi). Qabriston SMZ i (VM 101, 50-band) — 13-band 1-ilova obyektlari uchun, qabriston u yerda yoʻq: foiz hisoblanadi, lekin «mos emas» berilmaydi (amal).
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import type { Project } from './doc';
import { frame, type XY } from './geo';
import { limitZones, bufferLocal, SZZ_DENY, QAB100_DENY } from './limits';
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

/** Funksiya uchun taqiqlangan SMZ hududi (mahalliy metr): cheklov obyektlari SMZ (12-band; qabriston — VM 101, 50-band: SMZ da turar joy va jamoat binolari taqiqlanadi) + ishlab chiqarish SMZ (146); own — shu kvartalning oʻzi (ishlab chiqarish kvartalining oʻz SMZ i oʻziga taqiq emas) */
export function denyZone(doc: Project, use: Use): MultiPolygon {
  const parts: MultiPolygon[] = [];
  const lz = limitZones(doc);
  // 07.11 (c70): ShNQ masofalari (TP — 257, GTP — ShNQ 2.04.08-22, 240) — oʻz roʻyxati boʻyicha
  for (const s of lz.soft) if (s.deny ? s.deny === 'all' || s.deny.includes(use) : szzVerdict(use) === 'deny' || (s.kind === 'qabriston' && QAB100_DENY.includes(use))) parts.push(s.polys.map(p => p.map(close)) as MultiPolygon);
  // 06.11 (c65): qabriston chegarasidan 100 m — turar joy, jamoat binolari, dam olish zonalari qoʻyilmaydi (VM 101, 50-band); garaj, avtoturargoh — mumkin
  if (QAB100_DENY.includes(use)) for (const q of lz.qab) parts.push(q.polys.map(p => p.map(close)) as MultiPolygon);
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
  if (gone) notes.push(`${gone} ta bino SMZ ichiga tushgani uchun qoʻyilmadi (SanQvaN 0103-25, 12-band; ShNQ 2.07.01-23, 146)`);
  if (cut) notes.push(`${cut} ta seksiya SMZ chegarasi boʻyicha qisqartirildi (SanQvaN 0103-25, 12-band)`);
  return out;
}

export interface SzzGreen { id: string; label: string; cls: string; need: number; area: number; green: number; share: number; rings: XY[][]; /** AMALIYOT zonasi (qabriston) */ amal?: boolean }
const needOf = (cls?: string) => cls === 'I' ? 0.4 : cls === 'II' || cls === 'III' ? 0.5 : 0.6;
/** ishlab chiqarish SMZ masofasidan sinf (SanQvaN 0103-25, 7-band: 1 — 1000, 2 — 500, 3 — 300, 4 — 100, 5 — 50 m) */
const clsOfM = (m: number) => m >= 1000 ? 'I' : m >= 500 ? 'II' : m >= 300 ? 'III' : m >= 100 ? 'IV' : 'V';

let memo: { k: unknown[]; v: SzzGreen[] } | null = null;
/** 13-band: har SMZ ning uchastka ichidagi qismi va undagi koʻkalam ulushi */
export function szzGreen(doc: Project): SzzGreen[] {
  const k = [doc.limits, doc.site, doc.origin, doc.zones, doc.parcels, doc.streets];
  if (memo && memo.k.every((x, i) => x === k[i])) return memo.v;
  const v = raw(doc); memo = { k, v }; return v;
}
function raw(doc: Project): SzzGreen[] {
  if (!doc.site) return [];
  const fr = frame(doc.origin), site: Polygon = doc.site.rings.map(r => close(r.map(fr.toLocal))), plan = computePlan(doc);
  // 04.11 (audit): faqat «Himoya koʻkalamzorligi» — park (aholi dam olish joyi) SMZ da taqiqlangan (0103-25, 12-band; ShNQ 146, 475), koʻkalamga sanalmaydi
  const greenMP = plan.blocks.filter(b => b.use === 'himoya').map(b => b.rings.map(close) as Polygon);
  const out: SzzGreen[] = [];
  const add = (id: string, label: string, cls: string, mp: MultiPolygon, amal = false) => {
    const zone = tryMP(() => polygonClipping.intersection(mp, site), []), area = mpArea(zone); if (area < 50) return;
    const green = greenMP.reduce((t, g) => t + mpArea(tryMP(() => polygonClipping.intersection(zone, g), [])), 0);   // yashil kvartallar bir-birini qoplamaydi
    out.push({ id, label, cls, need: needOf(cls), area, green, share: area ? green / area : 0, rings: zone.map(p => open(p[0])), ...(amal ? { amal: true } : {}) });
  };
  // 06.11 (c63): qabriston SMZ i — VM 101, 50-band (koʻkalamzorlik foizi yoʻq; 13-band — 1-ilova obyektlari uchun): foiz maʼlumot uchun (amal)
  // 07.11 (c70): masofa zonalari (TP, GTP — SMZ emas) koʻkalamzorlik hisobiga kirmaydi
  for (const s of limitZones(doc).soft) if (!s.nosmz) add(s.id, s.kind, s.cls ?? 'IV', s.polys.map(p => p.map(close)) as MultiPolygon, s.flag === 'AMALIYOT' || s.kind === 'qabriston');
  for (const z of prodChecks(doc).zones) add(`prod${z.block}`, z.use, clsOfM(z.szz), tryMP(() => polygonClipping.difference(bufferLocal(z.rings[0], z.szz, true), z.rings.map(close) as Polygon), []));
  return out;
}

/**
 * 06.11 — bekor qilingan SanPiN RUz № 0350-17, 2.19 (AMALIYOT; 0103-25 da yoʻq, sozlama bilan yoqiladi): «со стороны селитебной территории надлежит предусматривать полосу
 * древесно-кустарниковых насаждений шириной не менее 50 м, а при ширине зоны до 100 м не менее 20 метров».
 * Hisob (har SMZ uchun, uchastka ichidagi qismi):
 *  - kerakli en W = 50 m, SMZ kengligi ≤ 100 m boʻlsa 20 m; SMZ W dan tor boʻlsa — butun eni (NORMA + TALQIN);
 *  - tasma joyi = SMZ ning tashqi W qismi (manbadan m − W dan uzoq) — selitebnaya hudud tomonida: turar joy, MTM, maktab,
 *    poliklinika, sport, park kvartallari (12-band roʻyxati — SZZ_DENY; selitebnaya = shu roʻyxat — TALQIN) dan W + GAP ichida;
 *    GAP = 30 m — oradagi koʻcha koridori uchun (ANDOZA); koʻcha koridorlari tasmadan chiqariladi (TALQIN);
 *  - daraxt-buta tasmasi = «Himoya koʻkalamzorligi» kvartallari/parsellari (park SMZ da taqiq — 12-band);
 *  - eng tor eni — 5 m qadam bilan: tasma qaysi engacha ≥ 98 % koʻkalam bilan qoplangan.
 */
export const BELT_GAP = 30;
export interface SzzBelt { id: string; label: string; m: number; need: number; area: number; miss: number; width: number; rings: XY[][]; missRings: XY[][][]; outside: boolean }
let memoB: { k: unknown[]; v: SzzBelt[] } | null = null;
export function szzBelt(doc: Project): SzzBelt[] {
  const k = [doc.limits, doc.site, doc.origin, doc.zones, doc.parcels, doc.streets];
  if (memoB && memoB.k.every((x, i) => x === k[i])) return memoB.v;
  const v = beltRaw(doc); memoB = { k, v }; return v;
}
function beltRaw(doc: Project): SzzBelt[] {
  if (!doc.site) return [];
  const fr = frame(doc.origin), site: Polygon = doc.site.rings.map(r => close(r.map(fr.toLocal))), plan = computePlan(doc);
  const green: MultiPolygon = plan.blocks.filter(b => b.use === 'himoya').map(b => b.rings.map(close) as Polygon);
  const resi: MultiPolygon = plan.blocks.filter(b => (SZZ_DENY as readonly string[]).includes(b.use)).map(b => b.rings.map(close) as Polygon);
  const corr: MultiPolygon = plan.corridors.map(p => p.map(close) as Polygon);
  if (!resi.length) return [];
  const U = (mp: MultiPolygon[]): MultiPolygon => { const nz = mp.filter(x => x.length); return nz.length ? tryMP(() => polygonClipping.union(nz[0], ...nz.slice(1)), nz.flat()) : []; };
  const greenU = U([green]), corrU = U([corr]);
  const out: SzzBelt[] = [];
  const add = (id: string, label: string, src: XY[], m: number, full: MultiPolygon, siteCut: boolean) => {
    const zone = tryMP(() => polygonClipping.intersection(full, site), []); if (mpArea(zone) < 50) return;
    const need = m <= 100 ? Math.min(20, m) : 50;
    // selitebnaya — SMZ dan tashqaridagi qismi
    const res = tryMP(() => polygonClipping.difference(U([resi]), full), []); if (mpArea(res) < 50) return;
    const near = U(res.map(p => bufferLocal(open(p[0]), need + BELT_GAP, true)));
    const band = (w: number): MultiPolygon => {
      const inner = m - w > 0.5 ? bufferLocal(src, m - w, true) : [];
      let b = inner.length ? tryMP(() => polygonClipping.difference(zone, inner), zone) : zone;
      b = tryMP(() => polygonClipping.intersection(b, near), []);
      if (corrU.length && b.length) b = tryMP(() => polygonClipping.difference(b, corrU), b);
      return b;
    };
    const B = band(need), a = mpArea(B); if (a < 50) return;
    const missMP = greenU.length ? tryMP(() => polygonClipping.difference(B, greenU), B) : B, miss = mpArea(missMP);
    let width = 0;
    for (let w = 5; w <= need + 1e-6; w += 5) { const bw = band(Math.min(w, need)), aw = mpArea(bw); if (aw < 1) continue; const cov = greenU.length ? mpArea(tryMP(() => polygonClipping.intersection(bw, greenU), [])) : 0; if (cov >= 0.98 * aw) width = Math.min(w, need); else break; }
    if (miss <= Math.max(50, 0.02 * a)) width = need;
    out.push({ id, label, m, need, area: a, miss, width, rings: B.map(p => open(p[0])), missRings: missMP.filter(p => ringA(p[0]) > 20).map(p => p.map(open)), outside: siteCut });
  };
  const siteA = mpArea([site]);
  for (const l of (doc.limits ?? [])) {
    const s = limitZones(doc).soft.find(z => z.id === l.id); if (!s || s.nosmz || !l.rings?.length) continue;   // 07.11 (c70): masofa (TP, GTP) — tasma yoʻq
    const src = l.rings[0].map(fr.toLocal), full = bufferLocal(src, s.m, true);
    const fullA = mpArea(full), inA = mpArea(tryMP(() => polygonClipping.intersection(full, site), []));
    add(l.id, l.kind, src, s.m, tryMP(() => polygonClipping.difference(full, [close(src)]), full), inA < fullA - 1 && inA < siteA);
  }
  for (const z of prodChecks(doc).zones) {
    const full = tryMP(() => polygonClipping.difference(bufferLocal(z.rings[0], z.szz, true), z.rings.map(close) as Polygon), []);
    const fullA = mpArea(full), inA = mpArea(tryMP(() => polygonClipping.intersection(full, site), []));
    add(`prod${z.block}`, z.use, z.rings[0], z.szz, full, inA < fullA - 1);
  }
  return out;
}

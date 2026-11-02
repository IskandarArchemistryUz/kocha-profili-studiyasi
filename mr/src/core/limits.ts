/**
 * Mavjud holat va cheklovlar (02.11, «cheklovlar-navbat-narx-arxitektura.md», 1-bosqich): uchastka chegarasi oʻzgarmaydi, ichida
 * cheklov obyektlari (qabriston, issiqxona, ombor, temir yoʻl, ELU …). Hujjatda faqat inson qarori (kontur, tur, holat); bufer,
 * qurib boʻlmaydigan va SMZ zonalari, yer balansi — har safar shu yerda hisoblanadi.
 *
 * Normalar (asl matndan, egasining normalar papkasi va lex.uz):
 *  - SanQvaN (СанПиН РУз) № 0350-17: 2.9 (SMZ sinflari I 1000 · II 500 · III 300 · IV 100 · V 50 m), 6.3 (issiqxona va parnik
 *    xoʻjaliklari — IV; meva, sabzavot, kartoshka, don, material omborlari — V), 6.4 (qabriston: > 20 ga — II; 10–20 ga — III;
 *    < 10 ga va yopilgan — IV; yopilgan memorial, kolumbariy, qishloq qabristoni ≤ 2 ga — V), 2.17 (SMZ ichida taqiq), 2.20 (SMZ
 *    ichida ruxsat), 2.23.4 (ELU sanitariya zonasi: 330 kV — 20 m, 500 — 30, 750 — 40, 1150 — 55 m).
 *  - VMQ № 1050, 26.12.2018 «Электр тармоғи хўжалиги объектларини муҳофаза қилиш қоидалари», 14-band (havo ELU muhofaza zonasi
 *    har tomonga: ≤ 1 kV — 2 m; 6–20 kV — 10; 35 — 15; 110 — 20; 220 — 25; 500 — 30 m; yer osti kabeli — 1 m); 17-band — zonada bino
 *    qurish egasining yozma roziligi bilan.
 *  - ShNQ 2.07.01-23: 359-band (temir yoʻl — turar joydan 100 m SMZ, 50 m gacha kamaytirish mumkin), 173-band (sabzavot-meva
 *    omborlari ≥ 50 m).
 * Flag: NORMA — asl matndagi raqam; TALQIN — matn ikki xil oʻqiladi (egasi tasdiqlaydi); TAXMIN — matnda yoʻq.
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import type { LngLat, Project, Ring } from './doc';
import { frame, area as ringArea, type XY } from './geo';
import type { Use } from './uses';

export type LimitKind = 'qabriston' | 'issiqxona' | 'ombor' | 'temiryol' | 'elu' | 'meros' | 'suv' | 'boshqa';
export type LimitStatus = 'saqlanadi' | 'buziladi' | 'kochiriladi';
/** ELU holati: mavjud / loyiha (rejada) / kabelga oʻtkaziladi / demontaj */
export type EluStatus = 'mavjud' | 'loyiha' | 'kabel' | 'demontaj';
export interface Limit {
  id: string;
  kind: LimitKind;
  /** toʻliq kontur (uchastkadan tashqariga chiqishi mumkin — bufer butun konturdan) — ELU dan boshqalari */
  rings?: Ring[];
  /** ELU oʻqi (chiziq) */
  axis?: LngLat[];
  /** ELU kuchlanishi, kV */
  kv?: number;
  /** ELU tayanchlari (OSM power=tower / pole) */
  poles?: LngLat[];
  status: LimitStatus;
  elu?: EluStatus;
  /** qabriston: open — amaldagi; memorial — memorial majmua / kolumbariy; rural — qishloq qabristoni */
  sub?: { open?: boolean; memorial?: boolean; rural?: boolean };
  /** qoʻlda oʻzgartirilgan bufer, m (yoʻq — jadvaldan) */
  szz?: number;
  src: 'osm' | 'qolda' | 'import';
  osm?: number;
  name?: string;
}

export type Flag = 'NORMA' | 'TALQIN' | 'TAXMIN';
export interface Szz { m: number; cls?: 'I' | 'II' | 'III' | 'IV' | 'V'; ref: string; flag: Flag; /** qoʻlda oʻzgartirilganda — jadvaldagi qiymat */ table?: number }

const SAN = 'SanQvaN 0350-17';
/** Cheklov turi va maydoniga (ga) koʻra SMZ — SanQvaN 0350-17, 6.3 / 6.4; temir yoʻl — ShNQ 2.07.01-23, 359 */
export function szzOf(l: Limit, areaHa: number): Szz {
  const own = (s: Szz): Szz => l.szz != null && l.szz >= 0 ? { ...s, m: l.szz, flag: s.flag, ref: `${s.ref} · qoʻlda`, table: s.m } : s;
  switch (l.kind) {
    case 'qabriston': {
      const open = l.sub?.open !== false;
      // 6.4, V sinf, 6-band: «…сельские кладбища (до 2 га)» — alohida nomlangan (aniqroq band), amaldagi boʻlsa ham V
      if (l.sub?.rural && areaHa <= 2) return own({ m: 50, cls: 'V', ref: `${SAN}, 6.4`, flag: 'NORMA' });
      if (open) {
        if (areaHa > 20) return own({ m: 500, cls: 'II', ref: `${SAN}, 6.4`, flag: 'NORMA' });
        if (areaHa >= 10) return own({ m: 300, cls: 'III', ref: `${SAN}, 6.4`, flag: 'NORMA' });
        return own({ m: 100, cls: 'IV', ref: `${SAN}, 6.4`, flag: 'NORMA' });
      }
      // 6.4 da «yopilgan qabriston» ham IV (12-band), ham V (6-band) sinfda. V da memorial majmua, kolumbariy, qishloq qabristoni bilan
      // bir guruhda — yopilgan memorial → V; qolgan yopilgan → IV (xavfsizroq; dafn toʻxtagach xavf asta kamayadi) — TALQIN
      if (l.sub?.memorial) return own({ m: 50, cls: 'V', ref: `${SAN}, 6.4`, flag: 'NORMA' });
      return own({ m: 100, cls: 'IV', ref: `${SAN}, 6.4`, flag: 'TALQIN' });
    }
    case 'issiqxona': return own({ m: 100, cls: 'IV', ref: `${SAN}, 6.3`, flag: 'NORMA' });
    case 'ombor': return own({ m: 50, cls: 'V', ref: `${SAN}, 6.3; ShNQ 2.07.01-23, 173`, flag: 'NORMA' });
    case 'temiryol': return own({ m: 100, ref: 'ShNQ 2.07.01-23, 359', flag: 'NORMA' });
    case 'elu': return eluZone(l);
    default: return own({ m: 0, ref: '—', flag: 'TAXMIN' });
  }
}

/** VMQ № 1050, 14-band (muhofaza zonasi, har tomonga): [kuchlanish sinfi, m]; 6–20 kV — bitta sinf */
const VMQ: [number, number][] = [[1, 2], [20, 10], [35, 15], [110, 20], [220, 25], [500, 30]];
/** SanQvaN 0350-17, 2.23.4 (sanitariya zonasi) */
const SAN_ELU: [number, number][] = [[330, 20], [500, 30], [750, 40], [1150, 55]];
/** ELU zonasi (oʻqdan har tomonga, m): ikki normaning kattasi; kabel — 1 m; demontaj — yoʻq. Jadvalda yoʻq kuchlanish — yuqori sinf qiymati (TAXMIN) */
export function eluZone(l: Pick<Limit, 'kv' | 'elu' | 'szz'>): Szz {
  const base = eluTable(l);
  return l.szz != null && l.szz >= 0 ? { ...base, m: l.szz, ref: `${base.ref} · qoʻlda`, table: base.m } : base;
}
function eluTable(l: Pick<Limit, 'kv' | 'elu'>): Szz {
  if (l.elu === 'demontaj') return { m: 0, ref: 'VMQ № 1050, 14', flag: 'NORMA' };
  if (l.elu === 'kabel') return { m: 1, ref: 'VMQ № 1050, 14', flag: 'NORMA' };
  const kv = l.kv ?? 0;
  const inVmq = kv <= 1 || (kv >= 6 && kv <= 20) || [35, 110, 220, 500].includes(kv), inSan = SAN_ELU.some(([k]) => k === kv);
  const a = VMQ.find(([k]) => kv <= k)?.[1] ?? 0, b = kv >= 330 ? SAN_ELU.find(([k]) => kv <= k)?.[1] ?? 55 : 0, m = Math.max(a, b);
  const ref = b > a ? `${SAN}, 2.23.4` : 'VMQ № 1050, 14';
  return { m: m || 55, ref, flag: inVmq || inSan ? 'NORMA' : 'TAXMIN' };
}

/** SMZ ichida taqiqlangan (SanQvaN 0350-17, 2.17) va ruxsat etilgan (2.20, qabriston uchun — TALQIN) funksiyalar */
export const SZZ_DENY: readonly Use[] = ['turar', 'yakka', 'aralash', 'maktab', 'mtm', 'sport', 'yashil'];
export const SZZ_ALLOW: readonly Use[] = ['himoya', 'avtoturargoh', 'savdo', 'ofis', 'poliklinika', 'texnik', 'maydon', 'mamuriy', 'logistika', 'sanoat', 'kommunal', 'transport'];   // 2.20: boshqaruv binolari, kichik sinfli korxonalar, omborlar (oziq-ovqatdan tashqari), garajlar

export interface SoftZone { id: string; kind: LimitKind; rings: XY[][]; /** koʻpburchaklar (tashqi + teshiklar) — kesishma hisobi uchun */ polys: XY[][][]; m: number; cls?: string; ref: string; flag: Flag }
export interface LimitZones {
  /** qurib boʻlmaydigan joy (saqlanadigan obyekt konturi, temir yoʻl, ELU muhofaza zonasi) — uchastka bilan kesishgan, mahalliy */
  hard: XY[][][];
  /** SMZ (buferlar) — turar joy, maktab, MTM … taqiq (2.17), uchastka bilan kesishgan, hard ayirilgan */
  soft: SoftZone[];
}

const q3 = (v: number) => Math.round(v * 1000) / 1000;
const close = (r: XY[]): [number, number][] => [...r, r[0]].map(p => [q3(p[0]), q3(p[1])]);
const open = (r: [number, number][]): XY[] => r.slice(0, -1).map(p => [p[0], p[1]]);
const circle = (c: XY, m: number, n = 24): XY[] => Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n * Math.PI * 2; return [c[0] + Math.cos(t) * m, c[1] + Math.sin(t) * m] as XY; });
/** chiziq (ochiq) yoki halqa (yopiq) atrofida m kenglikdagi bufer — Minkowski yigʻindisi (qirra toʻrtburchaklari + uchlarda doira) */
export function bufferLocal(pts: XY[], m: number, closed: boolean): MultiPolygon {
  const parts: Polygon[] = [];
  if (closed && pts.length >= 3) parts.push([close(pts)]);
  if (m <= 0) return parts.length ? parts : [];
  const n = pts.length, segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1e-6) continue;
    const nx = -dy / L * m, ny = dx / L * m;
    parts.push([close([[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]])]);
  }
  for (const p of pts) parts.push([close(circle(p, m))]);
  try { return polygonClipping.union(parts[0], ...parts.slice(1)); } catch { return parts.slice(0, 1); }
}
const mpArea = (mp: MultiPolygon) => mp.reduce((s, p) => s + Math.abs(ringArea(open(p[0]))) - p.slice(1).reduce((t, h) => t + Math.abs(ringArea(open(h))), 0), 0);

/** Faol (hisobga olinadigan) cheklovmi: buziladigan / koʻchiriladigan obyekt va demontaj ELU — yoʻq */
/** Cheklov turi nomi (UI va varaqlar) */
export const LIMIT_NAMES: Record<LimitKind, string> = { qabriston: 'Qabriston', issiqxona: 'Issiqxona', ombor: 'Ombor', temiryol: 'Temir yoʻl', elu: 'ELU', meros: 'Madaniy meros', suv: 'Suv obyekti', boshqa: 'Boshqa' };
export const isActive = (l: Limit) => l.kind === 'elu' ? l.elu !== 'demontaj' : l.status === 'saqlanadi';

let memo: { k: unknown[]; v: LimitZones } | null = null;
/** Cheklovlar zonalari (mahalliy koordinatalarda, uchastka bilan kesishgan). Hujjat oʻzgarmasa — kesh. */
export function limitZones(doc: Project): LimitZones {
  const k = [doc.limits, doc.site, doc.origin];
  if (memo && memo.k.every((x, i) => x === k[i])) return memo.v;
  const v = limitZonesRaw(doc); memo = { k, v }; return v;
}
function limitZonesRaw(doc: Project): LimitZones {
  const ls = (doc.limits ?? []).filter(isActive);
  if (!ls.length || !doc.site) return { hard: [], soft: [] };
  const fr = frame(doc.origin), site: Polygon = doc.site.rings.map(r => close(r.map(fr.toLocal)));
  const hardParts: MultiPolygon[] = [], soft: { l: Limit; mp: MultiPolygon; s: Szz }[] = [];
  for (const l of ls) {
    if (l.kind === 'elu') {
      if (!l.axis || l.axis.length < 2) continue;
      const z = eluZone(l); if (z.m <= 0) continue;
      hardParts.push(bufferLocal(l.axis.map(fr.toLocal), z.m, false));   // VMQ 1050, 17: zonada bino — egasining roziligisiz yoʻq
      continue;
    }
    if (!l.rings?.length || l.rings[0].length < 3) continue;
    const loc = l.rings[0].map(fr.toLocal), aHa = Math.abs(ringArea(loc)) / 1e4;
    hardParts.push([[close(loc)]]);
    const s = szzOf(l, aHa);
    if (s.m > 0) soft.push({ l, mp: bufferLocal(loc, s.m, true), s });
  }
  let hard: MultiPolygon = [];
  try { hard = hardParts.length ? polygonClipping.intersection(polygonClipping.union(hardParts[0], ...hardParts.slice(1)), site) : []; } catch { hard = []; }
  const softOut: SoftZone[] = [];
  for (const z of soft) {
    let mp: MultiPolygon = [];
    try { mp = polygonClipping.intersection(z.mp, site); if (hard.length && mp.length) mp = polygonClipping.difference(mp, hard); } catch { mp = []; }
    if (mpArea(mp) < 1) continue;
    softOut.push({ id: z.l.id, kind: z.l.kind, rings: mp.flatMap(p => p.map(open)), polys: mp.map(p => p.map(open)), m: z.s.m, cls: z.s.cls, ref: z.s.ref, flag: z.s.flag });
  }
  return { hard: hard.map(p => p.map(open)), soft: softOut };
}

/** Yer balansi (ga): umumiy · qurib boʻlmaydigan (cheklov va ELU zonasi) · SMZ · yaroqli (turar joy uchun) */
export interface LandBalance { siteHa: number; hardHa: number; szzHa: number; usableHa: number }
export function landBalance(doc: Project): LandBalance | null {
  if (!doc.site) return null;
  const fr = frame(doc.origin), site: Polygon = doc.site.rings.map(r => close(r.map(fr.toLocal)));
  const siteM2 = mpArea([site]), z = limitZones(doc);
  const hardM2 = mpArea(z.hard.map(p => p.map(close)));
  let szzM2 = 0;
  if (z.soft.length) { try { szzM2 = mpArea(polygonClipping.union(...z.soft.map(s => [s.rings.map(close)] as MultiPolygon) as [MultiPolygon, ...MultiPolygon[]])); } catch { szzM2 = z.soft.reduce((t, s) => t + mpArea([s.rings.map(close)]), 0); } }
  return { siteHa: siteM2 / 1e4, hardHa: hardM2 / 1e4, szzHa: szzM2 / 1e4, usableHa: Math.max(0, siteM2 - hardM2 - szzM2) / 1e4 };
}

const KINDS: LimitKind[] = ['qabriston', 'issiqxona', 'ombor', 'temiryol', 'elu', 'meros', 'suv', 'boshqa'];
const n = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ll = (v: unknown): v is LngLat => Array.isArray(v) && v.length === 2 && n(v[0]) && n(v[1]) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90;
/** Fayldan oʻqilgan cheklovni tozalash (eski / buzilgan maʼlumot — null) */
export function cleanLimit(x: any): Limit | null {
  if (!x || typeof x.id !== 'string' || !KINDS.includes(x.kind)) return null;
  const rings = Array.isArray(x.rings) ? x.rings.filter((r: unknown) => Array.isArray(r) && r.length >= 3 && r.every(ll)).map((r: LngLat[]) => r.map(p => [p[0], p[1]] as LngLat)) : [];
  const axis = Array.isArray(x.axis) && x.axis.length >= 2 && x.axis.every(ll) ? x.axis.map((p: LngLat) => [p[0], p[1]] as LngLat) : null;
  if (x.kind === 'elu' ? !axis : !rings.length) return null;
  return {
    id: x.id, kind: x.kind,
    ...(rings.length ? { rings } : {}), ...(axis ? { axis } : {}),
    ...(n(x.kv) && x.kv > 0 && x.kv <= 1500 ? { kv: x.kv } : {}),
    ...(Array.isArray(x.poles) && x.poles.every(ll) && x.poles.length ? { poles: x.poles.slice(0, 2000).map((p: LngLat) => [p[0], p[1]] as LngLat) } : {}),
    status: ['saqlanadi', 'buziladi', 'kochiriladi'].includes(x.status) ? x.status : 'saqlanadi',
    ...(['mavjud', 'loyiha', 'kabel', 'demontaj'].includes(x.elu) ? { elu: x.elu } : {}),
    ...(x.sub && typeof x.sub === 'object' ? { sub: { ...(x.sub.open === false ? { open: false } : {}), ...(x.sub.memorial === true ? { memorial: true } : {}), ...(x.sub.rural === true ? { rural: true } : {}) } } : {}),
    ...(n(x.szz) && x.szz >= 0 && x.szz <= 2000 ? { szz: x.szz } : {}),
    src: ['osm', 'qolda', 'import'].includes(x.src) ? x.src : 'qolda',
    ...(n(x.osm) ? { osm: x.osm } : {}), ...(typeof x.name === 'string' && x.name ? { name: x.name.slice(0, 120) } : {}),
  };
}

/** Cheklov maydoni, ga (ELU — 0) */
export function limitAreaHa(l: Limit, origin: LngLat): number {
  if (!l.rings?.length || l.rings[0].length < 3) return 0;
  const fr = frame(origin); return Math.abs(ringArea(l.rings[0].map(fr.toLocal))) / 1e4;
}

/**
 * Shtrix (rejada «qurib boʻlmaydi» belgisi): koʻpburchak(lar) ichida `step` m oraliqda, `deg` burchak ostida parallel kesmalar.
 * Skanlash chizigʻi usuli — teshiklar (ichki halqalar) toq-juft qoida bilan chiqarib tashlanadi.
 */
export function hatchSegs(polys: XY[][][], step: number, deg = 45): [XY, XY][] {
  const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  const rot = (p: XY): XY => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c], back = (p: XY): XY => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  const out: [XY, XY][] = [];
  for (const poly of polys) {
    const R = poly.filter(r => r.length >= 3).map(r => r.map(rot)); if (!R.length) continue;
    let y0 = Infinity, y1 = -Infinity; for (const r of R) for (const p of r) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    if (y1 - y0 > step * 4000) continue;   // himoya: juda koʻp chiziq
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
      const xs: number[] = [];
      for (const r of R) for (let i = 0; i < r.length; i++) {
        const a = r[i], b = r[(i + 1) % r.length];
        if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 0.05) out.push([back([xs[i], y]), back([xs[i + 1], y])]);
    }
  }
  return out;
}

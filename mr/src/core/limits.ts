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
 *  - Suv obyektlari (04.11, Murad Buildings sinovi, 6-band; egasi: «981-ni qoʻlla»): VM ning 11.12.2019 dagi 981-son qarori bilan
 *    tasdiqlangan nizom — 18, 21 (koʻl, suv ombori), 29, 30 (daryo), 31, 32, 35 (kanal), 23, 37 (aholi punktida — bosh reja boʻyicha)-bandlar.
 *    DIQQAT: LexUz 981-son qarorni 23.06.2026 dan kuchini yoʻqotgan deb belgilaydi (VM 22.06.2026 dagi 317-son qarori), oʻrnini bosuvchi
 *    hujjat aniqlanmagan — barcha kengliklar TALQIN. Zona rejimi — Suv kodeksi (30.07.2025), 24-bob, 125–138-moddalar (metr qiymatlari yoʻq).
 * Flag: NORMA — asl matndagi raqam; TALQIN — matn ikki xil oʻqiladi (egasi tasdiqlaydi); TAXMIN — matnda yoʻq.
 */
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import type { LngLat, Project, Ring } from './doc';
import { frame, area as ringArea, type XY } from './geo';
import type { Use } from './uses';

export type LimitKind = 'qabriston' | 'issiqxona' | 'ombor' | 'temiryol' | 'elu' | 'meros' | 'suv' | 'sanoat' | 'boshqa';
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
  /** 04.11: sanoat korxonasi sanitariya sinfi (SanQvaN 0350-17, 2.9-band: I–V); yoʻq — kiritilmagan (TAXMIN) */
  cls?: 1 | 2 | 3 | 4 | 5;
  /** 04.11: suv obyekti — turi va toifasi. daryo: 1 katta (> 100 m³/s), 2 oʻrta (5–100), 3 kichik (2–5), 4 juda kichik (< 2);
   *  kanal: 1 ichimlik suvi, 2 sugʻorish / kollektor. Koʻl va suv ombori — toifasiz */
  suv?: { t: SuvType; q?: 1 | 2 | 3 | 4 };
  /** 04.11: qoʻlda oʻzgartirilgan qirgʻoq boʻyi mintaqasi, m (yoʻq — jadvaldan); suv zonasi — `szz` */
  qir?: number;
  src: 'osm' | 'qolda' | 'import';
  osm?: number;
  name?: string;
}

export type SuvType = 'daryo' | 'kol' | 'kanal';
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
    case 'ombor': return own({ m: 50, cls: 'V', ref: `${SAN}, 6.6 V sinf, 7 («Склады»); ShNQ 2.07.01-23, 173`, flag: 'NORMA' });
    case 'temiryol': return own({ m: 100, ref: 'ShNQ 2.07.01-23, 359', flag: 'NORMA' });
    // 04.11 (Murad Buildings sinovi, 8-band): 2.9-band — «1 класса - 1000 м, II - 500 м, III - 300 м, IV - 100 м, V - 50 м» (asl matn).
    // Sinf korxona turiga qarab (5-boʻlim, sanitariya tasnifi); kiritilmagan boʻlsa — IV (100 m), TAXMIN: «korxona sinfini kiriting»
    case 'sanoat': { const R = ['I', 'II', 'III', 'IV', 'V'] as const, M = [1000, 500, 300, 100, 50];
      return l.cls ? own({ m: M[l.cls - 1], cls: R[l.cls - 1], ref: `${SAN}, 2.9`, flag: 'NORMA' }) : own({ m: 100, cls: 'IV', ref: `${SAN}, 2.9 — sinf kiritilmagan`, flag: 'TAXMIN' }); }
    case 'elu': return eluZone(l);
    case 'suv': return suvZones(l).zone;
    default: return own({ m: 0, ref: '—', flag: 'TAXMIN' });
  }
}

const N981 = 'VM 981-son qarori (11.12.2019) nizomi', LOST = 'LexUz: 23.06.2026 dan kuchini yoʻqotgan, oʻrnini bosuvchi hujjat aniqlanmagan';
/** Suv obyekti nomi (toifa bilan) — UI va varaqlar */
export const SUV_NAMES: Record<SuvType, string> = { daryo: 'Daryo', kol: 'Koʻl, suv ombori', kanal: 'Kanal' };
export const SUV_Q: Record<SuvType, string[]> = { daryo: ['Katta (> 100 m³/s)', 'Oʻrta (5–100 m³/s)', 'Kichik (2–5 m³/s)', 'Juda kichik (< 2 m³/s)'], kol: [], kanal: ['Ichimlik suvi', 'Sugʻorish, kollektor'] };
/** tugmadagi qisqa yozuv (toʻliq — title): daryo — sarf oraligʻi */
export const SUV_QS: Record<SuvType, string[]> = { daryo: ['> 100', '5–100', '2–5', '< 2'], kol: [], kanal: ['Ichimlik suvi', 'Sugʻorish, kollektor'] };
/**
 * 04.11 (Murad Buildings sinovi, 6-band): suvni muhofaza qilish zonasi (zone) va qirgʻoq boʻyi mintaqasi (shore), suv chetidan, m.
 * 981-son nizomda kengliklar oraliq (yer turi, nishablik, hajm, chuqurlik boʻyicha) — sukut oraliqning quyi chegarasi, qoʻlda oshiriladi.
 * Hujjat kuchini yoʻqotgan — flag doim TALQIN (egasi amaldagi hujjatni tasdiqlaguncha).
 */
export function suvZones(l: Pick<Limit, 'suv' | 'szz' | 'qir'>): { zone: Szz; shore: Szz } {
  const t = l.suv?.t ?? 'daryo', q = l.suv?.q;
  let z: [number, string], sh: [number, string];
  if (t === 'kol') { z = [50, '18-band (50–250 m, hajm boʻyicha)']; sh = [35, '21-band (35–100 m; suv chetidan ≥ 20 m)']; }
  else if (t === 'kanal') {
    if (q === 2) { z = [0, '31, 32, 35-bandlar (sugʻorish va kollektor tarmoqlari — faqat qirgʻoq boʻyi mintaqasi)']; sh = [4.5, '31, 32, 35-bandlar (4,5–12 m, chuqurlik boʻyicha)']; }
    else if (q === 1) { z = [50, '31, 32, 35-bandlar (ichimlik suvi kanallari: 50–150 m)']; sh = [0, 'ichimlik suvi kanali — qirgʻoq boʻyi mintaqasi kiritilmagan']; }
    // toifa kiritilmagan — ikkalasining qattiqrogʻi: zona 50 m va qirgʻoq boʻyi 4,5 m
    else { z = [50, '31, 32, 35-bandlar (ichimlik suvi kanali: 50–150 m; toifa kiritilmagan)']; sh = [4.5, '31, 32, 35-bandlar (sugʻorish va kollektor: 4,5–12 m; toifa kiritilmagan)']; }
  } else {
    const Z: [number, string][] = [[300, '300–500 m'], [100, '100–300 m'], [50, '50–100 m'], [35, '35–50 m']], r = Z[(q ?? 2) - 1] ?? Z[1];
    z = [r[0], `29-band (${r[1]}, oʻrtacha koʻp yillik sarf boʻyicha${q ? '' : '; toifa kiritilmagan — oʻrta'})`]; sh = [25, '30-band (25–100 m, yer turi va nishablik boʻyicha)'];
  }
  const mk = (v: [number, string], own?: number): Szz => {
    const base: Szz = { m: v[0], ref: `${N981}, ${v[1]}; aholi punktida — bosh reja boʻyicha (23, 37-bandlar) · ${LOST}`, flag: 'TALQIN' };
    return own != null && own >= 0 ? { ...base, m: own, ref: `${base.ref} · qoʻlda`, table: base.m } : base;
  };
  return { zone: mk(z, l.szz), shore: mk(sh, l.qir) };
}

/** VMQ № 1050, 14-band (muhofaza zonasi, har tomonga): [kuchlanish sinfi, m]; 6–20 kV — bitta sinf */
const VMQ: [number, number][] = [[1, 2], [20, 10], [35, 15], [110, 20], [220, 25], [500, 30]];
/** SanQvaN 0350-17, 2.23.4 (sanitariya zonasi) */
const SAN_ELU: [number, number][] = [[330, 20], [500, 30], [750, 40], [1150, 55]];
/**
 * ELU zonasi (liniya oʻqidan har tomonga, m). VMQ 1050, 14 «а» va SanPiN 2.23.4 — zona CHETKI SIMDAN oʻlchanadi; ilovada liniya oʻq chizigʻi
 * bilan kiritiladi, shuning uchun oʻqdan chetki simgacha yarim kenglik qoʻshiladi (ANDOZA — tipik tayanchlar boʻyicha, 04.11 audit).
 * Ikki normaning kattasi; kabel — 1 m; demontaj — yoʻq. Kuchlanishi berilmagan liniya — 6–20 kV sinfi (TAXMIN, kuchlanishni kiriting).
 * Jadvalda yoʻq kuchlanish (masalan 330 kV — VMQ da yoʻq) — yuqori sinf qiymati (TAXMIN).
 */
const WIRE_HALF: [number, number][] = [[1, 0], [20, 1], [35, 2], [110, 3], [220, 4], [330, 5], [500, 6.5], [750, 9], [1150, 12]];
export function eluZone(l: Pick<Limit, 'kv' | 'elu' | 'szz'>): Szz {
  const base = eluTable(l);
  return l.szz != null && l.szz >= 0 ? { ...base, m: l.szz, ref: `${base.ref} · qoʻlda`, table: base.m } : base;
}
function eluTable(l: Pick<Limit, 'kv' | 'elu'>): Szz {
  if (l.elu === 'demontaj') return { m: 0, ref: 'VMQ № 1050, 14', flag: 'NORMA' };
  if (l.elu === 'kabel') return { m: 1, ref: 'VMQ № 1050, 14 «б»', flag: 'NORMA' };
  const unknown = !(l.kv != null && l.kv > 0), kv = unknown ? 10 : l.kv!;
  const vRow = VMQ.find(([k]) => kv <= k), sRow = kv >= 330 ? SAN_ELU.find(([k]) => kv <= k) : undefined;
  const a = vRow?.[1] ?? 0, b = sRow?.[1] ?? (kv > 1150 ? 55 : 0), z = Math.max(a, b) || 55;
  // aniq qator: VMQ da 1 kV gacha, 6–20, 35, 110, 220, 500; SanPiN da 330, 500, 750, 1150 — qaysi qiymat olingan boʻlsa, oʻsha qator aniq boʻlishi kerak
  const exact = z === b ? SAN_ELU.some(([k]) => k === kv) : (kv <= 1 || (kv >= 6 && kv <= 20) || [35, 110, 220, 500].includes(kv));
  const half = WIRE_HALF.find(([k]) => kv <= k)?.[1] ?? 12;
  const ref = `${z === b && b > a ? `${SAN}, 2.23.4` : 'VMQ № 1050, 14 «а»'} (chetki simdan) + ${half} m oʻqdan chetki simgacha (andoza)${unknown ? ' · kuchlanish berilmagan — 6–20 kV deb olindi' : ''}`;
  return { m: z + half, ref, flag: unknown || !exact ? 'TAXMIN' : 'NORMA' };
}

/** SMZ ichida taqiqlangan (SanQvaN 0350-17, 2.17) va ruxsat etilgan (2.20, qabriston uchun — TALQIN) funksiyalar */
// 04.11 (audit): 2.17 — «лечебно-профилактические и оздоровительные учреждения общего пользования», «парки», «спортивные сооружения»
// taqiqlanadi → umumshahar poliklinikasi taqiqda (2.20 dagi poliklinika — faqat korxonaga xizmat qiluvchi, qoʻlda kelishiladi)
export const SZZ_DENY: readonly Use[] = ['turar', 'yakka', 'aralash', 'maktab', 'mtm', 'sport', 'yashil', 'poliklinika'];
export const SZZ_ALLOW: readonly Use[] = ['himoya', 'avtoturargoh', 'savdo', 'ofis', 'texnik', 'maydon', 'mamuriy', 'logistika', 'sanoat', 'kommunal', 'transport'];   // 2.20: boshqaruv binolari, kichik sinfli korxonalar, omborlar (oziq-ovqatdan tashqari), garajlar
/** 2.17: «оптовые склады продовольственного сырья и пищевых продуктов» — oziq-ovqat omborlari (LOGI turlari) SMZ da taqiqlanadi */
export const SZZ_FOOD_LOGI: readonly string[] = ['sabzavot', 'sovutgich'];

export interface SoftZone { id: string; kind: LimitKind; rings: XY[][]; /** koʻpburchaklar (tashqi + teshiklar) — kesishma hisobi uchun */ polys: XY[][][]; m: number; cls?: string; ref: string; flag: Flag }
export interface LimitZones {
  /** qurib boʻlmaydigan joy (saqlanadigan obyekt konturi, temir yoʻl, ELU muhofaza zonasi) — uchastka bilan kesishgan, mahalliy */
  hard: XY[][][];
  /** 04.11 (egasi, VMQ 1050): ELU muhofaza zonasi — bino qurib boʻlmaydi, lekin kvartaldan kesilmaydi: koʻkalam (maysa), yoʻl, oʻtish mumkin.
   *  15-band «г»: bolalar va sport maydonchalari, garaj, turar joy — taqiq; 17-band «в»: daraxt ekish — egasining yozma roziligi bilan */
  elu: XY[][][];
  /** SMZ (buferlar) — turar joy, maktab, MTM … taqiq (2.17), uchastka bilan kesishgan, hard ayirilgan */
  soft: SoftZone[];
  /** 04.11: suvni muhofaza qilish zonalari (981-son nizom) — SMZ emas: turar joy taqiqlanmaydi, zona rejimi (Suv kodeksi, 125–138-moddalar) koʻrib chiqiladi */
  water: SoftZone[];
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
export const LIMIT_NAMES: Record<LimitKind, string> = { qabriston: 'Qabriston', issiqxona: 'Issiqxona', ombor: 'Ombor', temiryol: 'Temir yoʻl', elu: 'ELU', meros: 'Madaniy meros', suv: 'Suv obyekti', sanoat: 'Sanoat korxonasi', boshqa: 'Boshqa' };
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
  if (!ls.length || !doc.site) return { hard: [], soft: [], elu: [], water: [] };
  const fr = frame(doc.origin), site: Polygon = doc.site.rings.map(r => close(r.map(fr.toLocal)));
  const hardParts: MultiPolygon[] = [], eluParts: MultiPolygon[] = [], soft: { l: Limit; mp: MultiPolygon; s: Szz }[] = [], water: { l: Limit; mp: MultiPolygon; s: Szz }[] = [];
  for (const l of ls) {
    if (l.kind === 'elu') {
      if (!l.axis || l.axis.length < 2) continue;
      const z = eluZone(l); if (z.m <= 0) continue;
      const b = bufferLocal(l.axis.map(fr.toLocal), z.m, false); hardParts.push(b); eluParts.push(b);   // VMQ 1050, 15 «ж», 17: zonada bino — yoʻq
      continue;
    }
    // 04.11: suv obyekti — suv yuzasi va qirgʻoq boʻyi mintaqasi qurib boʻlmaydi (hard), zona — alohida (water). Daryo/kanal chiziq
    // bilan berilsa (OSM waterway) — suv chetidan emas, oʻqdan oʻlchanadi (TAXMIN: kenglik nomaʼlum)
    if (l.kind === 'suv') {
      const line = !l.rings?.length && l.axis && l.axis.length >= 2, pts = line ? l.axis!.map(fr.toLocal) : l.rings?.[0]?.map(fr.toLocal);
      if (!pts || pts.length < (line ? 2 : 3)) continue;
      const { zone, shore } = suvZones(l);
      if (!line) hardParts.push([[close(pts)]]);
      if (shore.m > 0) hardParts.push(bufferLocal(pts, shore.m, !line));
      if (zone.m > shore.m) water.push({ l, mp: bufferLocal(pts, zone.m, !line), s: zone });
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
  const waterOut: SoftZone[] = [];
  for (const z of water) {
    let mp: MultiPolygon = [];
    try { mp = polygonClipping.intersection(z.mp, site); if (hard.length && mp.length) mp = polygonClipping.difference(mp, hard); } catch { mp = []; }
    if (mpArea(mp) < 1) continue;
    waterOut.push({ id: z.l.id, kind: 'suv', rings: mp.flatMap(p => p.map(open)), polys: mp.map(p => p.map(open)), m: z.s.m, ref: z.s.ref, flag: z.s.flag });
  }
  let elu: MultiPolygon = [];
  try { elu = eluParts.length ? polygonClipping.intersection(polygonClipping.union(eluParts[0], ...eluParts.slice(1)), site) : []; } catch { elu = []; }
  return { hard: hard.map(p => p.map(open)), soft: softOut, elu: elu.map(p => p.map(open)), water: waterOut };
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

const KINDS: LimitKind[] = ['qabriston', 'issiqxona', 'ombor', 'temiryol', 'elu', 'meros', 'suv', 'sanoat', 'boshqa'];
const n = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ll = (v: unknown): v is LngLat => Array.isArray(v) && v.length === 2 && n(v[0]) && n(v[1]) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90;
/** Fayldan oʻqilgan cheklovni tozalash (eski / buzilgan maʼlumot — null) */
export function cleanLimit(x: any): Limit | null {
  if (!x || typeof x.id !== 'string' || !KINDS.includes(x.kind)) return null;
  const rings = Array.isArray(x.rings) ? x.rings.filter((r: unknown) => Array.isArray(r) && r.length >= 3 && r.every(ll)).map((r: LngLat[]) => r.map(p => [p[0], p[1]] as LngLat)) : [];
  const axis = Array.isArray(x.axis) && x.axis.length >= 2 && x.axis.every(ll) ? x.axis.map((p: LngLat) => [p[0], p[1]] as LngLat) : null;
  if (x.kind === 'elu' ? !axis : x.kind === 'suv' ? !rings.length && !axis : !rings.length) return null;
  return {
    id: x.id, kind: x.kind,
    ...(rings.length ? { rings } : {}), ...(axis ? { axis } : {}),
    ...(n(x.kv) && x.kv > 0 && x.kv <= 1500 ? { kv: x.kv } : {}),
    ...(Array.isArray(x.poles) && x.poles.every(ll) && x.poles.length ? { poles: x.poles.slice(0, 2000).map((p: LngLat) => [p[0], p[1]] as LngLat) } : {}),
    status: ['saqlanadi', 'buziladi', 'kochiriladi'].includes(x.status) ? x.status : 'saqlanadi',
    ...(['mavjud', 'loyiha', 'kabel', 'demontaj'].includes(x.elu) ? { elu: x.elu } : {}),
    ...(x.sub && typeof x.sub === 'object' ? { sub: { ...(x.sub.open === false ? { open: false } : {}), ...(x.sub.memorial === true ? { memorial: true } : {}), ...(x.sub.rural === true ? { rural: true } : {}) } } : {}),
    ...(n(x.szz) && x.szz >= 0 && x.szz <= 2000 ? { szz: x.szz } : {}),
    ...([1, 2, 3, 4, 5].includes(x.cls) ? { cls: x.cls } : {}),
    ...(x.kind === 'suv' && x.suv && ['daryo', 'kol', 'kanal'].includes(x.suv.t) ? { suv: { t: x.suv.t, ...([1, 2, 3, 4].includes(x.suv.q) ? { q: x.suv.q } : {}) } } : {}),
    ...(n(x.qir) && x.qir >= 0 && x.qir <= 500 ? { qir: x.qir } : {}),
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

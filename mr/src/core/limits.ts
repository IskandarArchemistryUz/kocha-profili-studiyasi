/**
 * Mavjud holat va cheklovlar (02.11, «cheklovlar-navbat-narx-arxitektura.md», 1-bosqich): uchastka chegarasi oʻzgarmaydi, ichida
 * cheklov obyektlari (qabriston, issiqxona, ombor, temir yoʻl, ELU …). Hujjatda faqat inson qarori (kontur, tur, holat); bufer,
 * qurib boʻlmaydigan va SMZ zonalari, yer balansi — har safar shu yerda hisoblanadi.
 *
 * Normalar (asl matndan, egasining normalar papkasi va lex.uz):
 *  - 0103-25-son SanQvaN «Sanitariya-muhofaza zonasiga doir sanitariya qoidalari, normalari va gigiyena normativlari» (SEO qoʻmitasi
 *    15.08.2025 dagi 24-son qarori, AV 29.09.2025, № 373; 2-ilova 3-band — SanPiN 0350-17 bekor): 7-band (SMZ: 1-ilovaning 1-sinfi
 *    1000 · 2 — 500 · 3 — 300 · 4 — 100 · 5 — 50 m), 1-ilova (obyektlar tasnifi: teplitsa va parnik xoʻjaliklari — 4-sinf, 381; don, meva
 *    va sabzavot omborxonalari — 5-sinf, 456), 12-band (SMZ ichida taqiq), 14-band (SMZ ichida ruxsat), 15-band (ET SMZ: 1 kV gacha — 2 m,
 *    20 — 10, 35 — 15, 110 — 20, 220 — 25, 500 — 30, 750 — 40, 1150 kV gacha — 55 m).
 *    0103-25 da QABRISTON yoʻq. 06.11 (c63): qabriston SMZ — VM ning 04.04.2011 dagi 101-son qarori, 1-ilova, 50-band (NORMA):
 *    yangi 20–40 ga — 500 m, < 20 ga — 300 m; qishloq va kolumbariy ≥ 50 m; yopiq va kuydirishdan keyin dafn — 100 m; turar joy,
 *    jamoat binolari va dam olish zonalari devoridan ≥ 100 m (SMZ kamida 100 m olinadi); SMZ da turar joy va jamoat binolari taqiqlanadi.
 *  - VMQ № 1050, 26.12.2018 «Электр тармоғи хўжалиги объектларини муҳофаза қилиш қоидалари», 14-band (havo ELU muhofaza zonasi
 *    har tomonga: ≤ 1 kV — 2 m; 6–20 kV — 10; 35 — 15; 110 — 20; 220 — 25; 500 — 30 m; yer osti kabeli — 1 m); 17-band — zonada bino
 *    qurish egasining yozma roziligi bilan.
 *  - ShNQ 2.07.01-23: 359-band (temir yoʻl — turar joydan 100 m SMZ, 50 m gacha kamaytirish mumkin), 173-band (sabzavot-meva
 *    omborlari ≥ 50 m).
 *  - Suv obyektlari (04.11, Murad Buildings sinovi, 6-band; egasi: «981-ni qoʻlla»): VM ning 11.12.2019 dagi 981-son qarori bilan
 *    tasdiqlangan nizom — 18, 21 (koʻl, suv ombori), 29, 30 (daryo), 31, 32, 35 (kanal), 23, 37 (aholi punktida — bosh reja boʻyicha)-bandlar.
 *    DIQQAT: LexUz 981-son qarorni 23.06.2026 dan kuchini yoʻqotgan deb belgilaydi (VM 22.06.2026 dagi 317-son qarori), oʻrnini bosuvchi
 *    hujjat aniqlanmagan — barcha kengliklar TALQIN. Zona rejimi — Suv kodeksi (30.07.2025), 24-bob, 125–138-moddalar (metr qiymatlari yoʻq).
 * Flag: NORMA — asl matndagi raqam; TALQIN — matn ikki xil oʻqiladi (egasi tasdiqlaydi); TAXMIN — matnda yoʻq;
 *       AMALIYOT — amaldagi normada qiymat yoʻq, bekor qilingan hujjat qiymati maʼlumot uchun (baholanmaydi).
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
  /** qabriston: open — amaldagi (false — yopiq); memorial — kolumbariy; rural — qishloq qabristoni (1000 xonadondan kam); crem — kuydirishdan keyin dafn */
  sub?: { open?: boolean; memorial?: boolean; rural?: boolean; /** 06.11 (c63): kuydirishdan keyin dafn etiladigan (VM 101, 50-band) */ crem?: boolean };
  /** qoʻlda oʻzgartirilgan bufer, m (yoʻq — jadvaldan) */
  szz?: number;
  /** 04.11: sanoat korxonasi sanitariya sinfi (SanQvaN 0103-25, 7-band, 1-ilova: 1–5-sinf); yoʻq — kiritilmagan (TAXMIN) */
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

/** 06.11 (c63): bezak — fontan, bezak hovuzi, basseyn (suv obyekti emas: suvni muhofaza zonasi qoʻllanmaydi) */
export type SuvType = 'daryo' | 'kol' | 'kanal' | 'bezak';
export type Flag = 'NORMA' | 'TALQIN' | 'TAXMIN' | 'AMALIYOT';
export interface Szz { m: number; cls?: 'I' | 'II' | 'III' | 'IV' | 'V'; ref: string; flag: Flag; /** qoʻlda oʻzgartirilganda — jadvaldagi qiymat */ table?: number }

const SAN = 'SanQvaN 0103-25';
/** bekor qilingan SanPiN 0350-17 (0103-25, 2-ilova, 3-band) — faqat AMALIYOT qiymatlari uchun */
/** 06.11 (c63): qabriston — VM 101-son qarori, 1-ilova, 50-band (egasining normalar papkasi: VM-101-2011-qabriston.txt) */
const VM101 = 'VM 101-son qarori (04.04.2011), 1-ilova, 50-band';
/** Cheklov turi va maydoniga (ga) koʻra SMZ — SanQvaN 0103-25, 7-band va 1-ilova; temir yoʻl — ShNQ 2.07.01-23, 359; qabriston — VM 101, 50-band */
export function szzOf(l: Limit, areaHa: number): Szz {
  const own = (s: Szz): Szz => l.szz != null && l.szz >= 0 ? { ...s, m: l.szz, flag: s.flag, ref: `${s.ref} · qoʻlda`, table: s.m } : s;
  switch (l.kind) {
    case 'qabriston': {
      // 06.11 (c63, egasi): VM 101-son qarori (04.04.2011), 1-ilova (dafn etish joylarini saqlash nizomi), 50-band:
      // yangi 20–40 ga — 500 m, < 20 ga — 300 m; qishloq (1000 xonadondan kam) va kolumbariy — kamida 50 m; yopiq va kuydirishdan keyin
      // dafn etiladigan — 100 m (yopiqda sanepid kelishuvi bilan 50 m gacha).
      // 06.11 (c65, egasi): «turar joy, jamoat binolari va dam olish zonalari devoridan qabristongacha ≥ 100 m» — SMZ emas, alohida talab:
      // SMZ oʻz qiymatida (50 m ham), 100 m — alohida halqa (qabZones, QAB100_DENY) faqat shu uch turdagi obyektlar uchun
      const N = (m: number, what: string, flag: Szz['flag'] = 'NORMA') => own({ m, ref: `${VM101} — ${what}`, flag });
      if (l.sub?.open === false) return N(100, 'yopiq qabriston: SMZ 100 m (sanepid kelishuvi bilan 50 m gacha)');
      if (l.sub?.crem) return N(100, 'kuydirishdan keyin dafn etiladigan qabriston: SMZ 100 m');
      if (l.sub?.memorial) return N(50, 'kolumbariy: SMZ ≥ 50 m');
      if (l.sub?.rural) return N(50, 'qishloq qabristoni (1000 xonadondan kam aholi punkti): SMZ ≥ 50 m');
      if (areaHa > 40) return own({ m: 500, ref: `${VM101} — ${Math.round(areaHa)} ga: 50-bandda 20–40 ga gacha, 500 m olindi`, flag: 'TALQIN' });
      return areaHa >= 20 ? N(500, '20–40 ga: SMZ 500 m') : N(300, '20 ga dan kichik: SMZ 300 m');
    }
    case 'issiqxona': return own({ m: 100, cls: 'IV', ref: `${SAN}, 7-band; 1-ilova, 4-sinf, 381 («teplitsa va parnik xoʻjaliklari»)`, flag: 'NORMA' });
    // 1-ilovada umumiy «ombor» qatori yoʻq: 5-sinf, 456 — don, meva va sabzavotlarni saqlash omborxonalari (TALQIN); ShNQ 173 — sabzavot-meva ≥ 50 m
    case 'ombor': return own({ m: 50, cls: 'V', ref: `${SAN}, 1-ilova, 5-sinf, 456 (umumiy ombor qatori yoʻq); ShNQ 2.07.01-23, 173`, flag: 'TALQIN' });
    case 'temiryol': return own({ m: 100, ref: 'ShNQ 2.07.01-23, 359', flag: 'NORMA' });
    // 06.11 (c61): 0103-25, 7-band — 1-ilovaning 1-sinfi 1000 m, 2 — 500, 3 — 300, 4 — 100, 5 — 50 m (ifloslantiruvchi manbadan).
    // Sinf korxona turiga qarab (1-ilova); kiritilmagan boʻlsa — 4-sinf (100 m), TAXMIN: «korxona sinfini kiriting». Ichki belgi — I–V
    case 'sanoat': { const R = ['I', 'II', 'III', 'IV', 'V'] as const, M = [1000, 500, 300, 100, 50];
      return l.cls ? own({ m: M[l.cls - 1], cls: R[l.cls - 1], ref: `${SAN}, 7-band (1-ilova, ${l.cls}-sinf)`, flag: 'NORMA' }) : own({ m: 100, cls: 'IV', ref: `${SAN}, 7-band — sinf kiritilmagan`, flag: 'TAXMIN' }); }
    case 'elu': return eluZone(l);
    case 'suv': return suvZones(l).zone;
    default: return own({ m: 0, ref: '—', flag: 'TAXMIN' });
  }
}

const N981 = 'VM 981-son qarori (11.12.2019) nizomi', LOST = 'LexUz: 23.06.2026 dan kuchini yoʻqotgan, oʻrnini bosuvchi hujjat aniqlanmagan';
/** Suv obyekti nomi (toifa bilan) — UI va varaqlar */
export const SUV_NAMES: Record<SuvType, string> = { daryo: 'Daryo', kol: 'Koʻl, suv ombori', kanal: 'Kanal', bezak: 'Bezak suvi (fontan, hovuz)' };
export const SUV_Q: Record<SuvType, string[]> = { daryo: ['Katta (> 100 m³/s)', 'Oʻrta (5–100 m³/s)', 'Kichik (2–5 m³/s)', 'Juda kichik (< 2 m³/s)'], kol: [], kanal: ['Ichimlik suvi', 'Sugʻorish, kollektor'], bezak: [] };
/** tugmadagi qisqa yozuv (toʻliq — title): daryo — sarf oraligʻi */
export const SUV_QS: Record<SuvType, string[]> = { daryo: ['> 100', '5–100', '2–5', '< 2'], kol: [], kanal: ['Ichimlik suvi', 'Sugʻorish, kollektor'], bezak: [] };
/**
 * 04.11 (Murad Buildings sinovi, 6-band): suvni muhofaza qilish zonasi (zone) va qirgʻoq boʻyi mintaqasi (shore), suv chetidan, m.
 * 981-son nizomda kengliklar oraliq (yer turi, nishablik, hajm, chuqurlik boʻyicha) — sukut oraliqning quyi chegarasi, qoʻlda oshiriladi.
 * Hujjat kuchini yoʻqotgan — flag doim TALQIN (egasi amaldagi hujjatni tasdiqlaguncha).
 */
export function suvZones(l: Pick<Limit, 'suv' | 'szz' | 'qir'>): { zone: Szz; shore: Szz } {
  const t = l.suv?.t ?? 'daryo', q = l.suv?.q;
  if (t === 'bezak') {
    const b: Szz = { m: 0, ref: 'Bezak suvi (fontan, bezak hovuzi, basseyn) — 981-son nizomdagi suv obyekti emas, suvni muhofaza zonasi va qirgʻoq boʻyi mintaqasi qoʻllanmaydi (TALQIN); OSM dan 0,5 ga dan kichik yopiq suv — bezak deb olinadi (ANDOZA)', flag: 'TALQIN' };
    return { zone: b, shore: b };
  }
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
/** SanQvaN 0103-25, 15-band (ET SMZ, «… kV gacha»): [kuchlanish, m] */
const SAN_ELU: [number, number][] = [[1, 2], [20, 10], [35, 15], [110, 20], [220, 25], [500, 30], [750, 40], [1150, 55]];
/**
 * ELU zonasi (liniya oʻqidan har tomonga, m). VMQ 1050, 14 «а» — zona CHETKI SIMDAN oʻlchanadi (0103-25, 15-band — «ETning radiusi
 * boʻylab», oʻlchash nuqtasi aytilmagan — chetki simdan, TALQIN); ilovada liniya oʻq chizigʻi
 * bilan kiritiladi, shuning uchun oʻqdan chetki simgacha yarim kenglik qoʻshiladi (ANDOZA — tipik tayanchlar boʻyicha, 04.11 audit).
 * Ikki normaning kattasi; kabel — 1 m; demontaj — yoʻq. Kuchlanishi berilmagan liniya — 6–20 kV sinfi (TAXMIN, kuchlanishni kiriting).
 * 0103-25, 15-band «… kV gacha» — oraliqdagi kuchlanish (masalan 330 kV) yuqori qatorga kiradi (NORMA); 1150 kV dan yuqori — TAXMIN.
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
  const vRow = VMQ.find(([k]) => kv <= k), sRow = SAN_ELU.find(([k]) => kv <= k);
  const a = vRow?.[1] ?? 0, b = sRow?.[1] ?? (kv > 1150 ? 55 : 0), z = Math.max(a, b) || 55;
  // 0103-25, 15-band «gacha» — har kuchlanish oʻz qatorida (aniq); 1150 kV dan yuqori — jadvaldan tashqari (TAXMIN)
  const exact = kv <= 1150;
  const half = WIRE_HALF.find(([k]) => kv <= k)?.[1] ?? 12;
  const ref = `${b > a ? `${SAN}, 15-band` : `VMQ № 1050, 14 «а»; ${SAN}, 15-band`} (chetki simdan) + ${half} m oʻqdan chetki simgacha (andoza)${unknown ? ' · kuchlanish berilmagan — 6–20 kV deb olindi' : ''}`;
  return { m: z + half, ref, flag: unknown || !exact ? 'TAXMIN' : 'NORMA' };
}

/** SMZ ichida taqiqlangan (SanQvaN 0103-25, 12-band) va ruxsat etilgan (14-band) funksiyalar */
// 12-band: aholi turar joylari; oziq-ovqat ishlab chiqaruvchi korxonalar, oziq-ovqat omborxonalari, ichimlik suvi inshootlari; ijtimoiy soha
// obyektlari (MTM, taʼlim, sogʻliqni saqlash), aholi dam olish joylari (park — TALQIN), sport inshootlari → «Boshqa ijtimoiy» ham taqiqda
export const SZZ_DENY: readonly Use[] = ['turar', 'yakka', 'aralash', 'maktab', 'mtm', 'sport', 'yashil', 'poliklinika', 'ijtimoiy'];
// 14-band: «xavflilik sinfi past boʻlgan obyektlar» (ishlab chiqarish funksiyalari — sinfi pastligi TALQIN) va obyekt tarkibidagi oʻquv binolari,
// ishlab chiqarishga taalluqli savdo, umumiy ovqatlanish, poliklinika, ilmiy-tadqiqot laboratoriyalari (qoʻlda kelishiladi). Himoya koʻkalamzorligi —
// 13-band (SMZ ni koʻkalamzorlashtirish). 0350-17, 2.20 dagi boshqaruv binolari, garaj va avtoturargoh, umumiy savdo, muhandislik — roʻyxatda yoʻq → koʻrib chiqish
export const SZZ_ALLOW: readonly Use[] = ['himoya', 'logistika', 'sanoat', 'kommunal', 'transport'];
/** 12-band: «oziq-ovqat mahsulotlar omborxonalari» — oziq-ovqat omborlari (LOGI turlari) SMZ da taqiqlanadi */
export const SZZ_FOOD_LOGI: readonly string[] = ['sabzavot', 'sovutgich'];

/**
 * 06.11 (c65, egasi): VM 101-son qarori, 1-ilova, 50-band — «Турар жой ва жамоат бинолари ҳамда дам олиш зоналари деворидан
 * қабристонгача масофа 100 метрдан кам бўлмаслиги керак». Qabriston chegarasidan 100 m — SMZ dan alohida halqa; kamaytirish
 * (sanepid kelishuvi) faqat yopiq qabriston SMZ iga tegishli, bu masofaga qoʻllanmaydi. Taqiq: turar joy, jamoat binolari (har qanday
 * jamoat funksiyasi) va dam olish zonalari (park, bogʻ, sport, maydon). Garaj, avtoturargoh, ombor, yoʻl, muhandislik — ruxsat.
 */
export const QAB100 = 100;
export const QAB100_REF = 'VM 101-son qarori (04.04.2011), 1-ilova, 50-band: «Турар жой ва жамоат бинолари ҳамда дам олиш зоналари деворидан қабристонгача масофа 100 метрдан кам бўлмаслиги керак»';
export const QAB100_DENY: readonly Use[] = ['turar', 'yakka', 'aralash', 'maktab', 'mtm', 'poliklinika', 'ijtimoiy', 'mamuriy', 'savdo', 'ofis', 'mehmonxona', 'sport', 'yashil', 'maydon'];
/** dam olish zonasi va jamoat uchastkasi sifatida hudud boʻyicha tekshiriladigan funksiyalar (binosiz ham) */
export const QAB100_AREA: readonly Use[] = ['yashil', 'sport', 'maydon', 'yakka', 'maktab', 'mtm', 'poliklinika', 'ijtimoiy'];

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
  /** 06.11 (c65): qabriston chegarasidan 100 m — turar joy, jamoat binolari va dam olish zonalari uchun (VM 101, 50-band); smz — shu qabriston SMZ i, m */
  qab: (SoftZone & { smz: number })[];
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
  if (!ls.length || !doc.site) return { hard: [], soft: [], elu: [], water: [], qab: [] };
  const fr = frame(doc.origin), site: Polygon = doc.site.rings.map(r => close(r.map(fr.toLocal)));
  const hardParts: MultiPolygon[] = [], eluParts: MultiPolygon[] = [], soft: { l: Limit; mp: MultiPolygon; s: Szz }[] = [], water: { l: Limit; mp: MultiPolygon; s: Szz }[] = [], qab: { l: Limit; mp: MultiPolygon; s: Szz }[] = [];
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
    if (l.kind === 'qabriston') qab.push({ l, mp: bufferLocal(loc, QAB100, true), s });
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
  const qabOut: LimitZones['qab'] = [];
  for (const z of qab) {
    let mp: MultiPolygon = [];
    try { mp = polygonClipping.intersection(z.mp, site); if (hard.length && mp.length) mp = polygonClipping.difference(mp, hard); } catch { mp = []; }
    if (mpArea(mp) < 1) continue;
    qabOut.push({ id: z.l.id, kind: 'qabriston', rings: mp.flatMap(p => p.map(open)), polys: mp.map(p => p.map(open)), m: QAB100, ref: QAB100_REF, flag: 'NORMA', smz: z.s.m });
  }
  let elu: MultiPolygon = [];
  try { elu = eluParts.length ? polygonClipping.intersection(polygonClipping.union(eluParts[0], ...eluParts.slice(1)), site) : []; } catch { elu = []; }
  return { hard: hard.map(p => p.map(open)), soft: softOut, elu: elu.map(p => p.map(open)), water: waterOut, qab: qabOut };
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
    ...(x.sub && typeof x.sub === 'object' ? { sub: { ...(x.sub.open === false ? { open: false } : {}), ...(x.sub.memorial === true ? { memorial: true } : {}), ...(x.sub.rural === true ? { rural: true } : {}), ...(x.sub.crem === true ? { crem: true } : {}) } } : {}),
    ...(n(x.szz) && x.szz >= 0 && x.szz <= 2000 ? { szz: x.szz } : {}),
    ...([1, 2, 3, 4, 5].includes(x.cls) ? { cls: x.cls } : {}),
    ...(x.kind === 'suv' && x.suv && ['daryo', 'kol', 'kanal', 'bezak'].includes(x.suv.t) ? { suv: { t: x.suv.t, ...([1, 2, 3, 4].includes(x.suv.q) ? { q: x.suv.q } : {}) } } : {}),
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

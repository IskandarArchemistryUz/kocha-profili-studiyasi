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

export type LimitKind = 'qabriston' | 'issiqxona' | 'ombor' | 'temiryol' | 'elu' | 'meros' | 'suv' | 'sanoat' | 'obyekt' | 'boshqa';
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
  /** 07.11 (c70): SMZ obyekti — SanQvaN 0103-25 1-ilova / 4-ilova qatori yoki ShNQ masofa qatori (OBJ katalogi kaliti) */
  obj?: string;
  /** 07.11 (c70): 4-ilova quvvat ustuni (1 — ≤ 200 m³ … 4 — 50 000–280 000 m³) */
  objq?: 1 | 2 | 3 | 4;
  /** 07.11 (c70): OSM teglaridan taxmin qilingan qator (oʻlcham/quvvat nomaʼlum — eng ehtiyotkor qator, «koʻrib chiqish») */
  objGuess?: boolean;
  src: 'osm' | 'qolda' | 'import';
  osm?: number;
  name?: string;
}

/** 06.11 (c63): bezak — fontan, bezak hovuzi, basseyn (suv obyekti emas: suvni muhofaza zonasi qoʻllanmaydi) */
export type SuvType = 'daryo' | 'kol' | 'kanal' | 'bezak';
export type Flag = 'NORMA' | 'TALQIN' | 'TAXMIN' | 'AMALIYOT';
export interface Szz { m: number; cls?: 'I' | 'II' | 'III' | 'IV' | 'V'; ref: string; flag: Flag; /** qoʻlda oʻzgartirilganda — jadvaldagi qiymat */ table?: number;
  /** 07.11 (c70): SMZ obyekti nomi (katalogdan) */ name?: string;
  /** 07.11 (c70): taqiq roʻyxati 12-banddan farq qilsa (ShNQ masofalari: TP — turar joy va jamoat binolari; GTP — barcha binolar) */ deny?: readonly Use[] | 'all';
  /** 07.11 (c70): SMZ emas — normadagi masofa (13-band koʻkalamzorlik foizi qoʻllanmaydi) */ nosmz?: true;
  /** 07.11 (c70): OSM teglaridan taxmin — taqiq «koʻrib chiqish» ga tushiriladi */ guess?: true }

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
    case 'obyekt': return objZone(l, own);
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

/**
 * 07.11 (c70, egasi: «benzin quyish va metan/propan shoxobchalari SMZ chiqmaydi, yana turli zonalar qolib ketgan»): SMZ obyektlari katalogi.
 * Asl matn: SanQvaN 0103-25, 7-band (1-sinf 1000 · 2 — 500 · 3 — 300 · 4 — 100 · 5 — 50 m), 1-ilova (obyektlar tasnifi — qator raqami
 * ilovadagi tartib raqami), 4-ilova (oqova suvlarni tozalash qurilmalari, quvvat boʻyicha), 17-band (4-ilovaga havola);
 * ShNQ 2.07.01-23 (joriy tahrir), 257-band (6–20 kV TP va taqsimlash punktlari — turar joy va jamoat binolaridan ≥ 10 m, davolash-
 * profilaktika muassasalaridan ≥ 25 m); ShNQ 2.04.08-22, 240-band, 10-jadval (alohida turgan GTP — bino va inshootlargacha: kirish
 * bosimi 0,6 MPa gacha — 10 m, 0,6–1,2 MPa — 15 m; 0,3 MPa gacha — meʼyorlanmaydi; 241 — tor sharoitda 30 % gacha kamaytirish).
 * Yongʻinga qarshi masofalar: ShNQ 2.07.01-23, 643-band (AYoQSh va gaz taʼminoti obyektlari — yongʻin xavfsizligi texnik normalari),
 * 663-band (AYoQSh rezervuar va kolonkalaridan binolargacha — SHNQ 2.09.20-08) — bu hujjat normalar toʻplamida yoʻq, qiymat qoʻyilmagan.
 */
export type ObjGroup = 'yoqilgi' | 'qozonxona' | 'gaz' | 'tp' | 'transport' | 'avtoservis' | 'yuvish' | 'chiqindi' | 'oqova' | 'bozor' | 'kremator' | 'vet' | 'qushxona' | 'stadion' | 'otochirish';
export interface ObjRow { key: string; g: ObjGroup; /** qisqa nom (UI) */ t: string; /** manba qatori */ ref: string; cls?: 1 | 2 | 3 | 4 | 5; m: number; /** 4-ilova: quvvat ustunlari boʻyicha m (null — jadvalda yoʻq) */ q?: (number | null)[]; deny?: readonly Use[] | 'all'; nosmz?: true }
const C = (cls: 1 | 2 | 3 | 4 | 5) => [1000, 500, 300, 100, 50][cls - 1];
const R1 = (row: number, cls: 1 | 2 | 3 | 4 | 5, what: string) => ({ ref: `${SAN}, 7-band; 1-ilova, ${cls}-sinf, ${row} («${what}»)`, cls, m: C(cls) });
const R4 = (what: string) => `${SAN}, 17-band; 4-ilova («${what}»)`;
const PUBLIC: readonly Use[] = ['turar', 'yakka', 'aralash', 'maktab', 'mtm', 'poliklinika', 'ijtimoiy', 'mamuriy', 'savdo', 'ofis', 'mehmonxona'];
export const OBJ_GROUPS: [ObjGroup, string][] = [['yoqilgi', 'Yoqilgʻi quyish (AYoQSh, AGTKSh, AGZS)'], ['qozonxona', 'Qozonxona, issiqlik stansiyasi'], ['gaz', 'Gaz (GTS, GTP)'], ['tp', 'Transformator podstansiyasi'], ['transport', 'Avtovokzal, avtopark, depo'], ['avtoservis', 'Avtoservis'], ['yuvish', 'Avtomobil yuvish'], ['chiqindi', 'Chiqindi obyektlari'], ['oqova', 'Oqova suv tozalash, nasos'], ['bozor', 'Bozor'], ['kremator', 'Krematoriy'], ['vet', 'Veterinariya'], ['qushxona', 'Qushxona'], ['stadion', 'Stadion'], ['otochirish', 'Oʻt oʻchirish deposi']];
export const OBJ: ObjRow[] = [
  { key: 'yoqilgi_414', g: 'yoqilgi', t: 'Suyuq va gaz yoqilgʻi quyish', ...R1(414, 4, 'Suyuq va gaz motorli avtomobillarga yoqilgʻi quyish shoxobchalari') },
  { key: 'yoqilgi_491', g: 'yoqilgi', t: 'Faqat suyuq, ≤ 3 quyish joyi', ...R1(491, 5, 'Yengil transport vositalariga faqat suyuq yoqilgʻi quyish shoxobchalari, 3 dan koʻp boʻlmagan yoqilgʻi quyish joyi …') },
  { key: 'agtksh_492', g: 'yoqilgi', t: 'Metan (AGTKSh), ≤ 500 avto/kun', ...R1(492, 5, 'Avtomobillarga gaz toʻldirish kompressor shoxobchalari, kompressorlar bino yoki konteyner ichida, bir kunda 500 dan koʻp boʻlmagan avtomobillarga …') },
  { key: 'agzs_494', g: 'yoqilgi', t: 'Propan (AGZS)', ...R1(494, 5, 'Avtomobillarga gaz quyish shoxobchalari, faqat suyultirilgan uglevodorodlarni …') },
  { key: 'kriogen_493', g: 'yoqilgi', t: 'Kriogen, sigʻim 50 m³', ...R1(493, 5, 'Kriogen … shoxobchalari, … suyultirilgan gazni saqlash sigʻimi 50 m3 hajmda …') },
  { key: 'kriogen_422', g: 'yoqilgi', t: 'Kriogen, sigʻim 50–100 m³', ...R1(422, 4, 'Kriogen … shoxobchalari, … saqlash sigʻimlari 50 dan 100 m3 gacha boʻlganda') },
  { key: 'ygm_425', g: 'yoqilgi', t: 'Yoqilgʻi-moylash materiallari ombori', ...R1(425, 4, 'Yoqilgʻi-moylash materiallari omborlari') },
  { key: 'qozon_290', g: 'qozonxona', t: 'Issiqlik stansiyasi, qozonxona ≤ 200 Gkal/soat', ...R1(290, 3, 'Quvvati soatiga 200 Gkal gacha boʻlgan issiqlik stansiyalari va issiqlik qozonxonalari') },
  { key: 'qozon_402', g: 'qozonxona', t: 'Markaziy issiqlik manbai, 5 Gkal/soat', ...R1(402, 4, 'Quvvati soatiga 5 Gkal boʻlgan markaziy issiqlik energiyalarini ishlab chiqarish') },
  { key: 'gts_198', g: 'gaz', t: 'Magistral GTS (odorizatsiya bilan)', ...R1(198, 3, 'Merkaptandan odorizatsiya qurilmalari bilan jihozlangan magistral gaz quvurlarining gaz taqsimlash stansiyalari') },
  { key: 'gtp_06', g: 'gaz', t: 'GTP, kirish bosimi ≤ 0,6 MPa', ref: 'ShNQ 2.04.08-22, 240-band, 10-jadval (0,6 MPa gacha — bino va inshootlargacha 10 m; 0,3 MPa gacha — meʼyorlanmaydi)', m: 10, deny: 'all', nosmz: true },
  { key: 'gtp_12', g: 'gaz', t: 'GTP, kirish bosimi 0,6–1,2 MPa', ref: 'ShNQ 2.04.08-22, 240-band, 10-jadval (0,6–1,2 MPa — bino va inshootlargacha 15 m)', m: 15, deny: 'all', nosmz: true },
  { key: 'tp_257', g: 'tp', t: 'TP yoki taqsimlash punkti, 6–20 kV', ref: 'ShNQ 2.07.01-23, 257-band (shovqin: turar joy va jamoat binolaridan ≥ 10 m; davolash-profilaktika muassasalaridan ≥ 25 m — ilova 10 m ni tekshiradi)', m: 10, deny: PUBLIC, nosmz: true },
  { key: 'avtovokzal_308', g: 'transport', t: 'Avtovokzal', ...R1(308, 3, 'Avtovokzal') },
  { key: 'avtopark_309', g: 'transport', t: 'Avtobus/trolleybus parki, tramvay va metro deposi (taʼmirlash bilan)', ...R1(309, 3, 'Avtobus va trolleybus parklari, tramvay va metro depolari (taʼmirlash tarmogʻi bilan)') },
  { key: 'avtopark_419', g: 'transport', t: 'Avtobus/trolleybus parki, ≤ 300 texnika', ...R1(419, 4, 'Avtobus va troleybus parklari (300 donagacha texnikasi boʻlganda)') },
  { key: 'yuk_307', g: 'transport', t: 'Yuk avtomobillariga xizmat', ...R1(307, 3, 'Yuk avtomobillariga xizmat koʻrsatuvchi obyektlar') },
  { key: 'avtoservis_423', g: 'avtoservis', t: 'Avtoservis, > 5 joy', ...R1(423, 4, 'Yuk va yengil avtomobillarga xizmat koʻrsatish (5 ta joydan ziyod boʻlgan) obyektlari') },
  { key: 'avtoservis_487', g: 'avtoservis', t: 'Yengil avtomobil servisi (boʻyash, temirchiliksiz)', ...R1(487, 5, 'Yengil avtomobillarga texnik xizmat koʻrsatish va taʼmirlash (boʻyash va temirchilik ishlaridan tashqari)') },
  { key: 'yuvish_421', g: 'yuvish', t: 'Avtoyuvish, > 2 joy', ...R1(421, 4, 'Avtomobillarni yuvish shoxobchalari (yuvish joyi 2 tadan koʻp boʻlgan)') },
  { key: 'yuvish_489', g: 'yuvish', t: 'Avtoyuvish, ≤ 2 joy', ...R1(489, 5, 'Avtomobillarni yuvish shoxobchalari (yuvish joyi 2 tadan koʻp boʻlmagan)') },
  { key: 'poligon_168', g: 'chiqindi', t: 'Qattiq maishiy chiqindi poligoni', ...R1(168, 2, 'Qattiq maishiy chiqindi poligonlari') },
  { key: 'kompost_305', g: 'chiqindi', t: 'Chiqindilarni kompostlash joyi', ...R1(305, 3, 'Chiqindilarni kompostlash joyi') },
  { key: 'qaytayuk_420', g: 'chiqindi', t: 'Chiqindilarni qayta yuklash joyi', ...R1(420, 4, 'Chiqindilarni qayta yuklash joylari') },
  { key: 'vaqtincha_412', g: 'chiqindi', t: 'Chiqindilarni vaqtincha saqlash joyi', ...R1(412, 4, 'Chiqindilarni vaqtincha saqlash joylari') },
  { key: 'oqova_mb', g: 'oqova', t: 'Mexanik-biologik tozalash, choʻkindi maydonchasi bilan', ref: R4('Bijgʻigan choʻkindilarni ushlab qoluvchi maydonchasi boʻlgan mexanik va biologik tozalash qurilmasi …'), m: 500, q: [150, 200, 400, 500] },
  { key: 'oqova_mbt', g: 'oqova', t: 'Mexanik-biologik tozalash, choʻkindiga termomexanik ishlov', ref: R4('Yopiq binolarda choʻkindilarga termomexanik ishlov beruvchi mexanik va biologik tozalash qurilmasi'), m: 400, q: [100, 150, 300, 400] },
  { key: 'oqova_filtr', g: 'oqova', t: 'Filtrlash maydoni', ref: R4('Filtrlash maydoni'), m: 500, q: [200, 300, 500, null] },
  { key: 'oqova_sugor', g: 'oqova', t: 'Sugʻoriladigan maydon', ref: R4('Sugʻoriladigan maydon'), m: 400, q: [150, 200, 400, null] },
  { key: 'oqova_biohovuz', g: 'oqova', t: 'Biologik hovuz', ref: R4('Biologik hovuz'), m: 300, q: [200, 200, 300, 300] },
  { key: 'oqova_aylanma', g: 'oqova', t: 'Aylanma oksidlash kanali', ref: R4('Aylanma oksidlash kanallari boʻlgan qurilma'), m: 150, q: [150, null, null, null] },
  { key: 'oqova_nasos', g: 'oqova', t: 'Oqova suv nasos stansiyasi', ref: R4('Nasos stansiyalari'), m: 30, q: [15, 20, 20, 30] },
  { key: 'bozor_488', g: 'bozor', t: 'Ulgurji va oziq-ovqat bozori, savdo majmuasi', ...R1(488, 5, 'Ulgurji bozorlar, sanoat va oziq-ovqat mollari bozorlari, koʻp tarmoqli savdo majmualari') },
  { key: 'kremator_79', g: 'kremator', t: 'Krematoriy (bir pechdan koʻp)', ...R1(79, 1, 'Bitta pechkadan koʻp boʻlgan krematoriyalar') },
  { key: 'vet_380', g: 'vet', t: 'Veterinariya, hayvonlarni saqlash bilan', ...R1(380, 4, 'Veterinariya davolash maskani, hayvonlarni saqlash, vivariya, kinologiya markazi') },
  { key: 'vet_458', g: 'vet', t: 'Veterinariya, hayvonlarni saqlamasdan', ...R1(458, 5, 'Hayvonlarni saqlamagan holda uy hayvonlarni davolashi') },
  { key: 'qushxona_149', g: 'qushxona', t: 'Qushxona, > 50 hayvon', ...R1(149, 2, 'Qushxonalarda 51 donadan koʻp hayvonlarni soʻyish …') },
  { key: 'qushxona_266', g: 'qushxona', t: 'Qushxona, ≤ 50 hayvon', ...R1(266, 3, 'Qushxonalarda 50 donagacha hayvonlarni soʻyish') },
  { key: 'stadion_310', g: 'stadion', t: 'Ochiq stadion, > 500 tomoshabin', ...R1(310, 3, 'Ochiq tipdagi 500 nafardan ziyod tomoshabin oʻrinlari boʻlgan sport sogʻlomlashtirish inshootlari') },
  { key: 'stadion_418', g: 'stadion', t: 'Ochiq stadion, 100–500 tomoshabin', ...R1(418, 4, 'Ochiq tipdagi 500 nafargacha tomoshabin oʻrinlari boʻlgan sport-sogʻlomlashtirish inshootlari') },
  { key: 'stadion_486', g: 'stadion', t: 'Ochiq stadion, ≤ 100 tomoshabin', ...R1(486, 5, 'Ochiq tipdagi 100 nafargacha tomoshabin oʻrinlari boʻlgan sport-sogʻlomlashtirish inshootlari') },
  { key: 'otochirish_485', g: 'otochirish', t: 'Oʻt oʻchirish deposi', ...R1(485, 5, 'Oʻt oʻchirish deposi') },
];
export const OBJ_BY: Record<string, ObjRow> = Object.fromEntries(OBJ.map(r => [r.key, r]));
/** 4-ilova quvvat ustunlari (jadvalda birlik «m3»; izohlarda «m³/s» — sutkalik quvvat deb olindi, TALQIN) */
export const OQOVA_Q = ['≤ 200 m³', '200–5 000 m³', '5 000–50 000 m³', '50 000–280 000 m³'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;
/** SMZ obyekti zonasi: qator tanlanmagan — TAXMIN (4-sinf, 100 m); OSM taxmini — TALQIN («koʻrib chiqish»); 4-ilova quvvat kiritilmagan — eng katta ustun (TALQIN) */
export function objZone(l: Pick<Limit, 'obj' | 'objq' | 'objGuess' | 'szz'>, own: (s: Szz) => Szz = s => s): Szz {
  const r = l.obj ? OBJ_BY[l.obj] : undefined;
  if (!r) return own({ m: 100, cls: 'IV', ref: `${SAN}, 7-band; 1-ilova — obyekt turi kiritilmagan`, flag: 'TAXMIN' });
  let m = r.m, ref = r.ref, flag: Flag = l.objGuess ? 'TALQIN' : 'NORMA';
  if (r.q) {
    const v = l.objq ? r.q[l.objq - 1] : null;
    if (v != null) ref = `${ref}, ${OQOVA_Q[l.objq! - 1]}`;
    else { m = Math.max(...r.q.filter((x): x is number => x != null)); ref = `${ref} — quvvat kiritilmagan, eng kattasi olindi`; flag = 'TALQIN'; }
    if (v != null) m = v;
  }
  if (l.objGuess) ref = `${ref} · OSM teglaridan taxmin (oʻlcham yoki quvvat nomaʼlum — eng ehtiyotkor qator)`;
  return own({ m, ...(r.cls ? { cls: ROMAN[r.cls - 1] } : {}), ref, flag, name: r.t, ...(r.deny ? { deny: r.deny } : {}), ...(r.nosmz ? { nosmz: true as const } : {}), ...(l.objGuess ? { guess: true as const } : {}) });
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
/**
 * 11.11 (c75, egasi: «qoida boʻyicha nima ruxsat etilmagan boʻlsa shular, ruxsat etilganini qoʻysa boʻladi»): 100 m ichidagi taqiqning
 * har funksiya boʻyicha asosi. «Жамоат бинолари» qamrovi — ShNQ 2.08.02-23 «Жамоат бинолари ва иншоотлари» (asl matn): 4-bob, 170-band
 * («… меҳмонхоналар, туристик базалар …»), 7-bob (savdo va umumiy ovqatlanish), 8-bob (maʼmuriy boshqaruv organlari, idoralar),
 * 882-band roʻyxati («бошқариш органлари, ҳар хил йўналишдаги идоралар, офислар, фирмаларнинг бинолари»; doʻkonlar; mehmonxonalar),
 * 10-ilova, 28-jadval (funksional yongʻin xavfi tasnifi: mehmonxona — F 1.2, savdo — F 3.1, idora va ofis — F 4.3).
 * Mehmonxona, maʼmuriy va ofis — avval TALQIN edi, endi NORMA. Park va skver «дам олиш зоналари» deb olinadi — TALQIN.
 * Roʻyxatda yoʻq funksiyalar (garaj, avtoturargoh, ombor, sanoat, kommunal, transport, muhandislik, himoya koʻkalamzorligi) — ruxsat.
 */
const Q50 = 'VM 101, 1-ilova, 50-band', J = 'ShNQ 2.08.02-23 «Jamoat binolari va inshootlari»';
export const QAB100_BASIS: Partial<Record<Use, { flag: Flag; ref: string }>> = {
  turar: { flag: 'NORMA', ref: `${Q50} — turar joy` }, yakka: { flag: 'NORMA', ref: `${Q50} — turar joy` }, aralash: { flag: 'NORMA', ref: `${Q50} — turar joy` },
  maktab: { flag: 'NORMA', ref: `${Q50} — jamoat binosi; ${J}, 10-ilova, 28-jadval (F 4.1)` }, mtm: { flag: 'NORMA', ref: `${Q50} — jamoat binosi; ${J}, 10-ilova, 28-jadval (F 1.1)` },
  poliklinika: { flag: 'NORMA', ref: `${Q50} — jamoat binosi` }, ijtimoiy: { flag: 'NORMA', ref: `${Q50} — jamoat binosi` },
  savdo: { flag: 'NORMA', ref: `${Q50} — jamoat binosi; ${J}, 7-bob; 882-band; 10-ilova, 28-jadval (F 3.1)` },
  mehmonxona: { flag: 'NORMA', ref: `${Q50} — jamoat binosi; ${J}, 4-bob, 170-band; 882-band; 10-ilova, 28-jadval (F 1.2)` },
  mamuriy: { flag: 'NORMA', ref: `${Q50} — jamoat binosi; ${J}, 8-bob; 882-band; 10-ilova, 28-jadval (F 4.3)` },
  ofis: { flag: 'NORMA', ref: `${Q50} — jamoat binosi; ${J}, 8-bob; 882-band; 10-ilova, 28-jadval (F 4.3)` },
  sport: { flag: 'NORMA', ref: `${Q50} — dam olish zonasi; ${J}, 5-bob` },
  yashil: { flag: 'TALQIN', ref: `${Q50} — dam olish zonasi (park)` }, maydon: { flag: 'TALQIN', ref: `${Q50} — dam olish zonasi (skver)` },
};
/** dam olish zonasi va jamoat uchastkasi sifatida hudud boʻyicha tekshiriladigan funksiyalar (binosiz ham) */
export const QAB100_AREA: readonly Use[] = ['yashil', 'sport', 'maydon', 'yakka', 'maktab', 'mtm', 'poliklinika', 'ijtimoiy'];

export interface SoftZone { id: string; kind: LimitKind; rings: XY[][]; /** koʻpburchaklar (tashqi + teshiklar) — kesishma hisobi uchun */ polys: XY[][][]; m: number; cls?: string; ref: string; flag: Flag;
  /** 07.11 (c70): SMZ obyekti nomi; taqiq roʻyxati (12-banddan farqli); SMZ emas (masofa); OSM taxmini */ name?: string; deny?: readonly Use[] | 'all'; nosmz?: true; guess?: true }
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
export const LIMIT_NAMES: Record<LimitKind, string> = { qabriston: 'Qabriston', issiqxona: 'Issiqxona', ombor: 'Ombor', temiryol: 'Temir yoʻl', elu: 'ELU', meros: 'Madaniy meros', suv: 'Suv obyekti', sanoat: 'Sanoat korxonasi', obyekt: 'SMZ obyekti', boshqa: 'Boshqa' };
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
    softOut.push({ id: z.l.id, kind: z.l.kind, rings: mp.flatMap(p => p.map(open)), polys: mp.map(p => p.map(open)), m: z.s.m, cls: z.s.cls, ref: z.s.ref, flag: z.s.flag,
      ...(z.s.name ? { name: z.s.name } : {}), ...(z.s.deny ? { deny: z.s.deny } : {}), ...(z.s.nosmz ? { nosmz: true as const } : {}), ...(z.s.guess ? { guess: true as const } : {}) });
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

const KINDS: LimitKind[] = ['qabriston', 'issiqxona', 'ombor', 'temiryol', 'elu', 'meros', 'suv', 'sanoat', 'obyekt', 'boshqa'];
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
    ...(x.kind === 'obyekt' && typeof x.obj === 'string' && OBJ_BY[x.obj] ? { obj: x.obj } : {}), ...(x.kind === 'obyekt' && [1, 2, 3, 4].includes(x.objq) ? { objq: x.objq } : {}), ...(x.kind === 'obyekt' && x.objGuess === true ? { objGuess: true } : {}),
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

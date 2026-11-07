/**
 * Koʻp qavatli avtoturargoh (05.11, egasi: «koʻp qavatli parkovka qoʻsh — qoidalari bilan, ichida pandus yoʻlaklari bilan,
 * nechta mashina sigʻishini ham hisoblasin»).
 *
 * NORMA (asl matn, ShNQ 2.07.01-23):
 *  - 410-band — hisob muddatiga kutiladigan avtomobillar uchun yer osti yoki koʻp qavatli avtoturargohlar loyihalanadi;
 *  - 411-band — machina joylarining kamida 5 % (kamida 1) nogironligi boʻlgan shaxslar uchun;
 *  - 412-band — savdo va biznes markazlari, koʻngilochar va dam olish maskanlari, YoQSh, mehmonxonalar… avtoturargohlarida
 *    kamida 5 % (kamida 1) elektromobil va gibridlarni quvvatlantirish uchun;
 *  - 413-band — bir mashina-joyga yer uchastkasi kamida: 2 qavatli — 20, 3 — 14, 4 — 12, 5 — 10, ochiq — 25 m²;
 *  - 414-band — kirish-chiqish joylari magistral koʻchalar chorrahasidan ≥ 50 m, mahalliy koʻchalardan ≥ 20 m, bekatdan ≥ 5 m;
 *  - 418-band, 30-jadval — yer usti va ochiq avtoturargohlardan binolargacha masofa (sigʻimga qarab).
 *
 * NORMA (asl matn, SHNQ 2.05.07-24 «Avtoturargohlar», 01/2-32 tahriri bilan) — 07.11 (c73):
 *  - 1-ilova, 4-izoh — avtomobil-oʻrinlarining minimal oʻlchamlari 5,5 × 2,5 m (avval 5,3 m edi — dizayn-kod 6.3);
 *  - 29-band — saqlash xonasi, rampa va darvoza balandligi eng baland avtomobildan 0,2 m ortiq, lekin ≥ 2 m;
 *    1-ilova: «katta» sinf avtomobil balandligi 1970 mm → 2,17 m → gabarit 2,2 m (TALQIN: sinf topshiriqda berilmagan);
 *  - 34-band — 1-qavatdan tashqari qavatlardagi har 100 avtomobilga bitta yoʻlovchi lift;
 *  - 37-band — rampalar soni (1-qavatdan tashqari qavatlardagi avtomobillar boʻyicha; yer ostida — barcha qavatlar):
 *    100 gacha — bitta bir tasmali (signalizatsiya bilan); 1000 gacha — 1–2 ikki tasmali yoki 2–3 bir tasmali;
 *    1000 dan ortiq — 2–3 ikki tasmali yoki teng qiymatli kombinatsiya;
 *  - 41-band — toʻgʻri rampa ≤ 18 %, egri ≤ 13 %, ochiq (himoyalanmagan) < 10 %; koʻndalang < 6 %; yurish qismi eni ≥ 3,5 m;
 *    egri qismning tashqi radiusi ≥ 7,4 m;
 *  - 58-band — ikki yoʻlli rampada 0,15 × 0,2 m oʻrta toʻsiq (bizda ajratgich 0,5 m — kattaroq);
 *  - 171¹-band — ichki avtoturargohlarda EQS faqat −1 yoki +1 qavatda; 180-band — EV joyi 3,0 × 6,0 m
 *    (yoʻlak boʻylab parallel — 2,5 × 6,0 m);
 *  - 255-band — nogironlar joylari yer usti avtoturargohning 1-qavatida, yer ostida — yuqoridan 1-qavatda, kirish yoki lift yonida.
 *
 * ANDOZA / TALQIN:
 *  - qavat balandligi 3,0 m; pandus uchlarida 3,6 m oʻtish uchastkalari (qiyaligi yarmi) — SHNQ 2.05.07-24 da faqat togʻ hududlari
 *    uchun (169⁵-band: nishablik 10 % dan oshsa) — tekislikka ham qoʻllanadi (TALQIN): gorizontal uzunlik = H / i + 3,6 (3 m da ≈ 20,3 m);
 *  - manevr yoʻlagi 6,0 m (normada qiymat yoʻq — dizayn-kod 6.3); tashqi chekinish 3 m;
 *  - har qavatda 2 ta evakuatsiya zinasi / lift tuguni (har biri 3 joy oʻrnida), 1-qavatda nazorat punkti (2 joy oʻrnida).
 *
 * Reja (mahalliy u — bino uzunligi, v — eni): [pandus tasmasi 7,5 m: ikki yoʻnalish 3,5 + 3,5 + ajratgich 0,5] [yoʻlak 6] [joylar 5,3],
 * keyin ikki tomonlama qatorlar [joylar 5,3][yoʻlak 6][joylar 5,3]; ikki uchida koʻndalang yoʻlak 6 m (qatorlar yoʻlaklarini ulaydi).
 * Pandus tasmasining pandusdan boshqa qismida — joylar (yoʻlakka tutash 5,5 m). Pandus barcha qavatlarda bir joyda (ustma-ust).
 */
import type { XY } from './geo';
import { PARK_MOD } from './parking';

export const ML = {
  floorH: 3.0, clear: 2.2, slope: 0.18, slopeCurve: 0.13, slopeOpen: 0.10, slopeCross: 0.06, lane: 3.5, rOuter: 7.4, sep: 0.5, trans: 3.6, setback: 3, minClear: 2.0,
  stallW: PARK_MOD.p90.W, stallL: PARK_MOD.p90.L, aisle: PARK_MOD.p90.A, coreStalls: 3, gateStalls: 2,
} as const;
/** 413-band: bir mashina-joyga yer uchastkasi, m² (kamida) */
export const ML_413: Record<number, number> = { 2: 20, 3: 14, 4: 12, 5: 10 };
export const OPEN_413 = 25;
/** 413-band qiymati qavatlar boʻyicha; 5 dan koʻp — matnda yoʻq, 5 qavat qiymati olinadi (TALQIN) */
export const need413 = (levels: number): number => levels <= 1 ? OPEN_413 : ML_413[Math.min(5, Math.max(2, Math.round(levels)))];

/** Pandus gorizontal uzunligi, m: asosiy qiyalik + ikki uchida yarim qiyalikdagi oʻtish uchastkalari (ANDOZA) */
export function rampLen(H: number = ML.floorH, i: number = ML.slope, t: number = ML.trans): number {
  return Math.round((H / i - t + 2 * t) * 10) / 10;
}
export const rampWidth = (): number => 2 * ML.lane + ML.sep;

/** SHNQ 2.05.07-24, 37-band: kerakli rampalar (cars — 1-qavatdan tashqari qavatlardagi joylar; yer ostida — barcha qavatlar).
 *  two — ikki tasmali rampalar soni (eng kami), one — muqobil bir tasmali soni (eng kami) */
export function rampNeed(cars: number): { two: number; one: number; text: string } {
  if (cars <= 0) return { two: 0, one: 0, text: '—' };
  if (cars <= 100) return { two: 0, one: 1, text: '100 gacha — bitta bir tasmali rampa (signalizatsiya bilan)' };
  if (cars <= 1000) return { two: 1, one: 2, text: '1000 gacha — 1–2 ta ikki tasmali yoki 2–3 ta bir tasmali rampa' };
  return { two: 2, one: 4, text: '1000 dan ortiq — 2–3 ta ikki tasmali rampa yoki teng qiymatli kombinatsiya' };
}
/** rampalar talabi bajarilganmi: ikki tasmali rampa ikkita bir tasmaliga teng (TALQIN: «teng qiymatli kombinatsiya») */
export const rampOk = (cars: number, twoLane: number, oneLane = 0): boolean => { const r = rampNeed(cars); return 2 * twoLane + oneLane >= Math.max(2 * r.two, r.one); };
/** SHNQ 2.05.07-24, 34-band: yoʻlovchi liftlar — 1-qavatdan tashqari qavatlardagi har 100 avtomobilga bitta */
export const liftNeed = (carsAbove: number): number => Math.ceil(Math.max(0, carsAbove) / 100);
/** SHNQ 2.05.07-24, 180-band: EV joyi 3,0 × 6,0 m; oddiy joy oʻrnida qoʻyilsa qatorda yoʻqotiladigan oddiy joylar soni (5,5 × 2,5 modulda) */
export const EV_W = 3.0, EV_L = 6.0;
export const evLoss = (ev: number, stallW: number = ML.stallW): number => ev > 0 ? Math.ceil(ev * (EV_W - stallW) / stallW) : 0;

/** 30-jadval (418-band): masofa, m — sigʻim ustunlari: ≤ 10, 11–50, 51–100, 101–300, > 300; null — jadvalda «–» */
export const T30 = {
  front: [12, 15, 25, 35, 50], blind: [12, 10, 15, 25, 35], pub: [10, 10, 15, 25, 25], school: [15, 25, 25, 50, null], hosp: [25, 50, null, null, null],
} as const satisfies Record<string, readonly (number | null)[]>;
/** 06.11 (c61): SanQvaN 0103-25, 17-band, 3-ilova — ochiq avtoturargoh SMZ, m (ustunlar T30 bilan bir xil); null — «-» */
export const Q3 = {
  win: [10, 12, 15, 25, 35], blind: [10, 15, 25, 35, 50], social: [15, 25, 25, 50, null], hosp: [25, 50, null, null, null],
} as const satisfies Record<string, readonly (number | null)[]>;
const maxN = (...v: (number | null)[]): number | null => v.every(x => x == null) ? null : Math.max(...v.filter((x): x is number => x != null));
/**
 * 06.11 (c63, egasi): 3-ilovada derazali / derazasiz qatorlar ShNQ 30-jadvalga nisbatan almashgan koʻrinadi (0103-25: derazali 10/12/15/25/35,
 * derazasiz 10/15/25/35/50; ShNQ: old tomon 12/15/25/35/50, derazasiz 12/10/15/25/35) — TALQIN. Qoʻllanadi:
 *  - WIN30 — derazali tomon: ShNQ «олд томонидан» va 3-ilova 1-qatorining kattasi (NORMA);
 *  - derazasiz tomon (generator belgilagan derazasiz torets, Building.gen.blind) — ShNQ «деразасиз ён томонидан» (NORMA);
 *    faqat 3-ilova 2-qatori buzilsa — «koʻrib chiqish» (TALQIN).
 * Tomon nomaʼlum (derazasiz torets belgilanmagan) — derazali deb olinadi.
 */
export const WIN30: number[] = T30.front.map((f, i) => maxN(f, Q3.win[i])!);
/** turar joy uchun talab (tomon nomaʼlum — derazali): generator va «olib tashlash» tuzatishi shu qiymat bilan ishlaydi */
export const RES30: number[] = WIN30;
/** MTM, taʼlim, dam olish joylari va sport inshootlari — ShNQ «мактаблар, таълим» va 3-ilova 3-qatorining kattasi */
export const SOC30: (number | null)[] = T30.school.map((v, i) => maxN(v, Q3.social[i]));
export const capCol = (n: number): number => n <= 10 ? 0 : n <= 50 ? 1 : n <= 100 ? 2 : n <= 300 ? 3 : 4;
export const CAP_COL_NAME = ['≤ 10', '11–50', '51–100', '101–300', '> 300'];

/** 411-band: nogironlar uchun joylar (≥ 5 %, kamida 1); 412-band: elektromobil quvvatlash joylari (≥ 5 %, kamida 1) */
export const pct5 = (n: number): number => n > 0 ? Math.max(1, Math.ceil(n * 0.05)) : 0;

export interface MlPark {
  ring: XY[]; levels: number; perFloor: number[]; spaces: number;
  stalls: XY[][]; aisles: XY[][]; ramps: XY[][]; cores: XY[][];
  L: number; W: number; bays: number; rampL: number; notes: string[];
}

const rotP = (p: XY, a: number): XY => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
function signedArea(r: XY[]): number { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
/** Gorizontal chiziq bilan koʻpburchak kesishmasi — ichki oraliqlar */
function scan(r: XY[], y: number): [number, number][] {
  const xs: number[] = [];
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
  xs.sort((p, q) => p - q); const out: [number, number][] = []; for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]); return out;
}
function segD(p: XY, a: XY, b: XY): number { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
const edgeD = (p: XY, r: XY[]) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segD(p, r[i], r[(i + 1) % r.length])); return d; };

/** Burilgan koʻpburchakdagi eng katta oʻqqa parallel toʻrtburchak (chetdan ≥ sb), 1 m qadam */
function bestRect(r: XY[], sb: number): { x0: number; x1: number; y0: number; y1: number } | null {
  let y0 = Infinity, y1 = -Infinity; for (const p of r) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const st = Math.max(1, (y1 - y0) / 160), ys: number[] = [], iv: ([number, number] | null)[] = [];
  for (let y = y0 + sb; y <= y1 - sb + 1e-9; y += st) {
    const s = scan(r, y); let best: [number, number] | null = null;
    for (const [a, b] of s) if (!best || b - a > best[1] - best[0]) best = [a, b];
    ys.push(y); iv.push(best ? [best[0] + sb, best[1] - sb] : null);
  }
  let out: { x0: number; x1: number; y0: number; y1: number } | null = null, oa = 0;
  for (let i = 0; i < ys.length; i++) {
    let a = -Infinity, b = Infinity;
    for (let j = i; j < ys.length; j++) {
      const q = iv[j]; if (!q) break; a = Math.max(a, q[0]); b = Math.min(b, q[1]); if (b - a < 10) break;
      const ar = (b - a) * (ys[j] - ys[i]); if (ar > oa) { oa = ar; out = { x0: a, x1: b, y0: ys[i], y1: ys[j] }; }
    }
  }
  return out;
}

/** Bitta qavat rejasi (u, v — mahalliy) */
function floorPlan(L: number, W: number, nb: number, rl: number): { stalls: [number, number, number, number][]; aisles: [number, number, number, number][]; ramps: [number, number, number, number][]; cores: [number, number, number, number][] } {
  const sw = ML.stallW, sl = ML.stallL, A = ML.aisle, rw = rampWidth();
  const stalls: [number, number, number, number][] = [], aisles: [number, number, number, number][] = [], ramps: [number, number, number, number][] = [], cores: [number, number, number, number][] = [];
  const u0 = A, u1 = L - A;   // koʻndalang yoʻlaklar orasida
  aisles.push([0, 0, A, W], [L - A, 0, L, W]);
  const ra = u0, rb = u0 + rl;   // pandus — birinchi koʻndalang yoʻlakdan keyin
  ramps.push([ra, 0, rb, ML.lane], [ra, ML.lane + ML.sep, rb, rw]);
  const row = (v0: number, from: number, to: number, skip: (u: number) => boolean) => { for (let u = from; u + sw <= to + 1e-6; u += sw) if (!skip(u)) stalls.push([u, v0, u + sw, v0 + sl]); };
  // 1-qator: pandus tasmasi (pandusdan keyin — joylar, yoʻlakka tutash), 2-yadro tuguni pandusdan keyin
  const c1: [number, number, number, number] = [rb, rw - sl, rb + ML.coreStalls * sw, rw]; cores.push(c1);
  row(rw - sl, rb + ML.coreStalls * sw, u1, () => false);
  aisles.push([u0, rw, u1, rw + A]);
  let v = rw + A;
  row(v, u0, u1, () => false); v += sl;
  for (let k = 1; k < nb; k++) { row(v, u0, u1, () => false); v += sl; aisles.push([u0, v, u1, v + A]); v += A; row(v, u0, u1, () => false); v += sl; }
  // 1-yadro — oxirgi qator uchida
  const c2: [number, number, number, number] = [u1 - ML.coreStalls * sw, v - sl, u1, v]; cores.push(c2);
  const hit = (s: [number, number, number, number], c: [number, number, number, number]) => s[0] < c[2] - 1e-6 && s[2] > c[0] + 1e-6 && s[1] < c[3] - 1e-6 && s[3] > c[1] + 1e-6;
  return { stalls: stalls.filter(s => !cores.some(c => hit(s, c))), aisles, ramps, cores };
}

/**
 * Parsel halqasi (mahalliy metr) ichida koʻp qavatli avtoturargoh: eng katta toʻrtburchak (har qirra yoʻnalishida sinab), eni modulga
 * (pandus tasmasi + yoʻlak + joy = 18,8 m, keyin har qator 16,6 m) qisqartiriladi.
 */
export function mlParking(ring: XY[], levels: number): MlPark | null {
  const lv = Math.max(2, Math.min(5, Math.round(levels)));
  const rl = rampLen(), first = rampWidth() + ML.aisle + ML.stallL, bay = 2 * ML.stallL + ML.aisle, minL = 2 * ML.aisle + rl + (ML.coreStalls + 4) * ML.stallW;
  const ccw = signedArea(ring) > 0 ? ring : [...ring].reverse();
  let best: { a: number; L: number; W: number; x0: number; y0: number; nb: number; n: number } | null = null;
  const angles = new Set<number>(); for (let i = 0; i < ccw.length; i++) { const p = ccw[i], q = ccw[(i + 1) % ccw.length]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 5) continue; const a = Math.atan2(q[1] - p[1], q[0] - p[0]); angles.add(Math.round(a * 1000) / 1000); angles.add(Math.round((a + Math.PI / 2) * 1000) / 1000); }
  for (const a of angles) {
    const R = ccw.map(p => rotP(p, -a)), b = bestRect(R, ML.setback); if (!b) continue;
    const L = b.x1 - b.x0, Wr = b.y1 - b.y0; if (L < minL || Wr < first) continue;
    const nb = 1 + Math.floor((Wr - first) / bay), W = first + (nb - 1) * bay;
    const fp = floorPlan(L, W, nb, rl), n = fp.stalls.length;
    if (!best || n > best.n) best = { a, L, W, x0: b.x0, y0: b.y0 + (Wr - W) / 2, nb, n };
  }
  if (!best) return null;
  const { a, L, W, x0, y0, nb } = best, fp = floorPlan(L, W, nb, rl);
  const toW = (u: number, v: number): XY => { const p = rotP([x0 + u, y0 + v], a); return [p[0], p[1]]; };
  const rect = (q: [number, number, number, number]): XY[] => [toW(q[0], q[1]), toW(q[2], q[1]), toW(q[2], q[3]), toW(q[0], q[3])];
  const per = fp.stalls.length, perFloor = Array.from({ length: lv }, (_, k) => k === 0 ? Math.max(0, per - ML.gateStalls) : per);
  const spaces = perFloor.reduce((t, x) => t + x, 0);
  return {
    ring: rect([0, 0, L, W]), levels: lv, perFloor, spaces, stalls: fp.stalls.map(rect), aisles: fp.aisles.map(rect), ramps: fp.ramps.map(rect), cores: fp.cores.map(rect),
    L: Math.round(L * 10) / 10, W: Math.round(W * 10) / 10, bays: nb, rampL: rl,
    notes: [],
  };
}

/** Ikki halqa orasidagi eng qisqa masofa (kesishmasa), m */
export function ringDist(a: XY[], b: XY[]): number {
  let d = Infinity; for (const p of a) d = Math.min(d, edgeD(p, b)); for (const p of b) d = Math.min(d, edgeD(p, a)); return d;
}

/** 30-jadval sigʻim ustunining yuqori chegarasi (≤ 10, 11–50, 51–100, 101–300, > 300) */
export const COL_MAX = [10, 50, 100, 300, Infinity] as const;
/** 30-jadvaldagi «жамоат бинолари» (park-30 qoidasi bilan bir xil roʻyxat) */
export const PUB30 = new Set(['maktab', 'mtm', 'poliklinika', 'ijtimoiy', 'mamuriy', 'savdo', 'ofis', 'mehmonxona', 'sport', 'aralash']);
/**
 * 06.11 (c55): ochiq avtoturargoh joylaridan binogacha talab qilinadigan masofa, m — 30-jadval, sigʻim ustuni c.
 * Turar joy — derazali tomon (RES30 = WIN30: ShNQ old tomon va 3-ilova derazali qatorining kattasi);
 * maktab/MTM va sport — SOC30 (hudud oʻrniga bino — TALQIN; «–» > 300 — 101–300 qiymati, TALQIN);
 * boshqa jamoat binolari — «жамоат бинолари». null — 30-jadvalga kirmaydi.
 */
export function t30Need(use: string, res: boolean, c: number): number | null {
  if (res) return RES30[c];
  if (use === 'maktab' || use === 'mtm' || use === 'sport') return SOC30[c] ?? SOC30[3];
  if (PUB30.has(use)) return T30.pub[c];
  return null;
}
export interface T30Obs { ring: XY[]; use: string; res: boolean; /** maktab/MTM hududi (kvartal) — school ustuni */ terr?: boolean }
/**
 * 30-jadvalni buzayotgan joylarni olib tashlash. Har sigʻim ustuni c uchun: shu ustun masofasini bajaradigan joylar, koʻpi bilan
 * ustun chegarasicha (binolardan eng uzoqlari qoladi); eng koʻp joy qoladigan ustun tanlanadi. Natija — qoladigan joylar indekslari.
 */
export function trimT30(stalls: XY[][], obs: T30Obs[]): number[] {
  const near = (i: number, c: number) => Math.min(...obs.map(o => { const n = o.terr ? SOC30[c] ?? SOC30[3] : t30Need(o.use, o.res, c); return n == null ? Infinity : ringDist(stalls[i], o.ring) - n; }));
  let best: number[] = [];
  for (let c = 0; c < COL_MAX.length; c++) {
    const ok = stalls.map((_, i) => ({ i, m: near(i, c) })).filter(x => x.m >= -0.3).sort((a, b) => b.m - a.m);
    const pick = ok.slice(0, Math.min(ok.length, COL_MAX[c])).map(x => x.i);
    if (pick.length > best.length) best = pick;
  }
  return best.sort((a, b) => a - b);
}

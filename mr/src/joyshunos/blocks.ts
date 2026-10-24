/**
 * Koʻcha tahlili — bloklar va 14 koʻrsatkich matritsasi (sof hisob, vitest bilan tekshiriladi).
 * Arxitektura: «Koʻcha tahlili — arxitektura» (24.10.2026) — blok chorrahadan chorrahagacha; baho blokning eng yomon
 * nuqtasida (TfL Healthy Streets Check mantigʻi); piyoda oʻtish joylari va hovli kirishlari chegara emas, blok ichidagi nuqta.
 * 30 m dan qisqa boʻlak qoʻshnisiga qoʻshiladi, 250 m dan uzun blok teng qismlarga boʻlinadi — bu raqamlar manbada yoʻq,
 * Toshkent koʻchalarida sinab sozlanadi.
 * Andozalar (meʼyor emas): soya ≥ 75 % (Phoenix Walkable Urban Code §1304), daraxt ≥ 10 / 100 m bir tomonda (Landcom 2008),
 * fasad uzluksizligi ≥ 80 % (SmartCode T5). Meʼyorlar: ShNQ 2.07.06-24 — 2-ilova 1-jadval (piyoda yoʻlagi), 12-band (oʻtish
 * joylari 300–500 m), 26-band (bekatlar 400–600 m).
 */
import { freeOf, FRONT_SETBACK, type Route, type Slice, type SPoi, type Cat } from './street';
import { summerKey, SHNQ_ABROAD } from '../core/place';

/** Baho: c — jiddiy, w — eʼtibor, g — yaxshi, u — nomaʼlum (maʼlumot yoʻq), i — faqat maʼlumot (baho yoʻq) */
export type Lv = 'c' | 'w' | 'g' | 'u' | 'i';
/** Ishonch: oʻlchangan (qoʻlda) · osm · hisob (geometriyadan aniq xulosa) · taxmin (OSM balandlik/daraxt, andoza model) · yoq */
export type Trust = 'qolda' | 'osm' | 'hisob' | 'taxmin' | 'yoq';
export type IndId = 'eni' | 'sath' | 'zichlik' | 'pandus' | 'orindiq' | 'otish' | 'kirish' | 'tezlik' | 'oqim' | 'mashina' | 'bekat' | 'kesim' | 'soya' | 'fasad';
export type Group = 'piyoda' | 'xavf' | 'transport' | 'muhit';
export interface Ind { id: IndId; n: string; name: string; g: Group; q: string }
/** Hujjatdagi 14 koʻrsatkich — guruhlar boʻyicha tartibda (raqam — hujjatdagi 4-boʻlim) */
export const INDS: Ind[] = [
  { id: 'eni', n: 'Eni', name: 'Trotuarning toza eni', g: 'piyoda', q: 'Haqiqatan yurish joyi bormi?' },
  { id: 'sath', n: 'Sath', name: 'Trotuar uzluksizligi va sathi', g: 'piyoda', q: 'Koʻchaga tushmasdan yurish mumkinmi?' },
  { id: 'zichlik', n: 'Zichlik', name: 'Piyoda zichligi', g: 'piyoda', q: 'Shu eni shu oqimga yetadimi?' },
  { id: 'pandus', n: 'Pandus', name: 'Toʻsiqsiz muhit', g: 'piyoda', q: 'Aravachada oʻtib boʻladimi?' },
  { id: 'orindiq', n: 'Oʻrindiq', name: 'Dam olish joylari', g: 'piyoda', q: 'Qayerda oʻrindiq yetishmaydi?' },
  { id: 'otish', n: 'Oʻtish', name: 'Piyoda oʻtish joylari', g: 'xavf', q: 'Qayerda oʻtish joyi yetishmaydi?' },
  { id: 'kirish', n: 'Kirish', name: 'Yon koʻcha va hovli kirishlari', g: 'xavf', q: 'Trotuar ustuvorligi saqlanadimi?' },
  { id: 'tezlik', n: 'Tezlik', name: 'Avtomobil tezligi (85-persentil)', g: 'xavf', q: 'Tezlik odamga mosmi?' },
  { id: 'oqim', n: 'Oqim', name: 'Avtomobil oqimi', g: 'xavf', q: 'Qanday oʻtish joyi kerak?' },
  { id: 'mashina', n: 'Mashina', name: 'Trotuarda turgan avtomobillar', g: 'xavf', q: 'Nazorat yoki toʻsiq kerakmi?' },
  { id: 'bekat', n: 'Bekat', name: 'Bekatlar oraligʻi', g: 'transport', q: 'Jamoat transportiga yetish osonmi?' },
  { id: 'kesim', n: 'Kesim', name: 'Kesim taqsimoti', g: 'transport', q: 'Koʻcha kimga berilgan?' },
  { id: 'soya', n: 'Soya', name: 'Trotuar soyasi va daraxtlar', g: 'muhit', q: 'Daraxtni birinchi qayerga ekish kerak?' },
  { id: 'fasad', n: 'Fasad', name: 'Fasad uzluksizligi', g: 'muhit', q: 'Koʻcha cheti tirikmi yoki boʻshmi?' },
];
export const GROUPS: [Group, string][] = [['piyoda', 'Piyoda yurishi'], ['xavf', 'Xavfsizlik'], ['transport', 'Transport'], ['muhit', 'Muhit']];

/** Katak: baho, koʻrinadigan qiymat, izoh (tarjima shabloni t + p), manba, ishonch */
export interface Cell { lv: Lv; v: string; t: string; p: Record<string, string | number>; src: string; trust: Trust }
export interface Block { i: number; s0: number; s1: number; len: number; sl: number[]; cells: Record<IndId, Cell>; worst: Lv }

/** Andozalar va qoidalar (hujjatdan) */
export const BLOCK_MIN = 30, BLOCK_MAX = 250;
export const SHADE_OK = 0.75, SHADE_MID = 0.5, TREES_OK = 10, TREES_MID = 7, WALL_OK = 0.8, WALL_MID = 0.6;
export const CROSS_MAX = 500, STOP_MAX = 600;

/** Blok chegaralari: [0, chorrahalar…, len] → qisqalari qoʻshiladi, uzunlari teng boʻlinadi */
export function blockBounds(len: number, junctions: number[], minLen = BLOCK_MIN, maxLen = BLOCK_MAX): [number, number][] {
  if (!(len > 0)) return [];
  const b = [0, ...junctions.filter(j => j > 0 && j < len).sort((x, y) => x - y), len];
  // qisqa boʻlak: ichki chegarani olib tashlash (uchidagi qisqa boʻlak — qoʻshni chegara)
  for (let guard = 0; guard < 1000 && b.length > 2; guard++) {
    let k = -1, m = Infinity;
    for (let i = 1; i < b.length; i++) { const l = b[i] - b[i - 1]; if (l < minLen && l < m) { m = l; k = i; } }
    if (k < 0) break;
    if (k === 1) b.splice(1, 1);
    else if (k === b.length - 1) b.splice(k - 1, 1);
    else { const prev = b[k - 1] - b[k - 2], next = b[k + 1] - b[k]; b.splice(prev <= next ? k - 1 : k, 1); }
  }
  const out: [number, number][] = [];
  for (let i = 1; i < b.length; i++) {
    const a = b[i - 1], c = b[i], n = Math.max(1, Math.ceil((c - a) / maxLen - 1e-9));
    for (let k = 0; k < n; k++) out.push([a + (c - a) * k / n, a + (c - a) * (k + 1) / n]);
  }
  return out;
}

const LV_ORDER: Record<Lv, number> = { c: 3, w: 2, g: 1, u: 0, i: 0 };
export const worstOf = (ls: Lv[]): Lv => ls.reduce<Lv>((a, l) => (LV_ORDER[l] > LV_ORDER[a] ? l : a), 'u');
const f1 = (v: number) => v.toFixed(1).replace('.', ',');
const pc = (v: number) => `${Math.round(v * 100)} %`;
const cell = (lv: Lv, v: string, t: string, p: Record<string, string | number>, src: string, trust: Trust): Cell => ({ lv, v, t, p, src, trust });
const nodata = (t: string, src: string): Cell => cell('u', '—', t, {}, src, 'yoq');

/** Nuqtalar (s) orasidagi oraliqlar blokni kesib oʻtganlarining eng kattasi; uchidagi ochiq oraliq — koʻcha davom etadi */
function gapOver(ss: number[], len: number, s0: number, s1: number): { len: number; open: boolean } | null {
  const xs = [...ss].sort((a, b) => a - b);
  let best: { len: number; open: boolean } | null = null;
  const consider = (a: number, b: number, open: boolean) => { if (b <= s0 || a >= s1) return; const l = b - a; if (!best || l > best.len) best = { len: l, open }; };
  consider(0, xs[0], true);
  for (let i = 1; i < xs.length; i++) consider(xs[i - 1], xs[i], false);
  consider(xs[xs.length - 1], len, true);
  return best;
}
const dedup = (ss: number[], d: number) => { const out: number[] = []; for (const s of [...ss].sort((a, b) => a - b)) if (!out.length || s - out[out.length - 1] > d) out.push(s); return out; };

export interface BlockInput {
  rt: Route; sl: Slice[]; pois: (SPoi & { s: number })[]; cat: Cat;
  /** quyosh hisoblanganmi (soya) */
  sunOn: boolean;
  /** qoʻlda sanoq (choʻqqi soat) */
  counts?: { car?: number; ped?: number };
  /** OSM yoʻl tezligi cheklovi, km/soat */
  maxspeed?: number | null;
  /** janubiy yarimshar (soya sanasi yozuvi) */
  south?: boolean;
  /** meʼyorlar profili: 'UZ' — ShNQ meʼyor; 'intl' — ShNQ qiymatlari faqat andoza, «jiddiy» oʻrniga «eʼtibor» */
  norms?: 'UZ' | 'intl';
}

/** Bloklar va har birida 14 koʻrsatkich */
export function blocksOf(I: BlockInput): Block[] {
  const { rt, sl, pois, cat } = I, len = rt.len;
  const B = blockBounds(len, rt.junctions);
  const cr = dedup(pois.filter(p => p.kind === 'crossing' || p.kind === 'signals').map(p => p.s), 15);
  const stops = dedup(pois.filter(p => p.kind === 'stop').map(p => p.s), 40);
  return B.map(([s0, s1], i) => {
    const idx = sl.map((s, k) => ({ s, k })).filter(({ s }) => { const m = s.s + s.len / 2; return m >= s0 && (m < s1 || (s1 >= len - 1e-6 && m <= s1)); }).map(x => x.k);
    const S = idx.map(k => sl[k]), L = s1 - s0;
    const cells = {} as Record<IndId, Cell>;
    // 1. Trotuar eni — fasadgacha boʻsh joy eng tor nuqtada: undan kam boʻlsa, trotuar aniq sigʻmaydi
    if (!cat.sidewalk) cells.eni = cell('i', '—', 'Piyoda yoʻlagi — trotuar meʼyori qoʻllanmaydi', {}, 'ShNQ 2.07.06-24, 2-ilova 1-jadval', 'osm');
    else {
      const fr = S.flatMap(s => [freeOf(s, 'L'), freeOf(s, 'R')]).filter((v): v is number => v != null && v > -5);
      const need = cat.sidewalk[0];
      if (!fr.length) cells.eni = nodata('Ikki tomonda ham bino topilmadi — eni joyida oʻlchanadi', 'ShNQ 2.07.06-24, 2-ilova 1-jadval');
      else {
        const m = Math.max(0, Math.min(...fr));
        cells.eni = m < need
          ? cell('c', `${f1(m)} m`, 'Eng tor joyda fasadgacha ${a} m — ${b} m li piyoda yoʻlagi sigʻmaydi', { a: f1(m), b: f1(need) }, 'ShNQ 2.07.06-24, 2-ilova 1-jadval', 'taxmin')
          : cell('u', `≤ ${f1(m)} m`, 'Fasadgacha eng tor joyda ${a} m — trotuarning oʻzi oʻlchanmagan (meʼyor ${b} m)', { a: f1(m), b: f1(need) }, 'ShNQ 2.07.06-24, 2-ilova 1-jadval', 'taxmin');
      }
    }
    cells.sath = nodata('Uzilish, zinapoya, chuqur, qiyalik — joyda yoki video bilan', 'andoza: qiyalik ≤ 1:40 (DfT Inclusive Mobility)');
    cells.zichlik = I.counts?.ped != null
      ? cell('i', `${I.counts.ped}`, 'Piyoda ${n} kishi/soat — zichlik (kishi/m/daqiqa) uchun trotuar eni kerak', { n: I.counts.ped }, 'andoza: TfL PCL, B+', 'qolda')
      : nodata('Piyoda sanogʻi kerak (video yoki qoʻlda)', 'andoza: TfL PCL, B+');
    cells.pandus = nodata('Pandus, taktil plitka, bekat bordyuri — joyda', 'andoza: DfT Inclusive Mobility; HSCD 28');
    cells.orindiq = nodata('Oʻrindiqlar — joyda yoki video', 'andoza: ≤ 50 m (DfT Inclusive Mobility, HSCD)');
    // 4. Oʻtish joylari
    if (cat.id === 'piyoda') cells.otish = cell('i', '—', 'Piyoda yoʻlagi', {}, 'ShNQ 2.07.06-24, 12-band', 'osm');
    else if (!cr.length) cells.otish = nodata('OSM da piyoda oʻtish joyi belgilanmagan — joyida tekshiring', 'ShNQ 2.07.06-24, 12-band (300–500 m)');
    else {
      const g = gapOver(cr, len, s0, s1)!;
      cells.otish = g.len > CROSS_MAX
        ? cell('c', `${Math.round(g.len)} m`, g.open ? 'Oxirgi oʻtish joyidan keyin ${g} m dan koʻp oʻtish joyi yoʻq' : 'Piyoda oʻtish joylari orasida ${g} m', { g: Math.round(g.len) }, 'ShNQ 2.07.06-24, 12-band (300–500 m)', 'osm')
        : g.open ? cell('u', `${Math.round(g.len)} m+`, 'Koʻcha chetida ${g} m — davomi tahlil qilinmagan', { g: Math.round(g.len) }, 'ShNQ 2.07.06-24, 12-band (300–500 m)', 'osm')
          : cell('g', `${Math.round(g.len)} m`, 'Oʻtish joylari orasida ${g} m', { g: Math.round(g.len) }, 'ShNQ 2.07.06-24, 12-band (300–500 m)', 'osm');
    }
    cells.kirish = nodata('Yon koʻcha va hovli kirishlari — keyingi bosqichda OSM dan', 'andoza: HSCD 8, ITDP');
    cells.tezlik = I.maxspeed
      ? cell('u', `≤ ${I.maxspeed}`, 'OSM da cheklov ${v} km/soat — haqiqiy tezlik (85-persentil) video bilan', { v: I.maxspeed }, 'andoza: ≤ 40 km/soat (GDSG)', 'yoq')
      : nodata('Haqiqiy tezlik (85-persentil) — video bilan', 'andoza: ≤ 40 km/soat (GDSG)');
    cells.oqim = I.counts?.car != null
      ? cell('i', `${I.counts.car}`, 'Avtomobil ${n} / soat (choʻqqi)', { n: I.counts.car }, 'qoʻlda sanoq', 'qolda')
      : nodata('Avtomobil sanogʻi kerak (video yoki qoʻlda)', 'andoza: HSCD 1, 2, 10');
    cells.mashina = nodata('Trotuarda turgan mashinalar — joyda yoki video', '—');
    // 10. Bekatlar
    if (!stops.length) cells.bekat = nodata('OSM da bekat yoʻq — yoʻnalish oʻtmasligi mumkin', 'ShNQ 2.07.06-24, 26-band (400–600 m)');
    else {
      const g = gapOver(stops, len, s0, s1)!;
      cells.bekat = g.len > STOP_MAX
        ? cell('c', `${Math.round(g.len)} m`, g.open ? 'Oxirgi bekatdan keyin ${g} m dan koʻp bekat yoʻq' : 'Bekatlar orasida ${g} m', { g: Math.round(g.len) }, 'ShNQ 2.07.06-24, 26-band (400–600 m)', 'osm')
        : g.open ? cell('u', `${Math.round(g.len)} m+`, 'Koʻcha chetida ${g} m — davomi tahlil qilinmagan', { g: Math.round(g.len) }, 'ShNQ 2.07.06-24, 26-band (400–600 m)', 'osm')
          : cell('g', `${Math.round(g.len)} m`, 'Bekatlar orasida ${g} m', { g: Math.round(g.len) }, 'ShNQ 2.07.06-24, 26-band (400–600 m)', 'osm');
    }
    // 11. Kesim taqsimoti — maʼlumot
    const corr = S.map(s => s.L.d != null && s.R.d != null ? s.L.d + s.R.d : null).filter((v): v is number => v != null);
    if (corr.length) {
      const cw = med(S.map(s => s.cw))!, w = med(corr)!;
      cells.kesim = cell('i', pc(Math.min(1, cw / w)), 'Binodan binogacha ${w} m, qatnov qismi ${c} m — ${p} avtomobilga', { w: Math.round(w), c: f1(cw), p: pc(Math.min(1, cw / w)) }, 'OSM · 3D', 'taxmin');
    } else cells.kesim = nodata('Bir tomonda bino yoʻq — kesim toʻliq emas', 'OSM · 3D');
    // 12. Soya va daraxtlar — yomonroq tomon
    if (!I.sunOn || !S.length) cells.soya = nodata('Soya hisoblanmadi', 'andoza: ≥ 75 % (Phoenix §1304)');
    else {
      const sh = [0, 1].map(k => S.filter(s => !s.sun14[k]).length / S.length), shMin = Math.min(...sh);
      const tr = S.reduce((a, s) => a + s.trees, 0) / 2 / Math.max(L, 1) * 100;
      const lvS: Lv = shMin >= SHADE_OK ? 'g' : shMin >= SHADE_MID ? 'w' : 'c', lvT: Lv = tr >= TREES_OK ? 'g' : tr >= TREES_MID ? 'w' : 'c';
      cells.soya = cell(worstOf([lvS, lvT]), pc(shMin), summerKey('Soyada: chap ${l}, oʻng ${r} (15 iyul 15:30) · daraxtlar ${t} / 100 m bir tomonda', !!I.south), { l: pc(sh[0]), r: pc(sh[1]), t: f1(tr) }, 'andoza: soya ≥ 75 % (Phoenix §1304), daraxt ≥ 10 / 100 m (Landcom)', 'taxmin');
    }
    // 13. Fasad uzluksizligi — yomonroq tomon
    if (!S.length) cells.fasad = nodata('—', 'andoza: ≥ 80 % (SmartCode T5)');
    else {
      const fw = (['L', 'R'] as const).map(sd => S.filter(s => { const v = freeOf(s, sd); return v != null && v <= FRONT_SETBACK; }).length / S.length), m = Math.min(...fw);
      cells.fasad = cell(m >= WALL_OK ? 'g' : m >= WALL_MID ? 'w' : 'c', pc(m), 'Fasad koʻcha boʻyida: chap ${l}, oʻng ${r}', { l: pc(fw[0]), r: pc(fw[1]) }, 'andoza: ≥ 80 % (SmartCode T5); qatnov chetidan ≤ 15 m', 'taxmin');
    }
    if (I.norms === 'intl') for (const d of INDS) { const c = cells[d.id]; if (c.src.startsWith('ShNQ')) { c.src = SHNQ_ABROAD; if (c.lv === 'c') c.lv = 'w'; } }
    const worst = worstOf(INDS.map(d => cells[d.id].lv));
    return { i, s0, s1, len: L, sl: idx, cells, worst };
  });
}
const med = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/**
 * Grafika varaqlari: bosh reja, zonalash, figure-ground, landshaft, qavatlar — masshtabli SVG.
 * Koordinatalar millimetrda (varaq), shuning uchun SVG Illustrator/Inkscape da haqiqiy oʻlchamda ochiladi;
 * har qatlam — alohida nomlangan <g> (Illustrator «qatlam» sifatida oʻqiydi).
 * Sof funksiya: DOM ga bogʻliq emas — birlik testlari bilan tekshiriladi.
 */
import { placeOf } from './place';
import { contourStep, contourSegs, windowOf, slopeAt, HYPSO, type ReliefGrid } from './relief';
import type { Project } from './doc';
import { frame, centroid, area, type XY } from './geo';
import { treeStatus, mergeTrees } from './trees';
import { computePlan } from './plan';
import { useDef, USES } from './uses';
import { profileById, profileWidth, type PartKind, type Cat } from './profiles';
import { derive, ringDist } from './derive';
import { fireLowAccess } from './fireaccess';
import { bLevels } from './levels';
import { offsetLine, projectStreetsGeo, buildNet, asTargets, CURB_R, CURB_R_RECON } from '../scene/streets3d';
import { landscape, greenBalance, GREEN_86, docCarriage } from './landscape';
import { szzGreen } from './szzgen';
import { entryRing } from './parkentry';
import { freeRect, pickLevel, labelLines, modeMax, type LabelMode } from './labels';
import { limitZones, landBalance, hatchSegs, bufferLocal, isActive, LIMIT_NAMES } from './limits';
import { prodChecks } from './prodcheck';
import polygonClipping, { type MultiPolygon, type Polygon } from 'polygon-clipping';
import { gstyleById, useColorOf, styledTree, parcelGrey, inkOn } from './gstyle';
import type { AxoEdit } from './axoedit';

export type SheetKind = 'bosh' | 'zona' | 'parsel' | 'figura' | 'landshaft' | 'qavat' | 'vaziyat' | 'xizmat' | 'cheklov' | 'yashil' | 'insol' | 'transport' | 'shamol' | 'relyef' | 'navbat' | 'issiq' | 'hand' | 'twi' | 'ijtimoiy' | 'parkovka' | 'parkstrat' | 'yongin' | 'daraxt';
export type Paper = 'fit' | 'A4' | 'A3' | 'A2' | 'A1' | 'A0';

/** Varaq namunalari (MR-Varaqlar «Namuna»): atamalar lugʻati boʻyicha */
export const SHEET_KINDS: { id: SheetKind; name: string; note: string }[] = [
  { id: 'bosh', name: 'Bosh reja', note: 'chiziqli reja: binolar, koʻchalar, daraxtlar, qavatlar soni' },
  { id: 'zona', name: 'Zonalashtirish', note: 'daha va yer uchastkalari funksiya rangida' },
  // 06.11 (egasi: «qoʻshimcha yana bitta listga parsel plani, yani faqat parsellari toʻliq rangda koʻrinadi, ichida binolarisiz»)
  { id: 'parsel', name: 'Parsellar rejasi', note: 'parsellar toʻliq funksiya rangida, binolarsiz; koʻcha hududi va qizil chiziqlar' },
  { id: 'figura', name: 'Figura-fon', note: 'binolar qora, boʻsh joy oq — shahar toʻqimasi' },
  { id: 'landshaft', name: 'Landshaft', note: 'yashil hududlar, daraxtlar, suv' },
  { id: 'qavat', name: 'Qavatlar soni', note: 'binolar qavatlar soni boʻyicha rangda' },
  { id: 'vaziyat', name: 'Vaziyat sxemasi', note: 'hudud shaharda: atrof, yoʻllar, uchastka' },
  { id: 'xizmat', name: 'Xizmat radiusi', note: 'piyoda yetib borish: tarmoq boʻylab masofa, obyektlar, uylar' },
  // 12.11 (eski navbat, 2-band; egasi 06.11: «yengil footprint, land-use rang, akso doira-namunalar»)
  { id: 'ijtimoiy', name: 'Ijtimoiy infratuzilma', note: 'maktab, bogʻcha, poliklinika: binolar, xizmat radiusi, aksonometrik namunalar' },
  { id: 'cheklov', name: 'Cheklovlar rejasi', note: 'qurib boʻlmaydigan joy, SMZ, ELU va yer balansi' },
  { id: 'yashil', name: 'Yashil balans', note: 'yashil hududlar, hovli maysasi, maydonchalar; 30 % meʼyori' },
  { id: 'transport', name: 'Transport sxemasi', note: 'koʻchalar toifasi, velo yoʻlak, bekatlar va 400 m radius, avtoturargohlar' },
  // 12.11 (eski navbat, 3-band): avtoturargohlar sxemasi — turlar, joylar, pandus, 300 m (417-band) va talab/taʼminot jadvali
  // 12.11 (eski navbat, 7-band): daraxtlar xaritasi — mavjud (OSM + inventarizatsiya) saqlanadi / kesiladi / binoga yaqin, yangi ekiladiganlar
  { id: 'daraxt', name: 'Daraxtlar xaritasi', note: 'mavjud daraxtlar: saqlanadi, kesiladi, binoga yaqin; yangi ekiladiganlar' },
  { id: 'parkovka', name: 'Avtoturargohlar sxemasi', note: 'yer osti, stilobat, ochiq va koʻp qavatli avtoturargohlar, kirishlar, 300 m radius, talab va taʼminot' },
  { id: 'parkstrat', name: 'Parkovka strategiyasi', note: 'har uydan eng yaqin avtoturargohgacha masofa, avtoturargohlar sigʻimi, piyoda koʻchalar, turlar ulushi' },
  // 12.11 (eski navbat, 5-band; L5 qoidasi ustiga)
  { id: 'yongin', name: 'Yongʻin marshrutlari', note: 'yongʻin avtomobili yetib keladigan sirt, hovli yoʻlaklari, har bino uchun kelish tomoni va 5–8 m zona' },
  { id: 'insol', name: 'Insolyatsiya', note: 'uchastka yer sathi: kuniga quyosh soatlari (6-qadam xaritasi)' },
  { id: 'navbat', name: 'Qurilish navbati', note: 'binolar navbat rangida; har navbat: binolar, maydon, xonadonlar' },
  { id: 'relyef', name: 'Relyef', note: 'balandliklar (gipsometriya), gorizontallar va qiyalik — AWS Terrain Tiles' },
  { id: 'shamol', name: 'Shamol', note: 'shamol guli (iqlim stansiyasi) va piyoda sathidagi oqim — qulaylik (6-qadam)' },
  // 06.11 (egasi: «mana bu analizlar nega varaqlarga bormaydi?»): «Qatlamlar → Yer sathi xaritasi» tahlillari
  { id: 'issiq', name: 'Yuza qizishi', note: 'taxmin: qoplama + soya, 15 iyul 11–17' },
  { id: 'hand', name: 'Suv bosish xavfi (HAND)', note: 'drenajdan balandlik, relyef boʻyicha' },
  { id: 'twi', name: 'Namlik (TWI)', note: 'suv yigʻiladigan pastliklar' },
];

/** Bitta xizmat turi tahlili: piyoda tarmogʻi kesmalari (eng yaqin obyektgacha masofa, m), obyektlar, turar joy binolari */
export interface SheetSvc { id: string; name: string; r: number; rTxt: string; share: number; segs: { a: XY; b: XY; d: number }[]; src: XY[]; dem: { p: XY; bid: string; ok: boolean }[] }
/** Atrof (mahalliy metrda) — editor ContextBundle dan tayyorlab beradi */
export interface SheetCtx {
  buildings: { id: number; rings: XY[][]; h: number }[];
  roads: { id: number; pts: XY[]; w: number; cls: string; name?: string }[];
  rails: XY[][];
  water: XY[][][];
  waterways: { pts: XY[]; w: number }[];
  green: { rings: XY[][]; kind: string }[];
  trees: XY[];
  /** 02.11: xizmat radiuslari tahlili (9-qadam) — «Xizmat radiusi» varagʻi uchun (core/services) */
  svc?: SheetSvc[];
  /** 02.11: insolyatsiya xaritasi (6-qadam; yer sathi katakchalari, soat) — «Insolyatsiya» varagʻi; bins — [chegara soat, rang, yorliq] */
  insol?: { pts: XY[]; hours: ArrayLike<number>; cell: number; date: string; stale?: boolean; bins: [number, string, string][] } | null;
  /** 04.11 (egasi: tahlil varaqlari — shamol): stansiya guli (16 yoʻnalish × tezlik oraliqlari, ulush) va 6-qadamda hisoblangan
   *  piyoda sathidagi oqim (katakchalar rangi — Lawson qulaylik sinfi yoki tezlik nisbati); legend — [rang, yorliq] */
  wind?: { station: string; src: string; rose: number[][]; dir: number; prevailing: string; mean: number; calm: number; pts?: XY[]; cols?: string[]; cell?: number; legend?: [string, string][]; mode?: string; stale?: boolean } | null;
  /** 06.11: yer sathi xaritasi (yuza qizishi, HAND, TWI) — katakchalar rangi, legenda [rang, yorliq], uchastka statistikasi, izoh;
   *  err — maʼlumot yoʻq / hisoblanmagan (varaqda shu yozuv chiqadi) */
  gmap?: { pts: XY[]; cols: string[]; cell: number; title: string; legend: [string, string][]; stats: string[]; note: string; stale?: boolean } | { err: string } | null;
  /** 04.11 (egasi: tahlil varaqlari — relyef): atrof bilan yuklangan balandlik toʻri (core/relief) */
  terrain?: ReliefGrid | null;
  /** jamoat transporti bekatlari va metro kirishlari (10-qadam OSM obyektlari) */
  stops?: { p: XY; kind: 'bekat' | 'metro' }[];
}

/** Qatlamlar (MR-Varaqlar «Qatlamlar», 10 ta): har biriga yoqish, toʻldirish, ochroq, kontur, chiziq mm */
export type SheetLayerId = 'plots' | 'bld' | 'ctx' | 'streets' | 'green' | 'water' | 'yards' | 'site' | 'demo' | 'stops';
export interface SheetLayer { on: boolean; fill: 'use' | 'one' | 'none'; light: boolean; outline: boolean; mm: number }
export const SHEET_LAYERS: { id: SheetLayerId; name: string; note: string; def: SheetLayer }[] = [
  { id: 'plots', name: 'Yer uchastkalari', note: 'funksiya rangida', def: { on: true, fill: 'use', light: false, outline: true, mm: 0.13 } },
  { id: 'bld', name: 'Loyiha binolari', note: 'oq, kontur 0,5 mm', def: { on: true, fill: 'one', light: false, outline: true, mm: 0.4 } },
  { id: 'ctx', name: 'Atrof binolari (OSM)', note: 'kulrang', def: { on: true, fill: 'one', light: false, outline: true, mm: 0.1 } },
  { id: 'streets', name: 'Koʻchalar', note: 'qizil chiziq, qatnov, trotuar', def: { on: true, fill: 'use', light: false, outline: true, mm: 0.3 } },
  { id: 'green', name: 'Yashil hududlar va daraxtlar', note: '', def: { on: true, fill: 'use', light: false, outline: false, mm: 0.12 } },
  { id: 'water', name: 'Suv', note: '', def: { on: true, fill: 'use', light: false, outline: false, mm: 0.1 } },
  { id: 'yards', name: 'Hovlilar', note: '', def: { on: true, fill: 'use', light: false, outline: true, mm: 0.1 } },
  { id: 'site', name: 'Uchastka chegarasi', note: 'qizil, 0,6 mm, uzuq', def: { on: true, fill: 'none', light: false, outline: true, mm: 0.6 } },
  { id: 'demo', name: 'Buziladigan binolar', note: 'qizil uzuq chiziq', def: { on: true, fill: 'none', light: false, outline: true, mm: 0.25 } },
  { id: 'stops', name: 'Bekatlar', note: 'avtobus, metro', def: { on: true, fill: 'one', light: false, outline: true, mm: 0.2 } },
];

export interface SheetOpts {
  kind: SheetKind;
  paper: Paper;
  landscape: boolean;
  /** 0 — avtomatik (standart qatordan hudud sigʻadigan eng yirik masshtab) */
  scale: number;
  title: string;
  show: { title: boolean; scaleBar: boolean; north: boolean; legend: boolean; frame: boolean; grid: boolean; context: boolean; trees: boolean; labels: boolean; demolished: boolean; stamp?: boolean; plotTable?: boolean; situation?: boolean };
  /** yer uchastkasi yozuvlari (4.1): avtomatik yoki eng yuqori daraja */
  labelMode?: LabelMode;
  /** koordinata toʻri qadami, m (0 — avtomatik) */
  gridStep?: number;
  font?: string;
  layers?: Partial<Record<SheetLayerId, Partial<SheetLayer>>>;
  /** varaq ramkasi (V3): markaz (mahalliy m) va burilish, ° (soat strelkasiga qarshi) */
  center?: XY; rot?: number;
  /** 02.11: «Xizmat radiusi» varagʻi — xizmat turi (core/services Svc) */
  svc?: string;
  /** shtamp */
  stamp?: { sheet?: string; author?: string; num?: string; index?: number; total?: number };
  /** rejim (MR-Varaqlar): reja · qavat rejalari · aksonometriya; oxirgi ikkisida chizma maydoniga tayyor mazmun qoʻyiladi */
  mode?: 'reja' | 'qavat' | 'akso' | 'uy' | 'kesim' | 'fazalar';
  /** 12.11: «Koʻcha profili» varagʻi — kesim id si (doc.cuts) */
  cut?: string;
  /** qavat rejalari: namuna va qavat; aksonometriya: namuna va saqlangan koʻrinish */
  /** qavat rejasi varagʻi: floor — bino raqami (1 dan; tarixiy nom), grp — qavatlar guruhi (boʻlmasa — turar qavat) */
  /** qavat: floor — bino (1 dan), grp — qavat guruhi; uy (02.11): floor — uy turi (1 dan), grp — uy qavati (1 dan) */
  plan?: { look?: 'rang' | 'bir'; floor?: number; grp?: number };
  /** c74: grafika shabloni (core/gstyle; sukut — «joriy», hozirgi koʻrinish) va parsellar rejasi: funksiya rangida yoki bir xil quyuq kulrang */
  gstyle?: string; parcel?: 'rang' | 'kulrang';
  /** 11.11: «bir xil kulrang» parsellar rangi (#rrggbb; yoʻq — PARCEL_GREY) */
  parcelGrey?: string;
  axo?: { look?: 'oq' | 'funksiya' | 'fasad' | 'figura' | 'qoralama' | 'qavatlilik' | 'kontekst' | 'demontaj'; view?: string; shadow?: boolean; /** 04.11: daha, kvartal va koʻcha yozuvlari (sukut — yoʻq) */ labels?: boolean;
    /** c77 (11.11): aksonometriya muharriri — qatlamlar, ranglar, material, alohida binolar, tom yozuvlari (core/axoedit; yoʻq — avvalgidek) */ edit?: AxoEdit };
}
/** Tayyor mazmun (qavat rejalari yoki aksonometriya): chizma maydoniga (mm) joylanadi; masshtab yozuvi — label */
export interface SheetInner { body: (vx: number, vy: number, vw: number, vh: number) => string; label: string; legend?: LegendItem[]; /** varaq nomi (sarlavha va shtampda) */ name?: string; /** oʻng ustunda shartli belgilar ostidagi mazmun (masalan, eksplikatsiya) */ side?: (x: number, y: number, w: number, yMax: number) => string }

export const SHEET_DEFAULT: SheetOpts = {
  kind: 'bosh', paper: 'A3', landscape: true, scale: 0, title: '',
  show: { title: true, scaleBar: true, north: true, legend: true, frame: true, grid: false, context: true, trees: true, labels: true, demolished: true, stamp: true, plotTable: true, situation: false },
  labelMode: 'auto', gridStep: 0, font: 'Archivo',
};

export const PAPERS: Record<Exclude<Paper, 'fit'>, [number, number]> = { A4: [297, 210], A3: [420, 297], A2: [594, 420], A1: [841, 594], A0: [1189, 841] };
/** Standart masshtablar qatori (MR-Varaqlar): 1:200 — «ixtiyoriy» ichida */
export const SCALES = [500, 1000, 2000, 5000, 10000];
export const FONTS = ['Archivo', 'IBM Plex Sans', 'Helvetica', 'PT Serif'];

/**
 * Masshtab tavsiyasi (inventar 4.2): VM 497-son qarori va ShNQ 2.07.01-23 masshtabni koʻrsatmaydi — «andoza».
 * Vaziyat sxemasi 1:10 000; master reja ≤ 15 ga — 1:1000, ≤ 60 ga — 1:2000, kattasi — 1:5000.
 */
export function recommendScale(ha: number, kind: SheetKind): { scale: number; src: string } {
  if (kind === 'vaziyat') return { scale: 10000, src: 'andoza' };
  return { scale: ha <= 15 ? 1000 : ha <= 60 ? 2000 : 5000, src: 'andoza' };
}
/** Varaq turi boʻyicha masshtab oraligʻi (cheklovdan tashqarisi — eslatma, taqiq emas) */
export const scaleRange = (k: SheetKind): [number, number] => k === 'vaziyat' ? [10000, 25000] : [500, 5000];

export interface LegendItem { type: 'fill' | 'line' | 'dash' | 'tree' | 'swatch' | 'stop' | 'hatch' | 'text'; fill?: string; stroke?: string; label: string }
export interface PlotRow { code: string; use: string; color: string; ha: number; level: number; /** parsellar rejasidagi toʻliq rang */ full?: string }
export interface SheetResult { svg: string; scale: number; widthMm: number; heightMm: number; legend: LegendItem[]; plots: PlotRow[]; labels: { full: number; total: number }; minText: number; fits: boolean; auto: boolean }

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
/** rangni oqga aralashtirish (0 — oʻzi, 1 — oq) */
const mix = (c: number, t: number) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = (v: number) => Math.round(v + (255 - v) * t); return hex((f(r) << 16) | (f(g) << 8) | f(b)); };
const darker = (c: number, t: number) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, f = (v: number) => Math.round(v * (1 - t)); return hex((f(r) << 16) | (f(g) << 8) | f(b)); };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/** Qavatlar shkalasi */
export const FLOOR_RAMP: { max: number; color: string; label: string }[] = [
  { max: 3, color: '#f3e7c6', label: '1–3 qavat' },
  { max: 5, color: '#f1c98a', label: '4–5 qavat' },
  { max: 9, color: '#e59a5b', label: '6–9 qavat' },
  { max: 16, color: '#c8603c', label: '10–16 qavat' },
  { max: 999, color: '#8e3226', label: '17 va undan yuqori' },
];
const floorColor = (f: number) => FLOOR_RAMP.find(r => f <= r.max)!.color;

const PART_COL: Record<PartKind, string> = { trotuar: '#ffffff', yashil: '#dfe9d3', velo: '#f2d9cf', parkovka: '#ecebe7', qatnov: '#e4e2dd', ajratuvchi: '#dfe9d3', avtobus: '#f0d9d3', tramvay: '#e2dfd8' };

const pip = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

/** Masshtab chizgʻichi uchun «chiroyli» uzunlik, m */
export function niceLen(maxM: number): number {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  return [...steps].reverse().find(s => s <= maxM) ?? 10;
}

/** Varaq tuzilishi (mm): chizma maydoni va oʻng ustun — V3 ramkasi uchun (sheetSvg dagi bilan bir xil) */
export function sheetLayout(o: SheetOpts): { pw: number; ph: number; vw: number; vh: number; col: number; gap: number } {
  const S = { ...SHEET_DEFAULT.show, ...o.show }, paper = o.paper === 'fit' ? 'A3' : o.paper;
  const [pw, ph] = o.landscape ? PAPERS[paper] : [PAPERS[paper][1], PAPERS[paper][0]];
  const hasCol = S.legend || !!S.plotTable || !!S.stamp || !!S.situation, M = 10, gap = 6;
  const col = hasCol ? Math.max(70, Math.min(220, pw * 0.26)) : 0, TB = !hasCol && S.title ? 22 : 0;
  return { pw, ph, vw: pw - 2 * M - (col ? col + gap : 0), vh: ph - 2 * M - TB, col, gap };
}

/** Joriy sozlamalar bilan qatlam (sukut + foydalanuvchi) */
export const layerOf = (o: SheetOpts, id: SheetLayerId): SheetLayer => ({ ...SHEET_LAYERS.find(l => l.id === id)!.def, ...(o.layers?.[id] ?? {}) });

const SHORT: Record<string, string> = { turar: 'Turar joy', yakka: 'Yakka uylar', aralash: 'Aralash', maktab: 'Maktab', mtm: 'MTM', poliklinika: 'Poliklinika', ijtimoiy: 'Ijtimoiy', savdo: 'Savdo', ofis: 'Ofis', mehmonxona: 'Mehmonxona', sport: 'Sport', yashil: 'Park', maydon: 'Skver', avtoturargoh: 'Avtoturargoh', texnik: 'Muhandislik' };

export function sheetSvg(doc: Project, ctx: SheetCtx | null, o: SheetOpts, date = new Date(), ai = false, tr: (s: string) => string = s => s, inner?: SheetInner): SheetResult {
  const fr = frame(doc.origin), fh = doc.settings.floorHeight, S = { ...SHEET_DEFAULT.show, ...o.show };
  const font = o.font ?? 'Archivo', fam = `${font}, Helvetica, Arial, sans-serif`;
  const site = doc.site?.rings.map(r => r.map(fr.toLocal)) ?? null;
  const plan = computePlan(doc);
  const nb = doc.buildings.map(b => ({ b, r: b.footprint.map(fr.toLocal) }));
  const K = o.kind;
  const Ly = (id: SheetLayerId) => layerOf(o, id);
  // c74: grafika shabloni — «joriy» boʻlsa GS = null va hamma narsa avvalgidek
  const G0 = gstyleById(o.gstyle), GS = G0.id === 'joriy' ? null : G0, GX = GS?.ctx ?? null, LW = GS?.line ?? 1, INK = GS?.ink ?? '#1d1d1b';
  const ucol = (u: string) => useColorOf(GS, u);
  const treeSvg = (t: XY, r: number, fill: string, stroke: string, sw: number) => GS?.trees ? styledTree(GS, +X(t), +Y(t), r, t) : `<circle cx="${X(t)}" cy="${Y(t)}" r="${n2(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${lw(sw)}"/>`;
  const treeLeg = (): LegendItem => GS?.trees ? { type: 'tree', label: tr('Daraxtlar'), fill: GS.trees.fills[0], stroke: GS.trees.stroke } : { type: 'tree', label: tr('Daraxtlar') };

  // chizma oʻlchami: uchastka (yoʻq boʻlsa — binolar va koʻchalar); vaziyat sxemasida — atrof ham
  const pts: XY[] = [...(site?.[0] ?? []), ...nb.flatMap(x => x.r), ...doc.streets.flatMap(s => s.axis.map(fr.toLocal))];
  if (!pts.length) pts.push([-100, -100], [100, 100]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  let bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  if (K === 'vaziyat') { const c0 = [(bx0 + bx1) / 2, (by0 + by1) / 2], r = Math.max(600, (bx1 - bx0), (by1 - by0)) * 1.2; bx0 = c0[0] - r; bx1 = c0[0] + r; by0 = c0[1] - r; by1 = c0[1] + r; }
  const cx = o.center?.[0] ?? (bx0 + bx1) / 2, cy = o.center?.[1] ?? (by0 + by1) / 2;
  const rot = (o.rot ?? 0) * Math.PI / 180, cr = Math.cos(rot), sr = Math.sin(rot);
  // varaq oʻlchami: oʻng ustun (sarlavha, shartli belgilar, jadval, shtamp) — 26 %, 70…220 mm
  const hasCol = S.legend || !!S.plotTable || !!S.stamp || !!S.situation;
  const M = 10, gap = 6;
  const layout = (pw: number, ph: number) => { const col = hasCol ? Math.max(70, Math.min(220, pw * 0.26)) : 0, TB = !hasCol && S.title ? 22 : 0; return { col, TB, vw: pw - 2 * M - (col ? col + gap : 0), vh: ph - 2 * M - TB }; };
  // rotatsiyadagi kenglik/balandlik (m)
  const ext = (() => { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const p of [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]] as XY[]) { const u = (p[0] - cx) * cr + (p[1] - cy) * sr, v = -(p[0] - cx) * sr + (p[1] - cy) * cr; a = Math.min(a, u); b = Math.max(b, u); c = Math.min(c, v); d = Math.max(d, v); } return [Math.max(b, -a) * 2, Math.max(d, -c) * 2]; })();
  let pw: number, ph: number, scale: number, auto = false;
  if (o.paper === 'fit') {
    scale = o.scale > 0 ? o.scale : recommendScale(site ? Math.abs(area(site[0])) / 1e4 : 1, K).scale; auto = !(o.scale > 0);
    const kk = 1000 / scale, w = ext[0] * 1.15 * kk, h = ext[1] * 1.15 * kk, col = hasCol ? 120 : 0;
    pw = Math.ceil(w + 2 * M + (col ? col + gap : 0)); ph = Math.ceil(Math.max(h + 2 * M + (!hasCol && S.title ? 22 : 0), col ? 200 : 0));
  } else {
    [pw, ph] = o.landscape ? PAPERS[o.paper] : [PAPERS[o.paper][1], PAPERS[o.paper][0]];
    const L0 = layout(pw, ph), need = Math.max(ext[0] * 1.15 / L0.vw, ext[1] * 1.15 / L0.vh) * 1000;
    auto = !(o.scale > 0);
    scale = o.scale > 0 ? o.scale : (SCALES.find(v => v >= need) ?? Math.ceil(need / 10000) * 10000);
  }
  const { col, TB, vw, vh } = o.paper === 'fit' ? (() => { const c2 = hasCol ? 120 : 0; return { col: c2, TB: !hasCol && S.title ? 22 : 0, vw: pw - 2 * M - (c2 ? c2 + gap : 0), vh: ph - 2 * M - (!hasCol && S.title ? 22 : 0) }; })() : layout(pw, ph);
  const vx = M, vy = M;
  const k = 1000 / scale; // 1 m → mm
  const fits = ext[0] * k <= vw + 0.5 && ext[1] * k <= vh + 0.5;
  const toV = (p: XY): [number, number] => { const dx = p[0] - cx, dy = p[1] - cy; return [vx + vw / 2 + (dx * cr + dy * sr) * k, vy + vh / 2 - (-dx * sr + dy * cr) * k]; };
  const X = (p: XY) => n2(toV(p)[0]), Y = (p: XY) => n2(toV(p)[1]);
  const P = (p: XY) => { const v = toV(p); return `${n2(v[0])},${n2(v[1])}`; };
  const ringD = (r: XY[]) => r.length ? 'M' + r.map(P).join('L') + 'Z' : '';
  const polyD = (rings: XY[][]) => rings.map(ringD).join('');
  const lineD = (l: XY[]) => l.length ? 'M' + l.map(P).join('L') : '';
  // koʻrinadigan oyna (metrda, burilishni hisobga olib) — undan tashqaridagi atrof chizilmaydi
  const R = Math.hypot(vw, vh) / 2 / k + 20;
  const vis = (r: XY[]) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const p of r) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return x1 > cx - R && x0 < cx + R && y1 > cy - R && y0 < cy + R; };
  const lw = (mm: number) => n2(mm);
  let minText = 99; const T = (mm: number) => { minText = Math.min(minText, mm); return n2(mm); };

  const L: string[] = [], legend: LegendItem[] = [];
  const g = (id: string, body: string, attrs = '') => { if (body) L.push(ai ? `<g id="${id}" i:layer="yes" inkscape:groupmode="layer" inkscape:label="${id}"><g clip-path="url(#vp)"${attrs}>${body}</g></g>` : `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${id}"${attrs}>${body}</g>`); };
  const VZ = K === 'vaziyat', LS = K === 'landshaft' || K === 'yashil', PR = K === 'parsel';
  /** 12.11: ijtimoiy infratuzilma varagʻida urgʻulanadigan funksiyalar (uses.ts, «Ijtimoiy» guruhi) */
  const SOC = new Set(USES.filter(u => u.group === 'Ijtimoiy').map(u => u.id as string));
  // 12.11 (avtoturargohlar sxemasi): ShNQ 2.07.01-23, 417-band — vaqtincha avtoturargohdan obyektgacha ≤ 300 m (TALQIN: barcha avtoturargohlarga;
  // toʻgʻri chiziq, kirish/garaj chetidan bino chetigacha). Undan uzoq turar joy binolari — pushti
  const PK_R = 300, PK_G = K === 'parkovka' ? doc.garages.filter(q => !q.truck).map(q => q.ring.map(fr.toLocal)) : [];
  // 12.11 (parkovka strategiyasi): har turar joy binosidan eng yaqin avtoturargohgacha toʻgʻri chiziq (bino chetidan garaj chetigacha) va oraliq
  const PS_G = K === 'parkstrat' ? doc.garages.filter(q => !q.truck).map(q => ({ q, r: q.ring.map(fr.toLocal) })) : [];
  const PS_D = new Map<string, number>(), PS_L = new Map<string, [XY, XY]>();
  if (PS_G.length) for (const x of nb) { if (useDef(x.b.use).res <= 0) continue; let best = Infinity, seg: [XY, XY] | null = null; const c = centroid(x.r);
    for (const { r } of PS_G) { const d = ringDist(r, x.r); if (d < best) { best = d; let bp: XY = r[0], bd = Infinity; for (let i = 0; i < r.length; i++) { const a = r[i], b2 = r[(i + 1) % r.length], dx = b2[0] - a[0], dy = b2[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / L2)), p: XY = [a[0] + dx * t, a[1] + dy * t], dd = Math.hypot(p[0] - c[0], p[1] - c[1]); if (dd < bd) { bd = dd; bp = p; } } seg = [c, bp]; } }
    PS_D.set(x.b.id, best); if (seg && best > 0) PS_L.set(x.b.id, seg); }
  const FA = K === 'yongin' ? fireLowAccess(doc) : null;
  const PS_BAND = (d: number): [string, string] => d <= 100 ? ['#1a9850', '≤ 100 m'] : d <= 200 ? ['#91cf60', '100–200 m'] : d <= 300 ? ['#fdae61', '200–300 m'] : ['#d73027', '> 300 m'];
  const PK_FAR = new Set(K === 'parkovka' && PK_G.length ? nb.filter(x => useDef(x.b.use).res > 0 && !PK_G.some(gr => ringDist(gr, x.r) <= PK_R)).map(x => x.b.id) : []);
  /** parsellar rejasi (06.11): atrof xira */
  const fade = PR ? ' opacity="0.45"' : '';
  const C = {
    bg: '#ffffff',
    ctxB: K === 'figura' ? '#1d1d1b' : K === 'qavat' ? '#e4e2dd' : GX ? GX.bld : VZ ? '#d9d6cf' : '#e7e5e0',
    ctxStroke: K === 'figura' || (VZ && !GX) ? 'none' : GX ? GX.bldStroke : '#cfccc5',
    roadEdge: K === 'figura' ? 'none' : GX ? GX.roadEdge : '#d6d3cc',
    road: GX ? GX.road : '#f6f5f2', road2: GX ? GX.road : '#e9e7e2',
    green: LS ? '#cfe3bc' : K === 'figura' ? '#ffffff' : GX ? GX.green : '#e6eedd',
    wood: LS ? '#b5d39c' : GX ? GX.wood : '#dde8d2',
    water: K === 'figura' ? '#ffffff' : GX ? GX.water : '#d3e4ee',
    tree: LS ? '#9cc27f' : 'none', treeStroke: LS ? '#6f9f4c' : '#9a9a92',
  };
  const lite = (c: string, on: boolean) => on ? mix(parseInt(c.slice(1), 16), 0.45) : c;
  const site0 = site?.[0] ?? null;
  const inSite = (p: XY) => !!site0 && pip(p, site0);
  /** 12.11: daraxtlar xaritasi — yangi ekiladigan (koʻcha va hovli) daraxtlar */
  const NEWT: XY[] = [];

  // 1. atrof (yoʻllar va yashil hududlar uchastka ichida chizilmaydi — u yer qayta loyihalanadi)
  const outside = site ? ' mask="url(#tashqari)"' : '';
  const keep = new Set(doc.keep), adopted = new Set([...doc.streets.filter(s => s.osm != null).map(s => s.osm!), ...(doc.removedRoads ?? [])]);
  const lG = Ly('green'), lW = Ly('water'), lC = Ly('ctx'), lD = Ly('demo');
  if (ctx && S.context) {
    if (K !== 'figura') {
      if (lG.on && lG.fill !== 'none') g('Atrof_yashil', ctx.green.filter(a => a.rings[0] && vis(a.rings[0])).map(a => `<path d="${polyD(a.rings)}" fill="${lite(/wood|forest|scrub/.test(a.kind) ? C.wood : C.green, lG.light)}" fill-rule="evenodd"/>`).join(''), outside + fade);
      if (lW.on) g('Atrof_suv', ctx.water.filter(a => a[0] && vis(a[0])).map(a => `<path d="${polyD(a)}" fill="${lite(C.water, lW.light)}" fill-rule="evenodd"/>`).join('')
        + ctx.waterways.filter(w => vis(w.pts)).map(w => `<path d="${lineD(w.pts)}" fill="none" stroke="${C.water}" stroke-width="${n2(Math.max(0.4, w.w * k))}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''), fade);
    }
    const roads = ctx.roads.filter(r => !adopted.has(r.id) && vis(r.pts) && !/^(footway|path|steps|track|bridleway|corridor|cycleway)$/.test(r.cls));
    if (K !== 'figura' && roads.length && Ly('streets').on) {
      const sw0 = (c: string) => /^(motorway|trunk|primary|secondary)/.test(c) ? 4 : /^tertiary/.test(c) ? 3 : /^service/.test(c) ? 0 : 2.2;
      const minW = VZ ? 0.35 : 0;
      /* 06.11, 23:10 (egasi): loyiha koʻchasining uchastkadan tashqaridagi qismi — atrofdagi mavjud koʻchalar uslubida, mavjud koʻchagacha
         ulangan (tugun modeli bilan choʻzilgan oʻq); maska bilan faqat tashqarida — ichkarisi loyiha uslubida (3-band) */
      const projR: { pts: XY[]; w: number; s: number }[] = site && !VZ && doc.streets.length
        ? buildNet(doc.streets.map(s => ({ id: s.id, axis: s.axis.map(fr.toLocal), parts: profileById(s.profile).parts })), asTargets(roads.map(r => ({ pts: r.pts, cls: r.cls, w: r.w })))).list
          .map(s => { const W = s.parts.reduce((t, p) => t + p.w, 0), a = s.parts.filter(p => /^(qatnov|avtobus|tramvay|parkovka|velo)$/.test(p.k)).reduce((t, p) => t + p.w, 0); return { pts: s.axis, w: a || W, s: a ? (W - a) / 2 : 0 }; })
          .filter(r => r.pts.length >= 2 && vis(r.pts))
        : [];
      const all = [...roads.map(r => ({ pts: r.pts, w: r.w, s: sw0(r.cls) })), ...projR];
      g('Atrof_yollar', all.map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="${C.roadEdge}" stroke-width="${n2(Math.max(minW + 0.2, (r.w + 2 * r.s) * k + 0.25))}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
        + all.map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="${C.road}" stroke-width="${n2(Math.max(minW, (r.w + 2 * r.s) * k))}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
        + all.filter(r => r.s > 0).map(r => `<path d="${lineD(r.pts)}" fill="none" stroke="${C.road2}" stroke-width="${n2(r.w * k)}" stroke-linecap="round" stroke-linejoin="round"/>`).join(''), (VZ ? '' : outside) + fade);
    }
    if (K !== 'figura' && ctx.rails.length) g('Atrof_temir_yol', ctx.rails.filter(vis).map(l => `<path d="${lineD(l)}" fill="none" stroke="#9a978f" stroke-width="${lw(0.35)}" stroke-dasharray="3 1.2"/>`).join(''), outside + fade);
    const rmv = new Set(doc.removed ?? []), cb = ctx.buildings.filter(b => b.rings[0] && vis(b.rings[0]) && !rmv.has(b.id));
    const kept = cb.filter(b => !inSite(centroid(b.rings[0])) || keep.has(b.id));
    const gone = cb.filter(b => inSite(centroid(b.rings[0])) && !keep.has(b.id));
    if (lC.on) g('Atrof_binolar', kept.map(b => {
      const fill = lC.fill === 'none' ? 'none' : K === 'qavat' ? floorColor(Math.max(1, Math.round(b.h / 3.2))) : lite(C.ctxB, lC.light);
      return `<path d="${polyD(b.rings)}" fill="${fill}" fill-rule="evenodd"${C.ctxStroke !== 'none' && lC.outline ? ` stroke="${C.ctxStroke}" stroke-width="${lw(lC.mm)}"` : ''}/>`;
    }).join(''), fade);
    if (S.demolished && lD.on && K !== 'figura' && !VZ && !PR && gone.length) {
      g('Buziladigan_binolar', gone.map(b => `<path d="${polyD(b.rings)}" fill="none" stroke="#c0392b" stroke-width="${lw(lD.mm)}" stroke-dasharray="1.2 0.8"/>`).join(''));
      legend.push({ type: 'dash', stroke: '#c0392b', label: `${tr('Buziladigan binolar')} (${gone.length})` });
    }
    if (S.trees && lG.on && K !== 'figura' && !VZ && !PR) {
      const tr2 = ctx.trees.filter(t => !inSite(t) && Math.abs(t[0] - cx) < R && Math.abs(t[1] - cy) < R);
      g('Atrof_daraxtlar', tr2.map(t => treeSvg(t, Math.max(0.5, 2.5 * k), C.tree === 'none' ? 'none' : mix(0x9cc27f, 0.35), C.treeStroke, 0.08)).join(''));
    }
  }

  // 2. daha va yer uchastkalari
  const lP = Ly('plots');
  // c74: «bir xil quyuq kulrang» parsellar (o.parcel) va shablon palitrasi; shablonda toʻliq rang quyuqlashtirilmaydi (shablon ranglari oʻzi toʻyingan)
  const grey = PR && o.parcel === 'kulrang', PG = parcelGrey(o.parcelGrey);
  const parcelFill = (u: string) => grey ? PG : GS ? hex(ucol(u)) : darker(ucol(u), 0.12);   // toʻliq (quyuqroq) funksiya rangi
  const plotFill = (u: string) => lP.fill === 'none' ? 'none' : lP.fill === 'one' ? (lP.light ? '#f4f3f0' : '#ecebe7') : mix(ucol(u), lP.light ? 0.45 : GS ? 0.05 : 0.15);
  if (lP.on && !VZ) {
    if (K === 'zona') {
      g('Zonalar', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="${plotFill(b.use)}"${lP.outline ? ` stroke="#ffffff" stroke-width="${lw(Math.max(lP.mm, 0.35) * LW)}"` : ''} fill-rule="evenodd"/>`).join(''));
      for (const u of USES) if (plan.blocks.some(b => b.use === u.id)) legend.push({ type: 'fill', fill: plotFill(u.id), label: tr(u.name) });
    } else if (PR) {
      // parsellar rejasi (06.11): toʻliq funksiya rangi, qora kontur; ichida binolar, daraxtlar, maydonchalar yoʻq
      const pS = grey ? '#ffffff' : INK;
      g('Parsellar', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="${parcelFill(b.use)}" stroke="${pS}" stroke-width="${lw(Math.max(lP.mm, 0.35) * (grey ? 1.4 : LW))}" stroke-linejoin="round" fill-rule="evenodd"/>`).join(''));
      if (grey) { if (plan.blocks.length) legend.push({ type: 'fill', fill: PG, stroke: '#1d1d1b', label: tr('Yer uchastkalari') }); }
      else for (const u of USES) if (plan.blocks.some(b => b.use === u.id)) legend.push({ type: 'fill', fill: parcelFill(u.id), stroke: INK, label: tr(u.name) });
    } else if (K === 'cheklov') {
      g('Kvartallar', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="${mix(ucol(b.use), 0.62)}" stroke="#b9b5ab" stroke-width="${lw(lP.mm)}" fill-rule="evenodd"/>`).join(''));
    } else if (LS) {
      g('Yashil_kvartallar', plan.blocks.filter(b => b.use === 'yashil' || b.use === 'himoya' || b.use === 'sport' || b.use === 'maydon').map(b => `<path d="${polyD(b.rings)}" fill="${b.use === 'yashil' || b.use === 'himoya' ? '#bcd9a3' : b.use === 'sport' ? '#cfe6ef' : '#efe9dc'}" fill-rule="evenodd"/>`).join(''));
      if (lP.outline) g('Kvartal_chegaralari', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="none" stroke="#b9b5ab" stroke-width="${lw(lP.mm)}"/>`).join(''));
    } else if (K !== 'figura' && lP.outline) {
      // c74: shablonda loyiha hududi rangli (kvartallar funksiya rangining och tusida), atrof oq
      g('Kvartal_chegaralari', plan.blocks.map(b => `<path d="${polyD(b.rings)}" fill="${GS && K === 'bosh' && lP.fill === 'use' ? mix(ucol(b.use), 0.72) : 'none'}" stroke="#b9b5ab" stroke-width="${lw(lP.mm)}"${GS ? ' fill-rule="evenodd"' : ''}/>`).join(''));
    }
  }

  // 2a. insolyatsiya (02.11): 6-qadamda hisoblangan yer sathi xaritasi — katakchalar soat oraligʻi rangida (bitta oraliq — bitta path)
  if (K === 'insol') {
    const I = ctx?.insol;
    if (I && I.pts.length) {
      const h2 = I.cell / 2, by: string[][] = I.bins.map(() => []);
      I.pts.forEach((p, i) => { if (Math.abs(p[0] - cx) > R || Math.abs(p[1] - cy) > R) return; let b = 0; I.bins.forEach(([t], j) => { if (I.hours[i] >= t) b = j; }); by[b].push(`M${P([p[0] - h2, p[1] - h2])}L${P([p[0] + h2, p[1] - h2])}L${P([p[0] + h2, p[1] + h2])}L${P([p[0] - h2, p[1] + h2])}Z`); });
      g('Insolyatsiya', I.bins.map(([, c], j) => by[j].length ? `<path d="${by[j].join('')}" fill="${c}" fill-opacity="0.85"/>` : '').join(''));
      I.bins.forEach(([, c, l]) => legend.push({ type: 'fill', fill: c, label: `${tr('Quyosh')} ${tr(l)}${/soat/.test(l) ? '' : ` ${tr('soat')}`}` }));
      legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: `${tr('Sana')} ${I.date.split('-').reverse().join('.')} · SanQvaN 0102-25, 95-band${I.stale ? ` · ${tr('loyiha oʻzgargan — qayta hisoblang')}` : ''}` });
    } else legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: tr('Insolyatsiya hisoblanmagan — 6-qadam «Quyosh va shamol»') });
  }

  // 2a''. relyef (04.11): gipsometrik boʻyash (toʻr katakchalari, qator boʻyicha birlashtirilgan) va gorizontallar
  if (K === 'relyef') {
    const tf = (key: string, v: Record<string, unknown>) => tr(key).replace(/\$\{(\w+)\}/g, (_m, e: string) => String(v[e]));
    const G0 = ctx?.terrain, w = G0 ? windowOf(G0, [cx - R, cy - R, cx + R, cy + R]) : null;
    if (G0 && w) {
      const range = Math.max(0.5, w.max - w.min), cs = contourStep(range), bw = cs * Math.max(1, Math.ceil(range / cs / HYPSO.length)), b0 = Math.floor(w.min / bw) * bw, nb = Math.min(HYPSO.length, Math.ceil((w.max - b0) / bw + 1e-9));
      const by: string[][] = HYPSO.map(() => []), st = G0.step, x0 = G0.c0[0] - G0.radius, y0 = G0.c0[1] - G0.radius;
      for (let j = w.j0; j <= w.j1; j++) {
        let run = -1, i0 = w.i0;
        const flush = (i1: number) => { if (run < 0) return; const xa = x0 + (i0 - 0.5) * st, xb = x0 + (i1 + 0.5) * st, ya = y0 + (j - 0.5) * st, yb = y0 + (j + 0.5) * st; by[run].push(`M${P([xa, ya])}L${P([xb, ya])}L${P([xb, yb])}L${P([xa, yb])}Z`); };
        for (let i = w.i0; i <= w.i1; i++) { const c = Math.max(0, Math.min(nb - 1, Math.floor((G0.h[j * G0.n + i] - b0) / bw))); if (c !== run) { flush(i - 1); run = c; i0 = i; } }
        flush(w.i1);
      }
      g('Gipsometriya', by.map((d, c) => d.length ? `<path d="${d.join('')}" fill="${HYPSO[c]}"/>` : '').join(''));
      const lvls: number[] = []; for (let v = Math.ceil(w.min / cs) * cs; v <= w.max; v += cs) lvls.push(Math.round(v * 100) / 100);
      const idx = (v: number) => Math.abs(v / (cs * 5) - Math.round(v / (cs * 5))) < 1e-6;
      const cl = contourSegs(G0, w, lvls);
      g('Gorizontallar', cl.map(({ lv, segs }) => segs.length ? `<path d="${segs.map(([a, b]) => `M${P(a)}L${P(b)}`).join('')}" fill="none" stroke="#8a6f55" stroke-width="${lw(idx(lv) ? 0.28 : 0.1)}"${idx(lv) ? '' : ' stroke-opacity="0.8"'}/>` : '').join(''));
      for (let c = nb - 1; c >= 0; c--) legend.push({ type: 'fill', fill: HYPSO[c], label: `${String(Math.round((b0 + c * bw) * 10) / 10).replace('.', ',')}–${String(Math.round((b0 + (c + 1) * bw) * 10) / 10).replace('.', ',')} m` });
      legend.push({ type: 'line', stroke: '#8a6f55', label: tf('Gorizontallar: har ${a} m (qalin — ${b} m)', { a: String(cs).replace('.', ','), b: String(cs * 5).replace('.', ',') }) });
      // uchastka: balandlik oraligʻi va oʻrtacha qiyalik
      if (site) {
        let mn = Infinity, mx = -Infinity, ss = 0, nn = 0, steep = 0;
        const pin = (p: XY, r: XY[]) => { let c = false; for (let a = 0, b = r.length - 1; a < r.length; b = a++) if ((r[a][1] > p[1]) !== (r[b][1] > p[1]) && p[0] < (r[b][0] - r[a][0]) * (p[1] - r[a][1]) / (r[b][1] - r[a][1]) + r[a][0]) c = !c; return c; };
        for (let j = w.j0; j <= w.j1; j++) for (let i = w.i0; i <= w.i1; i++) { const p: XY = [x0 + i * st, y0 + j * st]; if (!pin(p, site[0])) continue; const v = G0.h[j * G0.n + i], sl = slopeAt(G0, i, j); mn = Math.min(mn, v); mx = Math.max(mx, v); ss += sl; nn++; if (sl > 8) steep++; }
        if (nn) legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: tf('Uchastka: ${a}–${b} m, oʻrtacha qiyalik ${s} %, > 8 % — ${p} %', { a: String(Math.round(mn * 10) / 10).replace('.', ','), b: String(Math.round(mx * 10) / 10).replace('.', ','), s: String(Math.round(ss / nn * 10) / 10).replace('.', ','), p: Math.round(steep / nn * 100) }) });
      }
      legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: tf('Relyef: AWS Terrain Tiles, qadam ${s} m', { s: G0.step }) });
    } else legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: tr('Relyef yuklanmagan — 1-qadamda atrofni yuklang (relyef qatlami bilan)') });
  }

  // 2a'''. yer sathi xaritalari (06.11): yuza qizishi, suv bosish xavfi (HAND), namlik (TWI) — «Qatlamlar → Yer sathi xaritasi» bilan bir xil hisob
  if (K === 'issiq' || K === 'hand' || K === 'twi') {
    const M = ctx?.gmap, info = (label: string) => {   // uzun izoh oʻng ustundan chiqmasin: ~46 belgilik qatorlarga (birinchisi belgili, qolgani belgisiz)
      const ws = label.split(' '), ls: string[] = ['']; for (const wd of ws) { const c = ls[ls.length - 1]; if (c && (c + ' ' + wd).length > 46) ls.push(wd); else ls[ls.length - 1] = c ? c + ' ' + wd : wd; }
      ls.forEach((l, i) => legend.push(i ? { type: 'text', label: l } : { type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: l }));
    };
    if (M && 'pts' in M && M.pts.length) {
      const h2 = M.cell / 2, by = new Map<string, string[]>();
      M.pts.forEach((p, i) => { if (Math.abs(p[0] - cx) > R || Math.abs(p[1] - cy) > R) return; const c = M.cols[i]; if (!by.has(c)) by.set(c, []); by.get(c)!.push(`M${P([p[0] - h2, p[1] - h2])}L${P([p[0] + h2, p[1] - h2])}L${P([p[0] + h2, p[1] + h2])}L${P([p[0] - h2, p[1] + h2])}Z`); });
      g(K === 'issiq' ? 'Yuza_qizishi' : K === 'hand' ? 'Suv_bosish_HAND' : 'Namlik_TWI', [...by].map(([c, d]) => `<path d="${d.join('')}" fill="${c}" fill-opacity="0.8"/>`).join(''));
      M.legend.forEach(([c, l]) => legend.push({ type: 'fill', fill: c, label: tr(l) }));
      M.stats.forEach(t => info(tr(t)));
      info(`${tr(M.note)}${M.stale ? ` · ${tr('loyiha oʻzgargan — qayta hisoblang')}` : ''}`);
    } else info(tr(M && 'err' in M ? M.err : 'Maʼlumot yoʻq'));
  }

  // 2a'. shamol (04.11): 6-qadamda hisoblangan piyoda sathidagi oqim — katakchalar sinf rangida (bitta rang — bitta path)
  if (K === 'shamol') {
    const Wd = ctx?.wind;
    if (Wd?.pts?.length && Wd.cols && Wd.cell) {
      const h2 = Wd.cell / 2, by = new Map<string, string[]>();
      Wd.pts.forEach((p, i) => { if (Math.abs(p[0] - cx) > R || Math.abs(p[1] - cy) > R) return; const c = Wd.cols![i]; if (!by.has(c)) by.set(c, []); by.get(c)!.push(`M${P([p[0] - h2, p[1] - h2])}L${P([p[0] + h2, p[1] - h2])}L${P([p[0] + h2, p[1] + h2])}L${P([p[0] - h2, p[1] + h2])}Z`); });
      g('Shamol_oqimi', [...by].map(([c, d]) => `<path d="${d.join('')}" fill="${c}" fill-opacity="0.8"/>`).join(''));
      (Wd.legend ?? []).forEach(([c, l]) => legend.push({ type: 'fill', fill: c, label: tr(l) }));
      legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: `${tr(Wd.mode === 'ratio' ? 'Tezlik nisbati' : 'Qulaylik (Lawson)')}${Wd.stale ? ` · ${tr('loyiha oʻzgargan — qayta hisoblang')}` : ''}` });
    } else legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: tr(Wd ? 'Shamol oqimi hisoblanmagan — 6-qadam «Quyosh va shamol»' : 'Shamol maʼlumoti yoʻq — 6-qadam «Quyosh va shamol»') });
  }

  // 2b. hovlilar (obodonlashtirish)
  const lY = Ly('yards');
  if (doc.settings.yards && lY.on && (K === 'bosh' || LS)) {
    const yards = landscape(doc), L2 = LS;
    const out: string[] = [];
    for (const y of yards) {
      if (lY.fill !== 'none') y.green.forEach(p => out.push(`<path d="${polyD(p)}" fill="${lite(L2 ? '#cfe3bc' : GX ? GX.green : '#eef3e8', lY.light)}" fill-rule="evenodd"/>`));
      y.paths.forEach(p => out.push(`<path d="${polyD(p)}" fill="#ffffff"${lY.outline ? ` stroke="#c9c4b9" stroke-width="${lw(lY.mm)}"` : ''} fill-rule="evenodd"/>`));
      y.play.forEach(q => out.push(`<path d="${ringD(q.ring)}" fill="${L2 ? ({ bolalar: '#f6dcae', kattalar: '#efe6d3', sport: '#bcd9c2', xojalik: '#e2ded6', tajriba: '#e3d6bd' } as Record<string, string>)[q.kind] : '#ffffff'}" stroke="#8f8676" stroke-width="${lw(Math.max(lY.mm, 0.15))}"/>`));
    }
    // sport hududi inshootlari (31.10)
    const SPC: Record<string, string> = { stadion: '#bcd9b0', yolka: '#e7b9ab', futbol: '#bcd9b0', minifutbol: '#c6dfbb', tennis: '#b7cde3', basket: '#ecc9a7', voley: '#efdcae', workout: '#dcdad5', basseyn: '#b9dff0', yopiq: '#e6e9ee' };
    for (const y of yards) for (const q of y.sport ?? []) { out.push(`<path d="${ringD(q.ring)}" fill="${L2 ? SPC[q.k] : '#ffffff'}" stroke="#8f8676" stroke-width="${lw(Math.max(lY.mm, 0.13))}"/>`); for (const ln of q.k === 'basseyn' ? [] : q.lines) out.push(`<polyline points="${ln.map(p => `${X(p)},${Y(p)}`).join(' ')}" fill="none" stroke="${L2 ? '#ffffff' : '#b9b3a6'}" stroke-width="${lw(0.1)}"/>`); }
    g('Hovlilar', out.join(''));
    if (S.trees && lG.on) g('Hovli_daraxtlari', yards.flatMap(y => y.trees).map(t => treeSvg(t, Math.max(0.6, 2.8 * k), L2 ? '#9cc27f' : '#ffffff', L2 ? '#5f8f3e' : '#7d8a6a', 0.12)).join(''));
    if (yards.some(y => y.play.length)) legend.push({ type: 'fill', fill: L2 ? '#f6dcae' : '#ffffff', stroke: '#8f8676', label: tr('Hovli maydonchalari (4-jadval)') });
  }

  // 3. loyiha koʻchalari — 06.11: sahna bilan bir xil geometriya (tugunlar, bordyur yoylari, trotuar burchakda aylanadi, qizil chiziq
  //    burchagi yoy bilan, koʻcha ogʻzi va berk uch ochiq); varaqda faqat uchastka (loyiha chegarasi) ichida — tashqarisi kesiladi
  const lS = Ly('streets');
  const ps = doc.streets.map(s => ({ s, axis: s.axis.map(fr.toLocal), prof: profileById(s.profile) }));
  if (ps.length && K !== 'figura' && lS.on) {
    const osmR = (ctx?.roads ?? []).filter(r => !adopted.has(r.id)).map(r => ({ pts: r.pts, cls: r.cls, w: r.w }));
    const sg = projectStreetsGeo(ps.map(x => ({ id: x.s.id, axis: x.axis, parts: x.prof.parts })), () => 0, osmR, { curbR: doc.settings.recon ? CURB_R_RECON : CURB_R });
    const clip = site ? '<g clip-path="url(#ichki)">' : '', clipE = site ? '</g>' : '';
    /** uchburchaklar (Buf: x, h, −y) → bitta path; hammasi bir yoʻnalishda (nonzero — ustma-ust joyda teshik boʻlmaydi) */
    const triD = (arr: number[] | undefined) => {
      if (!arr?.length) return '';
      const out: string[] = [];
      for (let i = 0; i + 8 < arr.length; i += 9) {
        let a: XY = [arr[i], -arr[i + 2]], b: XY = [arr[i + 3], -arr[i + 5]]; const c: XY = [arr[i + 6], -arr[i + 8]];
        const cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); if (Math.abs(cr) < 1e-6) continue;
        if (cr < 0) [a, b] = [b, a];
        if (!vis([a, b, c])) continue;
        out.push(`M${P(a)}L${P(b)}L${P(c)}Z`);
      }
      return out.join('');
    };
    const out: string[] = [];
    if (PR) {
      // parsellar rejasi: qizil chiziqlar oraligʻi (koʻcha hududi) — och pushti, qatnov qismi — och kulrang
      const all = Object.entries(sg.layers).filter(([k2]) => k2 !== 'chiziq').map(([, a]) => triD(a)).join('');
      if (all) out.push(`<path d="${all}" fill="#f6dcd8"/>`);
      const q = triD(sg.layers.qatnov); if (q) out.push(`<path d="${q}" fill="#e7e4df"/>`);
      if (all) legend.push({ type: 'fill', fill: '#f6dcd8', label: tr('Koʻcha hududi (qizil chiziqlar oraligʻi)') });
      if (q) legend.push({ type: 'fill', fill: '#e7e4df', label: tr('Qatnov qismi') });
    } else if (!VZ) {
      const base = triD(sg.layers.trotuar); if (base) out.push(`<path d="${base}" fill="${PART_COL.trotuar}"/>`);
      if (lS.fill !== 'none') for (const k of ['yashil', 'velo', 'parkovka', 'avtobus', 'tramvay', 'qatnov'] as const) {
        const d = triD(sg.layers[k]); if (!d) continue;
        const col2 = LS && k === 'yashil' ? '#bcd9a3' : lS.fill === 'one' ? '#ecebe7' : PART_COL[k];
        out.push(`<path d="${d}" fill="${lite(col2, lS.light)}"/>`);
      }
    } else {
      const d = Object.entries(sg.layers).filter(([k]) => k !== 'chiziq').map(([, a]) => triD(a)).join('');
      if (d) out.push(`<path d="${d}" fill="#f6f5f2"/>`);
    }
    if (out.length) g('Loyiha_kochalari', clip + out.join('') + clipE);
    if (lS.outline && !VZ && sg.red.length) {
      g('Qizil_chiziqlar', clip + sg.red.map(r => `<path d="${lineD(r)}" fill="none" stroke="#d0342c" stroke-width="${lw(lS.mm)}" stroke-linejoin="round"/>`).join('') + clipE);
      legend.push({ type: 'line', stroke: '#d0342c', label: tr('Qizil chiziqlar') });
    }
    if (K === 'daraxt') NEWT.push(...sg.trees.filter(t => !site0 || inSite(t)));
    if (S.trees && lG.on && !VZ && !PR && K !== 'daraxt') {
      const tr2 = sg.trees.filter(t => !site0 || inSite(t));
      g('Kocha_daraxtlari', tr2.map(t => treeSvg(t, Math.max(0.6, 3 * k), LS ? '#9cc27f' : '#ffffff', LS ? '#5f8f3e' : '#7d8a6a', 0.12)).join(''));
      if (tr2.length) legend.push(treeLeg());
    }
  }

  // 4. yangi binolar
  const lB = Ly('bld');
  if (nb.length && lB.on && !PR) {
    const order = [...nb].sort((a, b) => ((a.b.z0 ?? 0) + a.b.floors) - ((b.b.z0 ?? 0) + b.b.floors));
    const fill = (b: Project['buildings'][number]) => K === 'daraxt' ? '#ecebe7' : K === 'yongin' ? (FA?.bad.includes(b.id) ? '#f3c9c4' : FA?.side.has(b.id) ? '#dfe9d6' : bLevels(doc.settings, b).top >= 28 ? '#f1d9a8' : '#ecebe7') : K === 'parkstrat' ? (PS_D.has(b.id) ? mix(parseInt(PS_BAND(PS_D.get(b.id)!)[0].slice(1), 16), 0.55) : '#ecebe7') : K === 'parkovka' ? (PK_FAR.has(b.id) ? '#f6dcd5' : '#ecebe7') : K === 'ijtimoiy' ? (SOC.has(b.use) ? (GS ? hex(ucol(b.use)) : darker(ucol(b.use), 0.08)) : mix(ucol(b.use), 0.62)) : K === 'navbat' ? STAGE_COL[stageOf(b) - 1] : K === 'figura' || VZ ? '#1d1d1b' : K === 'zona' ? (GS ? hex(ucol(b.use)) : darker(ucol(b.use), 0.12)) : K === 'qavat' ? floorColor((b.z0 ?? 0) + b.floors) : lB.fill === 'none' ? 'none' : lB.fill === 'use' ? lite(mix(ucol(b.use), GS ? 0 : 0.1), lB.light) : '#ffffff';
    const stroke = K === 'figura' || VZ || !lB.outline ? 'none' : INK;
    const bw = (b: Project['buildings'][number]) => K === 'ijtimoiy' ? (SOC.has(b.use) ? 0.35 : 0.12) : K === 'bosh' ? lB.mm : Math.min(lB.mm, 0.3);
    g('Yangi_binolar', order.map(({ b, r }) => `<path d="${ringD(r)}" fill="${fill(b)}"${stroke !== 'none' ? ` stroke="${K === 'ijtimoiy' && !SOC.has(b.use) ? '#8e8a82' : stroke}" stroke-width="${lw(bw(b) * LW)}" stroke-linejoin="round"` : ''}/>`).join(''));
    if (K === 'bosh') legend.push({ type: 'fill', fill: '#ffffff', stroke: INK, label: tr('Loyihalanayotgan binolar') });
    if (K === 'figura') legend.push({ type: 'fill', fill: '#1d1d1b', label: tr('Binolar (mavjud va loyiha)') });
    if (S.labels && K !== 'figura' && !VZ) {
      const fs = 2.5;
      g('Qavatlar_soni', order.filter(x => area(x.r) * k * k > 30).map(({ b, r }) => { const c = centroid(r); return `<text x="${X(c)}" y="${n2(+Y(c) + fs * 0.35)}" font-size="${T(fs)}" text-anchor="middle" fill="#1d1d1b">${(b.z0 ?? 0) + b.floors}</text>`; }).join(''));
    }
  }
  if (K === 'qavat') for (const r of FLOOR_RAMP) legend.push({ type: 'fill', fill: r.color, label: tr(r.label) });
  let TREE: TreeSum | null = null;
  if (K === 'daraxt') {
    NEWT.push(...landscape(doc).flatMap(y => y.trees));
    TREE = treeSum(doc, ctx, nb.map(x => x.r), site0, NEWT);
    const r0 = Math.max(0.7, 2.6 * k), cr = (t: XY, f: string, st: string) => `<circle cx="${X(t)}" cy="${Y(t)}" r="${n2(r0)}" fill="${f}" stroke="${st}" stroke-width="${lw(0.15)}"/>`;
    g('Yangi_daraxtlar', NEWT.map(t => cr(t, '#b9dca0', '#4f8a3a')).join(''));
    g('Mavjud_saqlanadi', TREE.keep.map(t => cr(t, '#4f8a3a', '#1d1d1b')).join(''));
    g('Mavjud_yaqin', TREE.near.map(t => cr(t, '#e8a33d', '#1d1d1b')).join(''));
    const xx = (t: XY) => { const a = r0 * 0.7; return `<path d="M${n2(+X(t) - a)} ${n2(+Y(t) - a)}l${n2(2 * a)} ${n2(2 * a)}M${n2(+X(t) - a)} ${n2(+Y(t) + a)}l${n2(2 * a)} ${n2(-2 * a)}" stroke="#c0392b" stroke-width="${lw(0.3)}"/>`; };
    g('Mavjud_kesiladi', TREE.cut.map(t => cr(t, '#ffffff', '#c0392b') + xx(t)).join(''));
    legend.push({ type: 'tree', fill: '#4f8a3a', stroke: '#1d1d1b', label: `${tr('Mavjud — saqlanadi')} (${TREE.keep.length})` },
      { type: 'tree', fill: '#e8a33d', stroke: '#1d1d1b', label: `${tr('Mavjud — binoga 5 m dan yaqin (35-jadval)')} (${TREE.near.length})` },
      { type: 'tree', fill: '#ffffff', stroke: '#c0392b', label: `${tr('Mavjud — bino yoki qatnov qismi ostida')} (${TREE.cut.length})` },
      { type: 'tree', fill: '#b9dca0', stroke: '#4f8a3a', label: `${tr('Yangi ekiladi')} (${NEWT.length})` });
  }
  if (K === 'navbat') { const used = [...new Set(doc.buildings.map(stageOf))].sort(); for (const st of used) legend.push({ type: 'fill', fill: STAGE_COL[st - 1], stroke: '#1d1d1b', label: tf2(tr('${n}-navbat'), { n: st }) }); }
  if (ctx && S.context && K !== 'figura') {
    if (K === 'bosh' || LS || VZ) legend.push({ type: 'fill', fill: C.ctxB, stroke: C.ctxStroke === 'none' ? undefined : C.ctxStroke, label: tr('Mavjud binolar') });
    if (ctx.green.length && lG.on && !VZ) legend.push({ type: 'fill', fill: C.green, label: tr('Yashil hududlar') });
    if ((ctx.water.length || ctx.waterways.length) && lW.on) legend.push({ type: 'fill', fill: C.water, label: tr('Suv') });
  }

  // 4a. xizmat radiusi (02.11): piyoda tarmogʻi boʻylab eng yaqin obyektgacha masofa — 4 oraliq, obyektlar, turar joy binolari
  const SV = K === 'xizmat' ? (ctx?.svc?.find(x => x.id === (o.svc ?? 'mtm')) ?? ctx?.svc?.[0]) : undefined;
  if (K === 'xizmat' && SV) {
    const Rr = SV.r, bands: [number, string, string][] = [[Rr * 0.5, '#1a9850', `≤ ${Math.round(Rr * 0.5)} m`], [Rr, '#91cf60', `${Math.round(Rr * 0.5)}–${Rr} m`], [Rr * 1.5, '#fdae61', `${Rr}–${Math.round(Rr * 1.5)} m`], [Infinity, '#d73027', `> ${Math.round(Rr * 1.5)} m`]];
    const inV = (p: XY) => Math.abs(p[0] - cx) < R && Math.abs(p[1] - cy) < R;
    const okB = new Map(SV.dem.map(d => [d.bid, d.ok]));
    g('Turar_joy_radiusda', nb.filter(x => okB.has(x.b.id)).map(({ b, r }) => `<path d="${ringD(r)}" fill="${okB.get(b.id) ? '#cfe8c4' : '#f3c9c4'}" stroke="#1d1d1b" stroke-width="${lw(0.2)}"/>`).join(''));
    bands.forEach(([max, c], i) => { const lo = i ? bands[i - 1][0] : -1, d = SV.segs.filter(q => q.d > lo && q.d <= max && (inV(q.a) || inV(q.b))).map(q => `M${P(q.a)}L${P(q.b)}`).join('');
      if (d) g(`Piyoda_${i + 1}`, `<path d="${d}" fill="none" stroke="${c}" stroke-width="${lw(0.8)}" stroke-linecap="round"/>`); });
    const src = SV.src.filter(inV);
    g('Xizmat_obyektlari', src.map(p => `<circle cx="${X(p)}" cy="${Y(p)}" r="${n2(Rr * k)}" fill="none" stroke="#2a6fb0" stroke-width="${lw(0.18)}" stroke-dasharray="1.2 0.8" opacity="0.6"/><circle cx="${X(p)}" cy="${Y(p)}" r="1.4" fill="#2a6fb0" stroke="#ffffff" stroke-width="${lw(0.3)}"/>`).join(''));
    for (const [, c, l] of bands) legend.push({ type: 'line', stroke: c, label: `${tr('Piyoda masofasi')} ${l}` });
    legend.push({ type: 'stop', fill: '#2a6fb0', label: SV.src.length ? `${tr(SV.name)} (${tr('radius')} ${SV.rTxt})` : `${tr(SV.name)} — ${tr('obyekt topilmadi: atrofni yuklang yoki qoʻlda belgilang')}` });
    legend.push({ type: 'fill', fill: '#cfe8c4', stroke: '#1d1d1b', label: `${tr('Turar joy — radius ichida')} (${Math.round(SV.share * 100)} %)` });
    legend.push({ type: 'fill', fill: '#f3c9c4', stroke: '#1d1d1b', label: tr('Turar joy — radiusdan tashqarida') });
  }

  // 4b'. ijtimoiy infratuzilma (12.11; egasi 06.11: «yengil footprint, land-use rang, akso doira-namunalar»): ijtimoiy binolar toʻliq
  // rangda va raqamli, boshqalari och; maktab / MTM / poliklinika atrofida meʼyoriy xizmat radiusi (ShNQ 2.07.01-23 — 9-qadamdagi bilan bir xil),
  // atrofdagi mavjud obyektlar (OSM / qoʻlda) — kichik belgi; pastda har ijtimoiy bino aksonometrik doira-namunada (loyiha geometriyasidan)
  if (K === 'ijtimoiy') {
    const SVC_OF: Record<string, string> = { maktab: 'maktab', mtm: 'mtm', poliklinika: 'poliklinika' };
    const soc = nb.filter(x => SOC.has(x.b.use) && x.r.length >= 3);
    const used = USES.filter(u => SOC.has(u.id) && soc.some(x => x.b.use === u.id));
    const fullC = (u: string) => GS ? hex(ucol(u)) : darker(ucol(u), 0.08), edgeC = (u: string) => darker(ucol(u), 0.45);
    // meʼyoriy radius (har ijtimoiy bino atrofida; bir xil turdagi radiuslar bitta qatlamda)
    const rad: string[] = [];
    for (const x of soc) { const sv = ctx?.svc?.find(q => q.id === SVC_OF[x.b.use]); if (!sv) continue; const c = centroid(x.r); rad.push(`<circle cx="${X(c)}" cy="${Y(c)}" r="${n2(sv.r * k)}" fill="none" stroke="${edgeC(x.b.use)}" stroke-width="${lw(0.3)}" stroke-dasharray="2 1"/>`); }
    g('Xizmat_radiuslari', rad.join(''));
    // atrofdagi mavjud obyektlar (loyihadagi binoga 25 m dan yaqin boʻlmaganlari)
    const ext: string[] = []; const extUsed = new Set<string>();
    for (const [u, sid] of Object.entries(SVC_OF)) { const sv = ctx?.svc?.find(q => q.id === sid); if (!sv) continue;
      for (const p of sv.src) { if (Math.abs(p[0] - cx) > R || Math.abs(p[1] - cy) > R) continue; if (soc.some(x => x.b.use === u && Math.hypot(centroid(x.r)[0] - p[0], centroid(x.r)[1] - p[1]) < 25)) continue;
        extUsed.add(u); ext.push(`<circle cx="${X(p)}" cy="${Y(p)}" r="1.3" fill="#ffffff" stroke="${edgeC(u)}" stroke-width="${lw(0.4)}"/><circle cx="${X(p)}" cy="${Y(p)}" r="0.55" fill="${edgeC(u)}"/>`); } }
    g('Mavjud_ijtimoiy_obyektlar', ext.join(''));
    // raqamlar
    const num = soc.map((x, i) => { const c = centroid(x.r); return `<circle cx="${X(c)}" cy="${Y(c)}" r="2.1" fill="#1d1d1b"/><text x="${X(c)}" y="${n2(+Y(c) + 0.9)}" font-size="${T(2.5)}" font-weight="700" text-anchor="middle" fill="#ffffff">${i + 1}</text>`; });
    // aksonometrik doira-namunalar: pastki chetda, har biri — bino (asl reja yoʻnalishida, izometriya), raqam, nom, qavat va maydon
    const nS = Math.min(soc.length, Math.max(1, Math.floor((vw - 130) / 34)), 6);
    if (nS > 0) {
      const Rc = Math.min(15, (vw - 130) / nS / 2 - 3), cyC = vy + vh - 16 - Rc, out: string[] = [];   // oʻng pastda (chapda — masshtab chizgʻichi)
      soc.slice(0, nS).forEach((x, i) => {
        const cxC = vx + vw - 8 - Rc - (nS - 1 - i) * (2 * Rc + 6), b = x.b, H = ((b.z0 ?? 0) + b.floors) * fh, H0 = (b.z0 ?? 0) * fh, c0 = centroid(x.r);
        const loc = x.r.map(p => { const v = toV(p), o = toV(c0); return [(v[0] - o[0]) / k, -(v[1] - o[1]) / k] as XY; });   // varaqdagi yoʻnalishda, metr
        const iso = (p: XY, z: number): XY => [(p[0] - p[1]) * 0.866, -((p[0] + p[1]) * 0.5 + z)];
        const all = [...loc.map(p => iso(p, H0)), ...loc.map(p => iso(p, H))], ix = all.map(q => q[0]), iy = all.map(q => q[1]);
        const sp = Math.max(Math.max(...ix) - Math.min(...ix), Math.max(...iy) - Math.min(...iy), 1), f = (Rc * 1.5) / sp, mx0 = (Math.max(...ix) + Math.min(...ix)) / 2, my0 = (Math.max(...iy) + Math.min(...iy)) / 2;
        const Q = (q: XY) => `${n2(cxC + (q[0] - mx0) * f)},${n2(cyC + (q[1] - my0) * f)}`;
        const ccw = loc.reduce((t, p, j) => t + p[0] * loc[(j + 1) % loc.length][1] - loc[(j + 1) % loc.length][0] * p[1], 0) > 0;
        // devorlar: kuzatuvchiga qaragan (pastki-old) qirralar, orqadan oldinga
        const walls = loc.map((p, j) => { const q = loc[(j + 1) % loc.length], nx = ccw ? q[1] - p[1] : p[1] - q[1], ny = ccw ? p[0] - q[0] : q[0] - p[0]; return { p, q, d: p[0] + p[1] + q[0] + q[1], vis: nx + ny < 0, lt: nx < ny }; })
          .filter(w => w.vis).sort((a2, b2) => b2.d - a2.d);
        out.push(`<circle cx="${n2(cxC)}" cy="${n2(cyC)}" r="${n2(Rc)}" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.3"/>`);
        out.push(`<path d="M${loc.map(p => Q(iso(p, H0))).join('L')}Z" fill="#e7e5e0" stroke="none"/>`);
        for (const w of walls) out.push(`<path d="M${Q(iso(w.p, H0))}L${Q(iso(w.q, H0))}L${Q(iso(w.q, H))}L${Q(iso(w.p, H))}Z" fill="${darker(ucol(b.use), w.lt ? 0.22 : 0.36)}" stroke="#1d1d1b" stroke-width="0.15" stroke-linejoin="round"/>`);
        out.push(`<path d="M${loc.map(p => Q(iso(p, H))).join('L')}Z" fill="${mix(ucol(b.use), 0.25)}" stroke="#1d1d1b" stroke-width="0.2" stroke-linejoin="round"/>`);
        out.push(`<circle cx="${n2(cxC - Rc * 0.72)}" cy="${n2(cyC - Rc * 0.72)}" r="2.3" fill="#1d1d1b"/><text x="${n2(cxC - Rc * 0.72)}" y="${n2(cyC - Rc * 0.72 + 0.9)}" font-size="${T(2.5)}" font-weight="700" text-anchor="middle" fill="#ffffff">${i + 1}</text>`);
        const gfa = Math.round(Math.abs(area(x.r)) * b.floors / 10) * 10;
        out.push(`<text x="${n2(cxC)}" y="${n2(cyC + Rc + 3.6)}" font-size="${T(2.5)}" font-weight="700" text-anchor="middle" fill="#1d1d1b">${esc(tr(useDef(b.use).name))}</text>`);
        out.push(`<text x="${n2(cxC)}" y="${n2(cyC + Rc + 6.8)}" font-size="${T(2.5)}" text-anchor="middle" fill="#55524b">${esc(`${b.floors} ${tr('qavat')} · ${gfa.toLocaleString('ru-RU')} m²`)}</text>`);
      });
      if (soc.length > nS) out.push(`<text x="${n2(vx + vw - 8 - nS * (2 * Rc + 6) - 2)}" y="${n2(cyC)}" text-anchor="end" font-size="${T(2.5)}" fill="#55524b">${esc(`+${soc.length - nS}`)}</text>`);
      g('Ijtimoiy_raqamlar', num.join(''));
      L.push(`<g id="Aksonometrik_namunalar" inkscape:groupmode="layer" inkscape:label="Aksonometrik namunalar">${out.join('')}</g>`);
    }
    for (const u of used) legend.push({ type: 'fill', fill: fullC(u.id), stroke: INK, label: tr(u.name) });
    if (!soc.length) legend.push({ type: 'text', label: tr('Loyihada ijtimoiy bino yoʻq — «Hajmlar» qadamida funksiyani belgilang') });
    legend.push({ type: 'fill', fill: mix(0xd9d6cf, 0.3), stroke: '#8e8a82', label: tr('Boshqa loyiha binolari') });
    for (const [u, sid] of Object.entries(SVC_OF)) { const sv = ctx?.svc?.find(q => q.id === sid); if (sv && soc.some(x => x.b.use === u)) legend.push({ type: 'dash', stroke: edgeC(u), label: `${tr(useDef(u).name)} — ${tr('xizmat radiusi')} ${sv.rTxt}` }); }
    for (const u of extUsed) legend.push({ type: 'stop', fill: edgeC(u), label: `${tr(useDef(u).name)} — ${tr('mavjud (atrof)')}` });
    if (!ctx?.svc?.length && soc.some(x => SVC_OF[x.b.use])) legend.push({ type: 'text', label: tr('Xizmat radiuslari — 9-qadamni oching (piyoda tarmogʻi hisobi)') });
  }

  // 4c. cheklovlar rejasi (02.11): qurib boʻlmaydigan joy (shtrix), cheklov obyektlari SMZ (SanQvaN 0103-25; qabriston — VM 101, 50-band), ishlab chiqarish SMZ (ShNQ 2.07.01-23, 146), ELU oʻqi
  const bal = K === 'cheklov' ? landBalance(doc) : null;
  if (K === 'cheklov') {
    const z = limitZones(doc), SZ = '#d9822b', PZ = '#8e6bb5', cl = (r: XY[]) => [...r, r[0]].map(p => [p[0], p[1]] as [number, number]);
    const siteP: Polygon | null = site ? site.map(cl) : null;
    if (z.soft.length) {
      g('SMZ_cheklovlar', z.soft.map(sz => `<path d="${polyD(sz.rings)}" fill="${SZ}" fill-opacity="0.18" stroke="${SZ}" stroke-width="${lw(0.35)}" stroke-dasharray="2 1" fill-rule="evenodd"/>`).join(''));
      const seen = new Set<string>();
      for (const sz of z.soft) { const lab = `${tr(sz.nosmz ? 'Masofa' : 'SMZ')} — ${tr(sz.name ?? LIMIT_NAMES[sz.kind])}, ${sz.m} m${sz.cls ? ` (${sz.cls} ${tr('sinf')})` : ''}`; if (seen.has(lab)) continue; seen.add(lab); legend.push({ type: 'fill', fill: '#f6dcc0', stroke: SZ, label: lab }); }
    }
    const pz = prodChecks(doc).zones.map(q => { let mp: MultiPolygon = []; try { mp = polygonClipping.difference(bufferLocal(q.rings[0], q.szz, true), q.rings.map(cl) as Polygon); if (siteP) mp = polygonClipping.intersection(mp, siteP); } catch { mp = []; } return { q, mp }; }).filter(x => x.mp.length);
    if (pz.length) {
      g('SMZ_ishlab_chiqarish', pz.map(({ mp }) => `<path d="${polyD(mp.flatMap(pp => pp.map(r => r.slice(0, -1) as XY[])))}" fill="${PZ}" fill-opacity="0.14" stroke="${PZ}" stroke-width="${lw(0.35)}" stroke-dasharray="2 1" fill-rule="evenodd"/>`).join(''));
      const seen = new Set<string>();
      for (const { q } of pz) { const lab = `${tr('SMZ')} — ${tr(useDef(q.use).name)}, ${q.szz} m`; if (seen.has(lab)) continue; seen.add(lab); legend.push({ type: 'fill', fill: '#e6dcef', stroke: PZ, label: lab }); }
    }
    // 04.11: suvni muhofaza qilish zonasi (981-son nizom) — koʻk uzuq kontur; qirgʻoq boʻyi mintaqasi — shtrix (qurib boʻlmaydi)
    if (z.water.length) {
      const WZ = '#2f7fb5';
      g('Suv_muhofaza_zonasi', z.water.map(w => `<path d="${polyD(w.rings)}" fill="${WZ}" fill-opacity="0.12" stroke="${WZ}" stroke-width="${lw(0.35)}" stroke-dasharray="2 1" fill-rule="evenodd"/>`).join(''));
      const seen = new Set<string>();
      for (const w of z.water) { const lab = `${tr('Suvni muhofaza qilish zonasi')}, ${w.m} m`; if (seen.has(lab)) continue; seen.add(lab); legend.push({ type: 'fill', fill: '#d6e7f2', stroke: WZ, label: lab }); }
    }
    // 06.11 (c65): qabristondan 100 m — turar joy, jamoat binolari, dam olish zonalari (VM 101, 50-band); SMZ ≥ 100 m boʻlsa ustma-ust — chizilmaydi
    const qz = z.qab.filter(q => q.smz < q.m);
    if (qz.length) {
      const QZ = '#5b4a6e';
      g('Qabriston_100m', qz.map(q => `<path d="${polyD(q.rings)}" fill="none" stroke="${QZ}" stroke-width="${lw(0.35)}" stroke-dasharray="3 1.5" fill-rule="evenodd"/>`).join(''));
      legend.push({ type: 'dash', stroke: QZ, label: tr('Qabristondan 100 m: turar joy, jamoat binolari, dam olish zonalari') });
    }
    const suvL = (doc.limits ?? []).filter(l => l.kind === 'suv' && isActive(l) && !l.rings?.length && l.axis && l.axis.length > 1);
    if (suvL.length) g('Suv_oqimi', suvL.map(l => `<path d="${lineD(l.axis!.map(fr.toLocal))}" fill="none" stroke="#2f7fb5" stroke-width="${lw(0.6)}"/>`).join(''));
    if (z.hard.length) {
      const step = 1.6 / k;
      g('Qurib_bolmaydigan', z.hard.map(pp => `<path d="${polyD(pp)}" fill="#ffffff" fill-opacity="0.55" stroke="#1d1d1b" stroke-width="${lw(0.35)}" fill-rule="evenodd"/>`).join('')
        + `<path d="${hatchSegs(z.hard, step).map(([a, b]) => `M${P(a)}L${P(b)}`).join('')}" fill="none" stroke="#1d1d1b" stroke-width="${lw(0.13)}"/>`);
      legend.push({ type: 'hatch', fill: '#ffffff', stroke: '#1d1d1b', label: tr((doc.limits ?? []).some(l => l.kind === 'suv' && isActive(l)) ? 'Qurib boʻlmaydigan joy (cheklov obyekti, ELU muhofaza zonasi, qirgʻoq boʻyi mintaqasi)' : 'Qurib boʻlmaydigan joy (cheklov obyekti, ELU muhofaza zonasi)') });
    }
    const elu = (doc.limits ?? []).filter(l => l.kind === 'elu' && isActive(l) && l.axis && l.axis.length > 1);
    if (elu.length) {
      g('ELU', elu.map(l => `<path d="${lineD(l.axis!.map(fr.toLocal))}" fill="none" stroke="#c0392b" stroke-width="${lw(0.4)}" stroke-dasharray="5 1 1 1"/>`).join(''));
      legend.push({ type: 'dash', stroke: '#c0392b', label: tr('ELU oʻqi') });
    }
    if (!z.soft.length && !z.hard.length && !z.water.length && !z.qab.length && !pz.length && !elu.length) legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: tr('Cheklov belgilanmagan (1-qadam «Mavjud holat va cheklovlar»)') });
  }

  // 4e. avtoturargohlar sxemasi (12.11, eski navbat 3-band): turlar rangida, joylar soni va sathlari, ochiq avtoturargoh joylari va
  // yoʻlaklari, koʻp qavatlida pandus va zina-lift tugunlari, kirish-chiqishlar (414, 415-bandlar), koʻcha boʻyidagi parkovka tasmalari,
  // 300 m radius (417-band) va undan tashqaridagi turar joy binolari
  if (K === 'parkovka') {
    const GK: Record<string, [string, string]> = { yer_osti: ['#cdd6e0', 'Yer osti avtoturargohi'], stilobat: ['#b8bfc6', 'Stilobatdagi avtoturargoh'], yer_usti: ['#e3e6ea', 'Ochiq avtoturargoh'], kop_qavatli: ['#aeb4bb', 'Koʻp qavatli avtoturargoh'] };
    const gs = doc.garages.filter(q => !q.truck);
    // koʻcha boʻyidagi parkovka (profil qismi «parkovka») — oʻq boʻylab tasma
    const strip: string[] = [];
    for (const { axis, prof } of ps) { const W = profileWidth(prof); let off = -W / 2; for (const pt of prof.parts) { const mid = off + pt.w / 2; off += pt.w; if (pt.k === 'parkovka') strip.push(`<path d="${lineD(offsetLine(axis, mid))}" fill="none" stroke="#8fa3b8" stroke-width="${lw(Math.max(0.4, pt.w * k))}" stroke-opacity="0.8"/>`); } }
    if (strip.length) { g('Koʻcha_parkovka', strip.join('')); legend.push({ type: 'line', stroke: '#8fa3b8', label: tr('Koʻcha boʻyidagi parkovka (profil)') }); }
    if (gs.length) {
      g('Radius_300m', PK_G.map(r => { const c = centroid(r), rr = Math.max(...r.map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))); return `<circle cx="${X(c)}" cy="${Y(c)}" r="${n2((PK_R + rr) * k)}" fill="none" stroke="#5f7488" stroke-width="${lw(0.25)}" stroke-dasharray="2 1"/>`; }).join(''));
      g('Avtoturargohlar', gs.map(q => { const r = q.ring.map(fr.toLocal); return `<path d="${ringD(r)}" fill="${GK[q.kind][0]}" fill-opacity="${q.kind === 'yer_osti' ? 0.55 : 0.9}" stroke="#4b5563" stroke-width="${lw(0.3)}"${q.kind === 'yer_osti' ? ' stroke-dasharray="1.5 0.8"' : ''}/>`; }).join('')
        + gs.flatMap(q => (q.aisles ?? []).map(a => `<path d="${ringD(a.map(fr.toLocal))}" fill="#f6f5f2" stroke="none"/>`)).join('')
        + gs.flatMap(q => (q.stalls ?? []).map(a => `<path d="${ringD(a.map(fr.toLocal))}" fill="none" stroke="#6b7280" stroke-width="${lw(0.1)}"/>`)).join('')
        + gs.flatMap(q => [...(q.ramps ?? []).map(a => `<path d="${ringD(a.map(fr.toLocal))}" fill="#d9a441" fill-opacity="0.55" stroke="#1d1d1b" stroke-width="${lw(0.12)}"/>`), ...(q.cores ?? []).map(a => `<path d="${ringD(a.map(fr.toLocal))}" fill="#4b5563" stroke="none"/>`)]).join(''));
      // yer osti avtoturargohi ustidagi binolar — qayta (yer usti yuqorida)
      if (gs.some(q => q.kind === 'yer_osti' || q.kind === 'stilobat')) g('Binolar_yer_ustida', nb.map(({ b, r }) => `<path d="${ringD(r)}" fill="${PK_FAR.has(b.id) ? '#f6dcd5' : '#ecebe7'}" stroke="${INK}" stroke-width="${lw(0.18)}" stroke-linejoin="round"/>`).join(''));
      // yozuv: joylar soni va sathlar — garajning pastki chetida (markazda daha yozuvi turadi)
      g('Avtoturargoh_yozuvlari', gs.filter(q => area(q.ring.map(fr.toLocal)) * k * k > 40).map(q => { const rl = q.ring.map(fr.toLocal), c0 = centroid(rl), c: XY = [c0[0], Math.min(...rl.map(p => p[1])) + 7 / k], t1 = `${q.spaces} ${tr('joy')}`, t2 = q.levels > 1 ? tf2(tr('${n} sath'), { n: q.levels }) : '';
        return `<rect x="${n2(+X(c) - 9)}" y="${n2(+Y(c) - 3.4)}" width="18" height="${t2 ? 7.4 : 4.4}" rx="0.8" fill="#ffffff" fill-opacity="0.9"/><text x="${X(c)}" y="${n2(+Y(c) - 0.3)}" font-size="${T(2.8)}" font-weight="700" text-anchor="middle" fill="#1d1d1b">${esc(t1)}</text>${t2 ? `<text x="${X(c)}" y="${n2(+Y(c) + 2.8)}" font-size="${T(2.5)}" text-anchor="middle" fill="#55524b">${esc(t2)}</text>` : ''}`; }).join(''));
      for (const kk of ['yer_osti', 'stilobat', 'yer_usti', 'kop_qavatli']) if (gs.some(q => q.kind === kk)) legend.push({ type: 'fill', fill: GK[kk][0], stroke: '#4b5563', label: tr(GK[kk][1]) });
      if (gs.some(q => q.ramps?.length)) legend.push({ type: 'fill', fill: '#e9c98a', stroke: '#1d1d1b', label: tr('Pandus (koʻp qavatli)') });
      const ents = gs.flatMap(q => (q.entries ?? []).map(e => ({ at: fr.toLocal(e.at), kind: e.kind, ...(e.dir != null ? { dir: e.dir } : {}) })));
      if (ents.length) {
        g('Avtoturargoh_kirishlari', ents.map(e => `<path d="${ringD(entryRing(e))}" fill="${e.kind === 'rampa' ? '#d9a441' : '#5f6369'}" stroke="#1d1d1b" stroke-width="${lw(0.25)}"/>`).join(''));
        if (ents.some(e => e.kind === 'rampa')) legend.push({ type: 'fill', fill: '#d9a441', stroke: '#1d1d1b', label: tr('Avtoturargoh kirish-chiqishi (pandus)') });
        if (ents.some(e => e.kind === 'shaxta')) legend.push({ type: 'fill', fill: '#5f6369', stroke: '#1d1d1b', label: tr('Shamollatish shaxtasi') });
      }
      legend.push({ type: 'dash', stroke: '#5f7488', label: tr('Avtoturargohdan 300 m (417-band; TALQIN — barcha avtoturargohlarga)') });
      legend.push(PK_FAR.size ? { type: 'fill', fill: '#f6dcd5', stroke: INK, label: `${tr('Turar joy — 300 m dan uzoq')} (${PK_FAR.size})` } : { type: 'text', label: tr('Turar joy — hammasi 300 m ichida') });
    } else legend.push({ type: 'text', label: tr('Avtoturargoh yoʻq — 5-qadamda «Avtoturargoh» (yer osti / ochiq / koʻp qavatli) tanlang') });
    legend.push({ type: 'fill', fill: '#ecebe7', stroke: INK, label: tr('Loyiha binolari') });
  }

  let psBub = '';
  // 4f. parkovka strategiyasi (12.11, eski navbat 3-band davomi): piyoda koʻchalar (avtomobilsiz) yashil, avtomobil koʻchalari kulrang;
  // avtoturargohlar — sigʻimiga mos doira (√joy), har turar joy binosidan eng yaqin avtoturargohgacha chiziq oraliq rangida (417-band: ≤ 300 m)
  if (K === 'parkstrat') {
    const GK: Record<string, [string, string]> = { yer_osti: ['#7f93a8', 'Yer osti avtoturargohi'], stilobat: ['#6b7280', 'Stilobatdagi avtoturargoh'], yer_usti: ['#a8b3bf', 'Ochiq avtoturargoh'], kop_qavatli: ['#4b5563', 'Koʻp qavatli avtoturargoh'] };
    const car = ps.filter(x => x.prof.cat !== 'piyoda'), ped = ps.filter(x => x.prof.cat === 'piyoda');
    if (car.length) { g('Avtomobil_kochalari', car.map(x => `<path d="${lineD(x.axis)}" fill="none" stroke="#9aa3ad" stroke-width="${lw(1.2)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')); legend.push({ type: 'line', stroke: '#9aa3ad', label: tr('Avtomobil harakati koʻchalari') }); }
    if (ped.length) { g('Piyoda_kochalari', ped.map(x => `<path d="${lineD(x.axis)}" fill="none" stroke="#27ae60" stroke-width="${lw(1.2)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')); legend.push({ type: 'line', stroke: '#27ae60', label: tr('Piyoda koʻchalari (avtomobilsiz)') }); }
    if (PS_G.length) {
      g('Masofa_chiziqlari', [...PS_L].map(([id, [a, b]]) => `<path d="M${P(a)}L${P(b)}" stroke="${PS_BAND(PS_D.get(id)!)[0]}" stroke-width="${lw(0.35)}" stroke-dasharray="1 0.6"/><circle cx="${X(a)}" cy="${Y(a)}" r="0.7" fill="${PS_BAND(PS_D.get(id)!)[0]}"/>`).join(''));
      g('Avtoturargoh_izlari', PS_G.map(({ q, r }) => `<path d="${ringD(r)}" fill="${GK[q.kind][0]}" fill-opacity="0.12" stroke="${GK[q.kind][0]}" stroke-width="${lw(0.2)}"${q.kind === 'yer_osti' ? ' stroke-dasharray="1.5 0.8"' : ''}/>`).join(''));
      const mxS = Math.max(...PS_G.map(x => x.q.spaces), 1);
      psBub = (PS_G.map(({ q, r }) => { const c = centroid(r), rr = Math.max(3, 12 * Math.sqrt(q.spaces / mxS)); return `<circle cx="${X(c)}" cy="${Y(c)}" r="${n2(rr)}" fill="${GK[q.kind][0]}" fill-opacity="0.85" stroke="#ffffff" stroke-width="0.4"/><text x="${X(c)}" y="${n2(+Y(c) + 1)}" font-size="${T(rr >= 5 ? 2.8 : 2.5)}" font-weight="700" text-anchor="middle" fill="#ffffff">${q.spaces}</text>`; }).join(''));
      for (const kk of ['yer_osti', 'stilobat', 'yer_usti', 'kop_qavatli']) if (PS_G.some(x => x.q.kind === kk)) legend.push({ type: 'stop', fill: GK[kk][0], label: `${tr(GK[kk][1])} — ${tr('doira — joylar soni')}` });
      const used = new Set([...PS_D.values()].map(d => PS_BAND(d)[1]));
      for (const d of [50, 150, 250, 400]) { const [c2, l] = PS_BAND(d); if (used.has(l)) legend.push({ type: 'line', stroke: c2, label: `${tr('Turar joydan avtoturargohgacha')} ${l}` }); }
    } else legend.push({ type: 'text', label: tr('Avtoturargoh yoʻq — 5-qadamda «Avtoturargoh» (yer osti / ochiq / koʻp qavatli) tanlang') });
  }

  // 4g. yongʻin marshrutlari (12.11, eski navbat 5-band; L5): yetib keladigan sirt — loyiha koʻchalari qatnov qismi va trotuari (669-band, TALQIN),
  // hovlidagi yongʻin yoʻlagi (667-band); H < 28 m binoda yetib keladigan uzun tomon va undan 5–8 m zona (666, 675-bandlar)
  if (K === 'yongin' && FA) {
    if (FA.drive.length) { g('Kochalar_qatnov_qismi', FA.drive.map(mp => `<path d="${polyD(mp)}" fill="#d9d4cb" fill-rule="evenodd"/>`).join('')); legend.push({ type: 'fill', fill: '#d9d4cb', label: tr('Koʻcha qatnov qismi va trotuar (666, 669-bandlar)') }); }
    if (FA.lanes.length) { g('Hovli_yongin_yolaklari', FA.lanes.map(mp => `<path d="${polyD(mp)}" fill="#f0b7ab" stroke="#c0392b" stroke-width="${lw(0.25)}" fill-rule="evenodd"/>`).join('')); legend.push({ type: 'fill', fill: '#f0b7ab', stroke: '#c0392b', label: tr('Hovlidagi yongʻin yoʻlagi (667-band)') }); }
    const zone: string[] = [], line: string[] = [];
    for (const { b, r } of nb) { const sd = FA.side.get(b.id); if (!sd) continue;
      const [a, c] = sd, dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1, ccw = r.reduce((t, p, i) => t + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0) > 0;
      const nx = (ccw ? dy : -dy) / L, ny = (ccw ? -dx : dx) / L, off = (p: XY, d: number): XY => [p[0] + nx * d, p[1] + ny * d];   // tashqariga normal
      zone.push(`<path d="M${P(off(a, 5))}L${P(off(c, 5))}L${P(off(c, 8))}L${P(off(a, 8))}Z" fill="#c0392b" fill-opacity="0.22" stroke="none"/>`);
      line.push(`<path d="M${P(a)}L${P(c)}" stroke="#c0392b" stroke-width="${lw(0.7)}" stroke-linecap="round"/>`); }
    if (zone.length) { g('Kelish_zonasi', zone.join('')); legend.push({ type: 'fill', fill: '#efc3bd', label: tr('Kelish joyi: devordan 5–8 m (675-band)') }); }
    if (line.length) { L.push(`<g id="Kelish_tomoni" inkscape:groupmode="layer" inkscape:label="Kelish tomoni"><g clip-path="url(#vp)">${line.join('')}</g></g>`); legend.push({ type: 'line', stroke: '#c0392b', label: tr('Yetib kelish tomoni (666-band)') }); }
    if (FA.side.size) legend.push({ type: 'fill', fill: '#dfe9d6', stroke: INK, label: `${tr('H < 28 m — bitta uzun tomondan yetib keladi')} (${FA.side.size})` });
    if (FA.bad.length) legend.push({ type: 'fill', fill: '#f3c9c4', stroke: INK, label: `${tr('H < 28 m — uzun tomon 8 m ichida yetmaydi')} (${FA.bad.length})` });
    const hi = nb.filter(x => useDef(x.b.use).res > 0 && bLevels(doc.settings, x.b).top >= 28).length;
    if (hi) legend.push({ type: 'fill', fill: '#f1d9a8', stroke: INK, label: `${tr('H ≥ 28 m — ikkala uzun tomondan (666-band; hovli yoʻlagi)')} (${hi})` });
    if (!FA.ids.length && !hi) legend.push({ type: 'text', label: tr('Balandligi 28 m dan past koʻp kvartirali turar joy binolari yoʻq.') });
    if (FA.bad.length) legend.push({ type: 'text', label: tr('Uchastka chegarasidagi mavjud koʻchalar hisobga olinmagan.') });
  }

  // 4d. transport sxemasi (02.11): koʻcha oʻqlari toifa rangida, velo yoʻlaklar, avtoturargohlar; bekatlar 400 m radiusi (382-band)
  if (K === 'transport') {
    const cats = new Set<Cat>();
    g('Kocha_toifalari', ps.map(({ axis, prof }) => { cats.add(prof.cat); return `<path d="${lineD(axis)}" fill="none" stroke="${CAT_COL[prof.cat]}" stroke-width="${lw(prof.cat === 'otish' || prof.cat === 'piyoda' ? 0.7 : prof.cat === 'mahalliy' ? 1 : 1.4)}" stroke-linecap="round" stroke-linejoin="round"${prof.cat === 'piyoda' ? ' stroke-dasharray="2 1"' : ''}/>`; }).join(''));
    for (const c of CAT_ORDER) if (cats.has(c)) legend.push({ type: c === 'piyoda' ? 'dash' : 'line', stroke: CAT_COL[c], label: tr(CAT_NAME[c]) });
    const velo: string[] = [];
    for (const { axis, prof } of ps) { const W = profileWidth(prof); let off = -W / 2; for (const pt of prof.parts) { const mid = off + pt.w / 2; off += pt.w; if (pt.k === 'velo') velo.push(`<path d="${lineD(offsetLine(axis, mid))}" fill="none" stroke="#1f8fd6" stroke-width="${lw(0.45)}" stroke-dasharray="1.2 0.6"/>`); } }
    if (velo.length) { g('Velo_yolaklar', velo.join('')); legend.push({ type: 'dash', stroke: '#1f8fd6', label: tr('Velo yoʻlak') }); }
    const GK: Record<string, [string, string]> = { yer_osti: ['#cdd6e0', 'Yer osti avtoturargohi'], stilobat: ['#b8bfc6', 'Stilobatdagi avtoturargoh'], yer_usti: ['#e3e6ea', 'Ochiq avtoturargoh'], kop_qavatli: ['#aeb4bb', 'Koʻp qavatli avtoturargoh'] };
    const gs = doc.garages.filter(q => !q.truck);
    if (gs.length) {
      g('Avtoturargohlar', gs.map(q => { const r = q.ring.map(fr.toLocal), c = centroid(r); return `<path d="${ringD(r)}" fill="${GK[q.kind][0]}" fill-opacity="0.85" stroke="#4b5563" stroke-width="${lw(0.25)}"${q.kind === 'yer_osti' ? ' stroke-dasharray="1.5 0.8"' : ''}/><text x="${X(c)}" y="${n2(+Y(c) + 1.2)}" font-size="${T(3.2)}" font-weight="700" text-anchor="middle" fill="#1f3a68">P</text>`; }).join(''));
      for (const k of ['yer_osti', 'stilobat', 'yer_usti', 'kop_qavatli']) if (gs.some(q => q.kind === k)) legend.push({ type: 'fill', fill: GK[k][0], stroke: '#4b5563', label: tr(GK[k][1]) });
      // 05.11: kirish-chiqish (pandus) va shamollatish shaxtalari (414, 415-bandlar; SanPiN 6.4.1 8-izoh)
      const ents = gs.flatMap(q => (q.entries ?? []).map(e => ({ at: fr.toLocal(e.at), kind: e.kind, ...(e.dir != null ? { dir: e.dir } : {}) })));
      if (ents.length) {
        g('Avtoturargoh_kirishlari', ents.map(e => { const r = entryRing(e), col = e.kind === 'rampa' ? '#d9a441' : '#5f6369'; let arrow = '';
          if (e.kind === 'rampa') { const d = e.dir ?? 0, ux = Math.cos(d), uy = Math.sin(d), t0: XY = [e.at[0] - ux * 5, e.at[1] - uy * 5], t1: XY = [e.at[0] - ux * 1, e.at[1] - uy * 1]; arrow = `<path d="M${X(t0)} ${Y(t0)}L${X(t1)} ${Y(t1)}M${X([t1[0] - ux * 1.1 + uy * 0.8, t1[1] - uy * 1.1 - ux * 0.8])} ${Y([t1[0] - ux * 1.1 + uy * 0.8, t1[1] - uy * 1.1 - ux * 0.8])}L${X(t1)} ${Y(t1)}L${X([t1[0] - ux * 1.1 - uy * 0.8, t1[1] - uy * 1.1 + ux * 0.8])} ${Y([t1[0] - ux * 1.1 - uy * 0.8, t1[1] - uy * 1.1 + ux * 0.8])}" fill="none" stroke="#1d1d1b" stroke-width="${lw(0.3)}"/>`; }
          return `<path d="${ringD(r)}" fill="${col}" stroke="#1d1d1b" stroke-width="${lw(0.25)}"/>${arrow}`; }).join(''));
        if (ents.some(e => e.kind === 'rampa')) legend.push({ type: 'fill', fill: '#d9a441', stroke: '#1d1d1b', label: tr('Avtoturargoh kirish-chiqishi (pandus)') });
        if (ents.some(e => e.kind === 'shaxta')) legend.push({ type: 'fill', fill: '#5f6369', stroke: '#1d1d1b', label: tr('Shamollatish shaxtasi') });
      }
    }
    const man = doc.pois.filter(q => q.kind === 'bekat' || q.kind === 'metro').map(q => ({ p: fr.toLocal(q.at), kind: q.kind as 'bekat' | 'metro' }));
    const allSt = [...(ctx?.stops ?? []), ...man].filter(q => Math.abs(q.p[0] - cx) < R + 800 && Math.abs(q.p[1] - cy) < R + 800);
    if (allSt.length) {
      g('Bekat_radiuslari', allSt.map(q => `<circle cx="${X(q.p)}" cy="${Y(q.p)}" r="${n2((q.kind === 'metro' ? 800 : 400) * k)}" fill="${q.kind === 'metro' ? '#c0392b' : '#2a6fb0'}" fill-opacity="0.05" stroke="${q.kind === 'metro' ? '#c0392b' : '#2a6fb0'}" stroke-width="${lw(0.25)}" stroke-dasharray="2 1"/>`).join('')
        + man.map(q => `<circle cx="${X(q.p)}" cy="${Y(q.p)}" r="1.6" fill="${q.kind === 'metro' ? '#c0392b' : '#2a6fb0'}" stroke="#ffffff" stroke-width="${lw(0.2)}"/>`).join(''));
      legend.push({ type: 'dash', stroke: '#2a6fb0', label: tr('Bekatdan 400 m (382-band, toʻgʻri chiziq)') });
      if (allSt.some(q => q.kind === 'metro')) legend.push({ type: 'dash', stroke: '#c0392b', label: tr('Metro kirishidan 800 m (TAXMIN)') });
      if (man.length && !ctx?.stops?.length) legend.push({ type: 'stop', fill: '#2a6fb0', label: tr('Bekatlar (qoʻlda belgilangan)') });
    } else legend.push({ type: 'fill', fill: '#ffffff', stroke: '#9a978f', label: tr('Bekatlar yoʻq — atrofni yuklang yoki 9-qadamda qoʻlda belgilang') });
  }

  // 4b. bekatlar
  const lT = Ly('stops');
  if (ctx?.stops?.length && lT.on && K !== 'figura') {
    const st = ctx.stops.filter(q => Math.abs(q.p[0] - cx) < R && Math.abs(q.p[1] - cy) < R), r0 = 1.6;
    g('Bekatlar', st.map(q => `<circle cx="${X(q.p)}" cy="${Y(q.p)}" r="${r0}" fill="${q.kind === 'metro' ? '#c0392b' : '#2a6fb0'}" stroke="#ffffff" stroke-width="${lw(lT.mm)}"/><text x="${X(q.p)}" y="${n2(+Y(q.p) + 0.9)}" font-size="${T(2.5)}" font-weight="700" text-anchor="middle" fill="#ffffff">${q.kind === 'metro' ? 'M' : 'A'}</text>`).join(''));
    if (st.length) legend.push({ type: 'stop', fill: '#2a6fb0', label: tr('Bekatlar (A — avtobus, M — metro)') });
  }

  // 5. yer uchastkasi yozuvlari (4.1): boʻsh joyda, varaqda kod 3,5 mm, qolgani 2,5 mm
  const plots: PlotRow[] = [];
  let full = 0;
  {
    const idx = new Map<number, number>(), obst = PR ? [] : nb.map(x => x.r), kM = scale / 1000, max = S.labels ? modeMax(o.labelMode ?? 'auto') : 0, out: string[] = [];
    const angDeg = (a: number) => -(a - rot) * 180 / Math.PI;
    plan.blocks.forEach(b => {
      const n = (idx.get(b.blockKey) ?? 0) + 1; idx.set(b.blockKey, n);
      const code = b.parcelId ? `D-${b.blockKey + 1}.${n}` : `D-${b.blockKey + 1}`, use = tr(SHORT[b.use] ?? useDef(b.use).name), ar = `${(b.area / 1e4).toFixed(2).replace('.', ',')} ga`;
      const rect = VZ || K === 'figura' ? null : freeRect(b.rings, obst);
      const lv = max ? pickLevel(rect, code, use, ar, kM, 3.5, 2.5, max as 0 | 1 | 2 | 3) : 0;
      plots.push({ code, use: tr(useDef(b.use).name), color: mix(ucol(b.use), GS ? 0.05 : 0.15), full: parcelFill(b.use), ha: b.area / 1e4, level: lv });
      if (lv === 3) full++;
      if (!lv || !rect) return;
      const lines = labelLines(lv, code, use, ar), halo = K === 'zona' ? plotFill(b.use) : PR ? parcelFill(b.use) : '#ffffff';
      const v = toV(rect.c), fsz = lines.map((_t, i) => i ? 2.5 : 3.5), gapL = 0.35 * 2.5, H = fsz.reduce((a2, b2) => a2 + b2, 0) + gapL * (lines.length - 1);
      let acc = -H / 2;
      const body = lines.map((t, i) => { acc += fsz[i]; const yy = acc - fsz[i] * 0.18; acc += gapL; return `<text y="${n2(yy)}" font-size="${T(fsz[i])}"${i === 0 ? ' font-weight="700"' : ''}${i === 0 || (i === lines.length - 1 && lines.length > 1) ? ' font-family="IBM Plex Mono, Menlo, monospace"' : ''}>${esc(t)}</text>`; }).join('');
      // 11.11: kulrang parsellarda yozuv rangi — oq yoki qora, qaysi biri kontrastliroq (WCAG)
      out.push(`<g transform="translate(${n2(v[0])} ${n2(v[1])}) rotate(${n2(angDeg(rect.ang))})" text-anchor="middle" fill="${grey ? inkOn(PG) : '#1d1d1b'}" stroke="${halo}" stroke-width="0.6" stroke-linejoin="round" paint-order="stroke">${body}</g>`);
    });
    g('Yer_uchastkalari_yozuvlari', out.join(''));
  }

  if (psBub) g('Avtoturargoh_sigimi', psBub);   // 12.11: yozuvlar ustida (daha yozuvi doirani yopmasin)
  // 6. uchastka chegarasi
  const lSi = Ly('site');
  if (site && lSi.on) {
    g('Uchastka_chegarasi', `<path d="${polyD(site)}" fill="${VZ ? '#f5c7c3' : 'none'}" fill-opacity="${VZ ? 0.6 : 1}" stroke="#d0342c" stroke-width="${lw(lSi.mm)}" stroke-dasharray="4 1.2 0.8 1.2"/>`);
    legend.push({ type: 'dash', stroke: '#d0342c', label: tr('Loyihalash chegarasi') });
  }

  // 7. koordinata toʻri
  if (S.grid) {
    const step = o.gridStep && o.gridStep > 0 ? o.gridStep : scale >= 5000 ? 500 : scale >= 2000 ? 200 : 100, out: string[] = [];
    const lim = R;
    for (let x = Math.ceil((cx - lim) / step) * step; x <= cx + lim; x += step) out.push(`<path d="${lineD([[x, cy - lim], [x, cy + lim]])}" stroke="#9fb5c9" stroke-width="${lw(0.1)}"/>`);
    for (let y = Math.ceil((cy - lim) / step) * step; y <= cy + lim; y += step) out.push(`<path d="${lineD([[cx - lim, y], [cx + lim, y]])}" stroke="#9fb5c9" stroke-width="${lw(0.1)}"/>`);
    // yorliqlar chekkada (burilmagan varaqda)
    if (!rot) {
      for (let x = Math.ceil((cx - vw / 2 / k) / step) * step; x <= cx + vw / 2 / k; x += step) out.push(`<text x="${n2(+X([x, 0]) + 0.8)}" y="${vy + 3.4}" font-size="${T(2.5)}" fill="#6f8aa3">${x}</text>`);
      for (let y = Math.ceil((cy - vh / 2 / k) / step) * step; y <= cy + vh / 2 / k; y += step) out.push(`<text x="${vx + 0.8}" y="${n2(+Y([0, y]) - 0.8)}" font-size="${T(2.5)}" fill="#6f8aa3">${y}</text>`);
    }
    g('Koordinata_tori', out.join(''));
  }

  if (inner) { L.length = 0; legend.length = 0; legend.push(...(inner.legend ?? [])); L.push(`<g id="Mazmun" inkscape:groupmode="layer" inkscape:label="Mazmun">${inner.body(vx, vy, vw, vh)}</g>`); }
  const scaleTxt = inner ? inner.label : `M 1:${scale}`;
  // varaq bezaklari (kesilmaydi)
  const A: string[] = [];
  const lay = (id: string, label: string, body: string) => A.push(`<g id="${id}" ${ai ? 'i:layer="yes" ' : ''}inkscape:groupmode="layer" inkscape:label="${label}">${body}</g>`);
  if (S.frame) lay('Ramka', 'Ramka', `<rect x="${vx}" y="${vy}" width="${n2(vw)}" height="${n2(vh)}" fill="none" stroke="#1d1d1b" stroke-width="0.35"/>${col ? `<rect x="${n2(vx + vw + gap)}" y="${vy}" width="${n2(col)}" height="${n2(vh)}" fill="none" stroke="#1d1d1b" stroke-width="0.25"/>` : ''}`);
  if (S.north && !inner) {
    const nx = vx + vw - 12, ny = vy + 14, a = n2(-rot * 180 / Math.PI);
    lay('Shimol', 'Shimol', `<g transform="rotate(${a} ${nx} ${ny})"><circle cx="${nx}" cy="${ny}" r="7" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.3"/><path d="M${nx},${ny - 6}L${nx + 2.6},${ny + 4}L${nx},${ny + 2.4}Z" fill="#1d1d1b"/><path d="M${nx},${ny - 6}L${nx - 2.6},${ny + 4}L${nx},${ny + 2.4}Z" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.25"/><text x="${nx}" y="${ny - 7.8}" font-size="${T(3)}" font-weight="700" text-anchor="middle" fill="#1d1d1b">N</text></g>`);
  }
  // 04.11: shamol guli — varaqning chap yuqori burchagida (shimol strelkasi bilan bir xil burilish), ustun yoʻnalish strelkasi
  if (K === 'shamol' && ctx?.wind && !inner) {
    const Wd = ctx.wind, rx = vx + 26, ry = vy + 26, RR = 18, a = n2(-rot * 180 / Math.PI), out: string[] = [`<circle cx="${rx}" cy="${ry}" r="${RR + 5}" fill="#ffffff" fill-opacity="0.92" stroke="#1d1d1b" stroke-width="0.25"/>`];
    const tot = Wd.rose.map(r => r.reduce((x, y) => x + y, 0)), mx = Math.max(1e-9, ...tot), COLS = ['#d6e6f2', '#a9cbe3', '#72a7cf', '#3f7fb5', '#215a8f', '#0f3460'];
    [0.5, 1].forEach(f => out.push(`<circle cx="${rx}" cy="${ry}" r="${n2(RR * f)}" fill="none" stroke="#c9c6bf" stroke-width="0.15"/>`));
    const Q = (r: number, an: number) => `${n2(rx + r * Math.sin(an))},${n2(ry - r * Math.cos(an))}`;
    Wd.rose.forEach((bins, kk) => { let acc = 0; const a0 = (kk * 22.5 - 9) * Math.PI / 180, a1 = (kk * 22.5 + 9) * Math.PI / 180;
      bins.forEach((v, b) => { if (v <= 0) return; const r0 = RR * Math.sqrt(acc / mx), r1 = RR * Math.sqrt((acc + v) / mx); acc += v; out.push(`<path d="M${Q(r0, a0)}L${Q(r1, a0)}A${n2(r1)},${n2(r1)} 0 0 1 ${Q(r1, a1)}L${Q(r0, a1)}A${n2(r0)},${n2(r0)} 0 0 0 ${Q(r0, a0)}Z" fill="${COLS[Math.min(5, b)]}"/>`); }); });
    const da = Wd.dir * Math.PI / 180;
    out.push(`<path d="M${Q(RR + 4, da)}L${Q(RR * 0.25, da)}" stroke="#d0342c" stroke-width="0.6"/><circle cx="${n2(rx + (RR + 4) * Math.sin(da))}" cy="${n2(ry - (RR + 4) * Math.cos(da))}" r="0.9" fill="#d0342c"/>`);
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, d]) => { const an = Number(d) * Math.PI / 180; out.push(`<text x="${n2(rx + (RR + 2.6) * Math.sin(an))}" y="${n2(ry - (RR + 2.6) * Math.cos(an) + 0.9)}" font-size="${T(2.5)}" text-anchor="middle" fill="#6b6965">${t}</text>`); });
    lay('Shamol_guli', 'Shamol guli', `<g transform="rotate(${a} ${rx} ${ry})">${out.join('')}</g><text x="${rx}" y="${n2(ry + RR + 9)}" font-size="${T(2.5)}" text-anchor="middle" fill="#1d1d1b">${esc(`${Wd.station} · ${tr('ustun')}: ${tr(Wd.prevailing)}`)}</text><text x="${rx}" y="${n2(ry + RR + 12.5)}" font-size="${T(2.5)}" text-anchor="middle" fill="#6b6965">${esc(`${String(Wd.mean.toFixed(1)).replace('.', ',')} m/s · ${tr('shtil')} ${Math.round(Wd.calm * 100)} % · ${Wd.src}`)}</text>`);
  }
  if (S.scaleBar && !inner) {
    const len = niceLen(Math.min(vw * 0.3, 80) / k), seg = len / 4, bx = vx + 6, by = vy + vh - 8, out: string[] = [];
    for (let i = 0; i < 4; i++) out.push(`<rect x="${n2(bx + i * seg * k)}" y="${by}" width="${n2(seg * k)}" height="1.4" fill="${i % 2 ? '#ffffff' : '#1d1d1b'}" stroke="#1d1d1b" stroke-width="0.2"/>`);
    for (let i = 0; i <= 4; i += 2) out.push(`<text x="${n2(bx + i * seg * k)}" y="${by - 1.2}" font-size="${T(2.5)}" text-anchor="middle" fill="#1d1d1b">${i * seg}</text>`);
    out.push(`<text x="${n2(bx + len * k + 2)}" y="${by + 1.3}" font-size="${T(2.5)}" fill="#1d1d1b">m · M 1:${scale}</text>`);
    lay('Masshtab', 'Masshtab', `<rect x="${bx - 3}" y="${by - 5.4}" width="${n2(len * k + 30)}" height="8.4" fill="#ffffff" fill-opacity="0.85"/>${out.join('')}`);
  }
  const kindName = inner?.name ? tr(inner.name) : SV ? `${tr('Xizmat radiusi')} · ${tr(SV.name)}` : tr(SHEET_KINDS.find(s2 => s2.id === K)!.name), d = date.toLocaleDateString('ru-RU'), ttl = esc(o.title || doc.name);
  // oʻng ustun: sarlavha → shartli belgilar → yer uchastkalari jadvali → vaziyat sxemasi → shtamp
  if (col) {
    const x0 = vx + vw + gap + 4, w = col - 8;
    let y = vy + 4;
    const yEnd = vy + vh - 4;
    if (S.title) { lay('Sarlavha', 'Sarlavha', `<text x="${x0}" y="${n2(y + 5)}" font-size="${T(Math.min(6, w / 14))}" font-weight="700" fill="#1d1d1b">${ttl}</text><text x="${x0}" y="${n2(y + 10)}" font-size="${T(2.8)}" fill="#55524b">${esc(kindName)} · ${scaleTxt} · ${d}</text>`); y += 15; }
    // 12.11 (meʼyorlar toʻplami, 3-bosqich, 4-band): shtampda qoʻllangan toʻplam qatori va konsepsiya belgisi
    const nset = doc.settings.normSet ?? placeOf(doc.origin[0], doc.origin[1]).norms, concept = nset === 'UZ' && doc.settings.concept === true, sc = doc.settings.siteCond;
    const normTxt = `${tr('Meʼyorlar')}: ${nset === 'UZ' ? tr('Oʻzbekiston · ShNQ') + (concept ? ` (${tr('konsepsiya rejimi')})` : '') : `${tr('Xalqaro andoza')} (NSW ADG 3F-1)`}${sc ? ` + ${tr('uchastka shartlari')}${sc.src ? ` — ${tr('manba')}: ${sc.src}` : ''}` : ''}`;
    const nmx = Math.max(20, Math.floor((w - 3) / 1.32)), nLines: string[] = [];
    for (const wd of normTxt.split(' ')) { const L = nLines.length ? nLines[nLines.length - 1] : null; if (L !== null && (L + ' ' + wd).length <= nmx) nLines[nLines.length - 1] = L + ' ' + wd; else nLines.push(wd); }
    if (nLines.length > 2) { nLines.length = 2; nLines[1] = nLines[1].slice(0, nmx - 1) + '…'; }
    const nH = 1.2 + nLines.length * 3.4;
    const stampH = S.stamp ? 30 + nH + (concept ? 5 : 0) : 0, sitH = S.situation ? Math.min(55, w * 0.7) + 6 : 0;
    if (S.legend && legend.length) {
      const rowH = 4.6, out: string[] = [`<text x="${x0}" y="${n2(y + 3.5)}" font-size="${T(3)}" font-weight="700" fill="#1d1d1b">${esc(tr('Shartli belgilar'))}</text>`];
      legend.forEach((it, i) => { const yy = y + 7 + i * rowH; out.push(legendSym(it, x0, yy), `<text x="${x0 + 8}" y="${n2(yy + 2.3)}" font-size="${T(2.5)}" fill="#1d1d1b">${esc(it.label)}</text>`); });
      lay('Shartli_belgilar', 'Shartli belgilar', out.join('')); y += 9 + legend.length * rowH;
    }
    if (inner?.side) { lay('Eksplikatsiya', 'Eksplikatsiya', inner.side(x0, y + 2, w, yEnd - stampH - sitH - 2)); }
    const side = inner ? null : K === 'daraxt' && TREE ? { id: 'Daraxtlar_balansi', title: 'Daraxtlar balansi', rows: treeRows(TREE, tr), cols: ['soni', ''] } : K === 'navbat' ? { id: 'Navbatlar', title: 'Qurilish navbatlari', rows: stageRows(doc, tr), cols: ['m² / soni', ''] } : K === 'parkovka' ? { id: 'Avtoturargoh_balansi', title: 'Avtoturargoh: talab va taʼminot', rows: parkingRows(doc, tr), cols: ['joy', ''] } : K === 'parkstrat' ? { id: 'Parkovka_strategiyasi', title: 'Parkovka strategiyasi', rows: parkStratRows(doc, PS_D, tr), cols: ['', ''] } : K === 'cheklov' && bal ? { id: 'Yer_balansi', title: 'Yer balansi', rows: balanceRows(doc, tr) } : K === 'transport' ? { id: 'Transport_balansi', title: 'Koʻchalar va avtoturargohlar', rows: transportRows(doc, tr), cols: ['km / joy', ''] } : K === 'yashil' ? { id: 'Yashil_balans', title: 'Yashil balans', rows: greenRows(doc, tr) } : PR ? { id: 'Parsellar_jadvali', title: 'Parsellar', rows: parcelRows(doc, plots, tr) } : null;
    if (side && side.rows.length) {
      // balans jadvali (02.11): yer balansi (cheklovlar varagʻi) yoki yashil balans (86, 87-band)
      const ha = (v: number) => v.toFixed(2).replace('.', ',');
      const rowH = 3.8, avail = yEnd - stampH - sitH - y - 10, fit = Math.max(0, Math.floor(avail / rowH) - 2), out: string[] = [];
      out.push(`<text x="${x0}" y="${n2(y + 3.5)}" font-size="${T(3)}" font-weight="700" fill="#1d1d1b">${esc(tr(side.title))}</text>`);
      const yh = y + 7.5; out.push(`<text x="${x0 + w - 16}" y="${n2(yh)}" font-size="${T(2.5)}" text-anchor="end" fill="#6b6965">${esc(tr((side as { cols?: string[] }).cols?.[0] ?? 'ga'))}</text><text x="${x0 + w}" y="${n2(yh)}" font-size="${T(2.5)}" text-anchor="end" fill="#6b6965">${esc((side as { cols?: string[] }).cols?.[1] ?? '%')}</text>`);
      let off = 0;
      side.rows.slice(0, fit).forEach((r, i) => {
        if (r.sep && i) off += 1.2;
        const yy = yh + (i + 1) * rowH + off, tx = r.c ? x0 + 3.6 : x0;
        if (r.sep && i) out.push(`<path d="M${x0},${n2(yy - 3.6)}h${n2(w)}" stroke="#c9c6bf" stroke-width="0.12"/>`);
        if (r.c) out.push(`<rect x="${x0}" y="${n2(yy - 2.4)}" width="2.6" height="2.6" fill="${r.c}" stroke="#9a978f" stroke-width="0.1"/>`);
        out.push(`<text x="${tx}" y="${n2(yy)}" font-size="${T(2.5)}"${r.b ? ' font-weight="700"' : ''} fill="#1d1d1b">${esc(r.t)}</text>${r.v == null ? '' : `<text x="${x0 + w - 16}" y="${n2(yy)}" font-size="${T(2.5)}" text-anchor="end" font-family="IBM Plex Mono, Menlo, monospace" fill="#1d1d1b">${r.vt ?? ha(r.v)}</text>`}<text x="${x0 + w}" y="${n2(yy)}" font-size="${T(2.5)}" text-anchor="end" font-family="IBM Plex Mono, Menlo, monospace"${r.b ? ' font-weight="700"' : ''} fill="${r.ok === false ? '#c0392b' : r.ok ? '#2e7d32' : '#6b6965'}">${esc(r.p ?? '')}</text>`);
      });
      lay(side.id, tr(side.title), out.join(''));
    } else if (S.plotTable && plots.length && !inner) {
      const rowH = 3.8, avail = yEnd - stampH - sitH - y - 10, nRows = Math.max(0, Math.floor(avail / rowH) - 1), shown = plots.slice(0, Math.max(0, plots.length > nRows ? nRows - 1 : nRows)), out: string[] = [];
      if (nRows > 1) {
        out.push(`<text x="${x0}" y="${n2(y + 3.5)}" font-size="${T(3)}" font-weight="700" fill="#1d1d1b">${esc(tr('Yer uchastkalari'))}</text>`);
        const yh = y + 7.5; out.push(`<text x="${x0}" y="${n2(yh)}" font-size="${T(2.5)}" fill="#6b6965">${esc(tr('kod'))}</text><text x="${x0 + 18}" y="${n2(yh)}" font-size="${T(2.5)}" fill="#6b6965">${esc(tr('funksiya'))}</text><text x="${x0 + w}" y="${n2(yh)}" font-size="${T(2.5)}" text-anchor="end" fill="#6b6965">ga</text>`);
        shown.forEach((r, i) => { const yy = yh + (i + 1) * rowH; out.push(`<rect x="${x0}" y="${n2(yy - 2.4)}" width="2.6" height="2.6" fill="${r.color}" stroke="#9a978f" stroke-width="0.1"/><text x="${x0 + 3.6}" y="${n2(yy)}" font-size="${T(2.5)}" font-family="IBM Plex Mono, Menlo, monospace" fill="#1d1d1b">${esc(r.code)}</text><text x="${x0 + 18}" y="${n2(yy)}" font-size="${T(2.5)}" fill="#1d1d1b">${esc(r.use)}</text><text x="${x0 + w}" y="${n2(yy)}" font-size="${T(2.5)}" text-anchor="end" font-family="IBM Plex Mono, Menlo, monospace" fill="#1d1d1b">${r.ha.toFixed(2).replace('.', ',')}</text>`); });
        if (shown.length < plots.length) out.push(`<text x="${x0}" y="${n2(yh + (shown.length + 1) * rowH)}" font-size="${T(2.5)}" fill="#6b6965">… ${esc(tr(`${plots.length} ta`))}</text>`);
        lay('Yer_uchastkalari_jadvali', 'Yer uchastkalari jadvali', out.join(''));
      }
    }
    if (S.situation) {
      const sh = sitH - 6, sy = yEnd - stampH - sitH, out: string[] = [`<text x="${x0}" y="${n2(sy + 3)}" font-size="${T(2.8)}" font-weight="700" fill="#1d1d1b">${esc(tr('Vaziyat sxemasi'))}</text>`, `<rect x="${x0}" y="${n2(sy + 5)}" width="${n2(w)}" height="${n2(sh - 4)}" fill="#f4f3f0" stroke="#1d1d1b" stroke-width="0.2"/>`];
      if (ctx) {
        const rr = Math.max(500, (bx1 - bx0), (by1 - by0)) * 2.2, kk = Math.min(w, sh - 4) / rr, ox = x0 + w / 2, oy = sy + 5 + (sh - 4) / 2;
        const q = (p: XY) => `${n2(ox + (p[0] - (bx0 + bx1) / 2) * kk)},${n2(oy - (p[1] - (by0 + by1) / 2) * kk)}`;
        const inB = (p: XY) => Math.abs(p[0] - (bx0 + bx1) / 2) < rr / 2 && Math.abs(p[1] - (by0 + by1) / 2) < rr / 2;
        out.push(`<clipPath id="vzClip"><rect x="${x0}" y="${n2(sy + 5)}" width="${n2(w)}" height="${n2(sh - 4)}"/></clipPath><g clip-path="url(#vzClip)">`);
        ctx.roads.filter(r => r.pts.some(inB) && /^(motorway|trunk|primary|secondary|tertiary|residential)/.test(r.cls)).forEach(r => out.push(`<path d="M${r.pts.map(q).join('L')}" fill="none" stroke="#bcb8b0" stroke-width="0.25"/>`));
        if (site0) out.push(`<path d="M${site0.map(q).join('L')}Z" fill="#d0342c" fill-opacity="0.5" stroke="#d0342c" stroke-width="0.3"/>`);
        out.push('</g>');
      }
      lay('Vaziyat_sxemasi', 'Vaziyat sxemasi', out.join(''));
    }
    if (S.stamp) {
      const sy = yEnd - stampH + 2, st = o.stamp ?? {}, rows: [string, string][] = [[tr('Loyiha'), o.title || doc.name], [tr('Varaq'), `${st.num ? st.num + ' · ' : ''}${st.sheet || kindName}`], [tr('Muallif'), st.author || ''], [tr('Masshtab'), inner ? inner.label.replace(/^M /, '') : `1:${scale}`], [tr('Sana'), d], [tr('Varaq'), `${st.index ?? 1} / ${st.total ?? 1}`]];
      const out = [`<rect x="${x0}" y="${n2(sy)}" width="${n2(w)}" height="${stampH - 2}" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.3"/>`];
      rows.forEach(([a, b], i) => { const yy = sy + 4.3 + i * 4.6; if (i) out.push(`<path d="M${x0},${n2(yy - 3.4)}h${n2(w)}" stroke="#1d1d1b" stroke-width="0.12"/>`); out.push(`<text x="${x0 + 1.5}" y="${n2(yy)}" font-size="${T(2.5)}" fill="#6b6965">${esc(a)}</text><text x="${x0 + 22}" y="${n2(yy)}" font-size="${T(2.5)}" fill="#1d1d1b">${esc(b)}</text>`); });
      out.push(`<path d="M${x0 + 20},${n2(sy)}v${rows.length * 4.6 + 0.4}" stroke="#1d1d1b" stroke-width="0.12"/>`);
      { const ny = sy + rows.length * 4.6 + 0.6;
        out.push(`<path d="M${x0},${n2(ny)}h${n2(w)}" stroke="#1d1d1b" stroke-width="0.12"/><text x="${x0 + 1.5}" y="${n2(ny + 3.3)}" font-size="${T(2.5)}" fill="#1d1d1b" data-norms="${nset}">${nLines.map((l, i) => `<tspan x="${x0 + 1.5}" dy="${i ? 3.4 : 0}">${esc(l)}</tspan>`).join('')}</text>`);
        if (concept) out.push(`<rect x="${x0}" y="${n2(ny + nH)}" width="${n2(w)}" height="4.6" fill="#f8efd9" stroke="#1d1d1b" stroke-width="0.12"/><text x="${x0 + 1.5}" y="${n2(ny + nH + 3.3)}" font-size="${T(2.5)}" font-weight="700" fill="#95620f" data-concept="1">${esc(tr('ShNQ tekshiruvidan oʻtmagan — konsepsiya').toUpperCase().replace('SHNQ', 'ShNQ'))}</text>`); }
      lay('Shtamp', 'Shtamp', out.join(''));
    }
    lay('Muallif', 'Muallif', `<text x="${n2(x0 + w)}" y="${n2(vy + vh + 4.5)}" font-size="${T(2.5)}" text-anchor="end" fill="#8a857c">Archemistry Lab · Master reja · ${esc(tr('Asos'))}: OpenStreetMap · ${nset === 'UZ' ? 'ShNQ 2.07.01-23' : 'NSW ADG 3F-1'} · ${esc(tr('qavat'))} ${fh} m</text>`);
  } else {
    if (S.legend && legend.length) {
      const rowH = 4.6, w = 60, hgt = 7 + legend.length * rowH, lx = vx + vw - w - 4, ly = vy + vh - hgt - 4, out: string[] = [];
      out.push(`<rect x="${lx}" y="${ly}" width="${w}" height="${n2(hgt)}" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.2"/><text x="${lx + 3}" y="${ly + 4.6}" font-size="${T(2.8)}" font-weight="700" fill="#1d1d1b">${esc(tr('Shartli belgilar'))}</text>`);
      legend.forEach((it, i) => { const y = ly + 7.5 + i * rowH; out.push(legendSym(it, lx + 3, y), `<text x="${lx + 11}" y="${n2(y + 2.3)}" font-size="${T(2.5)}" fill="#1d1d1b">${esc(it.label)}</text>`); });
      lay('Shartli_belgilar', 'Shartli belgilar', out.join(''));
    }
    if (S.title) {
      const ty = ph - M - TB + 4;
      lay('Sarlavha', 'Sarlavha', `<path d="M${vx},${ty - 1}H${vx + vw}" stroke="#1d1d1b" stroke-width="0.35"/>`
        + `<text x="${vx}" y="${ty + 6}" font-size="${T(5.2)}" font-weight="700" fill="#1d1d1b">${ttl}</text>`
        + `<text x="${vx}" y="${ty + 12}" font-size="${T(3)}" fill="#55524b">${esc(kindName)} · ${scaleTxt} · ${d}</text>`
        + `<text x="${vx + vw}" y="${ty + 6}" font-size="${T(2.6)}" text-anchor="end" fill="#55524b">Archemistry Lab · Master reja</text>`
        + `<text x="${vx + vw}" y="${ty + 11}" font-size="${T(2.5)}" text-anchor="end" fill="#8a857c">${esc(tr('Asos'))}: OpenStreetMap · ${esc(tr('meʼyorlar'))}: ShNQ 2.07.01-23 · ${esc(tr('qavat'))} ${fh} m</text>`);
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"${ai ? ' xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/"' : ''} width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}" font-family="${esc(fam)}">
<title>${esc((o.title || doc.name) + ' — ' + kindName)}</title>
<defs><clipPath id="vp"><rect x="${vx}" y="${vy}" width="${n2(vw)}" height="${n2(vh)}"/></clipPath>${site ? `<clipPath id="ichki"><path d="${polyD(site)}" clip-rule="evenodd"/></clipPath><mask id="tashqari" maskUnits="userSpaceOnUse" x="0" y="0" width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" fill="#fff"/><path d="${polyD(site)}" fill="#000" fill-rule="evenodd"/></mask>` : ''}</defs>
${ai ? `<g id="Fon" i:layer="yes" inkscape:groupmode="layer" inkscape:label="Fon"><rect width="${pw}" height="${ph}" fill="${C.bg}"/></g>` : `<rect width="${pw}" height="${ph}" fill="${C.bg}"/>`}
${ai ? L.join('\n') : `<g clip-path="url(#vp)">${L.join('\n')}</g>`}
${A.join('\n')}
</svg>`;
  return { svg, scale, widthMm: pw, heightMm: ph, legend, plots, labels: { full, total: plots.length }, minText, fits, auto };
}

/** Balans jadvali qatori: v — ga (yoʻq — faqat izoh), p — foiz matni, ok — meʼyorga mos / mos emas (rang), sep — oldidan ajratuvchi chiziq */
export interface BalanceRow { t: string; v?: number; /** qiymat matni (v oʻrniga, masalan joylar soni) */ vt?: string; p?: string; ok?: boolean; c?: string; b?: boolean; sep?: boolean }
const pct = (v: number) => `${(v * 100).toFixed(1).replace('.', ',')} %`;
/** Yer balansi qatorlari (ga): hudud, qurib boʻlmaydigan, SMZ, yaroqli; keyin funksiyalar boʻyicha kvartallar va koʻchalar (qoldiq) */
/**
 * Parsellar jadvali (06.11, «Parsellar rejasi» varagʻi): har parsel — kod va funksiya, ga, loyihalash hududidan ulush; koʻchalar va jami.
 * Ulush asosi — loyiha chegarasi (yoʻq boʻlsa — parsellar yigʻindisi).
 */
export function parcelRows(doc: Project, plots: PlotRow[], tr: (s: string) => string = s => s): BalanceRow[] {
  if (!plots.length) return [];
  const sum = plots.reduce((t, r) => t + r.ha, 0), siteHa = doc.site ? (landBalance(doc)?.siteHa ?? sum) : sum, B = siteHa || 1;
  const rows: BalanceRow[] = plots.map(r => ({ t: `${r.code} · ${r.use}`, v: r.ha, p: pct(r.ha / B), c: r.full ?? r.color }));
  rows.push({ t: tr('Parsellar jami'), v: sum, p: pct(sum / B), b: true, sep: true });
  if (doc.site && siteHa > sum + 0.005) rows.push({ t: tr('Koʻchalar va boshqa'), v: siteHa - sum, p: pct((siteHa - sum) / B), c: '#f6dcd8' });
  if (doc.site) rows.push({ t: tr('Loyihalash hududi'), v: siteHa, p: '100,0 %', b: true });
  return rows;
}
export function balanceRows(doc: Project, tr: (s: string) => string = s => s): BalanceRow[] {
  const bal = landBalance(doc); if (!bal) return [];
  const by = new Map<string, number>(); for (const b of computePlan(doc).blocks) by.set(b.use, (by.get(b.use) ?? 0) + b.area / 1e4);
  const blk = [...by.values()].reduce((a, b) => a + b, 0), S0 = bal.siteHa || 1, R = (r: BalanceRow): BalanceRow => ({ ...r, p: pct((r.v ?? 0) / S0) });
  return [
    R({ t: tr('Loyihalash hududi'), v: bal.siteHa, b: true }),
    R({ t: tr('Qurib boʻlmaydigan joy'), v: bal.hardHa }), R({ t: tr('SMZ (turar joy taqiqlangan)'), v: bal.szzHa }), R({ t: tr('Turar joy uchun yaroqli'), v: bal.usableHa, b: true }),
    ...USES.filter(u => by.has(u.id)).map((u, i) => R({ t: tr(u.name), v: by.get(u.id)!, c: mix(u.color, 0.15), sep: i === 0 })),
    R({ t: tr('Koʻchalar va boshqa'), v: Math.max(0, bal.siteHa - blk), c: '#ecebe7' }),
  ];
}
/**
 * Yashil balans (ShNQ 2.07.01-23, 86-band ≥ 30 % — 01/2-15 tahriri, 87-band — maydoncha va yoʻlaklar uchastkaning 30 % igacha; hisob asosi maktab va MTM
 * uchastkalarisiz — core/landscape.greenBalance bilan bir xil) va SMZ koʻkalamzorligi (SanQvaN 0103-25, 13-band — core/szzgen).
 */
export function greenRows(doc: Project, tr: (s: string) => string = s => s): BalanceRow[] {
  if (!doc.site) return [];
  const g = greenBalance(doc, doc.settings.yards ? landscape(doc) : []), B = g.base || 1, R = (r: BalanceRow): BalanceRow => ({ ...r, p: pct((r.v ?? 0) * 1e4 / B) });
  const out: BalanceRow[] = [
    R({ t: tr('Yashil kvartallar'), v: g.blocksGreen / 1e4, c: '#bcd9a3' }),
    R({ t: tr('Hovli maysasi'), v: g.yardGreen / 1e4, c: '#cfe3bc' }),
    R({ t: tr('Maydoncha va yoʻlaklar (87-band, ≤ 30 %)'), v: g.yardPlay / 1e4, c: '#f6dcae' }),
    { t: `${tr('Jami yashil')} (${tr('meʼyor')} ≥ ${GREEN_86} %)`, v: g.counted / 1e4, p: pct(g.share), ok: g.share >= GREEN_86 / 100, b: true, sep: true },
    { t: tr('Hisob asosi (maktab va MTM uchastkalarisiz)'), v: g.base / 1e4, p: '100,0 %' },
  ];
  if (!doc.settings.yards) out.push({ t: tr('Hovli obodonlashtirish oʻchiq — hovli maysasi hisobga olinmadi') });
  szzGreen(doc).forEach((z, i) => out.push({ t: `${tr('SMZ koʻkalami')} — ${tr(z.label)} (${z.cls} ${tr('sinf')}, ≥ ${Math.round(z.need * 100)} %)`, v: z.green / 1e4, p: pct(z.share), ok: z.share >= z.need, sep: i === 0 }));
  return out;
}
/** Chizmadon jadvali uchun: [nom, ga, %] */
export function balanceTable(doc: Project, tr: (s: string) => string = s => s, kind: 'yer' | 'yashil' = 'yer'): string[][] | null {
  const r = kind === 'yer' ? balanceRows(doc, tr) : greenRows(doc, tr); if (!r.length) return null;
  return [[tr(kind === 'yer' ? 'Yer balansi' : 'Yashil balans'), 'ga', '%'], ...r.map(x => [x.t, x.v == null ? '' : x.v.toFixed(2).replace('.', ','), (x.p ?? '').replace(' %', '')])];
}

/** Koʻcha toifalari (profiles.Cat) — transport sxemasi ranglari */
const CAT_ORDER: Cat[] = ['shahar-magistral-3', 'tuman-magistral', 'mahalliy', 'piyoda', 'otish'];
const CAT_COL: Record<Cat, string> = { 'shahar-magistral-3': '#c0392b', 'tuman-magistral': '#e67e22', mahalliy: '#d4ac0d', piyoda: '#27ae60', otish: '#95a5a6' };
const CAT_NAME: Record<Cat, string> = { 'shahar-magistral-3': 'Shahar magistrali', 'tuman-magistral': 'Tuman magistrali', mahalliy: 'Mahalliy koʻcha', piyoda: 'Piyoda koʻchasi', otish: 'Oʻtish yoʻli' };
/** Transport sxemasi jadvali: koʻchalar uzunligi toifa boʻyicha (km); avtoturargoh joylari — talab (29-jadval, core/derive) va mavjud */
export function transportRows(doc: Project, tr: (s: string) => string = s => s): BalanceRow[] {
  const fr = frame(doc.origin), by = new Map<Cat, number>();
  for (const st of doc.streets) { const a = st.axis.map(fr.toLocal), c = profileById(st.profile).cat; let L = 0; for (let i = 1; i < a.length; i++) L += Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]); by.set(c, (by.get(c) ?? 0) + L / 1000); }
  const km = (v: number) => v.toFixed(2).replace('.', ',');
  const out: BalanceRow[] = CAT_ORDER.filter(c => by.has(c)).map(c => ({ t: tr(CAT_NAME[c]), vt: km(by.get(c)!), c: CAT_COL[c] }));
  if (out.length) out.push({ t: tr('Koʻchalar jami, km'), vt: km([...by.values()].reduce((a, b) => a + b, 0)), b: true });
  const d = derive(doc), gs = doc.garages.filter(q => !q.truck), sp = (k: string) => gs.filter(q => q.kind === k).reduce((t, q) => t + q.spaces, 0);
  if (d.parkingReq > 0 || gs.length) {
    out.push({ t: tr('Avtoturargoh talabi (29-jadval), joy'), vt: String(d.parkingReq), sep: true });
    for (const [k, n] of [['yer_osti', 'Yer osti avtoturargohi'], ['stilobat', 'Stilobatdagi avtoturargoh'], ['yer_usti', 'Ochiq avtoturargoh'], ['kop_qavatli', 'Koʻp qavatli avtoturargoh']] as const) { const v = sp(k); if (v) out.push({ t: tr(n), vt: String(v) }); }
    const open = d.parkingProv - gs.reduce((t, q) => t + q.spaces, 0); if (open > 0) out.push({ t: tr('«Avtoturargoh» parsellari (25 m²/joy)'), vt: String(open) });
    out.push({ t: tr('Jami mavjud, joy'), vt: String(d.parkingProv), b: true, ok: d.parkingProv >= d.parkingReq, p: d.parkingProv >= d.parkingReq ? tr('mos') : `−${d.parkingReq - d.parkingProv}` });
  }
  return out;
}

/** 12.11: avtoturargoh talabi (ShNQ 2.07.01-23, 29-jadval — toifalar boʻyicha) va taʼminot (turlar boʻyicha) — «Avtoturargohlar sxemasi» varagʻi */
export function parkingRows(doc: Project, tr: (s: string) => string = s => s): BalanceRow[] {
  const d = derive(doc), gs = doc.garages.filter(q => !q.truck), sp = (k: string) => gs.filter(q => q.kind === k).reduce((t, q) => t + q.spaces, 0);
  const NAMES: Record<string, string> = { kvartiralar: 'Kvartiralar', ofis: 'Maʼmuriy va ofis (har 10 m²)', savdo: 'Savdo markazlari (> 200 m²)', maktab: 'Maktab (25 oʻquvchiga 1)', mtm: 'MTM (25 bolaga 1)', park: 'Park (0,05 ga ga 1)', mehmonxona: 'Mehmonxona', poliklinika: 'Poliklinika' };
  if (d.parkingReq <= 0 && !gs.length) return [];
  const out: BalanceRow[] = [{ t: tr('Talab (29-jadval), joy'), v: d.parkingReq, vt: String(d.parkingReq), b: true }];
  for (const [kk, v] of Object.entries(d.parkingParts)) if (v > 0) out.push({ t: tr(NAMES[kk] ?? kk), v, vt: String(v) });
  out.push({ t: tr('Taʼminot'), vt: '', b: true, sep: true });
  for (const [kk, n] of [['yer_osti', 'Yer osti avtoturargohi'], ['stilobat', 'Stilobatdagi avtoturargoh'], ['yer_usti', 'Ochiq avtoturargoh'], ['kop_qavatli', 'Koʻp qavatli avtoturargoh']] as const) { const v = sp(kk); if (v) out.push({ t: tr(n), v, vt: String(v) }); }
  const open = d.parkingProv - gs.reduce((t, q) => t + q.spaces, 0); if (open > 0) out.push({ t: tr('«Avtoturargoh» parsellari (25 m²/joy)'), v: open, vt: String(open) });
  out.push({ t: tr('Jami mavjud, joy'), v: d.parkingProv, vt: String(d.parkingProv), b: true, ok: d.parkingProv >= d.parkingReq, p: d.parkingProv >= d.parkingReq ? tr('mos') : `−${d.parkingReq - d.parkingProv}` });
  return out;
}

/** 12.11: parkovka strategiyasi jadvali — turlar ulushi, talab/taʼminot, turar joydan masofa (oʻrtacha, eng uzoq, oraliqlar boʻyicha binolar) */
export function parkStratRows(doc: Project, dist: Map<string, number>, tr: (s: string) => string = s => s): BalanceRow[] {
  const d = derive(doc), gs = doc.garages.filter(q => !q.truck), tot = gs.reduce((t, q) => t + q.spaces, 0); if (!gs.length) return [];
  const out: BalanceRow[] = [{ t: tr('Turlar ulushi'), b: true }];
  for (const [kk, n] of [['yer_osti', 'Yer osti avtoturargohi'], ['stilobat', 'Stilobatdagi avtoturargoh'], ['yer_usti', 'Ochiq avtoturargoh'], ['kop_qavatli', 'Koʻp qavatli avtoturargoh']] as const) { const v = gs.filter(q => q.kind === kk).reduce((t, q) => t + q.spaces, 0); if (v) out.push({ t: tr(n), v, vt: `${Math.round(v / tot * 100)} %` }); }
  out.push({ t: tr('Taʼminot / talab, joy'), v: d.parkingProv, vt: `${d.parkingProv} / ${d.parkingReq}`, b: true, sep: true, ok: d.parkingProv >= d.parkingReq, p: d.parkingProv >= d.parkingReq ? tr('mos') : `−${d.parkingReq - d.parkingProv}` });
  const ds = [...dist.values()]; if (ds.length) {
    out.push({ t: tr('Turar joydan masofa'), b: true, sep: true });
    out.push({ t: tr('oʻrtacha, m'), v: 0, vt: String(Math.round(ds.reduce((a, b) => a + b, 0) / ds.length)) });
    out.push({ t: tr('eng uzoq, m'), v: 0, vt: String(Math.round(Math.max(...ds))), ok: Math.max(...ds) <= 300, p: Math.max(...ds) <= 300 ? tr('mos') : '> 300' });
    for (const [lo, hi, l] of [[-1, 100, '≤ 100 m'], [100, 200, '100–200 m'], [200, 300, '200–300 m'], [300, Infinity, '> 300 m']] as const) { const n = ds.filter(x => x > lo && x <= hi).length; if (n) out.push({ t: `${l} — ${tr('binolar')}`, v: n, vt: String(n) }); }
  }
  return out;
}

/** 04.11 (egasi: tahlil varaqlari — qurilish navbati): navbat raqami (yoʻq — 1), ranglari */
export const stageOf = (b: { stage?: number }): number => Math.max(1, Math.min(5, Math.round(b.stage ?? 1)));
export const STAGE_COL = ['#f2c14e', '#7fb3c8', '#e58e73', '#9ccf8a', '#b9a3d6'];
const tf2 = (s: string, v: Record<string, unknown>) => s.replace(/\$\{(\w+)\}/g, (_m, e: string) => String(v[e]));
/** Navbatlar jadvali: har navbat — binolar soni, umumiy maydon (GFA ≈ dogʻ × qavatlar), xonadonlar (derive) */
export function stageRows(doc: Project, tr: (s: string) => string = s => s): BalanceRow[] {
  const fr = frame(doc.origin), used = [...new Set(doc.buildings.filter(b => b.floors > 0).map(stageOf))].sort();
  const out: BalanceRow[] = []; let G = 0, A = 0;
  const m2 = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
  for (const st of used) {
    const bs = doc.buildings.filter(b => b.floors > 0 && stageOf(b) === st), gfa = bs.reduce((t, b) => t + area(b.footprint.map(fr.toLocal)) * b.floors, 0);
    const d = derive({ ...doc, buildings: bs }), ap = d.apartments ?? 0; G += gfa; A += ap;
    out.push({ t: tf2(tr('${n}-navbat'), { n: st }), vt: '', c: STAGE_COL[st - 1], b: true, sep: out.length > 0 });
    out.push({ t: tr('Binolar soni'), vt: String(bs.length) }, { t: tr('Umumiy maydon (GFA), m²'), vt: m2(gfa) });
    if (ap) out.push({ t: tr('Xonadonlar'), vt: String(Math.round(ap)) });
  }
  if (used.length > 1) out.push({ t: tr('Jami, m²'), vt: m2(G), b: true, sep: true }, ...(A ? [{ t: tr('Jami xonadonlar'), vt: String(Math.round(A)) }] : []));
  return out;
}

/** Chizmadon jadvali: transport sxemasi */
export function transportTable(doc: Project, tr: (s: string) => string = s => s): string[][] | null {
  const r = transportRows(doc, tr); if (!r.length) return null;
  return [[tr('Koʻchalar va avtoturargohlar'), tr('km / joy'), ''], ...r.map(x => [x.t, x.vt ?? '', x.p ?? ''])];
}

function legendSym(it: LegendItem, sx: number, y: number): string {
  if (it.type === 'text') return '';   // 06.11: uzun izohning davomi (belgisiz qator)
  if (it.type === 'fill' || it.type === 'swatch') return `<rect x="${sx}" y="${n2(y - 0.2)}" width="6" height="3" fill="${it.fill}" stroke="${it.stroke ?? '#9a978f'}" stroke-width="0.15"/>`;
  if (it.type === 'line') return `<path d="M${sx},${n2(y + 1.3)}h6" stroke="${it.stroke}" stroke-width="0.4"/>`;
  if (it.type === 'dash') return `<rect x="${sx}" y="${n2(y - 0.2)}" width="6" height="3" fill="none" stroke="${it.stroke}" stroke-width="0.3" stroke-dasharray="1.2 0.6"/>`;
  if (it.type === 'hatch') return `<rect x="${sx}" y="${n2(y - 0.2)}" width="6" height="3" fill="#ffffff" stroke="#1d1d1b" stroke-width="0.25"/><path d="M${sx},${n2(y + 1.3)}l1.5,-1.5M${sx},${n2(y + 2.8)}l3,-3M${sx + 1.5},${n2(y + 2.8)}l3,-3M${sx + 3},${n2(y + 2.8)}l3,-3M${sx + 4.5},${n2(y + 2.8)}l1.5,-1.5" stroke="#1d1d1b" stroke-width="0.12"/>`;
  if (it.type === 'stop') return `<circle cx="${sx + 3}" cy="${n2(y + 1.3)}" r="1.4" fill="${it.fill}"/>`;
  return `<circle cx="${sx + 3}" cy="${n2(y + 1.3)}" r="1.4" fill="${it.fill ?? '#ffffff'}" stroke="${it.stroke ?? '#7d8a6a'}" stroke-width="0.15"/>`;
}

/** Varaq tekshiruvi (MR-Varaqlar): qisqargan yozuvlar, < 2,5 mm matn, varaqdan chiqqan hudud, andoza/nostandart masshtab, boʻsh shtamp */
export interface SheetCheck { id: 'scale' | 'labels' | 'text' | 'fit' | 'stamp'; ok: boolean; text: string }
export function sheetChecks(r: SheetResult, o: SheetOpts, tr: (s: string) => string = s => s): SheetCheck[] {
  const [lo, hi] = scaleRange(o.kind), std = SCALES.includes(r.scale);
  const sc: SheetCheck = r.auto ? { id: 'scale', ok: false, text: tr('Masshtab «andoza» qoidadan — tasdiqlang yoki oʻzgartiring') }
    : !std || r.scale < lo || r.scale > hi ? { id: 'scale', ok: false, text: `${tr('Nostandart yoki tavsiyadan tashqari masshtab')} 1:${r.scale}` } : { id: 'scale', ok: true, text: `${tr('Masshtab')} 1:${r.scale}` };
  return [
    sc,
    { id: 'labels', ok: r.labels.full === r.labels.total, text: `${r.labels.full} / ${r.labels.total} ${tr('yozuv toʻliq sigʻdi')}` },
    { id: 'text', ok: r.minText >= 2.5, text: r.minText >= 2.5 ? tr('Matn ≥ 2,5 mm') : `${tr('Matn')} ${String(r.minText).replace('.', ',')} mm < 2,5 mm` },
    { id: 'fit', ok: r.fits, text: r.fits ? tr('Hudud varaqqa sigʻdi') : tr('Hudud varaqdan chiqib ketgan') },
    { id: 'stamp', ok: !(o.show.stamp ?? true) || !!(o.stamp?.author), text: !(o.show.stamp ?? true) || o.stamp?.author ? tr('Shtamp toʻldirilgan') : tr('Shtampda muallif yoʻq') },
  ];
}

/** 12.11: daraxtlar xaritasi — uchastka ichidagi mavjud daraxtlar holati (core/trees) va yangi ekiladiganlar */
export interface TreeSum { keep: XY[]; near: XY[]; cut: XY[]; inv: number; osm: number; newT: number }
export function treeSum(doc: Project, ctx: SheetCtx | null, blds: XY[][], site0: XY[] | null, newT: XY[]): TreeSum {
  const fr = frame(doc.origin), inS = (p: XY) => !site0 || pipT(p, site0);
  const inv = (doc.treeInv ?? []).map(t => fr.toLocal(t.at) as XY).filter(inS), osm = (ctx?.trees ?? []).filter(inS);
  const all = mergeTrees(osm, inv), car = docCarriage(doc);
  const out: TreeSum = { keep: [], near: [], cut: [], inv: inv.length, osm: all.length - inv.length, newT: newT.length };
  for (const t of all) { const st = treeStatus(t, blds, car); (st === 'kesiladi' ? out.cut : st === 'yaqin' ? out.near : out.keep).push(t); }
  return out;
}
const pipT = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
export function treeRows(t: TreeSum, tr: (s: string) => string = s => s): BalanceRow[] {
  const ex = t.keep.length + t.near.length + t.cut.length, after = t.keep.length + t.near.length + t.newT;
  return [
    { t: tr('Mavjud daraxtlar (uchastka ichida)'), v: ex, vt: String(ex), b: true },
    { t: tr('inventarizatsiyadan'), v: t.inv, vt: String(t.inv) }, { t: tr('OSM dan'), v: t.osm, vt: String(t.osm) },
    { t: tr('Saqlanadi'), v: t.keep.length, vt: String(t.keep.length), sep: true, c: '#4f8a3a' },
    { t: tr('Binoga 5 m dan yaqin — koʻrib chiqish'), v: t.near.length, vt: String(t.near.length), c: '#e8a33d', ok: t.near.length === 0, p: tr('35-jadval') },
    { t: tr('Kesiladi yoki koʻchiriladi'), v: t.cut.length, vt: String(t.cut.length), ok: t.cut.length === 0, p: tr('moratoriy') },
    { t: tr('Yangi ekiladi (koʻcha, hovli)'), v: t.newT, vt: String(t.newT), sep: true, c: '#b9dca0' },
    { t: tr('Loyihadan keyin jami'), v: after, vt: String(after), b: true, sep: true, ok: after >= ex, p: after >= ex ? `+${after - ex}` : `−${ex - after}` },
  ];
}

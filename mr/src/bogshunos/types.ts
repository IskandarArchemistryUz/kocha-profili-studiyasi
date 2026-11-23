/**
 * Bogʻshunos — landshaft master reja: maʼlumot tuzilmalari (14.11.2026).
 * Barcha geometriya mahalliy metrda (X — sharq, Y — shimol) loyiha markazidan (origin, core/geo frame).
 * Belgilar: N — norma (asl matndan), P — taxmin (tekshirilsin), A — xorijiy orientir, T — talqin.
 */
import type { LngLat } from '../core/doc';

export type XY = [number, number];
export type Ring = XY[];
/** koʻp qismli poligon: [tashqi, teshik, teshik…][] */
export type MPoly = Ring[][];

export interface BgTree { p: XY; sp: string; d: number; c: number; h: number; ok: boolean }
export interface BgFeat { k: string; v: string; name?: string; g: XY[] | MPoly; kind: 'pt' | 'ln' | 'pg'; tags?: Record<string, string> }

/** Yuklangan maʼlumot (xom) */
export interface BgData {
  at: string;
  osm: BgFeat[];
  trees: BgTree[];
  /** relyef toʻri: x0,y0 — chap-past burchak, step — m, z — balandlik (qatorlar janubdan shimolga) */
  dem: { x0: number; y0: number; step: number; nx: number; ny: number; z: number[]; src: string } | null;
  /** aholi: GHS-POP katakchalari markazi va soni */
  pop: { p: XY; n: number }[];
  popSrc: string;
  /** foydalanuvchi topo-syomkasi (DXF) boʻlsa — relyef shundan */
  topo?: { pts: [number, number, number][]; name: string } | null;
  /** mavjud muhandislik tarmoqlari (import yoki chizish) */
  nets?: BgNet[];
  /** texnik shartlar (TU) */
  tu?: BgTu[];
}

export type NetKind = 'suv' | 'kanal' | 'yomgir' | 'elektr' | 'gaz' | 'issiqlik' | 'aloqa' | 'sugorish';
export interface BgNet { kind: NetKind; g: XY[]; d?: number; kv?: number; src: string; exist: boolean; name?: string }
export interface BgTu { kind: NetKind; p: XY; cap: number; unit: string; doc?: string }

export interface BgSite {
  name: string; place: string;
  origin: LngLat;
  boundary: Ring;
  /** bogʻ turi (501, 481/490-bandlar) */
  kind: 'shahar' | 'tuman' | 'turarjoy' | 'xiyobon' | 'ormon';
  rekonstruksiya: boolean;
  /** tarixiy yoki rasmiy makon (23.11): mavjud kompozitsiya saqlanadi, sport va shovqinli elementlar sukut boʻyicha qoʻyilmaydi */
  tarixiy?: boolean;
  /** qoʻlda belgilangan saqlanadigan obyektlar (haykal, yodgorlik): siljimaydi, demontaj qilinmaydi */
  keepPts?: { p: XY; name: string }[];
}

export type Tag = 'N' | 'P' | 'A' | 'T' | 'X' | '';
export interface Row { k: string; v: string; t?: Tag; note?: string }

export interface Variant {
  id: 'A' | 'B' | 'C'; name: string; desc: string;
  /** yoʻllar (15.11): ref — tahrir havolasi (o<i> asl, a<j> qoʻshilgan); light/style/smooth/pirog — qoʻlda sozlamalar */
  paths: { g: XY[]; tier: import('./catalog').Tier; w: number; grade?: number; ref?: string; light?: 'ustun' | 'past' | 'yoq'; style?: 'yaxlit' | 'punktir'; smooth?: boolean; pirog?: string }[];
  gates: { p: XY; f: number; main: boolean }[];
  bridges: { g: XY[]; w: number; why: string }[];
  prog: Record<string, MPoly>;
  /** dastur elementlari markazi va sababi (qoida) */
  items: { id: string; name: string; p: XY; rule: string }[];
  m: Record<string, number>;
  earth?: { cut: number; fill: number };
  /** qoʻlda qoʻyilgan jihozlar (kutubxona id, markaz, burilish, rad) */
  furn?: { id: string; p: XY; a: number }[];
  /** dastur bloklari (23.11): burilgan toʻgʻri toʻrtburchak elementlar — surish, burish, turini almashtirish mumkin */
  blocks?: import('./dastur').Block[];
  /** maydon belgilari (oq chiziqlar) */
  marks?: XY[][];
  /** bolalar oʻyin jihozlari xavfsizlik zonalari (doira) */
  safe?: { p: XY; r: number }[];
  /** joylanmay qolgan dastur elementlari va sababi */
  miss?: { el: string; why: string }[];
  /** saqlanadigan obyektlar (haykal, yodgorlik, favvora): joyi oʻzgarmaydi, ustidan yoʻl ham, element ham oʻtmaydi */
  fixed?: { p: XY; name: string; r: number; t: string }[];
}

export interface BgModel {
  v: 1;
  site: BgSite;
  data: BgData;
  /** hisoblangan natijalar (qadamlar boʻyicha) */
  res: Record<string, unknown>;
  chosen: 'A' | 'B' | 'C';
}

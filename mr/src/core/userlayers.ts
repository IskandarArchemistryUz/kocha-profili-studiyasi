/**
 * Foydalanuvchi qatlamlari («Mening qatlamlarim»): fayldan import qilingan binolar, chegaralar (aholi punkti, mahallalar),
 * yerdan foydalanish uchastkalari va chiziqlar (yoʻllar). Bu modul — sof funksiyalar: fayl tahlili, koordinata tizimini
 * aniqlash (WGS84 yoki UTM 41/42N), qatlam turini aniqlash, toifalar (rang bilan) va mahalla koʻrsatkichlari.
 *
 * Hujjatda faqat qatlam tavsifi (UserLayerMeta) saqlanadi; obyektlarning oʻzi — IndexedDB da (storage/userlayers.ts),
 * chunki 12 000 binoli qatlam hujjatni (va undo tarixini) ogʻirlashtiradi.
 */
import polygonClipping, { type Polygon, type MultiPolygon } from 'polygon-clipping';
import type { LngLat } from './doc';
import { frame, polyArea, type XY } from './geo';

export type ULKind = 'bino' | 'chegara' | 'yer' | 'chiziq';
export const UL_KINDS: { id: ULKind; name: string; note: string }[] = [
  { id: 'bino', name: 'Binolar', note: 'hajm sifatida, balandligi bilan' },
  { id: 'chegara', name: 'Chegaralar', note: 'aholi punkti, mahallalar — kontur va nom' },
  { id: 'yer', name: 'Yerdan foydalanish', note: 'uchastkalar toifa rangida' },
  { id: 'chiziq', name: 'Chiziqlar', note: 'yoʻllar, kanallar, tarmoqlar' },
];
export const isULKind = (v: unknown): v is ULKind => UL_KINDS.some(k => k.id === v);

export type Props = Record<string, string | number | null>;
/** Bitta obyekt: koʻpburchak(lar) — polys[i] = [tashqi, ...teshiklar]; yoki chiziq(lar) */
export interface ULFeature { polys?: LngLat[][][]; lines?: LngLat[][]; p: Props }

export interface ULCat { v: string; label: string; color: number; on: boolean; n: number }
export interface UserLayerMeta {
  id: string;
  name: string;
  kind: ULKind;
  /** asl fayl nomi */
  file: string;
  added: string;
  count: number;
  /** [gʻarb, janub, sharq, shimol] */
  bbox: [number, number, number, number];
  visible: boolean;
  /** 0…1 — tekis qatlamlar (chegara, yer) toʻldirilishi uchun */
  opacity: number;
  /** toifa maydoni (rang va alohida yoqish shu boʻyicha); null — bitta rang */
  catField: string | null;
  cats: ULCat[];
  /** nom maydoni (chegaralar yozuvi, mahalla jadvali) */
  nameField: string | null;
  /** balandlik (m) yoki qavatlar soni maydoni — binolar uchun */
  heightField: string | null;
  floorsField: string | null;
  /** toifa rangida yoki bitta rangda (sahna uslubiga moslashadi) */
  colorBy: 'toifa' | 'bir';
  color: number;
  labels: boolean;
}

/* ---------- koordinata tizimi ---------- */

/** UTM (WGS84, shimoliy yarim shar) → [uzunlik, kenglik] — Snyder formulasi; mm aniqlikda */
export function utmToLngLat(E: number, N: number, zone: number): LngLat {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2), x = E - 500000, M = N / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256)), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const C1 = ep2 * Math.cos(p) ** 2, T1 = Math.tan(p) ** 2, N1 = a / Math.sqrt(1 - e2 * Math.sin(p) ** 2), R1 = a * (1 - e2) / (1 - e2 * Math.sin(p) ** 2) ** 1.5, D = x / (N1 * k0);
  const lat = p - (N1 * Math.tan(p) / R1) * (D ** 2 / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6 / 720);
  const lon = (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5 / 120) / Math.cos(p);
  return [lon * 180 / Math.PI + (zone * 6 - 183), lat * 180 / Math.PI];
}

export type CRS = 'wgs84' | 'utm41' | 'utm42';
export const CRS_LIST: { id: CRS; name: string }[] = [
  { id: 'wgs84', name: 'WGS84 (uzunlik/kenglik)' },
  { id: 'utm41', name: 'UTM 41N (EPSG:32641) — 60–66° sharq' },
  { id: 'utm42', name: 'UTM 42N (EPSG:32642) — 66–72° sharq' },
];

/** Fayldagi koordinatalar boʻyicha taxmin: graduslarmi yoki metrmi; GeoJSON «crs» yozuvi boʻlsa — u */
export function detectCRS(gj: any, sample: number[][]): CRS | 'metr' {
  const name = String(gj?.crs?.properties?.name ?? '');
  if (/32641/.test(name)) return 'utm41';
  if (/32642/.test(name)) return 'utm42';
  if (!sample.length) return 'wgs84';
  if (sample.every(p => Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) return 'wgs84';
  // UTM: sharq 100–900 km, shimol 4–5 ming km (Oʻzbekiston); zona taxmin qilinmaydi — foydalanuvchi tanlaydi
  return 'metr';
}

/* ---------- fayl tahlili ---------- */

export interface ParsedFile { features: ULFeature[]; fields: string[]; crs: CRS | 'metr'; skipped: number }

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const okRing = (r: unknown): r is number[][] => Array.isArray(r) && r.length >= 3 && r.every(p => Array.isArray(p) && p.length >= 2 && num(p[0]) && num(p[1]));
const okLine = (r: unknown): r is number[][] => Array.isArray(r) && r.length >= 2 && r.every(p => Array.isArray(p) && p.length >= 2 && num(p[0]) && num(p[1]));
/** yopiq halqadagi takror oxirgi nuqtani olib tashlash (loyihada halqalar ochiq) */
const open = (r: number[][]): number[][] => { const a = r[0], b = r[r.length - 1]; return a[0] === b[0] && a[1] === b[1] ? r.slice(0, -1) : r; };

/** GeoJSON matni → obyektlar (koordinatalar hali oʻzgartirilmagan) */
export function parseGeoJSON(text: string): ParsedFile {
  let gj: any;
  try { gj = JSON.parse(text); } catch { throw new Error('Fayl JSON emas'); }
  const list: any[] = gj?.type === 'FeatureCollection' && Array.isArray(gj.features) ? gj.features : gj?.type === 'Feature' ? [gj] : gj?.type && gj.coordinates ? [{ type: 'Feature', geometry: gj, properties: {} }] : [];
  if (!list.length) throw new Error('GeoJSON da obyekt topilmadi (FeatureCollection kutilgan)');
  const features: ULFeature[] = [], fields = new Set<string>(), sample: number[][] = [];
  let skipped = 0;
  type Raw = { polys?: number[][][][]; lines?: number[][][] };
  const geomOf = (g: any, out: Raw) => {
    if (!g) return;
    switch (g.type) {
      case 'Polygon': if (Array.isArray(g.coordinates) && okRing(g.coordinates[0])) (out.polys ??= []).push(g.coordinates.filter(okRing).map(open)); break;
      case 'MultiPolygon': for (const pg of g.coordinates ?? []) if (Array.isArray(pg) && okRing(pg[0])) (out.polys ??= []).push(pg.filter(okRing).map(open)); break;
      case 'LineString': if (okLine(g.coordinates)) (out.lines ??= []).push(g.coordinates); break;
      case 'MultiLineString': for (const l of g.coordinates ?? []) if (okLine(l)) (out.lines ??= []).push(l); break;
      case 'GeometryCollection': for (const x of g.geometries ?? []) geomOf(x, out); break;
    }
  };
  for (const f of list) {
    const p: Props = {};
    for (const [k, v] of Object.entries(f?.properties ?? {})) { fields.add(k); p[k] = typeof v === 'number' || typeof v === 'string' ? v : v == null ? null : JSON.stringify(v); }
    const raw: Raw = {};
    geomOf(f?.geometry, raw);
    if (!raw.polys?.length && !raw.lines?.length) { skipped++; continue; }
    const out: ULFeature = { p };
    if (raw.polys?.length) out.polys = raw.polys.map(pg => pg.map(r => r.map(q => [q[0], q[1]] as LngLat)));
    if (raw.lines?.length) out.lines = raw.lines.map(l => l.map(q => [q[0], q[1]] as LngLat));
    if (sample.length < 50) sample.push(out.polys?.[0][0][0] ?? out.lines![0][0]);
    features.push(out);
  }
  return { features, fields: [...fields], crs: detectCRS(gj, sample), skipped };
}

/** Koordinatalarni WGS84 ga keltirish (joyida emas — yangi roʻyxat) */
export function toWGS84(fs: ULFeature[], crs: CRS): ULFeature[] {
  if (crs === 'wgs84') return fs;
  const z = crs === 'utm41' ? 41 : 42, T = (q: LngLat): LngLat => { const r = utmToLngLat(q[0], q[1], z); return [Math.round(r[0] * 1e7) / 1e7, Math.round(r[1] * 1e7) / 1e7]; };
  return fs.map(f => ({ p: f.p, ...(f.polys ? { polys: f.polys.map(pg => pg.map(r => r.map(T))) } : {}), ...(f.lines ? { lines: f.lines.map(l => l.map(T)) } : {}) }));
}

/** Oʻzbekiston va qoʻshni hududlar oraligʻidami (notoʻgʻri zona yoki tizim tanlanganini aniqlash uchun) */
export function plausible(bb: [number, number, number, number]): boolean { return bb[0] > 50 && bb[2] < 90 && bb[1] > 30 && bb[3] < 50; }

export function bboxOf(fs: ULFeature[]): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const add = (q: LngLat) => { if (q[0] < w) w = q[0]; if (q[0] > e) e = q[0]; if (q[1] < s) s = q[1]; if (q[1] > n) n = q[1]; };
  for (const f of fs) { f.polys?.forEach(pg => pg[0].forEach(add)); f.lines?.forEach(l => l.forEach(add)); }
  return [w, s, e, n];
}

/* ---------- maydonlar va tur ---------- */

const pick = (fields: string[], re: RegExp) => fields.find(f => re.test(f)) ?? null;
export function guessFields(fields: string[]): { cat: string | null; name: string | null; height: string | null; floors: string | null } {
  return {
    cat: pick(fields, /^(landuse|land_use|lu|lu_code|toifa|funksiya|use|class|category|zone|type)$/i),
    name: pick(fields, /^(name|nomi|nom|name_uz|mahalla|mfy|title)$/i),
    height: pick(fields, /^(height_m|height|h|balandlik|bal)$/i),
    floors: pick(fields, /^(floors|levels|building:levels|storeys|stories|qavat|qavatlar|etaj|etazh)$/i),
  };
}

/** Qatlam turini taxmin qilish: chiziq → chiziq; balandlik/qavat maydoni yoki koʻp mayda koʻpburchak → bino; nomli yirik → chegara; toifali → yer */
export function guessKind(fs: ULFeature[], fields: string[]): ULKind {
  const polys = fs.filter(f => f.polys?.length).length, lines = fs.filter(f => f.lines?.length).length;
  if (lines > polys) return 'chiziq';
  const g = guessFields(fields);
  if (g.height || g.floors) return 'bino';
  // oʻrtacha maydon (namunada)
  const sm = fs.filter(f => f.polys?.length).slice(0, 200);
  const avg = sm.reduce((s, f) => { const r = f.polys![0][0], fr = frame(r[0]); return s + polyArea([r.map(fr.toLocal)]); }, 0) / Math.max(1, sm.length);
  if (avg < 2000 && fs.length > 30) return 'bino';
  if (g.name && fs.length <= 300) return 'chegara';
  return g.cat ? 'yer' : 'chegara';
}

/* ---------- toifalar ---------- */

/** Maʼlum toifalar: kod yoki inglizcha nom → oʻzbekcha nom va rang (Qorashina kadastri, OSM landuse, ShNQ funksional zonalariga yaqin) */
const KNOWN: [RegExp, string, number][] = [
  [/^(res|residential|turar|turar joy|housing)$/i, 'Turar joy', 0xf2cf7c],
  [/^(fac|facilities\/infrastructure|public|social|ijtimoiy|education|civic)$/i, 'Jamoat va ijtimoiy obyektlar', 0x8fb3dd],
  [/^(ind|industrial\/commercial|industrial|commercial|retail|ishlab chiqarish)$/i, 'Ishlab chiqarish va tijorat', 0xc49ad6],
  [/^(agr|agricultural|farmland|farmyard|orchard|qishloq xo.?jaligi)$/i, 'Qishloq xoʻjaligi', 0xc9dca0],
  [/^(her|cultural ?\/ ?heritage|heritage|religious|madaniy meros)$/i, 'Madaniy meros va diniy', 0xc98f6b],
  [/^(wat|water\/hydraulic|water|reservoir|suv)$/i, 'Suv va gidrotexnika', 0x9cc3df],
  [/^(nat|nature\/conservation|forest|park|grass|green|yashil)$/i, 'Tabiat va yashil hudud', 0x8cbf7a],
  [/^(trn|transport|railway|road)$/i, 'Transport', 0xb9bcc2],
  [/^(def|defense\/military|military)$/i, 'Mudofaa', 0x9a9a7a],
  [/^(oth|other|boshqa)$/i, 'Boshqa', 0xd8d3c8],
  [/^(nop|none|unknown|null|)$/i, 'Aniqlanmagan', 0xeceae5],
];
const CYCLE = [0x7fb3d5, 0xf0b27a, 0x82c9a4, 0xd7a1c9, 0xe8d36f, 0xa3a8d9, 0xc9a77c, 0x8fd1d1, 0xe59a8c, 0xb6cf7a];

export function categoriesOf(fs: ULFeature[], field: string | null): ULCat[] {
  if (!field) return [];
  const n = new Map<string, number>();
  for (const f of fs) { const v = String(f.p[field] ?? ''); n.set(v, (n.get(v) ?? 0) + 1); }
  let k = 0;
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([v, c]) => {
    const m = KNOWN.find(x => x[0].test(v.trim()));
    return { v, label: m ? m[1] : (v || 'Aniqlanmagan'), color: m ? m[2] : CYCLE[k++ % CYCLE.length], on: true, n: c };
  });
}

/** Binoning balandligi, m: balandlik maydoni → qavatlar × qavat balandligi → 1 qavat */
export function heightOf(f: ULFeature, m: Pick<UserLayerMeta, 'heightField' | 'floorsField'>, fh: number): number {
  const h = m.heightField ? Number(f.p[m.heightField]) : NaN;
  if (Number.isFinite(h) && h > 0.5 && h < 400) return h;
  const fl = m.floorsField ? Number(f.p[m.floorsField]) : NaN;
  if (Number.isFinite(fl) && fl >= 1 && fl < 120) return Math.round(fl) * fh;
  return fh;
}
export function floorsOf(f: ULFeature, m: Pick<UserLayerMeta, 'heightField' | 'floorsField'>, fh: number): number {
  const fl = m.floorsField ? Number(f.p[m.floorsField]) : NaN;
  if (Number.isFinite(fl) && fl >= 1 && fl < 120) return Math.round(fl);
  return Math.max(1, Math.round(heightOf(f, m, fh) / fh));
}

/** Toifasi (meta.cats dagi yozuv) */
export function catOf(f: ULFeature, m: Pick<UserLayerMeta, 'catField' | 'cats'>): ULCat | null {
  if (!m.catField) return null;
  const v = String(f.p[m.catField] ?? '');
  return m.cats.find(c => c.v === v) ?? null;
}

/* ---------- import natijasi ---------- */

export interface ImportPlan { meta: Omit<UserLayerMeta, 'id' | 'added'>; features: ULFeature[]; slivers: number; warn: string[] }

/** Chegaralar: 10 ga dan kichik va nomsiz koʻpburchaklar — chizmadagi boʻlaklar (mahalla emas) */
export const SLIVER_HA = 10;
export function isSliver(f: ULFeature, nameField: string | null): boolean {
  const nm = nameField ? String(f.p[nameField] ?? '').trim() : '';
  if (nm) return false;
  return haOf(f) < SLIVER_HA;
}

/** Obyekt maydoni, ga (har obyekt oʻz markazidagi mahalliy tizimda — katta hududda ham aniq) */
export function haOf(f: ULFeature): number {
  if (!f.polys?.length) return 0;
  const fr = frame(f.polys[0][0][0]);
  return f.polys.reduce((s, pg) => s + polyArea(pg.map(r => r.map(fr.toLocal))), 0) / 1e4;
}

/** Tayyorlash: tizim, tur, maydonlar, toifalar; dropSlivers — chegaralardagi boʻlaklarni olib tashlash */
export function planImport(file: string, parsed: ParsedFile, crs: CRS, kind?: ULKind, dropSlivers = true): ImportPlan {
  const warn: string[] = [];
  let fs = toWGS84(parsed.features, crs);
  const bb = bboxOf(fs);
  if (!plausible(bb)) warn.push('Koordinatalar Oʻzbekiston hududiga tushmayapti — koordinata tizimini tekshiring');
  const k = kind ?? guessKind(fs, parsed.fields), g = guessFields(parsed.fields);
  let slivers = 0;
  if (k === 'chegara') {
    const keep = fs.filter(f => !isSliver(f, g.name)); slivers = fs.length - keep.length;
    if (dropSlivers) fs = keep;
  }
  if (parsed.skipped) warn.push(`${parsed.skipped} ta obyektda geometriya yoʻq yoki yaroqsiz — tashlab ketildi`);
  const catField = k === 'chegara' ? null : g.cat;
  const meta: ImportPlan['meta'] = {
    name: file.replace(/\.(geo)?json$/i, ''), kind: k, file, count: fs.length, bbox: bboxOf(fs), visible: true,
    opacity: k === 'yer' ? 0.55 : k === 'chegara' ? 0.08 : 1,
    catField, cats: categoriesOf(fs, catField), nameField: g.name, heightField: g.height, floorsField: g.floors,
    colorBy: catField ? 'toifa' : 'bir', color: k === 'chegara' ? 0xd9534f : k === 'chiziq' ? 0x6f6a60 : k === 'yer' ? 0xc9dca0 : 0xf4f2ee,
    labels: k === 'chegara',
  };
  return { meta, features: fs, slivers, warn };
}

/* ---------- katta hudud ---------- */

/** Bepul rejada brauzerda bemalol ishlaydigan chegara (obuna server bosqichida ulanadi; hozir faqat ogohlantirish) */
export const UL_LIMITS = { free: { features: 2000, km2: 2 }, pro: { features: 20000, km2: 25 }, max: { features: 150000, km2: 150 } };
export function extentKm2(bb: [number, number, number, number]): number {
  const fr = frame([(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]), a = fr.toLocal([bb[0], bb[1]]), b = fr.toLocal([bb[2], bb[3]]);
  return Math.abs((b[0] - a[0]) * (b[1] - a[1])) / 1e6;
}
export function tierFor(count: number, km2: number): 'free' | 'pro' | 'max' | 'server' {
  for (const t of ['free', 'pro', 'max'] as const) if (count <= UL_LIMITS[t].features && km2 <= UL_LIMITS[t].km2) return t;
  return 'server';
}

/* ---------- mahalla (chegara) koʻrsatkichlari ---------- */

export interface ZoneStat { name: string; ha: number; /** chegara (aholi punkti) ichidagi qismi, ga; chegara berilmasa — null */ haIn: number | null; buildings: number; footprintM2: number; gfaM2: number; floorsAvg: number }

const pip = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const ringCentroid = (r: XY[]): XY => { let cx = 0, cy = 0, a = 0; for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n], k = p[0] * q[1] - q[0] * p[1]; a += k; cx += (p[0] + q[0]) * k; cy += (p[1] + q[1]) * k; } return Math.abs(a) < 1e-9 ? r[0] : [cx / (3 * a), cy / (3 * a)]; };

/**
 * Har bir chegara (mahalla) uchun: toʻliq maydon, aholi punkti chegarasi ichidagi qismi (zichlik shu boʻyicha),
 * ichidagi binolar soni, oyoq izi va umumiy maydon (GFA = oyoq izi × qavatlar). Bino — markazi boʻyicha bitta mahallaga.
 */
export function zoneStats(zones: ULFeature[], nameField: string | null, blds: { f: ULFeature; floors: number }[], clip: ULFeature[] = []): ZoneStat[] {
  const all = [...zones.flatMap(z => z.polys ?? []), ...blds.flatMap(b => b.f.polys?.slice(0, 1) ?? [])];
  if (!all.length) return [];
  const fr = frame(all[0][0][0]), L = (pg: LngLat[][]) => pg.map(r => r.map(fr.toLocal));
  // binolar: markaz, oyoq izi (oʻz markazidagi tizimda)
  const B = blds.map(b => { const pg = b.f.polys?.[0]; if (!pg) return null; const loc = L(pg); const lfr = frame(pg[0][0]); return { c: ringCentroid(loc[0]), a: polyArea(pg.map(r => r.map(lfr.toLocal))), fl: b.floors }; }).filter(Boolean) as { c: XY; a: number; fl: number }[];
  const clipMP: MultiPolygon = clip.flatMap(f => (f.polys ?? []).map(pg => L(pg).map(r => [...r, r[0]]) as Polygon));
  let clipU: MultiPolygon | null = null;
  if (clipMP.length) { try { clipU = polygonClipping.union(...(clipMP as [Polygon, ...Polygon[]])); } catch { clipU = null; } }
  const mpArea = (mp: MultiPolygon) => mp.reduce((s, pg) => s + polyArea(pg.map(r => r.slice(0, -1) as XY[])), 0);
  return zones.map((z, i) => {
    const polys = (z.polys ?? []).map(L), lfr = frame(z.polys![0][0][0]);
    const ha = (z.polys ?? []).reduce((s, pg) => s + polyArea(pg.map(r => r.map(lfr.toLocal))), 0) / 1e4;
    let haIn: number | null = null;
    if (clipU) { try { haIn = mpArea(polygonClipping.intersection(polys.map(pg => pg.map(r => [...r, r[0]])) as MultiPolygon, clipU)) / 1e4; } catch { haIn = null; } }
    let n = 0, fp = 0, gfa = 0, fl = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const pg of polys) for (const p of pg[0]) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    for (const b of B) {
      if (b.c[0] < x0 || b.c[0] > x1 || b.c[1] < y0 || b.c[1] > y1) continue;
      if (polys.some(pg => pip(b.c, pg[0]) && !pg.slice(1).some(h => pip(b.c, h)))) { n++; fp += b.a; gfa += b.a * b.fl; fl += b.fl; }
    }
    const nm = nameField ? String(z.p[nameField] ?? '').trim() : '';
    return { name: nm || `#${i + 1}`, ha, haIn, buildings: n, footprintM2: fp, gfaM2: gfa, floorsAvg: n ? fl / n : 0 };
  });
}

/* ---------- OSM bilan dublikat ---------- */

/**
 * Import qilingan binolar bilan ustma-ust tushgan OSM binolari (id lar): OSM binosining markazi import qilingan
 * bino ichida yoki aksincha. Shu binolar OSM qatlamidan yashiriladi — foydalanuvchi maʼlumoti ustun (TZ 1.6).
 */
export function osmDuplicates(osm: { id: number; rings: LngLat[][] }[], imported: ULFeature[]): number[] {
  if (!osm.length || !imported.length) return [];
  const fr = frame(osm[0].rings[0][0]), cell = 60, idx = new Map<string, XY[][]>();
  const keyOf = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  for (const f of imported) for (const pg of f.polys ?? []) {
    const r = pg[0].map(fr.toLocal); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    if (x1 - x0 > 2000 || y1 - y0 > 2000) continue;   // bino emas
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(y0 / cell); j <= Math.floor(y1 / cell); j++) { const k = `${i},${j}`; (idx.get(k) ?? idx.set(k, []).get(k)!).push(r); }
  }
  const out: number[] = [];
  for (const b of osm) {
    const r = b.rings[0]?.map(fr.toLocal); if (!r || r.length < 3) continue;
    const c = ringCentroid(r), cand = idx.get(keyOf(c[0], c[1])) ?? [];
    if (cand.some(q => pip(c, q) || pip(ringCentroid(q), r))) out.push(b.id);
  }
  return out;
}

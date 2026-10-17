/**
 * Loyiha hujjati — yagona haqiqat manbai.
 * Hujjatda faqat inson qarorlari saqlanadi (chegara, koʻcha, bino…). Maydon, aholi, zichlik va boshqalar
 * core/derive.ts da har safar shu hujjatdan hisoblanadi va hech qachon hujjatga yozilmaydi.
 */
export const SCHEMA = 3;

/** [uzunlik, kenglik] — WGS84, GeoJSON tartibida */
export type LngLat = [number, number];
/** Ochiq halqa: oxirgi nuqta birinchisini takrorlamaydi */
export type Ring = LngLat[];

export interface Site {
  /** rings[0] — tashqi chegara, qolganlari — teshiklar (anklav) */
  rings: Ring[];
}

import { isUse, type Use } from './uses';
import { COMP_DEFAULT, type CompParams } from './compensation';
import { isMat, isRoof, type Mat, type Roof } from './roof';
import type { Tier } from './tiers';
import { isWin, isBal, isWinPat, isBalPat, type Win, type Bal, type WinPat, type BalPat } from './facade';
export type { Use };

export interface Building {
  id: string;
  footprint: Ring;
  floors: number;
  /** pastki noturar qavatlar soni (doʻkon, xizmat) */
  nonRes: number;
  use: Use;
  /** generator yaratgan seksiya: guruh (kvartal belgisi yoki parsel id si) va turi */
  gen?: { grp: string; kind: string };
  /** pastki sathi, qavatlarda (stilobat ustidagi seksiyalar) */
  z0?: number;
  /** fasad materiali va tom turi (yoʻq — odatiy: suvoq, tekis) */
  mat?: Mat;
  roof?: Roof;
  /** qavatlardan cheginish (terrasa): from — qavat raqami (1 dan), inset — m, edge — faqat shu devor */
  tiers?: Tier[];
  /** parapet balandligi, m */
  parapet?: number;
  /** quyosh himoyasi: avto — fasad yoʻnalishiga koʻra (janub — naves, sharq/gʻarb — lamellar) */
  shade?: Shade;
  /** deraza va balkon turi (yoʻq — loyihaning umumiy fasad uslubi, balkonsiz) */
  win?: Win;
  bal?: Bal;
  /** parametrik joylashuv: derazalar va balkonlar (yoʻq — qator / har 2-modul) */
  winPat?: WinPat;
  balPat?: BalPat;
  /** qoʻlda tahrirlangan tipik qavat rejasi; key — oyoq izi va kvartira sozlamalari (oʻzgarsa tahrir eskiradi) */
  planEdit?: PlanEdit;
}
export type PlanRoomKind = 'texnik' | 'ombor' | 'savdo' | 'velo' | 'zal' | 'tozalash';
export interface PlanEdit { key: string; apts: { ring: LngLat[]; rooms: number }[]; rooms: { ring: LngLat[]; kind: PlanRoomKind }[] }
const ROOM_KINDS: PlanRoomKind[] = ['texnik', 'ombor', 'savdo', 'velo', 'zal', 'tozalash'];
function cleanPlanEdit(v: any): PlanEdit | null {
  if (!v || typeof v.key !== 'string' || !Array.isArray(v.apts) || !Array.isArray(v.rooms)) return null;
  const ok = (r: unknown): r is LngLat[] => Array.isArray(r) && r.length >= 3 && r.every((p: any) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  return { key: v.key, apts: v.apts.filter((a: any) => a && ok(a.ring) && Number.isFinite(a.rooms)).map((a: any) => ({ ring: a.ring.map((p: any) => [p[0], p[1]] as LngLat), rooms: Math.max(1, Math.min(6, Math.round(a.rooms))) })), rooms: v.rooms.filter((q: any) => q && ok(q.ring) && ROOM_KINDS.includes(q.kind)).map((q: any) => ({ ring: q.ring.map((p: any) => [p[0], p[1]] as LngLat), kind: q.kind })) };
}
export type Shade = 'avto' | 'gorizontal' | 'vertikal' | 'panjara';

/** Loyiha koʻchasi: oʻq chizigʻi (ochiq siniq chiziq) + profil; qizil chiziqlar = oʻq ± kenglik/2 */
export interface Street { id: string; axis: LngLat[]; profile: string; /** OSM dagi mavjud koʻcha loyihaga olingan boʻlsa — uning way id si (kontekstda u endi chizilmaydi) */ osm?: number }

/** Zona belgisi: shu nuqtani oʻz ichiga olgan kvartal shu funksiyada (kvartal geometriyasi har safar qayta hisoblanadi) */
export interface Garage { id: string; grp: string; kind: 'yer_osti' | 'stilobat' | 'yer_usti'; ring: Ring; levels: number; spaces: number }

export interface Parcel { id: string; block: string; rings: Ring[]; use: Use }

/** Qoʻlda qoʻshilgan mavjud xizmat obyekti (OSM da yoʻq bogʻcha, maktab…) — xizmat radiuslari tahlilida manba */
export interface ManualPoi { id: string; kind: 'mtm' | 'maktab' | 'poliklinika' | 'dorixona' | 'savdo' | 'sport' | 'mahalla'; at: LngLat; name?: string }

/** Saqlangan kamera koʻrinishi (mahalliy metr, three.js oʻqlari: y — yuqoriga, z = −shimol) */
export interface SavedView { id: string; name: string; mode: 'plan' | 'axo' | 'persp'; pos: [number, number, number]; target: [number, number, number]; zoom: number; lens: number; twoPoint: boolean; frame: string }

export interface ZoneLabel { id: string; at: LngLat; use: Use; /** shu kvartal uchun oxirgi generator parametrlari */ gen?: Record<string, unknown> }

export interface Settings {
  /** amaldagi meʼyorlar toʻplami */
  norms: 'uz-2023';
  /** hududning seysmikligi, ball */
  seismic: number;
  /** turar joy taʼminoti, m² umumiy maydon / kishi — aholi formulasining yagona parametri */
  m2PerPerson: number;
  /** turar joy GFA dan sotiladigan (netto) maydon ulushi */
  netToGross: number;
  /** qavat balandligi, m */
  floorHeight: number;
  /** oʻrtacha kvartira (netto), m² — kvartiralar soni va avtoturargoh talabi uchun (taxmin, loyiha topshirigʻidan aniqlanadi) */
  aptNet: number;
  /** kvartira miksi, %: 1, 2, 3, 4 xonali (fasad modullari boʻyicha rejalash — core/apartments.ts) */
  aptMix: [number, number, number, number];
  /** kvartira oʻlchami (modullar soni) */
  aptSize: 'S' | 'M' | 'L';
  /** aholi yosh tarkibi uchun hudud (stat.uz SOATO kodi): tuman, shahar yoki viloyat */
  district: string;
  /** koʻchirish xarajati parametrlari (core/compensation.ts) */
  comp: CompParams;
  /** hovlilarni avtomatik obodonlashtirish (core/landscape.ts) */
  yards: boolean;
}

/** Atrofdagi shahar (kontekst) — faqat koʻrinish tanlovlari; maʼlumotning oʻzi keshda, hujjatda emas */
export interface ContextSettings {
  /** markazdan radius, m */
  radius: number;
  /** yer qoplami: oddiy maket yoki sunʼiy yoʻldosh tasviri */
  base: 'maket' | 'sputnik';
  layers: { buildings: boolean; roads: boolean; rail: boolean; water: boolean; green: boolean; trees: boolean; relief: boolean };
  /** kontekst yuklanganmi (sahifa yangilanganda keshdan avtomatik tiklash uchun) */
  loaded: boolean;
}

export const DEFAULT_CONTEXT: ContextSettings = {
  radius: 500, base: 'maket', loaded: false,
  layers: { buildings: true, roads: true, rail: true, water: true, green: true, trees: true, relief: true },
};

export interface Project {
  schema: number;
  id: string;
  name: string;
  created: string;
  updated: string;
  /** sahna markazi — barcha mahalliy koordinatalar shundan hisoblanadi */
  origin: LngLat;
  settings: Settings;
  context: ContextSettings;
  site: Site | null;
  buildings: Building[];
  streets: Street[];
  zones: ZoneLabel[];
  /** parkovka inshootlari (generator): yer osti, stilobat ichida, yer usti */
  garages: Garage[];
  /** kvartallarni parsellarga boʻlish: block — kvartal zona belgisi id si */
  parcels: Parcel[];
  /** uchastka ichidagi saqlanadigan mavjud (OSM) binolar id lari; qolganlari — buziladi */
  keep: number[];
  /** atrofdagi (OSM) binolar — foydalanuvchi sahnadan olib tashlagan (id lar) */
  removed?: number[];
  /** atrofdagi (OSM) yoʻllar — foydalanuvchi olib tashlagan (id lar): sahnada, kvartal chegarasida va chizmada yoʻq */
  removedRoads?: number[];
  /** qoʻlda belgilangan mavjud xizmat obyektlari */
  pois: ManualPoi[];
  /** saqlangan kamera koʻrinishlari (taqdimot uchun) */
  views: SavedView[];
}

/** Toshkent markazi — hudud tanlanmaguncha boshlangʻich nuqta */
export const DEFAULT_ORIGIN: LngLat = [69.2797, 41.3111];

export const DEFAULT_SETTINGS: Settings = {
  norms: 'uz-2023',
  seismic: 8,
  // Abdurauf Fitrat KZ hujjatida qoʻllangan qiymat; ShNQ bandi bilan tekshirilishi kerak (norms/params.ts)
  m2PerPerson: 18,
  netToGross: 0.75,
  floorHeight: 3.3,
  aptNet: 65,
  aptMix: [20, 40, 30, 10],
  aptSize: 'M',
  district: '1726',
  comp: { ...COMP_DEFAULT },
  yards: true,
};

export function uid(prefix = ''): string {
  const r = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return prefix + r;
}

export function blankProject(name = 'Yangi loyiha', now = new Date()): Project {
  const t = now.toISOString();
  return {
    schema: SCHEMA, id: uid('p_'), name, created: t, updated: t,
    origin: [...DEFAULT_ORIGIN] as LngLat,
    settings: { ...DEFAULT_SETTINGS, aptMix: [...DEFAULT_SETTINGS.aptMix], comp: { ...COMP_DEFAULT } },
    context: { ...DEFAULT_CONTEXT, layers: { ...DEFAULT_CONTEXT.layers } },
    site: null, buildings: [], streets: [], zones: [], keep: [], parcels: [], garages: [], pois: [], views: [],
  };
}

export class SchemaError extends Error {}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isLL = (v: unknown): v is LngLat => Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90;
const isRing = (v: unknown): v is Ring => Array.isArray(v) && v.length >= 3 && v.every(isLL);

/**
 * Tashqaridan kelgan (fayl, IndexedDB) hujjatni tekshiradi va joriy sxemaga keltiradi.
 * Notoʻgʻri hujjat — SchemaError; jim «tuzatish» yoʻq, chunki bu xatoni yashiradi.
 */
export function migrate(raw: unknown): Project {
  if (!raw || typeof raw !== 'object') throw new SchemaError('Hujjat obyekt emas');
  const d = raw as Record<string, unknown>;
  if (!isNum(d.schema)) throw new SchemaError('Sxema versiyasi yoʻq');
  if (d.schema > SCHEMA) throw new SchemaError(`Hujjat yangiroq versiyada (${d.schema}); ilovani yangilang`);
  // 1 → 2: kontekst sozlamalari qoʻshildi (standart qiymatlar bilan); 2 → 3: koʻchalar, zonalar, saqlanadigan binolar
  // kelajakdagi migratsiyalar shu yerda: if (d.schema === 2) { …; d.schema = 3 }
  if (typeof d.id !== 'string' || !d.id) throw new SchemaError('id yoʻq');
  if (typeof d.name !== 'string') throw new SchemaError('name yoʻq');
  if (!isLL(d.origin)) throw new SchemaError('origin notoʻgʻri');
  const s = { ...DEFAULT_SETTINGS, ...(d.settings as object || {}) } as Settings;
  for (const k of ['seismic', 'm2PerPerson', 'netToGross', 'floorHeight', 'aptNet'] as const) if (!isNum(s[k]) || s[k] <= 0) throw new SchemaError(`settings.${k} notoʻgʻri`);
  if (!Array.isArray(s.aptMix) || s.aptMix.length !== 4 || !s.aptMix.every(v => isNum(v) && v >= 0) || !s.aptMix.some(v => v > 0)) s.aptMix = [...DEFAULT_SETTINGS.aptMix];
  else s.aptMix = [...s.aptMix] as Settings['aptMix'];
  if (!['S', 'M', 'L'].includes(s.aptSize as string)) s.aptSize = 'M';
  s.comp = { ...COMP_DEFAULT, ...(s.comp && typeof s.comp === 'object' ? s.comp : {}) };
  if (s.comp.regime !== 'orq781' && s.comp.regime !== 'orq1149') s.comp.regime = 'orq781';
  for (const k of ['priceFlat', 'priceHouse', 'priceNonres', 'flatNet', 'avgFlat', 'rentMonths', 'rentRate', 'movingPerHh', 'profitRate'] as const) if (!isNum(s.comp[k]) || s.comp[k] < 0) s.comp[k] = COMP_DEFAULT[k];
  if (typeof s.yards !== 'boolean') s.yards = true;
  if (typeof s.district !== 'string' || !/^\d{4,10}$/.test(s.district)) s.district = DEFAULT_SETTINGS.district;
  const cx = (d.context && typeof d.context === 'object' ? d.context : {}) as Partial<ContextSettings>;
  const context: ContextSettings = {
    radius: isNum(cx.radius) && cx.radius >= 100 && cx.radius <= 2000 ? cx.radius : DEFAULT_CONTEXT.radius,
    base: cx.base === 'sputnik' ? 'sputnik' : 'maket',
    loaded: cx.loaded === true,
    layers: { ...DEFAULT_CONTEXT.layers, ...(cx.layers || {}) },
  };
  let site: Site | null = null;
  if (d.site != null) {
    const r = (d.site as Site).rings;
    if (!Array.isArray(r) || !r.length || !r.every(isRing)) throw new SchemaError('site.rings notoʻgʻri');
    site = { rings: r.map(x => x.map(p => [p[0], p[1]] as LngLat)) };
  }
  const bl = Array.isArray(d.buildings) ? d.buildings : [];
  const buildings: Building[] = bl.map((b: any, i: number) => {
    if (!b || typeof b.id !== 'string' || !isRing(b.footprint) || !isNum(b.floors) || b.floors < 1) throw new SchemaError(`buildings[${i}] notoʻgʻri`);
    return { id: b.id, footprint: b.footprint.map((p: LngLat) => [p[0], p[1]] as LngLat), floors: Math.round(b.floors), nonRes: isNum(b.nonRes) ? Math.max(0, Math.min(b.floors, Math.round(b.nonRes))) : 0, use: isUse(b.use) ? b.use : 'turar', ...(b.gen && typeof b.gen.grp === 'string' ? { gen: { grp: b.gen.grp, kind: String(b.gen.kind) } } : {}), ...(isNum(b.z0) && b.z0 > 0 ? { z0: b.z0 } : {}), ...(isMat(b.mat) ? { mat: b.mat } : {}), ...(isRoof(b.roof) ? { roof: b.roof } : {}), ...(Array.isArray(b.tiers) ? { tiers: b.tiers.filter((t: any) => t && isNum(t.from) && isNum(t.inset) && t.inset !== 0 && Math.abs(t.inset) <= 12).map((t: any) => ({ from: Math.round(t.from), inset: t.inset, ...(isNum(t.edge) ? { edge: Math.round(t.edge) } : {}) })) } : {}), ...(isNum(b.parapet) && b.parapet > 0 && b.parapet <= 3 ? { parapet: b.parapet } : {}), ...(['avto', 'gorizontal', 'vertikal', 'panjara'].includes(b.shade) ? { shade: b.shade } : {}), ...(isWin(b.win) ? { win: b.win } : {}), ...(isWinPat(b.winPat) && b.winPat !== 'qator' ? { winPat: b.winPat } : {}), ...(isBalPat(b.balPat) && b.balPat !== 'har2' ? { balPat: b.balPat } : {}), ...(isBal(b.bal) && b.bal !== 'yoq' ? { bal: b.bal } : {}), ...((() => { const pe = cleanPlanEdit(b.planEdit); return pe ? { planEdit: pe } : {}; })()) };
  });
  const isLine = (v: unknown): v is LngLat[] => Array.isArray(v) && v.length >= 2 && v.every(isLL);
  const streets: Street[] = (Array.isArray(d.streets) ? d.streets : []).map((x: any, i: number) => {
    if (!x || typeof x.id !== 'string' || !isLine(x.axis)) throw new SchemaError(`streets[${i}] notoʻgʻri`);
    return { id: x.id, axis: x.axis.map((p: LngLat) => [p[0], p[1]] as LngLat), profile: typeof x.profile === 'string' ? x.profile : 'mahalla-15', ...(isNum(x.osm) ? { osm: x.osm } : {}) };
  });
  const zones: ZoneLabel[] = (Array.isArray(d.zones) ? d.zones : []).filter((z: any) => z && typeof z.id === 'string' && isLL(z.at)).map((z: any) => ({ id: z.id, at: [z.at[0], z.at[1]] as LngLat, use: isUse(z.use) ? z.use : 'turar', ...(z.gen && typeof z.gen === 'object' ? { gen: z.gen } : {}) }));
  const keep: number[] = (Array.isArray(d.keep) ? d.keep : []).filter(isNum);
  const removed: number[] = (Array.isArray(d.removed) ? d.removed : []).filter(isNum);
  const removedRoads: number[] = (Array.isArray(d.removedRoads) ? d.removedRoads : []).filter(isNum);
  const garages: Garage[] = (Array.isArray(d.garages) ? d.garages : []).filter((x: any) => x && typeof x.id === 'string' && typeof x.grp === 'string' && isRing(x.ring) && isNum(x.spaces))
    .map((x: any) => ({ id: x.id, grp: x.grp, kind: (['yer_osti', 'stilobat', 'yer_usti'].includes(x.kind) ? x.kind : 'yer_osti'), ring: x.ring.map((p: LngLat) => [p[0], p[1]] as LngLat), levels: isNum(x.levels) ? x.levels : 1, spaces: Math.max(0, Math.round(x.spaces)) }));
  const parcels: Parcel[] = (Array.isArray(d.parcels) ? d.parcels : []).filter((x: any) => x && typeof x.id === 'string' && typeof x.block === 'string' && Array.isArray(x.rings) && x.rings.length && x.rings.every(isRing))
    .map((x: any) => ({ id: x.id, block: x.block, rings: x.rings.map((r: LngLat[]) => r.map(p => [p[0], p[1]] as LngLat)), use: isUse(x.use) ? x.use : 'turar' }));
  const PK = ['mtm', 'maktab', 'poliklinika', 'dorixona', 'savdo', 'sport', 'mahalla'];
  const pois: ManualPoi[] = (Array.isArray(d.pois) ? d.pois : []).filter((x: any) => x && typeof x.id === 'string' && PK.includes(x.kind) && isLL(x.at))
    .map((x: any) => ({ id: x.id, kind: x.kind, at: [x.at[0], x.at[1]] as LngLat, ...(typeof x.name === 'string' && x.name ? { name: x.name.slice(0, 120) } : {}) }));
  const v3 = (v: unknown): v is [number, number, number] => Array.isArray(v) && v.length === 3 && v.every(isNum);
  const views: SavedView[] = (Array.isArray(d.views) ? d.views : []).filter((x: any) => x && typeof x.id === 'string' && v3(x.pos) && v3(x.target) && ['plan', 'axo', 'persp'].includes(x.mode))
    .map((x: any) => ({ id: x.id, name: String(x.name ?? 'Koʻrinish').slice(0, 60), mode: x.mode, pos: [...x.pos] as [number, number, number], target: [...x.target] as [number, number, number], zoom: isNum(x.zoom) && x.zoom > 0 ? x.zoom : 1, lens: isNum(x.lens) && x.lens >= 10 && x.lens <= 200 ? x.lens : 35, twoPoint: x.twoPoint === true, frame: typeof x.frame === 'string' ? x.frame : 'erkin' }));
  return {
    schema: SCHEMA, id: d.id, name: d.name,
    created: typeof d.created === 'string' ? d.created : new Date().toISOString(),
    updated: typeof d.updated === 'string' ? d.updated : new Date().toISOString(),
    origin: [d.origin[0], d.origin[1]], settings: s, context, site, buildings, streets, zones, keep, parcels, garages, pois, views, ...(removed.length ? { removed } : {}), ...(removedRoads.length ? { removedRoads } : {}),
  };
}

/**
 * Loyiha hujjati — yagona haqiqat manbai.
 * Hujjatda faqat inson qarorlari saqlanadi (chegara, koʻcha, bino…). Maydon, aholi, zichlik va boshqalar
 * core/derive.ts da har safar shu hujjatdan hisoblanadi va hech qachon hujjatga yozilmaydi.
 */
export const SCHEMA = 1;

/** [uzunlik, kenglik] — WGS84, GeoJSON tartibida */
export type LngLat = [number, number];
/** Ochiq halqa: oxirgi nuqta birinchisini takrorlamaydi */
export type Ring = LngLat[];

export interface Site {
  /** rings[0] — tashqi chegara, qolganlari — teshiklar (anklav) */
  rings: Ring[];
}

export type Use = 'turar' | 'aralash' | 'ijtimoiy' | 'savdo' | 'yashil' | 'texnik';

export interface Building {
  id: string;
  footprint: Ring;
  floors: number;
  /** pastki noturar qavatlar soni (doʻkon, xizmat) */
  nonRes: number;
  use: Use;
}

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
}

export interface Project {
  schema: number;
  id: string;
  name: string;
  created: string;
  updated: string;
  /** sahna markazi — barcha mahalliy koordinatalar shundan hisoblanadi */
  origin: LngLat;
  settings: Settings;
  site: Site | null;
  buildings: Building[];
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
    settings: { ...DEFAULT_SETTINGS },
    site: null, buildings: [],
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
  // kelajakdagi migratsiyalar shu yerda: if (d.schema === 1) { …; d.schema = 2 }
  if (typeof d.id !== 'string' || !d.id) throw new SchemaError('id yoʻq');
  if (typeof d.name !== 'string') throw new SchemaError('name yoʻq');
  if (!isLL(d.origin)) throw new SchemaError('origin notoʻgʻri');
  const s = { ...DEFAULT_SETTINGS, ...(d.settings as object || {}) } as Settings;
  for (const k of ['seismic', 'm2PerPerson', 'netToGross', 'floorHeight'] as const) if (!isNum(s[k]) || s[k] <= 0) throw new SchemaError(`settings.${k} notoʻgʻri`);
  let site: Site | null = null;
  if (d.site != null) {
    const r = (d.site as Site).rings;
    if (!Array.isArray(r) || !r.length || !r.every(isRing)) throw new SchemaError('site.rings notoʻgʻri');
    site = { rings: r.map(x => x.map(p => [p[0], p[1]] as LngLat)) };
  }
  const bl = Array.isArray(d.buildings) ? d.buildings : [];
  const buildings: Building[] = bl.map((b: any, i: number) => {
    if (!b || typeof b.id !== 'string' || !isRing(b.footprint) || !isNum(b.floors) || b.floors < 1) throw new SchemaError(`buildings[${i}] notoʻgʻri`);
    return { id: b.id, footprint: b.footprint.map((p: LngLat) => [p[0], p[1]] as LngLat), floors: Math.round(b.floors), nonRes: isNum(b.nonRes) ? Math.max(0, Math.min(b.floors, Math.round(b.nonRes))) : 0, use: (b.use || 'turar') as Use };
  });
  return {
    schema: SCHEMA, id: d.id, name: d.name,
    created: typeof d.created === 'string' ? d.created : new Date().toISOString(),
    updated: typeof d.updated === 'string' ? d.updated : new Date().toISOString(),
    origin: [d.origin[0], d.origin[1]], settings: s, site, buildings,
  };
}

/**
 * E2 (11.11, foydalanuvchi fikri: «yaqinda bogʻcha yoʻq» deyilgan, aslida xususiy bogʻcha bor — OSM da yoʻq):
 * foydalanuvchi qoʻshgan obyektlar va xizmatlar xulosasi. Xulosada «yoʻq» soʻzi ishlatilmaydi — manba har doim yoziladi.
 * «Meʼyoriy hisobga kiritish» (sukut — oʻchiq): oʻchiq obyekt xaritada va xulosada koʻrinadi, lekin qamrov holatiga (yetadi / uzoq) kirmaydi.
 */
import type { LngLat } from '../core/doc';
import type { Svc } from '../core/services';

export type Own = 'davlat' | 'xususiy';
export interface AddedObj { id: string; kind: Svc; at: LngLat; name?: string; own?: Own; cap?: number; norm?: boolean }

/** Ikki nuqta orasidagi masofa, m (kichik masofalar uchun yetarli) */
export function distM(a: LngLat, b: LngLat): number {
  const k = Math.PI / 180, x = (b[0] - a[0]) * k * Math.cos((a[1] + b[1]) / 2 * k), y = (b[1] - a[1]) * k;
  return Math.hypot(x, y) * 6371000;
}

export type SvcSt = 'ok' | 'far' | 'own' | 'none';
/** Xulosa qatori: OSM va qoʻshilgan eng yaqin obyekt, meʼyoriy radius boʻyicha holat */
export interface SvcRow { kind: Svc; osm: number | null; own: number | null; ownNorm: boolean; st: SvcSt; r: number }

/**
 * st: ok — meʼyoriy radius ichida (OSM yoki hisobga kiritilgan qoʻshilgan obyekt); far — topildi, lekin radiusdan uzoq;
 * own — faqat hisobga kiritilmagan qoʻshilgan obyekt bor; none — OSM maʼlumotida topilmadi.
 */
export function svcRows(osm: { kind: Svc; at: LngLat }[], added: AddedObj[], c: LngLat, kinds: Svc[], radius: (k: Svc) => number): SvcRow[] {
  return kinds.map(kind => {
    const near = (xs: { at: LngLat }[]) => xs.reduce<number | null>((m, x) => { const d = distM(c, x.at); return m == null || d < m ? d : m; }, null);
    const o = near(osm.filter(x => x.kind === kind)), mine = added.filter(x => x.kind === kind);
    const own = near(mine), ownN = near(mine.filter(x => x.norm)), r = radius(kind);
    const best = [o, ownN].filter((v): v is number => v != null);
    const st: SvcSt = best.length ? (Math.min(...best) <= r ? 'ok' : 'far') : own != null ? 'own' : 'none';
    return { kind, osm: o, own, ownNorm: ownN != null, st, r };
  });
}

/** Meʼyoriy hisob uchun obyektlar: OSM + «meʼyoriy hisobga kiritilgan» qoʻshilganlar */
export function normPois<T extends { kind: Svc; at: LngLat }>(osm: T[], added: AddedObj[]): { kind: Svc; at: LngLat }[] {
  return [...osm, ...added.filter(x => x.norm).map(x => ({ kind: x.kind, at: x.at }))];
}

export const newId = (): string => 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

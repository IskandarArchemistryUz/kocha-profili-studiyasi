/**
 * Ijtimoiy va savdo obyektlari (OSM): bogʻcha, maktab, poliklinika, dorixona, kundalik savdo, sport, mahalla markazi;
 * jamoat transporti bekatlari (avtobus/trolleybus/tramvay) va metro kirishlari.
 * Asosiy kontekstdan alohida soʻrov va kesh (poi1:) — xizmat radiuslari 1500 m gacha, kontekst esa 300–1000 m.
 * OSM Toshkentda toʻliq emas (ayniqsa bogʻchalar): natija «kamida shuncha» deb oʻqiladi.
 */
import type { LngLat } from '../core/doc';
import type { Svc } from '../core/services';
import { bboxAround } from './osm';
import { overpass } from './load';

export interface Poi { id: string; kind: Svc; at: LngLat; name?: string }
/** roads — xizmat radiuslari uchun piyoda tarmogʻi (kontekstdan kengroq, 2 km): [cls, nuqtalar] */
export interface PoiBundle { center: LngLat; radius: number; fetched: string; pois: Poi[]; roads: { cls: string; pts: LngLat[]; f?: string }[]; attr?: { at: LngLat; w: number }[] }

export const POI_R = 2000;
export const poiKey = (c: LngLat) => `poi4:${c[0].toFixed(3)},${c[1].toFixed(3)}`;

const SHOP = /^(supermarket|convenience|greengrocer|bakery|butcher|general|grocery|department_store|mall)$/;
export function classify(t: Record<string, string>): Svc | null {
  const a = t.amenity, b = t.building;
  if (a === 'kindergarten' || b === 'kindergarten') return 'mtm';
  if (a === 'school' || b === 'school') return 'maktab';
  if (a === 'clinic' || a === 'hospital' || b === 'hospital' || t.healthcare === 'clinic' || t.healthcare === 'hospital') return 'poliklinika';
  if (a === 'pharmacy' || t.healthcare === 'pharmacy') return 'dorixona';
  if (a === 'marketplace' || (t.shop && SHOP.test(t.shop))) return 'savdo';
  if (t.leisure && /^(sports_centre|fitness_centre|stadium|sports_hall)$/.test(t.leisure)) return 'sport';
  if (a === 'community_centre' || a === 'townhall') return 'mahalla';
  // jamoat transporti: metro kirishi (yoki kirishi chizilmagan stansiya), yer usti bekatlari
  if (t.railway === 'subway_entrance' || (t.railway === 'station' && (t.station === 'subway' || t.subway === 'yes'))) return 'metro';
  if (t.highway === 'bus_stop' || t.railway === 'tram_stop' || (t.public_transport === 'platform' && (t.bus === 'yes' || t.trolleybus === 'yes' || t.tram === 'yes'))) return 'bekat';
  return null;
}

type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string>; geometry?: ({ lat: number; lon: number } | null)[] };
export function parsePoi(j: { elements?: El[] }): Poi[] {
  const out: Poi[] = [];
  for (const e of j.elements || []) {
    const t = e.tags || {}; if (t.highway && t.highway !== 'bus_stop' && !t.amenity && !t.shop) continue;   // yoʻllar (out geom) — POI emas
    const k = classify(t); if (!k) continue;
    const p = e.type === 'node' ? (e.lat != null ? { lat: e.lat, lon: e.lon! } : null) : e.center; if (!p) continue;
    out.push({ id: `${e.type[0]}${e.id}`, kind: k, at: [p.lon, p.lat], ...(t.name ? { name: t.name } : {}) });
  }
  return out;
}

/** Odamlarni oʻziga tortadigan joylar (13.11, oqim modeli uchun): savdo markazi, bozor, ovqatlanish, oliygoh, kino/teatr — vazn bilan */
export function attrWeight(t: Record<string, string>): number {
  if (t.highway) return 0;
  if (t.shop === 'mall' || t.shop === 'department_store') return 12;
  if (t.amenity === 'marketplace') return 8;
  if (t.amenity === 'university' || t.amenity === 'college') return 6;
  if (t.amenity === 'cinema' || t.amenity === 'theatre') return 3;
  if (t.amenity === 'food_court') return 3;
  if (t.amenity === 'restaurant' || t.amenity === 'cafe' || t.amenity === 'fast_food') return 1.5;
  return 0;
}
export function parseAttr(j: { elements?: El[] }): { at: LngLat; w: number }[] {
  const out: { at: LngLat; w: number }[] = [];
  for (const e of j.elements || []) {
    const w = attrWeight(e.tags || {}); if (!w) continue;
    const p = e.type === 'node' ? (e.lat != null ? { lat: e.lat, lon: e.lon! } : null) : e.center; if (!p) continue;
    out.push({ at: [Math.round(p.lon * 1e6) / 1e6, Math.round(p.lat * 1e6) / 1e6], w });
  }
  return out;
}
export function parseRoads(j: { elements?: El[] }): PoiBundle['roads'] {
  const r = (v: number) => Math.round(v * 1e6) / 1e6;
  return (j.elements || []).filter(e => e.type === 'way' && e.tags?.highway && e.geometry && e.geometry.length >= 2)
    .map(e => { const t = e.tags!, f = roadFlags(t); return { cls: t.highway, pts: e.geometry!.filter((g): g is { lat: number; lon: number } => !!g).map(g => [r(g.lon), r(g.lat)] as LngLat), ...(f ? { f } : {}) }; });
}
/** Piyoda uchun muhim teglar (13.11) qisqa bayroqlarda: b — koʻprik/estakada/tunnel, n — piyodaga taqiqlangan (foot=no, access=no), s — trotuar alohida chizilgan yoki yoʻq */
export function roadFlags(t: Record<string, string>): string {
  let f = '';
  if ((t.bridge && t.bridge !== 'no') || (t.tunnel && t.tunnel !== 'no') || Number(t.layer) >= 1) f += 'b';
  if (t.foot === 'no' || t.foot === 'use_sidepath' || ((t.access === 'no' || t.access === 'private') && t.foot !== 'yes' && t.foot !== 'designated')) f += 'n';
  if (/^(separate|no|none)$/.test(t.sidewalk ?? t['sidewalk:both'] ?? '')) f += 's';
  return f;
}

export async function fetchPoi(center: LngLat, f: typeof fetch = fetch.bind(globalThis)): Promise<PoiBundle> {
  const bb = bboxAround(center, POI_R).map(v => v.toFixed(6)).join(',');
  const q = `[out:json][timeout:90][bbox:${bb}];(
  nwr["amenity"~"^(school|kindergarten|clinic|hospital|pharmacy|marketplace|community_centre|townhall)$"];
  nwr["healthcare"~"^(clinic|hospital|pharmacy)$"];
  nwr["shop"~"^(supermarket|convenience|greengrocer|bakery|butcher|general|grocery|department_store|mall)$"];
  nwr["leisure"~"^(sports_centre|fitness_centre|stadium|sports_hall)$"];
  way["building"~"^(school|kindergarten|hospital)$"];
  node["highway"="bus_stop"];
  node["railway"~"^(tram_stop|subway_entrance)$"];
  nwr["public_transport"="platform"]["bus"="yes"];
  nwr["public_transport"="platform"]["trolleybus"="yes"];
  nwr["railway"="station"]["station"="subway"];
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|university|college|cinema|theatre)$"];
);out center qt;
way["highway"]["area"!="yes"]["highway"!~"^(motorway|motorway_link|construction|proposed|raceway|bus_guideway)$"];out geom qt;`;
  const j = await overpass(q, f, () => {}) as { elements?: El[] };
  return { center, radius: POI_R, fetched: new Date().toISOString(), pois: parsePoi(j), roads: parseRoads(j), attr: parseAttr(j) };
}

/**
 * Joyshunos — joy pasporti hisoblari (sof funksiyalar, tarmoqsiz; birlik testlari bilan tekshiriladi).
 * Masofalar — toʻgʻri chiziq (gaversinus); piyoda tarmogʻi boʻylab hisob — keyingi bosqichda (Piyoda yetish qatlami).
 */
import type { LngLat } from '../core/doc';
import type { TerrainGrid } from '../context/tiles';
import type { Poi } from '../context/poi';
import type { Svc } from '../core/services';
import type { Station } from '../core/wind';

/** Ikki nuqta orasidagi masofa, m (gaversinus) */
export function distM(a: LngLat, b: LngLat): number {
  const R = 6_371_000, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Doira (koʻpburchak) — xaritada chizish uchun */
export function circleRing(c: LngLat, r: number, n = 96): LngLat[] {
  const kx = 111_320 * Math.cos(c[1] * Math.PI / 180), ky = 111_132, out: LngLat[] = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * 2 * Math.PI; out.push([c[0] + (r * Math.cos(a)) / kx, c[1] + (r * Math.sin(a)) / ky]); }
  return out;
}

/** Piyoda vaqti (toʻgʻri chiziq, 5 km/soat ≈ 83 m/daq) */
export const walkMin = (m: number) => Math.max(1, Math.round(m / 83));

/* ---------------- relyef va nishab ---------------- */
export interface TerrainStats { min: number; max: number; center: number; slopeMean: number; slopeP90: number; slopeMax: number; downhill: number | null }

/** Har katak nishabi, % (markaziy ayirmalar) */
export function slopeGrid(g: TerrainGrid): Float32Array {
  const { n, step, h } = g, s = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(n - 1, j + 1);
    const dx = (h[j * n + i1] - h[j * n + i0]) / ((i1 - i0) * step), dy = (h[j1 * n + i] - h[j0 * n + i]) / ((j1 - j0) * step);
    s[j * n + i] = Math.hypot(dx, dy) * 100;
  }
  return s;
}

/** Doira ichidagi relyef koʻrsatkichlari; downhill — umumiy pasayish yoʻnalishi (azimut, °, 0 = shimol) */
export function terrainStats(g: TerrainGrid, radius: number): TerrainStats {
  const { n, step, h } = g, sl = slopeGrid(g), R2 = radius * radius, vals: number[] = [];
  let min = Infinity, max = -Infinity, gx = 0, gy = 0;
  const c = h[((n - 1) >> 1) * n + ((n - 1) >> 1)];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -g.radius + i * step, y = -g.radius + j * step; if (x * x + y * y > R2) continue;
    const v = h[j * n + i]; if (v < min) min = v; if (v > max) max = v;
    vals.push(sl[j * n + i]);
    // chiziqli trend (balandlik ~ x, y) — umumiy qiyalik
    gx += x * (v - c); gy += y * (v - c);
  }
  vals.sort((a, b) => a - b);
  const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  const p90 = vals[Math.floor(vals.length * 0.9)] ?? 0;
  // pasayish — gradientga teskari; y — shimolga, x — sharqqa
  const mag = Math.hypot(gx, gy), downhill = mag > 1e-6 && max - min >= 1 ? (Math.atan2(-gx, -gy) * 180 / Math.PI + 360) % 360 : null;
  return { min, max, center: c, slopeMean: mean, slopeP90: p90, slopeMax: vals[vals.length - 1] ?? 0, downhill };
}

const DIR8 = ['shimol', 'shimoli-sharq', 'sharq', 'janubi-sharq', 'janub', 'janubi-gʻarb', 'gʻarb', 'shimoli-gʻarb'];
/** Azimut → 8 yoʻnalish nomi */
export const dir8 = (deg: number) => DIR8[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

/** Nishab sinfi (shaharsozlikda odatiy chegaralar: ≤ 2 % tekis, 2–5 % qulay, 5–8 % sezilarli, > 8 % qiya) */
export const SLOPE_BINS: [number, string, string][] = [[2, '#e9efe1', 'tekis ≤ 2 %'], [5, '#f3dfa8', '2–5 %'], [8, '#eaa56b', '5–8 %'], [Infinity, '#c8553d', '> 8 %']];
export const slopeColor = (s: number) => SLOPE_BINS.find(([t]) => s <= t)![1];

/* ---------------- xizmatlar ---------------- */
export interface SvcCount { kind: Svc; n: number; nearest: number | null }

/** Doira ichidagi obyektlar soni va eng yaqini (doira tashqarisidagi eng yaqini ham — meʼyor tekshiruvi uchun) */
export function countPoi(pois: Poi[], c: LngLat, radius: number, kinds: Svc[]): SvcCount[] {
  return kinds.map(kind => {
    let n = 0, nearest: number | null = null;
    for (const p of pois) { if (p.kind !== kind) continue; const d = distM(c, p.at); if (d <= radius) n++; if (nearest == null || d < nearest) nearest = d; }
    return { kind, n, nearest };
  });
}

/* ---------------- raqobatchilar ---------------- */
export interface Cat { id: string; name: string; q: string[] }
/** OSM teglari (Overpass filtrlari) */
export const CATS: Cat[] = [
  { id: 'cafe', name: 'Qahvaxona', q: ['["amenity"="cafe"]'] },
  { id: 'rest', name: 'Restoran, fastfud', q: ['["amenity"~"^(restaurant|fast_food)$"]'] },
  { id: 'food', name: 'Oziq-ovqat doʻkoni', q: ['["shop"~"^(supermarket|convenience|grocery|greengrocer|bakery|butcher)$"]'] },
  { id: 'pharm', name: 'Dorixona', q: ['["amenity"="pharmacy"]'] },
  { id: 'beauty', name: 'Sartaroshxona, goʻzallik saloni', q: ['["shop"~"^(hairdresser|beauty)$"]'] },
  { id: 'cloth', name: 'Kiyim-poyabzal', q: ['["shop"~"^(clothes|shoes)$"]'] },
  { id: 'fit', name: 'Fitnes, sport zali', q: ['["leisure"~"^(fitness_centre|sports_centre)$"]'] },
  { id: 'bank', name: 'Bank', q: ['["amenity"="bank"]'] },
];

export function catQuery(cat: Cat, c: LngLat, r: number): string {
  const a = `(around:${Math.round(r)},${c[1].toFixed(6)},${c[0].toFixed(6)})`;
  return `[out:json][timeout:40];(${cat.q.map(f => `nwr${f}${a};`).join('')});out center qt;`;
}

export interface Comp { id: string; at: LngLat; name?: string; d: number }
type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
export function parseComp(j: { elements?: El[] }, c: LngLat): Comp[] {
  const out: Comp[] = [];
  for (const e of j.elements || []) {
    const p = e.type === 'node' ? (e.lat != null ? { lat: e.lat, lon: e.lon! } : null) : e.center; if (!p) continue;
    const at: LngLat = [p.lon, p.lat];
    out.push({ id: `${e.type[0]}${e.id}`, at, ...(e.tags?.name ? { name: e.tags.name } : {}), d: distM(c, at) });
  }
  return out.sort((a, b) => a.d - b.d);
}

/* ---------------- shamol ---------------- */
export interface WindSum { k: number; share: number; mean: number; calm: number; petals: number[]; rose: number[][] }
/** 16 sektor ulushi (barcha tezliklar), ustun yoʻnalish, oʻrtacha tezlik, tinch payt ulushi */
export function windSummary(s: Station): WindSum {
  const petals = s.rose.map(r => r.reduce((a, b) => a + b, 0));
  let k = 0; petals.forEach((v, i) => { if (v > petals[k]) k = i; });
  return { k, share: petals[k], mean: s.mean, calm: s.calm, petals, rose: s.rose };
}

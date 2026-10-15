/**
 * Manzil qidiruvi: Nominatim (OpenStreetMap). Koordinata yozilsa («41.311, 69.279») — tarmoqsiz.
 * Nominatim qoidasi: soniyasiga koʻpi bilan 1 soʻrov — shuning uchun faqat Enter/tugma bilan.
 */
import type { LngLat } from '../core/doc';

export interface Place { name: string; detail: string; at: LngLat }

/** «41.311, 69.279» yoki «69.279 41.311» → [lng, lat]; Oʻzbekiston uchun kenglik < uzunlik */
export function parseCoords(q: string): LngLat | null {
  const m = q.trim().match(/^(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!m) return null;
  const a = parseFloat(m[1].replace(',', '.')), b = parseFloat(m[2].replace(',', '.'));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  // birinchisi kenglik (Google/Yandex tartibi). Markaziy Osiyo uchun: «69.28 41.31» koʻrinishi ham tushuniladi
  const swap = Math.abs(a) > 90 || (a >= 50 && a <= 90 && b >= 35 && b <= 47);
  const [lat, lng] = swap ? [b, a] : [a, b];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lng, lat];
}

export async function geocode(q: string, near: LngLat, f: typeof fetch = fetch.bind(globalThis)): Promise<Place[]> {
  const c = parseCoords(q);
  if (c) return [{ name: `${c[1].toFixed(5)}, ${c[0].toFixed(5)}`, detail: 'Koordinata', at: c }];
  const u = new URL('https://nominatim.openstreetmap.org/search');
  u.search = new URLSearchParams({ q, format: 'jsonv2', limit: '7', 'accept-language': 'uz,ru,en', viewbox: `${near[0] - 1.5},${near[1] + 1.2},${near[0] + 1.5},${near[1] - 1.2}`, bounded: '0' }).toString();
  const r = await f(u.toString());
  if (!r.ok) throw new Error(`Qidiruv xizmati javob bermadi (${r.status})`);
  const j = await r.json() as { lat: string; lon: string; name?: string; display_name: string; type?: string }[];
  return j.map(x => {
    const parts = x.display_name.split(',').map(s => s.trim());
    return { name: x.name || parts[0], detail: parts.slice(1, 4).join(', '), at: [Number(x.lon), Number(x.lat)] as LngLat };
  }).filter(p => Number.isFinite(p.at[0]) && Number.isFinite(p.at[1]));
}

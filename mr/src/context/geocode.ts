/**
 * Manzil qidiruvi: Nominatim (OpenStreetMap). Koordinata yozilsa («41.311, 69.279») — tarmoqsiz.
 * Nominatim qoidasi: soniyasiga koʻpi bilan 1 soʻrov — shuning uchun faqat Enter/tugma bilan.
 */
import type { LngLat } from '../core/doc';
import { getLang } from '../i18n';
/** Natija nomlari foydalanuvchi tilida (oʻzbekchada — uz, ru, en) */
const acceptLang = () => { const l = getLang(); return l === 'uz' ? 'uz,ru,en' : `${l},en`; };

/** bbox — [gʻarb, janub, sharq, shimol]; davlat, viloyat, shahar uchun katta (dunyo xaritasida koʻrsatiladi) */
export interface Place { name: string; detail: string; at: LngLat; bbox?: [number, number, number, number] }
/** Joy qutisining kattaroq tomoni (km, taxminiy) */
export function bboxKm(b: [number, number, number, number]): number {
  const lat = (b[1] + b[3]) / 2, kx = 111.32 * Math.cos(lat * Math.PI / 180);
  return Math.max(Math.abs(b[2] - b[0]) * kx, Math.abs(b[3] - b[1]) * 110.57);
}

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
  u.search = new URLSearchParams({ q, format: 'jsonv2', limit: '7', 'accept-language': acceptLang(), viewbox: `${near[0] - 1.5},${near[1] + 1.2},${near[0] + 1.5},${near[1] - 1.2}`, bounded: '0' }).toString();
  const r = await f(u.toString());
  if (!r.ok) throw new Error(`Qidiruv xizmati javob bermadi (${r.status})`);
  const j = await r.json() as { lat: string; lon: string; name?: string; display_name: string; type?: string; boundingbox?: string[] }[];
  return j.map(x => {
    const parts = x.display_name.split(',').map(s => s.trim()), bb = (x.boundingbox ?? []).map(Number);   // [janub, shimol, gʻarb, sharq]
    const bbox = bb.length === 4 && bb.every(Number.isFinite) ? [bb[2], bb[0], bb[3], bb[1]] as [number, number, number, number] : undefined;
    return { name: x.name || parts[0], detail: parts.slice(1, 4).join(', '), at: [Number(x.lon), Number(x.lat)] as LngLat, bbox };
  }).filter(p => Number.isFinite(p.at[0]) && Number.isFinite(p.at[1]));
}

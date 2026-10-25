/**
 * Shamol manbasi joyga qarab (34-band, 25.10.2026): yaqin (≤ 50 km) EPW stansiyasi boʻlsa — u (Oʻzbekiston, TMYx);
 * aks holda — ERA5 (Copernicus, 0,25° katak, 2015–2024) oʻz serverimiz orqali (api.archemistry.uz/data/wind).
 * ERA5 — reanaliz: 10 m dagi shamol katak boʻyicha oʻrtacha, stansiyadagidan silliqroq (tinch soatlar kamroq, choʻqqilar pastroq).
 * Copernicus navbati band boʻlsa server 202 qaytaradi — ilova keyinroq qayta soʻraydi.
 */
import { API_BASE } from '../account/config';
import { nearestStation, WIND_MAX_KM, type Climate, type Station } from './wind';

export const ERA5_ATTR = 'Contains modified Copernicus Climate Change Service information 2026 (ERA5)';
export type WindAt =
  | { kind: 'ok'; s: Station; km: number; src: 'epw' | 'era5' }
  | { kind: 'pending' }
  | { kind: 'none'; near: Station; km: number; why: 'off' | 'err' };

const memo = new Map<string, Station>();
const snap = (v: number) => Math.round(v * 4) / 4;
const kmTo = (lon: number, lat: number, s: { lon: number; lat: number }) => Math.hypot((s.lon - lon) * 111.32 * Math.cos(lat * Math.PI / 180), (s.lat - lat) * 111.13);

/** Joy uchun shamol: yaqin EPW → ERA5 → yoʻq */
export async function windAt(c: Climate, lon: number, lat: number, f: typeof fetch = fetch, base = API_BASE): Promise<WindAt> {
  const n = nearestStation(c, lon, lat);
  if (n.km <= WIND_MAX_KM) return { kind: 'ok', s: n.s, km: n.km, src: 'epw' };
  const key = `${snap(lat)},${snap(lon)}`, hit = memo.get(key);
  if (hit) return { kind: 'ok', s: hit, km: kmTo(lon, lat, hit), src: 'era5' };
  try {
    const r = await f(`${base}/data/wind?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
    if (r.status === 202) return { kind: 'pending' };
    if (r.status === 503) return { kind: 'none', near: n.s, km: n.km, why: 'off' };
    if (!r.ok) return { kind: 'none', near: n.s, km: n.km, why: 'err' };
    const j = await r.json() as { station?: Station };
    const s = j.station; if (!s || !Array.isArray(s.rose) || s.rose.length !== 16) return { kind: 'none', near: n.s, km: n.km, why: 'err' };
    memo.set(key, s);
    return { kind: 'ok', s, km: kmTo(lon, lat, s), src: 'era5' };
  } catch { return { kind: 'none', near: n.s, km: n.km, why: 'err' }; }
}
/** Manba satri: «Manba: …» */
export const windSrcLine = (src: 'epw' | 'era5'): string => src === 'era5' ? 'Manba: ERA5 (Copernicus) — 0,25° katak, soatlik 2015–2024; reanaliz, stansiya oʻlchovi emas.' : 'Manba: EPW TMYx 2011–2025 (climate.onebuilding.org).';

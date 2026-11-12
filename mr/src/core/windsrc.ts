/**
 * Shamol manbasi joyga qarab (34-band, 25.10.2026): yaqin (≤ 50 km) EPW stansiyasi boʻlsa — u (Oʻzbekiston, TMYx);
 * aks holda — ERA5 (Copernicus, 0,25° katak, 2015–2024) oʻz serverimiz orqali (api.archemistry.uz/data/wind).
 * ERA5 — reanaliz: 10 m dagi shamol katak boʻyicha oʻrtacha, stansiyadagidan silliqroq (tinch soatlar kamroq, choʻqqilar pastroq).
 * Copernicus navbati band boʻlsa server 202 qaytaradi — ilova keyinroq qayta soʻraydi.
 * 12.11.2026: serverda ERA5 kaliti boʻlmasa yoki Copernicus yiqilsa — NASA POWER (kalitsiz, ochiq, 0,5° katak, MERRA-2 asosida);
 * javobdagi `source` qaysi manba ekanini aytadi.
 */
import { API_BASE } from '../account/config';
import { nearestStation, WIND_MAX_KM, type Climate, type Station } from './wind';

/** TMYx mualliflari soʻragan iqtibos (D. Crawley xati, 27.10.2026) — tarjima qilinmaydi */
export const TMYX_ATTR = 'Lawrie, Linda K, Drury B Crawley. 2026. Development of Global Typical Meteorological Years (TMYx). https://climate.onebuilding.org';
export const ERA5_ATTR = 'Contains modified Copernicus Climate Change Service information 2026 (ERA5)';
/** NASA soʻragan iqtibos (power.larc.nasa.gov/docs/referencing) — tarjima qilinmaydi */
export const POWER_ATTR = 'Data obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program';
/** epw — yaqin TMYx stansiyasi; era5 — Copernicus; power — NASA POWER */
export type WindSrc = 'epw' | 'era5' | 'power';
export type GlobalSrc = Exclude<WindSrc, 'epw'>;
export const srcAttr = (src: WindSrc): string => src === 'era5' ? ERA5_ATTR : src === 'power' ? POWER_ATTR : TMYX_ATTR;
export const srcShort = (src: WindSrc): string => src === 'era5' ? 'ERA5' : src === 'power' ? 'NASA POWER' : 'EPW';
export type WindAt =
  | { kind: 'ok'; s: Station; km: number; src: WindSrc }
  | { kind: 'pending'; src: GlobalSrc }
  | { kind: 'none'; near: Station; km: number; why: 'off' | 'err' };

const memo = new Map<string, { s: Station; src: GlobalSrc }>();
const snap = (v: number) => Math.round(v * 4) / 4;
const kmTo = (lon: number, lat: number, s: { lon: number; lat: number }) => Math.hypot((s.lon - lon) * 111.32 * Math.cos(lat * Math.PI / 180), (s.lat - lat) * 111.13);

/** Joy uchun shamol: yaqin EPW → ERA5 / NASA POWER (server tanlaydi) → yoʻq */
export async function windAt(c: Climate, lon: number, lat: number, f: typeof fetch = fetch, base = API_BASE): Promise<WindAt> {
  const n = nearestStation(c, lon, lat);
  if (n.km <= WIND_MAX_KM) return { kind: 'ok', s: n.s, km: n.km, src: 'epw' };
  const key = `${snap(lat)},${snap(lon)}`, hit = memo.get(key);
  if (hit) return { kind: 'ok', s: hit.s, km: kmTo(lon, lat, hit.s), src: hit.src };
  try {
    const r = await f(`${base}/data/wind?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
    if (r.status === 202) { let src: GlobalSrc = 'era5'; try { if ((await r.json() as { source?: string }).source === 'power') src = 'power'; } catch { /* boʻsh javob */ } return { kind: 'pending', src }; }
    if (r.status === 503) return { kind: 'none', near: n.s, km: n.km, why: 'off' };
    if (!r.ok) return { kind: 'none', near: n.s, km: n.km, why: 'err' };
    const j = await r.json() as { station?: Station; source?: string };
    const s = j.station; if (!s || !Array.isArray(s.rose) || s.rose.length !== 16) return { kind: 'none', near: n.s, km: n.km, why: 'err' };
    const src: GlobalSrc = j.source === 'power' ? 'power' : 'era5';
    memo.set(key, { s, src });
    return { kind: 'ok', s, km: kmTo(lon, lat, s), src };
  } catch { return { kind: 'none', near: n.s, km: n.km, why: 'err' }; }
}
/** Manba satri: «Manba: …» */
export const windSrcLine = (src: WindSrc): string => src === 'era5' ? 'Manba: ERA5 (Copernicus) — 0,25° katak, soatlik 2015–2024; reanaliz, stansiya oʻlchovi emas.' : src === 'power' ? 'Manba: NASA POWER (MERRA-2) — 0,5° katak, soatlik 2015–2024; reanaliz, stansiya oʻlchovi emas.' : 'Manba: EPW TMYx 2011–2025.';

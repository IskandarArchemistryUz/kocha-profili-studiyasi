/**
 * Esri (ArcGIS Location Platform) ochiq kaliti — sunʼiy yoʻldosh fon xaritasi uchun.
 * Kalit repoga yozilmaydi: GitHub sirlaridagi ARCGIS_API_KEY deploy vaqtida serverdagi .env ga tushadi,
 * ilova uni ish vaqtida api.archemistry.uz/config/maps dan oladi. Kalit faqat Basemaps ruxsatiga ega va
 * referrer (archemistry.uz, www.archemistry.uz) bilan cheklangan. Kalit boʻlmasa — eski kalitsiz manzil (zaxira).
 * Worker ham shu modulni ishlatadi (sessionStorage yoʻq — try/catch).
 */
import { API_BASE } from '../account/config';

const LEGACY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';
const KEYED = 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile';
/** Esri talab qilgan manba matni (World Imagery) */
export const ESRI_IMAGERY_ATTR = 'Esri, Maxar, Earthstar Geographics, and the GIS User Community';

let K: string | null = null, P: Promise<string | null> | null = null;
export const esriKey = (): string | null => K;
/** Kalitni bir marta oladi (3 s kutadi; olinmasa — kalitsiz) */
export function initEsriKey(f: typeof fetch = fetch, base = API_BASE): Promise<string | null> {
  if (P) return P;
  P = (async () => {
    try { const s = sessionStorage.getItem('kps_esri'); if (s !== null) return (K = s || null); } catch { /* worker yoki yopiq xotira */ }
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 3000);
    try {
      const r = await f(`${base}/config/maps`, { signal: ctl.signal });
      const j = r.ok ? await r.json() as { arcgis?: string | null } : null;
      K = typeof j?.arcgis === 'string' && /^[A-Za-z0-9._-]{20,}$/.test(j.arcgis) ? j.arcgis : null;
      try { sessionStorage.setItem('kps_esri', K ?? ''); } catch { /* */ }
    } catch { K = null; } finally { clearTimeout(t); }
    return K;
  })();
  return P;
}
/** Bitta plitka manzili */
export const imageryTile = (z: number, x: number, y: number): string => K ? `${KEYED}/${z}/${y}/${x}?token=${encodeURIComponent(K)}` : `${LEGACY}/${z}/${y}/${x}`;
/** MapLibre uchun shablon */
export const imageryTemplate = (): string => K ? `${KEYED}/{z}/{y}/{x}?token=${encodeURIComponent(K)}` : `${LEGACY}/{z}/{y}/{x}`;
/** Test uchun */
export function _resetEsriKey(k: string | null = null): void { K = k; P = null; }

/* NASA POWER — kalitsiz shamol manbasi (12.11.2026, egasi: «ochiq dostupda bormi?»).
   ERA5 kaliti (CDS_API_KEY) bo'lmasa yoki Copernicus javob bermasa — /data/wind shu manbadan javob beradi.
   Litsenziya: NASA Earth Science ma'lumoti — cheklovsiz (tijoriy foydalanish ham), kalit va ro'yxatdan o'tish shart emas;
   NASA so'ragan iqtibos — SOURCES.power.attribution.
   Ma'lumot: POWER hourly API (MERRA-2 asosida), 10 m dagi WS10M (m/s), WD10M («qayerdan», °), T2M (°C), UTC; to'r ≈ 0,5° × 0,625°.
   Bir so'rovda bir yil (8 760 soat) — 10 yil ketma-ket so'raladi; natija 10 yil keshda (o'tmish o'zgarmaydi). */
import { stationOf, YEARS } from './era5.js';

export const POWER_BASE = 'https://power.larc.nasa.gov/api/temporal/hourly/point';
/** POWER meteorologiya to'ri 0,5° (kenglik) — yaqin nuqtalar bitta katakka (bitta so'rov, bitta kesh) */
export const snapP = (v) => Math.round(v * 2) / 2;

/** POWER JSON (properties.parameter.{WS10M, WD10M, T2M}: { "YYYYMMDDHH": qiymat }) → [{ t, u, v, tk }] (era5.stationOf shakli) */
export function parsePower(j) {
  const P = j?.properties?.parameter, fill = j?.header?.fill_value ?? -999;
  if (!P?.WS10M || !P?.WD10M) throw new Error('POWER: WS10M / WD10M yo‘q');
  const ok = (x) => typeof x === 'number' && Number.isFinite(x) && x !== fill && x > -900;
  const out = [];
  for (const [k, s] of Object.entries(P.WS10M)) {
    if (!/^\d{10}$/.test(k)) continue;
    const mo = +k.slice(4, 6), dd = +k.slice(6, 8), hh = +k.slice(8, 10); if (mo < 1 || mo > 12 || dd < 1 || dd > 31 || hh > 23) continue;
    const t = Date.UTC(+k.slice(0, 4), mo - 1, dd, hh), d = P.WD10M[k], tc = P.T2M?.[k];
    // «qayerdan» yo'nalish → u, v (ERA5 bilan bir xil: atan2(−u, −v) = yo'nalish)
    const w = ok(s) && ok(d) ? { u: -s * Math.sin(d * Math.PI / 180), v: -s * Math.cos(d * Math.PI / 180) } : { u: null, v: null };
    out.push({ t, ...w, tk: ok(tc) ? tc + 273.15 : null });
  }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * POWER mijozi: get(lat, lon) → { status: 'ready', lat, lon, station }.
 * Yillar ketma-ket (bir vaqtda 1 ta so'rov — POWER yuklamasini oshirmaslik uchun); bir yil yiqilsa — butun so'rov yiqiladi.
 */
export function makePower({ fetchImpl = fetch, base = POWER_BASE, years = YEARS, timeoutMs = 60_000 } = {}) {
  async function year(lat, lon, y) {
    const q = new URLSearchParams({ parameters: 'WS10M,WD10M,T2M', community: 'RE', longitude: String(lon), latitude: String(lat), start: `${y}0101`, end: `${y}1231`, format: 'JSON', 'time-standard': 'UTC' });
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetchImpl(`${base}?${q}`, { headers: { 'User-Agent': 'ArchemistryLab/1.0 (+https://archemistry.uz)' }, signal: ctl.signal });
      if (!r.ok) throw new Error(`POWER: ${y} yil — ${r.status}`);
      return parsePower(await r.json());
    } finally { clearTimeout(t); }
  }
  async function get(latIn, lonIn) {
    const lat = snapP(latIn), lon = snapP(lonIn), rows = [];
    for (let y = years[0]; y <= years[1]; y++) rows.push(...await year(lat, lon, y));
    const st = stationOf(rows, lat, lon);
    return { status: 'ready', lat, lon, station: { ...st, name: `NASA POWER ${lat.toFixed(2)}, ${lon.toFixed(2)}`, file: `NASA POWER ${years[0]}–${years[1]}` } };
  }
  return { get, enabled: true };
}

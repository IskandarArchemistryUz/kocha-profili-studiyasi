/* ERA5 (Copernicus) — dunyoning istalgan nuqtasi uchun shamol guli va oylik harorat (34-band, 25.10.2026).
   Nega ERA5: NOAA ISD ning AQShdan tashqari ma'lumotini tijoriy maqsadda tarqatish taqiqlangan (WMO 40-rezolyutsiyasi);
   ERA5 — Copernicus litsenziyasi (manba ko'rsatilsa tijoriy foydalanish mumkin).
   Manba: CDS «reanalysis-era5-single-levels-timeseries» (nuqta bo'yicha soatlik qator), 10 yil, u10/v10/t2m.
   CDS API: POST /api/retrieve/v1/processes/{id}/execution {inputs} → GET /jobs/{id} (status) → GET /jobs/{id}/results (asset.href).
   Kalit (PRIVATE-TOKEN) — faqat serverdagi .env (CDS_API_KEY); javob 10 yil keshda (ERA5 o'tmishi o'zgarmaydi). */
import { unzipSync, strFromU8 } from 'fflate';

export const CDS_BASE = 'https://cds.climate.copernicus.eu/api';
export const DATASET = 'reanalysis-era5-single-levels-timeseries';
/** Shamol guli tezlik oraliqlari, m/s — ilovadagi EPW stansiyalari bilan bir xil (uz_climate.json) */
export const BINS = [0.5, 2, 4, 6, 8, 10];
export const YEARS = [2015, 2024];
/** ERA5 to'ri 0,25° — yaqin nuqtalar bitta katakka (bitta so'rov, bitta kesh) */
export const snap = (v) => Math.round(v * 4) / 4;

/** CSV (yoki zip ichidagi CSV) → [{ t: ms, u, v, tk }] — ustun nomlari bo'yicha (tartib har xil bo'lishi mumkin) */
export function parseSeries(buf) {
  let text;
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (b[0] === 0x50 && b[1] === 0x4b) {
    const files = unzipSync(b), csv = Object.keys(files).filter((n) => /\.csv$/i.test(n));
    if (!csv.length) throw new Error('ERA5: zip ichida CSV yo‘q');
    // har o'zgaruvchi alohida faylda bo'lishi mumkin — vaqt bo'yicha birlashtiramiz
    const rows = new Map();
    for (const n of csv) for (const r of parseCsv(strFromU8(files[n]))) { const o = rows.get(r.t) ?? { t: r.t }; Object.assign(o, Object.fromEntries(Object.entries(r).filter(([, v]) => v != null))); rows.set(r.t, o); }
    return [...rows.values()].sort((a, c) => a.t - c.t);
  }
  text = new TextDecoder().decode(b);
  return parseCsv(text);
}
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const H = lines[0].split(',').map((s) => s.trim().toLowerCase());
  const col = (...names) => H.findIndex((h) => names.includes(h));
  const it = col('valid_time', 'time', 'date'), iu = col('u10', '10m_u_component_of_wind'), iv = col('v10', '10m_v_component_of_wind'), itk = col('t2m', '2m_temperature');
  if (it < 0) throw new Error('ERA5: vaqt ustuni topilmadi');
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(','), t = Date.parse(c[it].trim().replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(c[it]) ? '' : 'Z'));
    if (!Number.isFinite(t)) continue;
    const num = (k) => { if (k < 0) return null; const v = parseFloat(c[k]); return Number.isFinite(v) ? v : null; };
    out.push({ t, u: num(iu), v: num(iv), tk: num(itk) });
  }
  return out;
}

/** Soatlik qator → ilovadagi Station shakli (uz_climate.json bilan bir xil) */
export function stationOf(rows, lat, lon) {
  const rose = Array.from({ length: 16 }, () => BINS.map(() => 0)), mT = Array.from({ length: 12 }, () => [0, 0]), mV = Array.from({ length: 12 }, () => [0, 0]);
  let n = 0, calm = 0, sum = 0; const sp = [];
  for (const r of rows) {
    const m = new Date(r.t).getUTCMonth();
    if (r.tk != null) { mT[m][0] += r.tk - 273.15; mT[m][1]++; }
    if (r.u == null || r.v == null) continue;
    const s = Math.hypot(r.u, r.v); n++; sum += s; sp.push(s); mV[m][0] += s; mV[m][1]++;
    if (s < BINS[0]) { calm++; continue; }
    const from = (Math.atan2(-r.u, -r.v) * 180 / Math.PI + 360) % 360, k = Math.round(from / 22.5) % 16;
    let b = 0; for (let i = 0; i < BINS.length; i++) if (s >= BINS[i]) b = i;
    rose[k][b]++;
  }
  if (!n) throw new Error('ERA5: shamol qatori bo‘sh');
  sp.sort((a, c) => a - c);
  const r4 = (v) => Math.round(v * 1e4) / 1e4, r2 = (v) => Math.round(v * 100) / 100;
  return {
    name: `ERA5 ${lat.toFixed(2)}, ${lon.toFixed(2)}`, file: `ERA5 ${YEARS[0]}–${YEARS[1]}`, lat, lon, elev: null, hours: n,
    calm: r4(calm / n), rose: rose.map((row) => row.map((c) => r4(c / n))), mean: r2(sum / n), p95: r2(sp[Math.floor(0.95 * (sp.length - 1))]),
    monthT: mT.map(([s, k]) => (k ? Math.round(s / k * 10) / 10 : null)), monthV: mV.map(([s, k]) => (k ? r2(s / k) : null)),
  };
}

const findHref = (o) => { if (!o || typeof o !== 'object') return null; if (typeof o.href === 'string') return o.href; for (const v of Object.values(o)) { const h = findHref(v); if (h) return h; } return null; };

/**
 * CDS mijozi. Navbat soatlab cho'zilishi mumkin — shuning uchun ish (job) bir marta yuboriladi, keyingi so'rovlar holatni tekshiradi:
 * get(lat, lon) → { status: 'ready', station } | { status: 'pending' } (ilova keyinroq qayta so'raydi).
 */
export function makeEra5({ key, fetchImpl = fetch, base = CDS_BASE, now = () => Date.now() } = {}) {
  const jobs = new Map();   // kalit → { id, at }
  const H = () => ({ 'PRIVATE-TOKEN': key, 'Content-Type': 'application/json', 'User-Agent': 'ArchemistryLab/1.0 (+https://archemistry.uz)' });
  async function submit(lat, lon) {
    const body = JSON.stringify({ inputs: { variable: ['10m_u_component_of_wind', '10m_v_component_of_wind', '2m_temperature'], location: { latitude: lat, longitude: lon }, date: [`${YEARS[0]}-01-01/${YEARS[1]}-12-31`], data_format: 'csv' } });
    let r = await fetchImpl(`${base}/retrieve/v1/processes/${DATASET}/execution`, { method: 'POST', headers: H(), body });
    if (r.status === 404) r = await fetchImpl(`${base}/retrieve/v1/processes/${DATASET}/execute`, { method: 'POST', headers: H(), body });
    if (r.status === 403) throw new Error('ERA5: litsenziya qabul qilinmagan (CDS saytida «Terms of use»)');
    if (!r.ok) throw new Error(`ERA5: so‘rov ${r.status}`);
    const j = await r.json(), id = j.jobID ?? j.id ?? j.job_id;
    if (!id) throw new Error('ERA5: ish raqami yo‘q');
    return String(id);
  }
  async function get(latIn, lonIn) {
    if (!key) throw new Error('ERA5: CDS_API_KEY sozlanmagan');
    const lat = snap(latIn), lon = snap(lonIn), k = `${lat},${lon}`;
    let job = jobs.get(k);
    if (!job || now() - job.at > 6 * 3600_000) { job = { id: await submit(lat, lon), at: now() }; jobs.set(k, job); }
    const s = await fetchImpl(`${base}/retrieve/v1/jobs/${encodeURIComponent(job.id)}`, { headers: H() });
    if (!s.ok) { jobs.delete(k); throw new Error(`ERA5: holat ${s.status}`); }
    const st = (await s.json()).status;
    if (st === 'failed' || st === 'dismissed' || st === 'rejected') { jobs.delete(k); throw new Error(`ERA5: ish ${st}`); }
    if (st !== 'successful') return { status: 'pending', lat, lon };
    const rr = await fetchImpl(`${base}/retrieve/v1/jobs/${encodeURIComponent(job.id)}/results`, { headers: H() });
    if (!rr.ok) throw new Error(`ERA5: natija ${rr.status}`);
    const href = findHref(await rr.json()); if (!href) throw new Error('ERA5: yuklab olish manzili yo‘q');
    const d = await fetchImpl(href, { headers: { 'User-Agent': 'ArchemistryLab/1.0' } });
    if (!d.ok) throw new Error(`ERA5: yuklab olish ${d.status}`);
    const station = stationOf(parseSeries(new Uint8Array(await d.arrayBuffer())), lat, lon);
    jobs.delete(k);
    return { status: 'ready', lat, lon, station };
  }
  return { get, enabled: !!key };
}

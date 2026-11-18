/* IP manzildan davlat (18.11, egasi qarori): Cloudflare yoʻq — sayt va API toʻgʻridan-toʻgʻri ulanadi.
   Manba: DB-IP «IP to Country Lite» (CC BY 4.0, https://db-ip.com — «IP Geolocation by DB-IP»), oyda bir yangilanadi.
   IP manzilning oʻzi hech qayerga yozilmaydi — faqat xotirada qidiriladi, natija ISO 3166-1 alpha-2 kodi.
   Fayl: <dir>/dbip-country-lite.csv.gz; yoʻq yoki 35 kundan eski boʻlsa — yuklab olinadi (joriy oy, boʻlmasa oldingi oy). */
import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { isIP } from 'node:net';

const FILE = 'dbip-country-lite.csv.gz';
const MAX_AGE = 35 * 864e5;
export const GEOIP_CREDIT = 'IP Geolocation by DB-IP (https://db-ip.com), CC BY 4.0';

const cc2n = (c) => (c.charCodeAt(0) << 8) | c.charCodeAt(1);
const n2cc = (n) => String.fromCharCode(n >> 8, n & 255);

function v4(ip) {
  const p = ip.split('.'); if (p.length !== 4) return null;
  let n = 0; for (const x of p) { const v = Number(x); if (!Number.isInteger(v) || v < 0 || v > 255) return null; n = n * 256 + v; }
  return n;
}
/** IPv6 ning yuqori 64 biti (davlat uchun /64 aniqligi yetarli) */
function v6hi(ip) {
  let s = ip.toLowerCase(); const z = s.indexOf('%'); if (z >= 0) s = s.slice(0, z);
  if (s.includes('.')) return null;   // ::ffff:1.2.3.4 — chaqiruvchi IPv4 ga aylantiradi
  const [a, b = null] = s.split('::');
  const L = a ? a.split(':') : [], R = b ? b.split(':') : [];
  if (b === null && L.length !== 8) return null;
  const g = [...L, ...Array(8 - L.length - R.length).fill('0'), ...R];
  if (g.length !== 8) return null;
  let hi = 0n; for (let i = 0; i < 4; i++) { const v = parseInt(g[i] || '0', 16); if (!(v >= 0 && v <= 0xffff)) return null; hi = (hi << 16n) | BigInt(v); }
  return hi;
}

/** CSV (start,end,CC) → qidiruv jadvallari; ZZ (zaxiralangan) va notoʻgʻri qatorlar tashlanadi */
export function parseDbip(csv) {
  const a4 = [], a6 = [];
  for (const line of csv.split('\n')) {
    const [s, e, c0] = line.split(','); if (!s || !e || !c0) continue;
    const c = c0.trim().replace(/"/g, '').toUpperCase(); if (!/^[A-Z]{2}$/.test(c) || c === 'ZZ') continue;
    const S = s.replace(/"/g, ''), E = e.replace(/"/g, '');
    if (S.includes(':')) { const x = v6hi(S), y = v6hi(E); if (x != null && y != null) a6.push([x, y, cc2n(c)]); }
    else { const x = v4(S), y = v4(E); if (x != null && y != null) a4.push([x, y, cc2n(c)]); }
  }
  a4.sort((p, q) => p[0] - q[0]); a6.sort((p, q) => (p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0));
  const t4 = { s: new Uint32Array(a4.length), e: new Uint32Array(a4.length), c: new Uint16Array(a4.length) };
  a4.forEach(([x, y, c], i) => { t4.s[i] = x; t4.e[i] = y; t4.c[i] = c; });
  const t6 = { s: new BigUint64Array(a6.length), e: new BigUint64Array(a6.length), c: new Uint16Array(a6.length) };
  a6.forEach(([x, y, c], i) => { t6.s[i] = x; t6.e[i] = y; t6.c[i] = c; });
  return { t4, t6, n: a4.length + a6.length };
}

function find(t, x) {
  let lo = 0, hi = t.s.length - 1, k = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (t.s[m] <= x) { k = m; lo = m + 1; } else hi = m - 1; }
  return k >= 0 && x <= t.e[k] ? n2cc(t.c[k]) : null;
}

/** Jadvallardan davlat; xususiy, lokal va notoʻgʻri manzil — null */
export function lookupIn(tab, ip) {
  if (!tab || !ip) return null;
  let s = String(ip).trim(); if (s.startsWith('::ffff:') && s.includes('.')) s = s.slice(7);
  const kind = isIP(s);
  if (kind === 4) { const n = v4(s); return n == null ? null : find(tab.t4, n); }
  if (kind === 6) { const n = v6hi(s); return n == null ? null : find(tab.t6, n); }
  return null;
}

const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/**
 * dir — fayl papkasi; fetchImpl — sinov uchun; download=false — faqat mavjud fayl (yuklamaydi).
 * lookup(ip) sinxron: jadval hali yuklanmagan boʻlsa null qaytaradi (kirish toʻxtamaydi).
 */
export function makeGeoIp({ dir, fetchImpl = globalThis.fetch, now = () => Date.now(), download = true, log = console } = {}) {
  let tab = null, busy = null;
  const path = join(dir, FILE);

  async function fetchMonth(d) {
    const url = `https://download.db-ip.com/free/dbip-country-lite-${monthKey(d)}.csv.gz`;
    const r = await fetchImpl(url); if (!r.ok) throw new Error(`db-ip ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const t = parseDbip(gunzipSync(buf).toString('utf8')); if (t.n < 1000) throw new Error('db-ip: fayl juda kichik');
    await mkdir(dir, { recursive: true }); await writeFile(`${path}.tmp`, buf); await rename(`${path}.tmp`, path);
    return t;
  }

  async function refresh() {
    let age = Infinity;
    try { age = now() - (await stat(path)).mtimeMs; } catch { /* fayl yoʻq */ }
    if (!tab && age < Infinity) {
      try { tab = parseDbip(gunzipSync(await readFile(path)).toString('utf8')); } catch (e) { log.warn?.('geoip: fayl oʻqilmadi', e?.message); }
    }
    if (!download || (tab && age < MAX_AGE)) return tab;
    const d = new Date(now()), prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
    for (const m of [d, prev]) {
      try { tab = await fetchMonth(m); log.info?.(`geoip: DB-IP ${monthKey(m)} yuklandi (${tab.n} oraliq)`); return tab; }
      catch (e) { log.warn?.(`geoip: ${monthKey(m)} yuklanmadi`, e?.message); }
    }
    return tab;
  }

  return {
    /** fon yuklash; parallel chaqiruvlar bitta ishga birlashadi */
    refresh: () => (busy ??= refresh().finally(() => { busy = null; })),
    lookup: (ip) => lookupIn(tab, ip),
    get ready() { return !!tab; },
  };
}

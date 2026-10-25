/* /data/* — hudud ma'lumoti serverda: kesh + manba manifesti.
   POST /data/overpass — Overpass so'rovi (brauzerdagi bilan bir xil), javob 30 kun keshlanadi; barcha serverlarga birdan, birinchi javob (≤ 25 s).
   GET  /data/sources  — manbalar reyestri (litsenziya, atributsiya).
   GET  /data/overture/buildings?bbox=w,s,e,n — Overture binolari (≤ 0,06°), 90 kun kesh; kalit bbox 4 xonaga yaxlitlanadi.
   GET  /data/wind?lat=&lon= — ERA5 shamol guli (0,25° katak), 10 yil kesh; tayyorlanayotgan bo'lsa 202. */
import { SOURCES, sourceInfo } from './sources.js';
import { makeOverture, MAX_SPAN } from './overture.js';
import { snap } from './era5.js';

export const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const MAX_Q = 8000;

export function registerData(app, { cache, fetchImpl = fetch, servers = OVERPASS_SERVERS, limited, timeoutMs = 25_000, overture = makeOverture({ fetchImpl }), era5 = null }) {
  app.get('/data/sources', async () => ({ sources: Object.keys(SOURCES).map(sourceInfo) }));

  const inflight = new Map();   // bir xil so'rov bir vaqtda kelsa — bitta tashqi so'rov
  app.post('/data/overpass', async (req, reply) => {
    const q = typeof req.body?.data === 'string' ? req.body.data : '';
    // faqat JSON chiqaradigan, cheklangan hajmdagi so'rov (proksi suiiste'mol qilinmasin)
    if (!q || q.length > MAX_Q || !/^\s*\[out:json\]/.test(q)) return reply.code(400).send({ error: 'bad_request', message: 'Overpass so‘rovi [out:json] bilan boshlanishi kerak' });
    const src = SOURCES.osm, key = `overpass:${q}`;
    const hit = await cache.get(key, src.ttlDays);
    if (hit) return reply.header('content-type', 'application/json').header('x-cache', 'hit').header('x-source', 'osm').send(hit.body);
    if (limited?.(req.ip, 30)) return reply.code(429).send({ error: 'rate', message: 'Juda ko‘p so‘rov — birozdan keyin' });
    let job = inflight.get(key);
    if (!job) {
      // Barcha serverlarga birdan (sayt 25.10: ketma-ket 4 × 60 s — brauzer/nginx 30 s da uzib qo'yardi, javob hech qachon yetib bormasdi);
      // birinchi yaroqli javob olinadi, qolganlari to'xtatiladi
      job = (async () => {
        const ctls = servers.map(() => new AbortController());
        const one = async (url, i) => {
          const t = setTimeout(() => ctls[i].abort(), timeoutMs);
          try {
            const r = await fetchImpl(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ArchemistryLab/1.0 (+https://archemistry.uz)' }, signal: ctls[i].signal });
            if (!r.ok) throw new Error(`${url} ${r.status}`);
            const body = await r.text(), j = JSON.parse(body);
            if (!Array.isArray(j.elements)) throw new Error(`${url}: ${String(j.remark ?? 'bo‘sh').slice(0, 80)}`);
            return { body, host: new URL(url).host };
          } finally { clearTimeout(t); }
        };
        let win;
        try { win = await Promise.any(servers.map(one)); } catch (e) { throw new Error(e.errors?.map((x) => x.message).join('; ').slice(0, 300) || 'Overpass javob bermadi'); }
        finally { for (const c of ctls) c.abort(); }
        await cache.put(key, win.body, { source: 'osm', server: win.host, licence: src.licence, attribution: src.attribution, odbl: true });
        return win.body;
      })().finally(() => inflight.delete(key));
      inflight.set(key, job);
    }
    try {
      const body = await job;
      return reply.header('content-type', 'application/json').header('x-cache', 'miss').header('x-source', 'osm').send(body);
    } catch (e) { req.log.warn(e); return reply.code(502).send({ error: 'upstream', message: 'OSM serverlari javob bermadi' }); }
  });

  /* ---------- Overture binolari ---------- */
  const ovInflight = new Map();
  app.get('/data/overture/buildings', async (req, reply) => {
    const raw = String(req.query?.bbox ?? '').split(',').map(Number);
    if (raw.length !== 4 || !raw.every(Number.isFinite)) return reply.code(400).send({ error: 'bad_request', message: 'bbox=g‘arb,janub,sharq,shimol' });
    // 4 xona (~10 m) — yaqin so'rovlar bitta kesh yozuviga tushadi; tashqariga kengaytiriladi
    const bb = [Math.floor(raw[0] * 1e4) / 1e4, Math.floor(raw[1] * 1e4) / 1e4, Math.ceil(raw[2] * 1e4) / 1e4, Math.ceil(raw[3] * 1e4) / 1e4];
    if (!(bb[0] < bb[2] && bb[1] < bb[3]) || bb[2] - bb[0] > MAX_SPAN || bb[3] - bb[1] > MAX_SPAN || bb[0] < -180 || bb[2] > 180 || bb[1] < -90 || bb[3] > 90)
      return reply.code(400).send({ error: 'bad_request', message: `bbox ${MAX_SPAN}° dan oshmasin` });
    const src = SOURCES.overture, key = `overture:bld:${bb.join(',')}`;
    const hit = await cache.get(key, src.ttlDays);
    if (hit) return reply.header('content-type', 'application/json').header('x-cache', 'hit').header('x-source', 'overture').send(hit.body);
    if (limited?.(req.ip, 10)) return reply.code(429).send({ error: 'rate', message: 'Juda ko‘p so‘rov — birozdan keyin' });
    let job = ovInflight.get(key);
    if (!job) {
      job = (async () => {
        const r = await overture.buildings(bb);
        const body = JSON.stringify({ source: 'overture', release: r.release, attribution: src.attribution, licence: src.licence, bbox: bb, buildings: r.buildings });
        await cache.put(key, body, { source: 'overture', release: r.release, licence: src.licence, attribution: src.attribution, odbl: true });
        return body;
      })().finally(() => ovInflight.delete(key));
      ovInflight.set(key, job);
    }
    try {
      const body = await job;
      return reply.header('content-type', 'application/json').header('x-cache', 'miss').header('x-source', 'overture').send(body);
    } catch (e) { req.log.warn(e); return reply.code(502).send({ error: 'upstream', message: 'Overture ma’lumoti olinmadi' }); }
  });

  /* ---------- ERA5 shamol ---------- */
  app.get('/data/wind', async (req, reply) => {
    const lat = Number(req.query?.lat), lon = Number(req.query?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return reply.code(400).send({ error: 'bad_request', message: 'lat va lon kerak' });
    if (!era5?.enabled) return reply.code(503).send({ error: 'disabled', message: 'ERA5 ulanmagan (CDS_API_KEY yo‘q)' });
    const src = SOURCES.era5, key = `era5:wind:${snap(lat)},${snap(lon)}`;
    const hit = await cache.get(key, src.ttlDays);
    if (hit) return reply.header('content-type', 'application/json').header('x-cache', 'hit').header('x-source', 'era5').send(hit.body);
    if (limited?.(req.ip, 20)) return reply.code(429).send({ error: 'rate', message: 'Juda ko‘p so‘rov — birozdan keyin' });
    try {
      const r = await era5.get(lat, lon);
      if (r.status !== 'ready') return reply.code(202).header('retry-after', '20').send({ status: 'pending', message: 'ERA5 ma’lumoti tayyorlanmoqda (Copernicus navbati)' });
      const body = JSON.stringify({ source: 'era5', attribution: src.attribution, licence: src.licence, lat: r.lat, lon: r.lon, station: r.station });
      await cache.put(key, body, { source: 'era5', licence: src.licence, attribution: src.attribution, odbl: false });
      return reply.header('content-type', 'application/json').header('x-cache', 'miss').header('x-source', 'era5').send(body);
    } catch (e) { req.log.warn(e); return reply.code(502).send({ error: 'upstream', message: String(e.message || 'ERA5 javob bermadi').slice(0, 160) }); }
  });
}

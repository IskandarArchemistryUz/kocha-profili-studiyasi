/* /data/* — hudud ma'lumoti serverda: kesh + manba manifesti.
   POST /data/overpass — Overpass so'rovi (brauzerdagi bilan bir xil), javob 30 kun keshlanadi; bir nechta server ketma-ket.
   GET  /data/sources  — manbalar reyestri (litsenziya, atributsiya).
   GET  /data/overture/buildings?bbox=w,s,e,n — Overture binolari (≤ 0,06°), 90 kun kesh; kalit bbox 4 xonaga yaxlitlanadi. */
import { SOURCES, sourceInfo } from './sources.js';
import { makeOverture, MAX_SPAN } from './overture.js';

export const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const MAX_Q = 8000;

export function registerData(app, { cache, fetchImpl = fetch, servers = OVERPASS_SERVERS, limited, timeoutMs = 60_000, overture = makeOverture({ fetchImpl }) }) {
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
      job = (async () => {
        let last = '';
        for (const url of servers) {
          const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
          try {
            const r = await fetchImpl(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ArchemistryLab/1.0 (+https://archemistry.uz)' }, signal: ctl.signal });
            if (!r.ok) { last = `${url} ${r.status}`; continue; }
            const body = await r.text(), j = JSON.parse(body);
            if (!Array.isArray(j.elements)) { last = `${url}: ${String(j.remark ?? 'bo‘sh').slice(0, 80)}`; continue; }
            await cache.put(key, body, { source: 'osm', server: new URL(url).host, licence: src.licence, attribution: src.attribution, odbl: true });
            return body;
          } catch (e) { last = `${url}: ${e.message}`; } finally { clearTimeout(t); }
        }
        throw new Error(last || 'Overpass javob bermadi');
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
}

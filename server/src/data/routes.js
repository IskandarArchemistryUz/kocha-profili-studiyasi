/* /data/* — hudud ma'lumoti serverda: kesh + manba manifesti.
   POST /data/overpass — Overpass so'rovi (brauzerdagi bilan bir xil), javob 30 kun keshlanadi; bir nechta server ketma-ket.
   GET  /data/sources  — manbalar reyestri (litsenziya, atributsiya). */
import { SOURCES, sourceInfo } from './sources.js';

export const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const MAX_Q = 8000;

export function registerData(app, { cache, fetchImpl = fetch, servers = OVERPASS_SERVERS, limited, timeoutMs = 60_000 }) {
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
}

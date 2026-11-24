/* /data/file/:set/:name — tayyor maʼlumot fayllarining server nusxasi (24.11.2026, Joyshunos auditi D-boʻlim).
   Ilova Landsat yuza harorati, uy narxi kataklari va kadastr agregatini toʻgʻridan-toʻgʻri raw.githubusercontent.com dan olardi:
   u CDN emas, soʻrov chegarasi bor, repo yopilsa uchala qatlam birdan oʻchadi. Endi fayl serverda saqlanadi:
   birinchi soʻrovda manbadan olinadi, keyin diskdan beriladi; muddati oʻtsa yangilanadi, manba javob bermasa — eski nusxa (x-cache: stale).
   Faqat roʻyxatdagi toʻplamlar va qatʼiy nom andozasi — ixtiyoriy manzilga proksi emas. */
import { mkdir, readFile, writeFile, rename, stat, utimes } from 'node:fs/promises';
import { join } from 'node:path';

const GH = 'https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi';
export const FILE_SETS = {
  lst: { up: `${GH}/lst-data/data/lst`, name: /^[a-z0-9_]{1,60}\.(json|bin)$/ },
  narx: { up: `${GH}/narx-monitoring/data/narx`, name: /^[a-z0-9_]{1,60}\.json$/ },
  kadastr: { up: `${GH}/kadastr-agregat/data/kadastr`, name: /^[a-z0-9_]{1,60}\.(json|bin\.gz)$/ },
};
export const FILE_MAX = 20 * 2 ** 20;   // bitta fayl ≤ 20 MB
const TTL_MS = 24 * 3600e3, MISS_MS = 10 * 60e3;

export function registerFiles(app, { dir, fetchImpl = fetch, limited, timeoutMs = 25_000, now = () => Date.now(), sets = FILE_SETS }) {
  const inflight = new Map(), missing = new Map(), retry = new Map();   // missing: manbada yoʻq fayl; retry: yangilab boʻlmagan fayl — MISS_MS davomida manbaga qayta borilmaydi
  const type = (name) => (name.endsWith('.json') ? 'application/json' : 'application/octet-stream');
  const pull = (key, url, path, folder) => {
    let job = inflight.get(key);
    if (!job) {
      job = (async () => {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeoutMs);
        try {
          const r = await fetchImpl(url, { signal: ctl.signal, headers: { 'User-Agent': 'ArchemistryLab/1.0 (+https://archemistry.uz)' } });
          if (r.status === 404) { missing.set(key, now() + MISS_MS); const e = new Error('not_found'); e.code = 404; throw e; }
          if (!r.ok) throw new Error(`manba ${r.status}`);
          const buf = Buffer.from(await r.arrayBuffer());
          if (!buf.length || buf.length > FILE_MAX) throw new Error(`hajm ${buf.length}`);
          // avval vaqtinchalik faylga, keyin nomini oʻzgartirish — yarim yozilgan fayl berilmaydi
          await mkdir(folder, { recursive: true }); await writeFile(`${path}.tmp`, buf); await rename(`${path}.tmp`, path);
          const d = new Date(now()); await utimes(path, d, d);   // yangilangan vaqt — fayl mtime (qayta ishga tushganda ham saqlanadi)
          return buf;
        } finally { clearTimeout(t); }
      })().finally(() => inflight.delete(key));
      inflight.set(key, job);
    }
    return job;
  };
  app.get('/data/file/:set/:name', async (req, reply) => {
    const set = Object.hasOwn(sets, req.params.set) ? sets[req.params.set] : null, name = String(req.params.name ?? '');
    if (!set || !set.name.test(name)) return reply.code(404).send({ error: 'not_found', message: 'Bunday fayl yoʻq' });
    const key = `${req.params.set}/${name}`, folder = join(dir, req.params.set), path = join(folder, name);
    const out = (buf, cache) => reply.header('content-type', type(name)).header('cache-control', 'public, max-age=3600').header('x-cache', cache).send(buf);
    let have = null;
    try { const s = await stat(path); have = { fresh: now() - s.mtimeMs < TTL_MS }; } catch { /* hali yoʻq */ }
    if (have?.fresh) return out(await readFile(path), 'hit');
    if (have && (retry.get(key) ?? 0) > now()) return out(await readFile(path), 'stale');
    if (!have && (missing.get(key) ?? 0) > now()) return reply.code(404).send({ error: 'not_found', message: 'Bunday fayl yoʻq' });
    if (!have && limited?.(`f:${req.ip}`, 60)) return reply.code(429).send({ error: 'rate', message: 'Juda koʻp soʻrov — birozdan keyin' });
    try { return out(await pull(key, `${set.up}/${name}`, path, folder), 'miss'); }
    catch (e) {
      if (have) { retry.set(key, now() + MISS_MS); return out(await readFile(path), 'stale'); }   // manba javob bermadi (yoki repo yopilgan) — eski nusxa
      if (e.code === 404) return reply.code(404).send({ error: 'not_found', message: 'Bunday fayl yoʻq' });
      req.log.warn(e); return reply.code(502).send({ error: 'upstream', message: 'Maʼlumot manbasi javob bermadi' });
    }
  });
}

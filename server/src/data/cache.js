/* Hudud ma'lumoti keshi (fayl tizimi): kalit → <sha1>.json (javob) + <sha1>.meta.json (manifest).
   Hajm DATA_CACHE_GB dan oshsa — eng uzoq ishlatilmaganlari o'chiriladi (LRU, faylning mtime bo'yicha). */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, stat, unlink, utimes, rename } from 'node:fs/promises';
import { join } from 'node:path';

export function makeCache({ dir, maxBytes = 20 * 2 ** 30, now = () => Date.now() }) {
  let ready = null, writes = 0;
  const init = () => (ready ??= mkdir(dir, { recursive: true }));
  const hash = (key) => createHash('sha1').update(key).digest('hex');
  const paths = (key) => { const h = hash(key); return { body: join(dir, `${h}.json`), meta: join(dir, `${h}.meta.json`) }; };

  /** Yozuv: { body: string, meta } yoki null (yo'q / eskirgan) */
  async function get(key, ttlDays) {
    await init();
    const p = paths(key);
    try {
      const meta = JSON.parse(await readFile(p.meta, 'utf8'));
      if (ttlDays && now() - Date.parse(meta.fetchedAt) > ttlDays * 864e5) return null;
      const body = await readFile(p.body, 'utf8');
      const t = new Date(now()); utimes(p.body, t, t).catch(() => {});   // LRU uchun
      return { body, meta };
    } catch { return null; }
  }
  async function put(key, body, meta) {
    await init();
    const p = paths(key), m = { ...meta, key: key.slice(0, 200), bytes: Buffer.byteLength(body), fetchedAt: new Date(now()).toISOString() };
    // avval vaqtinchalik faylga, keyin nomini o'zgartirish — yarim yozilgan fayl o'qilmaydi
    await writeFile(`${p.body}.tmp`, body); await rename(`${p.body}.tmp`, p.body);
    await writeFile(p.meta, JSON.stringify(m));
    if (++writes % 20 === 0) sweep().catch(() => {});
    return m;
  }
  /** Hajm chegarasidan oshsa — eng eski (mtime) yozuvlar o'chiriladi */
  async function sweep() {
    await init();
    const names = (await readdir(dir)).filter((n) => n.endsWith('.json') && !n.endsWith('.meta.json'));
    const items = [];
    for (const n of names) { try { const s = await stat(join(dir, n)); items.push({ n, size: s.size, t: s.mtimeMs }); } catch { /* */ } }
    let total = items.reduce((a, x) => a + x.size, 0), removed = 0;
    items.sort((a, b) => a.t - b.t);
    for (const x of items) {
      if (total <= maxBytes) break;
      await unlink(join(dir, x.n)).catch(() => {}); await unlink(join(dir, x.n.replace(/\.json$/, '.meta.json'))).catch(() => {});
      total -= x.size; removed++;
    }
    return { total, removed };
  }
  return { get, put, sweep, hash };
}

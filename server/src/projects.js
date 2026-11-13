/* Loyihalar bulutda (1-PR, 14.11.2026). Interfeysga tegmaydi — faqat server va API.
   Oqim (nginx tanasi ≤ 128 KB, shuning uchun hujjat serverdan oʻtmaydi):
     1) POST /projects/:id/upload { type, bytes, base_version } → R2 ga presigned PUT (gzip JSON)
     2) brauzer faylni R2 ga oʻzi yuklaydi
     3) POST /projects/:id/commit { key, base_version, name, type, meta } → versiya +1
   Ikki qurilmada bir vaqtda oʻzgartirilsa — base_version mos kelmaydi → 409 conflict (ustidan yozilmaydi).
   Oʻchirish — savatga (deleted_at), 30 kundan keyin butunlay. Oxirgi 5 nusxa saqlanadi.
   R2 sozlanmagan boʻlsa — /projects/* → 503. */
import { randomUUID } from 'node:crypto';

export const PROJECT_TYPES = Object.freeze(['master', 'kochasoz', 'joyshunos', 'chizmadon', 'render', 'dizaynkod', 'binokor', 'bogshunos']);
export const PROJECT_DEFAULTS = Object.freeze({
  maxDocBytes: 30 * 2 ** 20,   // bitta loyiha (siqilgan) ≤ 30 MB
  quotaBytes: 500 * 2 ** 20,   // bir hisob jami ≤ 500 MB (keyin obunaga bogʻlanadi)
  maxProjects: 300,
  keepVersions: 5,
  trashDays: 30,
  uploadTtl: 300,              // presigned PUT — 5 daqiqa
  getTtl: 600,                 // presigned GET — 10 daqiqa
  pendingMin: 60,              // tasdiqlanmagan yuklama shu daqiqadan keyin oʻchiriladi
  sweepMs: 30 * 60e3,
});
const TYPE = 'application/gzip';
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const OFF_MSG = 'Bulutda saqlash vaqtincha ishlamayapti';

export class ProjectError extends Error {
  constructor(status, code, msg, extra) { super(msg); this.status = status; this.code = code; Object.assign(this, extra); }
}
const bad = (code, msg) => new ProjectError(400, code, msg);
const iso = (d) => (d ? (d.toISOString?.() ?? String(d)) : null);

export function cleanName(v) {
  const s = String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 120);
  return s || null;
}
/** meta — roʻyxatda koʻrinadigan qisqa maʼlumot (maydon, joy nomi…); ≤ 4 KB, faqat oddiy qiymatlar */
export function cleanMeta(v) {
  if (v == null) return {};
  if (typeof v !== 'object' || Array.isArray(v)) throw bad('bad_meta', 'meta obyekt boʻlishi kerak');
  const o = {};
  for (const [k, x] of Object.entries(v).slice(0, 30)) {
    if (!/^[A-Za-z0-9_]{1,32}$/.test(k)) continue;
    if (typeof x === 'number' && Number.isFinite(x)) o[k] = x;
    else if (typeof x === 'boolean') o[k] = x;
    else if (typeof x === 'string') o[k] = x.replace(/[\u0000-\u001f<>]/g, '').slice(0, 200);
  }
  if (JSON.stringify(o).length > 4096) throw bad('bad_meta', 'meta juda katta');
  return o;
}
const row = (r) => ({
  id: r.id, type: r.type, name: r.name, meta: r.meta ?? {}, version: r.version, bytes: Number(r.bytes),
  created: iso(r.created_at), updated: iso(r.updated_at), deleted: iso(r.deleted_at),
});

/**
 * @param {object|null} cfg  { r2, ...PROJECT_DEFAULTS } — r2 boʻlmasa oʻchiq
 */
export function registerProjects(app, { db, requireUser, isOwner, limited, cfg, now = () => new Date() }) {
  const c = cfg?.r2 ? { ...PROJECT_DEFAULTS, ...cfg } : null;
  const r2 = c?.r2;

  const guard = (fn) => async (req, reply) => {
    try {
      if (!c) throw new ProjectError(503, 'projects_off', OFF_MSG);
      const u = await requireUser(req, reply); if (!u) return;
      return await fn(u, req, reply);
    } catch (e) {
      if (e instanceof ProjectError) return reply.code(e.status).send({ error: e.code, message: e.message, ...(e.extra ?? {}) });
      throw e;
    }
  };
  const idOf = (req) => {
    const id = String(req.params.id ?? '');
    if (!ID_RE.test(id)) throw bad('bad_id', 'loyiha identifikatori notoʻgʻri');
    return id;
  };
  const quotaOf = (u) => (isOwner(u) ? Infinity : c.quotaBytes);
  async function usage(u, q = db) {
    const { rows } = await q.query(`SELECT COALESCE(SUM(bytes),0) AS b, COUNT(*) AS n FROM projects WHERE user_id = $1`, [u.id]);
    return { bytes: Number(rows[0].b), count: Number(rows[0].n), quota: Number.isFinite(quotaOf(u)) ? quotaOf(u) : null, max: isOwner(u) ? null : c.maxProjects };
  }
  async function one(u, id, q = db, lock = false) {
    const { rows } = await q.query(`SELECT * FROM projects WHERE user_id = $1 AND id = $2${lock ? ' FOR UPDATE' : ''}`, [u.id, id]);
    return rows[0] ?? null;
  }
  const delObj = async (key) => { try { await r2.del(key); } catch { /* keyin tozalanadi */ } };

  /* roʻyxat: ?type=master  ?trash=1 */
  app.get('/projects', guard(async (u, req) => {
    const type = req.query?.type ? String(req.query.type) : null;
    if (type && !PROJECT_TYPES.includes(type)) throw bad('bad_type', 'loyiha turi notoʻgʻri');
    const trash = req.query?.trash === '1';
    const { rows } = await db.query(
      `SELECT id, type, name, meta, version, bytes, created_at, updated_at, deleted_at FROM projects
       WHERE user_id = $1 AND ($2::text IS NULL OR type = $2) AND (deleted_at IS ${trash ? 'NOT ' : ''}NULL)
       ORDER BY updated_at DESC LIMIT 500`, [u.id, type]);
    return { items: rows.map(row), usage: await usage(u) };
  }));

  /* ochish: tavsif + R2 dan yuklash havolasi; ?version=N — eski nusxa */
  app.get('/projects/:id', guard(async (u, req) => {
    const id = idOf(req);
    const p = await one(u, id);
    if (!p) throw new ProjectError(404, 'not_found', 'loyiha topilmadi');
    let key = p.r2_key, version = p.version;
    if (req.query?.version != null) {
      const v = Number(req.query.version);
      const { rows } = await db.query(`SELECT version, r2_key FROM project_versions WHERE user_id = $1 AND id = $2 AND version = $3`, [u.id, id, v]);
      if (!rows[0]) throw new ProjectError(404, 'not_found', 'bu nusxa saqlanmagan');
      key = rows[0].r2_key; version = rows[0].version;
    }
    return { project: row(p), version, url: r2.presignGet(key, c.getTtl) };
  }));

  app.get('/projects/:id/versions', guard(async (u, req) => {
    const id = idOf(req);
    if (!(await one(u, id))) throw new ProjectError(404, 'not_found', 'loyiha topilmadi');
    const { rows } = await db.query(`SELECT version, bytes, created_at FROM project_versions WHERE user_id = $1 AND id = $2 ORDER BY version DESC`, [u.id, id]);
    return { items: rows.map((r) => ({ version: r.version, bytes: Number(r.bytes), created: iso(r.created_at) })) };
  }));

  /* 1) yuklash havolasi */
  app.post('/projects/:id/upload', guard(async (u, req) => {
    const id = idOf(req);
    if (limited(`proj:${u.id}`, 60)) throw new ProjectError(429, 'rate', 'juda koʻp soʻrov');
    const b = req.body ?? {};
    const type = String(b.type ?? '');
    if (!PROJECT_TYPES.includes(type)) throw bad('bad_type', 'loyiha turi notoʻgʻri');
    const bytes = Number(b.bytes), base = Number(b.base_version ?? 0);
    if (!Number.isInteger(bytes) || bytes < 20) throw bad('bad_bytes', 'fayl hajmi notoʻgʻri');
    if (bytes > c.maxDocBytes) throw new ProjectError(413, 'too_big', `loyiha juda katta (≤ ${Math.round(c.maxDocBytes / 2 ** 20)} MB)`);
    if (!Number.isInteger(base) || base < 0) throw bad('bad_version', 'versiya notoʻgʻri');
    const p = await one(u, id);
    if (p?.deleted_at) throw new ProjectError(409, 'deleted', 'loyiha savatda — avval tiklang');
    if (p && p.type !== type) throw bad('bad_type', 'loyiha turini oʻzgartirib boʻlmaydi');
    if ((p?.version ?? 0) !== base) throw new ProjectError(409, 'conflict', 'loyiha boshqa qurilmada oʻzgargan', { extra: { version: p?.version ?? 0, updated: iso(p?.updated_at) } });
    const us = await usage(u);
    if (!p && us.max != null && us.count >= us.max) throw new ProjectError(403, 'max_projects', `loyihalar soni chegarasi: ${us.max}`);
    if (us.bytes - Number(p?.bytes ?? 0) + bytes > quotaOf(u)) throw new ProjectError(403, 'quota', 'bulutdagi joy tugadi', { extra: { usage: us } });
    const key = `projects/${u.id}/${id}/${base + 1}-${randomUUID()}.json.gz`;
    await db.query(`INSERT INTO project_uploads (r2_key, user_id, id, base_version, bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, [key, u.id, id, base, bytes, now()]);
    return { key, put: r2.presignPut(key, { type: TYPE, bytes, expires: c.uploadTtl }), expires: c.uploadTtl };
  }));

  /* 3) tasdiqlash: R2 dagi faylni tekshirib, versiyani oshiradi */
  app.post('/projects/:id/commit', guard(async (u, req) => {
    const id = idOf(req);
    const b = req.body ?? {};
    const key = String(b.key ?? ''), base = Number(b.base_version ?? -1), type = String(b.type ?? '');
    const name = cleanName(b.name);
    if (!name) throw bad('bad_name', 'loyiha nomi kerak');
    const meta = cleanMeta(b.meta);
    const { rows: up } = await db.query(`SELECT * FROM project_uploads WHERE r2_key = $1 AND user_id = $2 AND id = $3`, [key, u.id, id]);
    if (!up[0]) throw bad('bad_key', 'yuklama topilmadi yoki eskirgan');
    if (up[0].base_version !== base) throw bad('bad_version', 'versiya yuklama bilan mos emas');
    const h = await r2.head(key);
    if (!h) throw bad('not_uploaded', 'fayl hali yuklanmagan');
    if (h.bytes !== Number(up[0].bytes)) {
      await delObj(key); await db.query(`DELETE FROM project_uploads WHERE r2_key = $1`, [key]);
      throw bad('bad_bytes', 'yuklangan fayl hajmi kelishilganidan farq qiladi');
    }
    const t = now();
    const out = await db.tx(async (q) => {
      const p = await one(u, id, q, true);
      if (p?.deleted_at) return { err: new ProjectError(409, 'deleted', 'loyiha savatda — avval tiklang') };
      if (p && p.type !== type) return { err: bad('bad_type', 'loyiha turini oʻzgartirib boʻlmaydi') };
      if ((p?.version ?? 0) !== base) return { err: new ProjectError(409, 'conflict', 'loyiha boshqa qurilmada oʻzgargan', { extra: { version: p?.version ?? 0, updated: iso(p?.updated_at) } }) };
      const v = base + 1;
      if (p) {
        await q.query(`UPDATE projects SET name=$3, meta=$4, version=$5, r2_key=$6, bytes=$7, updated_at=$8 WHERE user_id=$1 AND id=$2`, [u.id, id, name, JSON.stringify(meta), v, key, h.bytes, t]);
      } else {
        if (!PROJECT_TYPES.includes(type)) return { err: bad('bad_type', 'loyiha turi notoʻgʻri') };
        await q.query(`INSERT INTO projects (user_id, id, type, name, meta, version, r2_key, bytes, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`, [u.id, id, type, name, JSON.stringify(meta), v, key, h.bytes, t]);
      }
      await q.query(`INSERT INTO project_versions (user_id, id, version, r2_key, bytes, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, [u.id, id, v, key, h.bytes, t]);
      await q.query(`DELETE FROM project_uploads WHERE r2_key = $1`, [key]);
      const { rows: old } = await q.query(`DELETE FROM project_versions WHERE user_id=$1 AND id=$2 AND version <= $3 RETURNING r2_key`, [u.id, id, v - c.keepVersions]);
      return { v, old: old.map((r) => r.r2_key) };
    });
    if (out.err) { await delObj(key); await db.query(`DELETE FROM project_uploads WHERE r2_key = $1`, [key]); throw out.err; }
    for (const k of out.old) await delObj(k);
    return { project: row(await one(u, id)) };
  }));

  /* nomini yoki meta ni oʻzgartirish (hujjat va versiya oʻzgarmaydi) */
  app.patch('/projects/:id', guard(async (u, req) => {
    const id = idOf(req);
    const b = req.body ?? {};
    const p = await one(u, id);
    if (!p || p.deleted_at) throw new ProjectError(404, 'not_found', 'loyiha topilmadi');
    const name = b.name !== undefined ? cleanName(b.name) : p.name;
    if (!name) throw bad('bad_name', 'loyiha nomi kerak');
    const meta = b.meta !== undefined ? cleanMeta(b.meta) : p.meta;
    await db.query(`UPDATE projects SET name=$3, meta=$4 WHERE user_id=$1 AND id=$2`, [u.id, id, name, JSON.stringify(meta)]);
    return { project: row(await one(u, id)) };
  }));

  /* savatga */
  app.delete('/projects/:id', guard(async (u, req) => {
    const id = idOf(req);
    const p = await one(u, id);
    if (!p) throw new ProjectError(404, 'not_found', 'loyiha topilmadi');
    if (!p.deleted_at) await db.query(`UPDATE projects SET deleted_at=$3 WHERE user_id=$1 AND id=$2`, [u.id, id, now()]);
    return { ok: true, purge_days: c.trashDays };
  }));
  app.post('/projects/:id/restore', guard(async (u, req) => {
    const id = idOf(req);
    const p = await one(u, id);
    if (!p) throw new ProjectError(404, 'not_found', 'loyiha topilmadi');
    await db.query(`UPDATE projects SET deleted_at=NULL WHERE user_id=$1 AND id=$2`, [u.id, id]);
    return { project: row(await one(u, id)) };
  }));

  /* tozalash: eskirgan yuklamalar va savatdagi 30 kunlik loyihalar */
  async function sweep() {
    if (!c) return { uploads: 0, purged: 0 };
    const t = now();
    const { rows: ups } = await db.query(`DELETE FROM project_uploads WHERE created_at < $1 RETURNING r2_key`, [new Date(t.getTime() - c.pendingMin * 60e3)]);
    for (const r of ups) await delObj(r.r2_key);
    const { rows: gone } = await db.query(`DELETE FROM projects WHERE deleted_at IS NOT NULL AND deleted_at < $1 RETURNING user_id, id`, [new Date(t.getTime() - c.trashDays * 864e5)]);
    for (const g of gone) {
      const { rows: vs } = await db.query(`DELETE FROM project_versions WHERE user_id=$1 AND id=$2 RETURNING r2_key`, [g.user_id, g.id]);
      for (const v of vs) await delObj(v.r2_key);
    }
    return { uploads: ups.length, purged: gone.length };
  }
  if (c && c.sweep !== false) {
    const tm = setInterval(() => { void sweep().catch((e) => app.log.error(e)); }, c.sweepMs);
    tm.unref?.();
    app.addHook('onClose', async () => clearInterval(tm));
  }
  app.decorate('projects', { sweep });
}

/* Render navbati (1-bosqich, 13.11.2026; topshiriq — project claude/topshiriq-render-1-bosqich-pr1-13-11.md).
   Oqim: brauzer kirish rasmini R2 ga oʻzi yuklaydi (POST /render/upload-url → presigned PUT) → POST /render/jobs
   (tekshiruv, parallel cheklov, kunlik $ chegarasi, tanga HOLD, prompt kompilyatori, fal queue + webhook) →
   POST /render/hook (imzo, natija R2 ga stream, 512 px WebP eskiz, CAPTURE; xatoda RELEASE) →
   brauzer GET /render/jobs/:id ni 3 s da soʻraydi. Webhook kelmasa — har 5 daqiqada «osilgan» ishlar fal dan soʻraladi.
   Egasi (OWNER_EMAILS): markaziy kalit, tanga yechilmaydi. Kalitlar boʻlmasa — 503 «Render vaqtincha ishlamayapti». */
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { ENGINES, FalError, nearAR } from './fal.js';
import { compilePrompt, PromptError, REF_ROLES } from './prompt.js';
import { RENDER_COINS } from '../prices.js';
import { dayStart } from '../agent.js';

export const RENDER_DEFAULTS = Object.freeze({
  dailyUsd: 20,          // RENDER_DAILY_USD_CAP — kunlik fal xarajati chegarasi
  warnShare: 0.8,        // shu ulushga yetganda egasiga xabar (kuniga bir marta)
  userMax: 2,            // bir foydalanuvchining bir vaqtdagi ishlari
  freeMax: 1,            // hali toʻlov qilmagan foydalanuvchi
  siteMax: 20,           // butun sayt boʻyicha
  maxBytes: 8 * 2 ** 20, // kirish rasmi ≤ 8 MB
  maxRefs: 4,
  uploadTtl: 300,        // presigned PUT — 5 daqiqa
  getTtl: 3600,          // brauzer va fal uchun GET havolasi — 1 soat
  maxOutBytes: 40 * 2 ** 20,
  sweepMs: 5 * 60e3,     // «osilgan» ishlarni tekshirish oraligʻi
  staleMin: 2,           // webhook shu daqiqada kelmasa — fal dan soʻraladi
  stuckMin: 30,          // shundan keyin ham natija yoʻq — xato, tanga qaytadi
  keepInDays: 30,        // kirish rasmlari
  keepOutDays: 30,       // natija: bepul foydalanuvchi
  keepOutPaidDays: 365,  // natija: toʻlov qilgan (tasdiqlanmagan — egasi qarori kutilmoqda)
});
const TYPES = new Set(['image/webp', 'image/png']);
const ROLES_IN = new Set(['input', 'ref', 'depth', 'mask']);
const OFF_MSG = 'Render vaqtincha ishlamayapti';

class RenderError extends Error {
  constructor(status, code, msg, extra) { super(msg); this.status = status; this.code = code; Object.assign(this, extra); }
}

/** Eskiz: 512 px WebP (sharp, bir vaqtda ≤ 2 ta — VPS xotirasini asrash) */
let sharpP = null, busyThumbs = 0;
const waiters = [];
export async function defaultThumb(input) {
  if (busyThumbs >= 2) await new Promise((ok) => waiters.push(ok));
  busyThumbs++;
  try {
    sharpP ??= import('sharp').then((m) => m.default);
    const sharp = await sharpP;
    const t = sharp({ limitInputPixels: 80e6 }).rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 });
    if (Buffer.isBuffer(input)) t.end(input); else Readable.fromWeb(input).pipe(t);
    const { data, info } = await t.toBuffer({ resolveWithObject: true });
    return { buf: data, w: info.width, h: info.height };
  } finally { busyThumbs--; waiters.shift()?.(); }
}

const days = (d, n) => new Date(d.getTime() + n * 864e5);

/**
 * @param {object} o
 * @param {object|null} o.cfg  { fal, r2, hookUrl, thumb?, notify?, fetchImpl?, ...RENDER_DEFAULTS } — null: render oʻchiq
 */
export function registerRender(app, { db, wallet, requireUser, optionalUser, isOwner, limited, cfg, now = () => new Date() }) {
  const c = cfg?.fal && cfg?.r2 ? { ...RENDER_DEFAULTS, ...cfg } : null;
  const fetchImpl = c?.fetchImpl ?? globalThis.fetch;
  const thumb = c?.thumb ?? defaultThumb;
  const pending = new Set();
  let warnedDay = '';

  const fail = (reply, e) => reply.code(e.status).send({ error: e.code, message: e.message, ...(e.need != null ? { need: e.need, balance: e.balance } : {}) });
  const guard = (fn) => async (req, reply) => {
    try {
      if (!c) throw new RenderError(503, 'render_off', OFF_MSG);
      return await fn(req, reply);
    } catch (e) {
      if (e instanceof RenderError) return fail(reply, e);
      if (e instanceof PromptError) return fail(reply, new RenderError(400, e.code, e.message));
      throw e; // WalletError (insufficient → 402) — umumiy ishlovchida
    }
  };
  const notify = (subject, text) => { try { void Promise.resolve(c?.notify?.(subject, text)).catch(() => {}); } catch { /* xabar ixtiyoriy */ } };
  const prefixOf = (userId) => `in/u${userId}/`;
  const paidUser = async (userId) => (await db.query(`SELECT 1 FROM orders WHERE user_id = $1 AND state = 'paid' LIMIT 1`, [userId])).rows.length > 0;

  async function spentTodayMicro() {
    const { rows } = await db.query(`SELECT COALESCE(SUM(usd_micro), 0)::bigint AS s FROM render_jobs WHERE created_at >= $1 AND status NOT IN ('failed', 'refunded')`, [dayStart(now())]);
    return Number(rows[0].s);
  }

  app.get('/render/config', async (req) => {
    let u = null;
    try { u = await optionalUser(req); } catch { /* kirmagan */ }
    return {
      enabled: !!c, message: c ? null : OFF_MSG,
      // sinov modellari (lab) — faqat egasiga koʻrinadi
      engines: Object.fromEntries(Object.entries(ENGINES).filter(([, e]) => !e.lab || (u && isOwner(u))).map(([k, e]) => [k, { coins: RENDER_COINS[e.item], ...(e.lab ? { lab: true } : {}) }])),
      maxBytes: c?.maxBytes ?? RENDER_DEFAULTS.maxBytes, maxSide: 2048, maxRefs: RENDER_DEFAULTS.maxRefs, types: [...TYPES],
      ...(u ? { owner: isOwner(u), parallel: isOwner(u) || await paidUser(u.id) ? (c?.userMax ?? RENDER_DEFAULTS.userMax) : (c?.freeMax ?? RENDER_DEFAULTS.freeMax) } : {}),
    };
  });

  /** R2 ga yuklash havolasi: faqat WebP/PNG, ≤ 8 MB, 5 daqiqa */
  app.post('/render/upload-url', guard(async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    if (limited(`renup:${u.id}`, 30)) throw new RenderError(429, 'rate', 'juda koʻp soʻrov');
    const { type, bytes } = req.body ?? {};
    if (!TYPES.has(type)) throw new RenderError(400, 'bad_type', 'faqat WebP yoki PNG');
    if (!Number.isInteger(bytes) || bytes <= 0 || bytes > c.maxBytes) throw new RenderError(413, 'too_big', `rasm ${Math.round(c.maxBytes / 2 ** 20)} MB dan oshmasin`);
    const key = `${prefixOf(u.id)}${randomUUID()}.${type === 'image/png' ? 'png' : 'webp'}`;
    const p = c.r2.presignPut(key, { type, bytes, expires: c.uploadTtl });
    return { key, url: p.url, method: 'PUT', headers: p.headers, expiresIn: c.uploadTtl };
  }));

  /** Ish yaratish */
  app.post('/render/jobs', guard(async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    if (limited(`renjob:${u.id}`, 12)) throw new RenderError(429, 'rate', 'juda koʻp soʻrov');
    const b = req.body ?? {};
    let engine = String(b.engine ?? '');
    const own = isOwner(u);
    if (!ENGINES[engine] || (ENGINES[engine].lab && !own)) throw new RenderError(400, 'bad_engine', 'dvigatel notoʻgʻri');

    // kirishlar: faqat shu foydalanuvchi yuklagan kalitlar
    const pre = prefixOf(u.id);
    const inputs = [{ role: 'input', key: b.input?.key, w: b.input?.w, h: b.input?.h }, ...(Array.isArray(b.refs) ? b.refs : []).map((r) => ({ role: 'ref', key: r?.key, refRole: r?.role }))];
    if (inputs.length - 1 > c.maxRefs) throw new RenderError(400, 'bad_refs', `referens ${c.maxRefs} tadan koʻp emas`);
    for (const x of inputs) {
      if (typeof x.key !== 'string' || !x.key.startsWith(pre) || !/^[\w/.-]{8,200}$/.test(x.key) || x.key.includes('..')) throw new RenderError(400, 'bad_input', 'kirish rasmi notoʻgʻri');
      if (x.role === 'ref' && !REF_ROLES.includes(x.refRole)) throw new RenderError(400, 'bad_refs', 'referens roli notoʻgʻri');
    }
    const prompt = compilePrompt({ subj: b.subj, style: b.style || '', fid: b.fid, refs: inputs.slice(1).map((x) => x.refRole), extra: b.extra, facts: b.facts });
    const source = ['mr', 'joy', 'ks', 'chz', 'fayl', 'natija'].includes(b.source) ? b.source : 'fayl';
    const project = typeof b.project === 'string' && /^[\w-]{1,64}$/.test(b.project) ? b.project : null;
    // brauzerdagi manba belgisi (IndexedDB dagi asos rasm id si) — tarixni shu asosga bogʻlash uchun
    const tag = typeof b.tag === 'string' && /^[\w-]{1,40}$/.test(b.tag) ? b.tag : null;

    // R2 da bormi, turi va hajmi toʻgʻrimi (brauzer imzodan tashqari narsa yuklay olmaydi, lekin yuklamagan boʻlishi mumkin)
    for (const x of inputs) {
      const hd = await c.r2.head(x.key);
      if (!hd) throw new RenderError(400, 'upload_missing', 'rasm yuklanmagan — qayta urinib koʻring');
      if (hd.bytes > c.maxBytes || (hd.type && !TYPES.has(hd.type))) throw new RenderError(400, 'bad_input', 'kirish rasmi notoʻgʻri');
      x.bytes = hd.bytes;
    }

    // kunlik $ chegarasi: Pro sigʻmasa — Tez; Tez ham sigʻmasa — rad
    const spent = await spentTodayMicro(), cap = c.dailyUsd * 1e6;
    let downgraded = false;
    if (spent + ENGINES[engine].usd * 1e6 > cap) {
      if (engine !== 'fast' && spent + ENGINES.fast.usd * 1e6 <= cap) { engine = 'fast'; downgraded = true; }
      else {
        notify('Render: kunlik chegara tugadi', `Bugungi fal xarajati $${(spent / 1e6).toFixed(2)} (chegara $${c.dailyUsd}). Yangi renderlar ertaga ochiladi.`);
        throw new RenderError(503, 'render_budget', 'bugungi render chegarasi tugadi — ertaga urinib koʻring');
      }
    }
    const usdMicro = Math.round(ENGINES[engine].usd * 1e6);
    const coins = own ? 0 : RENDER_COINS[ENGINES[engine].item];
    const max = own || await paidUser(u.id) ? c.userMax : c.freeMax;
    const t = now();

    // parallel cheklov + hold + ish qatori — bitta tranzaksiyada (foydalanuvchi qatori qulflanadi)
    const job = await db.tx(async (q) => {
      await q.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [u.id]);
      const a = await q.query(`SELECT COUNT(*) FILTER (WHERE user_id = $1)::int AS mine, COUNT(*)::int AS all FROM render_jobs WHERE status IN ('queued', 'running')`, [u.id]);
      if (a.rows[0].mine >= max) throw new RenderError(429, 'parallel', max === 1 ? 'oldingi render tugashini kuting' : `bir vaqtda ${max} tadan koʻp render boʻlmaydi — oldingisi tugashini kuting`, { limit: max });
      if (a.rows[0].all >= c.siteMax) throw new RenderError(503, 'busy', 'render navbati band — bir daqiqadan keyin urinib koʻring');
      const params = { subj: b.subj, style: b.style || '', fid: b.fid ?? 'qatiy', refs: inputs.slice(1).map((x) => x.refRole), extra: b.extra ? String(b.extra).slice(0, 400) : '', w: Number(b.input?.w) || null, h: Number(b.input?.h) || null, project, tag, downgraded, asked: String(b.engine) };
      const r = await q.query(
        `INSERT INTO render_jobs (user_id, engine, source, params, prompt, coins, owner, usd_micro, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [u.id, engine, source, JSON.stringify(params), prompt, coins, own, usdMicro, t]);
      const id = r.rows[0].id;
      if (coins > 0) await wallet.hold(u.id, { coins, reason: 'render', ref: `render:${id}`, note: engine }, q);
      for (const x of inputs) {
        await q.query(`INSERT INTO render_assets (job_id, role, r2_key, w, h, bytes, meta, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, x.role, x.key, Number.isInteger(x.w) ? x.w : null, Number.isInteger(x.h) ? x.h : null, x.bytes, x.refRole ? JSON.stringify({ role: x.refRole }) : null, days(t, c.keepInDays)]);
      }
      return { id: String(id), params };
    });

    // fal navbatiga
    try {
      // bitta rasm qabul qiladigan model (refs: false) — faqat asos rasm
      const images = (ENGINES[engine].refs === false ? inputs.slice(0, 1) : inputs).map((x) => c.r2.presignGet(x.key, c.getTtl));
      const w = Number(b.input?.w), h = Number(b.input?.h);
      const s = await c.fal.submit(engine, { prompt, images, aspect: nearAR(w, h), w: Number.isFinite(w) ? w : 0, h: Number.isFinite(h) ? h : 0 }, c.hookUrl);
      await db.query(`UPDATE render_jobs SET status = 'running', fal_request_id = $2, submitted_at = $3, params = params || $4::jsonb WHERE id = $1`,
        [job.id, s.request_id, now(), JSON.stringify({ fal: { status_url: s.status_url, response_url: s.response_url } })]);
    } catch (e) {
      const kind = e instanceof FalError ? e.kind : 'server';
      req.log.warn({ render: { job: job.id, kind, msg: e.message } }, 'render: fal ga yuborilmadi');
      await failJob(job.id, `submit:${kind}`);
      if (kind === 'balance') notify('Render: fal balansi tugadi', 'fal.ai hisobida mablagʻ qolmadi — renderlar toʻxtadi, tangalar qaytarildi. Balansni toʻldiring.');
      throw new RenderError(503, 'render_busy', 'render xizmati javob bermadi — tanga qaytarildi, birozdan keyin urinib koʻring');
    }

    const after = await spentTodayMicro();
    if (after >= cap * c.warnShare && warnedDay !== dayStart(now()).toISOString()) {
      warnedDay = dayStart(now()).toISOString();
      notify('Render: kunlik chegaraga yaqin', `Bugungi fal xarajati $${(after / 1e6).toFixed(2)} — chegara $${c.dailyUsd} ning ${Math.round(c.warnShare * 100)} %. Chegarada Pro → Tez ga oʻtadi.`);
    }
    return { id: job.id, status: 'running', engine, coins, downgraded, balance: await wallet.balance(u.id) };
  }));

  /** Ishni yakunlash huquqi: webhook va tekshiruvchi bir vaqtda kelsa — faqat bittasi bajaradi */
  async function claim(id) {
    const r = await db.query(
      `UPDATE render_jobs SET claimed_at = $2 WHERE id = $1 AND status IN ('queued', 'running') AND (claimed_at IS NULL OR claimed_at < $3) RETURNING *`,
      [id, now(), new Date(now().getTime() - 10 * 60e3)]);
    return r.rows[0] ?? null;
  }
  async function failJob(id, err) {
    const r = await db.query(`UPDATE render_jobs SET status = 'failed', err = $2, finished_at = $3 WHERE id = $1 AND status IN ('queued', 'running') RETURNING coins`, [id, String(err).slice(0, 200), now()]);
    if (!r.rows.length) return;
    if (r.rows[0].coins > 0) {
      const rel = await wallet.release(`render:${id}`, String(err).slice(0, 60));
      if (rel.released > 0) await db.query(`UPDATE render_jobs SET status = 'refunded' WHERE id = $1`, [id]);
    }
  }

  /** Natijani R2 ga koʻchirish, eskiz, CAPTURE. output — fal natijasi ({ images: [...] }) */
  async function finish(job, output) {
    const img = output?.images?.[0];
    if (!img?.url) return failJob(job.id, 'no_image');
    try {
      const res = await fetchImpl(img.url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok || !res.body) throw new Error(`natija yuklanmadi: ${res.status}`);
      const type = (res.headers.get('content-type') || img.content_type || 'image/png').split(';')[0];
      if (!/^image\/(png|jpeg|webp)$/.test(type)) throw new Error(`natija turi: ${type}`);
      const ext = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
      const len = Number(res.headers.get('content-length')) || 0;
      if (len > c.maxOutBytes) throw new Error('natija juda katta');
      const outKey = `out/u${job.user_id}/${job.id}.${ext}`, thKey = `th/u${job.user_id}/${job.id}.webp`;
      let bytes, th;
      if (len > 0) {
        // stream: bitta oqim R2 ga, ikkinchisi eskizga — VPS diskiga ham, xotirasiga ham toʻliq rasm yozilmaydi
        const [a, z] = res.body.tee();
        [, th] = await Promise.all([c.r2.put(outKey, a, { type, bytes: len }), thumb(z)]);
        bytes = len;
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > c.maxOutBytes) throw new Error('natija juda katta');
        await c.r2.put(outKey, buf, { type, bytes: buf.length });
        th = await thumb(buf); bytes = buf.length;
      }
      await c.r2.put(thKey, th.buf, { type: 'image/webp', bytes: th.buf.length });
      const t = now(), keep = job.owner || await paidUser(job.user_id) ? c.keepOutPaidDays : c.keepOutDays;
      const ok = await db.tx(async (q) => {
        const r = await q.query(`UPDATE render_jobs SET status = 'done', finished_at = $2, err = NULL WHERE id = $1 AND status IN ('queued', 'running') RETURNING id`, [job.id, t]);
        if (!r.rows.length) return false;
        await q.query(`INSERT INTO render_assets (job_id, role, r2_key, w, h, bytes, expires_at) VALUES ($1, 'out', $2, $3, $4, $5, $6), ($1, 'thumb', $7, $8, $9, $10, $6)`,
          [job.id, outKey, Number.isInteger(img.width) ? img.width : null, Number.isInteger(img.height) ? img.height : null, bytes, days(t, keep), thKey, th.w, th.h, th.buf.length]);
        return true;
      });
      if (ok && job.coins > 0) await wallet.capture(`render:${job.id}`);
    } catch (e) {
      app.log.warn({ render: { job: job.id, msg: e.message } }, 'render: natija saqlanmadi');
      await failJob(job.id, `store:${String(e.message).slice(0, 80)}`);
    }
  }
  const track = (p) => { pending.add(p); p.finally(() => pending.delete(p)); return p; };

  /** fal webhook: xom tana kerak (imzo) — alohida kontekstda JSON parser Buffer qaytaradi */
  app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer', bodyLimit: 256 * 1024 }, (req, body, done) => done(null, body));
    scope.post('/render/hook', { logLevel: 'warn' }, async (req, reply) => {
      if (!c) return reply.code(503).send({ error: 'render_off' });
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : '');
      let okSig = false;
      try { okSig = await c.fal.verifyWebhook(req.headers, raw); } catch (e) { req.log.warn({ render: { msg: e.message } }, 'render: JWKS'); return reply.code(503).send({ error: 'jwks' }); }
      if (!okSig) return reply.code(401).send({ error: 'signature' });
      let m; try { m = JSON.parse(raw.toString('utf8')); } catch { return reply.code(400).send({ error: 'bad_json' }); }
      const rid = String(m?.request_id ?? req.headers['x-fal-webhook-request-id'] ?? '');
      const { rows } = await db.query(`SELECT id FROM render_jobs WHERE fal_request_id = $1`, [rid]);
      if (!rows.length) return reply.code(200).send({ ok: true, unknown: true });   // fal qayta yubormasin
      const job = await claim(rows[0].id);
      if (!job) return reply.code(200).send({ ok: true, repeat: true });
      // fal ga darhol javob (u ~15 s kutadi), qolgani fonda; tekshiruvchi zaxira
      track(m.status === 'OK' && !m.payload_error ? finish(job, m.payload) : failJob(job.id, `fal:${String(m.error ?? m.payload_error ?? 'error').slice(0, 120)}`));
      return reply.code(200).send({ ok: true });
    });
  });

  /** «Osilgan» ishlar: webhook kelmagan yoki yoʻqolgan — fal dan soʻraladi */
  async function sweep() {
    if (!c) return { checked: 0 };
    const t = now();
    const { rows } = await db.query(
      `SELECT id FROM render_jobs WHERE status IN ('queued', 'running') AND created_at < $1 AND (claimed_at IS NULL OR claimed_at < $2) ORDER BY id LIMIT 50`,
      [new Date(t.getTime() - c.staleMin * 60e3), new Date(t.getTime() - 10 * 60e3)]);
    let checked = 0;
    for (const { id } of rows) {
      const job = await claim(id); if (!job) continue;
      checked++;
      const age = (t.getTime() - new Date(job.created_at).getTime()) / 60e3;
      if (job.status === 'queued' || !job.fal_request_id) { if (age > 5) await failJob(id, 'never_submitted'); else await db.query(`UPDATE render_jobs SET claimed_at = NULL WHERE id = $1`, [id]); continue; }
      const f = job.params?.fal ?? {};
      try {
        const s = await c.fal.status(job.engine, job.fal_request_id, f.status_url);
        if (s?.status === 'COMPLETED') {
          try { await finish(job, await c.fal.result(job.engine, job.fal_request_id, f.response_url)); }
          catch (e) { if (e instanceof FalError && e.status >= 400) await failJob(id, `fal:${e.status}`); else throw e; }
        } else if (age > c.stuckMin) await failJob(id, 'timeout');
        else await db.query(`UPDATE render_jobs SET claimed_at = NULL WHERE id = $1`, [id]);
      } catch (e) {
        app.log.warn({ render: { job: id, msg: e.message } }, 'render: holat soʻralmadi');
        if (age > c.stuckMin) await failJob(id, 'timeout'); else await db.query(`UPDATE render_jobs SET claimed_at = NULL WHERE id = $1`, [id]);
      }
    }
    return { checked };
  }

  /** Brauzerga ish koʻrinishi: natija va eskiz — qisqa muddatli GET havolalari */
  async function view(job, assets, full = true) {
    const a = (role) => assets.find((x) => x.role === role);
    const out = a('out'), th = a('thumb');
    return {
      id: String(job.id), status: job.status, engine: job.engine, source: job.source, coins: job.coins,
      created: job.created_at, finished: job.finished_at, downgraded: !!job.params?.downgraded,
      params: { subj: job.params?.subj, style: job.params?.style, fid: job.params?.fid, refs: job.params?.refs?.length ?? 0 }, tag: job.params?.tag ?? null,
      ...(job.status === 'failed' || job.status === 'refunded' ? { error: 'render bajarilmadi' } : {}),
      ...(th ? { thumb: c.r2.presignGet(th.r2_key, c.getTtl) } : {}),
      ...(full && out ? { out: c.r2.presignGet(out.r2_key, c.getTtl), w: out.w, h: out.h, prompt: job.prompt } : {}),
    };
  }

  app.get('/render/jobs/:id', guard(async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new RenderError(400, 'bad_id', 'ish notoʻgʻri');
    const { rows } = await db.query(`SELECT * FROM render_jobs WHERE id = $1 AND user_id = $2`, [id, u.id]);
    if (!rows.length) throw new RenderError(404, 'not_found', 'ish topilmadi');
    const as = await db.query(`SELECT role, r2_key, w, h FROM render_assets WHERE job_id = $1`, [id]);
    reply.header('cache-control', 'no-store');
    return view(rows[0], as.rows, true);
  }));

  app.get('/render/history', guard(async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    const limit = Math.min(60, Math.max(1, Number(req.query?.limit) || 30));
    const { rows } = await db.query(`SELECT * FROM render_jobs WHERE user_id = $1 ORDER BY id DESC LIMIT $2`, [u.id, limit]);
    const ids = rows.map((r) => r.id);
    const as = ids.length ? (await db.query(`SELECT job_id, role, r2_key, w, h FROM render_assets WHERE job_id = ANY($1::bigint[]) AND role IN ('thumb', 'out')`, [ids])).rows : [];
    reply.header('cache-control', 'no-store');
    return { items: await Promise.all(rows.map((j) => view(j, as.filter((a) => String(a.job_id) === String(j.id)), false))) };
  }));

  let timer = null;
  if (c && c.sweepMs > 0 && c.sweep !== false) {
    timer = setInterval(() => { void sweep().catch((e) => app.log.error(e)); }, c.sweepMs);
    timer.unref?.();
  }
  app.addHook('onClose', async () => { if (timer) clearInterval(timer); await Promise.allSettled([...pending]); });
  app.decorate('render', { sweep, flush: () => Promise.allSettled([...pending]), enabled: !!c });
}

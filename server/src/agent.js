/* Agent «Maslahatchi» — model vositachisi (1-bosqich, 13.11.2026).
   Sikl brauzerda: brauzer suhbatni (matn, tool_use, tool_result) yuboradi, server tizim yoʻriqnomasi va buyruq
   sxemalarini oʻzi qoʻshib, modelni chaqiradi. Kalit faqat serverdagi .env da (ANTHROPIC_API_KEY); boʻlmasa agent oʻchiq.
   Pul: yurish boshida (/agent/run) tanga OLDINDAN yechiladi yoki haftalik bepul savol ishlatiladi; keyingi
   qadamlar shu yurish ichida bepul, lekin qadam va token chegarasi bor. Birinchi qadam model xatosi bilan
   tugasa — tanga qaytariladi. Savol matni va loyiha mazmuni bazaga yozilmaydi, faqat hisob (token, $, tanga). */
import { randomUUID } from 'node:crypto';
import { SERVICES, SCENARIOS, SYSTEM_RULES, systemFor, LANGS } from './agent-tools.js';
import { AGENT_COINS, AGENT_FREE_PER_WEEK } from './prices.js';
import { weekKey } from './wallet.js';
import { lookup } from './normlib.js';

/** $ / 1 mln token (in, out, kesh oʻqish, kesh yozish). Tekshirilmagan — rasmiy narxlar sahifasi bilan solishtiring; .env da AGENT_PRICES bilan almashtiriladi. */
export const DEFAULT_PRICES = Object.freeze({
  'claude-sonnet-5-5': { in: 2, out: 10, cr: 0.2, cw: 2.5 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cr: 0.01, cw: 0.125 },
});
const FALLBACK_PRICE = { in: 5, out: 25, cr: 0.5, cw: 6.25 }; // nomaʼlum model — ehtiyot uchun qimmat hisoblanadi

export const AGENT_DEFAULTS = Object.freeze({
  base: 'https://api.anthropic.com',
  models: { short: 'claude-haiku-5-5', long: 'claude-sonnet-5-5' },
  maxTokens: { short: 1024, long: 2500 },
  services: ['mr'],
  freeDailyUsd: 2,     // bepul savollar uchun kunlik umumiy byudjet
  dailyUsd: 20,        // hamma agent chaqiruvlari uchun kunlik qatʼiy chegara (kalitni himoyalash)
  maxSteps: 10,
  maxInTok: 200_000,
  runTtlMin: 30,
  timeoutMs: 60_000,
  retryMs: [400, 1500], // tarmoq/429/5xx da qayta urinishlar orasidagi kutish
});

export const costMicro = (model, u = {}, prices = DEFAULT_PRICES) => {
  const p = prices[model] ?? FALLBACK_PRICE;
  return Math.ceil((u.input_tokens ?? 0) * p.in + (u.output_tokens ?? 0) * p.out
    + (u.cache_read_input_tokens ?? 0) * p.cr + (u.cache_creation_input_tokens ?? 0) * p.cw);
};

/** Toshkent (UTC+5) kunining boshi — UTC vaqtda */
export function dayStart(d) {
  const t = new Date(d.getTime() + 5 * 3600e3);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - 5 * 3600e3);
}

class AgentError extends Error {
  constructor(status, code, msg) { super(msg); this.status = status; this.code = code; }
}

const MAX_BODY_CHARS = 120_000;
/** Suhbatni tozalash: faqat ruxsat etilgan bloklar va maydonlar; buyruq nomi — shu xizmat roʻyxatidan */
export function sanitizeMessages(messages, toolNames) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 60) throw new AgentError(400, 'bad_messages', 'suhbat notoʻgʻri');
  if (JSON.stringify(messages).length > MAX_BODY_CHARS) throw new AgentError(413, 'too_long', 'suhbat juda uzun');
  const text = (t, max = 20_000) => {
    if (typeof t !== 'string' || !t.trim() || t.length > max) throw new AgentError(400, 'bad_messages', 'matn notoʻgʻri');
    return t;
  };
  const out = messages.map((m, i) => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) throw new AgentError(400, 'bad_messages', 'rol notoʻgʻri');
    if (i === 0 && m.role !== 'user') throw new AgentError(400, 'bad_messages', 'suhbat foydalanuvchidan boshlanadi');
    if (typeof m.content === 'string') return { role: m.role, content: [{ type: 'text', text: text(m.content) }] };
    if (!Array.isArray(m.content) || !m.content.length || m.content.length > 30) throw new AgentError(400, 'bad_messages', 'blok notoʻgʻri');
    return {
      role: m.role,
      content: m.content.map((b) => {
        if (b?.type === 'text') return { type: 'text', text: text(b.text) };
        if (b?.type === 'tool_use' && m.role === 'assistant') {
          if (!toolNames.has(b.name)) throw new AgentError(400, 'bad_tool', `nomaʼlum buyruq: ${b.name}`);
          if (typeof b.id !== 'string' || !b.input || typeof b.input !== 'object' || Array.isArray(b.input)) throw new AgentError(400, 'bad_messages', 'tool_use notoʻgʻri');
          return { type: 'tool_use', id: b.id, name: b.name, input: b.input };
        }
        if (b?.type === 'tool_result' && m.role === 'user') {
          if (typeof b.tool_use_id !== 'string') throw new AgentError(400, 'bad_messages', 'tool_result notoʻgʻri');
          const content = typeof b.content === 'string' ? text(b.content, 40_000) : JSON.stringify(b.content ?? null).slice(0, 40_000);
          return { type: 'tool_result', tool_use_id: b.tool_use_id, content, ...(b.is_error ? { is_error: true } : {}) };
        }
        throw new AgentError(400, 'bad_messages', 'blok turi notoʻgʻri');
      }),
    };
  });
  if (out.at(-1).role !== 'user') throw new AgentError(400, 'bad_messages', 'oxirgi xabar foydalanuvchidan boʻlishi kerak');
  // suhbat boshini keshlash: oxirgi blokka belgi (tizim + buyruqlar + suhbat = 3 ta belgi, chegara 4)
  const last = out.at(-1).content;
  last[last.length - 1] = { ...last[last.length - 1], cache_control: { type: 'ephemeral' } };
  return out;
}

/**
 * @param {object} o
 * @param {object|null} o.cfg  { apiKey, fetchImpl?, base?, models?, prices?, services?, freeDailyUsd?, dailyUsd?, ... } — null: agent oʻchiq
 */
export function registerAgent(app, { db, wallet, requireUser, optionalUser, isOwner, limited, cfg, now = () => new Date() }) {
  const c = cfg?.apiKey ? { ...AGENT_DEFAULTS, ...cfg, models: { ...AGENT_DEFAULTS.models, ...cfg.models }, prices: { ...DEFAULT_PRICES, ...cfg.prices } } : null;
  const fetchImpl = c?.fetchImpl ?? globalThis.fetch;
  const enabledSvc = new Set((c?.services ?? []).filter((s) => SERVICES[s]));
  const toolsOf = new Map(Object.entries(SERVICES).map(([k, s]) => [k, s.tools.map((t, i, a) => (i === a.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t))]));
  const namesOf = new Map(Object.entries(SERVICES).map(([k, s]) => [k, new Set(s.tools.map((t) => t.name))]));

  const fail = (reply, e) => reply.code(e.status).send({ error: e.code, message: e.message });

  async function freeLeft(userId) {
    const { rows } = await db.query(`SELECT used FROM agent_free WHERE user_id = $1 AND week = $2`, [userId, weekKey(now())]);
    return Math.max(0, AGENT_FREE_PER_WEEK - (rows[0]?.used ?? 0));
  }
  async function spentToday(onlyFree) {
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(cost_micro), 0)::bigint AS s FROM agent_runs WHERE created_at >= $1 ${onlyFree ? 'AND free AND NOT owner' : ''}`, [dayStart(now())]);
    return Number(rows[0].s);
  }

  app.get('/agent/config', async (req) => {
    const base = {
      enabled: !!c && enabledSvc.size > 0,
      services: [...enabledSvc],
      scenarios: Object.fromEntries(Object.entries(SCENARIOS).filter(([, s]) => enabledSvc.has(s.svc)).map(([k, s]) => [k, { ...s, coins: AGENT_COINS[s.tier] }])),
      freePerWeek: AGENT_FREE_PER_WEEK,
      maxSteps: c?.maxSteps ?? AGENT_DEFAULTS.maxSteps,
      langs: Object.keys(LANGS),
    };
    let u = null;
    try { u = await optionalUser(req); } catch { /* kirmagan */ }
    return u ? { ...base, freeLeft: await freeLeft(u.id), owner: isOwner(u) } : base;
  });

  /** Band matni (kutubxonadan, soʻzma-soʻz) — ochiq qonun matni; kirish talab qilinmaydi, IP boʻyicha cheklov */
  app.get('/agent/clause', async (req, reply) => {
    if (limited(`clause:${req.ip}`, 60)) return reply.code(429).send({ error: 'rate', message: 'juda koʻp soʻrov' });
    reply.header('cache-control', 'public, max-age=3600');
    return lookup(req.query?.doc, req.query?.clause);
  });

  /** Yurish boshlash: tanga yoki bepul savol shu yerda hal boʻladi */
  app.post('/agent/run', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    try {
      if (!c) throw new AgentError(503, 'agent_off', 'agent hozircha yoqilmagan');
      const scenario = String(req.body?.scenario ?? '');
      const sc = SCENARIOS[scenario];
      if (!sc || !enabledSvc.has(sc.svc)) throw new AgentError(400, 'bad_scenario', 'bu ssenariy yoqilmagan');
      if (limited(`agent:${u.id}`, 10)) throw new AgentError(429, 'rate', 'juda koʻp soʻrov');
      if (await spentToday(false) >= c.dailyUsd * 1e6) throw new AgentError(503, 'agent_budget', 'bugungi agent chegarasi tugadi — ertaga urinib koʻring');
      const own = isOwner(u);
      const coins = AGENT_COINS[sc.tier];
      let free = own, charged = 0, balance = null, capped = false;

      if (!own && sc.tier === 'short' && await spentToday(true) < c.freeDailyUsd * 1e6) {
        free = await db.tx(async (q) => {
          const wk = weekKey(now());
          await q.query(`INSERT INTO agent_free (user_id, week, used) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`, [u.id, wk]);
          const { rows } = await q.query(`SELECT used FROM agent_free WHERE user_id = $1 AND week = $2 FOR UPDATE`, [u.id, wk]);
          if (rows[0].used >= AGENT_FREE_PER_WEEK) return false;
          await q.query(`UPDATE agent_free SET used = used + 1 WHERE user_id = $1 AND week = $2`, [u.id, wk]);
          return true;
        });
      }
      const ref = randomUUID();
      if (!free) {
        const r = await wallet.spend(u.id, { coins, reason: 'agent', ref, project: req.body?.project || undefined, areaHa: Number(req.body?.areaHa) || 0, note: scenario });
        charged = r.charged; balance = r.balance; capped = r.capped;
      }
      const { rows } = await db.query(
        `INSERT INTO agent_runs (user_id, svc, scenario, tier, free, owner, coins, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [u.id, sc.svc, scenario, sc.tier, free, own, charged, now()]);
      return { run: String(rows[0].id), free, charged, capped, balance: balance ?? await wallet.balance(u.id), freeLeft: await freeLeft(u.id), maxSteps: c.maxSteps, ref };
    } catch (e) {
      if (e instanceof AgentError) return fail(reply, e);
      throw e; // WalletError (insufficient → 402) umumiy ishlovchida
    }
  });

  /** Bitta model qadami */
  app.post('/agent/step', { bodyLimit: 124 * 1024 }, async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    try {
      if (!c) throw new AgentError(503, 'agent_off', 'agent hozircha yoqilmagan');
      if (limited(`agentstep:${u.id}`, 40)) throw new AgentError(429, 'rate', 'juda koʻp soʻrov');
      const id = Number(req.body?.run);
      if (!Number.isSafeInteger(id) || id <= 0) throw new AgentError(400, 'bad_run', 'yurish notoʻgʻri');
      const { rows } = await db.query(`SELECT * FROM agent_runs WHERE id = $1 AND user_id = $2`, [id, u.id]);
      const run = rows[0];
      if (!run) throw new AgentError(404, 'not_found', 'yurish topilmadi');
      if (run.status !== 'open') throw new AgentError(409, 'run_closed', 'yurish yakunlangan — yangi savol bering');
      if (now().getTime() - new Date(run.created_at).getTime() > c.runTtlMin * 60e3) throw new AgentError(409, 'run_expired', 'yurish muddati tugagan — yangi savol bering');
      if (!enabledSvc.has(run.svc)) throw new AgentError(400, 'bad_scenario', 'bu xizmat yoqilmagan');
      const messages = sanitizeMessages(req.body?.messages, namesOf.get(run.svc));
      const lang = LANGS[req.body?.lang] ? req.body.lang : 'uz';

      // qadam hisobi atomik: bir vaqtda kelgan soʻrovlar chegaradan oshira olmaydi
      const st = await db.query(`UPDATE agent_runs SET steps = steps + 1 WHERE id = $1 AND status = 'open' AND steps < $2 RETURNING steps`, [id, c.maxSteps]);
      if (!st.rows.length) {
        await db.query(`UPDATE agent_runs SET status = 'limit' WHERE id = $1 AND status = 'open'`, [id]);
        throw new AgentError(409, 'run_limit', 'qadamlar chegarasi tugadi');
      }
      const step = st.rows[0].steps;
      const model = c.models[run.tier];

      const body = JSON.stringify({
        model, max_tokens: c.maxTokens?.[run.tier] ?? AGENT_DEFAULTS.maxTokens[run.tier],
        system: [{ type: 'text', text: SYSTEM_RULES, cache_control: { type: 'ephemeral' } }, { type: 'text', text: systemFor(run.svc, lang) }],
        tools: toolsOf.get(run.svc),
        messages,
      });
      // Tarmoq uzilishi (masalan, eskirgan keep-alive ulanish) va 429/529/5xx — qisqa kutib qayta urinish
      const waits = c.retryMs ?? AGENT_DEFAULTS.retryMs;
      let res, data, cause;
      for (let a = 0; ; a++) {
        try {
          res = await fetchImpl(`${c.base}/v1/messages`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-api-key': c.apiKey, 'anthropic-version': '2023-06-01' },
            body,
            signal: AbortSignal.timeout(c.timeoutMs),
          });
          data = await res.json().catch(() => null);
        } catch (e) {
          res = null; cause = e?.cause?.code ?? e?.code ?? e?.name;
          data = { error: { type: e?.name === 'TimeoutError' ? 'timeout' : 'network' } };
        }
        const retry = data?.error?.type === 'network' || (res && (res.status === 429 || res.status === 529 || res.status >= 500));
        if (!retry || a >= waits.length) break;
        req.log.info({ agent: { run: id, step, attempt: a + 1, status: res?.status, cause } }, 'agent: qayta urinish');
        await new Promise((r) => setTimeout(r, waits[a]));
      }

      if (!res?.ok || !data?.content) {
        const kind = data?.error?.type ?? `http_${res?.status ?? 0}`;
        req.log.warn({ agent: { run: id, step, status: res?.status, kind, cause } }, 'agent: model xatosi');
        if (step === 1) {
          // birinchi qadamda natija yoʻq — tanga va bepul savol qaytariladi
          await db.query(`UPDATE agent_runs SET status = 'failed', err = $2 WHERE id = $1`, [id, kind]);
          if (run.coins > 0) await wallet.credit(u.id, run.coins, 'agent_refund', `run:${id}`, run.scenario);
          if (run.free && !run.owner) await db.query(`UPDATE agent_free SET used = GREATEST(0, used - 1) WHERE user_id = $1 AND week = $2`, [u.id, weekKey(new Date(run.created_at))]);
        } else await db.query(`UPDATE agent_runs SET steps = steps - 1 WHERE id = $1`, [id]);
        const busy = res && (res.status === 429 || res.status === 529 || res.status >= 500);
        // 1-qadamdan keyin tanga qaytarilmaydi (javobning bir qismi berilgan) — brauzer boshqa xabar koʻrsatadi
        if (step > 1) throw new AgentError(503, 'agent_interrupted', 'model javobni yakunlay olmadi — qayta yuboring');
        throw new AgentError(busy || !res ? 503 : 502, busy || !res ? 'agent_busy' : 'agent_upstream', 'model javob bermadi — birozdan keyin urinib koʻring');
      }

      const usage = data.usage ?? {};
      const inTok = (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
      const done = data.stop_reason !== 'tool_use';
      const upd = await db.query(
        `UPDATE agent_runs SET in_tok = in_tok + $2, out_tok = out_tok + $3, cost_micro = cost_micro + $4,
           status = CASE WHEN $5 THEN 'done' WHEN in_tok + $2 >= $6 THEN 'limit' ELSE status END
         WHERE id = $1 RETURNING status, steps`,
        [id, inTok, usage.output_tokens ?? 0, costMicro(model, usage, c.prices), done, c.maxInTok]);
      const status = upd.rows[0].status;
      // matn va buyruq chaqiruvlaridan boshqa bloklar (masalan, fikrlash) brauzerga yuborilmaydi
      const content = data.content.filter((b) => b.type === 'text' || b.type === 'tool_use').map((b) => (b.type === 'text' ? { type: 'text', text: b.text } : { type: 'tool_use', id: b.id, name: b.name, input: b.input }));
      return { content, stop: data.stop_reason, status, stepsLeft: Math.max(0, c.maxSteps - upd.rows[0].steps) };
    } catch (e) {
      if (e instanceof AgentError) return fail(reply, e);
      throw e;
    }
  });
}

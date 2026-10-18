/* Tanga hamyoni, toza eksport ruxsatnomasi va haftalik sinovlar.
   Balans — ledger yigʻindisi. Yechish foydalanuvchi qatorini qulflab (FOR UPDATE) bajariladi:
   bir vaqtda kelgan ikki soʻrov balansni minusga tushira olmaydi. */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { priceOf, TRIALS, TRIALS_PER_WEEK } from './prices.js';

export class WalletError extends Error {
  constructor(code, msg, extra) { super(msg); this.code = code; Object.assign(this, extra); }
}

export const TICKET_TTL_MIN = 15;

/** Toshkent vaqti (UTC+5) boʻyicha haftaning dushanbasi: '2026-10-19' */
export function weekKey(d) {
  const t = new Date(d.getTime() + 5 * 3600e3);
  const dow = (t.getUTCDay() + 6) % 7; // 0 = dushanba
  t.setUTCDate(t.getUTCDate() - dow);
  return t.toISOString().slice(0, 10);
}

export function makeWallet({ db, secret, now = () => new Date() }) {
  if (!secret || secret.length < 32) throw new Error('TICKET_SECRET kamida 32 belgi boʻlishi kerak');
  const sign = (s) => createHmac('sha256', secret).update(s).digest('base64url');

  async function balance(userId, q = db) {
    const { rows } = await q.query(`SELECT COALESCE(SUM(delta), 0)::int AS b FROM ledger WHERE user_id = $1`, [userId]);
    return rows[0].b;
  }

  /** Kirim (toʻlov, sovgʻa). (reason, ref) takrorlansa — ikkinchi marta yozilmaydi. */
  async function credit(userId, coins, reason, ref, note) {
    if (!Number.isInteger(coins) || coins <= 0) throw new WalletError('bad_amount', 'miqdor notoʻgʻri');
    const r = await db.query(
      `INSERT INTO ledger (user_id, delta, reason, ref, note) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, reason, ref) DO NOTHING RETURNING id`, [userId, coins, reason, ref, note ?? null]);
    return { applied: r.rows.length === 1, balance: await balance(userId) };
  }

  /** Tranzaksiya ichida yechish; yetmasa — WalletError('insufficient') */
  async function debitIn(q, userId, coins, reason, ref, note) {
    await q.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    const b = await balance(userId, q);
    if (b < coins) throw new WalletError('insufficient', 'tanga yetarli emas', { need: coins, balance: b });
    await q.query(`INSERT INTO ledger (user_id, delta, reason, ref, note) VALUES ($1, $2, $3, $4, $5)`,
      [userId, -coins, reason, ref, note ?? null]);
    return b - coins;
  }

  function makeTicket(userId, items, stateHash) {
    const body = Buffer.from(JSON.stringify({
      u: userId, i: items, h: stateHash, e: Math.floor(now().getTime() / 1000) + TICKET_TTL_MIN * 60,
    })).toString('base64url');
    return `${body}.${sign(body)}`;
  }

  /**
   * Toza eksport: narx serverda hisoblanadi, tanga yechiladi va imzolangan ruxsatnoma qaytadi.
   * Shu holatni (stateHash) shu fayllar toʻplamida qayta yuklash — bepul.
   */
  async function exportTicket(userId, { items, areaHa = 0, stateHash }) {
    if (typeof stateHash !== 'string' || !/^[a-f0-9]{16,64}$/.test(stateHash)) throw new WalletError('bad_state', 'loyiha holati xeshi notoʻgʻri');
    const p = priceOf(items, areaHa);
    const bundle = p.items.join('+');
    return db.tx(async (q) => {
      const prev = await q.query(`SELECT coins FROM exports WHERE user_id = $1 AND bundle = $2 AND state_hash = $3`, [userId, bundle, stateHash]);
      let charged = 0, bal;
      if (prev.rows.length) bal = await balance(userId, q);
      else {
        bal = await debitIn(q, userId, p.coins, 'export', `${bundle}@${stateHash}`, `k=${p.k}`);
        await q.query(`INSERT INTO exports (user_id, bundle, state_hash, coins) VALUES ($1, $2, $3, $4)`, [userId, bundle, stateHash, p.coins]);
        charged = p.coins;
      }
      return { ticket: makeTicket(userId, p.items, stateHash), price: p.coins, k: p.k, charged, balance: bal, repeat: !!prev.rows.length };
    });
  }

  /** Ruxsatnomani tekshirish (serverda DXF/IFC yasashdan oldin ham shu ishlatiladi) */
  function verifyTicket(ticket) {
    const [body, sig] = String(ticket ?? '').split('.');
    if (!body || !sig) return null;
    const a = Buffer.from(sig), b = Buffer.from(sign(body));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    let t; try { t = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
    if (!t || t.e * 1000 < now().getTime()) return null;
    return { userId: t.u, items: t.i, stateHash: t.h, expires: new Date(t.e * 1000) };
  }

  /** Ogʻir hisob: haftasiga 3 tasi bepul, keyin TRIALS narxi */
  async function useTrial(userId, kind, ref) {
    if (!(kind in TRIALS)) throw new WalletError('bad_kind', `nomaʼlum hisob turi: ${kind}`);
    const wk = weekKey(now());
    return db.tx(async (q) => {
      await q.query(`INSERT INTO trials (user_id, week, used) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`, [userId, wk]);
      const { rows } = await q.query(`SELECT used FROM trials WHERE user_id = $1 AND week = $2 FOR UPDATE`, [userId, wk]);
      if (rows[0].used < TRIALS_PER_WEEK) {
        await q.query(`UPDATE trials SET used = used + 1 WHERE user_id = $1 AND week = $2`, [userId, wk]);
        return { free: true, left: TRIALS_PER_WEEK - rows[0].used - 1, charged: 0, balance: await balance(userId, q) };
      }
      const coins = TRIALS[kind];
      const bal = await debitIn(q, userId, coins, 'trial', `${kind}@${wk}@${ref ?? randomUUID()}`);
      return { free: false, left: 0, charged: coins, balance: bal };
    });
  }

  async function trialsLeft(userId) {
    const { rows } = await db.query(`SELECT used FROM trials WHERE user_id = $1 AND week = $2`, [userId, weekKey(now())]);
    return Math.max(0, TRIALS_PER_WEEK - (rows[0]?.used ?? 0));
  }

  async function history(userId, limit = 50) {
    const { rows } = await db.query(
      `SELECT delta, reason, ref, created_at FROM ledger WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`, [userId, limit]);
    return rows;
  }

  return { balance, credit, exportTicket, verifyTicket, useTrial, trialsLeft, history };
}

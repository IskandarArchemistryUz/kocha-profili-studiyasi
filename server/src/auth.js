/* Kirish: pochta yoki telefon raqamiga bir martalik 6 xonali kod, parolsiz.
   Kod va sessiya tokeni bazada faqat xesh koʻrinishida saqlanadi. */
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_TTL_MIN = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_COOLDOWN_SEC = 60;
export const OTP_MAX_PER_HOUR = 5;
export const SESSION_DAYS = 60;

export class AuthError extends Error {
  constructor(code, msg) { super(msg); this.code = code; }
}

const sha = (s) => createHash('sha256').update(s).digest('hex');

/** «Ali@Mail.uz» → email; «90 123-45-67», «+998901234567» → +998901234567 */
export function normalizeTarget(raw) {
  const s = String(raw ?? '').trim();
  if (s.includes('@')) {
    const e = s.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || e.length > 254) throw new AuthError('bad_target', 'pochta manzili notoʻgʻri');
    return { kind: 'email', value: e };
  }
  let d = s.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (/^\d{9}$/.test(d)) d = '998' + d;
  if (!/^998\d{9}$/.test(d)) throw new AuthError('bad_target', 'telefon raqami notoʻgʻri (+998 XX XXX XX XX)');
  return { kind: 'phone', value: '+' + d };
}

export function makeAuth({ db, pepper, send, now = () => new Date() }) {
  if (!pepper || pepper.length < 16) throw new Error('OTP_PEPPER kamida 16 belgi boʻlishi kerak');
  const codeHash = (target, code) => sha(`${pepper}:${target}:${code}`);

  async function requestCode(raw, lang = 'uz') {
    const t = normalizeTarget(raw);
    const { rows } = await db.query(
      `SELECT created_at FROM otp WHERE target = $1 AND created_at > $2 ORDER BY created_at DESC`,
      [t.value, new Date(now().getTime() - 3600e3)]);
    if (rows.length >= OTP_MAX_PER_HOUR) throw new AuthError('rate', 'juda koʻp soʻrov — bir soatdan keyin urinib koʻring');
    if (rows[0] && now() - new Date(rows[0].created_at) < OTP_COOLDOWN_SEC * 1000) throw new AuthError('cooldown', 'yangi kodni bir daqiqadan keyin soʻrang');
    const code = String(randomInt(0, 1e6)).padStart(6, '0');
    await db.query(`UPDATE otp SET used = TRUE WHERE target = $1 AND used = FALSE`, [t.value]);
    await db.query(`INSERT INTO otp (target, code_hash, expires_at, created_at) VALUES ($1, $2, $3, $4)`,
      [t.value, codeHash(t.value, code), new Date(now().getTime() + OTP_TTL_MIN * 60e3), now()]);
    await send(t, code, ['uz', 'en', 'ru'].includes(lang) ? lang : 'uz');
    return { kind: t.kind, target: t.value };
  }

  /** Kod toʻgʻri boʻlsa — foydalanuvchi (kerak boʻlsa yaratiladi) va yangi sessiya tokeni */
  async function verifyCode(raw, code) {
    const t = normalizeTarget(raw);
    if (!/^\d{6}$/.test(String(code ?? ''))) throw new AuthError('bad_code', 'kod 6 ta raqamdan iborat');
    return db.tx(async (q) => {
      const { rows } = await q.query(
        `SELECT id, code_hash, expires_at, attempts FROM otp WHERE target = $1 AND used = FALSE ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [t.value]);
      const o = rows[0];
      if (!o || new Date(o.expires_at) < now()) throw new AuthError('expired', 'kod eskirgan — yangisini soʻrang');
      if (o.attempts >= OTP_MAX_ATTEMPTS) throw new AuthError('attempts', 'urinishlar tugadi — yangi kod soʻrang');
      const ok = timingSafeEqual(Buffer.from(o.code_hash), Buffer.from(codeHash(t.value, String(code))));
      if (!ok) {
        await q.query(`UPDATE otp SET attempts = attempts + 1 WHERE id = $1`, [o.id]);
        return { error: new AuthError('bad_code', 'kod notoʻgʻri') };
      }
      await q.query(`UPDATE otp SET used = TRUE WHERE id = $1`, [o.id]);
      const col = t.kind === 'email' ? 'email' : 'phone';
      let u = (await q.query(`SELECT id FROM users WHERE ${col} = $1`, [t.value])).rows[0];
      const isNew = !u;
      if (!u) u = (await q.query(`INSERT INTO users (${col}) VALUES ($1) RETURNING id`, [t.value])).rows[0];
      return { userId: Number(u.id), token: await newSession(q, u.id), isNew };
    }).then((r) => { if (r.error) throw r.error; return r; });
  }

  async function newSession(q, userId) {
    const token = randomBytes(32).toString('base64url');
    await q.query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
      [sha(token), userId, new Date(now().getTime() + SESSION_DAYS * 864e5)]);
    return token;
  }

  /**
   * Google bilan kirish: tasdiqlangan token maʼlumoti (sub, email, email_verified, name) — tekshiruv google.js da.
   * Avval google_sub boʻyicha, keyin shu pochta bilan ochilgan hisob boʻyicha topiladi (hisoblar birlashadi).
   */
  async function loginGoogle(c) {
    if (!c || typeof c.sub !== 'string' || !c.sub) throw new AuthError('google', 'Google maʼlumoti notoʻgʻri');
    if (!c.email || c.email_verified !== true) throw new AuthError('google_email', 'Google hisobining pochtasi tasdiqlanmagan');
    const email = String(c.email).toLowerCase(), name = typeof c.name === 'string' ? c.name.slice(0, 120) : null;
    return db.tx(async (q) => {
      let u = (await q.query(`SELECT id FROM users WHERE google_sub = $1`, [c.sub])).rows[0];
      let isNew = false;
      if (!u) {
        u = (await q.query(`SELECT id FROM users WHERE email = $1 FOR UPDATE`, [email])).rows[0];
        if (u) await q.query(`UPDATE users SET google_sub = $1, name = COALESCE(name, $2) WHERE id = $3`, [c.sub, name, u.id]);
        else { u = (await q.query(`INSERT INTO users (email, google_sub, name) VALUES ($1, $2, $3) RETURNING id`, [email, c.sub, name])).rows[0]; isNew = true; }
      }
      return { userId: Number(u.id), token: await newSession(q, u.id), isNew };
    });
  }

  async function userByToken(token) {
    if (!token || typeof token !== 'string' || token.length > 100) return null;
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.phone, u.lang, u.name FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > $2`, [sha(token), now()]);
    return rows[0] ? { ...rows[0], id: Number(rows[0].id) } : null;
  }

  async function logout(token) {
    if (token) await db.query(`DELETE FROM sessions WHERE token_hash = $1`, [sha(token)]);
  }

  return { requestCode, verifyCode, loginGoogle, userByToken, logout };
}

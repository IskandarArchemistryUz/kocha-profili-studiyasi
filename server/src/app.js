/* HTTP API (Fastify). Sayt (archemistry.uz) va API (api.archemistry.uz) bir domen ostida —
   sessiya HttpOnly cookie da, SameSite=Lax. */
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import { makePayments } from './payments.js';
import { makeAuth, AuthError } from './auth.js';
import { makeWallet, WalletError } from './wallet.js';
import { registerData } from './data/routes.js';
import { ITEMS, TRIALS, TRIALS_PER_WEEK, PACKS, priceOf, PriceError } from './prices.js';

export const COOKIE = 'ks_sess';

/**
 * @param {object} o
 * @param {object} o.db           db.js dagi interfeys
 * @param {string} o.pepper       OTP xeshi uchun maxfiy qoʻshimcha
 * @param {string} o.secret       ruxsatnoma imzosi uchun kalit
 * @param {(t:{kind:string,value:string}, code:string)=>Promise<void>} o.send  kod yuboruvchi
 * @param {((credential:string)=>Promise<object>)|null} [o.google]  Google ID token tekshiruvchi (google.js)
 * @param {string|null} [o.googleClientId]  brauzerga beriladi (ochiq qiymat)
 * @param {string[]} o.origins    ruxsat etilgan sayt manzillari (CORS)
 * @param {string} [o.cookieDomain] masalan '.archemistry.uz'
 * @param {boolean} [o.secure]    cookie Secure (ishda — true)
 * @param {{cache: object, fetchImpl?: Function, servers?: string[]}|null} [o.data]  hudud ma'lumoti keshi (data/cache.js); null — /data/* yo'q
 * @param {string[]} [o.owners]   egasi pochtalari (OWNER_EMAILS): /me da owner: true — ilova suv belgisisiz ishlaydi
 */
export async function buildApp({ db, pepper, secret, send, google = null, googleClientId = null, payme = null, click = null, multicard = null, fetchImpl, returnUrl, origins, cookieDomain, secure = true, owners = [], data = null, now, logger = false }) {
  const app = Fastify({ logger, trustProxy: true, bodyLimit: 64 * 1024 });
  const auth = makeAuth({ db, pepper, send, now });
  const wallet = makeWallet({ db, secret, now });
  const OWN = new Set(owners.map((e) => String(e).trim().toLowerCase()).filter(Boolean));

  await app.register(cookie);
  await app.register(formbody);   // Click soʻrovlari — application/x-www-form-urlencoded
  await app.register(cors, { origin: origins, credentials: true, methods: ['GET', 'POST'] });

  const setSession = (reply, token) => reply.setCookie(COOKIE, token, {
    httpOnly: true, secure, sameSite: 'lax', path: '/', domain: cookieDomain, maxAge: 60 * 864e2,
  });

  // IP boʻyicha oddiy cheklov: kod soʻrash — daqiqasiga 5 ta
  const hits = new Map();
  const limited = (ip, max = 5, winMs = 60e3) => {
    const t = Date.now(), a = (hits.get(ip) || []).filter((x) => t - x < winMs);
    a.push(t); hits.set(ip, a);
    if (hits.size > 5e4) hits.clear();
    return a.length > max;
  };

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AuthError || err instanceof WalletError || err instanceof PriceError) {
      const status = err.code === 'insufficient' ? 402 : err.code === 'rate' || err.code === 'cooldown' ? 429 : 400;
      return reply.code(status).send({ error: err.code ?? 'bad_request', message: err.message, need: err.need, balance: err.balance });
    }
    if (err.validation) return reply.code(400).send({ error: 'bad_request', message: err.message });
    req.log.error(err);
    return reply.code(500).send({ error: 'server', message: 'server xatosi' });
  });

  async function requireUser(req, reply) {
    const u = await auth.userByToken(req.cookies[COOKIE]);
    if (!u) { reply.code(401).send({ error: 'auth', message: 'tizimga kiring' }); return null; }
    return u;
  }

  app.get('/health', async () => ({ ok: true }));

  app.get('/prices', async () => ({ items: ITEMS, trials: TRIALS, trialsPerWeek: TRIALS_PER_WEEK, packs: PACKS }));

  app.post('/quote', async (req) => {
    const { items, areaHa } = req.body ?? {};
    return priceOf(items, areaHa);
  });

  app.post('/auth/code', async (req, reply) => {
    if (limited(req.ip)) return reply.code(429).send({ error: 'rate', message: 'juda koʻp soʻrov' });
    const r = await auth.requestCode(req.body?.target, req.body?.lang);
    return { sent: true, kind: r.kind };
  });

  app.post('/auth/verify', async (req, reply) => {
    if (limited('v:' + req.ip, 20)) return reply.code(429).send({ error: 'rate', message: 'juda koʻp soʻrov' });
    const r = await auth.verifyCode(req.body?.target, req.body?.code);
    setSession(reply, r.token);
    return { ok: true, isNew: r.isNew };
  });

  /** Brauzerga: qaysi kirish usullari yoqilgan */
  app.get('/auth/config', async () => ({ email: true, phone: false, google: googleClientId }));

  app.post('/auth/google', async (req, reply) => {
    if (!google) return reply.code(404).send({ error: 'google_off', message: 'Google bilan kirish yoqilmagan' });
    if (limited('g:' + req.ip, 20)) return reply.code(429).send({ error: 'rate', message: 'juda koʻp soʻrov' });
    let claims;
    try { claims = await google(req.body?.credential); }
    catch { return reply.code(401).send({ error: 'google', message: 'Google tokeni tasdiqlanmadi' }); }
    const r = await auth.loginGoogle(claims);
    setSession(reply, r.token);
    return { ok: true, isNew: r.isNew };
  });

  app.post('/auth/logout', async (req, reply) => {
    await auth.logout(req.cookies[COOKIE]);
    reply.clearCookie(COOKIE, { path: '/', domain: cookieDomain });
    return { ok: true };
  });

  app.get('/me', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    return { id: u.id, email: u.email, phone: u.phone, name: u.name ?? null, balance: await wallet.balance(u.id), trialsLeft: await wallet.trialsLeft(u.id), owner: !!u.email && OWN.has(u.email.toLowerCase()) };
  });

  app.get('/me/history', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    return { items: await wallet.history(u.id) };
  });

  app.post('/export/ticket', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    const { items, areaHa, stateHash } = req.body ?? {};
    return wallet.exportTicket(u.id, { items, areaHa, stateHash });
  });

  app.post('/export/verify', async (req) => {
    const t = wallet.verifyTicket(req.body?.ticket);
    return t ? { valid: true, items: t.items, stateHash: t.stateHash, expires: t.expires } : { valid: false };
  });

  app.post('/trial', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    return wallet.useTrial(u.id, req.body?.kind, req.body?.ref);
  });

  /* ---------- toʻlovlar ---------- */
  const pay = makePayments({ db, wallet, payme, click, multicard, fetchImpl, returnUrl, now });
  app.get('/pay/config', async () => pay.config());
  app.post('/pay/order', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    try { return await pay.createOrder(u.id, req.body?.pack, req.body?.provider); }
    catch (e) { if (e.code) return reply.code(e.code === 'provider_error' ? 502 : 400).send({ error: e.code, message: e.message }); throw e; }
  });
  app.get('/pay/order/:id', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return;
    const o = await pay.orderOf(u.id, Number(req.params.id));
    if (!o) return reply.code(404).send({ error: 'not_found', message: 'buyurtma topilmadi' });
    return { ...o, balance: await wallet.balance(u.id) };
  });
  // Payme Merchant API (JSON-RPC): javob har doim 200, xato — error maydonida
  app.post('/pay/payme', async (req) => pay.paymeRpc(req.headers.authorization, req.body));
  // Click Shop API
  app.post('/pay/click/prepare', async (req) => pay.clickPrepare(req.body));
  app.post('/pay/click/complete', async (req) => pay.clickComplete(req.body));
  // Multicard «Callback (success)»
  app.post('/pay/multicard/callback', async (req, reply) => { const r = await pay.multicardCallback(req.body, req.ip); return reply.code(r.status).send(r.body); });

  app.decorate('wallet', wallet);
  app.decorate('auth', auth);
  if (data?.cache) registerData(app, { ...data, limited });

  return app;
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from 'jose';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { makeGoogleVerifier } from '../src/google.js';
import { makeSender, mailText } from '../src/mailer.js';

const CID = 'test-client.apps.googleusercontent.com';
let db, app, sent, key, jwks;

async function token(claims, { aud = CID, iss = 'https://accounts.google.com', k = key } = {}) {
  return new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(iss).setAudience(aud)
    .setIssuedAt().setExpirationTime('10m').sign(k.privateKey);
}

beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  key = await generateKeyPair('RS256');
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(key.publicKey)), kid: 'k1', alg: 'RS256' }] });
  sent = [];
  app = await buildApp({
    db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, origins: ['https://archemistry.uz'],
    send: async (t, code, lang) => { sent.push({ ...t, code, lang }); },
    google: makeGoogleVerifier(CID, jwks), googleClientId: CID,
  });
});
afterEach(async () => { await app.close(); await db.close(); });

const post = (url, body, cookie) => app.inject({ method: 'POST', url, payload: body, headers: cookie ? { cookie } : {} });
const cookieOf = (r) => { const c = r.cookies.find((x) => x.name === COOKIE); return c && `${COOKIE}=${c.value}`; };

describe('Google bilan kirish', () => {
  it('sozlama: mijoz identifikatori brauzerga beriladi', async () => {
    const r = await app.inject({ method: 'GET', url: '/auth/config' });
    expect(r.json()).toEqual({ email: true, phone: false, google: CID });
  });
  it('yangi foydalanuvchi → sessiya, ism va pochta /me da', async () => {
    const r = await post('/auth/google', { credential: await token({ sub: 'g1', email: 'Ali@Gmail.com', email_verified: true, name: 'Ali Valiyev' }) });
    expect(r.statusCode).toBe(200); expect(r.json().isNew).toBe(true);
    const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie: cookieOf(r) } });
    expect(me.json()).toMatchObject({ email: 'ali@gmail.com', name: 'Ali Valiyev' });
    const again = await post('/auth/google', { credential: await token({ sub: 'g1', email: 'ali@gmail.com', email_verified: true }) });
    expect(again.json().isNew).toBe(false);
  });
  it('pochta kodi bilan ochilgan hisobga ulanadi (ikkinchi hisob ochilmaydi)', async () => {
    await post('/auth/code', { target: 'ali@gmail.com' });
    const v = await post('/auth/verify', { target: 'ali@gmail.com', code: sent.at(-1).code });
    const id1 = (await app.inject({ method: 'GET', url: '/me', headers: { cookie: cookieOf(v) } })).json().id;
    const g = await post('/auth/google', { credential: await token({ sub: 'g2', email: 'ali@gmail.com', email_verified: true }) });
    expect(g.json().isNew).toBe(false);
    expect((await app.inject({ method: 'GET', url: '/me', headers: { cookie: cookieOf(g) } })).json().id).toBe(id1);
  });
  it('rad etiladi: boshqa auditoriya, boshqa kalit, tasdiqlanmagan pochta, axlat', async () => {
    expect((await post('/auth/google', { credential: await token({ sub: 'x', email: 'a@b.uz', email_verified: true }, { aud: 'boshqa' }) })).statusCode).toBe(401);
    expect((await post('/auth/google', { credential: await token({ sub: 'x', email: 'a@b.uz', email_verified: true }, { k: await generateKeyPair('RS256') }) })).statusCode).toBe(401);
    expect((await post('/auth/google', { credential: await token({ sub: 'x', email: 'a@b.uz', email_verified: false }) })).statusCode).toBe(400);
    expect((await post('/auth/google', { credential: 'abc' })).statusCode).toBe(401);
  });
  it('Google oʻchiq boʻlsa — 404', async () => {
    const a2 = await buildApp({ db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false, origins: [], send: async () => {} });
    expect((await a2.inject({ method: 'POST', url: '/auth/google', payload: { credential: 'x' } })).statusCode).toBe(404);
    expect((await a2.inject({ method: 'GET', url: '/auth/config' })).json().google).toBeNull();
    await a2.close();
  });
});

describe('pochta orqali kod', () => {
  it('til kod yuboruvchiga uzatiladi', async () => {
    await post('/auth/code', { target: 'vali@mail.uz', lang: 'ru' });
    expect(sent.at(-1).lang).toBe('ru');
    await post('/auth/code', { target: 'olim@mail.uz', lang: 'xx' });
    expect(sent.at(-1).lang).toBe('uz');
  });
  it('SMTP: uch tilda xat; telefon — tushunarli xato', async () => {
    const out = [];
    const send = makeSender('smtp', { MAIL_FROM: 'A <a@archemistry.uz>' }, { sendMail: async (m) => { out.push(m); } });
    await send({ kind: 'email', value: 'a@b.uz' }, '123456', 'en');
    expect(out[0]).toMatchObject({ to: 'a@b.uz', from: 'A <a@archemistry.uz>', subject: 'Archemistry Lab: sign-in code 123456' });
    expect(out[0].text).toContain('123456');
    await expect(send({ kind: 'phone', value: '+998901234567' }, '123456')).rejects.toThrow(/pochta/);
    expect(mailText('ru', '000111').subject).toContain('код');
    expect(() => makeSender('smtp', {})).toThrow(/SMTP_URL/);
  });
});

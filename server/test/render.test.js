import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import sharp from 'sharp';
import { generateKeyPairSync, sign as edSign, createHash } from 'node:crypto';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { makeFal, ENGINES } from '../src/render/fal.js';
import { makeR2 } from '../src/render/r2.js';
import { compilePrompt, SUBJECT, STYLE } from '../src/render/prompt.js';
import { RENDER_COINS } from '../src/prices.js';

let db, app, sent, clock, falCalls, falNext, r2, notes, png;

/* ---------- soxta R2: obyektlar xotirada ---------- */
function fakeR2() {
  const objs = new Map();
  return {
    objs,
    presignPut: (key, { type, bytes }) => ({ url: `https://r2.test/put/${key}?t=${encodeURIComponent(type)}&n=${bytes}`, headers: { 'content-type': type } }),
    presignGet: (key) => `https://r2.test/get/${key}?sig=x`,
    head: async (key) => (objs.has(key) ? { bytes: objs.get(key).bytes, type: objs.get(key).type } : null),
    put: async (key, body, { type, bytes }) => {
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(await new Response(body).arrayBuffer());
      if (buf.length !== bytes) throw new Error(`hajm mos emas: ${buf.length} != ${bytes}`);
      objs.set(key, { bytes, type, buf });
    },
    del: async (key) => { objs.delete(key); },
  };
}
/** brauzer yuklashini taqlid qilish */
const upload = (key, bytes = 1000, type = 'image/webp') => r2.objs.set(key, { bytes, type, buf: Buffer.alloc(bytes) });

/* ---------- soxta fal: haqiqiy makeFal + soxta tarmoq, haqiqiy ED25519 imzo ---------- */
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const JWK = publicKey.export({ format: 'jwk' });
async function falFetch(url, init = {}) {
  const u = String(url);
  if (u.includes('jwks.json')) return new Response(JSON.stringify({ keys: [{ kty: 'OKP', crv: 'Ed25519', x: JWK.x, kid: 't' }] }), { status: 200 });
  falCalls.push({ url: u, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : null, headers: init.headers });
  const r = falNext.shift() ?? { status: 200, body: { request_id: `req-${falCalls.length}`, status_url: `https://queue.fal.run/x/requests/req-${falCalls.length}/status`, response_url: `https://queue.fal.run/x/requests/req-${falCalls.length}` } };
  return new Response(JSON.stringify(r.body), { status: r.status });
}
/** natija rasmi (fal CDN) — haqiqiy PNG, eskiz sharp bilan yasaladi */
async function cdnFetch(url) {
  if (String(url).startsWith('https://v3.fal.media/')) return new Response(png, { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(png.length) } });
  return new Response('yoʻq', { status: 404 });
}
function hook(body, { ts = Math.floor(clock.getTime() / 1000), bad = false, rid } = {}) {
  const raw = Buffer.from(JSON.stringify(body));
  const id = rid ?? body.request_id, uid = 'fal-user', t = String(ts);
  const msg = Buffer.from([id, uid, t, createHash('sha256').update(raw).digest('hex')].join('\n'));
  let sig = edSign(null, msg, privateKey).toString('hex');
  if (bad) sig = sig.replace(/^./, (ch) => (ch === 'a' ? 'b' : 'a'));
  return app.inject({ method: 'POST', url: '/render/hook', payload: raw, headers: { 'content-type': 'application/json', 'x-fal-webhook-request-id': id, 'x-fal-webhook-user-id': uid, 'x-fal-webhook-timestamp': t, 'x-fal-webhook-signature': sig } });
}
const okPayload = (rid) => ({ request_id: rid, gateway_request_id: rid, status: 'OK', payload: { images: [{ url: 'https://v3.fal.media/files/out.png', width: 2048, height: 1152, content_type: 'image/png' }] } });

function renderCfg(extra = {}) {
  return {
    fal: makeFal({ key: 'fal-test', fetchImpl: falFetch, now: () => clock }),
    r2, hookUrl: 'https://api.archemistry.uz/render/hook', fetchImpl: cdnFetch, sweep: false,
    notify: (s, t) => { notes.push({ s, t }); }, ...extra,
  };
}
async function makeApp(render) {
  return buildApp({
    db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false,
    send: async (t, code) => { sent.push({ ...t, code }); }, origins: ['https://archemistry.uz'],
    owners: ['boss@mail.uz'], now: () => clock, render,
  });
}

beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS render_assets, render_jobs, holds, agent_free, agent_runs, events, private_features, private_layers, project_spend, multicard_tx, kv, click_tx, payme_tx, orders, trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  sent = []; falCalls = []; falNext = []; notes = []; r2 = fakeR2();
  png ??= await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#88aacc' } }).png().toBuffer();
  clock = new Date('2026-11-13T10:00:00Z');
  app = await makeApp(renderCfg());
});
afterEach(async () => { await app.close(); await db.close(); });

const post = (url, body, cookie) => app.inject({ method: 'POST', url, payload: body, headers: cookie ? { cookie } : {} });
const get = (url, cookie) => app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} });
async function login(target = 'ali@mail.uz') {
  await post('/auth/code', { target });
  const r = await post('/auth/verify', { target, code: sent.at(-1).code });
  return `${COOKIE}=${r.cookies.find((x) => x.name === COOKIE).value}`;
}
const userId = async (email) => (await db.query(`SELECT id FROM users WHERE email = $1`, [email])).rows[0].id;
const give = async (email, coins) => app.wallet.credit(await userId(email), coins, 'promo', `t-${Math.random()}`);
const paid = async (email) => db.query(`INSERT INTO orders (user_id, pack, coins, amount, state, paid_at) VALUES ($1, 'p10', 10, 39000, 'paid', now())`, [await userId(email)]);
const balance = async (email) => app.wallet.balance(await userId(email));
async function inputKey(ck) {
  const r = await post('/render/upload-url', { type: 'image/webp', bytes: 1000 }, ck);
  expect(r.statusCode).toBe(200);
  upload(r.json().key);
  return r.json().key;
}
const job = async (ck, extra = {}) => post('/render/jobs', { engine: 'pro', input: { key: await inputKey(ck), w: 2048, h: 1152 }, subj: 'reja', style: 'toshkent', fid: 'qatiy', source: 'mr', tag: 'sMR1', ...extra }, ck);
const jobRow = async (id) => (await db.query(`SELECT * FROM render_jobs WHERE id = $1`, [id])).rows[0];
const holdOf = async (id) => (await db.query(`SELECT state, coins FROM holds WHERE ref = $1`, [`render:${id}`])).rows[0];

describe('render — sozlama', () => {
  it('kalitlar boʻlmasa oʻchiq: «Render vaqtincha ishlamayapti», tanga yechilmaydi', async () => {
    await app.close(); app = await makeApp(null);
    const ck = await login(); await give('ali@mail.uz', 5);
    expect((await get('/render/config')).json()).toMatchObject({ enabled: false, message: 'Render vaqtincha ishlamayapti' });
    const r = await post('/render/jobs', { engine: 'fast' }, ck);
    expect(r.statusCode).toBe(503);
    expect(r.json()).toMatchObject({ error: 'render_off', message: 'Render vaqtincha ishlamayapti' });
    expect((await post('/render/upload-url', { type: 'image/webp', bytes: 10 }, ck)).statusCode).toBe(503);
    expect(await balance('ali@mail.uz')).toBe(5);
  });
  it('narxlar: Tez 1 · Pro 2K 2 · Pro 4K 4; /prices da ham', async () => {
    expect(RENDER_COINS).toEqual({ 'ren.fast': 1, 'ren.pro': 2, 'ren.pro4k': 4 });
    const r = (await get('/render/config')).json();
    expect(r.enabled).toBe(true);
    expect(r.engines).toEqual({ fast: { coins: 1 }, pro: { coins: 2 }, pro4k: { coins: 4 } });
    expect((await get('/prices')).json().render).toEqual(RENDER_COINS);
    const ck = await login();
    expect((await get('/render/config', ck)).json()).toMatchObject({ owner: false, parallel: 1 });
  });
});

describe('render — yuklash havolasi', () => {
  it('faqat WebP/PNG, ≤ 8 MB, kalit foydalanuvchi papkasida; kirmagan — 401', async () => {
    expect((await post('/render/upload-url', { type: 'image/webp', bytes: 10 })).statusCode).toBe(401);
    const ck = await login(), id = await userId('ali@mail.uz');
    expect((await post('/render/upload-url', { type: 'image/jpeg', bytes: 10 }, ck)).json().error).toBe('bad_type');
    expect((await post('/render/upload-url', { type: 'image/png', bytes: 8 * 2 ** 20 + 1 }, ck)).statusCode).toBe(413);
    const r = (await post('/render/upload-url', { type: 'image/png', bytes: 5000 }, ck)).json();
    expect(r.key).toMatch(new RegExp(`^in/u${id}/[0-9a-f-]{36}\\.png$`));
    expect(r).toMatchObject({ method: 'PUT', headers: { 'content-type': 'image/png' }, expiresIn: 300 });
  });
});

describe('render — tanga: hold → capture / release', () => {
  it('Pro: 2 tanga ushlanadi, natija kelsa yechiladi; natija va eskiz R2 da', async () => {
    const ck = await login(); await give('ali@mail.uz', 5);
    const r = await job(ck);
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j).toMatchObject({ status: 'running', engine: 'pro', coins: 2, balance: 3, downgraded: false });
    expect(await holdOf(j.id)).toEqual({ state: 'held', coins: 2 });
    // fal ga: model, webhook, prompt, R2 dan GET havolasi, 2K
    const call = falCalls.at(-1);
    expect(call.url).toBe(`https://queue.fal.run/${ENGINES.pro.model}?fal_webhook=${encodeURIComponent('https://api.archemistry.uz/render/hook')}`);
    expect(call.headers.authorization).toBe('Key fal-test');
    expect(call.body).toMatchObject({ resolution: '2K', aspect_ratio: '16:9', num_images: 1 });
    expect(call.body.image_urls[0]).toMatch(/^https:\/\/r2\.test\/get\/in\//);
    expect(call.body.prompt).toContain('Tashkent');
    expect((await get(`/render/jobs/${j.id}`, ck)).json()).toMatchObject({ status: 'running' });

    const row = await jobRow(j.id);
    expect((await hook(okPayload(row.fal_request_id))).statusCode).toBe(200);
    await app.render.flush();
    expect((await jobRow(j.id)).status).toBe('done');
    expect(await holdOf(j.id)).toEqual({ state: 'captured', coins: 2 });
    expect(await balance('ali@mail.uz')).toBe(3);
    const uid = await userId('ali@mail.uz');
    expect(r2.objs.get(`out/u${uid}/${j.id}.png`).bytes).toBe(png.length);
    const th = r2.objs.get(`th/u${uid}/${j.id}.webp`);
    expect(th.type).toBe('image/webp');
    const meta = await sharp(th.buf).metadata();
    expect(meta.format).toBe('webp'); expect(Math.max(meta.width, meta.height)).toBe(512);

    const v = (await get(`/render/jobs/${j.id}`, ck)).json();
    expect(v).toMatchObject({ status: 'done', w: 2048, h: 1152, engine: 'pro', tag: 'sMR1', source: 'mr' });
    expect(v.out).toMatch(/^https:\/\/r2\.test\/get\/out\//); expect(v.thumb).toMatch(/\/th\//); expect(v.prompt).toContain('GEOMETRY');
    const h = (await get('/render/history', ck)).json().items;
    expect(h).toHaveLength(1); expect(h[0].thumb).toMatch(/\/th\//); expect(h[0].out).toBeUndefined();
    // takroriy webhook — ikkinchi marta hech narsa qilinmaydi
    expect((await hook(okPayload(row.fal_request_id))).json()).toMatchObject({ repeat: true });
    const assets = (await db.query(`SELECT role FROM render_assets WHERE job_id = $1 ORDER BY role`, [j.id])).rows.map((x) => x.role);
    expect(assets).toEqual(['input', 'out', 'thumb']);
  });
  it('fal xatosi — tanga qaytadi (refunded), daftarda render_refund', async () => {
    const ck = await login(); await give('ali@mail.uz', 5);
    const j = (await job(ck, { engine: 'pro4k' })).json();
    expect(j.balance).toBe(1);
    const row = await jobRow(j.id);
    await hook({ request_id: row.fal_request_id, status: 'ERROR', error: 'Invalid image' });
    await app.render.flush();
    expect((await jobRow(j.id)).status).toBe('refunded');
    expect(await holdOf(j.id)).toEqual({ state: 'released', coins: 4 });
    expect(await balance('ali@mail.uz')).toBe(5);
    const l = (await db.query(`SELECT delta, reason FROM ledger WHERE ref = $1 ORDER BY id`, [`render:${j.id}`])).rows;
    expect(l).toEqual([{ delta: -4, reason: 'render' }, { delta: 4, reason: 'render_refund' }]);
    expect((await get(`/render/jobs/${j.id}`, ck)).json()).toMatchObject({ status: 'refunded', error: 'render bajarilmadi' });
  });
  it('natijani saqlab boʻlmasa (CDN 404) — ham qaytadi', async () => {
    const ck = await login(); await give('ali@mail.uz', 2);
    const j = (await job(ck)).json();
    const row = await jobRow(j.id);
    await hook({ ...okPayload(row.fal_request_id), payload: { images: [{ url: 'https://boshqa.cdn/x.png' }] } });
    await app.render.flush();
    expect((await jobRow(j.id)).status).toBe('refunded');
    expect(await balance('ali@mail.uz')).toBe(2);
  });
  it('fal ga yuborilmasa — 503, tanga qaytadi; balans tugagan boʻlsa egasiga xabar', async () => {
    const ck = await login(); await give('ali@mail.uz', 5);
    falNext.push({ status: 500, body: { detail: 'boom' } });
    let r = await job(ck);
    expect(r.statusCode).toBe(503); expect(r.json().error).toBe('render_busy');
    expect(await balance('ali@mail.uz')).toBe(5);
    falNext.push({ status: 403, body: { detail: 'User is locked. Reason: Exhausted balance.' } });
    r = await job(ck);
    expect(r.statusCode).toBe(503);
    expect(await balance('ali@mail.uz')).toBe(5);
    expect(notes.map((n) => n.s)).toContain('Render: fal balansi tugadi');
    expect((await db.query(`SELECT status FROM render_jobs ORDER BY id`)).rows.map((x) => x.status)).toEqual(['refunded', 'refunded']);
  });
  it('tanga yetmasa — 402, ish ham, ushlash ham qolmaydi', async () => {
    const ck = await login(); await give('ali@mail.uz', 1);
    const r = await job(ck);
    expect(r.statusCode).toBe(402);
    expect(r.json()).toMatchObject({ error: 'insufficient', need: 2, balance: 1 });
    expect((await db.query(`SELECT COUNT(*)::int AS n FROM render_jobs`)).rows[0].n).toBe(0);
    expect(falCalls).toHaveLength(0);
  });
  it('egasi: markaziy kalit, tanga yechilmaydi', async () => {
    const ck = await login('boss@mail.uz');
    const j = (await job(ck, { engine: 'pro4k' })).json();
    expect(j).toMatchObject({ coins: 0, balance: 0, status: 'running' });
    expect(await holdOf(j.id)).toBeUndefined();
    expect((await get('/render/config', ck)).json()).toMatchObject({ owner: true, parallel: 2 });
  });
  it('hamyon: release ikki marta qaytarmaydi, capture dan keyin release yoʻq', async () => {
    await login(); const id = await userId('ali@mail.uz'); await give('ali@mail.uz', 10);
    await app.wallet.hold(id, { coins: 3, reason: 'render', ref: 'render:a' });
    expect(await app.wallet.balance(id)).toBe(7);
    expect((await app.wallet.release('render:a')).released).toBe(3);
    expect((await app.wallet.release('render:a')).released).toBe(0);
    expect(await app.wallet.balance(id)).toBe(10);
    await app.wallet.hold(id, { coins: 4, reason: 'render', ref: 'render:b' });
    expect((await app.wallet.capture('render:b')).captured).toBe(4);
    expect((await app.wallet.release('render:b')).released).toBe(0);
    expect(await app.wallet.balance(id)).toBe(6);
    await expect(app.wallet.hold(id, { coins: 7, reason: 'render', ref: 'render:c' })).rejects.toMatchObject({ code: 'insufficient' });
  });
});

describe('render — cheklovlar', () => {
  it('parallel: bepul foydalanuvchi 1, toʻlagan 2; tugagach yana mumkin', async () => {
    const ck = await login(); await give('ali@mail.uz', 20);
    const a = (await job(ck, { engine: 'fast' })).json();
    let r = await job(ck, { engine: 'fast' });
    expect(r.statusCode).toBe(429); expect(r.json().error).toBe('parallel');
    expect(await balance('ali@mail.uz')).toBe(19);   // rad etilgan soʻrovdan tanga yechilmadi
    await paid('ali@mail.uz');
    expect((await job(ck, { engine: 'fast' })).statusCode).toBe(200);
    expect((await job(ck, { engine: 'fast' })).statusCode).toBe(429);
    await hook(okPayload((await jobRow(a.id)).fal_request_id)); await app.render.flush();
    expect((await job(ck, { engine: 'fast' })).statusCode).toBe(200);
  });
  it('sayt boʻyicha chegara — 503 busy', async () => {
    await app.close(); app = await makeApp(renderCfg({ siteMax: 1 }));
    const a = await login('a@mail.uz'), b = await login('b@mail.uz');
    await give('a@mail.uz', 5); await give('b@mail.uz', 5);
    expect((await job(a, { engine: 'fast' })).statusCode).toBe(200);
    const r = await job(b, { engine: 'fast' });
    expect(r.statusCode).toBe(503); expect(r.json().error).toBe('busy');
    expect(await balance('b@mail.uz')).toBe(5);
  });
  it('boshqa foydalanuvchining yoki yuklanmagan rasmi — 400', async () => {
    const a = await login('a@mail.uz'), b = await login('b@mail.uz'); await give('b@mail.uz', 5);
    const k = await inputKey(a);
    expect((await post('/render/jobs', { engine: 'fast', input: { key: k }, subj: 'reja' }, b)).json().error).toBe('bad_input');
    const kb = (await post('/render/upload-url', { type: 'image/webp', bytes: 100 }, b)).json().key;
    expect((await post('/render/jobs', { engine: 'fast', input: { key: kb }, subj: 'reja' }, b)).json().error).toBe('upload_missing');
    expect((await post('/render/jobs', { engine: 'turbo', input: { key: kb }, subj: 'reja' }, b)).json().error).toBe('bad_engine');
    expect((await post('/render/jobs', { engine: 'fast', input: { key: `${kb.slice(0, -5)}/../x.webp` }, subj: 'reja' }, b)).json().error).toBe('bad_input');
    upload(kb, 9 * 2 ** 20);
    expect((await post('/render/jobs', { engine: 'fast', input: { key: kb }, subj: 'reja' }, b)).json().error).toBe('bad_input');
    expect(await balance('b@mail.uz')).toBe(5);
  });
  it('referenslar: rol bandga tushadi, 4 tadan koʻp emas', async () => {
    const ck = await login(); await give('ali@mail.uz', 5);
    const refs = [{ key: await inputKey(ck), role: 'material' }, { key: await inputKey(ck), role: 'yorugik' }];
    const r = await job(ck, { refs });
    expect(r.statusCode).toBe(200);
    const b = falCalls.at(-1).body;
    expect(b.image_urls).toHaveLength(3);
    expect(b.prompt).toMatch(/LIGHTING:.*image 3 \(lighting reference\)/);
    expect(b.prompt).toMatch(/MATERIALS:.*image 2 \(material reference\)/);
    const five = await Promise.all([1, 2, 3, 4, 5].map(async () => ({ key: await inputKey(ck), role: 'uslub' })));
    expect((await job(ck, { refs: five })).json().error).toBe('bad_refs');
    expect((await job(ck, { refs: [{ key: await inputKey(ck), role: 'boshqa' }] })).json().error).toBe('bad_refs');
  });
  it('kunlik $ chegarasi: Pro sigʻmasa — Tez, Tez ham sigʻmasa — 503 va egasiga xabar', async () => {
    await app.close(); app = await makeApp(renderCfg({ dailyUsd: 1 }));
    const ck = await login(); await give('ali@mail.uz', 20); await paid('ali@mail.uz');
    const u = await userId('ali@mail.uz');
    await db.query(`INSERT INTO render_jobs (user_id, status, engine, params, prompt, usd_micro, created_at) VALUES ($1, 'done', 'pro', '{}', 'p', 900000, $2)`, [u, clock]);
    const r = (await job(ck, { engine: 'pro4k' })).json();
    expect(r).toMatchObject({ engine: 'fast', coins: 1, downgraded: true, balance: 19 });
    expect(falCalls.at(-1).url).toContain(ENGINES.fast.model);
    expect(notes.map((n) => n.s)).toContain('Render: kunlik chegaraga yaqin');
    await db.query(`INSERT INTO render_jobs (user_id, status, engine, params, prompt, usd_micro, created_at) VALUES ($1, 'done', 'pro', '{}', 'p', 70000, $2)`, [u, clock]);
    const x = await job(ck, { engine: 'fast' });
    expect(x.statusCode).toBe(503); expect(x.json().error).toBe('render_budget');
    expect(notes.map((n) => n.s)).toContain('Render: kunlik chegara tugadi');
    // ertasi kuni (Toshkent) — yana ochiq; xato va qaytgan ishlar hisobga kirmaydi
    clock = new Date('2026-11-14T00:30:00Z');
    expect((await job(ck, { engine: 'pro' })).json()).toMatchObject({ engine: 'pro', downgraded: false });
  });
});

describe('render — sinov modellari (lab)', () => {
  it('faqat egasiga: konfigda koʻrinadi va ishlaydi; boshqalarga — bad_engine', async () => {
    const ck = await login(); await give('ali@mail.uz', 5);
    expect(Object.keys((await get('/render/config', ck)).json().engines)).toEqual(['fast', 'pro', 'pro4k']);
    expect((await job(ck, { engine: 'qwen' })).json().error).toBe('bad_engine');
    expect(await balance('ali@mail.uz')).toBe(5);
    const own = await login('boss@mail.uz');
    const cfg = (await get('/render/config', own)).json();
    expect(cfg.engines.qwen).toMatchObject({ lab: true });
    expect(Object.keys(cfg.engines)).toEqual(['fast', 'pro', 'pro4k', 'qwen', 'kontext', 'seedream5', 'gptimg']);
  });
  it('har model oʻz sxemasi bilan; Kontext — faqat asos rasm, kadr nisbati saqlanadi', async () => {
    const own = await login('boss@mail.uz');
    const refs = [{ key: await inputKey(own), role: 'material' }];
    const runs = { qwen: 'fal-ai/qwen-image-edit-2511', kontext: 'fal-ai/flux-pro/kontext', seedream5: 'fal-ai/bytedance/seedream/v5/lite/edit', gptimg: 'openai/gpt-image-2/edit' };
    for (const [engine, model] of Object.entries(runs)) {
      const r = await job(own, { engine, refs });
      expect(r.statusCode).toBe(200);
      const call = falCalls.at(-1);
      expect(call.url.startsWith(`https://queue.fal.run/${model}?`)).toBe(true);
      if (engine === 'kontext') { expect(call.body.image_url).toMatch(/\/in\//); expect(call.body.image_urls).toBeUndefined(); expect(call.body.aspect_ratio).toBe('16:9'); }
      else expect(call.body.image_urls).toHaveLength(2);
      if (engine === 'seedream5') expect(call.body.image_size).toEqual({ width: 2048, height: 1152 });
      // parallel chegara oshmasin — ishni yakunlaymiz
      await hook(okPayload((await jobRow(r.json().id)).fal_request_id)); await app.render.flush();
    }
  });
});

describe('render — webhook imzosi', () => {
  it('notoʻgʻri imzo, eski vaqt, imzosiz — 401; nomaʼlum ish — 200', async () => {
    const ck = await login(); await give('ali@mail.uz', 5);
    const j = (await job(ck)).json(), rid = (await jobRow(j.id)).fal_request_id;
    expect((await hook(okPayload(rid), { bad: true })).statusCode).toBe(401);
    expect((await hook(okPayload(rid), { ts: Math.floor(clock.getTime() / 1000) - 600 })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/render/hook', payload: okPayload(rid), headers: { 'content-type': 'application/json' } })).statusCode).toBe(401);
    // imzo boshqa tana uchun — rad
    const raw = JSON.stringify(okPayload(rid)), ts = String(Math.floor(clock.getTime() / 1000));
    const sig = edSign(null, Buffer.from([rid, 'u', ts, createHash('sha256').update('{}').digest('hex')].join('\n')), privateKey).toString('hex');
    expect((await app.inject({ method: 'POST', url: '/render/hook', payload: raw, headers: { 'content-type': 'application/json', 'x-fal-webhook-request-id': rid, 'x-fal-webhook-user-id': 'u', 'x-fal-webhook-timestamp': ts, 'x-fal-webhook-signature': sig } })).statusCode).toBe(401);
    expect((await jobRow(j.id)).status).toBe('running');
    expect((await hook(okPayload('begona'))).json()).toMatchObject({ ok: true, unknown: true });
  });
});

describe('render — osilgan ishlar', () => {
  it('webhook kelmasa — fal dan soʻraladi: tayyor boʻlsa saqlanadi, 30 daqiqadan oshsa tanga qaytadi', async () => {
    const ck = await login(); await give('ali@mail.uz', 10); await paid('ali@mail.uz');
    const a = (await job(ck, { engine: 'fast' })).json(), b = (await job(ck, { engine: 'pro' })).json();
    expect((await app.render.sweep()).checked).toBe(0);   // hali yangi
    clock = new Date(clock.getTime() + 3 * 60e3);
    falNext.push({ status: 200, body: { status: 'COMPLETED' } }, { status: 200, body: okPayload('x').payload }, { status: 200, body: { status: 'IN_PROGRESS' } });
    expect((await app.render.sweep()).checked).toBe(2);
    expect((await jobRow(a.id)).status).toBe('done');
    expect((await jobRow(b.id)).status).toBe('running');
    expect(falCalls.at(-3).url).toBe((await jobRow(a.id)).params.fal.status_url);
    clock = new Date(clock.getTime() + 31 * 60e3);
    falNext.push({ status: 200, body: { status: 'IN_QUEUE' } });
    await app.render.sweep();
    expect((await jobRow(b.id)).status).toBe('refunded');
    expect(await balance('ali@mail.uz')).toBe(9);
  });
});

describe('render — prompt kompilyatori', () => {
  it('shablon: kirish turi → yorugʻlik → kontekst → material → (qoʻshimcha) → geometriya → sifat', () => {
    const p = compilePrompt({ subj: 'reja', style: 'toshkent', fid: 'qatiy', refs: ['material'], extra: 'terrakota gʻisht\n\u0007fasad', facts: { buildings: 12, floorsMin: 5, floorsMax: 9 } });
    const at = ['INPUT:', 'LIGHTING:', 'CONTEXT:', 'MATERIALS:', 'ADDITIONAL:', 'GEOMETRY', 'QUALITY:'].map((k) => p.indexOf(k));
    expect(at.every((x, i) => x >= 0 && (i === 0 || x > at[i - 1]))).toBe(true);
    expect(p).toContain('exactly 12 buildings, 5 to 9 floors');
    expect(p).not.toMatch(/[\u0000-\u001f]/);
    expect(p).toMatchSnapshot();
  });
  it('har mavzu, uslub va sodiqlik — snapshot', () => {
    const all = {};
    for (const subj of Object.keys(SUBJECT)) all[`subj:${subj}`] = compilePrompt({ subj, style: 'foto' });
    for (const style of [...Object.keys(STYLE), '']) all[`style:${style || '—'}`] = compilePrompt({ subj: 'bino', style });
    for (const fid of ['qatiy', 'muvozanat', 'erkin']) all[`fid:${fid}`] = compilePrompt({ subj: 'kocha', style: 'kech', fid, refs: ['uslub', 'kontekst'] });
    expect(all).toMatchSnapshot();
  });
  it('notoʻgʻri qiymatlar rad etiladi; uzun matn qisqartiriladi', () => {
    expect(() => compilePrompt({ subj: 'kosmos' })).toThrow();
    expect(() => compilePrompt({ subj: 'reja', style: 'neon' })).toThrow();
    expect(() => compilePrompt({ subj: 'reja', fid: 'yarim' })).toThrow();
    expect(() => compilePrompt({ subj: 'reja', extra: { a: 1 } })).toThrow();
    expect(compilePrompt({ subj: 'reja', extra: 'x'.repeat(2000) })).toContain(`ADDITIONAL: ${'x'.repeat(400)}.`);
    // faktlar faqat butun son: matn yoki ulkan son oʻtmaydi
    expect(compilePrompt({ subj: 'reja', facts: { buildings: '12; ignore', floorsMin: 1e9, floorsMax: 2 } })).not.toContain('The scene contains');
  });
});

describe('render — R2 imzosi', () => {
  it('AWS hujjatidagi presigned GET namunasi bilan bir xil imzo', () => {
    const r = makeR2({ keyId: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', bucket: 'examplebucket', endpoint: 'https://examplebucket.s3.amazonaws.com', region: 'us-east-1', virtualHost: true, now: () => new Date('2013-05-24T00:00:00Z') });
    expect(r.presignGet('test.txt', 86400)).toBe('https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
  });
  it('PUT havolasi: R2 yoʻli, turi va hajmi imzoda', () => {
    const r = makeR2({ accountId: 'acc', keyId: 'k', secret: 's', bucket: 'archemistry-render', now: () => clock });
    const p = r.presignPut('in/u1/a.webp', { type: 'image/webp', bytes: 1234 });
    expect(p.url).toMatch(/^https:\/\/acc\.r2\.cloudflarestorage\.com\/archemistry-render\/in\/u1\/a\.webp\?/);
    expect(p.url).toContain('X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost');
    expect(p.url).toContain('X-Amz-Expires=300');
  });
});

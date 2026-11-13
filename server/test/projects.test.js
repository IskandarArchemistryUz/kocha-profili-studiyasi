import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { PROJECT_TYPES, cleanMeta, cleanName } from '../src/projects.js';

let db, app, sent, clock, r2;

/* soxta R2: obyektlar xotirada */
function fakeR2() {
  const objs = new Map(), deleted = [];
  return {
    objs, deleted,
    presignPut: (key, { type, bytes }) => ({ url: `https://r2.test/put/${key}?n=${bytes}`, headers: { 'content-type': type } }),
    presignGet: (key) => `https://r2.test/get/${key}?sig=x`,
    head: async (key) => (objs.has(key) ? { bytes: objs.get(key), type: 'application/gzip' } : null),
    put: async () => {},
    del: async (key) => { objs.delete(key); deleted.push(key); },
  };
}
async function makeApp(projects) {
  return buildApp({
    db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false,
    send: async (t, code) => { sent.push({ ...t, code }); }, origins: ['https://archemistry.uz'],
    owners: ['boss@mail.uz'], now: () => clock, projects,
  });
}
beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS project_uploads, project_versions, projects, render_assets, render_jobs, holds, agent_free, agent_runs, events, private_features, private_layers, project_spend, multicard_tx, kv, click_tx, payme_tx, orders, trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  sent = []; r2 = fakeR2();
  clock = new Date('2026-11-14T10:00:00Z');
  app = await makeApp({ r2, sweep: false });
});
afterEach(async () => { await app.close(); await db.close(); });

const req = (method, url, body, cookie) => app.inject({ method, url, payload: body, headers: cookie ? { cookie } : {} });
async function login(target = 'ali@mail.uz') {
  await req('POST', '/auth/code', { target });
  const r = await req('POST', '/auth/verify', { target, code: sent.at(-1).code });
  return `${COOKIE}=${r.cookies.find((x) => x.name === COOKIE).value}`;
}
/** toʻliq saqlash: upload → (brauzer R2 ga yuklaydi) → commit */
async function save(ck, id, { type = 'master', name = 'Yunusobod 14', bytes = 5000, base = 0, meta = { ha: 2.4 }, real = bytes } = {}) {
  const u = await req('POST', `/projects/${id}/upload`, { type, bytes, base_version: base }, ck);
  if (u.statusCode !== 200) return u;
  r2.objs.set(u.json().key, real);
  return req('POST', `/projects/${id}/commit`, { key: u.json().key, base_version: base, name, type, meta }, ck);
}
const ID = 'p_abcdef12';

describe('loyihalar — sozlama va kirish', () => {
  it('R2 boʻlmasa oʻchiq: 503 «Bulutda saqlash vaqtincha ishlamayapti»', async () => {
    await app.close(); app = await makeApp(null);
    const ck = await login();
    const r = await req('GET', '/projects', null, ck);
    expect(r.statusCode).toBe(503);
    expect(r.json()).toMatchObject({ error: 'projects_off', message: 'Bulutda saqlash vaqtincha ishlamayapti' });
  });
  it('kirmagan foydalanuvchi — 401', async () => {
    expect((await req('GET', '/projects')).statusCode).toBe(401);
    expect((await req('POST', `/projects/${ID}/upload`, { type: 'master', bytes: 100 })).statusCode).toBe(401);
  });
  it('turlar roʻyxati: kelajakdagi Binokor va Bogʻshunos ham bor', () => {
    expect(PROJECT_TYPES).toEqual(['master', 'kochasoz', 'joyshunos', 'chizmadon', 'render', 'dizaynkod', 'binokor', 'bogshunos']);
  });
});

describe('loyihalar — saqlash va ochish', () => {
  it('yangi loyiha: upload → commit → roʻyxatda, versiya 1, yuklash havolasi', async () => {
    const ck = await login();
    const u = await req('POST', `/projects/${ID}/upload`, { type: 'master', bytes: 5000, base_version: 0 }, ck);
    expect(u.statusCode).toBe(200);
    const { key, put } = u.json();
    expect(key).toMatch(new RegExp(`^projects/\\d+/${ID}/1-[0-9a-f-]+\\.json\\.gz$`));
    expect(put.headers).toEqual({ 'content-type': 'application/gzip' });
    r2.objs.set(key, 5000);
    const c = await req('POST', `/projects/${ID}/commit`, { key, base_version: 0, name: '  Yunusobod 14 ', type: 'master', meta: { ha: 2.4, joy: 'Toshkent' } }, ck);
    expect(c.statusCode).toBe(200);
    expect(c.json().project).toMatchObject({ id: ID, type: 'master', name: 'Yunusobod 14', version: 1, bytes: 5000, meta: { ha: 2.4, joy: 'Toshkent' } });
    const l = (await req('GET', '/projects?type=master', null, ck)).json();
    expect(l.items.map((x) => x.id)).toEqual([ID]);
    expect(l.usage).toMatchObject({ bytes: 5000, count: 1, quota: 500 * 2 ** 20, max: 300 });
    expect((await req('GET', '/projects?type=kochasoz', null, ck)).json().items).toEqual([]);
    const g = (await req('GET', `/projects/${ID}`, null, ck)).json();
    expect(g.url).toBe(`https://r2.test/get/${key}?sig=x`);
    expect(g.version).toBe(1);
  });
  it('yangilash: versiya oshadi; oxirgi 5 nusxa qoladi, eskilari R2 dan oʻchadi; eski nusxani ochish mumkin', async () => {
    const ck = await login();
    for (let v = 0; v < 7; v++) expect((await save(ck, ID, { base: v, bytes: 1000 + v })).statusCode).toBe(200);
    const vs = (await req('GET', `/projects/${ID}/versions`, null, ck)).json().items;
    expect(vs.map((x) => x.version)).toEqual([7, 6, 5, 4, 3]);
    expect(r2.deleted.length).toBe(2);
    const old = (await req('GET', `/projects/${ID}?version=4`, null, ck)).json();
    expect(old.version).toBe(4);
    expect((await req('GET', `/projects/${ID}?version=1`, null, ck)).statusCode).toBe(404);
    expect((await req('GET', '/projects', null, ck)).json().usage.bytes).toBe(1006);
  });
  it('ikki qurilma: eski versiyadan saqlash — 409 conflict, ustidan yozilmaydi', async () => {
    const ck = await login();
    await save(ck, ID); await save(ck, ID, { base: 1, name: 'Noutbukda' });
    const r = await req('POST', `/projects/${ID}/upload`, { type: 'master', bytes: 900, base_version: 1 }, ck);
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ error: 'conflict', version: 2 });
    expect((await req('GET', `/projects/${ID}`, null, ck)).json().project.name).toBe('Noutbukda');
  });
  it('commit paytida poyga: yuklama olingandan keyin boshqa qurilma saqlasa — 409, yuklangan fayl oʻchadi', async () => {
    const ck = await login();
    await save(ck, ID);
    const a = (await req('POST', `/projects/${ID}/upload`, { type: 'master', bytes: 800, base_version: 1 }, ck)).json();
    r2.objs.set(a.key, 800);
    expect((await save(ck, ID, { base: 1, name: 'B' })).statusCode).toBe(200);
    const c = await req('POST', `/projects/${ID}/commit`, { key: a.key, base_version: 1, name: 'A', type: 'master' }, ck);
    expect(c.statusCode).toBe(409);
    expect(r2.objs.has(a.key)).toBe(false);
  });
  it('yuklanmagan yoki hajmi boshqa fayl qabul qilinmaydi', async () => {
    const ck = await login();
    const u = (await req('POST', `/projects/${ID}/upload`, { type: 'master', bytes: 5000, base_version: 0 }, ck)).json();
    expect((await req('POST', `/projects/${ID}/commit`, { key: u.key, base_version: 0, name: 'X', type: 'master' }, ck)).json().error).toBe('not_uploaded');
    expect((await save(ck, ID, { bytes: 5000, real: 9999 })).json().error).toBe('bad_bytes');
  });
  it('turi oʻzgarmaydi; notoʻgʻri tur, id, nom — 400', async () => {
    const ck = await login();
    await save(ck, ID);
    expect((await req('POST', `/projects/${ID}/upload`, { type: 'kochasoz', bytes: 100, base_version: 1 }, ck)).json().error).toBe('bad_type');
    expect((await req('POST', `/projects/${ID}/upload`, { type: 'xyz', bytes: 100, base_version: 1 }, ck)).json().error).toBe('bad_type');
    expect((await req('POST', '/projects/a!b/upload', { type: 'master', bytes: 100 }, ck)).json().error).toBe('bad_id');
    expect((await save(ck, 'p_other123', { name: '   ' })).json().error).toBe('bad_name');
  });
  it('boshqa foydalanuvchining loyihasi koʻrinmaydi va tegib boʻlmaydi', async () => {
    const a = await login('ali@mail.uz'); const b = await login('vali@mail.uz');
    await save(a, ID);
    expect((await req('GET', `/projects/${ID}`, null, b)).statusCode).toBe(404);
    expect((await req('GET', '/projects', null, b)).json().items).toEqual([]);
    expect((await req('DELETE', `/projects/${ID}`, null, b)).statusCode).toBe(404);
    // bir xil id — har kimniki alohida
    expect((await save(b, ID, { name: 'Valiniki' })).statusCode).toBe(200);
    expect((await req('GET', `/projects/${ID}`, null, a)).json().project.name).toBe('Yunusobod 14');
  });
});

describe('loyihalar — chegaralar', () => {
  it('bitta loyiha ≤ 30 MB — 413', async () => {
    const ck = await login();
    const r = await req('POST', `/projects/${ID}/upload`, { type: 'master', bytes: 31 * 2 ** 20, base_version: 0 }, ck);
    expect(r.statusCode).toBe(413);
    expect(r.json().error).toBe('too_big');
  });
  it('jami joy tugasa — 403 quota; egasiga chegara yoʻq', async () => {
    await app.close(); app = await makeApp({ r2, sweep: false, quotaBytes: 10_000, maxProjects: 2 });
    const ck = await login();
    expect((await save(ck, 'p_one00001', { bytes: 6000 })).statusCode).toBe(200);
    const r = await req('POST', '/projects/p_two00002/upload', { type: 'master', bytes: 5000, base_version: 0 }, ck);
    expect(r.statusCode).toBe(403); expect(r.json().error).toBe('quota');
    // oʻsha loyihani yangilash — eski hajmi hisobdan chiqadi
    expect((await save(ck, 'p_one00001', { base: 1, bytes: 9000 })).statusCode).toBe(200);
    expect((await save(ck, 'p_two00002', { bytes: 1500 })).statusCode).toBe(403);
    expect((await save(ck, 'p_two00002', { bytes: 900 })).statusCode).toBe(200);
    const own = await login('boss@mail.uz');
    for (const id of ['p_b0000001', 'p_b0000002', 'p_b0000003']) expect((await save(own, id, { bytes: 9000 })).statusCode).toBe(200);
    expect((await req('GET', '/projects', null, own)).json().usage).toMatchObject({ quota: null, max: null });
  });
  it('loyihalar soni chegarasi — 403 max_projects', async () => {
    await app.close(); app = await makeApp({ r2, sweep: false, maxProjects: 1 });
    const ck = await login();
    await save(ck, 'p_one00001');
    expect((await req('POST', '/projects/p_two00002/upload', { type: 'master', bytes: 100, base_version: 0 }, ck)).json().error).toBe('max_projects');
  });
  it('meta tozalanadi: faqat oddiy qiymatlar, ≤ 4 KB', () => {
    expect(cleanMeta({ ha: 2.4, ok: true, s: '<b>x</b>', obj: { a: 1 }, 'bad key': 1, arr: [1] })).toEqual({ ha: 2.4, ok: true, s: 'bx/b' });
    expect(() => cleanMeta([1])).toThrow();
    expect(() => cleanMeta(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, 'x'.repeat(200)])))).toThrow(/juda katta/);
    expect(cleanName('  a\u0000b  ')).toBe('ab');
    expect(cleanName('')).toBe(null);
  });
});

describe('loyihalar — savat, nom, tozalash', () => {
  it('oʻchirish → savatda; roʻyxatda yoʻq, ?trash=1 da bor; tiklash; savatdagiga saqlab boʻlmaydi', async () => {
    const ck = await login();
    await save(ck, ID);
    expect((await req('DELETE', `/projects/${ID}`, null, ck)).json()).toEqual({ ok: true, purge_days: 30 });
    expect((await req('GET', '/projects', null, ck)).json().items).toEqual([]);
    expect((await req('GET', '/projects?trash=1', null, ck)).json().items.map((x) => x.id)).toEqual([ID]);
    expect((await req('POST', `/projects/${ID}/upload`, { type: 'master', bytes: 100, base_version: 1 }, ck)).json().error).toBe('deleted');
    expect((await req('POST', `/projects/${ID}/restore`, null, ck)).json().project.deleted).toBe(null);
    expect((await req('GET', '/projects', null, ck)).json().items.length).toBe(1);
  });
  it('nomni oʻzgartirish versiyani oshirmaydi', async () => {
    const ck = await login();
    await save(ck, ID);
    const r = (await req('PATCH', `/projects/${ID}`, { name: 'Yangi nom', meta: { ha: 3 } }, ck)).json();
    expect(r.project).toMatchObject({ name: 'Yangi nom', version: 1, meta: { ha: 3 } });
  });
  it('tozalash: 1 soatlik tasdiqlanmagan yuklama va 30 kunlik savat butunlay oʻchadi', async () => {
    const ck = await login();
    await save(ck, ID); await save(ck, ID, { base: 1 });
    const u = (await req('POST', '/projects/p_dangling1/upload', { type: 'master', bytes: 100, base_version: 0 }, ck)).json();
    r2.objs.set(u.key, 100);
    await req('DELETE', `/projects/${ID}`, null, ck);
    clock = new Date(clock.getTime() + 2 * 3600e3);
    expect(await app.projects.sweep()).toEqual({ uploads: 1, purged: 0 });
    expect(r2.objs.has(u.key)).toBe(false);
    clock = new Date(clock.getTime() + 31 * 864e5);
    expect(await app.projects.sweep()).toEqual({ uploads: 0, purged: 1 });
    expect(r2.objs.size).toBe(0);
    expect((await req('GET', '/projects?trash=1', null, ck)).json().items).toEqual([]);
  });
});

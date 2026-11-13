import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { fromPglite, fromPool, migrate } from '../src/db.js';
import { buildApp, COOKIE } from '../src/app.js';
import { costMicro, dayStart, sanitizeMessages } from '../src/agent.js';
import { SERVICES, SCENARIOS } from '../src/agent-tools.js';

let db, app, sent, clock, calls, upstream;

/** Soxta model: navbatdagi javobni qaytaradi va soʻrovni yozib oladi */
const fakeFetch = async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
  const r = upstream.shift() ?? { status: 200, body: { content: [{ type: 'text', text: 'javob' }], stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 200 } } };
  return { ok: r.status === 200, status: r.status, json: async () => r.body };
};

async function makeApp(agent) {
  return buildApp({
    db, pepper: 'p'.repeat(20), secret: 's'.repeat(40), secure: false,
    send: async (t, code) => { sent.push({ ...t, code }); }, origins: ['https://archemistry.uz'],
    owners: ['boss@mail.uz'], now: () => clock, agent,
  });
}

beforeEach(async () => {
  if (process.env.TEST_DATABASE_URL) {
    db = fromPool(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 5 }));
    await db.query('DROP TABLE IF EXISTS agent_free, agent_runs, events, private_features, private_layers, project_spend, multicard_tx, kv, click_tx, payme_tx, orders, trials, exports, ledger, sessions, otp, users CASCADE');
  } else db = fromPglite(new PGlite());
  await migrate(db);
  sent = []; calls = []; upstream = [];
  clock = new Date('2026-11-13T10:00:00Z'); // juma
  app = await makeApp({ apiKey: 'sk-test', fetchImpl: fakeFetch, services: ['mr', 'joy'] });
});
afterEach(async () => { await app.close(); await db.close(); });

const post = (url, body, cookie) => app.inject({ method: 'POST', url, payload: body, headers: cookie ? { cookie } : {} });
const get = (url, cookie) => app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} });
async function login(target = 'ali@mail.uz') {
  await post('/auth/code', { target });
  const r = await post('/auth/verify', { target, code: sent.at(-1).code });
  const c = r.cookies.find((x) => x.name === COOKIE);
  return `${COOKIE}=${c.value}`;
}
const userId = async (email) => (await db.query(`SELECT id FROM users WHERE email = $1`, [email])).rows[0].id;
const give = async (email, coins) => app.wallet.credit(await userId(email), coins, 'promo', `t-${Math.random()}`);
const ask = (run, cookie, text = 'Nega 3-bino FAIL?') => post('/agent/step', { run, lang: 'uz', messages: [{ role: 'user', content: text }] }, cookie);

describe('agent — sozlama', () => {
  it('kalit boʻlmasa oʻchiq, yurish boshlanmaydi', async () => {
    await app.close();
    app = await makeApp(null);
    const ck = await login();
    expect((await get('/agent/config', ck)).json()).toMatchObject({ enabled: false, services: [] });
    expect((await post('/agent/run', { scenario: 'mr.ask' }, ck)).statusCode).toBe(503);
  });
  it('yoqilgan xizmatlar, ssenariy narxi va bepul qoldiq', async () => {
    const ck = await login();
    const r = (await get('/agent/config', ck)).json();
    expect(r.enabled).toBe(true);
    expect(r.services).toEqual(['mr', 'joy']);
    expect(r.scenarios['mr.audit'].coins).toBe(3);
    expect(r.scenarios['mr.ask'].coins).toBe(1);
    expect(r.scenarios['ks.ask']).toBeUndefined();
    expect(r.freeLeft).toBe(3);
  });
  it('har ssenariy mavjud xizmatga tegishli; buyruq nomlari takrorlanmaydi', () => {
    for (const s of Object.values(SCENARIOS)) expect(SERVICES[s.svc]).toBeTruthy();
    for (const s of Object.values(SERVICES)) expect(new Set(s.tools.map((t) => t.name)).size).toBe(s.tools.length);
  });
});

describe('agent — pul', () => {
  it('haftasiga 3 ta qisqa savol bepul, keyin 1 tanga; tanga yoʻq — 402', async () => {
    const ck = await login();
    for (let i = 0; i < 3; i++) expect((await post('/agent/run', { scenario: 'mr.ask' }, ck)).json()).toMatchObject({ free: true, charged: 0, freeLeft: 2 - i });
    expect((await post('/agent/run', { scenario: 'mr.ask' }, ck)).statusCode).toBe(402);
    await give('ali@mail.uz', 5);
    expect((await post('/agent/run', { scenario: 'mr.ask' }, ck)).json()).toMatchObject({ free: false, charged: 1, balance: 4 });
  });
  it('xulosa (long) bepulga kirmaydi — 3 tanga, loyiha shiftiga yoziladi', async () => {
    const ck = await login();
    await give('ali@mail.uz', 10);
    const r = (await post('/agent/run', { scenario: 'mr.audit', project: 'p1', areaHa: 30 }, ck)).json();
    expect(r).toMatchObject({ free: false, charged: 3, balance: 7, freeLeft: 3 });
    expect((await post('/project/info', { project: 'p1', areaHa: 30 }, ck)).json().spent).toBe(3);
  });
  it('egasi — bepul va cheksiz', async () => {
    const ck = await login('boss@mail.uz');
    for (let i = 0; i < 5; i++) expect((await post('/agent/run', { scenario: 'mr.audit' }, ck)).json()).toMatchObject({ free: true, charged: 0 });
  });
  it('bepul byudjet tugasa — bepul savol berilmaydi (tanga bilan ishlaydi)', async () => {
    const ck = await login();
    const id = await userId('ali@mail.uz');
    await db.query(`INSERT INTO agent_runs (user_id, svc, scenario, tier, free, cost_micro, created_at) VALUES ($1, 'mr', 'mr.ask', 'short', true, 2000000, $2)`, [id, clock]);
    expect((await post('/agent/run', { scenario: 'mr.ask' }, ck)).statusCode).toBe(402);
  });
  it('kunlik umumiy chegara — 503', async () => {
    const ck = await login();
    const id = await userId('ali@mail.uz');
    await db.query(`INSERT INTO agent_runs (user_id, svc, scenario, tier, cost_micro, created_at) VALUES ($1, 'mr', 'mr.ask', 'short', 20000000, $2)`, [id, clock]);
    expect((await post('/agent/run', { scenario: 'mr.ask' }, ck)).json().error).toBe('agent_budget');
  });
  it('yoqilmagan xizmat ssenariysi rad etiladi', async () => {
    const ck = await login();
    expect((await post('/agent/run', { scenario: 'ks.ask' }, ck)).statusCode).toBe(400);
  });
});

describe('agent — qadam', () => {
  it('server oʻz yoʻriqnomasi, xizmat buyruqlari va kalitni qoʻshadi; hisob yoziladi', async () => {
    const ck = await login();
    const { run } = (await post('/agent/run', { scenario: 'mr.why_fail' }, ck)).json();
    upstream.push({ status: 200, body: { content: [{ type: 'thinking', thinking: 'x' }, { type: 'tool_use', id: 't1', name: 'run_norm_check', input: { status: 'FAIL' } }], stop_reason: 'tool_use', usage: { input_tokens: 5000, output_tokens: 100, cache_read_input_tokens: 3000 } } });
    const r = (await ask(run, ck)).json();
    expect(r).toMatchObject({ stop: 'tool_use', status: 'open', stepsLeft: 9 });
    expect(r.content).toEqual([{ type: 'tool_use', id: 't1', name: 'run_norm_check', input: { status: 'FAIL' } }]);
    const b = calls[0].body;
    expect(calls[0].headers['x-api-key']).toBe('sk-test');
    expect(b.model).toBe('claude-haiku-5-5');
    expect(b.system[0].text).toMatch(/Never invent a number/);
    expect(b.system[1].text).toMatch(/Master reja.*Uzbek/);
    expect(b.tools.map((t) => t.name)).toContain('run_norm_check');
    expect(b.tools.map((t) => t.name)).not.toContain('joyshunos_layers');
    expect(b.tools.at(-1).cache_control).toEqual({ type: 'ephemeral' });
    expect(b.messages.at(-1).content.at(-1).cache_control).toEqual({ type: 'ephemeral' });

    // ikkinchi qadam: buyruq natijasi bilan; yakunlanadi
    const r2 = (await post('/agent/step', { run, lang: 'uz', messages: [
      { role: 'user', content: 'Nega 3-bino FAIL?' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'run_norm_check', input: { status: 'FAIL' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: { items: [{ clause: '86', actual: 22, required: 30 }] } }] },
    ] }, ck)).json();
    expect(r2).toMatchObject({ stop: 'end_turn', status: 'done' });
    const row = (await db.query(`SELECT steps, in_tok, out_tok, cost_micro, status FROM agent_runs WHERE id = $1`, [run])).rows[0];
    expect(row).toMatchObject({ steps: 2, in_tok: 9000, out_tok: 300, status: 'done' });
    expect(Number(row.cost_micro)).toBe(costMicro('claude-haiku-5-5', { input_tokens: 5000, output_tokens: 100, cache_read_input_tokens: 3000 }) + costMicro('claude-haiku-5-5', { input_tokens: 1000, output_tokens: 200 }));
    // yakunlangan yurishda yangi qadam yoʻq
    expect((await ask(run, ck)).statusCode).toBe(409);
  });
  it('xulosa — katta model', async () => {
    const ck = await login('boss@mail.uz');
    const { run } = (await post('/agent/run', { scenario: 'mr.audit' }, ck)).json();
    await ask(run, ck, 'Audit');
    expect(calls[0].body.model).toBe('claude-sonnet-5-5');
  });
  it('begona buyruq nomi va notoʻgʻri blok rad etiladi', async () => {
    const ck = await login();
    const { run } = (await post('/agent/run', { scenario: 'mr.ask' }, ck)).json();
    const bad = await post('/agent/step', { run, messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: [{ type: 'tool_use', id: 'x', name: 'delete_project', input: {} }] }, { role: 'user', content: 'b' }] }, ck);
    expect(bad.json().error).toBe('bad_tool');
    const img = await post('/agent/step', { run, messages: [{ role: 'user', content: [{ type: 'image', source: {} }] }] }, ck);
    expect(img.statusCode).toBe(400);
    expect(calls.length).toBe(0);
  });
  it('boshqa foydalanuvchining yurishi — 404', async () => {
    const a = await login('ali@mail.uz');
    const { run } = (await post('/agent/run', { scenario: 'mr.ask' }, a)).json();
    const b = await login('vali@mail.uz');
    expect((await ask(run, b)).statusCode).toBe(404);
  });
  it('qadam chegarasi (10)', async () => {
    const ck = await login();
    const { run } = (await post('/agent/run', { scenario: 'mr.ask' }, ck)).json();
    for (let i = 0; i < 10; i++) {
      upstream.push({ status: 200, body: { content: [{ type: 'tool_use', id: `t${i}`, name: 'get_tep', input: {} }], stop_reason: 'tool_use', usage: { input_tokens: 100, output_tokens: 10 } } });
      expect((await ask(run, ck)).statusCode).toBe(200);
    }
    expect((await ask(run, ck)).json().error).toBe('run_limit');
  });
  it('30 daqiqadan keyin yurish yopiladi', async () => {
    const ck = await login();
    const { run } = (await post('/agent/run', { scenario: 'mr.ask' }, ck)).json();
    clock = new Date(clock.getTime() + 31 * 60e3);
    expect((await ask(run, ck)).json().error).toBe('run_expired');
  });
  it('birinchi qadamda model xatosi — tanga va bepul savol qaytadi', async () => {
    const ck = await login();
    await give('ali@mail.uz', 5);
    const paid = (await post('/agent/run', { scenario: 'mr.audit' }, ck)).json();
    expect(paid.balance).toBe(2);
    upstream.push({ status: 529, body: { error: { type: 'overloaded_error' } } });
    const r = await ask(paid.run, ck);
    expect(r.statusCode).toBe(503);
    expect((await get('/me', ck)).json().balance).toBe(5);
    const free = (await post('/agent/run', { scenario: 'mr.ask' }, ck)).json();
    expect(free.freeLeft).toBe(2);
    upstream.push({ status: 500, body: {} });
    await ask(free.run, ck);
    expect((await get('/agent/config', ck)).json().freeLeft).toBe(3);
  });
  it('tarmoq xatosi ham qaytariladi', async () => {
    await app.close();
    app = await makeApp({ apiKey: 'k', services: ['mr'], fetchImpl: async () => { throw new Error('ECONNRESET'); } });
    const ck = await login();
    const { run } = (await post('/agent/run', { scenario: 'mr.ask' }, ck)).json();
    expect((await ask(run, ck)).json().error).toBe('agent_busy');
    expect((await db.query(`SELECT status FROM agent_runs WHERE id = $1`, [run])).rows[0].status).toBe('failed');
  });
});

describe('agent — band matni', () => {
  it('/agent/clause — kirishsiz, soʻzma-soʻz', async () => {
    const r = (await get('/agent/clause?doc=ShNQ%202.07.01-23&clause=86')).json();
    expect(r).toMatchObject({ found: true, clause: '86-band', doc: 'ShNQ 2.07.01-23' });
    expect(r.text).toContain('30 foizdan');
  });
});

describe('agent — yordamchilar', () => {
  it('Toshkent kuni boshi', () => {
    expect(dayStart(new Date('2026-11-13T20:30:00Z')).toISOString()).toBe('2026-11-13T19:00:00.000Z');
    expect(dayStart(new Date('2026-11-13T10:00:00Z')).toISOString()).toBe('2026-11-12T19:00:00.000Z');
  });
  it('narx: nomaʼlum model qimmat hisoblanadi', () => {
    expect(costMicro('claude-sonnet-5-5', { input_tokens: 1e6 })).toBe(2e6);
    expect(costMicro('nomaʼlum', { output_tokens: 1e6 })).toBe(25e6);
  });
  it('suhbat: oxirgi xabar foydalanuvchidan; matn uzunligi cheklangan', () => {
    const names = new Set(['get_tep']);
    expect(() => sanitizeMessages([{ role: 'assistant', content: 'x' }], names)).toThrow();
    expect(() => sanitizeMessages([{ role: 'user', content: 'x'.repeat(130_000) }], names)).toThrow();
    expect(sanitizeMessages([{ role: 'user', content: 'salom', extra: 1 }], names)).toEqual([{ role: 'user', content: [{ type: 'text', text: 'salom', cache_control: { type: 'ephemeral' } }] }]);
  });
});

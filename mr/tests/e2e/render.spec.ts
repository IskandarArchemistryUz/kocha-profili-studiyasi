import { test, expect, type Page, pickLang } from './fx';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIX = join(process.cwd(), 'tests/e2e/fixtures/terrarium.png');
const B64 = readFileSync(FIX).toString('base64');

async function open(page: Page, errs: string[]): Promise<void> {
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => { errs.push(`dialog: ${d.message()}`); void d.dismiss(); });
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load|status of 40[12]/.test(m.text())) errs.push(`console: ${m.text().slice(0, 200)}`); });
  await page.route(/fonts\.g/, r => r.abort());
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('renInit')) { sessionStorage.setItem('renInit', '1'); localStorage.removeItem('kps_air'); localStorage.removeItem('ren-state'); localStorage.removeItem('render-base'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto('./render.html');
}

/** 13.11 (Render 1-bosqich): soxta server — /render/* va R2. Kalit yoʻq, hamma render serverda, tanga bilan. */
const API = 'https://api.test', R2 = 'https://r2.test';
interface Hits { uploads: { type: string; bytes: number }[]; puts: string[]; jobs: Record<string, unknown>[]; polls: number }
async function mockServer(page: Page, o: { enabled?: boolean; balance?: number } = {}): Promise<Hits> {
  const hits: Hits = { uploads: [], puts: [], jobs: [], polls: 0 };
  const jobs = new Map<string, { n: number; body: Record<string, unknown> }>();
  const view = (id: string, full: boolean) => {
    const j = jobs.get(id)!, done = j.n >= 2;
    return { id, status: done ? 'done' : 'running', engine: j.body.engine, source: j.body.source, coins: 4, created: new Date(Date.UTC(2026, 10, 13, 10, 0, Number(id))).toISOString(), finished: null, downgraded: false,
      params: { subj: j.body.subj, style: j.body.style, fid: j.body.fid, refs: (j.body.refs as unknown[]).length }, tag: j.body.tag,
      ...(done ? { thumb: `${R2}/get/th/${id}.webp`, ...(full ? { out: `${R2}/get/out/${id}.png`, w: 256, h: 256, prompt: 'INPUT: … GEOMETRY …' } : {}) } : {}) };
  };
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url()), m = r.request().method();
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: o.balance ?? 20, trialsLeft: 1, owner: false });
    if (u.pathname === '/render/config') return json(200, { enabled: o.enabled !== false, message: o.enabled === false ? 'Render vaqtincha ishlamayapti' : null, engines: { fast: { coins: 1 }, pro: { coins: 2 }, pro4k: { coins: 4 } }, maxBytes: 8388608, maxSide: 2048, maxRefs: 4, types: ['image/webp', 'image/png'], owner: false, parallel: 2 });
    if (u.pathname === '/render/upload-url') { const b = r.request().postDataJSON(); hits.uploads.push(b); return json(200, { key: `in/u1/${hits.uploads.length}.webp`, url: `${R2}/put/${hits.uploads.length}`, method: 'PUT', headers: { 'content-type': b.type } }); }
    if (u.pathname === '/render/jobs' && m === 'POST') {
      const b = r.request().postDataJSON(); hits.jobs.push(b);
      if ((o.balance ?? 20) < 4) return json(402, { error: 'insufficient', message: 'tanga yetarli emas', need: 4, balance: o.balance });
      const id = String(hits.jobs.length); jobs.set(id, { n: 0, body: b });
      return json(200, { id, status: 'running', engine: b.engine, coins: 4, downgraded: false, balance: 16 });
    }
    const jm = /^\/render\/jobs\/(\d+)$/.exec(u.pathname);
    if (jm && jobs.has(jm[1])) { hits.polls++; jobs.get(jm[1])!.n++; return json(200, view(jm[1], true)); }
    if (u.pathname === '/render/history') return json(200, { items: [...jobs.keys()].reverse().map(id => view(id, false)) });
    return json(404, {});
  });
  await page.route(`${R2}/**`, async r => {
    const u = new URL(r.request().url()), cors = { 'access-control-allow-origin': '*' };
    if (r.request().method() === 'PUT') { hits.puts.push(r.request().headers()['content-type']); return r.fulfill({ status: 200, headers: cors, body: '' }); }
    if (u.pathname.startsWith('/get/')) return r.fulfill({ status: 200, headers: cors, contentType: 'image/png', body: Buffer.from(B64, 'base64') });
    return r.fulfill({ status: 404, headers: cors, body: '' });
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); }, API);
  return hits;
}

test('Render studiyasi: kalitsiz — server navbati, R2 ga yuklash, 2 variant, holat soʻrovi, solishtirish, Chizmadonga', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  const hits = await mockServer(page);
  await open(page, errs);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.eko .svc a[data-svc=ren]')).toHaveClass(/on/);
  await expect(page.locator('.ren-hello')).toBeVisible();
  // kalit va provayder maydonlari yoʻq
  await expect(page.locator('#renKey, #prov, #renModel, .ren-key')).toHaveCount(0);
  // asos rasm — fayldan
  await page.locator('#srcFile').click();
  await page.locator('#renFile').setInputFiles(FIX);
  await expect(page.locator('.ren-base img')).toBeVisible();
  await expect(page.locator('.ren-frame .ren-img')).toBeVisible();
  await expect(page.locator('#srcPick')).toContainText('1');
  // referens — material
  await page.locator('#refAdd').click();
  await page.locator('#renFile').setInputFiles(FIX);
  await expect(page.locator('.ren-refs .ref')).toHaveCount(1);
  await page.locator('.ren-refs .ref .role').click();
  await page.locator('.ren-refs .ren-menu button', { hasText: 'Material' }).click();
  await expect(page.locator('.ren-refs .ref .role')).toContainText('Material');
  // sozlamalar
  await page.locator('#subj button', { hasText: 'Bitta bino' }).click();
  await page.locator('#sty [data-sty=toshkent]').click();
  await page.locator('#fid button', { hasText: 'Muvozanat' }).click();
  await page.locator('#nVar button', { hasText: '2' }).click();
  await expect(page.locator('#eng button')).toHaveCount(3);
  await expect(page.locator('#eng [data-eng=pro] code')).toHaveText('2');
  await page.locator('#eng [data-eng=pro4k]').click();
  await expect(page.locator('#renGo')).toContainText('2 variant');
  await expect(page.locator('#renGo .ren-price')).toHaveText('8 tanga');
  await page.locator('#renGo').click();
  await expect(page.locator('#renView')).toBeVisible({ timeout: 40_000 });
  // asos va referens bir martadan yuklandi (WebP, R2 ga toʻgʻridan-toʻgʻri); ikki ish
  expect(hits.uploads.map(u => u.type)).toEqual(['image/webp', 'image/webp']);
  expect(hits.puts).toEqual(['image/webp', 'image/webp']);
  expect(hits.jobs).toHaveLength(2);
  expect(hits.jobs[0]).toMatchObject({ engine: 'pro4k', subj: 'bino', style: 'toshkent', fid: 'muvozanat', source: 'fayl', input: { key: 'in/u1/1.webp' }, refs: [{ key: 'in/u1/2.webp', role: 'material' }] });
  expect(JSON.stringify(hits.jobs[0])).not.toMatch(/prompt|key":"sk|gemini|openai/i);
  expect(hits.polls).toBeGreaterThanOrEqual(4);
  await expect(page.locator('#vMode button[aria-pressed=true]')).toContainText('solishtirish');
  await expect(page.locator('.ren-va .ren-gal button')).toHaveCount(2);
  await expect(page.locator('.ren-va dd code')).toHaveText('Archemistry Pro 4K');
  await page.screenshot({ path: 'test-results/render-natija.png' });
  await page.locator('#vMode button', { hasText: 'Yonma-yon' }).click();
  await expect(page.locator('.ren-yon figure')).toHaveCount(2);
  // referens qilish va orqaga
  await page.locator('#vRef').click();
  await expect(page.locator('.ren-refs .ref')).toHaveCount(2);
  await page.locator('#vBack').click();
  await expect(page.locator('#renGal button')).toHaveCount(2);
  await page.locator('#stView button', { hasText: 'Solishtirish' }).click();
  await expect(page.locator('.ren-frame .ren-cmp')).toBeVisible();
  await page.screenshot({ path: 'test-results/render-studiya.png' });
  // saqlanish: kesh (eskiz) + server tarixi — takrorlanmaydi
  await page.reload();
  await expect(page.locator('#renGal button')).toHaveCount(2);
  await page.waitForTimeout(600);
  await expect(page.locator('#renGal button')).toHaveCount(2);
  await expect(page.locator('.ren-refs .ref')).toHaveCount(2);
  await expect(page.locator('#sty [data-sty=toshkent]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#eng [data-eng=pro4k]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('kps_air'))).toBeNull();
  // tungi rejim va planshet
  await page.locator('#themeBtn').click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: 'test-results/render-dark-1024.png' });
  // Chizmadonga
  await page.locator('#renGal button').first().click();
  await page.locator('#vChz').click();
  await expect(page).toHaveURL(/#\/p\/[\w-]+\/chizmadon$/, { timeout: 20_000 });
  await expect(page.locator('.gx.ch')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => localStorage.getItem('ks-chz-inbox'))).toBeNull();
  expect(errs).toEqual([]);
});

test('Render: server kalitsiz — «Render vaqtincha ishlamayapti», tugma oʻchiq', async ({ page }) => {
  const errs: string[] = [];
  const hits = await mockServer(page, { enabled: false });
  await open(page, errs);
  await page.locator('#srcFile').click();
  await page.locator('#renFile').setInputFiles(FIX);
  await expect(page.locator('#renOff')).toHaveText('Render vaqtincha ishlamayapti');
  await expect(page.locator('#renGo')).toBeDisabled();
  expect(hits.uploads).toHaveLength(0);
  expect(errs).toEqual([]);
});

test('Render: tanga yetmasa — xabar va «Tanga sotib olish»', async ({ page }) => {
  const errs: string[] = [];
  const hits = await mockServer(page, { balance: 1 });
  await open(page, errs);
  await page.locator('#srcFile').click();
  await page.locator('#renFile').setInputFiles(FIX);
  await page.locator('#eng [data-eng=pro4k]').click();
  await page.locator('#renGo').click();
  await expect(page.locator('#renErr')).toContainText('Tanga yetmaydi: kerak 4, hisobingizda 1');
  await expect(page.locator('#renBuy')).toBeVisible();
  expect(hits.jobs).toHaveLength(1);
  expect(errs).toEqual([]);
});

test('boshqa xizmatdan yuborilgan kadr asos rasm boʻlib ochiladi (#/s/<id>), inglizcha', async ({ page }) => {
  const errs: string[] = [];
  await open(page, errs);
  await page.evaluate(async b64 => {
    const db: IDBDatabase = await new Promise((ok, no) => { const r = indexedDB.open('archemistry-mr'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    await new Promise<void>((ok, no) => { const t = db.transaction('cache', 'readwrite'); t.objectStore('cache').put({ k: 'render-src', v: [{ id: 'sMR1', name: 'Oliy Himmat · 3D', from: 'mr', subj: 'reja', t: new Date().toISOString(), img: `data:image/png;base64,${b64}`, w: 256, h: 256 }], t: Date.now() }); t.oncomplete = () => ok(); t.onerror = () => no(t.error); });
  }, B64);
  await page.goto('./render.html#/s/sMR1');
  await expect(page.locator('.ren-base .cap')).toContainText('Oliy Himmat · 3D');
  await expect(page.locator('#subj button[aria-pressed=true]')).toHaveText('Master reja');
  await pickLang(page, 'en');
  await expect(page.locator('#renRight .ttl')).toHaveText('Render');
  await expect(page.locator('#srcFile')).toHaveText('From file');
  expect(errs).toEqual([]);
});

test('Koʻchasoz varagʻidan «Render studiyasiga» — kesim asos rasm boʻladi', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto('./kochasoz.html#/varaq');
  await expect(page.locator('.ws-varaq svg[role=img]')).toBeVisible();
  await page.locator('.ws-varaq button[data-ren]').click();
  await expect(page).toHaveURL(/render\.html/, { timeout: 20_000 });
  await expect(page.locator('.ren-base .fr')).toHaveText('Koʻchasoz');
  await expect(page.locator('#subj button[aria-pressed=true]')).toHaveText('Koʻcha');
  await expect(page.locator('.ren-base .cap code')).toHaveText(/^2400×\d+$/);
  expect(errs).toEqual([]);
});

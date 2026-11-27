import { test, expect } from './fx';
import { createServer, type Server } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Yershunos · mahalliy maʼlumot va AI (27.11): AI foydalanuvchi bergan qiymatlarni taklif qiladi, oʻylab topilgan son rad etiladi;
 *  «Saqlash» dan keyin qiymat tuman kartasida va hisobotda chiqadi, Lab hisobiga (bulut) yoziladi va qayta ochilganda qaytadi. */
const ROOT = resolve(process.cwd(), '..'), PORT = 4198, API = `http://127.0.0.1:${PORT}/api`;
let srv: Server;
test.beforeAll(async () => {
  srv = createServer((q, s) => {
    let p = join(ROOT, decodeURIComponent((q.url ?? '/').split('?')[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) { s.statusCode = 404; s.end(''); return; }
    const ext = p.split('.').pop()!;
    s.setHeader('content-type', ({ html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', geojson: 'application/json', svg: 'image/svg+xml', png: 'image/png' } as Record<string, string>)[ext] ?? 'application/octet-stream');
    s.end(readFileSync(p));
  });
  await new Promise<void>(r => srv.listen(PORT, '127.0.0.1', () => r()));
});
test.afterAll(() => { srv?.close(); });

const tu = (id: string, name: string, input: unknown) => ({ type: 'tool_use', id, name, input });

for (const lang of ['uz', 'ru'] as const) {
  test(`Yershunos · mahalliy maʼlumot (${lang}): taklif → saqlash → karta, hisobot, bulut`, async ({ page }) => {
    test.setTimeout(180_000);
    const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(([api, l]) => { try { localStorage.setItem('kps_api', api); localStorage.setItem('mr-lang', l); localStorage.setItem('kps_lang', l); } catch { /* */ } }, [API, lang]);
    await page.route(/fonts\.g|nominatim/, r => r.abort());
    await page.route(/unpkg\.com/, r => r.fulfill({ path: join(process.cwd(), 'node_modules/maplibre-gl/dist/maplibre-gl.js'), contentType: 'text/javascript' }));
    await page.route(/elevation-tiles-prod/, r => r.fulfill({ path: join(ROOT, 'app/yershunos/tiles/11/1426/760.png'), contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));

    // ——— soxta Lab serveri: hisob, agent, bulut ———
    const steps: any[] = []; let cloud: Buffer | null = null, ver = 0, runs = 0;
    await page.route(/\/api\//, async (r) => {
      const q = r.request(), u = new URL(q.url()), p = u.pathname.replace('/api', ''), body = q.method() === 'POST' ? q.postDataJSON() : null;
      const j = (json: unknown, status = 200) => r.fulfill({ status, json });
      if (p === '/me') return j({ id: 7, email: 'hokim@baxmal.uz', balance: 10 });
      if (p === '/agent/config') return j({ enabled: true, services: ['mr', 'ys'], scenarios: { 'ys.ask': { svc: 'ys', tier: 'short', coins: 1 }, 'ys.kirit': { svc: 'ys', tier: 'mid', coins: 2 } }, freePerWeek: 3, freeLeft: 3, maxSteps: 10 });
      if (p === '/agent/run') { runs++; expect(body.scenario).toBe('ys.kirit'); return j({ run: '1', free: false, charged: 2, balance: 8, freeLeft: 3, maxSteps: 10 }); }
      if (p === '/agent/step') {
        steps.push(body);
        if (steps.length === 1) return j({ content: [tu('a', 'ys_context', {}), tu('b', 'ys_find_units', { names: ['Baxmal', 'Бахмальский район', 'Andijon', 'Shahrisabz tumani', 'Xiva shahri'] })], stop: 'tool_use', status: 'open', stepsLeft: 9 });
        if (steps.length === 2) return j({ content: [tu('c', 'ys_propose', { summary: 'Baxmal: kommunal xizmatlar', entries: [
          { unit: 'Baxmal tumani', field: 'suv', value: 71, year: 2026, source: 'Tuman hokimligi' },
          { unit: 'Baxmal tumani', field: 'kan', value: 12, year: 2026, source: 'Tuman hokimligi' },
          { unit: 'Baxmal tumani', field: 'aholi', value: 185400, year: 2026, source: 'Tuman hokimligi' },
          { unit: 'Baxmal tumani', field: 'kam', value: 38, year: 2026, source: 'Tuman hokimligi' },       // foydalanuvchi bermagan son
          { unit: 'Baxmal tumani', field: 'ishs', value: 71, year: 2026, source: 'Tuman hokimligi' },      // oraliqdan tashqari
          { unit: 'Baxmal', field: 'gaz', value: 12, year: 2026, source: 'Tuman hokimligi' },              // nom aniq emas
          { unit: 'Baxmal tumani', field: 'gaz', value: 12, year: 2026, source: '' },                      // manbasiz
        ] })], stop: 'tool_use', status: 'open', stepsLeft: 8 });
        return j({ content: [{ type: 'text', text: 'Baxmal tumani uchun 3 ta qiymat saqlashga tayyor.' }], stop: 'end_turn', status: 'done', stepsLeft: 7 });
      }
      if (p === '/projects/ys_kiritma_v1' && q.method() === 'GET') return cloud ? j({ project: { id: 'ys_kiritma_v1', version: ver }, version: ver, url: `${API}/r2get` }) : j({ error: 'not_found' }, 404);
      if (p === '/projects/ys_kiritma_v1/upload') { expect(body).toMatchObject({ type: 'yershunos', base_version: ver }); return j({ key: 'k1', put: { url: `${API}/r2put`, headers: { 'content-type': 'application/gzip' } } }); }
      if (p === '/r2put') { cloud = q.postDataBuffer(); return r.fulfill({ status: 200, body: '' }); }
      if (p === '/projects/ys_kiritma_v1/commit') { expect(body.meta).toMatchObject({ kind: 'kiritma' }); ver++; return j({ project: { id: 'ys_kiritma_v1', version: ver } }); }
      if (p === '/r2get') return r.fulfill({ status: 200, body: cloud!, contentType: 'application/gzip' });
      return j({ error: 'not_found' }, 404);
    });

    await page.goto(`http://127.0.0.1:${PORT}/app/yershunos/`);
    await expect(page.locator('#uzd .big')).toBeVisible({ timeout: 60_000 });
    await page.evaluate(() => (window as any).uzPick('Baxmal tumani', false));
    // kartadagi havola panelni ochadi; kirgan foydalanuvchiga balans koʻrinadi
    await page.click('#uzd a[data-yk]');
    await expect(page.locator('#ykP')).toBeVisible();
    await expect(page.locator('#ykBal')).toContainText('10');
    await expect(page.locator('#ykPrice')).toContainText('2');
    await page.fill('#ykQ', 'Baxmal tumani: ichimlik suvi 71 %, kanalizatsiya 12 %, aholi 185,4 ming kishi. 2026-yil, manba: tuman hokimligi');
    await page.click('#ykGo');
    const card = page.locator('#ykLog .yk-card');
    await expect(card).toBeVisible({ timeout: 30_000 });
    expect(runs).toBe(1);

    // nomlarni topish: lotin va kirill bir xil birlikka; tuman va shahar bir nomda — tanlanmaydi; birlashgan birlik
    const res = (i: number, id: string) => JSON.parse(steps[i].messages.at(-1).content.find((c: any) => c.tool_use_id === id).content);
    const found = res(1, 'b').results;
    expect(found[0]).toMatchObject({ match: 'Baxmal tumani', region: 'Jizzax viloyati' });
    expect(found[1]).toMatchObject({ match: 'Baxmal tumani' });
    expect(found[2].match).toBeNull(); expect(found[2].ambiguous.map((x: any) => x.unit).sort()).toEqual(['Andijon shahri', 'Andijon tumani']);
    expect(found[3]).toMatchObject({ match: 'Shahrisabz tumani' });
    expect(found[4]).toMatchObject({ match: 'Xiva tumani + Xiva shahri' });
    const ctx = res(1, 'a'); expect(ctx.selected_unit).toMatchObject({ name: 'Baxmal tumani' }); expect(ctx.indicators.map((x: any) => x.key)).toContain('kam');
    // taklif: 3 ta qabul (ming → kishi oʻgirildi), 4 ta rad — sababi bilan
    const pr = res(2, 'c');
    expect(pr.accepted).toBe(3); expect(pr.rejected_count).toBe(4);
    expect(pr.rejected.map((x: any) => x.error.slice(0, 22))).toEqual(['this value is not in th', 'value out of range 0–6', 'unknown unit — use the', 'source is required (or'].map(s => s.slice(0, 22)));
    expect(pr.compared_with_official.find((x: any) => x.field === 'suv')).toMatchObject({ value: 71 });

    await expect(card).toContainText('71 %'); await expect(card).toContainText('12 %'); await expect(card).not.toContainText('38');
    await expect(card.locator('tbody tr')).toHaveCount(3);
    await card.locator('[data-a=ok]').click();
    await expect(card.locator('.yk-done')).toBeVisible();
    expect(ver).toBe(1); expect(cloud).not.toBeNull();

    // tuman kartasi va saqlanganlar roʻyxati
    await expect(page.locator('#uzd')).toContainText('71 %');
    await expect(page.locator('#uzd')).toContainText('Tuman hokimligi');
    await expect(page.locator('#uzd')).toContainText(lang === 'uz' ? 'Reyting va indeks hisobiga kirmaydi.' : 'В рейтинг и индекс не входит.');
    await expect(page.locator('#ykSv summary')).toContainText('3');
    // hisobot (tuman): alohida jadval, sahifa toshmaydi
    await page.click('#ykX');
    await page.evaluate(() => (window as any).uzHisobot('t'));
    await expect(page.locator('#hbd')).toContainText(lang === 'uz' ? "Mahalliy ma'lumot (foydalanuvchi kiritgan)" : 'Местные данные (введены пользователем)');
    await expect(page.locator('#hbd')).toContainText('185 400');
    expect(await page.evaluate(() => [...document.querySelectorAll('#hbd .hb-body')].map(b => b.scrollHeight - b.clientHeight).filter(x => x > 1).length)).toBe(0);
    await page.click('#hbx');

    // boshqa qurilma: brauzer nusxasi yoʻq — bulutdan qaytadi
    await page.evaluate(() => localStorage.removeItem('ys-kiritma@7'));
    await page.reload();
    await expect(page.locator('#uzd .big')).toBeVisible({ timeout: 60_000 });
    await page.evaluate(() => (window as any).uzPick('Baxmal tumani', false));
    await expect(page.locator('#uzd')).toContainText('Tuman hokimligi', { timeout: 20_000 });
    // oʻchirish: bulutga ham yoziladi
    await page.click('#ykBtn'); await page.locator('#ykSv summary').click();
    await page.locator('#ykSv .rw button').first().click();
    await expect(page.locator('#ykSv summary')).toContainText('2');
    await expect.poll(() => ver).toBe(2);

    expect(await page.evaluate(() => Object.keys((window as any).T.yoq))).toEqual([]);
    expect(errs).toEqual([]);
  });
}

test('Yershunos · mahalliy maʼlumot: kirmagan foydalanuvchi — sahifa tarmoqsiz ochiladi, panel kirishni soʻraydi', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  const calls: string[] = [];
  await page.addInitScript((api) => { try { localStorage.setItem('kps_api', api); } catch { /* */ } }, API);
  await page.route(/fonts\.g|nominatim/, r => r.abort());
  await page.route(/unpkg\.com/, r => r.fulfill({ path: join(process.cwd(), 'node_modules/maplibre-gl/dist/maplibre-gl.js'), contentType: 'text/javascript' }));
  await page.route(/\/api\//, r => { const p = new URL(r.request().url()).pathname; calls.push(p); return p === '/api/agent/config' ? r.fulfill({ json: { enabled: true, services: ['ys'], scenarios: {} } }) : r.fulfill({ status: 401, json: { error: 'auth', message: 'tizimga kiring' } }); });
  await page.goto(`http://127.0.0.1:${PORT}/app/yershunos/`);
  await expect(page.locator('#ykBtn')).toBeVisible();
  expect(calls).toEqual([]);
  await page.click('#ykBtn');
  await expect(page.locator('#ykLog .yk-login')).toContainText('Hisobga kirish');
  await expect(page.locator('#ykLog .yk-intro')).toContainText('AI son o\'ylab topmaydi');
  expect(errs).toEqual([]);
});

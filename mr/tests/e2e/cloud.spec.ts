import { test, expect, type Page } from './fx';

/** 14.11 (bulut, 2-PR): soxta server — /me, /projects/* va R2. Brauzerdagi loyiha tanlab koʻchiriladi; boshqa qurilmada ochiladi. */
const API = 'https://api.test', R2 = 'https://r2.test';
interface Row { id: string; type: string; name: string; meta: unknown; version: number; key: string; bytes: number; updated: string }
async function mock(page: Page, store: { rows: Map<string, Row>; blobs: Map<string, Buffer> }): Promise<void> {
  let n = 0;
  const item = (r: Row) => ({ id: r.id, type: r.type, name: r.name, meta: r.meta, version: r.version, bytes: r.bytes, created: r.updated, updated: r.updated, deleted: null });
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url()), m = r.request().method();
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET,POST,PATCH,DELETE', 'access-control-allow-headers': 'content-type' } });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: 20, trialsLeft: 1, owner: false });
    if (u.pathname === '/projects') return json(200, { items: [...store.rows.values()].map(item), usage: { bytes: [...store.rows.values()].reduce((a, x) => a + x.bytes, 0), count: store.rows.size, quota: 524288000, max: 300 } });
    let mm;
    if ((mm = /^\/projects\/([\w-]+)\/upload$/.exec(u.pathname))) {
      const b = r.request().postDataJSON(), cur = store.rows.get(mm[1]);
      if ((cur?.version ?? 0) !== b.base_version) return json(409, { error: 'conflict', message: 'x', version: cur?.version ?? 0 });
      const key = `projects/1/${mm[1]}/${++n}.json.gz`;
      return json(200, { key, put: { url: `${R2}/put/${key}`, headers: { 'content-type': 'application/gzip' } }, expires: 300 });
    }
    if ((mm = /^\/projects\/([\w-]+)\/commit$/.exec(u.pathname))) {
      const b = r.request().postDataJSON(), cur = store.rows.get(mm[1]);
      const row: Row = { id: mm[1], type: b.type, name: b.name, meta: b.meta, version: (cur?.version ?? 0) + 1, key: b.key, bytes: store.blobs.get(b.key)!.length, updated: new Date().toISOString() };
      store.rows.set(mm[1], row); return json(200, { project: item(row) });
    }
    if ((mm = /^\/projects\/([\w-]+)$/.exec(u.pathname)) && m === 'GET') {
      const row = store.rows.get(mm[1]); if (!row) return json(404, { error: 'not_found', message: 'loyiha topilmadi' });
      return json(200, { project: item(row), version: row.version, url: `${R2}/get/${row.key}` });
    }
    return json(404, {});
  });
  await page.route(`${R2}/**`, async r => {
    const u = new URL(r.request().url()), cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT', 'access-control-allow-headers': 'content-type' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    if (r.request().method() === 'PUT') { store.blobs.set(decodeURIComponent(u.pathname.slice(5)), r.request().postDataBuffer()!); return r.fulfill({ status: 200, headers: cors, body: '' }); }
    const b = store.blobs.get(decodeURIComponent(u.pathname.slice(5)));
    return b ? r.fulfill({ status: 200, headers: cors, contentType: 'application/gzip', body: b }) : r.fulfill({ status: 404, headers: cors, body: '' });
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('mr-lang', 'uz'); localStorage.setItem('mr-tour-done', '1'); }, API);
  await page.route(/fonts\.g/, r => r.abort());
}

test('Bulut: brauzerdagi loyihani tanlab koʻchirish, keyin «boshqa qurilmada» ochish', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const store = { rows: new Map<string, Row>(), blobs: new Map<string, Buffer>() };
  await mock(page, store);
  await page.goto('./#/yangi');
  await page.waitForURL(/#\/p\/p_/);
  const pid = page.url().split('#/p/')[1];
  await page.goto('./#/');
  const card = page.locator(`[data-pid="${pid}"]`);
  await expect(card).toBeVisible();
  await expect(page.locator('#cloudMove')).toBeDisabled();
  await card.locator('label.ck').click();
  await expect(page).toHaveURL(/#\/$/);   // belgilash loyihani ochmaydi
  await expect(page.locator('#cloudMove')).toBeEnabled();
  await page.locator('#cloudMove').click();
  await expect(card.locator('[data-cloud="on"]')).toBeVisible({ timeout: 15_000 });
  expect(store.rows.get(pid)).toMatchObject({ version: 1, type: 'master' });
  expect(store.blobs.size).toBe(1);

  // boshqa qurilma: toza brauzer konteksti
  const ctx2 = await browser.newContext({ baseURL: new URL('.', page.url()).href });
  const p2 = await ctx2.newPage();
  await mock(p2, store);
  await p2.goto('./#/');
  await expect(p2.locator(`[data-cid="${pid}"]`)).toBeVisible({ timeout: 15_000 });
  await p2.locator(`[data-cid="${pid}"]`).click();
  await expect(p2.locator('.save')).toContainText('bulutda', { timeout: 20_000 });
  await ctx2.close();
});

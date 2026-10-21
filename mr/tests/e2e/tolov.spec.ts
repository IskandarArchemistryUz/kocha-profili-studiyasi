import { test, expect, type Page } from './fx';

/** Tanga sotib olish: toʻplam + Payme/Click → toʻlov sahifasi (soxta) → qaytish (?tolov=<id>) → balans */
const API = 'https://api.test';
async function mockApi(page: Page, opts: { payme?: boolean; click?: boolean } = {}) {
  const st = { orders: [] as { pack: string; provider: string }[], paid: false };
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url()), b = r.request().postDataJSON?.() ?? {};
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: st.paid ? 130 : 30, trialsLeft: 3 });
    if (u.pathname === '/auth/config') return json(200, { email: true, phone: false, google: null });
    if (u.pathname === '/pay/config') return json(200, { payme: opts.payme ?? true, click: opts.click ?? true, packs: [
      { id: 'p10', coins: 10, uzs: 39000, usd: 4 }, { id: 'p30', coins: 30, uzs: 99000, usd: 10 }, { id: 'p100', coins: 100, uzs: 290000, usd: 25 }, { id: 'p300', coins: 300, uzs: 690000, usd: 59 }] });
    if (u.pathname === '/pay/order') { st.orders.push(b); return json(200, { orderId: 7, amount: 290000, coins: 100, url: new URL('./?tolov=7', page.url()).href }); }
    if (u.pathname === '/pay/order/7') { st.paid = true; return json(200, { id: 7, pack: 'p100', coins: 100, amount: 290000, provider: 'click', state: 'paid', balance: 130 }); }
    return json(404, {});
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); }, API);
  return st;
}

test('tanga: toʻplam va Click tanlanadi → toʻlov sahifasi → qaytishda balans', async ({ page }) => {
  const st = await mockApi(page);
  await page.goto('./'); await page.click('#newP');
  await page.click('#acctPop'); await page.click('#acctBuy');
  await expect(page.locator('#tanga')).toBeVisible();
  await expect(page.locator('#tanga .tb-pack')).toHaveCount(4);
  await expect(page.locator('[data-pack=p30]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-prov=payme]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-pack=p100]'); await page.click('[data-prov=click]');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tanga.png` });
  await page.click('#tbGo');
  await expect(page.locator('.toast').last()).toContainText('100 tanga qoʻshildi');
  expect(st.orders).toEqual([{ pack: 'p100', provider: 'click' }]);
  expect(page.url()).not.toContain('tolov=');
});

test('tanga: 1024 px, tungi rejim; toʻlov ulanmagan boʻlsa — xabar, tugma oʻchiq', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await mockApi(page, { payme: false, click: false });
  await page.goto('./'); await page.click('#newP');
  await page.click('[aria-label="Tungi rejim"]');
  await page.click('#acctPop'); await page.click('#acctBuy');
  await expect(page.locator('#tanga .kd-msg')).toContainText('tez orada');
  await expect(page.locator('#tbGo')).toBeDisabled();
  await expect(page.locator('#tanga .tb-prov')).toHaveCount(0);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tanga_1024_dark.png` });
  await page.keyboard.press('Escape'); await expect(page.locator('#tanga')).toHaveCount(0);
});

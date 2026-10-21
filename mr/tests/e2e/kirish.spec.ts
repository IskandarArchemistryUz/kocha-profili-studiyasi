import { test, expect, type Page } from './fx';

/** Kirish: 1–2-qadamlar ochiq, 3-qadamdan boshlab — pochta kodi bilan kirish (API soxta: api.test) */
const API = 'https://api.test';
async function mockApi(page: Page, opts: { google?: string | null } = {}) {
  const st = { logged: false, codes: [] as string[] };
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url()), b = r.request().postDataJSON?.() ?? {};
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return st.logged ? json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: 50, trialsLeft: 3 }) : json(401, { error: 'auth', message: 'tizimga kiring' });
    if (u.pathname === '/auth/config') return json(200, { email: true, phone: false, google: opts.google ?? null });
    if (u.pathname === '/auth/code') { st.codes.push(b.target); return json(200, { sent: true, kind: 'email' }); }
    if (u.pathname === '/auth/verify') { if (b.code !== '123456') return json(400, { error: 'bad_code', message: 'kod notoʻgʻri' }); st.logged = true; return json(200, { ok: true }); }
    if (u.pathname === '/auth/logout') { st.logged = false; return json(200, { ok: true }); }
    return json(404, {});
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); }, API);
  return st;
}

test('kirish: 3-qadamdan pochta kodi bilan, chiqish, Chizmadon ham yopiq', async ({ page }) => {
  const st = await mockApi(page);
  await page.goto('./'); await page.click('#newP');
  await expect(page.locator('#acctIn')).toBeVisible();
  // 1–2-qadamlar — kirishsiz
  await page.click('[data-step=uchastka]'); await page.click('#rectSite');
  await expect(page.locator('#kirish')).toHaveCount(0);
  // 3-qadam — kirish oynasi
  await page.click('[data-step=kocha]');
  await expect(page.locator('#kirish')).toBeVisible();
  await expect(page.locator('#kirish .kd-lead')).toContainText('Koʻchalar');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/kirish.png` });
  await page.fill('#kdEmail', 'ali@mail.uz'); await page.click('#kdGo');
  await expect(page.locator('#kdCode')).toBeVisible(); expect(st.codes).toEqual(['ali@mail.uz']);
  await page.fill('#kdCode', '000000'); await page.click('#kdGo');
  await expect(page.locator('#kirish .kd-msg')).toContainText('kod notoʻgʻri');
  await page.fill('#kdCode', '123456'); await page.click('#kdGo');
  await expect(page.locator('#kirish')).toHaveCount(0);
  await expect(page.locator('.panel h2')).toHaveText('Koʻchalar');
  await expect(page.locator('#acctPop')).toHaveText('A');
  // chiqish → yana 2-qadam, Chizmadon soʻraydi
  await page.click('#acctPop'); await expect(page.locator('#acctBal')).toHaveText('50'); await page.click('#acctOut');
  await expect(page.locator('#acctIn')).toBeVisible();
  await expect(page.locator('.panel h2')).toHaveText('Uchastka');
  await page.click('#chOpen'); await expect(page.locator('#kirish')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#kirish')).toHaveCount(0);
  await expect(page.locator('.gx.ch')).toHaveCount(0);
});

test('kirish: tungi rejim va 1024 px, server javob bermasa — tushunarli xabar', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', 'https://api.yoq.test'); localStorage.setItem('kps_owner', '0'); });
  await page.route('https://api.yoq.test/**', r => r.abort());
  await page.goto('./'); await page.click('#newP');
  await page.click('[aria-label="Tungi rejim"]');
  await page.click('[data-step=uchastka]'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  await expect(page.locator('#kirish')).toBeVisible();
  await page.fill('#kdEmail', 'ali@mail.uz'); await page.click('#kdGo');
  await expect(page.locator('#kirish .kd-msg')).toContainText('Server bilan aloqa yoʻq');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/kirish_1024_dark.png` });
});

test('kirish oʻchirilsa (kps_auth=0) — hamma qadam ochiq, «Kirish» tugmasi yoʻq', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('kps_owner', '0'); localStorage.setItem('kps_auth', '0'); });
  await page.goto('./'); await expect(page.locator('#homeAcct')).toBeHidden();
  await page.goto('./'); await page.click('#newP');
  await expect(page.locator('#acctBox')).toBeHidden();
  await page.click('[data-step=uchastka]'); await page.click('#rectSite'); await page.click('[data-step=kocha]');
  await expect(page.locator('.panel h2')).toHaveText('Koʻchalar');
});

test('kirish: loyihalar sahifasida «Kirish» → hisob qatori → chiqish', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await expect(page.locator('#homeIn')).toBeVisible();
  await page.click('#homeIn'); await expect(page.locator('#kirish')).toBeVisible();
  await page.fill('#kdEmail', 'ali@mail.uz'); await page.click('#kdGo');
  await page.fill('#kdCode', '123456'); await page.click('#kdGo');
  await expect(page.locator('#kirish')).toHaveCount(0);
  await expect(page.locator('#homeAcct .who')).toHaveText('ali@mail.uz');
  await expect(page.locator('#homeBal')).toContainText('50');
  if (process.env.GX_SHOTS) {
    await page.screenshot({ path: `${process.env.GX_SHOTS}/home-acct.png` });
    await page.setViewportSize({ width: 1024, height: 700 }); await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await page.waitForTimeout(600);
    await page.screenshot({ path: `${process.env.GX_SHOTS}/home-acct_1024_dark.png` });
  }
  await page.click('#homeOut'); await expect(page.locator('#homeIn')).toBeVisible();
});

test('kirish: sukut boʻyicha yoqilgan, egasi rejimida loyihalar sahifasida hisob qatori yashirin', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#newP')).toBeVisible();
  await expect(page.locator('#homeAcct')).toBeHidden();
});

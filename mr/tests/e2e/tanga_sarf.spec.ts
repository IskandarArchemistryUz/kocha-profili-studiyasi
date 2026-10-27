import { test, expect, type Page } from './fx';
import { readFileSync } from 'node:fs';

/** Tanga sarfi (27.10): toza yuklash (ticket), faqat-toza turlar, tanga yetmasa, haftalik sinov, tarix */
const API = 'https://api.test';
async function mockApi(page: Page, o: { balance?: number; trials?: number } = {}) {
  const st = { balance: o.balance ?? 30, trials: o.trials ?? 1, gen: 0, spent: 0, tickets: [] as { items: string[]; areaHa: number; stateHash: string; project?: string }[], trialCalls: [] as { kind: string; project?: string }[] };
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url()), b = r.request().postDataJSON?.() ?? {};
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { ...cors, 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST' } });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: st.balance, trialsLeft: st.trials });
    if (u.pathname === '/auth/config') return json(200, { email: true, phone: false, google: null });
    if (u.pathname === '/quote') return json(200, { items: b.items, k: 1, coins: b.items[0] === 'mr.site' ? 10 : b.items[0] === 'ks.dxf' ? 5 : 3 });
    if (u.pathname === '/export/ticket') {
      const need = b.items[0] === 'mr.site' ? 10 : b.items[0] === 'ks.dxf' ? 5 : 3;
      if (st.balance < need) return json(402, { error: 'insufficient', message: 'tanga yetarli emas', need, balance: st.balance });
      st.tickets.push(b); st.balance -= need;
      return json(200, { ticket: 'x.y', price: need, k: 1, charged: need, balance: st.balance, repeat: false });
    }
    if (u.pathname === '/me/history') return json(200, { items: [{ delta: -3, reason: 'export', ref: 'ks.section@abc', created_at: '2026-10-27T18:00:00Z' }, { delta: 30, reason: 'payment', ref: '7', created_at: '2026-10-27T17:00:00Z' }] });
    if (u.pathname === '/prices') return json(200, { items: {}, trials: { wind: { coins: 5, mr: true }, sun: { coins: 4, mr: true }, flats: { coins: 6, mr: true }, area: { coins: 1, mr: false }, gen: { coins: 1, mr: true } }, trialsPerWeek: 1, genFree: 3 });
    if (u.pathname === '/project/info') return json(200, { spent: st.spent, cap: 195, k: 1, genFree: Math.max(0, 3 - st.gen) });
    if (u.pathname === '/trial') {
      st.trialCalls.push({ kind: b.kind, project: b.project });
      if (b.kind === 'gen' && st.gen < 3) { st.gen++; return json(200, { free: true, left: 3 - st.gen, charged: 0, balance: st.balance }); }
      if (b.kind !== 'gen' && st.trials > 0) { st.trials--; return json(200, { free: true, left: st.trials, charged: 0, balance: st.balance }); }
      const c = { gen: 1, sun: 4, wind: 5, flats: 6 }[b.kind as 'gen'] ?? 1; st.balance -= c; st.spent += c; if (b.kind === 'gen') st.gen++;
      return json(200, { free: false, left: 0, charged: c, balance: st.balance });
    }
    return json(404, {});
  });
  await page.addInitScript(a => { sessionStorage.setItem('wm-test', '1'); localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); }, API);
  return st;
}

test('toza yuklash: SVG — tanlov, toza fayl tanga bilan va belgisiz, belgili — bepul', async ({ page }) => {
  const st = await mockApi(page, { balance: 7 });
  await page.goto('./kochasoz.html#/varaq');
  const svg = page.locator('.ws-varaq button', { hasText: /^SVG$/ });
  await expect(svg).toBeVisible({ timeout: 20_000 });
  await svg.click();
  await expect(page.locator('#kdExport')).toBeVisible();
  await expect(page.locator('#kdWm')).toBeVisible();
  await expect(page.locator('#kdClean')).toContainText('3 tanga');
  await expect(page.locator('#kdExport')).toContainText('Balans: 7 tanga');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/toza_yuklash.png` });
  const dl = page.waitForEvent('download'); await page.click('#kdClean');
  const clean = readFileSync((await (await dl).path())!, 'utf8');
  expect(clean).not.toContain('99_Archemistry_belgi');
  expect(st.tickets).toHaveLength(1); expect(st.tickets[0].items).toEqual(['ks.section']); expect(st.tickets[0].stateHash).toMatch(/^[a-f0-9]{40}$/);
  await expect(page.locator('.toast').last()).toContainText('3 tanga yechildi');
  // belgili — bepul, server chaqirilmaydi
  const dl2 = page.waitForEvent('download'); await svg.click(); await page.click('#kdWm');
  expect(readFileSync((await (await dl2).path())!, 'utf8')).toContain('ARCHEMISTRY · BEPUL');
  expect(st.tickets).toHaveLength(1);
});

test('tanga yetmasa — xabar va «Tanga olish»; tarix oynasi', async ({ page }) => {
  await mockApi(page, { balance: 1 });
  await page.goto('./kochasoz.html#/varaq');
  const svg = page.locator('.ws-varaq button', { hasText: /^SVG$/ });
  await expect(svg).toBeVisible({ timeout: 20_000 });
  await svg.click(); await page.click('#kdClean');
  await expect(page.locator('#kdExport .kd-msg')).toContainText('kerak 3, balansda 1');
  await expect(page.locator('#kdExport .kd-msg button')).toHaveText('Tanga olish');
  await page.keyboard.press('Escape');
  await page.goto('./#/'); await page.click('#homeCoins');
  await expect(page.locator('#kdCoins')).toBeVisible();
  await expect(page.locator('#kdCoins .kd-hist .row')).toHaveCount(2);
  await expect(page.locator('#kdCoins .kd-hist')).toContainText('Toza fayl');
  await expect(page.locator('#kdCoins .kd-hist')).toContainText('Koʻcha kesimi');
  await expect(page.locator('#kdCoins .kd-hist')).toContainText('Sotib olindi');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tangalarim.png` });
});

test('uchastka: 3 ga gacha — bepul; kattasi — «Loyihani ochish» (bekor — chegara qoʻyilmaydi; toʻlov — qoʻyiladi, qayta soʻralmaydi)', async ({ page }) => {
  const st = await mockApi(page, { balance: 30 });
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');   // 2,24 ga
  await expect(page.locator('#kSite b')).not.toHaveText('—');
  await expect(page.locator('#kdSite')).toHaveCount(0);
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');   // 6 ga
  await expect(page.locator('#kdSite')).toBeVisible();
  await expect(page.locator('#kdSiteGo')).toContainText('10 tanga');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/uchastka_ochish.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('#kSite b')).toHaveText(/^2,2/);   // eski chegara qoldi
  await page.click('#rectSite'); await page.click('#kdSiteGo');
  await expect(page.locator('#kSite b')).toHaveText(/^6,0/);
  expect(st.tickets.map(t => t.items[0])).toEqual(['mr.site']);
  await page.fill('#rw', '280'); await page.click('#rectSite');   // 5,6 ga — shu pogʻona, qayta soʻralmaydi
  await expect(page.locator('#kSite b')).toHaveText(/^5,6/);
  expect(st.tickets).toHaveLength(1);
});

test('ogʻir hisob: haftalik 1 ta bepul, keyin narx bilan soʻraladi; «soʻramasdan yechilsin» — keyingi safar oynasiz', async ({ page }) => {
  test.setTimeout(120_000);
  const st = await mockApi(page, { balance: 30 });
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tiles?\./, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect(page.locator('#genGo .ptag')).toHaveText('bepul');
  await page.click('#genGo');                                   // 1-bepul generatsiya
  await expect.poll(() => st.trialCalls.filter(t => t.kind === 'gen').length).toBe(1);
  expect(st.trialCalls[0].project).toMatch(/^p_/);
  await page.click('[data-step=quyosh]');
  await page.click('#insolGo');                                 // haftalik bepul
  await expect(page.locator('#insolSt')).toContainText('oʻrtacha', { timeout: 30000 });
  await expect(page.locator('#insolGo .ptag')).toHaveText('4 t');
  await page.click('#insolGo');                                 // pullik — oyna
  await expect(page.locator('#kdTrial')).toBeVisible();
  await expect(page.locator('#kdTrialGo')).toContainText('4 tanga');
  await expect(page.locator('#kdTrial')).toContainText('Bu loyihada: 0 / 195 t');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ogir_hisob.png` });
  await page.check('#kdAuto'); await page.click('#kdTrialGo');
  await expect(page.locator('.toast').last()).toContainText('4 tanga yechildi');
  await page.click('#insolGo');                                 // soʻramasdan
  await expect.poll(() => st.trialCalls.filter(t => t.kind === 'sun').length).toBe(3);
  await expect(page.locator('#kdTrial')).toHaveCount(0);
  expect(st.balance).toBe(22);
});

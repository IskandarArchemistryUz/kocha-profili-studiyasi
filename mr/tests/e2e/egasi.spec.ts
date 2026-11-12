import { test, expect, type Page } from './fx';

/** Egasi paneli (#/egasi): faqat owner:true hisobga havola; statistika /owner/stats dan */
const API = 'https://api.test';
const STATS = {
  at: '2026-10-29T07:00:00.000Z',
  users: { total: 42, d1: 2, d7: 9, d30: 30, google: 25, email: 15, phone: 2, active7: 11, active30: 27 },
  signups: [{ day: '2026-10-27', c: 4 }, { day: '2026-10-28', c: 7 }],
  people: [{ at: '2026-10-28T11:00:00Z', who: 'fr••••••@gmail.com', method: 'email', balance: 1000, seen: null },
    { at: '2026-10-27T08:00:00Z', who: 'da••••@gmail.com', method: 'google', balance: 0, seen: '2026-10-28T06:30:00Z' }],
  payments: { paid: 3, revenue: 177000, revenue30: 177000, buyers: 2, open: 1, cancelled: 2,
    byPack: [{ pack: 'p10', c: 2, s: 78000 }, { pack: 'p30', c: 1, s: 99000 }], byPs: [{ ps: 'payme', c: 2, s: 138000 }, { ps: 'click', c: 1, s: 39000 }],
    recent: [{ id: 9, pack: 'p30', coins: 30, amount: 99000, ps: 'payme', state: 'paid', at: '2026-10-28T10:00:00Z', who: 'al••••@mail.uz' },
      { id: 8, pack: 'p10', coins: 10, amount: 39000, ps: 'multicard', state: 'new', at: '2026-10-27T10:00:00Z', who: 'bo••••@gmail.com' }] },
  coins: { bought: 50, granted: 5, spent: 31, spend30: [{ reason: 'export', item: 'albom', c: 3, coins: 24 }], exports30: [{ bundle: 'albom', c: 3 }],
    grants: [{ coins: 100, note: 'Sinov kirishi', at: '2026-10-28T09:00:00Z', who: 'mu••••@mail.uz' }] },
  projects: { n: 4, spent: 31, gen: 6 },
};
// 12.11.2026: uid, davlat, davlatlar jadvali — pochta ochish va kartochka sinovi uchun
const STATS2 = { ...STATS,
  countries: { users: [{ country: 'UZ', c: 30 }, { country: 'KZ', c: 2 }], active30: [{ country: 'UZ', c: 20 }], unknown: 10 },
  people: [{ uid: 7, country: 'UZ', at: '2026-10-28T11:00:00Z', who: 'fr••••••@gmail.com', method: 'email', balance: 1000, seen: null },
    { uid: 8, country: null, at: '2026-10-27T08:00:00Z', who: 'da••••@gmail.com', method: 'google', balance: 0, seen: '2026-10-28T06:30:00Z' }] };
const CARD = { id: 7, email: 'francois@gmail.com', phone: null, name: 'François', lang: 'en', country: 'UZ', method: 'email', at: '2026-10-28T11:00:00Z',
  coins: { balance: 1000, bought: 0, granted: 1000, spent: 0 },
  sessions: [{ at: '2026-10-28T11:00:00Z', country: 'UZ', city: 'Tashkent' }], countries: [{ country: 'UZ', c: 1 }],
  spendByItem: [{ item: 'akso', reason: 'export', c: 2, coins: 10 }], ledger: [{ delta: 1000, reason: 'promo', item: 'grant:k', note: 'Sinov kirishi', at: '2026-10-28T11:00:00Z' }],
  orders: [], projects: [{ project: 'p-1', spent: 7, gen: 1, at: '2026-10-28T11:00:00Z' }], exports: [] };
async function mockApi(page: Page, owner: boolean, stats: unknown = STATS) {
  const hits = { stats: 0, reveal: [] as number[][], card: 0, grants: [] as { email: string; coins: number; note: string; key: string }[] };
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url());
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'boss@mail.uz', phone: null, name: null, balance: 30, trialsLeft: 3, owner });
    if (u.pathname === '/auth/config') return json(200, { email: true, phone: false, google: null });
    if (u.pathname === '/pay/config') return json(200, { payme: true, click: true, multicard: true, packs: [] });
    if (u.pathname === '/owner/stats') { hits.stats++; return owner ? json(200, stats) : json(403, { error: 'forbidden' }); }
    if (u.pathname === '/owner/reveal') { const b = r.request().postDataJSON(); hits.reveal.push(b.ids);
      return json(200, { contacts: { 7: { email: 'francois@gmail.com', phone: null, name: null }, 8: { email: 'davron@gmail.com', phone: null, name: null } } }); }
    if (u.pathname === '/owner/user/7') { hits.card++; return json(200, CARD); }
    if (u.pathname === '/owner/grant') { const b = r.request().postDataJSON(); hits.grants.push(b); return owner ? json(200, { applied: true, balance: b.coins, isNew: true, who: 'fr••••••@mail.com', coins: b.coins }) : json(403, { error: 'forbidden' }); }
    return json(404, {});
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); }, API);
  return hits;
}

test('egasi: bosh sahifada «Panel» → koʻrsatkichlar, jadvallar, havolalar', async ({ page }) => {
  const hits = await mockApi(page, true);
  await page.goto('./');
  await page.click('#homeOwner');
  await expect(page.locator('#ownerPage')).toBeVisible();
  await expect(page.locator('[data-k=users] b')).toHaveText('42');
  await expect(page.locator('[data-k=revenue] b')).toContainText('177');
  await expect(page.locator('.own-bars .bar')).toHaveCount(30);
  await expect(page.locator('.own-t').nth(3)).toContainText('al••••@mail.uz');
  await expect(page.locator('#ownPeople tbody tr')).toHaveCount(2);                // toʻlov qilmaganlar ham koʻrinadi
  await expect(page.locator('#ownPeople tbody tr').first()).toContainText('fr••••••@gmail.com');
  await expect(page.locator('#ownPeople tbody tr').first()).toContainText('hali kirmagan');
  await expect(page.locator('#ownPeople tbody tr').nth(1)).toContainText('Google');
  await expect(page.locator('#ownerPage')).not.toContainText('boss@mail.uz');
  await expect(page.locator('#ownGoat')).toHaveAttribute('href', 'https://archemistry.goatcounter.com');
  await expect(page.locator('#ownMc')).toHaveAttribute('target', '_blank');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/egasi.png`, fullPage: true });
  await page.click('#ownRefresh');
  await expect.poll(() => hits.stats).toBe(2);
});

test('egasi: 1024 px, tungi rejim', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await mockApi(page, true);
  await page.addInitScript(() => localStorage.setItem('mr-theme', 'dark'));
  await page.goto('./#/egasi');
  await expect(page.locator('[data-k=users] b')).toHaveText('42');
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(1024);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/egasi_1024_dark.png`, fullPage: true });
});

test('egasi: oddiy foydalanuvchida havola yoʻq, sahifa yopiq', async ({ page }) => {
  const hits = await mockApi(page, false);
  await page.goto('./');
  await expect(page.locator('#homeAcct')).toBeVisible();
  await expect(page.locator('#homeOwner')).toHaveCount(0);
  await page.goto('./#/egasi'); await page.reload();
  await expect(page.locator('#ownDenied')).toBeVisible();
  expect(hits.stats).toBe(0);
});

test('egasi: sinov kirishi — ikki bosqichda tanga beriladi, roʻyxat yangilanadi', async ({ page }) => {
  const hits = await mockApi(page, true);
  await page.goto('./#/egasi');
  await expect(page.locator('#ownGrantSec')).toBeVisible();
  await expect(page.locator('#ownerPage')).toContainText('mu••••@mail.uz');
  await page.click('#ownGrantGo');                                  // boʻsh — soʻrov ketmaydi
  await expect(page.locator('#ownGrantMsg')).not.toBeEmpty();
  await page.fill('#ownGrantEmail', ' Francois@Mail.com ');
  await page.fill('#ownGrantCoins', '1000');
  await page.click('#ownGrantGo');                                  // 1-bosqich: nima boʻlishi koʻrsatiladi
  await expect(page.locator('#ownGrantMsg')).toContainText('francois@mail.com');
  expect(hits.grants.length).toBe(0);
  await page.fill('#ownGrantCoins', '900');                         // oʻzgarsa — tasdiq bekor
  await expect(page.locator('#ownGrantMsg')).toBeEmpty();
  await page.fill('#ownGrantCoins', '1000');
  await page.click('#ownGrantGo');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/egasi_sinov_kirishi.png`, fullPage: true });
  await page.click('#ownGrantGo');                                  // 2-bosqich: tasdiqlash
  await expect.poll(() => hits.grants.length).toBe(1);
  expect(hits.grants[0]).toMatchObject({ email: 'francois@mail.com', coins: 1000 });
  expect(hits.grants[0].key.length).toBeGreaterThanOrEqual(8);
  await expect(page.locator('#ownGrantMsg')).toContainText('1 000');
  await expect(page.locator('#ownGrantEmail')).toHaveValue('');
  await expect.poll(() => hits.stats).toBe(2);
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
});

test('egasi: pochtalar sukut boʻyicha yashirin, «Koʻrsatish» — toʻliq; davlat ustuni; qator bosilsa — kartochka', async ({ page }) => {
  const hits = await mockApi(page, true, STATS2);
  await page.goto('./#/egasi');
  const first = page.locator('#ownPeople tbody tr').first();
  await expect(first).toContainText('fr••••••@gmail.com');
  await expect(first).toContainText('🇺🇿');
  await expect(page.locator('#ownCountries')).toContainText('🇰🇿');
  await expect(page.locator('#ownCountries')).toContainText('10');
  expect(hits.reveal.length).toBe(0);
  await page.click('#ownReveal');
  await expect(first).toContainText('francois@gmail.com');
  await expect(page.locator('#ownPeople tbody tr').nth(1)).toContainText('davron@gmail.com');
  expect(hits.reveal[0].sort()).toEqual([7, 8]);
  await expect(page.locator('#ownReveal')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#ownRefresh');                                   // yangilanganda ham ochiq qoladi
  await expect.poll(() => hits.stats).toBe(2);
  await expect(page.locator('#ownPeople tbody tr').first()).toContainText('francois@gmail.com');
  await page.click('#ownReveal');
  await expect(page.locator('#ownPeople tbody tr').first()).toContainText('fr••••••@gmail.com');
  await page.locator('#ownPeople tbody tr').first().click();
  await expect(page.locator('#ownCard')).toBeVisible();
  await expect(page.locator('#ownCardT')).toHaveText('francois@gmail.com');
  await expect(page.locator('#ownCard')).toContainText('Tashkent');
  await expect(page.locator('#ownCard')).toContainText('akso');
  await expect(page.locator('#ownCard')).toContainText('p-1');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/egasi_kartochka.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('#ownCard')).toHaveCount(0);
  expect(hits.card).toBe(1);
});

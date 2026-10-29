import { test, expect, type Page } from './fx';

/** Egasi paneli (#/egasi): faqat owner:true hisobga havola; statistika /owner/stats dan */
const API = 'https://api.test';
const STATS = {
  at: '2026-10-29T07:00:00.000Z',
  users: { total: 42, d1: 2, d7: 9, d30: 30, google: 25, email: 15, phone: 2, active7: 11, active30: 27 },
  signups: [{ day: '2026-10-27', c: 4 }, { day: '2026-10-28', c: 7 }],
  payments: { paid: 3, revenue: 177000, revenue30: 177000, buyers: 2, open: 1, cancelled: 2,
    byPack: [{ pack: 'p10', c: 2, s: 78000 }, { pack: 'p30', c: 1, s: 99000 }], byPs: [{ ps: 'payme', c: 2, s: 138000 }, { ps: 'click', c: 1, s: 39000 }],
    recent: [{ id: 9, pack: 'p30', coins: 30, amount: 99000, ps: 'payme', state: 'paid', at: '2026-10-28T10:00:00Z', who: 'al••••@mail.uz' },
      { id: 8, pack: 'p10', coins: 10, amount: 39000, ps: 'multicard', state: 'new', at: '2026-10-27T10:00:00Z', who: 'bo••••@gmail.com' }] },
  coins: { bought: 50, granted: 5, spent: 31, spend30: [{ reason: 'export', item: 'albom', c: 3, coins: 24 }], exports30: [{ bundle: 'albom', c: 3 }] },
  projects: { n: 4, spent: 31, gen: 6 },
};
async function mockApi(page: Page, owner: boolean) {
  const hits = { stats: 0 };
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url());
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'boss@mail.uz', phone: null, name: null, balance: 30, trialsLeft: 3, owner });
    if (u.pathname === '/auth/config') return json(200, { email: true, phone: false, google: null });
    if (u.pathname === '/pay/config') return json(200, { payme: true, click: true, multicard: true, packs: [] });
    if (u.pathname === '/owner/stats') { hits.stats++; return owner ? json(200, STATS) : json(403, { error: 'forbidden' }); }
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
  await expect(page.locator('.own-t').nth(2)).toContainText('al••••@mail.uz');
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

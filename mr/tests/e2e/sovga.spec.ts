import { test, expect } from './fx';

/** Sovgʻa xabari (16.11): /me dagi koʻrilmagan sovgʻa — karta bir marta, «Rahmat» → /me/notices/seen */
const API = 'https://api.test';

test('sovgʻa xabari: kirganda karta, «Rahmat» — koʻrildi deb yuboriladi; tungi rejim', async ({ page }) => {
  const st = { seen: [] as number[] };
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url()), b = r.request().postDataJSON?.() ?? {};
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: 15, trialsLeft: 3,
      notices: st.seen.length ? [] : [{ id: 41, coins: 15, kind: 'signup', at: '2026-11-16T13:00:00Z' }] });
    if (u.pathname === '/me/notices/seen') { st.seen.push(b.upTo); return json(200, { ok: true }); }
    if (u.pathname === '/auth/config') return json(200, { email: true, phone: false, google: null });
    return json(404, {});
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); localStorage.setItem('mr-theme', 'dark'); }, API);
  await page.goto('./');
  const card = page.locator('#giftNote');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Sizga 15 tanga sovgʻa!');
  await expect(card).toContainText('toza fayl');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/sovga_xabar.png` });
  await page.click('#giftNoteOk');
  await expect(card).toHaveCount(0);
  await expect.poll(() => st.seen).toEqual([41]);
});

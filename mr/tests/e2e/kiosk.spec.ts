import { test, expect } from './fx';

/**
 * 12.11 (egasi): Koʻchasozda trotuar, promenad va alleyalarda kiosk joylari — Dizayn-kod 2-ilova (P2.2 11.4, P2.3 4.4) boʻyicha.
 * B · Reja: bufer zona tanlanadi → «Kiosk joylarini taklif qilish» → rejada K belgilari, tekshiruvda kiosk qatorlari.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`kiosk joylari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: w, height: 860 });
  if (dark) await page.addInitScript(() => localStorage.setItem('mr-theme', 'dark'));
  await page.goto('./kochasoz.html#/b');
  await page.waitForFunction(() => (window as any).__ks?.id === 'b');
  // U3 (periferik, transport kam): B3 fasad oldi 4 m, trotuar 3 m, yashil bufer, 2 harakat boʻlagi
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ uk: 'U3', sel: 0, selU: -1, PL: [], els: [['front', 4, {}], ['piy', 3, {}], ['yash', 2, { daraxt: true }], ['qat', 3.5, {}], ['qat', 3.5, {}], ['yash', 2, { daraxt: true }], ['piy', 3, {}], ['front', 4, {}]], rl: 25 }));
  await page.locator('.ws-b main .seg').first().locator('button', { hasText: 'Reja' }).click();
  await page.click('[data-kiosk-auto]');
  await expect(page.locator('[data-kiosk-msg]')).toContainText('kiosk joyi qoʻyildi');
  const pl = await page.evaluate(() => (window as any).__ks.m.inst.state.PL.filter((p: any) => p.t === 'kiosk').map((p: any) => p.z));
  expect(pl.sort()).toEqual([0, 7]);
  await expect(page.locator('.ws-b').getByText(/Kiosk: U3 da ruxsat etiladi/)).toBeVisible();
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: /^K$/ })).toHaveCount(2);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/kiosk_${w}${dark ? 'd' : 'l'}.png` }); }
  expect(errs).toEqual([]);
});

import { test, expect } from './fx';

/** 04.11 (Murad Buildings sinovi, 8-band): qoʻshni sanoat korxonasi — sinf tanlanadi (SanQvaN 0350-17, 2.9), SMZ turar joyni taqiqlaydi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`sanoat korxonasi — sinf va SMZ · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '240'); await page.click('#rectSite');
  // sharqda zavod (uchastkadan 40 m)
  await page.evaluate(() => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    m.store.dispatch({ type: 'addLimit', limit: { id: 'zav', kind: 'sanoat', status: 'saqlanadi', src: 'qolda', rings: [[[190, -60], [320, -60], [320, 60], [190, 60]].map(g)] } }); m.pickLimit('zav'); m.renderPanel(); });
  await page.locator('#limCls').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-clsnote]')).toBeVisible();
  await expect(page.locator('[data-limref=zav]')).toContainText('taxmin');
  const szzHa = () => page.evaluate(() => (window as any).__mr.last?.d.balance?.szzHa ?? 0);
  const a4 = await szzHa();
  await page.click('#limCls [data-cls="2"]');
  await expect(page.locator('#limCls [data-cls="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-limref=zav]')).toContainText('2.9');
  await expect(page.locator('[data-limref=zav]')).toContainText('norma');
  await expect.poll(szzHa).toBeGreaterThan(a4);   // II sinf — 500 m: SMZ uchastkaning kattaroq qismini yopadi
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/sanoat_${w}${dark ? 'd' : 'l'}.png` }); }
});

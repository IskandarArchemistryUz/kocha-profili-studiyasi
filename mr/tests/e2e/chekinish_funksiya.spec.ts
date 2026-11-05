import { test, expect } from './fx';

/** 05.11 (egasi): 79-band 2-jadval chekinishi faqat 3+ qavatli turar joy va yotoq oʻrinli binolarga; yer osti avtoturargoh — kvartal chegarasidan */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`chekinish funksiyaga qarab va yer osti chegarasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('#gSetAuto');
  await expect(page.locator('#gSetAutoV b')).toHaveText('9,9 m');
  await expect(page.locator('#gSetAutoV')).toContainText('79-band');
  // yer osti avtoturargoh: chegarasi kvartal chegarasidan (koʻcha tomondan 3 m), chekinish 9,9 m ga bogʻliq emas
  await page.click('[data-park=yer_osti]');
  await expect(page.locator('#gUgS')).toBeVisible();
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('209-band');
  const a = await page.evaluate(() => { const m = (window as any).__mr, d = m.store.doc, g = d.garages.find((q: any) => q.kind === 'yer_osti'); if (!g) return 0;
    const o = d.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), p = g.ring.map((q: number[]) => [(q[0] - o[0]) * mx, (q[1] - o[1]) * 111132]);
    let s = 0; for (let i = 0; i < p.length; i++) { const u = p[i], v = p[(i + 1) % p.length]; s += u[0] * v[1] - v[0] * u[1]; } return Math.abs(s / 2); });
  expect(a).toBeGreaterThan(180 * 140);   // chekinish ichida boʻlsa ≈ 180 × 140 dan kichik edi
  if (process.env.GX_SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/yerosti_${w}${dark ? 'd' : 'l'}.png` }); }
  // ofis — 2-jadval qoʻllanmaydi: ANDOZA
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setZones', zones: [{ id: 'z0', at: ed.store.doc.origin, use: 'ofis' }] }); });
  await page.selectOption('#genBlock', '0');
  await expect(page.locator('#gSetAutoV')).toContainText('ANDOZA');
  if (process.env.GX_SHOTS) { await page.locator('#gSetAutoV').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/chekinish_ofis_${w}${dark ? 'd' : 'l'}.png` }); }
});

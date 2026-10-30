import { test, expect } from './fx';

/** Seysmik boʻlmalar (QMQ 2.01.03-19, 3.1-jadval, 3.1.1): uzun bino va L burchak «mos emas», ball/tizim oʻzgarsa chegara oʻzgaradi; generatsiyada seksiya chegaralanadi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`seysmik boʻlmalar tekshiruvi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForFunction(() => !!(window as any).__mr?.store?.doc?.origin);
  // 48 × 15 toʻrtburchak (8 ball monolit: 45 m dan uzun) va L 48 × 36 (chiqish 21 m)
  await page.evaluate(() => {
    const mr = (window as any).__mr, [lng, lat] = mr.store.doc.origin, kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 111132;
    const G = (p: number[][], x: number) => p.map(([a, b]) => [lng + (a + x) / kx, lat + b / ky]);
    mr.store.dispatch({ type: 'addBuilding', id: 's1', footprint: G([[0, 0], [48, 0], [48, 15], [0, 15]], 0), floors: 9 });
    mr.store.dispatch({ type: 'addBuilding', id: 's2', footprint: G([[0, 0], [48, 0], [48, 15], [15, 15], [15, 36], [0, 36]], 80), floors: 9 });
  });
  await page.click('#kMore');
  const rule = page.locator('.drawer [data-rule=seismic-blocks]');
  await expect(rule.locator('.chip')).toHaveAttribute('data-s', 'fail');
  await rule.locator('.li').click();
  await expect(rule.locator('.rnote')).toContainText('45 m');
  await expect(rule.locator('.rnote')).toContainText('21 m');
  await expect(page.locator('.drawer #seisLim')).toContainText('45 m');
  if (process.env.GX_SHOTS) { await page.locator('.drawer #seisRow').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${process.env.GX_SHOTS}/seys_${w}${dark ? 'd' : 'l'}.png` }); }
  // karkas, 7 ball: 100 m — toʻrtburchak mos, L chiqishi baribir 6 m dan katta
  await page.click('.drawer #seisSys [data-sys=karkas]'); await page.click('.drawer #seisBall [data-ball="7"]');
  await expect(page.locator('.drawer #seisLim')).toContainText('100 m');
  expect(await page.evaluate(() => { const s = (window as any).__mr.store.doc.settings; return [s.seismic, s.construct]; })).toEqual([7, 'karkas']);
  await expect(rule.locator('.chip')).toHaveAttribute('data-s', 'fail');
  await expect(rule).toContainText('1 / 2');
  // L ni oʻchirsak — mos
  await page.evaluate(() => (window as any).__mr.store.dispatch({ type: 'removeBuilding', id: 's2' }));
  await expect(rule.locator('.chip')).toHaveAttribute('data-s', 'pass');
});

test('generatsiyada seksiya uzunligi seysmik chegaradan oshmaydi (8 ball, monolit — 45 m)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '120'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  await page.evaluate(() => { const m = (window as any).__mr; m.gen.secLen = 60; m.renderPanel(); });
  await expect(page.locator('#seisLenNote')).toBeVisible();
  await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(1);
  const maxLen = await page.evaluate(() => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); let best = 0; for (const b of m.store.doc.buildings) { if (b.footprint.length > 4) continue; const r = b.footprint.map((p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132]); for (const p of r) for (const q of r) best = Math.max(best, Math.hypot(p[0] - q[0], p[1] - q[1])); } return best; });
  expect(maxLen).toBeLessThanOrEqual(Math.hypot(45, 15) + 0.6);
});

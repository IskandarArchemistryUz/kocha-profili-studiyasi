import { test, expect } from './fx';

/** 04.11 (Murad Buildings sinovi, 6-band): suv obyekti — tur, toifa, qirgʻoq boʻyi mintaqasi (VM 981-son nizomi, kuchini yoʻqotgan — talqin) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`suv obyekti — zona va qirgʻoq boʻyi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '240'); await page.click('#rectSite');
  // uchastka ichidan oʻtuvchi daryo (oʻq)
  await page.evaluate(() => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    m.store.dispatch({ type: 'addLimit', limit: { id: 'dar', kind: 'suv', status: 'saqlanadi', src: 'qolda', suv: { t: 'daryo' }, axis: [[-300, 40], [300, 40]].map(g) } }); m.pickLimit('dar'); m.renderPanel(); });
  await expect(page.locator('#limSuvT')).toBeVisible();
  await expect(page.locator('#limSuvT [data-suvt=daryo]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-suvnote]')).toBeVisible();
  await expect(page.locator('[data-suvlost]')).toContainText('981');
  await expect(page.locator('[data-limref=dar]')).toContainText('29-band');
  const hard = () => page.evaluate(() => (window as any).__mr.last?.d.balance?.hardHa ?? 0);
  const h0 = await hard(); expect(h0).toBeGreaterThan(0);   // qirgʻoq boʻyi 25 m × 2 tomon
  await page.click('#limSuvQ [data-suvq="3"]');
  await expect(page.locator('#limSuvQ [data-suvq="3"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-suvnote]')).toHaveCount(0);
  await page.fill('#limQir', '50'); await page.locator('#limQir').press('Enter');
  await expect.poll(hard).toBeGreaterThan(h0 * 1.5);
  await page.click('#limSuvT [data-suvt=kanal]');
  await expect(page.locator('#limSuvQ [data-suvq]')).toHaveCount(2);
  await page.click('#limSuvT [data-suvt=daryo]'); await page.click('#limSuvQ [data-suvq="2"]');   // oʻrta daryo — zona 100 m
  const r = await page.evaluate(() => (window as any).__mr.allRules().find((x: any) => x.id === 'water-981'));
  expect(r.status).not.toBe('na');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/suv_${w}${dark ? 'd' : 'l'}.png` }); }
});

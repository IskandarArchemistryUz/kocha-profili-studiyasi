import { test, expect } from './fx';

/** Berk koʻcha oxiri (31.10): 57-band — aylana R 15 m yoki 20 × 20 m; chorraha aylanmasi (27-band); meʼyoriy tekshiruv */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`berk uchlar va aylanmalar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  // T shakl: chegaradan chegaraga koʻcha va undan ichkariga 60 m berk koʻcha
  await page.evaluate(() => {
    const mr = (window as any).__mr, d = mr.store.doc, [lng, lat] = d.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180);
    const g = (x: number, y: number) => [lng + x * kx, lat + y * k];
    mr.store.dispatch({ type: 'addStreet', axis: [g(-110, 0), g(110, 0)], profile: 'mahalla-15' });
    mr.store.dispatch({ type: 'addStreet', axis: [g(0, 0), g(0, 60)], profile: 'mahalla-15' });
  });
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=chiz]');
  await expect(page.locator('#deadEnds')).toContainText('1');
  await page.click('#endsAylana');
  await expect(page.locator('#endsAylana')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.streets[1].ends)).toEqual({ b: 'aylana' });
  await page.click('#roundsAll');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.rounds.length)).toBe(1);
  await page.waitForTimeout(700);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/berk_uch_${w}${dark ? 'd' : 'l'}.png` });
});

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
  // aylanma faqat tanlangan joyga (31.10): «hammasiga» tugmalari yoʻq; sahnada bosish
  await expect(page.locator('#roundsAll')).toHaveCount(0); await expect(page.locator('#endsAylana')).toHaveCount(0);
  const sc = page.locator('#scene canvas'), bb = (await sc.boundingBox())!;
  const at = async (x: number, y: number) => { const s = await page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, 0), [x, y]) as { x: number; y: number }; await page.mouse.click(bb.x + s.x, bb.y + s.y); await page.waitForTimeout(150); };
  await page.click('#roundPlace');
  await at(2, 57);   // berk uch yonida → aylana
  expect(await page.evaluate(() => (window as any).__mr.store.doc.streets[1].ends)).toEqual({ b: 'aylana' });
  await at(3, -2);   // chorraha → kichik aylanma
  expect(await page.evaluate(() => (window as any).__mr.store.doc.rounds.map((r: any) => r.kind))).toEqual(['kichik']);
  await page.click('[data-rk=mini]'); await at(3, -2);   // boshqa tur — almashtiriladi
  expect(await page.evaluate(() => (window as any).__mr.store.doc.rounds.map((r: any) => [r.kind, r.r]))).toEqual([['mini', 8]]);
  await at(3, -2);   // xuddi shu tur — olib tashlanadi
  expect(await page.evaluate(() => (window as any).__mr.store.doc.rounds?.length ?? 0)).toBe(0);
  await page.click('[data-rk=kichik]'); await at(3, -2);
  await expect(page.locator('[data-round]')).toHaveCount(1);
  await page.waitForTimeout(700);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/berk_uch_${w}${dark ? 'd' : 'l'}.png` });
});

import { test, expect } from './fx';

/** 06.11 (c55): ShNQ 2.07.01-23, 418-band, 30-jadval — generator ochiq avtoturargohni meʼyoriy masofada qoʻyadi; buzilsa «Tuzat» yaqin joylarni oladi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`30-jadval: generator va «Tuzat» · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('[data-park=yer_usti]'); await page.click('#genGo');
  await page.waitForFunction(() => (window as any).__mr.store.doc.garages.some((g: any) => g.kind === 'yer_usti'), null, { timeout: 30_000 });
  const p30 = () => page.evaluate(() => ((window as any).__mr.last?.results ?? []).find((r: any) => r.id === 'park-30')?.status);
  // generator: 30-jadval masofasi bajariladi
  await expect.poll(p30, { timeout: 20_000 }).toBe('pass');
  // buzilish: ikki joyni turar uy devori yoniga (≈ 3 m) qoʻyamiz
  await page.evaluate(() => {
    const m = (window as any).__mr, d = m.store.doc, g = d.garages.find((q: any) => q.kind === 'yer_usti'), b = d.buildings.find((x: any) => x.use === 'turar' || !x.use);
    const [x, y] = b.footprint[0], k = 1 / 111_000, sq = (dx: number) => [[x + dx * k, y - 4 * k], [x + (dx + 2.5) * k, y - 4 * k], [x + (dx + 2.5) * k, y - 9 * k], [x + dx * k, y - 9 * k]];
    m.store.dispatch({ type: 'updateGarage', id: g.id, patch: { stalls: [...g.stalls, sq(0), sq(3)], spaces: g.spaces + 2 } });
  });
  await expect.poll(p30, { timeout: 20_000 }).toMatch(/fail|review/);
  await page.click('#kMore');
  const row = page.locator('.drawer .rrow', { hasText: 'Avtoturargohdan binolargacha' }).first();
  await row.scrollIntoViewIfNeeded(); await row.click();
  const fix = page.locator('.drawer button', { hasText: 'Yaqin joylarni olib tashlash' }).first();
  await expect(fix).toBeVisible();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/park30_oldin_${w}${dark ? 'd' : 'l'}.png` }); }
  await fix.click();
  await expect.poll(p30, { timeout: 20_000 }).toBe('pass');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/park30_keyin_${w}${dark ? 'd' : 'l'}.png` }); }
});

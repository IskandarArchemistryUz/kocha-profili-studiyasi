import { test, expect } from './fx';

/** 06.11 (B6): 30-jadval ochiq (yer usti) avtoturargohga ham; reyestrda velo-88 va tp-257 izohlari */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`B6: ochiq avtoturargoh masofalari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-park=yer_usti]');
  await page.click('#genGo');
  await page.waitForFunction(() => (window as any).__mr.store.doc.garages.some((g: any) => g.kind === 'yer_usti'), null, { timeout: 30_000 });
  const st = () => page.evaluate(() => Object.fromEntries(((window as any).__mr.last?.results ?? []).filter((r: any) => ['park-30', 'park-411', 'velo-88', 'tp-257'].includes(r.id)).map((r: any) => [r.id, r.status])));
  await expect.poll(async () => (await st())['park-30'], { timeout: 20_000 }).toMatch(/pass|fail|review/);
  const s = await st(); expect(s['park-411']).toBe('pass'); expect(s['velo-88']).toBe('na'); expect(s['tp-257']).toBe('na');
  await page.click('#kMore');
  await expect(page.locator('.drawer')).toContainText('Avtoturargohdan binolargacha masofa');
  await expect(page.locator('.drawer')).toContainText('Transformator podstansiyasi');
  if (process.env.GX_SHOTS) { const row = page.locator('.drawer .rrow', { hasText: 'Avtoturargohdan binolargacha' }).first(); await row.scrollIntoViewIfNeeded(); await row.click().catch(() => {}); await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/b6_park_${w}${dark ? 'd' : 'l'}.png` }); }
});

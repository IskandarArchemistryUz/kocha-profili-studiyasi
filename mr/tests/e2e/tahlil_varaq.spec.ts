import { test, expect } from './fx';

/** 02.11 (egasi: tahlil varaqlari — piyoda masofasi va xizmat radiuslari tayyor chizma boʻlib albomga): Varaqlar va Chizmadonda «Xizmat radiusi» */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`xizmat radiusi varagʻi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '420'); await page.fill('#rh', '330'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=portlend]'); await page.click('#gridApply');
  // bitta kvartal — maktab, qolganlari turar joy
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click(); await page.click('[data-use=maktab]');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(10);
  await page.click('[data-step=eksport]'); await page.click('#exGx');
  await expect(page.locator('[data-sheet]').first()).toBeVisible();
  const idx = await page.evaluate(() => [...document.querySelectorAll('[data-sheet]')].findIndex(e => /Xizmat radiusi · Maktab/.test(e.textContent ?? '')));
  expect(idx).toBeGreaterThanOrEqual(0);
  await page.locator('[data-sheet]').nth(idx).click();
  const view = page.locator('#gxView svg');
  await expect(view.locator('#Xizmat_obyektlari')).toBeAttached();
  await expect(view.locator('[id^=Piyoda_]').first()).toBeAttached();
  await expect(view.locator('#Turar_joy_radiusda')).toBeAttached();
  await expect(page.locator('#shSvc')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tahlil_maktab_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#shSvc [data-svc=bekat]');
  await expect(page.locator('#gxView')).toContainText(/Jamoat transporti bekati/);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tahlil_${w}${dark ? 'd' : 'l'}.png` });
  await page.keyboard.press('Escape');
});

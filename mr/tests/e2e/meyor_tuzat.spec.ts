import { test, expect } from './fx';

/** 31.10 (egasi): meʼyorlar roʻyxatida «Tuzat» — MTM 1-qavatlarga, yer osti avtoturargoh; tavsiya matni */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`meʼyorni tuzatish · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#kMore');
  const mtm = page.locator('.drawer [data-rule=mtm]');
  await mtm.locator('button.li').click();
  await expect(page.locator('#fix-mtm')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/meyor_tuzat_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#fix-mtm');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.mtm).length)).toBeGreaterThan(0);
  const park = page.locator('.drawer [data-rule=parking]');
  if (await park.locator('[data-s=fail]').count()) {
    await park.locator('button.li').click();
    await page.click('#fix-parking');
    await expect.poll(async () => page.evaluate(() => (window as any).__mr.store.doc.garages.filter((g: any) => g.kind === 'yer_osti').length)).toBeGreaterThan(0);
  }
});

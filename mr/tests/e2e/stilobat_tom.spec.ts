import { test, expect } from './fx';

/** 31.10 (egasi): stilobat tomi landshafti, tomdagi yongʻin yoʻlagi va yerdan rampa (ShNQ 2.07.01-23, 666, 667, 675–677) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`stilobat tomi: landshaft, yongʻin yoʻlagi, rampa · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-typ=blok_minora]');
  await page.fill('#gSty', '1'); await page.press('#gSty', 'Tab');
  await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
  const sc = await page.evaluate(() => { let ramp = 0, lane = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.ramp) ramp++; if (o.userData?.fireLane) lane++; }); return { ramp, lane }; });
  expect(sc.ramp).toBeGreaterThan(0); expect(sc.lane).toBeGreaterThan(0);
  await page.click('#kMore');
  const rule = page.locator('.drawer [data-rule=fire-666]');
  await rule.locator('button.li').click();
  await expect(rule).toContainText('Stilobat tomida yoʻlak');
  await expect(rule).toContainText('16 t');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/stilobat_tom_meyor_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#kMore');
  await page.click('[data-view=axo]'); await page.waitForTimeout(700);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/stilobat_tom_${w}${dark ? 'd' : 'l'}.png` });
});

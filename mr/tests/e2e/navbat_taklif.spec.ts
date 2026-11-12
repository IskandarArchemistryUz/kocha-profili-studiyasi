import { test, expect } from './fx';

/** 12.11 (eski navbat, 6-band): «Navbatlarni taklif qilish» — barcha binolarga navbat (chegaradan ichkariga, ijtimoiy 1-navbatda) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`navbatlarni taklif qilish · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  const more = page.locator('#stageAuto');
  if (!(await more.isVisible())) await page.locator('text=Qoʻshimcha').first().click();
  await page.locator('#stageAuto [data-nstage="3"]').scrollIntoViewIfNeeded();
  await page.click('#stageAuto [data-nstage="3"]');
  await expect.poll(() => page.evaluate(() => new Set((window as any).__mr.store.doc.buildings.map((b: any) => b.stage ?? 1)).size)).toBe(3);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/navbat_${w}${dark ? 'd' : 'l'}.png` }); }
});

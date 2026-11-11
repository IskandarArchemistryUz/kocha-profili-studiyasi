import { test, expect } from './fx';

/**
 * 11.11 (L9, video yozishda): 6-qadamda (22 dekabr, 14:30) binolar soyasi yerga, hovliga va qoʻshni binolarga tushmasdi.
 * Endi «Quyosh va shamol» qadamida yerda soya ushlagich (ShadowMaterial) va binolar soya qabul qiladi; boshqa qadamda — oʻchadi.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`jonli soyalar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  const catcher = () => page.evaluate(() => { const sc = (window as any).__mr.scene; return { c: !!sc.shCatch, recv: (() => { let n = 0; sc.world.traverse((o: any) => { if (o.isMesh && o.castShadow && o.receiveShadow) n++; }); return n; })() }; });
  expect((await catcher()).c).toBe(false);
  await page.click('[data-step=quyosh]');
  await page.click('[data-date="12-22"]'); await page.locator('#sunTime').fill('14.5');
  await expect(page.locator('#sunInfo')).toContainText('14:30');
  const on = await catcher();
  expect(on.c).toBe(true); expect(on.recv).toBeGreaterThan(0);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.click('[data-view=axo]').catch(() => {}); await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/soya_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('[data-step=hajm]');
  expect((await catcher()).c).toBe(false);
});

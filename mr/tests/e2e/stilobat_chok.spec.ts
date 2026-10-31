import { test, expect } from './fx';

/** 31.10 (egasi): stilobat yongʻin boʻlmalari — avtomatik choklar sxemasi, «Tuzat» tugmasi, sahnada chok chiziqlari */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`stilobat choklari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
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
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.some((b: any) => b.gen?.kind === 'stilobat'))).toBe(true);
  await page.click('#kMore');
  const rule = page.locator('.drawer [data-rule=fire-podium]');
  await expect(rule).toBeAttached();
  await rule.locator('button.li').click();
  await expect(page.locator('#fix-fire-podium')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/stilobat_tuzat_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#fix-fire-podium');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.kind === 'stilobat').every((b: any) => b.joint))).toBe(true);
  await expect(rule.locator('[data-s=pass]').first()).toBeAttached();
  const n = await page.evaluate(() => { let c = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.jointScheme) c += o.geometry.attributes.position.count; }); return c; });
  expect(n).toBeGreaterThan(0);
  await page.click('#kMore');
  await page.click('[data-view=axo]'); await page.waitForTimeout(600);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/stilobat_chok_${w}${dark ? 'd' : 'l'}.png` });
});

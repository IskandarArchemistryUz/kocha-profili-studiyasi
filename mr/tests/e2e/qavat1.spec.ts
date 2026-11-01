import { test, expect } from './fx';

/** 01.11 (egasi): 1-qavat balandligi — noturar 1-qavatli bino baland, rejada 4 marshli zina */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`1-qavat balandligi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
  await page.click('[data-view=axo]');
  const c = page.locator('#scene canvas'), bb = (await c.boundingBox())!, px = bb.x + bb.width * 0.62, py = bb.y + bb.height * 0.32;
  await expect.poll(() => page.evaluate(([x, y]) => !!(window as any).__mr.scene.pickBuilding(x, y), [px, py]), { timeout: 15_000 }).toBe(true);
  await page.mouse.click(px, py);
  await expect(page.locator('.panel[data-mode=bino]')).toBeVisible();
  if (!(await page.locator('#iGroundH').count())) await page.click('[aria-label="Noturar (pastda) — oshirish"]');
  await expect(page.locator('#iGroundH')).toBeVisible();
  const bid = await page.evaluate(() => (window as any).__mr.sel as string);
  const top = () => page.evaluate(id => { let y = -1e9; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.bid === id && o.geometry) { o.geometry.computeBoundingBox(); y = Math.max(y, o.geometry.boundingBox.max.y); } }); return y; }, bid);
  const t0 = await top();
  await page.fill('#iGroundH', '5.7'); await page.press('#iGroundH', 'Tab');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.settings.groundH)).toBe(5.7);
  await expect.poll(top).toBeGreaterThan(t0 + 2.3);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(700); await page.screenshot({ path: `${process.env.GX_SHOTS}/qavat1_${w}${dark ? 'd' : 'l'}.png` }); }
});

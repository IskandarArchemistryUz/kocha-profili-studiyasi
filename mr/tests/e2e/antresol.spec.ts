import { test, expect } from './fx';

/** 01.11 (egasi): baland 1-qavatda ijarachi uchun antresol — 40 % (andoza), foydali maydon */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`antresol · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
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
  await page.evaluate(() => { const m = (window as any).__mr, b = m.store.doc.buildings.find((x: any) => x.id === m.sel); if (b && !(b.nonRes >= 1)) m.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { nonRes: 1 } }); });
  // 3,3 m da antresol sigʻmaydi — oʻchiq, izohda talab
  await expect(page.locator('#iAnt')).toBeDisabled();
  await expect(page.locator('#iAntSub')).toContainText('4,9');
  await page.fill('#iGroundH', '5.7'); await page.press('#iGroundH', 'Tab');
  await expect(page.locator('#iAnt')).toBeEnabled();
  await page.click('#iAnt');
  await expect(page.locator('#iAntSub')).toContainText('2,7');
  const bid = await page.evaluate(() => (window as any).__mr.sel as string);
  expect(await page.evaluate(id => (window as any).__mr.store.doc.buildings.find((b: any) => b.id === id).antresol, bid)).toBe(true);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/antresol_${w}${dark ? 'd' : 'l'}.png` }); }
});

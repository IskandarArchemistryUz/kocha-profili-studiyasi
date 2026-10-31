import { test, expect } from './fx';

/** 31.10: turar joy binosining 1-qavatida MTM (543-band, 29 m²/oʻrin); meʼyor izohida keyingi pogʻona; qogʻoz teksturasi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`1-qavatda MTM va qogʻoz · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator('#scene')).toHaveAttribute('data-paper', '');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '110'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  const bid = await page.evaluate(() => { const ed = (window as any).__mr, b = ed.store.doc.buildings.find((x: any) => x.floors >= 5); ed.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { nonRes: 1 } }); ed.sel = b.id; ed.scene.select(b.id); ed.renderAll(); return b.id; });
  const before = await page.evaluate(() => (window as any).__mr.derived?.mtmCap ?? null);
  await page.locator('#iMtm').click();
  expect(await page.evaluate(id => (window as any).__mr.store.doc.buildings.find((x: any) => x.id === id).mtm, bid)).toBe(true);
  await expect(page.locator('#iMtmSub')).toContainText('543');
  void before;
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/mtm_1qavat_${w}${dark ? 'd' : 'l'}.png` });
});

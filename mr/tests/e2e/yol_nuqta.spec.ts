import { test, expect } from './fx';

/** Koʻcha nuqtasini tanlash: oʻchirish, qisqartirish, boʻlish (31.10) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`koʻcha nuqtasi amallari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.evaluate(() => {
    const mr = (window as any).__mr, d = mr.store.doc, [lng, lat] = d.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180);
    const g = (x: number, y: number) => [lng + x * kx, lat + y * k];
    mr.store.dispatch({ type: 'addStreet', axis: [g(-90, 0), g(-30, 0), g(30, 0), g(90, 0)], profile: 'mahalla-15' });
  });
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=chiz]');
  await page.locator('[data-sid] .k').first().click();
  await expect(page.locator('#stEditHint')).toBeVisible(); await expect(page.locator('#vtxOps')).toHaveCount(0);
  const sc = page.locator('#scene canvas'), bb = (await sc.boundingBox())!;
  const at = async (x: number, y: number) => { const s = await page.evaluate(([x, y]) => { const sc = (window as any).__mr.scene; return sc.toScreen(x, y, sc.H(x, y) + 0.8); }, [x, y]) as { x: number; y: number }; await page.mouse.click(bb.x + s.x, bb.y + s.y); await page.waitForTimeout(150); };
  const n = () => page.evaluate(() => (window as any).__mr.store.doc.streets.map((s: any) => s.axis.length));
  await at(-30, 0);
  await expect(page.locator('#vtxOps')).toContainText('2 / 4');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/yol_nuqta_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('[data-vop=split]');
  expect(await n()).toEqual([2, 3]);
  // ikkinchi koʻchada (−30 … 90): oxirgi nuqtagacha qisqartirish — 30 m dan keyingisi olib tashlanadi
  await page.locator('[data-sid] .k').nth(1).click();
  await at(30, 0); await page.click('[data-vop=cutTail]');
  expect(await n()).toEqual([2, 2]);
  // Delete: 2 nuqtali koʻchada nuqta oʻchmaydi
  await at(30, 0); await page.keyboard.press('Delete');
  expect(await n()).toEqual([2, 2]);
});

/** 31.10: koʻchaning oʻrtasidagi qismini olib tashlash — ikki nuqta bosiladi */
test('koʻcha oʻrtasini olib tashlash', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  await page.evaluate(() => {
    const mr = (window as any).__mr, [lng, lat] = mr.store.doc.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180);
    mr.store.dispatch({ type: 'addStreet', axis: [[lng - 90 * kx, lat], [lng + 90 * kx, lat]], profile: 'mahalla-15' });
  });
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=chiz]');
  await page.locator('[data-sid] .k').first().click();
  await page.click('#roadCut');
  const bb = (await page.locator('#scene canvas').boundingBox())!;
  const at = async (x: number, y: number) => { const s = await page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, 0), [x, y]) as { x: number; y: number }; await page.mouse.click(bb.x + s.x, bb.y + s.y); await page.waitForTimeout(150); };
  await at(-20, 1); await at(30, -1);
  const lens = await page.evaluate(() => { const mr = (window as any).__mr, d = mr.store.doc, [lng] = d.origin; return d.streets.map((s: any) => s.axis.length); });
  expect(lens).toEqual([2, 2]);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/yol_kesim.png` });
});

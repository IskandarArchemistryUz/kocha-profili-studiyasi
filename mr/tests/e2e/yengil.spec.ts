import { test, expect } from './fx';

/** Sahna yengilligi: geometrik fasad faqat yaqin binolarda (LOD), qayta qurishda GPU geometriyalari oqib ketmaydi */
test('sahna: LOD va qayta qurishda xotira oqmaydi', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '260'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 10, null, { timeout: 60_000 });
  await page.evaluate(() => { const m = (window as any).__mr; m.store.dispatch({ type: 'styleBuildings', ids: m.store.doc.buildings.map((b: any) => b.id), winPat: 'tasodifiy', bal: 'ochiq' }); });
  await page.click('[data-view=axo]'); await page.waitForTimeout(600);
  const info = () => page.evaluate(() => { const sc = (window as any).__mr.scene; return { det: sc.detailCount as number, geoms: sc.renderer.info.memory.geometries as number, tex: sc.renderer.info.memory.textures as number }; });
  // butun loyiha koʻrinadi — geometrik fasad yoʻq (teksturada)
  expect((await info()).det).toBe(0);
  // 5 marta qayta qurish: geometriya va teksturalar soni oʻsmaydi
  const a = await info();
  await page.evaluate(() => { const m = (window as any).__mr; for (let i = 0; i < 5; i++) m.scene.update(m.store.doc); m.scene.invalidate(); });
  await page.waitForTimeout(300);
  const b = await info();
  // koʻcha geometriyasi qayta hisoblanmaydi (koʻchalar oʻzgarmagan)
  expect(await page.evaluate(() => { const m = (window as any).__mr, sc = m.scene, g0 = sc.streetGeoKey?.sg; sc.update(m.store.doc); return !!g0 && sc.streetGeoKey.sg === g0; })).toBe(true);
  expect(b.geoms).toBeLessThanOrEqual(a.geoms + 2); expect(b.tex).toBeLessThanOrEqual(a.tex + 2);
  // yaqinlashtirilganda — kamera atrofidagi binolar geometrik fasadda
  const bb = (await page.locator('#scene canvas').boundingBox())!; await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -400); await page.waitForTimeout(120); }
  await expect.poll(async () => (await info()).det, { timeout: 5000 }).toBeGreaterThan(0);
});

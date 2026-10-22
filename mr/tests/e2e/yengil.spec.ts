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

test('tanlov: faqat binolar qayta quriladi, natija toʻliq qayta qurish bilan bir xil', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '260'); await page.fill('#rh', '220'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 6, null, { timeout: 60_000 });
  await page.click('[data-view=axo]'); await page.waitForTimeout(500);
  const r = await page.evaluate(async () => {
    const m = (window as any).__mr, sc = m.scene, doc = m.store.doc, id = doc.buildings[3].id;
    const keep = sc.world.children.find((o: any) => o.userData.block != null);
    const px = async () => { const url = sc.snapshot(); const im = new Image(); im.src = url; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d')!; g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
    const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) n++; return n / (a.length / 4); };
    sc.select(id); const sameWorld = sc.world.children.includes(keep); const A = await px();
    sc.update(doc); const B = await px();
    const selParts = sc.world.children.filter((o: any) => o.userData.bOwner === id).length;
    sc.select(null); const C = await px(); sc.update(doc); const D = await px();
    return { sameWorld, selParts, d1: diff(A, B), d2: diff(C, D) };
  });
  expect(r.sameWorld).toBe(true);      // dahalar, koʻchalar qayta qurilmadi
  expect(r.selParts).toBeGreaterThan(0);
  expect(r.d1).toBeLessThan(0.002); expect(r.d2).toBeLessThan(0.002);
});

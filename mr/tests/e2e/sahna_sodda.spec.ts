import { test, expect } from './fx';

/** 04.11 (egasi: sahnani yengillashtirish, B): «Sodda» — uzoqdan derazalar teksturasi va daraxt tanalari oʻchadi, yaqinlashganda qaytadi; «Toʻliq» — doim toʻliq; sahna rasmi doim toʻliq */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`sahna: sodda / toʻliq · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '240'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(4);
  await page.click('[data-view=axo]');
  await page.evaluate(() => (window as any).__mr.scene.frameDoc((window as any).__mr.store.doc));
  const st = () => page.evaluate(() => { const sc = (window as any).__mr.scene; let trunk = 0, tex = 0; sc.world.traverse((o: any) => { if (o.userData.tree === 'trunk' && o.visible) trunk++; const m = o.material; for (const x of Array.isArray(m) ? m : m ? [m] : []) if (x.userData?.winMap && x.map) tex++; }); return { on: sc.liteOn as boolean, trunk, tex, r: Math.round(sc.viewExtent().r) }; });
  await expect(page.locator('#liteSeg [data-lite=sodda]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await st()).on).toBe(true);
  const far = await st(); expect(far.trunk).toBe(0); expect(far.tex).toBe(0);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/sodda_uzoq_${w}${dark ? 'd' : 'l'}.png` }); }
  // sahna rasmi — doim toʻliq, keyin «Sodda» qaytadi
  const png = await page.evaluate(() => { const sc = (window as any).__mr.scene; const u = sc.snapshot(); return { len: u.length, on: sc.liteOn }; });
  expect(png.len).toBeGreaterThan(1000); expect(png.on).toBe(true);
  // yaqinlashish — tafsilot qaytadi
  await page.evaluate(() => (window as any).__mr.scene.frameAt(0, 0, 60));
  await page.evaluate(() => (window as any).__mr.scene.applyLite());
  await expect.poll(async () => (await st()).on).toBe(false);
  expect((await st()).tex).toBeGreaterThan(0);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/sodda_yaqin_${w}${dark ? 'd' : 'l'}.png` }); }
  // «Toʻliq» — uzoqdan ham toʻliq; tanlov saqlanadi
  await page.evaluate(() => (window as any).__mr.scene.frameDoc((window as any).__mr.store.doc));
  await page.click('#liteSeg [data-lite=toliq]');
  await expect(page.locator('#liteSeg [data-lite=toliq]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await st()).on).toBe(false);
  const full = await st(); expect(full.tex).toBeGreaterThan(0); expect(full.trunk).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem('mr-lite'))).toBe('toliq');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/toliq_uzoq_${w}${dark ? 'd' : 'l'}.png` }); }
});

/** 04.11 (egasi: «bino materiallariga oʻtganda master rejani uzoqdan qaraganda ham fasad ranglari va materiallarini koʻra olamanmi?»):
 *  «Fasad va tom» qadamida «Sodda» ishlamaydi — uzoqdan ham fasad teksturasi; boshqa qadamga qaytganda yana ishlaydi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Fasad qadamida uzoqdan ham toʻliq · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '240'); await page.fill('#rh', '180'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(4);
  await page.click('[data-view=axo]');
  await page.evaluate(() => { const m = (window as any).__mr; for (const b of m.store.doc.buildings) m.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { mat: 'gisht' } }); m.scene.frameDoc(m.store.doc); });
  const on = () => page.evaluate(() => (window as any).__mr.scene.liteOn as boolean);
  await expect.poll(on).toBe(true);
  await page.click('[data-step=fasad]');
  await expect.poll(on).toBe(false);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/fasad_uzoq_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('[data-step=hajm]');
  await expect.poll(on).toBe(true);
});

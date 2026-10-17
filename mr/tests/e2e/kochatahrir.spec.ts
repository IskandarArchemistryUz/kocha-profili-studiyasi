import { test, expect } from '@playwright/test';

test('koʻcha tahriri: tutqichni sudrash, oraliqdan nuqta qoʻshish, ikki marta bosib oʻchirish; boshqa qadamdan bosib tanlash', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); ed.store.dispatch({ type: 'addStreet', axis: [[o[0] - 60 / mx, o[1]], [o[0] + 60 / mx, o[1]]], profile: 'mahalla-15' }); });
  // boshqa qadamda (Hajmlar) koʻchani bosish → «Koʻchalar» qadami, koʻcha tanlangan
  await page.click('[data-step=hajm]');
  const scr = (x: number, y: number) => page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, (window as any).__mr.scene.H(x, y) + 0.8), [x, y]);
  let s = await scr(30, 0); await page.mouse.click(s.x, s.y);
  await expect(page.locator('.rail [data-step=kocha]')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#stEditHint')).toBeVisible();
  // uchni sudrash
  s = await scr(60, 0); await page.mouse.move(s.x, s.y); await page.mouse.down();
  const t = await scr(60, 30); await page.mouse.move(t.x, t.y, { steps: 5 }); await page.mouse.up();
  const ax = () => page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); return ed.store.doc.streets[0].axis.map((p: number[]) => [Math.round((p[0] - o[0]) * mx), Math.round((p[1] - o[1]) * 111132)]); });
  let a = await ax(); expect(a.length).toBe(2); expect(a[1][1]).toBeGreaterThan(20);
  // oraliq nuqtadan sudrash — yangi burilish
  const m: [number, number] = [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2];
  s = await scr(m[0], m[1]); await page.mouse.move(s.x, s.y); await page.mouse.down();
  const t2 = await scr(m[0], m[1] - 25); await page.mouse.move(t2.x, t2.y, { steps: 5 }); await page.mouse.up();
  a = await ax(); expect(a.length).toBe(3);
  // ikki marta bosish — nuqta oʻchadi
  s = await scr(a[1][0], a[1][1]); await page.mouse.dblclick(s.x, s.y);
  await expect.poll(async () => (await ax()).length).toBe(2);
});

test('atrofdagi (OSM) yoʻlni olib tashlash va qaytarish', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]'); await page.click('#rectSite');
  await page.click('[data-step=kocha]');
  await page.evaluate(() => { const ed = (window as any).__mr; ed.osmPick = { id: 77, cls: 'service', w: 5, pts: ed.store.doc.site.rings[0].slice(0, 2) }; ed.renderPanel(); });
  await page.click('#rmOsmRoad');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.removedRoads)).toEqual([77]);
  await page.click('#restoreRoads');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.removedRoads)).toBeUndefined();
});

test('tutqichlar: uchastka burchagi, bino burchagi va qavat tutqichi (vertikal sudrash)', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await expect(page.locator('#siteEditHint')).toBeVisible();
  const scr = (x: number, y: number, z = 0.8) => page.evaluate(([x, y, z]) => (window as any).__mr.scene.toScreen(x, y, (window as any).__mr.scene.H(x, y) + z), [x, y, z]);
  // uchastka burchagi (100, 80) → (120, 100)
  let s = await scr(100, 80); await page.mouse.move(s.x, s.y); await page.mouse.down(); let t = await scr(120, 100); await page.mouse.move(t.x, t.y, { steps: 5 }); await page.mouse.up();
  const site = await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); return ed.store.doc.site.rings[0].map((p: number[]) => [Math.round((p[0] - o[0]) * mx), Math.round((p[1] - o[1]) * 111132)]); });
  expect(site.some((p: number[]) => Math.abs(p[0] - 120) < 3 && Math.abs(p[1] - 100) < 3)).toBe(true);
  // bino: 40×30 markazda; tanlash → qavat tutqichi
  await page.click('[data-step=hajm]');
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132]; ed.store.dispatch({ type: 'addBuilding', id: 'b_t', footprint: [g(-20, -15), g(20, -15), g(20, 15), g(-20, 15)], floors: 5, nonRes: 1, use: 'turar' }); ed.sel = 'b_t'; ed.scene.select('b_t'); ed.renderAll(); });
  await expect(page.locator('#bldEditHint')).toBeVisible();
  // Rejada balandlik koʻrinmaydi: bir qavat = 14 px (yuqoriga)
  s = await scr(0, 0); await page.mouse.move(s.x, s.y); await page.mouse.down(); await page.mouse.move(s.x, s.y - 14 * 3, { steps: 6 }); await page.mouse.up();
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings[0].floors)).toBe(8);
  await page.click('[data-view=axo]'); await page.waitForTimeout(300);
  const fh = await page.evaluate(() => (window as any).__mr.store.doc.settings.floorHeight);
  const top = await scr(0, 0, 8 * fh + 1.5 - 0.8);   // qavat tutqichi: z = base + floors·fh + 1,5 (H = 0)
  const up = await scr(0, 0, 11 * fh + 1.5 - 0.8);
  await page.mouse.move(top.x, top.y); await page.mouse.down(); await page.mouse.move(up.x, up.y, { steps: 6 }); await page.mouse.up();
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings[0].floors)).toBe(11);
  await page.click('[data-view=plan]'); await page.waitForTimeout(300);
  // bino burchagi (20, 15) → (30, 15)
  s = await scr(20, 15); await page.mouse.move(s.x, s.y); await page.mouse.down(); t = await scr(30, 15); await page.mouse.move(t.x, t.y, { steps: 5 }); await page.mouse.up();
  const fp = await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); return ed.store.doc.buildings[0].footprint.map((p: number[]) => [Math.round((p[0] - o[0]) * mx), Math.round((p[1] - o[1]) * 111132)]); });
  expect(fp.some((p: number[]) => Math.abs(p[0] - 30) < 3 && Math.abs(p[1] - 15) < 3)).toBe(true);
});

test('parsel burchagi tutqichdan suriladi', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click();
  await page.locator('#pSize').fill('1'); await page.click('[data-grid=ns]'); await page.click('#pSplit');
  await page.locator('[data-block="0"]').click();
  await expect(page.locator('#parcelEditHint')).toBeVisible();
  await page.keyboard.press('Tab');   // panel yigʻiladi (Tab) — burchak tutqichi panel ostida qolmasin
  await expect(page.locator('.panel.sp')).toHaveClass(/shut/);
  const v0 = await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), b = ed.plan().blocks[ed.selBlock], pc = ed.store.doc.parcels.find((p: any) => p.id === b.parcelId); return pc.rings[0].map((p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132]); });
  // birinchi burchakni 10 m ichkariga (markaz tomon) surish
  const c = [v0.reduce((a: number, p: number[]) => a + p[0], 0) / v0.length, v0.reduce((a: number, p: number[]) => a + p[1], 0) / v0.length];
  const q = v0[0], dx = Math.sign(c[0] - q[0]) * 10, dy = Math.sign(c[1] - q[1]) * 10;
  const scr = (x: number, y: number) => page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, (window as any).__mr.scene.H(x, y) + 0.8), [x, y]);
  const s = await scr(q[0], q[1]), t = await scr(q[0] + dx, q[1] + dy);
  await page.mouse.move(s.x, s.y); await page.mouse.down(); await page.mouse.move(t.x, t.y, { steps: 5 }); await page.mouse.up();
  const v1 = await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); const b = ed.plan().blocks[ed.selBlock] ?? ed.plan().blocks[0]; const pc = ed.store.doc.parcels.find((p: any) => p.id === b.parcelId) ?? ed.store.doc.parcels[0]; return pc.rings[0].map((p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132]); });
  expect(v1.some((p: number[]) => Math.abs(p[0] - (q[0] + dx)) < 3 && Math.abs(p[1] - (q[1] + dy)) < 3)).toBe(true);
});

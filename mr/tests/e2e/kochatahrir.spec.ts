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

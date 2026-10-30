import { test, expect } from './fx';

/** Koʻcha siljitilganda binolar yoʻlga moslab qayta generatsiya qilinadi (egasi, 30.10): avtomatik binolar oyoq izi oʻzgaradi, qoʻlda chizilgan bino qoladi */
test('koʻcha tutqichi sudralganda avtomatik binolar qayta generatsiya boʻladi', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  // oʻrtadan oʻtuvchi koʻcha — ikki kvartal
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); ed.store.dispatch({ type: 'addStreet', axis: [[o[0] - 100 / mx, o[1]], [o[0] + 100 / mx, o[1]]], profile: 'mahalla-15' }); });
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  const snap = () => page.evaluate(() => { const d = (window as any).__mr.store.doc; return { n: d.buildings.length, auto: d.buildings.filter((b: any) => b.gen).length, key: JSON.stringify(d.buildings.filter((b: any) => b.gen).map((b: any) => b.footprint.map((p: number[]) => p.map(v => Math.round(v * 1e5))))) }; });
  const before = await snap(); expect(before.auto).toBeGreaterThan(0);
  // qoʻlda bino (gen yoʻq) — qayta generatsiyada tegilmaydi
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (x: number, y: number) => [o[0] + x / mx, o[1] + y / 111132]; ed.store.dispatch({ type: 'addBuilding', id: 'qolda', footprint: [G(-90, 60), G(-70, 60), G(-70, 70), G(-90, 70)], floors: 3 }); });
  // koʻchani tanlab, uchini 30 m janubga sudrash
  const scr = (x: number, y: number) => page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, (window as any).__mr.scene.H(x, y) + 0.8), [x, y]);
  let s = await scr(0, 0); await page.mouse.click(s.x, s.y);
  await expect(page.locator('.rail [data-step=kocha]')).toHaveAttribute('aria-current', 'step');
  s = await scr(100, 0); await page.mouse.move(s.x, s.y); await page.mouse.down();
  const t = await scr(100, -30); await page.mouse.move(t.x, t.y, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => (await snap()).key, { timeout: 15_000 }).not.toBe(before.key);
  const after = await snap();
  expect(after.auto).toBeGreaterThan(0);
  expect(await page.evaluate(() => !!(window as any).__mr.store.doc.buildings.find((b: any) => b.id === 'qolda'))).toBe(true);
  // avtomatik binolar yangi kvartal chegarasida (koʻcha koridoridan tashqarida): hech bir bino oʻqdan 7,5 m dan yaqin emas
  const minD = await page.evaluate(() => { const ed = (window as any).__mr, d = ed.store.doc, o = d.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); const L = (p: number[]) => [(p[0] - o[0]) * mx, (p[1] - o[1]) * 111132]; const ax = d.streets[0].axis.map(L); const A = ax[0], B = ax[1];
    const dist = (p: number[]) => { const dx = B[0] - A[0], dy = B[1] - A[1], t = Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] - A[0] - dx * t, p[1] - A[1] - dy * t); };
    return Math.min(...d.buildings.filter((b: any) => b.gen).flatMap((b: any) => b.footprint.map((p: number[]) => dist(L(p))))); });
  expect(minD).toBeGreaterThan(7);
  // qoʻlda tahrirlangan avtomatik bino bor — keyingi siljitishda soʻraladi (egasi, 30.10): «qoldirish» → oʻzgarmaydi; «qayta» → oʻzgaradi
  await page.evaluate(() => { const ed = (window as any).__mr, b = ed.store.doc.buildings.find((x: any) => x.gen); ed.store.dispatch({ type: 'updateBuilding', id: b.id, patch: { floors: b.floors + 2 } }); });
  const mid = await snap();
  s = await scr(100, -30); await page.mouse.move(s.x, s.y); await page.mouse.down();
  const t2 = await scr(100, -45); await page.mouse.move(t2.x, t2.y, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('#regenAsk')).toBeVisible({ timeout: 10_000 });
  await page.click('#regenNo');
  await expect(page.locator('#regenAsk')).toHaveCount(0);
  expect((await snap()).key).toBe(mid.key);
  s = await scr(100, -45); await page.mouse.move(s.x, s.y); await page.mouse.down();
  const t3 = await scr(100, -55); await page.mouse.move(t3.x, t3.y, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('#regenAsk')).toBeVisible({ timeout: 10_000 });
  await page.click('#regenYes');
  await expect.poll(async () => (await snap()).key, { timeout: 15_000 }).not.toBe(mid.key);
});

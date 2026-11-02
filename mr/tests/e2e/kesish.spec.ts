import { test, expect } from './fx';

/** 02.11 (egasi): kvartal yoki parselni erkin yoʻnalishda (siniq chiziq) kesish va SMZ chegarasi boʻyicha bir bosishda ajratish */
test('parselni siniq chiziq bilan kesish va SMZ boʻyicha ajratish', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  const c = await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), r = ed.store.doc.site.rings[0];
    return [r.reduce((t: number, p: number[]) => t + (p[0] - o[0]) * mx, 0) / r.length, r.reduce((t: number, p: number[]) => t + (p[1] - o[1]) * 111132, 0) / r.length]; });
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click();
  await page.click('#pCut');
  const bb = (await page.locator('#scene canvas').boundingBox())!;
  const at = async (x: number, y: number) => { const s = await page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, 0), [x, y]) as { x: number; y: number }; await page.mouse.click(bb.x + s.x, bb.y + s.y); await page.waitForTimeout(150); };
  // L shaklidagi siniq chiziq: shimoldan pastga, keyin sharqqa — kvartal ichida tugaydi (uchlari avtomatik davom ettiriladi)
  await at(c[0] - 40, c[1] + 80); await at(c[0] - 40, c[1] - 20); await at(c[0] + 120, c[1] - 20);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.parcels.length), { timeout: 8000 }).toBe(2);
  // ikkala qism yigʻindisi ≈ kvartal (1 sm tasma)
  const areas = await page.evaluate(() => (window as any).__mr.plan().blocks.filter((b: any) => b.parcelId).map((b: any) => Math.round(b.area)));
  expect(areas.length).toBe(2); expect(Math.min(...areas)).toBeGreaterThan(1000);
  // SMZ: kvartal chetida qabriston (100 m SMZ) — tugma chiqadi, SMZ qismi koʻkalamzor
  await page.evaluate(([x, y]) => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (a: number, b: number) => [o[0] + a / mx, o[1] + b / 111132];
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'q1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [[g(x - 200, y - 20), g(x - 170, y - 20), g(x - 170, y + 20), g(x - 200, y + 20)]] } }); }, c);
  await page.locator('[data-block="0"]').click();
  await expect(page.locator('#pSzz')).toBeVisible();
  const n0 = await page.evaluate(() => (window as any).__mr.store.doc.parcels.length);
  await page.click('#pSzz');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.parcels.length), { timeout: 8000 }).toBeGreaterThan(n0);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.parcels.some((p: any) => p.use === 'yashil'))).toBe(true);
});

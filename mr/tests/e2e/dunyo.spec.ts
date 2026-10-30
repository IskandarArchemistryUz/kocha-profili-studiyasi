import { test, expect, type Page, type BrowserContext } from './fx';

/** Dunyo xaritasi: davlat qidiruvi, «Dunyo» tugmasi va uzoqlashtirish chegarasi */
async function mockNet(ctx: BrowserContext) {
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|interpreter))/, r => r.fulfill({ json: { elements: [] } }));
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:elevation-tiles|arcgisonline|openfreemap|basemaps|cartocdn))/, r => r.fulfill({ status: 404, body: '' }));
  await ctx.route(/nominatim/, r => r.fulfill({ json: [{ lat: '40.3936', lon: '47.7872', name: 'Azərbaycan', display_name: 'Azərbaycan', boundingbox: ['38.3929', '41.9123', '44.7646', '50.6081'] }] }));
}
async function newProject(page: Page) {
  await page.goto('./'); await page.click('#newP');
  await expect(page.locator('.panel h2')).toHaveText('Joy va uchastka');
}
async function search(page: Page, q: string) {
  await expect.poll(async () => { if (await page.locator('.res .it').count()) return true; await page.fill('#q', q); await page.press('#q', 'Enter'); await page.waitForTimeout(400); return (await page.locator('.res .it').count()) > 0; }, { timeout: 20_000 }).toBe(true);
}

test('davlat qidirilsa — dunyo xaritasida ochiladi, «Shu yerda ochish» bilan 3D ga oʻtiladi', async ({ page, context }) => {
  await mockNet(context);
  await newProject(page);
  const before = await page.locator('#orig').textContent();
  await search(page, 'azerbaijan');
  await page.locator('.res .it').first().click();
  await expect(page.locator('#worldMap')).toBeVisible();
  await expect(page.locator('#worldMap .maplibregl-canvas')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.mapctl')).toBeHidden();
  await page.waitForTimeout(1200);   // fitBounds animatsiyasi
  await page.click('#wmHere');
  await expect(page.locator('#worldMap')).toBeHidden();
  const after = await page.locator('#orig').textContent();
  expect(after).not.toBe(before);
  const [lat, lon] = after!.split(',').map(Number);
  expect(lat).toBeGreaterThan(38); expect(lat).toBeLessThan(42);
  expect(lon).toBeGreaterThan(44); expect(lon).toBeLessThan(51);
});

test('«Dunyo» tugmasi va Esc; uzoqlashtirish chegarasida dunyo xaritasi ochiladi', async ({ page, context }) => {
  await mockNet(context);
  await newProject(page);
  await page.click('#worldBtn');
  await expect(page.locator('#worldMap')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#worldMap')).toBeHidden();
  await expect(page.locator('.mapctl')).toBeVisible();
  const box = (await page.locator('#scene').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  // 30.10: ~1 km koʻrinishda bitta gʻildirak qadami dunyo xaritasini OCHMASLIGI kerak (avval «oldin» qiymati zoomdan keyin oʻlchanib, har qadamda ochilardi)
  await page.evaluate(() => (window as any).__mr.scene.frameView(0, 0, 900));
  await page.mouse.wheel(0, 120); await page.waitForTimeout(400);
  await expect(page.locator('#worldMap')).toBeHidden();
  expect(await page.evaluate(() => (window as any).__mr.scene.viewExtent().r)).toBeGreaterThan(950);
  await expect.poll(async () => { for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 900); await page.waitForTimeout(150); return page.locator('#worldMap').isVisible(); }, { timeout: 30_000 }).toBe(true);
  await page.click('#wmBack');
  await expect(page.locator('#worldMap')).toBeHidden();
});

test('dunyodan 3D ga sakrashsiz: masshtab va markaz mos, chizilgan uchastka nuqtalari bosilgan joyda qoladi', async ({ page, context }) => {
  await mockNet(context);
  await newProject(page);
  await search(page, 'azerbaijan');
  await page.locator('.res .it').first().click();
  await expect(page.locator('#worldMap .maplibregl-canvas')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  // xaritani yaqinlashtirish → 3D (ARRIVE dan oshdi)
  const exp = await page.evaluate(() => { const m = (window as any).__mr.world.map; m.jumpTo({ center: [49.8671, 40.4093], zoom: 13.5 }); m.fire('zoomend'); const w = (document.querySelector('#scene') as HTMLElement).clientWidth; return 78271.517 * Math.cos(40.4093 * Math.PI / 180) / 2 ** 13.5 * w / 2; });
  await expect(page.locator('#worldMap')).toBeHidden({ timeout: 6000 });
  const got = await page.evaluate(() => (window as any).__mr.scene.viewHalfWidth());
  expect(Math.abs(got / exp - 1)).toBeLessThan(0.03);
  const [lat, lon] = (await page.locator('#orig').textContent())!.split(',').map(Number);
  expect(Math.abs(lat - 40.4093)).toBeLessThan(0.001); expect(Math.abs(lon - 49.8671)).toBeLessThan(0.001);
  // markazdan uzoqroqda uchastka chizish — loyiha markazi uchastkaga koʻchadi, lekin ekranda hech narsa siljimasin
  await page.click('#drawSite');
  const box = (await page.locator('#scene').boundingBox())!;
  const P = [[0.62, 0.30], [0.86, 0.30], [0.86, 0.62], [0.62, 0.62]].map(([x, y]) => [box.x + box.width * x, box.y + box.height * y]);
  for (const [x, y] of P) { await page.mouse.click(x, y); await page.waitForTimeout(120); }
  await page.keyboard.press('Enter');
  await expect(page.locator('#siteHa')).toBeVisible();
  await page.waitForTimeout(400);
  expect(await page.locator('#orig').textContent()).not.toBe('40.40930, 49.86710');   // markaz uchastkaga koʻchdi
  const off = await page.evaluate((P) => { const ed = (window as any).__mr, d = ed.store.doc, r = d.site.rings[0];
    const o = d.origin, f = o[1] * Math.PI / 180, my = 111132.92 - 559.82 * Math.cos(2 * f) + 1.175 * Math.cos(4 * f), mx = 111412.84 * Math.cos(f) - 93.5 * Math.cos(3 * f) + 0.118 * Math.cos(5 * f);
    const loc = r.map((q: number[]) => [(q[0] - o[0]) * mx, (q[1] - o[1]) * my]);
    return P.map(([x, y]: number[]) => Math.min(...loc.map((q: number[]) => ed.scene.screenDist(q, x, y)))); }, P);
  for (const d of off) expect(d).toBeLessThan(6);
});

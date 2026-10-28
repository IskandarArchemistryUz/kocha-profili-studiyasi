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
  await expect.poll(async () => { for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 900); await page.waitForTimeout(150); return page.locator('#worldMap').isVisible(); }, { timeout: 30_000 }).toBe(true);
  await page.click('#wmBack');
  await expect(page.locator('#worldMap')).toBeHidden();
});

import { test, expect, type BrowserContext } from './fx';

/** 01.11 (egasi): qoʻshni chegara (79-band, 2-jadval: H × kʏ / 2) va atrofdagi (OSM) turar joy binolarigacha masofa; OSM binosi vazifasini qoʻlda belgilash */
const O = [69.2797, 41.3111];
const kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
const R = (x0: number, y0: number, x1: number, y1: number) => [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)];
function city() {
  return { elements: [
    { type: 'way', id: 11, tags: { building: 'apartments', 'building:levels': '9' }, geometry: R(120, -20, 180, 20) },   // sharqda turar joy
    { type: 'way', id: 12, tags: { building: 'yes' }, geometry: R(115, 45, 150, 75) },                                 // shimoli-sharqda — vazifasi nomaʼlum
  ] };
}
async function mockNet(ctx: BrowserContext) {
  await ctx.route(/overpass|interpreter/, r => r.fulfill({ json: city() }));
  await ctx.route(/elevation-tiles|arcgisonline|openfreemap\.org/, r => r.fulfill({ status: 404, body: '' }));
}
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qoʻshni chegara va atrofdagi turar joy · ${w}px${dark ? ' · tungi' : ''}`, async ({ page, context }) => {
  test.setTimeout(150_000);
  await mockNet(context);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('2 bino', { timeout: 15000 });
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '120'); await page.click('#rectSite');
  await page.evaluate(() => {
    const mr = (window as any).__mr, [lng, lat] = mr.store.doc.origin, k = 1 / 111320, kx = k / Math.cos(lat * Math.PI / 180), g = (x: number, y: number) => [lng + x * kx, lat + y * k];
    mr.store.dispatch({ type: 'addBuilding', footprint: [g(80, -25), g(95, -25), g(95, 25), g(80, 25)], floors: 16, nonRes: 0 });
    mr.store.dispatch({ type: 'setSiteEdges', kind: 'qoshni' });
  });
  await page.waitForTimeout(800);
  await page.click('#kMore');
  const q = page.locator('.drawer [data-rule=qoshni-79]'), c = page.locator('.drawer [data-rule=kontekst-79]');
  await expect(q.locator('.chip')).toHaveAttribute('data-s', 'fail');
  await expect(c.locator('.chip')).toHaveAttribute('data-s', 'fail');
  await c.click(); await expect(c).toContainText('vazifasi nomaʼlum 1');
  await c.locator('[data-where]').click();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/kontekst79_${w}${dark ? 'd' : 'l'}.png` }); }
  // nomaʼlum binoga vazifa — loyihada saqlanadi
  await page.evaluate(() => (window as any).__mr.store.dispatch({ type: 'setCtxUse', ids: [12], use: 'noturar' }));
  await expect.poll(() => page.evaluate(() => ((window as any).__mr.allRules() as { id: string; note?: string }[]).find(r => r.id === 'kontekst-79')?.note ?? '')).toContain('vazifasi nomaʼlum 0');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.ctxUse)).toEqual({ 12: 'noturar' });
});

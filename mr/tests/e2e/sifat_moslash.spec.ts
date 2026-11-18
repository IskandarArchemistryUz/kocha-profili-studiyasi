import { test, expect } from './fx';

/** 18.11 (T3): retina ekranda kamera harakatida piksel zichligi 1, toʻxtagach qaytadi; soya xaritasi «Sodda» — 2048², «Toʻliq» — 4096² */
test.use({ deviceScaleFactor: 2 });
test('sifat moslashadi · retina', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.scene);
  const pr = () => page.evaluate(() => (window as any).__mr.scene.renderer.getPixelRatio());
  const sh = () => page.evaluate(() => (window as any).__mr.scene.sun.shadow.mapSize.x);
  expect(await pr()).toBe(2);
  expect(await sh()).toBe(2048);
  await page.evaluate(() => (window as any).__mr.scene.ctl.dispatchEvent({ type: 'change' }));
  expect(await pr()).toBe(1);
  await expect.poll(pr, { timeout: 3000 }).toBe(2);
  await page.click('#liteSeg [data-lite=toliq]');
  expect(await sh()).toBe(4096);
  await page.click('#liteSeg [data-lite=sodda]');
  expect(await sh()).toBe(2048);
});

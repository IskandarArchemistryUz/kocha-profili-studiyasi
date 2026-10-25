import { test, expect } from './fx';

/** Egasi (25.10): «free form chizganda razmerini qoʻyolmadim» — erkin shakl va toʻrtburchak oʻlcham bilan */
test('qoʻlda bino: erkin shakl panel orqali 40 × 30 m, klaviaturadan toʻrtburchak 24x12', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  const c = page.locator('#scene canvas'), bb = (await c.boundingBox())!, cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  await page.click('#drawPoly');
  await expect(page.locator('#dimBox')).toBeVisible();
  await page.mouse.click(cx - 60, cy + 40);                 // birinchi nuqta
  for (const [L, A] of [['40', '0'], ['30', '90'], ['40', '180']]) { await page.fill('#drawLen', L); await page.fill('#drawAng', A); await page.click('#drawAdd'); }
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBe(1);
  const a1 = await page.evaluate(() => { const b = (window as any).__mr.store.doc.buildings[0].footprint as number[][], k = 111320 * Math.cos(b[0][1] * Math.PI / 180); let s = 0; for (let i = 0; i < b.length; i++) { const p = b[i], q = b[(i + 1) % b.length]; s += p[0] * k * q[1] * 111132 - q[0] * k * p[1] * 111132; } return Math.abs(s) / 2; });
  expect(a1).toBeGreaterThan(1180); expect(a1).toBeLessThan(1220);
  await page.keyboard.press('Escape');
  // toʻrtburchak: birinchi burchak, keyin sahnada «24x12» va Enter
  await page.click('#drawBld');
  await page.mouse.click(cx + 40, cy - 60); await page.mouse.move(cx + 80, cy - 90);
  await page.keyboard.type('24x12');
  await expect(page.locator('.hint')).toContainText('24x12');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/olcham_dark.png` });
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBe(2);
  const a2 = await page.evaluate(() => { const b = (window as any).__mr.store.doc.buildings[1].footprint as number[][], k = 111320 * Math.cos(b[0][1] * Math.PI / 180); let s = 0; for (let i = 0; i < b.length; i++) { const p = b[i], q = b[(i + 1) % b.length]; s += p[0] * k * q[1] * 111132 - q[0] * k * p[1] * 111132; } return Math.abs(s) / 2; });
  expect(a2).toBeGreaterThan(280); expect(a2).toBeLessThan(296);
});

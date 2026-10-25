import { test, expect } from './fx';

/** Material tanlanganda (oʻng panel ochilib, chap panel yigʻilganda) varaq ekranda joyidan siljimaydi */
test('Chizmadon: katakni tanlaganda varaq siljimaydi (1024 px)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('#chOpen'); await page.click('#chStGo');
  const stage = page.locator('.ch-stage');
  await expect.poll(async () => page.locator('.ch-body [data-el]').count()).toBeGreaterThan(0);
  // chap panelni ochamiz (tor ekranda material tanlanganda yigʻiladi)
  if (!(await page.locator('#chMats').isVisible())) { await page.locator('[data-open=L]').click(); await expect(page.locator('#chMats')).toBeVisible(); }
  const s0 = (await stage.boundingBox())!;
  const c = (await page.locator('.ch-body [data-el]').first().boundingBox())!;
  await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
  await expect(page.locator('#chSlotBar')).toBeVisible();
  const s1 = (await stage.boundingBox())!;
  expect(Math.abs(s1.x - s0.x)).toBeLessThan(2);
  expect(Math.abs(s1.y - s0.y)).toBeLessThan(2);
});

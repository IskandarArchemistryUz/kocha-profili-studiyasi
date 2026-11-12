import { test, expect } from './fx';

/** 12.11 (egasi): «Variant taklif qil» yonida — «Boshqa variant»: har bosilganda yangi variant, cheklanmagan */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`boshqa variant · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '140'); await page.fill('#rh', '110'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  const sig = () => page.evaluate(() => JSON.stringify((window as any).__mr.store.doc.buildings.map((b: any) => [b.floors, b.footprint.map((p: number[]) => p.map(v => v.toFixed(6)))])));
  await expect.poll(async () => (await sig()).length).toBeGreaterThan(10);
  const seen = new Set([await sig()]);
  const btn = page.locator('#genNext');
  await expect(btn).toBeVisible();
  for (let k = 1; k <= 4; k++) {
    await btn.click();
    await expect(page.locator('#genNext')).toHaveAttribute('data-v', String(k));
    seen.add(await sig());
  }
  expect(seen.size).toBeGreaterThanOrEqual(3);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(700); await page.screenshot({ path: `${process.env.GX_SHOTS}/gen_variant_${w}${dark ? 'd' : 'l'}.png` }); }
});

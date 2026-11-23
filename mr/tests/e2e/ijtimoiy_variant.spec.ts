import { test, expect } from './fx';

/** 18.11 (egasi): maktab, MTM, poliklinika — «Boshqa variant» (joylashuv koʻzgusi va 90° burilish; MTM — bino shimolda) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`ijtimoiy obyekt — boshqa variant · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP').then(() => page.click('#newP-mr'));
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click(); await page.click('[data-use=maktab]');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('#genGo');
  const sig = () => page.evaluate(() => JSON.stringify((window as any).__mr.store.doc.buildings.map((b: any) => b.footprint.map((p: number[]) => p.map(v => v.toFixed(6))))));
  await expect.poll(async () => (await sig()).length).toBeGreaterThan(10);
  const seen = new Set([await sig()]);
  await expect(page.locator('#genNext .gen-left')).toHaveText('20');
  for (let k = 0; k < 3; k++) {
    const before = await sig();
    await page.click('#genNext');
    await expect.poll(sig).not.toBe(before);
    seen.add(await sig());
  }
  expect(seen.size).toBe(4);
  await expect(page.locator('#genNext .gen-left')).toHaveText('17');
  await expect(page.locator('#genNotes')).toContainText('oʻquvchi');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/ijtimoiy_variant_${w}${dark ? 'd' : 'l'}.png` }); }
});

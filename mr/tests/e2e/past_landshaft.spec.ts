import { test, expect } from './fx';

/** 31.10 (egasi: «yakka uylar, taunhauslar oʻtmagan, devorlari koʻrinmayapti»): uchastka devori (3D), orqa bogʻ, terrasa, pushtalar, umumiy maydoncha */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`past qavatli uylar landshafti · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '140'); await page.fill('#rh', '110'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  const cnt = (k: string) => page.evaluate((k2) => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.[k2] || o.userData?.playKit === k2) n++; }); return n; }, k);
  for (const t of ['yakka', 'taunhaus', 'hovli']) {
    await page.click(`[data-typ=${t}]`); await page.click('#genGo');
    await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
    await page.click('[data-view=axo]');
    await expect.poll(() => cnt('fence'), { timeout: 15_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/past_${t}_${w}${dark ? 'd' : 'l'}.png` });
  }
});

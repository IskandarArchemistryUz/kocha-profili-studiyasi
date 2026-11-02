import { test, expect } from './fx';

/** 02.11 (egasi: «sahna juda ogʻir»): soya xaritasi kamera aylanganda qayta chizilmaydi — faqat sahna mazmuni oʻzgarganda */
test('soya xaritasi faqat mazmun oʻzgarganda yangilanadi', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.waitForTimeout(800);
  const calls = (shadow: boolean) => page.evaluate(async (sh) => {
    const sc = (window as any).__mr.scene, r = sc.renderer; r.info.autoReset = false; await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f)));
    r.info.reset(); sc.invalidate(sh); await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f))); const n = r.info.render.calls; r.info.autoReset = true; return n;
  }, shadow);
  const view = await calls(false), full = await calls(true);
  expect(view).toBeGreaterThan(0);
  expect(full).toBeGreaterThan(view + 30);   // soya oʻtishi qoʻshiladi
  // kamera aylanishi (OrbitControls «change») — soyasiz kadr
  const orbit = await page.evaluate(async () => {
    const sc = (window as any).__mr.scene, r = sc.renderer; await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f)));
    r.info.autoReset = false; r.info.reset(); sc.ctl.dispatchEvent({ type: 'change' }); await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f))); const n = r.info.render.calls; r.info.autoReset = true; return n;
  });
  expect(orbit).toBeLessThan(full);
});

import { test, expect } from './fx';

/**
 * 11.11 (L1, video yozishda): 420 × 300 m uchastka, Barselona 113 × 113, «45°» qayta qoʻllansa sahnada TypeError
 * (scene/streets3d partAxis — qisqa koʻcha boʻlagi) va loyiha qayta ochilganda chap panel boʻsh edi.
 */
test('45° koʻcha toʻri loyihani buzmaydi', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && /TypeError|sahna xatosi/.test(m.text())) errs.push(m.text()); });
  await page.setViewportSize({ width: 1440, height: 860 });
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '420'); await page.fill('#rh', '300'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-gvar="3"]'); await page.click('#gridApply');
  await page.waitForTimeout(800);
  expect(errs).toEqual([]);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/grid45_1440l.png` });
  await page.reload();
  await expect(page.locator('nav.rail button').first()).toBeVisible();
  expect(await page.locator('nav.rail button').count()).toBeGreaterThan(5);
  expect(errs).toEqual([]);
});

import { test, expect } from './fx';

/** Chizmadon tahlili (25.10, 3-bosqich): katak ichida kadrlash — kattalashtirish, surish, asliga qaytarish */
test('Chizmadon: rejani katak ichida kattalashtirish va surish (masshtab yozuvi mos)', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen'); await page.click('#chStGo');
  const plan = page.locator('.ch-body [data-el="p:plan:bosh"]');
  for (let i = 0; i < 6 && !(await plan.count()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); }
  await expect(plan).toHaveCount(1);
  const sc = () => plan.evaluate(e => (e.querySelector('[data-deco="scale"]')?.textContent ?? '').replace(/^.*M 1:/, '').replace(/\s/g, ''));
  const vb = () => plan.evaluate(e => e.querySelector('svg[viewBox]')?.getAttribute('viewBox') ?? '');
  const s0 = Number(await sc()), v0 = await vb();
  // ikki marta bosish — kadrlash rejimi
  let b = (await plan.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(300);
  b = (await plan.boundingBox())!;
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
  await expect(page.locator('#chCropBar')).toBeVisible();
  await expect(page.locator('.ch-crophint')).toBeVisible();
  await page.click('#chCropIn'); await page.click('#chCropIn');
  await expect(page.locator('#chCropZ')).toHaveText(/156 %/);
  const s1 = Number(await sc());
  expect(s1).toBeLessThan(s0 * 0.75);   // kattaroq → masshtab soni kichikroq
  // sudrab surish — koʻrinish siljiydi
  b = (await plan.boundingBox())!;
  const v1 = await vb();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 20, { steps: 6 }); await page.mouse.up();
  await expect.poll(vb).not.toBe(v1);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_kadr_1024.png` });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_kadr_dark.png` });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  // Esc — tayyor; kadr saqlanadi
  await page.locator('.ch-view').focus(); await page.keyboard.press('Escape');
  await expect(page.locator('#chCropBar')).toHaveCount(0);
  expect(Number(await sc())).toBe(s1);
  // oʻng panel: «Asliga qaytarish»
  b = (await plan.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.click('#chMatCropReset');
  await expect.poll(vb).toBe(v0);
  expect(Number(await sc())).toBe(s0);
});

import { test, expect } from './fx';

test('qismiy chok: torets devor uzun devor oʻrtasida — yopilgan qismda deraza va balkon yoʻq', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  // ikki bino qoʻlda: uzun (sharq–gʻarb) va unga oʻrtasidan tegib turgan torets
  const c = page.locator('#scene canvas'), bb = (await c.boundingBox())!;
  await page.click('[data-view=plan]');
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  await page.fill('#fl', '9'); await page.click('#drawBld');
  await page.mouse.click(cx - 120, cy - 30); await page.mouse.click(cx + 120, cy + 10);
  await page.fill('#fl', '12');
  await page.mouse.click(cx - 20, cy + 10); await page.mouse.click(cx + 30, cy + 140);
  await page.click('#drawBld');
  await expect(page.locator('#bldSt')).toContainText('2 bino');
  await page.click('[data-step=fasad]');
  await page.click('[data-row=bal]'); await page.click('[data-bal=ochiq]'); await page.click('[data-row=mat]'); await page.click('[data-mat=gisht]');
  await page.click('[data-view=axo]');
  await page.mouse.move(cx, cy); await page.mouse.wheel(0, -500); await page.waitForTimeout(300); if (shots) await page.screenshot({ path: `${shots}/chok.png` }); await page.mouse.wheel(0, -700);
  await page.waitForTimeout(500);
  if (shots) await page.screenshot({ path: `${shots}/chok2.png` });
  expect(await page.locator('#scene canvas').count()).toBe(1);
});

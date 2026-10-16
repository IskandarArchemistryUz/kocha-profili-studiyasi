import { test, expect } from '@playwright/test';

test('erkin shakl bino, yopishish va kesma yorliqlari, toza terrasa, qavat devorini sudrash', async ({ page }) => {
  test.setTimeout(150_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  const c = page.locator('#scene canvas'), bb = (await c.boundingBox())!, cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  // erkin shakl (L): 6 nuqta
  await page.fill('#fl', '9'); await page.click('#drawPoly');
  await expect(page.locator('.hint')).toContainText('nuqta');
  for (const [x, y] of [[-120, -60], [40, -60], [40, 20], [-40, 20], [-40, 80], [-120, 80]]) await page.mouse.click(cx + x, cy + y);
  await page.keyboard.press('Enter');
  await expect(page.locator('#bldSt')).toContainText('1 bino');
  await page.keyboard.press('Escape');
  // chizgʻich: yopishish — bino burchagiga yaqin bosilsa, belgi chiqadi; kesma yorligʻi sahnada (sprite) — xatosiz
  await page.click('[data-tool=measure]');
  await page.mouse.move(cx - 118, cy - 58); await page.waitForTimeout(100);
  await page.mouse.click(cx - 118, cy - 58); await page.mouse.click(cx + 38, cy - 58);
  await expect(page.locator('.hint')).toContainText('Oxirgi kesma');
  if (shots) await page.screenshot({ path: `${shots}/iz3_lineyka.png` });
  await page.keyboard.press('Escape'); await page.click('[data-tool=select]');
  // terrasa: L shaklda hamma tomondan 3 m — tikansiz (GFA kamayadi)
  await page.click('[data-view=axo]');
  await page.mouse.click(cx - 80, cy + 10);
  await expect(page.locator('.panel[data-mode=bino]')).toBeVisible();
  const gfa0 = Number((await page.locator('#kGfa b').textContent())!.replace(/\D/g, ''));
  await page.click('[data-itab=qavat]'); await page.click('[data-floor="5"]');
  await page.fill('#tInset', '3'); await page.press('#tInset', 'Tab'); await page.click('#tAdd');
  await expect(page.locator('#tierList')).toContainText('ichkariga');
  const gfa1 = Number((await page.locator('#kGfa b').textContent())!.replace(/\D/g, ''));
  expect(gfa1).toBeLessThan(gfa0);
  if (shots) await page.screenshot({ path: `${shots}/iz3_terrasa.png` });
  // qavat devorini sudrash: tashqariga — konsol
  await page.click('#floorDrag');
  await expect(page.locator('#floorDrag')).toHaveAttribute('aria-pressed', 'true');
  // devorni topish: bir necha nuqtadan sudrab koʻramiz
  let ok = false;
  for (const [x, y] of [[-70, 40], [-50, 30], [-90, 50], [-30, 0], [-100, 20]]) {
    await page.mouse.move(cx + x, cy + y); await page.mouse.down(); await page.mouse.move(cx + x - 40, cy + y + 20, { steps: 8 }); await page.mouse.up();
    if ((await page.locator('#tierList').textContent().catch(() => ''))?.includes('devor')) { ok = true; break; }
  }
  expect(ok).toBe(true);
  if (shots) await page.screenshot({ path: `${shots}/iz3_konsol.png` });
});

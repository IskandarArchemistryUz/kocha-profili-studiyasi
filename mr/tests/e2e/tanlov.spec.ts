import { test, expect } from '@playwright/test';

test('Shift + ramka bilan koʻp tanlash, Delete; chizishda oʻng tugma menyusi; Illustrator eksporti', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan generatsiya');
  const n0 = Number((await page.locator('#bldSt b').first().textContent())!.replace(/\D/g, ''));
  const c = page.locator('#scene canvas'), bb = (await c.boundingBox())!;
  // Shift + sudrash — ramka
  await page.keyboard.down('Shift');
  await page.mouse.move(bb.x + bb.width * 0.45, bb.y + bb.height * 0.15); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width * 0.95, bb.y + bb.height * 0.55, { steps: 8 }); await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('.hint')).toContainText('Tanlandi');
  if (shots) await page.screenshot({ path: `${shots}/tanlov_ramka.png` });
  await page.keyboard.press('Delete');
  await expect.poll(async () => Number((await page.locator('#bldSt b').first().textContent())!.replace(/\D/g, ''))).toBeLessThan(n0);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => Number((await page.locator('#bldSt b').first().textContent())!.replace(/\D/g, ''))).toBe(n0);
  // koʻcha chizishda oʻng tugma — «Chizishni tugatish»
  await page.click('[data-step=kocha]'); await page.click('#drawStreet');
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  await page.mouse.click(cx - bb.width * 0.12, cy - bb.height * 0.3); await page.mouse.click(cx - bb.width * 0.12, cy + bb.height * 0.3);
  await page.mouse.click(cx + 40, cy, { button: 'right' });
  await expect(page.locator('.cmenu')).toContainText('Chizishni tugatish');
  if (shots) await page.screenshot({ path: `${shots}/tanlov_menyu.png` });
  await page.locator('.cmenu button', { hasText: 'Chizishni tugatish' }).click();
  await expect(page.locator('[data-sid]')).toHaveCount(1);
  // Illustrator
  await page.click('[data-step=eksport]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exAi')]);
  expect(dl.suggestedFilename()).toMatch(/illustrator\.svg$/);
});

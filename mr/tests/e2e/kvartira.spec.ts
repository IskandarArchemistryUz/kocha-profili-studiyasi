import { test, expect } from '@playwright/test';

test('kvartiralar: miks, deraza insolyatsiyasi, fasad belgilari, reyestr', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('[data-style=albom]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-style=rangli]'); await expect(page.locator('[data-style=albom]')).toHaveAttribute('aria-pressed', 'false');
  await page.click('[data-style=albom]');
  await page.click('[data-step=fasad]');
  await expect(page.locator('#facCheck')).toContainText('1:');
  await page.click('[data-fac=panorama]');
  await expect(page.locator('#facCheck')).toContainText('mos emas');   // panorama — yorugʻlik 1:4,5 dan koʻp
  await page.click('[data-fac=klassik]');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('kvartira');
  const n0 = Number((await page.locator('#aptPlan b').textContent())!.replace(/\D/g, ''));
  expect(n0).toBeGreaterThan(50);
  // faqat 1 xonali → kvartiralar koʻpayadi
  for (const [i, v] of [[1, '100'], [2, '0'], [3, '0'], [4, '0']] as const) { await page.fill(`[data-mix="${i}"]`, v); await page.press(`[data-mix="${i}"]`, 'Tab'); }
  const n1 = Number((await page.locator('#aptPlan b').textContent())!.replace(/\D/g, ''));
  expect(n1).toBeGreaterThan(n0);
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
  await page.click('#aptGo');
  await expect(page.locator('#aptSt')).toContainText('kvartira mos', { timeout: 90000 });
  await page.click('[data-am=west]');
  await expect(page.locator('#aptSt')).toContainText('gʻarb qoidasi');
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=insol-apartments]')).toContainText('8.3–8.5');
  await expect(page.locator('.drawer [data-rule=west-apartments]')).toContainText('9.2');
  await expect(page.locator('.drawer [data-rule=school]')).toContainText('stat.uz');
});

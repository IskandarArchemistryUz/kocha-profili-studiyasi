import { test, expect } from './fx';

test('hovli obodonlashtirish va yashillik balansi', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan generatsiya');
  await page.click('[data-step=yashil]');
  await expect(page.locator('#greenSt')).toContainText('Hovlilar maysasi');
  await expect(page.locator('#greenSt')).not.toContainText('Hovli maydonchalari—');
  const t = (await page.locator('#greenSt').textContent())!;
  expect(t).toMatch(/Hovli maydonchalari(4-jadval)?[\d\s]+\/[\d\s]+m²/);
  if (shots) await page.screenshot({ path: `${shots}/hovli.png` });
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=green-86]')).toContainText('86, 87, 474-bandlar');
  await expect(page.locator('.drawer [data-rule=play-89]')).toBeAttached();
  await page.click('#kMore');
  await page.click('#yardsOn');   // kalit (switch) — oʻchirish
  await expect(page.locator('#greenSt')).toContainText('Hovlilar maysasi0 m²');
});

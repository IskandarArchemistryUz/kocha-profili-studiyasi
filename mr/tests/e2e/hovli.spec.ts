import { test, expect } from './fx';

test('hovli obodonlashtirish va yashillik balansi', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
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
  // 27.10 (A variant): bitta foiz + manbalar chizigʻi; kalit «Batafsil» ichida
  await expect(page.locator('#greenKpi .gbar .g-yard')).toHaveCount(1);
  await page.click('#greenMore > summary');
  await page.click('#yardsOn');   // kalit (switch) — oʻchirish
  await expect(page.locator('#greenSt')).toContainText('Hovlilar maysasi0 m²');
  await expect(page.locator('#yardsOff')).toContainText('Hovlilar hisobga olinmayapti');
  await expect(page.locator('#greenKpi .glegend')).toContainText('Hovli maysasi — oʻchiq');
  await expect(page.locator('#greenKpi .gbar .g-yard')).toHaveCount(0);
  await page.locator('#yardsOff button').click();   // «Yoqish»
  await expect(page.locator('#yardsOff')).toHaveCount(0);
  await expect(page.locator('#greenKpi .gbar .g-yard')).toHaveCount(1);
});

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Yashil qadami: soddalashtirilgan panel · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await page.click('[data-step=yashil]');
  await expect(page.locator('#greenKpi')).toBeVisible();
  await expect(page.locator('#greenMore')).not.toHaveAttribute('open', '');
  await expect(page.locator('#greenBlocks')).not.toHaveAttribute('open', '');
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/yashil_${w}${dark ? 'd' : 'l'}.png` });
});

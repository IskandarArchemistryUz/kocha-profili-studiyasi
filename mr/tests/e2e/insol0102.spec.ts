import { test, expect } from './fx';

/** SanQvaN 0102-25 (0331-16 oʻrniga): kvartiralar insolyatsiyasi 94–95, yoʻnalish 15-band (gʻarb taqiqi + janub/sharq talabi), reyestr va panel matnlari; 1024 px tungi rejimda ham */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`insolyatsiya va yoʻnalish — SanQvaN 0102-25 · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await expect(page.locator('.panel')).toContainText('SanQvaN 0102-25, 95');
  await expect(page.locator('#aptRelief')).toHaveCount(1);   // eski 8.5 rejimi tugmasi saqlanadi (kuchini yoʻqotgan norma, belgi bilan)
  await page.click('#aptGo');
  await expect(page.locator('#aptSt')).toContainText('xonadon mos', { timeout: 90_000 });
  await expect(page.locator('#aptSt')).toContainText('gʻarb taqiqi');
  await expect(page.locator('#aptSt')).toContainText('janub/sharq talabi');
  await page.click('[data-am=west]');
  await expect(page.locator('.leg')).toContainText('Gʻarbga (200–290°) — yoʻl qoʻyilmaydi');
  await expect(page.locator('.leg')).toContainText('15-band');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/insol_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#kMore');
  for (const [id, txt] of [['insol-apartments', '94, 95'], ['west-apartments', '15-band, 1-xatboshi'], ['se-apartments', '15-band, 2-xatboshi']] as const)   /* insol-territory — faqat «Quyosh» qadamida hisoblangach */
    await expect(page.locator(`.drawer [data-rule=${id}]`)).toContainText(txt);
  await expect(page.locator('.drawer')).not.toContainText('0331-16, 8');
  if (process.env.GX_SHOTS) { await page.locator('.drawer [data-rule=se-apartments]').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${process.env.GX_SHOTS}/insol_reyestr_${w}${dark ? 'd' : 'l'}.png` }); }
});

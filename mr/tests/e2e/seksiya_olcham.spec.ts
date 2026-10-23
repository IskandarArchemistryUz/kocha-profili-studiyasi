import { test, expect } from './fx';

/** 12-band: seksiya oʻlchamlari — aniq rejim, har yer uchastkasi oʻz parametrlarini eslaydi, ijtimoiy korpus eni */
test('seksiya oʻlchamlari: aniq rejim, yer uchastkasi xotirasi, korpus eni', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=parsel]');
  await page.locator('[data-block="0"]').click(); await page.locator('#pSize').fill('1'); await page.click('[data-grid=ns]'); await page.click('#pSplit');
  await expect(page.locator('[data-block]')).toHaveCount(6);
  await page.click('[data-step=hajm]');
  // 1-uchastka: 36 m, aniq
  await page.selectOption('#genBlock', '1');
  await page.fill('#gLen', '36'); await page.press('#gLen', 'Tab');
  await page.click('#gExact');
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('Aniq oʻlcham');
  const pg = await page.evaluate(() => { const ed = (window as any).__mr, b = ed.plan().blocks[1]; return ed.store.doc.parcels.find((p: any) => p.id === b.parcelId)?.gen; });
  expect(pg.secLen).toBe(36); expect(pg.exact).toBe(true);
  // 2-uchastka: boshqa oʻlcham
  await page.selectOption('#genBlock', '2');
  await page.fill('#gLen', '20'); await page.press('#gLen', 'Tab');
  await page.click('#gExact');   // oʻchirish
  await page.click('#genGo');
  // 1-ga qaytilganda panel uning parametrlarini yuklaydi
  await page.selectOption('#genBlock', '1');
  await expect(page.locator('#gLen')).toHaveValue('36');
  await expect(page.locator('#gExact')).toBeChecked();
  await page.selectOption('#genBlock', '2');
  await expect(page.locator('#gLen')).toHaveValue('20');
  await expect(page.locator('#gExact')).not.toBeChecked();
  // ijtimoiy: korpus eni
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click(); await page.click('[data-use=poliklinika]');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect(page.locator('#socBW')).toBeVisible();
  await page.fill('#socBW', '12'); await page.press('#socBW', 'Tab');
  await page.click('#genGo');
  const w = await page.evaluate(() => { const ed = (window as any).__mr, b = ed.plan().blocks[0], g = ed.store.doc.parcels.find((p: any) => p.id === b.parcelId)?.gen; return g?.soc?.bw; });
  expect(w).toBe(12);
  const shots = process.env.SHOTS;
  if (shots) { await page.locator('#socBW').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${shots}/soc-bw.png` }); await page.selectOption('#genBlock', '1'); await page.locator('#gExact').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${shots}/exact.png` }); await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await page.waitForTimeout(400); await page.screenshot({ path: `${shots}/exact-dark.png` }); }
});

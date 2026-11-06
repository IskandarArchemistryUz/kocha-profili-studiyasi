import { test, expect } from './fx';

/** 06.11 (egasi: «qoʻshimcha yana bitta listga parsel plani, yani faqat parsellari toʻliq rangda koʻrinadi, ichida binolarisiz»):
 *  «Parsellar rejasi» varagʻi — parsellar toʻliq funksiya rangida, binolar, daraxtlar va maydonchalarsiz; koʻcha hududi va qizil chiziqlar
 *  uchastka ichida; oʻng ustunda parsellar jadvali (ga, %) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`parsellar rejasi varagʻi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|interpreter|arcgisonline|terrain|amazonaws|elevation|openfreemap|tile|cartocdn|openstreetmap\.org))/, r => r.abort());
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '220'); await page.fill('#rh', '170'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    ed.store.dispatch({ type: 'addStreet', axis: [[-140, 0], [140, 0]].map(G), profile: 'mahalla-15' });
    ed.store.dispatch({ type: 'addStreet', axis: [[20, -110], [20, 110]].map(G), profile: 'mahalla-15' }); });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(0);
  await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
  // yangi albomda sukut toʻplamiga Zonalashtirishdan keyin qoʻshilgan
  const names = await page.locator('[data-sheet]').allTextContents();
  const iz = names.findIndex(t => /Zonalashtirish/.test(t)), ip = names.findIndex(t => /Parsellar rejasi|Yer uchastkalari rejasi/.test(t));
  expect(iz).toBeGreaterThanOrEqual(0); expect(ip).toBe(iz + 1);
  await page.locator('[data-sheet]').nth(ip).click();
  const view = page.locator('#gxView svg'), tag = `${w}${dark ? 'd' : 'l'}`;
  await expect(view.locator('#Parsellar path').first()).toBeAttached();
  expect(await view.locator('#Parsellar path').count()).toBeGreaterThan(1);
  // binolar, daraxtlar, hovli maydonchalari yoʻq
  for (const id of ['Yangi_binolar', 'Hovlilar', 'Hovli_daraxtlari', 'Kocha_daraxtlari', 'Qavatlar_soni']) await expect(view.locator(`#${id}`)).toHaveCount(0);
  // koʻcha hududi va qizil chiziqlar (uchastka bilan kesilgan), loyiha chegarasi, jadval
  await expect(view.locator('#Loyiha_kochalari [clip-path="url(#ichki)"]')).toBeAttached();
  await expect(view.locator('#Qizil_chiziqlar')).toBeAttached();
  await expect(view.locator('#Uchastka_chegarasi')).toBeAttached();
  await expect(view.locator('#Parsellar_jadvali')).toBeAttached();
  await expect(page.locator('#gxView')).toContainText('Koʻcha hududi (qizil chiziqlar oraligʻi)');
  await expect(page.locator('#gxView')).toContainText('100,0 %');
  // namuna plitasi
  await expect(page.locator('[data-kind=parsel]')).toBeVisible();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/parsel_varaq_${tag}.png` }); await view.screenshot({ path: `${process.env.GX_SHOTS}/parsel_varaq_varaq_${tag}.png` }); }
});

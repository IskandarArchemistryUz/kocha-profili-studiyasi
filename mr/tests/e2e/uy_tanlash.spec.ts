import { test, expect } from './fx';

/**
 * 1.11: aralash loyihada (seksiya + past qavatli uylar) uy bosilsa — faqat oʻsha uyning rejasi (kvartira rejalari chiqmaydi),
 * genplanda uylar ham bor; reja katta oynada ochiladi va tahrirlanadi; seksiya bosilsa — yana kvartira rejasi.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`uy tanlash va katta oyna · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '110'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-typ=taunhaus]'); await page.click('#genGo');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.some((x: any) => x.gen?.plot));
  // qoʻlda 9 qavatli seksiya (uylardan uzoqda)
  await page.evaluate(() => {
    const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), G = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    m.store.dispatch({ type: 'addBuilding', id: 'sek1', footprint: [[100, -8], [136, -8], [136, 8], [100, 8]].map(G), floors: 9 });
  });
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#planBox svg')).toBeVisible();
  await expect(page.locator('#planGp [data-house]').first()).toBeAttached();
  // genplanda uy bosiladi → uy rejasi, kvartira bloklari yoʻq
  await page.locator('#planGp [data-house]').nth(2).dispatchEvent('click');
  await expect(page.locator('#houseSelNote')).toBeVisible();
  await expect(page.locator('#houseBox svg')).toBeVisible();
  await expect(page.locator('#planBox')).toHaveCount(0);
  await expect(page.locator('#mixRow')).toHaveCount(0);
  await expect(page.locator('#planGp [data-house][fill="#0a84ff"]')).toHaveCount(1);
  // sahnada uy tanlansa ham xuddi shunday
  const hid = await page.evaluate(() => { const ed = (window as any).__mr, b = ed.store.doc.buildings.filter((x: any) => x.gen?.plot)[4]; ed.sel = b.id; ed.scene.select(b.id); ed.renderPanel(); return b.id; });
  await expect(page.locator('#planBox')).toHaveCount(0);
  await expect(page.locator('#houseBox svg')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/uy_tanlash_${w}${dark ? 'd' : 'l'}.png` });
  // katta oyna: reja + tahrir
  await page.click('#houseBox');
  await expect(page.locator('#houseAlb #houseBigBox svg')).toBeVisible();
  await page.locator('#houseAlb #houseMirror').click();
  expect(await page.evaluate(id => (window as any).__mr.store.doc.buildings.find((x: any) => x.id === id).house, hid)).toEqual({ mirror: true });
  await expect(page.locator('#houseAlb #houseBigBox svg')).toBeVisible();   // tahrirdan keyin oyna yangilanadi, yopilmaydi
  await expect(page.locator('#houseAlb')).toHaveCount(1);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/uy_katta_${w}${dark ? 'd' : 'l'}.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('#houseAlb')).toHaveCount(0);
  // seksiyaga qaytish — genplandan
  await page.locator('#planGp [data-bld=sek1]').dispatchEvent('click');
  await expect(page.locator('#planBox svg')).toBeVisible();
  await expect(page.locator('#mixRow')).toBeVisible();
});

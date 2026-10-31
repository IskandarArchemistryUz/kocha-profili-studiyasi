import { test, expect } from './fx';

/** Past qavatli uy rejalari (31.10): «Xonadonlar» qadamida uy turlari, 1/2/3-qavat rejasi, hovli — milliy / zamonaviy uslub */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`past qavatli uy rejalari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '110'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-typ=taunhaus]'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#houseBox svg')).toBeVisible();
  await expect(page.locator('#houseBox svg text', { hasText: 'mehmonxona' }).first()).toBeAttached();
  await page.click('#houseFloor [data-hf="2"]');
  await expect(page.locator('#houseBox svg text', { hasText: 'hammom' }).first()).toBeAttached();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/uy_taunhaus_${w}${dark ? 'd' : 'l'}.png` });
  // 31.10: sahnada uy tanlansa — oʻsha uy rejasi (kvartira seksiyasiga oʻtmaydi); tahrir: koʻzgu, mehmonxona chuqurligi
  const hid = await page.evaluate(() => { const ed = (window as any).__mr, b = ed.store.doc.buildings.filter((x: any) => x.gen?.plot)[3]; ed.sel = b.id; ed.scene.select(b.id); ed.renderPanel(); return b.id; });
  await expect(page.locator('#houseSelNote')).toBeVisible();
  await page.click('#houseFloor [data-hf="1"]');
  await page.locator('#houseMirror').click();
  expect(await page.evaluate(id => (window as any).__mr.store.doc.buildings.find((x: any) => x.id === id).house, hid)).toEqual({ mirror: true });
  await page.fill('#houseM', '6'); await page.locator('#houseM').dispatchEvent('change');
  expect(await page.evaluate(id => (window as any).__mr.store.doc.buildings.find((x: any) => x.id === id).house.m, hid)).toBeCloseTo(6, 1);
  await page.click('#houseAll');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((x: any) => x.house?.mirror).length)).toBeGreaterThan(3);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/uy_tahrir_${w}${dark ? 'd' : 'l'}.png` });
  await page.evaluate(() => { const ed = (window as any).__mr; ed.sel = null; ed.scene.select(null); ed.renderAll(); });
  // hovli: milliy uslub — darvozaxona, ayvon; zamonaviyga oʻtkazish
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('[data-typ=hovli]'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#houseBox svg text', { hasText: 'darvozaxona' }).first()).toBeAttached();
  await expect(page.locator('#houseBox svg text', { hasText: 'ayvon' }).first()).toBeAttached();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/uy_hovli_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#houseStyle [data-hs=zamonaviy]');
  await expect(page.locator('#houseBox svg text', { hasText: 'darvozaxona' })).toHaveCount(0);
});

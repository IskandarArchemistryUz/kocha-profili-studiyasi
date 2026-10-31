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
  // hovli: milliy uslub — darvozaxona, ayvon; zamonaviyga oʻtkazish
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('[data-typ=hovli]'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#houseBox svg text', { hasText: 'darvozaxona' }).first()).toBeAttached();
  await expect(page.locator('#houseBox svg text', { hasText: 'ayvon' }).first()).toBeAttached();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/uy_hovli_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#houseStyle [data-hs=zamonaviy]');
  await expect(page.locator('#houseBox svg text', { hasText: 'darvozaxona' })).toHaveCount(0);
});

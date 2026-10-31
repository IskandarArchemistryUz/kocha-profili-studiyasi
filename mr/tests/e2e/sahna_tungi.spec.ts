import { test, expect } from './fx';

/** 31.10 (egasi: «tungi rejimda sahna foni yorugʻ qolyapti»): sahna foni, yer va toʻr tema bilan birga qorongʻi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`sahna foni temaga mos · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
  const bg = () => page.evaluate(() => (window as any).__mr.scene.scene.background.getHex());
  const L = (x: number) => ((x >> 16) & 255) * 0.299 + ((x >> 8) & 255) * 0.587 + (x & 255) * 0.114;
  if (dark) expect(L(await bg())).toBeLessThan(60); else expect(L(await bg())).toBeGreaterThan(200);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/sahna_tungi_${w}${dark ? 'd' : 'l'}.png` });
  // tema almashtirilsa — sahna ham almashadi
  await page.click('#themeBtn');
  const nowDark = await page.evaluate(() => document.documentElement.dataset.theme === 'dark');
  if (nowDark) expect(L(await bg())).toBeLessThan(60); else expect(L(await bg())).toBeGreaterThan(200);
});

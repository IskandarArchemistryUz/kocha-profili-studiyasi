import { test, expect } from './fx';

// 31.10: hovli maydonchalari jihozlari (playkit) va burchaklari radiusli yongʻin yoʻlagi — sahnada rang boʻyicha birlashtirilgan obyektlar
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`hovli landshafti: maydoncha jihozlari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
  await page.click('[data-step=yashil]');
  await expect(page.locator('#greenSt')).toContainText('Hovlilar maysasi');
  const kit = await page.evaluate(() => { const s = new Set<string>(); let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.playKit) { s.add(o.userData.playKit); n++; } }); return { kinds: [...s], n }; });
  expect(kit.n).toBeGreaterThan(0);
  expect(kit.n).toBeLessThanOrEqual(12);   // rang boʻyicha birlashtirilgan: ≤ 6 mesh + ≤ 6 chiziq
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/landshaft_${w}${dark ? 'd' : 'l'}.png` });
});

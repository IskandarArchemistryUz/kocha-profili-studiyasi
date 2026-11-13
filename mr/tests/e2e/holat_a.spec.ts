import { test, expect } from './fx';

/** 31.10 (egasi: «A ni kirit», 3-bosqich): pastki qatorda meʼyorlar holati doim koʻrinadi — mos emaslar soni */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`meʼyor holati pastki qatorda · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
  const st = page.locator('#kStat');
  await expect(st).toHaveAttribute('data-s', 'fail');
  // 13.11: belgi reyestr va Maslahatchi bilan bir xil toʻplamni sanaydi (allRules; xonadon rejasi qoidalari — keshda boʻlsa)
  const fails = await page.evaluate(() => (window as any).__mr.allRules(true).filter((r: any) => r.status === 'fail').length);
  expect(fails).toBeGreaterThan(0);
  await expect.poll(async () => Number(await st.textContent())).toBe(fails);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/holat_a_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#kMore');
  await expect(page.locator('.drawer')).toBeVisible();
});

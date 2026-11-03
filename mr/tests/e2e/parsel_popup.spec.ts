import { test, expect, rectSite } from './fx';

/** 03.11 (egasi): kvartal/parsel sahnada bosilganda kursor yonida funksiya tanlash oynasi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`parsel funksiyasi kursor yonida · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await rectSite(page, 160, 140);
  await page.click('[data-step=parsel]');
  const sc = page.locator('#scene canvas'), bb = (await sc.boundingBox())!;
  const c = await page.evaluate(() => { const ed = (window as any).__mr, b = ed.plan().blocks[0], r = b.rings[0]; const x = r.reduce((t: number, p: number[]) => t + p[0], 0) / r.length, y = r.reduce((t: number, p: number[]) => t + p[1], 0) / r.length; return ed.scene.toScreen(x, y, 0); }) as { x: number; y: number };
  // birinchi bosish — tanlaydi (oyna chiqmaydi, boshqa amallarga xalal bermaydi); tanlangan dahala yana bosilsa — oyna
  await page.mouse.click(bb.x + c.x, bb.y + c.y); await page.waitForTimeout(700);
  await expect(page.locator('.usepop')).toHaveCount(0);
  await page.mouse.click(bb.x + c.x, bb.y + c.y);
  const pop = page.locator('.usepop');
  await expect(pop).toBeVisible();
  const box = (await pop.boundingBox())!;
  expect(Math.abs(box.x - (bb.x + c.x)) < 400 && Math.abs(box.y - (bb.y + c.y)) < 600).toBe(true);   // kursor yonida
  await page.waitForTimeout(400);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/usepop_${w}${dark ? 'd' : 'l'}.png` });
  await pop.locator('[data-use=maktab]').click();
  await expect(pop).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__mr.plan().blocks[0].use)).toBe('maktab');
  // Esc — yopadi; boshqa qadamga oʻtilsa — yopiladi
  await page.mouse.click(bb.x + c.x, bb.y + c.y); await expect(page.locator('.usepop')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('.usepop')).toHaveCount(0);
  await page.mouse.click(bb.x + c.x, bb.y + c.y); await expect(page.locator('.usepop')).toBeVisible();
  await page.click('[data-step=kocha]'); await expect(page.locator('.usepop')).toHaveCount(0);
});

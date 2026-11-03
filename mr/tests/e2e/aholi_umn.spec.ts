import { test, expect, rectSite } from './fx';

/** 04.11 (audit): aholi — 1-jadval taʼminoti tanlanadi (61-band ≥ 16); UMN — 66-band, turar joy uchastkasi boʻyicha */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`aholi taʼminoti va UMN · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await rectSite(page, 160, 140);
  await page.click('[data-step=hajm]');
  const box = (await page.locator('#scene canvas').boundingBox())!, cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.click('#drawBld'); await page.mouse.click(cx - 40, cy - 30); await page.mouse.click(cx + 40, cy + 30); await page.click('#drawBld');
  await expect(page.locator('#kPop b')).not.toHaveText('—');
  await expect(page.locator('#kUmn b')).not.toHaveText('—');
  const num = async () => Number((await page.locator('#kPop b').textContent())!.replace(/\D/g, ''));
  const p28 = await num();
  await page.click('#kMore');
  const seg = page.locator('#popSeg');
  await expect(seg.locator('[data-m2="28"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-rule=umn-66]')).toHaveCount(1);
  await expect(page.locator('[data-rule=pop-61]')).toHaveCount(1);
  await page.waitForTimeout(300);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/aholi_${w}${dark ? 'd' : 'l'}.png` });
  await seg.locator('[data-m2="40"]').click();
  await expect(page.locator('#popSeg [data-m2="40"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(num).toBeLessThan(p28);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.m2PerPerson)).toBe(40);
});

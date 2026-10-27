import { test, expect } from './fx';
import { readFileSync } from 'node:fs';

/** Bepul yuklash — setkasimon belgi; egasi rejimi — belgisiz */
test('yuklab olingan SVG da belgi bor, egasi rejimida — yoʻq', async ({ page }) => {
  await page.goto('./kochasoz.html#/varaq');
  await page.evaluate(() => { sessionStorage.setItem('wm-test', '1'); localStorage.removeItem('kps_owner'); });
  await page.reload();
  const btn = page.locator('.ws-varaq button', { hasText: /^SVG$/ });
  await expect(btn).toBeVisible({ timeout: 20_000 });
  let dl = page.waitForEvent('download'); await btn.click();
  await page.click('#kdWm');   // «Belgi bilan — bepul»
  const free = readFileSync((await (await dl).path())!, 'utf8');
  expect(free).toContain('id="99_Archemistry_belgi"');
  expect(free).toContain('ARCHEMISTRY · BEPUL');
  // notoʻgʻri kalit — egasi yoqilmaydi; ?egasi=off — oʻchiradi
  await page.goto('./kochasoz.html?egasi=notogri#/varaq'); await page.waitForTimeout(500);
  expect(await page.evaluate(() => localStorage.getItem('kps_owner'))).toBeNull();
  expect(page.url()).not.toContain('egasi=');
  await page.evaluate(() => localStorage.setItem('kps_owner', '1'));
  await page.reload(); await expect(btn).toBeVisible({ timeout: 20_000 });
  dl = page.waitForEvent('download'); await btn.click();
  const own = readFileSync((await (await dl).path())!, 'utf8');
  expect(own).not.toContain('99_Archemistry_belgi');
  await page.goto('./kochasoz.html?egasi=off#/varaq'); await page.waitForTimeout(500);
  expect(await page.evaluate(() => localStorage.getItem('kps_owner'))).toBeNull();
});

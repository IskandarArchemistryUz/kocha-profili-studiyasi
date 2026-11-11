import { test, expect } from './fx';
import { readFileSync } from 'node:fs';

/** Bepul yuklash — setkasimon belgi; egasi rejimi — belgisiz. E1 (11.11): bepul — faqat rasm (PNG / rasm PDF, uzun tomoni 1600 px) */
const pngSize = (b: Buffer): [number, number] => [b.readUInt32BE(16), b.readUInt32BE(20)];
test('bepul SVG — belgili PNG 1600 px (vektor yoʻq), egasi rejimida — toza SVG', async ({ page }) => {
  await page.goto('./kochasoz.html#/varaq');
  await page.evaluate(() => { sessionStorage.setItem('wm-test', '1'); localStorage.removeItem('kps_owner'); });
  await page.reload();
  const btn = page.locator('.ws-varaq button', { hasText: /^SVG$/ });
  await expect(btn).toBeVisible({ timeout: 20_000 });
  let dl = page.waitForEvent('download'); await btn.click();
  await page.click('#kdWm');   // «Belgi bilan — bepul»
  const d0 = await dl; expect(d0.suggestedFilename()).toMatch(/\.png$/);
  const free = readFileSync((await d0.path())!);
  expect(free.subarray(1, 4).toString()).toBe('PNG');
  expect(Math.max(...pngSize(free))).toBe(1600);
  expect(free.toString('latin1')).not.toMatch(/<svg|<text|99_Archemistry_belgi/);
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

test('bepul PDF — rasm sahifa, matn va belgi qatlami yoʻq', async ({ page }) => {
  await page.goto('./kochasoz.html#/varaq');
  await page.evaluate(() => { sessionStorage.setItem('wm-test', '1'); localStorage.removeItem('kps_owner'); });
  await page.reload();
  const btn = page.locator('.ws-varaq button', { hasText: /^PDF$/ });
  await expect(btn).toBeVisible({ timeout: 20_000 });
  const dl = page.waitForEvent('download'); await btn.click(); await page.click('#kdWm');
  const d = await dl; expect(d.suggestedFilename()).toMatch(/\.pdf$/);
  const pdf = readFileSync((await d.path())!).toString('latin1');
  expect(pdf).toContain('/Subtype /Image');
  expect(pdf).not.toMatch(/ARCHEMISTRY|DejaVu|\bTj\b|\bTJ\b/);
  await page.evaluate(() => localStorage.setItem('kps_owner', '1'));
});

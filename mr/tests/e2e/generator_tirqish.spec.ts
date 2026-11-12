import { test, expect } from './fx';
// @ts-ignore
import * as fs from 'node:fs';

/* 12.11 (G1): OSM dan aniqlangan daha chegarasida servis yoʻllaridan qolgan tor tirqishlar bor edi — «Hammasi» 0 bino berardi
   (Olmazor — qabriston SMZ; Yunusobod — SMZ obyektlari va sanoat). Tirqishlar generatsiya uchun yopiladi. */
const CASES = [['olmazor', 1440, false], ['yunusobod', 1024, true]] as const;
for (const [nm, w, dark] of CASES) test(`generator: tirqishli daha · ${nm} · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.setInputFiles('#file', { name: `${nm}.json`, mimeType: 'application/json', buffer: fs.readFileSync(`tests/fixtures/g1-${nm}.json`) });
  await expect(page).toHaveURL(/#\/p\/p_/);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=hajm]');
  await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr?.store?.doc?.buildings?.length ?? 0), { timeout: 20000 }).toBeGreaterThan(0);
  const panel = page.locator('.panel');
  await expect(panel).toContainText('tor tirqish');
  await expect(panel).not.toContainText('Bino sigʻmadi');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/tirqish_${nm}_${w}${dark ? 'd' : 'l'}.png` }); }
});

import { test, expect } from './fx';
// @ts-ignore
import * as fs from 'node:fs';

/* 12.11 (egasi): turar joy dahasining SMZ ichidagi qismi — 5-qadamda ruxsat etilgan funksiyaga ajratish (SanQvaN 0103-25, 12–14-bandlar) */
const CASES = [['olmazor', 'avtoturargoh', 1440, false], ['yunusobod', 'himoya', 1024, true]] as const;
for (const [nm, use, w, dark] of CASES) test(`SMZ qismi → ${use} · ${nm} · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./');
  await page.setInputFiles('#file', { name: `${nm}.json`, mimeType: 'application/json', buffer: fs.readFileSync(`tests/fixtures/g1-${nm}.json`) });
  await expect(page).toHaveURL(/#\/p\/p_/);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=hajm]');
  const card = page.locator('#smzCard');
  await expect(card).toBeVisible();
  await expect(card).toContainText('SanQvaN 0103-25, 12-band');
  if (process.env.GX_SHOTS) { await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.GX_SHOTS}/smz_karta_${w}${dark ? 'd' : 'l'}.png` }); }
  await card.locator(`[data-smzuse=${use}]`).click();
  await expect.poll(() => page.evaluate((u) => ((window as any).__mr.store.doc.parcels as { use: string }[]).filter(p => p.use === u).length, use)).toBeGreaterThan(0);
  await expect(page.locator('#smzCard')).toHaveCount(0);                     // ajratilgandan keyin turar joy SMZ da qolmaydi
  await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr?.store?.doc?.buildings?.length ?? 0), { timeout: 20000 }).toBeGreaterThan(0);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(800); await page.screenshot({ path: `${process.env.GX_SHOTS}/smz_${use}_${w}${dark ? 'd' : 'l'}.png` }); }
});

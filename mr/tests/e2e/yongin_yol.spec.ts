import { test, expect } from './fx';
import { fileURLToPath } from 'node:url';

/** 11.11 (L5, video yozishda): namunada 10-qadamda yongʻin-qutqaruv texnikasi yoʻli qatori yoʻq edi — endi 28 m dan past binolar uchun ham */
const SAMPLE = fileURLToPath(new URL('../../../data/namuna-mahalla.archemistry.json', import.meta.url));
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`10-qadam: yongʻin-qutqaruv texnikasi yoʻli · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.route('**/data/namuna-mahalla.archemistry.json', r => r.fulfill({ path: SAMPLE, contentType: 'application/json' }));
  await page.goto('./#/namuna'); await page.waitForURL(/#\/p\//);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=tekshiruv]');
  const row = page.locator('[data-rule="fire-666-low"]').first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row).toContainText('666, 669, 675');
  await row.locator('button.li').click();
  await expect(row.locator('.rnote')).toContainText('666-band');
  if (await row.locator('[data-where]').count()) await row.locator('[data-where]').click();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/yongin_${w}${dark ? 'd' : 'l'}.png` }); }
});

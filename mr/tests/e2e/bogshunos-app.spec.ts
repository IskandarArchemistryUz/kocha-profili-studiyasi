import { test, expect } from '@playwright/test';

/** Bogʻshunos (app/bogshunos.html): sahifa ochiladi, qobiq (yuqori panel, qadamlar paneli) chiziladi, JS xatosi yoʻq.
 *  Tashqi tarmoq (xarita plitkalari, Overpass, Nominatim) uziladi — test faqat ilova qobigʻini tekshiradi. */
test('Bogʻshunos sahifasi xatosiz ochiladi', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(String(e.message ?? e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto('bogshunos.html');
  const root = page.locator('#bg');
  await expect(root.locator('.top')).toBeVisible({ timeout: 20_000 });
  await expect(root.locator('.panel.sp')).toBeVisible();
  await expect(page).toHaveTitle(/Bogʻshunos/);
  expect(errs, errs.join('\n')).toEqual([]);
});

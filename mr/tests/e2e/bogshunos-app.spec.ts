import { test, expect } from '@playwright/test';

/** Bogʻshunos (app/bogshunos.html): loyihasiz — avval oʻz loyihalari paneli; yangi loyiha — boʻsh sahna, qobiq xatosiz chiziladi;
 *  loyiha «Loyihalarim» da Bogʻshunos belgisi va filtri bilan chiqadi. Tashqi tarmoq uziladi — faqat ilova qobigʻi tekshiriladi. */
test('Bogʻshunos: loyihalar paneli → yangi loyiha → sahifa xatosiz; Loyihalarim da koʻrinadi', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(String(e.message ?? e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto('bogshunos.html');
  await expect(page.locator('#projWin')).toBeVisible({ timeout: 20_000 });
  await page.click('#pwNew');
  await page.waitForURL(/bogshunos\.html\?p=s_\w+/);
  const pid = new URL(page.url()).searchParams.get('p')!;
  const root = page.locator('#bg');
  await expect(root.locator('.top')).toBeVisible({ timeout: 20_000 });
  await expect(root.locator('.panel.sp')).toBeVisible();
  await expect(root.locator('#svcProj')).toBeVisible();
  await expect(page).toHaveTitle(/Bogʻshunos/);
  expect(errs, errs.join('\n')).toEqual([]);
  // Loyihalarim: Bogʻshunos belgili karta; bosilsa — shu loyiha ochiladi
  await page.goto('./#/');
  await expect(page.locator(`#cards [data-sid="${pid}"] .svcbadge`)).toContainText(/Bogʻshunos|Landscape Designer/, { timeout: 20_000 });
  await page.click(`#cards [data-sid="${pid}"]`);
  await page.waitForURL(new RegExp(`bogshunos\\.html\\?p=${pid}`));
});

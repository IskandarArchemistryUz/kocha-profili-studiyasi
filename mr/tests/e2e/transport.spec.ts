import { test, expect } from './fx';

/** Transport modellari (26.10): roʻyxat, 3D koʻrik, oʻlchamlar, uchburchaklar ≤ 3000, GLB yuklab olish; 1024 px va tungi rejim */
test('Transport: 7 model, oʻlcham va uchburchaklar, GLB yuklab olinadi', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./transport.html');
  await expect(page.locator('#trInfo')).toBeVisible();
  await expect(page.locator('.tr-list [data-kind]')).toHaveCount(7);
  for (const k of ['avtobus12', 'avtobus18', 'trolleybus', 'tramvay', 'sedan', 'yuk', 'ot']) {
    await page.click(`.tr-list [data-kind="${k}"]`);
    await expect(page.locator(`.tr-list [data-kind="${k}"]`)).toHaveAttribute('aria-pressed', 'true');
    const n = Number((await page.locator('#trTri').textContent())!.replace(/\D/g, ''));
    expect(n).toBeGreaterThan(300); expect(n).toBeLessThanOrEqual(3000);
  }
  await page.click('.tr-list [data-kind="avtobus12"]');
  await expect(page.locator('#trInfo')).toContainText('12 × 2,55 × 3,15 m');
  await expect(page.locator('#trInfo')).toContainText('7,6 / 2,4 m');
  const dl = page.waitForEvent('download');
  await page.click('#trGlb');
  const d = await dl;
  expect(d.suggestedFilename()).toBe('archemistry_avtobus12.glb');
  const buf = await (await import('node:fs/promises')).readFile((await d.path())!);
  expect(buf.subarray(0, 4).toString()).toBe('glTF');
});

test('Transport: tungi rejim va ruscha matn', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.addInitScript(() => { localStorage.setItem('mr-theme', 'dark'); localStorage.setItem('mr-lang', 'ru'); });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./transport.html#/tramvay');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.tr-top')).toContainText('Модели транспорта');
  await expect(page.locator('#trInfo')).toContainText('Трамвай (3 секции)');
  await expect(page.locator('#trGlb')).toContainText('Скачать GLB');
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.tr-list')!).backgroundColor);
  expect(bg).not.toBe('rgb(255, 255, 255)');
});

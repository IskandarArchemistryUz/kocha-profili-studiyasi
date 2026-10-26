import { test, expect } from './fx';

/** Koʻchasoz B · Aksonometriya 3D (26.10): kanvas, zona yorliqlari, tarmoq harflari, «Yer osti» almashtirgich, maket uslubi, PNG eksport; boshqa koʻrinishda olib tashlanadi */
test('B: aksonometriya — 3D sahna, yorliqlar, yer osti qatlami, PNG', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta#/b');   // aksonometriya hozircha beta
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 2, axoQ: false, gfx: 0, U: [{ k: 'W', x: 4, d: 2.5 }, { k: 'G', x: 30.5, d: 1.2 }] }));
  const ax = page.locator('[data-axo3d]');
  await expect(ax.locator('canvas')).toBeVisible();
  await expect(ax.locator('.zl').first()).toBeVisible();
  expect(await ax.locator('.zl').count()).toBeGreaterThan(5);
  await expect(ax.locator('.ul')).toHaveCount(2);
  await expect(ax.locator('.cap')).toContainText('Aksonometriya · 40 m uchastka');
  await expect(ax.locator('.cap')).toContainText('Yer osti tarmoqlari old kesimda');
  // kanvas boʻsh emas (bir xil rang emas)
  const varied = await page.evaluate(() => { const c = document.querySelector('[data-axo3d] canvas') as HTMLCanvasElement, g = document.createElement('canvas'); g.width = 40; g.height = 40; const x = g.getContext('2d')!; x.drawImage(c, 0, 0, 40, 40); const d = x.getImageData(0, 0, 40, 40).data, s = new Set<number>(); for (let i = 0; i < d.length; i += 4) s.add(d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4); return s.size; });
  expect(varied).toBeGreaterThan(8);
  // yer osti qatlami
  const qb = ax.locator('[data-axoq]');
  await expect(qb).toHaveAttribute('aria-pressed', 'false');
  await qb.click();
  await expect(qb).toHaveAttribute('aria-pressed', 'true');
  await expect(ax.locator('.cap')).toContainText('Yer osti qatlami ajratib koʻrsatilgan');
  expect(await page.evaluate(() => (window as any).__ks.m.inst.state.axoQ)).toBe(true);
  // maket uslubi
  await page.locator('.ws-b .seg button', { hasText: 'Maket' }).click();
  expect(await page.evaluate(() => (window as any).__ks.m.inst.state.gfx)).toBe(1);
  // PNG eksport
  await page.locator('[data-ksexp]').click();
  const dl = page.waitForEvent('download');
  await page.locator('.ks-menu button', { hasText: 'PNG 2×' }).click();
  const d = await dl;
  expect(d.suggestedFilename()).toMatch(/\.png$/);
  const buf = await (await import('node:fs/promises')).readFile((await d.path())!);
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  expect(buf.length).toBeGreaterThan(50_000);
  // boshqa koʻrinish — 3D olib tashlanadi
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 0 }));
  await expect(ax).toHaveCount(0);
});

test('B: aksonometriya — tungi rejim va ruscha yorliqlar', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.addInitScript(() => { localStorage.setItem('mr-theme', 'dark'); localStorage.setItem('mr-lang', 'ru'); });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta#/b');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 2 }));
  const ax = page.locator('[data-axo3d]');
  await expect(ax.locator('.cap')).toContainText('Аксонометрия');
  await expect(ax.locator('[data-axoq]')).toContainText('Отделить подземный слой');
});

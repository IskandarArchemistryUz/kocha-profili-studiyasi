import { test, expect } from './fx';

/** Koʻchasoz B · Aksonometriya (26.10): kesim/reja uslubidagi SVG illyustratsiya; mashina, avtobus, tramvay — oʻzimizning modellar (vehSvg), yassi tusda; 3D qatlam yoʻq */
const pathCount = (page: import('@playwright/test').Page) => page.evaluate(() => document.querySelectorAll('.ws-b svg[role=img] path[data-ly=KS_TRANSPORT]').length);
const tpl = (page: import('@playwright/test').Page, t: string, view = 2, gfx = 0) => page.evaluate(([t2, v, g]) => { const I = (window as any).__ks.m.inst, T = I.state.TPL.find((x: any) => x[0] === t2); I.setState({ els: T[2], rl: T[2].reduce((a: number, e: any) => a + e[1], 0), tplName: t2, view: v, gfx: g }); }, [t, view, gfx] as const);

test('B: aksonometriya — SVG uslub, transport modellari, eksport', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.locator('.ws-b main .seg button', { hasText: 'Aksonometriya' }).click();
  await tpl(page, 'Avtobus koridori');
  // modellar yuklanib, SVG ga tushadi (uchburchak guruhlari — yuzlab path)
  await expect.poll(() => pathCount(page), { timeout: 15000 }).toBeGreaterThan(40);
  await expect(page.locator('[data-axo3d]')).toHaveCount(0);
  await expect(page.locator('.ws-b svg[role=img]')).toContainText('Aksonometriya');
  // tramvayli kesim
  await tpl(page, 'Magistral · tramvayli');
  await expect.poll(() => pathCount(page)).toBeGreaterThan(40);
  // «Chizma» (chiziqli) uslub ham ishlaydi
  await tpl(page, 'Tuman koʻchasi', 2, 1);
  await expect.poll(() => pathCount(page)).toBeGreaterThan(20);
  // eksport: SVG — vektor
  await page.locator('[data-ksexp]').click();
  const dl = page.waitForEvent('download');
  await page.locator('.ks-menu button', { hasText: 'SVG' }).click();
  const d = await dl;
  const txt = await (await import('node:fs/promises')).readFile((await d.path())!, 'utf8');
  expect(txt).toContain('<path'); expect(txt).not.toContain('<image');
});

test('B: aksonometriya — tungi rejim va ruscha', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.addInitScript(() => { localStorage.setItem('mr-theme', 'dark'); localStorage.setItem('mr-lang', 'ru'); });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 2 }));
  await expect.poll(() => pathCount(page), { timeout: 15000 }).toBeGreaterThan(20);
  await expect(page.locator('.ws-b main .seg button[aria-pressed=true]', { hasText: 'Аксонометрия' })).toBeVisible();
});

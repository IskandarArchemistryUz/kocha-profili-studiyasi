import { test, expect } from './fx';

/** Koʻchasoz B (26.10): yoʻl strelkasi (yoʻnalish, manyovr), zona surilganda joylashtirilgan elementlar birga koʻchadi, aksonometriyada oʻng bino shaffof */
const st = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__ks.m.inst.state);

test('B: strelka va joylashtirilgan elementlar zona bilan', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => { const I = (window as any).__ks.m.inst, T = I.state.TPL.find((x: any) => x[0] === 'Tuman koʻchasi'); I.setState({ els: T[2], rl: 35.2, tplName: T[0], view: 1, sel: 5, selU: -1, PL: T[5] }); });
  const before = (await st(page)).PL.find((p: any) => p.t === 'shpalera').z;   // ajratuvchi (6)
  expect(before).toBe(6);
  await page.getByRole('button', { name: 'Oʻngga →' }).click();
  const s1 = await st(page);
  expect(s1.sel).toBe(6); expect(s1.els[5][0]).toBe('med');
  expect(s1.PL.find((p: any) => p.t === 'shpalera').z).toBe(5);   // ajratuvchi bilan birga
  // strelka: yoʻnalish va manyovr
  await expect(page.locator('[data-man] button')).toHaveCount(6);
  await page.getByRole('button', { name: 'Toʻgʻri + oʻngga' }).click();
  await page.getByRole('button', { name: '↑ Yuqoriga' }).click();
  const s2 = await st(page); expect(s2.els[6][2].man).toBe('togri_ong'); expect(s2.els[6][2].yon).toBe('up');
  // zona nusxasi va oʻchirish — elementlar indeksi mos
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ sel: 2 }));
  await page.getByRole('button', { name: 'Nusxa' }).click();
  expect((await st(page)).PL.find((p: any) => p.t === 'shpalera').z).toBe(6);
  // piyoda zonasida strelka bloki yoʻq
  await expect(page.locator('[data-man]')).toHaveCount(0);
});

test('B: aksonometriyada oʻng bino shaffof (punktir), tungi rejim', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.addInitScript(() => localStorage.setItem('mr-theme', 'dark'));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 2 }));
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('.ws-b svg[role=img] path')).filter(p => (p.getAttribute('stroke-dasharray') || '').trim() === '4 3').length)).toBeGreaterThanOrEqual(12);
});

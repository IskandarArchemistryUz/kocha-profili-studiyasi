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

test('B: aksonometriya — mashinalar oʻtish joyiga chiqmaydi', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => { const I = (window as any).__ks.m.inst, T = I.state.TPL.find((x: any) => x[0] === 'Tuman koʻchasi'); I.setState({ els: T[2], rl: 35.2, view: 2 }); });
  // har bir mashina/avtobus boʻylama oraligʻi (data-bk = tur@boshi-oxiri) oʻtish joyi (2,5–6,5 m) bilan kesishmaydi
  const q = () => page.evaluate(() => Array.from(new Set(Array.from(document.querySelectorAll('.ws-b svg[role=img] path[data-ly=KS_TRANSPORT]')).map(p => p.getAttribute('data-bk') || ''))).filter(Boolean));
  await expect.poll(async () => (await q()).length).toBeGreaterThan(2);
  const iv = await q();
  for (const b of iv) { const [a, z] = b.split('@')[1].split('-').map(Number); expect(z <= 2.5 || a >= 6.5, b).toBe(true); }
});

test('B: aksonometriya — rejadagi elementlar (parklet, taksi, yuk…) chiziladi', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => { const I = (window as any).__ks.m.inst, T = I.state.TPL.find((x: any) => x[0] === 'Tuman koʻchasi'); I.setState({ els: T[2], rl: 35.2, view: 2, PL: T[5] }); });
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: 'TAKSI' })).toHaveCount(1);
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: 'YUK' })).toHaveCount(1);
  // elementsiz — yozuvlar yoʻq
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ PL: [] }));
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: 'TAKSI' })).toHaveCount(0);
});

test('B: aksonometriya — chap/oʻng chet turi (bogʻ, suv, qiyalik, ochiq) chiziladi', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 2, eL: 'bino', eR: 'bino' }));
  const dashed = () => page.evaluate(() => Array.from(document.querySelectorAll('.ws-b svg[role=img] path')).filter(p => (p.getAttribute('stroke-dasharray') || '').trim() === '4 3').length);
  await expect.poll(dashed).toBeGreaterThanOrEqual(12);   // shaffof oʻng bino
  await page.locator('.ws-b aside.panel').first().getByRole('button', { name: 'Suv' }).first().click();
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: 'Daryo / kanal' })).toHaveCount(1);
  await page.locator('.ws-b aside.panel').first().getByRole('button', { name: 'Qiyalik' }).last().click();
  await expect(page.locator('.ws-b svg[role=img] text', { hasText: 'Qiyalik 1:3' })).toHaveCount(1);
  await expect.poll(dashed).toBeLessThan(12);   // oʻngda bino yoʻq — shaffof qobiq ham yoʻq
  const st = await page.evaluate(() => (window as any).__ks.m.inst.state);
  expect([st.eL, st.eR]).toEqual(['suv', 'qiyalik']);
});

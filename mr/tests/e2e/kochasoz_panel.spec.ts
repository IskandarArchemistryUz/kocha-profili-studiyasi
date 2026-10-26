import { test, expect } from './fx';

/** Koʻchasoz B (26.10): chekka panellarni yashirish, raqamni bosib qiymat kiritish, chizmani yaqinlashtirish / surish */
const st = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__ks.m.inst.state);

test('B: panellar yashiriladi, chizma kengayadi', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  const ws = page.locator('.ws-b'); await expect(ws).toBeVisible();
  const w0 = (await page.locator('.ws-b main').boundingBox())!.width;
  await page.click('[data-ptog=l]');
  await expect(ws).toHaveClass(/pl-off/);
  await expect(page.locator('.ws-b aside.panel').first()).toBeHidden();
  await page.click('[data-ptog=r]');
  await expect(ws).toHaveClass(/pr-off/);
  await expect(page.locator('[data-ptog=r]')).toHaveAttribute('aria-label', 'Oʻng panelni ochish');
  const w1 = (await page.locator('.ws-b main').boundingBox())!.width;
  expect(w1).toBeGreaterThan(w0 + 400);
  // klaviatura: [ — chap panel qaytadi
  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('[');
  await expect(ws).not.toHaveClass(/pl-off/);
  expect((await st(page)).pR).toBe(true);
});

test('B: raqamni bosib, eni va qizil chiziqlar orasini kiritish', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.locator('.ks-strip .blk[data-ei="1"] .w').click();
  const ed = page.locator('.ks-numed'); await expect(ed).toBeVisible();
  await ed.fill('4,2'); await ed.press('Enter');
  await expect(ed).toHaveCount(0);
  const s1 = await st(page); expect(s1.els[1][1]).toBe(4.2); expect(s1.sel).toBe(1);
  // tanlangan zona «Eni» qiymati
  await page.locator('[data-ed=zw]').click();
  await ed.fill('3'); await ed.press('Enter');
  expect((await st(page)).els[1][1]).toBe(3);
  // Esc — oʻzgarmaydi
  await page.locator('[data-ed=zw]').click(); await ed.fill('9'); await ed.press('Escape');
  expect((await st(page)).els[1][1]).toBe(3);
  // qizil chiziqlar orasi
  await page.locator('[data-ed=rl]').click(); await ed.fill('40'); await ed.press('Enter');
  expect((await st(page)).rl).toBe(40);
  await expect(page.locator('[data-ed=rl]')).toContainText('40 m');
});

test('B: yaqinlashtirish — tugmalar, gʻildirak, surish, sigʻdirish; tungi rejim', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.addInitScript(() => localStorage.setItem('mr-theme', 'dark'));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.ws-b')).toBeVisible();
  const svg = page.locator('.ws-b main > .card svg[role=img]').first(), pct = page.locator('[data-zm=fit]');
  await expect(pct).toHaveText('100%');
  await page.click('[data-zm=in]');
  await expect(pct).toHaveText('125%');
  expect(await svg.getAttribute('style')).toContain('scale(1.25');
  const box = (await page.locator('.ws-b main > .card').first().boundingBox())!;
  await page.mouse.move(box.x + 200, box.y + 200);
  await page.mouse.wheel(0, -400);
  await expect.poll(async () => (await st(page)).zm?.z ?? 1).toBeGreaterThan(1.3);
  const x0 = (await st(page)).zm.x;
  // surish (boʻsh joydan)
  await page.mouse.move(box.x + 40, box.y + 120); await page.mouse.down(); await page.mouse.move(box.x + 140, box.y + 160, { steps: 5 }); await page.mouse.up();
  await expect.poll(async () => (await st(page)).zm.x).not.toBe(x0);
  await page.click('[data-zm=fit]');
  await expect(pct).toHaveText('100%');
  expect((await st(page)).zm).toBeNull();
  // klaviatura
  await page.keyboard.press('+'); await expect.poll(async () => (await st(page)).zm?.z ?? 1).toBeGreaterThan(1.2);
  await page.keyboard.press('0'); await expect.poll(async () => (await st(page)).zm).toBeNull();
});

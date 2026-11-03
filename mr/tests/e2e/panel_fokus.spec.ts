import { test, expect } from './fx';

/** 03.11 (audit): panel qayta chizilganda (hisob tugadi) yozilayotgan maydon fokusi saqlanadi — uchastka eni yoʻqolmaydi */
test('panel qayta chizilganda kiritish yoʻqolmaydi', async ({ page }) => {
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]');
  const rw = page.locator('#rw');
  await rw.click(); await rw.press('Control+a');
  await page.keyboard.type('16');
  await page.evaluate(() => (window as any).__mr.renderPanel());   // hisob workerdan qaytgandagi qayta chizish
  await page.keyboard.type('0');
  await expect(page.locator('#rw')).toHaveValue('160');
  await page.fill('#rh', '140'); await page.click('#rectSite');
  await expect.poll(() => page.evaluate(() => { const r = (window as any).__mr.store.doc.site?.rings[0]; if (!r) return 0; const xs = r.map((p: number[]) => p[0]); return Math.round((Math.max(...xs) - Math.min(...xs)) * 111320 * Math.cos(r[0][1] * Math.PI / 180)); })).toBe(160);
});

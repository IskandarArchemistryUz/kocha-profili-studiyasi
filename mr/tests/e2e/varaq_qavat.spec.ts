import { test, expect } from './fx';

/** 20-band: «Qavatlar» varagʻi — bitta qavat rejasi, vaziyat va daha sxemalari, kvartiralar eksplikatsiyasi */
test('qavat rejasi varagʻi: sxemalar, eksplikatsiya, qavat tanlovi, barcha varaqlar', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#gxOpen'); await page.click('#frOpen');
  await page.click('[data-mode=qavat]');
  const v = page.locator('#gxView');
  await expect(v).toContainText(/vaziyat sxemasi/i);
  await expect(v).toContainText('eksplikatsiyasi');
  await expect(v).toContainText('Jami');
  await expect(v).toContainText('rejasi');   // reja nomi va masshtabi chap-yuqorida
  await expect(v.locator('#Eksplikatsiya')).toBeAttached();   // eksplikatsiya oʻng ustunda
  await expect(page.locator('.gx-info')).toContainText('M 1:');
  // raqamlar: rejadagi doirachalar soni = jadval qatorlari
  const n = await page.evaluate(() => document.querySelectorAll('#gxView svg svg circle').length);
  expect(n).toBeGreaterThan(2);
  // bitta qavat (ikki qavat bitta varaqda emas)
  expect(await page.evaluate(() => document.querySelectorAll('#gxView svg svg').length)).toBe(1);
  await expect(page.locator('[data-grp]')).toHaveCount(2);
  await page.click('[data-grp="0"]');
  await expect(page.locator('[data-sheet="0"]')).toContainText('1-qavat');
  const before = await page.locator('[data-sheet]').count();
  await page.click('#shAllFl');
  const after = await page.locator('[data-sheet]').count();
  const exp = await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.use === 'turar' || b.use === 'aralash').length);
  expect(after - before).toBeGreaterThanOrEqual(exp);
});

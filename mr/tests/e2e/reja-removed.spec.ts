import { test, expect } from './fx';

// 02.11 (egasi: «binoni oʻchirsam, boʻlimdan boʻlimga oʻtganda yana qaytib chiqyapti»): olib tashlangan atrof binosi
// qadam almashganda, atrof boshqa manbadan (boshqa id bilan) qayta yuklanganda va sahifa yangilanganda qaytib chiqmaydi
test('olib tashlangan atrof binolari qaytib chiqmaydi', async ({ page, context }) => {
  const O = [69.2797, 41.3111], kx = 111_320 * Math.cos(O[1] * Math.PI / 180), ky = 111_132;
  const ll = (x: number, y: number) => ({ lon: O[0] + x / kx, lat: O[1] + y / ky });
  let base = 1, sh = 0;
  const els = () => { const el: unknown[] = []; let id = base; for (const bx of [-150, 0, 150]) for (const by of [-150, 0, 150]) if (bx || by) el.push({ type: 'way', id: id++, tags: { building: 'yes' }, geometry: [ll(bx - 6 + sh, by - 6), ll(bx + 6 + sh, by - 6), ll(bx + 6 + sh, by + 6), ll(bx - 6 + sh, by + 6), ll(bx - 6 + sh, by - 6)] }); return el; };
  await context.route(/interpreter/, r => r.fulfill({ json: { elements: els() } }));
  await context.route(/elevation-tiles|arcgisonline/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('#ctxLoad');
  await expect(page.locator('#ctxSt')).toContainText('8 bino', { timeout: 15000 });
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '400'); await page.fill('#rh', '400'); await page.click('#rectSite');
  await page.click('[data-step=parsel]');
  await expect(page.locator('#demo')).toContainText('buziladi 8');
  // ikki binoni olib tashlash (sahnada tanlab Delete bilan bir xil yoʻl)
  await page.evaluate(() => { const ed = (window as any).__mr; ed.setMarked([], [1, 2]); ed.deleteMarked(); });
  await expect(page.locator('#demo')).toContainText('buziladi 6');
  // qadamlar orasida yurish
  for (const s of ['uchastka', 'hajm', 'kvartira', 'parsel']) await page.click(`[data-step=${s}]`);
  await expect(page.locator('#demo')).toContainText('buziladi 6');
  // boshqa manba: id'lar boshqa, kontur 1,5 m siljigan
  base = 5000; sh = 1.5;
  await page.click('[data-step=uchastka]');
  await page.getByRole('button', { name: 'OSM dan yangilash' }).click();
  await expect(page.locator('#ctxSt')).toContainText('bino', { timeout: 15000 });
  await page.click('[data-step=parsel]');
  await expect(page.locator('#demo')).toContainText('buziladi 6', { timeout: 10000 });
  expect(await page.evaluate(() => (window as any).__mr.store.doc.removed.slice().sort((a: number, b: number) => a - b))).toEqual([5000, 5001]);
  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 5000 });
  await page.reload();
  await page.click('[data-step=parsel]');
  await expect(page.locator('#demo')).toContainText('buziladi 6', { timeout: 15000 });
});

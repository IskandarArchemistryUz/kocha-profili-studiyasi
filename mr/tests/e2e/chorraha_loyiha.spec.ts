import { test, expect } from './fx';

/**
 * 25.11 (egasi: «chorrahada master reja chorrahasi ochilmadi»): Master reja loyihasi ichidan Koʻchasoz C (Chorraha) —
 * loyiha koʻchalari oʻzaro kesishgan chorraha OSM soʻrovisiz ochiladi; bir nechta boʻlsa «Keyingi chorraha» bilan almashadi.
 */
test('Koʻchasoz C: loyiha ichidagi chorraha (koʻchalar toʻri) — darhol, OSM siz', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  // OSM serverlari javob bermaydi — ichki chorraha baribir ochiladi
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|fonts\.g/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP').then(() => page.click('#newP-mr')); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  const pid = page.url().split('#/p/')[1].split('/')[0];
  // loyiha saqlanishini kutamiz (koʻchalari bilan)
  await expect.poll(() => page.evaluate(async id => {
    const db: IDBDatabase = await new Promise((ok, no) => { const r = indexedDB.open('archemistry-mr'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const names = [...db.objectStoreNames];
    for (const s of names) { const v: any = await new Promise(ok => { const q = db.transaction(s).objectStore(s).get(id); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); }); const d = v?.doc ?? v; if (d?.streets?.length) return d.streets.length as number; }
    return 0;
  }, pid), { timeout: 20_000 }).toBeGreaterThan(1);

  await page.goto(`./kochasoz.html?p=${pid}#/c`);
  await page.waitForFunction(() => (window as any).__ks?.id === 'c');
  await expect(page.locator('#ksProjMsg')).toContainText('Loyiha ichidagi chorraha', { timeout: 15_000 });
  await expect(page.locator('#ksProjGo')).toHaveText('Qayta olish');
  await expect(page.locator('#ksNodeMsg')).toContainText('ta tarmoq');
  // toʻrda bir nechta chorraha: keyingisiga oʻtiladi, sanagich oʻzgaradi
  const next = page.locator('#ksProjNext');
  await expect(next).toBeVisible();
  await expect(next).toContainText('1 /');
  await next.click();
  await expect(next).toContainText('2 /');
  await expect(page.locator('#ksProjMsg')).toContainText('Loyiha ichidagi chorraha');
  expect(errs).toEqual([]);
});

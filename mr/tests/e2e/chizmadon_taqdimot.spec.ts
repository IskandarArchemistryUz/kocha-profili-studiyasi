import { test, expect } from './fx';

/**
 * L8b (11.11, video yozishda; egasi tasdiqladi): «Taqdimot: investor va hokimiyat» shabloni loyihaning barcha materiallarini (har binoning
 * qavat rejasi va eksplikatsiyasi) joylashga urinib «Joy topilmadi» ogohlantirishi va boʻsh koʻrinadigan varaqlar berardi.
 * Endi taqdimotda sukut boʻyicha bitta kvartirografiya; qolgan binolar oʻchiq, chap roʻyxatda bir bosishda yoqiladi.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`Chizmadon: taqdimot shablonida asosiy materiallar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(200_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.fill('#rw', '300'); await page.fill('#rh', '200'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 60_000 }).toBeGreaterThan(3);
  await page.click('[data-step=kvartira]'); await expect(page.locator('#aptPlan')).toContainText('xonadon', { timeout: 30_000 });
  await page.click('#chOpen');
  await expect(page.locator('.ch-start .ch-stbox')).toBeVisible();
  await page.click('#chStFams [data-fam=tq]'); await page.click('#chStGo');
  await expect(page.locator('#chPages .ch-pg').first()).toBeVisible();
  // ogohlantirish yoʻq; binolar guruhlaridan bittasi yoqiq, qolganlari oʻchiq
  await expect(page.locator('.ch-banner')).toBeHidden();
  const grp = page.locator('#chMats .ch-grp');
  expect(await grp.count()).toBeGreaterThan(1);
  await expect(page.locator('#chMats .ch-grp:not(.off)')).toHaveCount(1);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_taqdimot_${w}${dark ? 'd' : 'l'}.png` });
  // bir bosishda yoqiladi
  const off = page.locator('#chMats .ch-grp.off').first(), g = await off.getAttribute('data-grp');
  await off.locator('[data-vis^="grp:"]').click();
  await expect(page.locator(`#chMats .ch-grp[data-grp="${g}"]`)).not.toHaveClass(/\boff\b/);
  // Albom shablonida taqdimot qoidasi qoʻllanmaydi: sukut boʻyicha yoqiq guruhlar soni koʻpayadi
  await page.click('#chFam'); await page.click('.mi[data-fam=mr]');
  expect(await page.locator('#chMats .ch-grp:not(.off)').count()).toBeGreaterThan(2);
});

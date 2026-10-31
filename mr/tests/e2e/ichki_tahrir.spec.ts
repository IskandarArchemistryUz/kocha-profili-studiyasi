import { test, expect } from './fx';

/** V2 (31.10): albomda tanlangan kvartiraning ichki rejasini qoʻlda sozlash — tomon, umumiy xona devori, master, surma eshiklar; saqlash */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`ichki rejani qoʻlda sozlash · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.click('#planEditBtn');
  // ichki rejasi bor kvartirani topish: prixojayali kvartira
  const apts = page.locator('#albPlan svg [data-apt]');
  const n = await apts.count();
  let found = false;
  for (let i = 0; i < n && !found; i++) {
    await apts.nth(i).click({ force: true });
    if (await page.locator('#albInner').count() && await page.locator('#albInFlip').isEnabled()) found = true;
    else await apts.nth(i).click({ force: true });   // tanlovni olib tashlash
  }
  expect(found).toBe(true);
  const before = await page.locator('#albPlan svg').innerHTML();
  await page.click('#albInFlip');
  await expect(page.locator('#albInner')).toBeVisible();          // tanlov saqlanadi
  expect(await page.locator('#albPlan svg').innerHTML()).not.toBe(before);
  await page.click('#albInSlide');
  await expect(page.locator('#albInSlide')).toContainText('Oddiy eshiklar');
  if (await page.locator('#albInMaster').count()) await page.click('#albInMaster [aria-pressed=false] >> nth=0');
  await page.waitForTimeout(400);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ichki_tahrir_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#albSave');
  await expect(page.locator('#albSave')).toContainText('Saqlangan');
  const inner = await page.evaluate(() => (window as any).__mr.store.doc.buildings.flatMap((b: any) => b.planEdit?.apts ?? []).filter((a: any) => a.inner).length);
  expect(inner).toBeGreaterThan(0);
});

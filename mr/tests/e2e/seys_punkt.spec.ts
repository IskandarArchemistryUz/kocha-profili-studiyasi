import { test, expect } from './fx';

/** 04.11 (egasi): seysmiklik shahar boʻyicha — QMQ 2.01.03-19, 1-ilova; aholi punkti tanlansa ball shu punktdan */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`seysmiklik aholi punktidan · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForFunction(() => !!(window as any).__mr?.store?.doc?.origin);
  await page.click('#kMore'); await page.locator('.drawer #regSet > summary').click();   // 04.11 (A): hisob shartlari — «Qoʻshimcha» ichida
  const row = page.locator('.drawer #seisPlaceRow');
  await row.scrollIntoViewIfNeeded();
  await expect(page.locator('#seisPlaceSub')).toContainText('8');          // Toshkent — 8 ball (andoza)
  await page.selectOption('#seisPlace', { label: 'Samarqand — 9' });
  await expect(page.locator('#seisBall [data-ball="9"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.seismic)).toBe(9);
  await expect(page.locator('#seisPlaceSub')).toContainText('9');
  if (process.env.GX_SHOTS) { await page.locator('.drawer #seisRow').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/seyspunkt_${w}${dark ? 'd' : 'l'}.png` }); }
  // grunt boʻyicha qoʻlda +1 — farq izohda koʻrinadi
  await page.click('#seisBall [data-ball="10"]');
  await expect(page.locator('#seisPlaceSub')).toContainText('1.1');
});

import { test, expect } from './fx';

/** 05.11 (egasi hujjati «Konstruktiv oʻqlar»): albomda «Oʻqlar» boʻlimi (tizim, boʻlmalar, qadamlar, T1–T7), «Oʻlchamlar» koʻrinishida oʻqlar va oʻlcham zanjiri haqiqiy toʻrdan; tizim almashtirilsa toʻr qayta hisoblanadi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`konstruktiv oʻqlar · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.click('#planEditBtn');
  await expect(page.locator('#albAxes')).toBeVisible();
  await expect(page.locator('#albAxSys [data-sys=monolit]')).toHaveAttribute('aria-pressed', 'true');   // sukut — devor-pilonli
  const steps = await page.locator('#albAxSteps').textContent();
  expect(steps).toMatch(/\d{4}/);                                                                           // qadamlar mm da
  // 05.11 (toʻr birinchi): kvartiralararo devorlar oʻqda (T1), oʻq derazadan oʻtmaydi (T2)
  await expect(page.locator('#albAxChk')).not.toContainText('Yuk koʻtaruvchi devorlar oʻq ustida');
  await expect(page.locator('#albAxChk')).not.toContainText('Oʻq deraza oʻrnidan oʻtmaydi');
  // «Oʻlchamlar»: oʻq doiralari (raqam va harf) chizmada
  await page.click('#albView [data-view=olcham]');
  const txt = await page.locator('#albPlan svg').first().evaluate(s => s.textContent ?? '');
  expect(txt).toContain('А'); expect(txt).toMatch(/\b1\b/);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/oqlar_${w}${dark ? 'd' : 'l'}.png` }); }
  // tizim → karkas: albom qayta ochiladi, qadamlar kattaroq (≥ 5,4 m)
  await page.click('#albAxSys [data-sys=karkas]');
  await expect(page.locator('#albAxSys [data-sys=karkas]')).toHaveAttribute('aria-pressed', 'true');
  const st2 = (await page.locator('#albAxSteps').textContent()) ?? '';
  const nums = st2.split(/[^0-9]+/).filter(Boolean).map(Number);
  expect(Math.max(...nums)).toBeGreaterThanOrEqual(5400);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.construct)).toBe('karkas');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/oqlar_karkas_${w}${dark ? 'd' : 'l'}.png` }); }
});

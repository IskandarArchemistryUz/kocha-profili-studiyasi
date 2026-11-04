import { test, expect } from './fx';

/** 04.11 (egasi): 1 xonali — studiya formati; katta master reja uchun kvartiralarsiz, mebelsiz umumiy seksiya rejasi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`studiya va umumiy seksiya rejasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.evaluate(() => { try { localStorage.removeItem('mr-plan-look'); } catch { /* */ } });
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  await page.locator('#aptMore > summary').click();   // 04.11 (A): studiya — «Qoʻshimcha» ichida
  await page.locator('#studioRow').scrollIntoViewIfNeeded();
  await expect(page.locator('#studio1')).toHaveAttribute('aria-checked', 'false');
  await page.click('#studio1');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.settings.studio1)).toBe(true);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/studiya_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#planEditBtn');
  const svg = page.locator('#albPlan svg');
  await expect(svg.locator('path[data-apt]').first()).toBeAttached();
  // umumiy reja: kvartiralar va mebel yoʻq, turar joy bitta zona
  await page.click('#albGen');
  await expect(page.locator('#albGen')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#albPlan svg path[data-apt]')).toHaveCount(0);
  await expect(page.locator('#albPlan svg [data-furn]')).toHaveCount(0);
  expect(await page.locator('#albPlan svg path[data-apt-gen]').count()).toBeGreaterThan(2);
  await expect(page.locator('#albPlan svg text', { hasText: 'turar joy' }).first()).toBeAttached();
  if (process.env.GX_SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${process.env.GX_SHOTS}/umumiy_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('#albGen');
  await expect.poll(() => page.locator('#albPlan svg path[data-apt]').count()).toBeGreaterThan(2);
});

/** 04.11 (egasi: interfeysni soddalashtirish, A): Kvartiralar — miks va reja ekranda, izoh/oʻlcham/studiya «Qoʻshimcha» ichida */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`kvartiralar paneli A · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptMore')).not.toHaveAttribute('open', '');
  await expect(page.locator('#aptMore > summary')).toContainText('Qoʻshimcha');
  for (const q of ['#aptSize', '#studio1']) { await expect(page.locator(q)).toHaveCount(1); await expect(page.locator(q)).toBeHidden(); }
  await expect(page.locator('#mixRow')).toBeVisible();
  await page.locator('#planBox').scrollIntoViewIfNeeded(); await expect(page.locator('#planBox')).toBeVisible();
  if (process.env.GX_SHOTS) { await page.locator('#mixRow').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/kv_a_${w}${dark ? 'd' : 'l'}.png` }); }
  await page.click('[data-size=L]');
  await expect(page.locator('#aptMore')).toHaveAttribute('open', '');
  await expect(page.locator('[data-size=L]')).toHaveAttribute('aria-pressed', 'true');
});

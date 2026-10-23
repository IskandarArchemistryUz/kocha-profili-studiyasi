import { test, expect } from './fx';
import path from 'node:path';

/** 19-band (3): maket varaqlarida rasmni almashtirish, shtamp/kolontitulni olib tashlash va matnlarni tahrirlash */
test('Chizmadon maket varagʻi: rasm, shtamp va matnlar tahrirlanadi', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen'); await page.click('[data-fam=kz]'); await page.click('#chStGo');
  const bg = () => page.evaluate(() => Array.from(document.querySelectorAll('.ch-page')).map(e => e.innerHTML).join(''));
  // namuna matnlari oʻrniga loyiha maʼlumoti: soxta TIK raqamlari va «000000» shifr yoʻq
  await expect.poll(async () => (await bg()).length).toBeGreaterThan(1000);
  expect(await bg()).not.toContain('Aholi 16 900');
  expect(await bg()).not.toContain('Loyiha nomi · hudud');
  // oʻng panel: hech narsa tanlanmagan — varaq matnlari
  if (!(await page.locator('#chPgTitle').isVisible())) await page.locator('.ch-strip-r [data-strip=element]').click();
  const right = page.locator('#chPgTitle');
  await right.waitFor({ state: 'attached' });
  await page.evaluate(() => { const el = document.querySelector('#chPgTitle') as HTMLElement; el.scrollIntoView(); });
  await page.fill('#chPgTitle', 'Mening sarlavham'); await page.press('#chPgTitle', 'Enter'); await page.locator('#chPgTitle').blur();
  await expect.poll(bg).toContain('Mening sarlavham');
  await page.fill('#chTxtProj', 'Oliy Himmat · Yashnobod'); await page.locator('#chTxtProj').blur();
  await expect.poll(bg).toContain('Oliy Himmat · Yashnobod');
  await page.fill('#chTxtTik', 'Maydon 16 ga'); await page.locator('#chTxtTik').blur();
  await expect.poll(bg).toContain('Maydon 16 ga');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.evaluate(() => (document.querySelector('#chHide') as HTMLElement).scrollIntoView());
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/matn-panel.png' });
  // pastki kolontitulni olib tashlash — TIK satri yoʻqoladi; qaytarish
  await page.locator('#chHide_foot').click();
  await expect.poll(bg).not.toContain('Maydon 16 ga');
  await page.locator('#chHide_foot').click();
  await expect.poll(bg).toContain('Maydon 16 ga');
  // saqlanadi: albom hujjatida
  await expect.poll(() => page.evaluate(() => JSON.stringify((window as any).__mr.store.doc.chizmadon?.auto?.txt ?? {}))).toContain('Oliy Himmat');
  // rasmni almashtirish: «Bosh reja» materiali oʻrniga oʻz rasmi
  if (!(await page.locator('[data-mat="p:plan:bosh"]').first().isVisible())) await page.locator('.ch-strip-l [data-strip=loyiha]').click();
  await page.locator('[data-mat="p:plan:bosh"]').first().click();
  if (!(await page.locator('#chMatImg').isVisible())) await page.locator('.ch-strip-r [data-strip=element]').click();
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#chMatImg').click()]);
  await fc.setFiles(path.join(process.cwd(), 'tests/e2e/fixtures/rasm.png'));
  await expect.poll(() => page.evaluate(() => String((window as any).__mr.store.doc.chizmadon?.auto?.mats?.['p:plan:bosh']?.src ?? '').slice(0, 11))).toBe('data:image/');
  // varaqqa oʻtish — katakda oʻz rasmi
  await page.locator('.ch-right .group .li', { hasText: '-varaq' }).first().click();
  await expect.poll(async () => (await bg()).includes('data:image/jpeg') || (await bg()).includes('data:image/png')).toBe(true);
  await expect(page.locator('#chMatImgReset')).toBeVisible();
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/matn-rasm.png' });
  await page.locator('#chMatImgReset').click();
  await expect(page.locator('#chMatImgReset')).toHaveCount(0);
});

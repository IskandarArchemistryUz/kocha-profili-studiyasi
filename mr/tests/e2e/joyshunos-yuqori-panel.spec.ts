import { test, expect } from './fx';

/** 24.11 (egasi: ThinkPad da yuqori panel va xizmat panellari bir-birini yopadi): yuqori panel avtomatik yashirinadi —
 *  sichqoncha tepaga borganda chiqadi, ketganda yashirinadi; «qadash» tugmasi avvalgi koʻrinishni qaytaradi. */
test.use({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });

test('yuqori panel: yashirin → tepaga borganda chiqadi → ketganda yashirinadi; qadash saqlanadi', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { try { sessionStorage.setItem('ah-test', '1'); if (!sessionStorage.getItem('ahInit')) { sessionStorage.setItem('ahInit', '1'); localStorage.removeItem('top-pin'); localStorage.removeItem('joy-state'); } } catch { /* */ } });
  await page.goto('./joyshunos.html?asosiy=1');
  const hdr = page.locator('header.eko'), left = page.locator('#joyLeft'), tab = page.locator('#topTab');
  await expect(left).toBeVisible();

  // sukut: yashirin, panellar tepada (12 px), tutqich koʻrinadi
  await expect(page.locator('html')).toHaveClass(/top-ah/);
  await expect(hdr).toHaveCSS('opacity', '0');
  expect((await left.boundingBox())!.y).toBeLessThan(20);
  await expect(tab).toBeVisible();

  // Xarita / Aksonometriya almashtirgichi — sarlavha ichida, xizmatlar roʻyxatini yopmaydi
  await page.mouse.move(683, 2);
  await expect(hdr).toHaveCSS('opacity', '1');
  await expect(tab).toBeHidden();
  // panel chiqqanda chap va oʻng panellar uning ostiga suriladi — ustma-ust tushmaydi
  const hb = (await hdr.boundingBox())!;
  await expect.poll(async () => (await left.boundingBox())!.y).toBeGreaterThanOrEqual(hb.y + hb.height);
  await expect.poll(async () => (await page.locator('#joyRight').boundingBox())!.y).toBeGreaterThanOrEqual(hb.y + hb.height);
  const nav = (await page.locator('header.eko nav.svc').boundingBox())!, mode = (await page.locator('#joyMode').boundingBox())!;
  expect(nav.x + nav.width).toBeLessThanOrEqual(mode.x + 1);
  expect((await hdr.boundingBox())!.x + (await hdr.boundingBox())!.width).toBeLessThanOrEqual(1366);

  // panel ustida turganda yashirinmaydi, pastga ketganda yashirinadi
  await page.mouse.move(400, 30); await page.waitForTimeout(900);
  await expect(hdr).toHaveCSS('opacity', '1');
  await page.mouse.move(683, 400); await page.waitForTimeout(900);
  await expect(hdr).toHaveCSS('opacity', '0');

  // tutqich bosilsa chiqadi (planshet: sichqoncha yoʻq — tegish; sichqonchada tutqichga yetmasdan panel chiqadi)
  await expect(tab).toBeVisible();
  await tab.dispatchEvent('click');
  await expect(hdr).toHaveCSS('opacity', '1');

  // qadash: panel doim koʻrinadi, chap panel sarlavha ostida; qayta yuklanganda saqlanadi
  await page.locator('#topPin').click();
  await expect(page.locator('#topPin')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).not.toHaveClass(/top-ah(\s|$)/);
  await page.mouse.move(683, 500); await page.waitForTimeout(900);
  await expect(hdr).toHaveCSS('opacity', '1');
  expect((await left.boundingBox())!.y).toBeGreaterThan(70);
  await page.reload();
  await expect(page.locator('#topPin')).toHaveAttribute('aria-pressed', 'true');
  await expect(hdr).toHaveCSS('opacity', '1');
  expect(errs).toEqual([]);
});

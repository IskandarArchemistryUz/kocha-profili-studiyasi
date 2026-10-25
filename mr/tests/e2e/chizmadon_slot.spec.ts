import { test, expect } from './fx';

/** Chizmadon tahlili (25.10, 2-bosqich): maket katagi paneli — almashtirish, oʻchirish; boʻsh katakda «+» */
test('Chizmadon: katak paneli — almashtirish, oʻchirish (tugma va Delete), «+» bilan qoʻyish', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen'); await page.click('#chStGo');
  const cellOf = (pre: string) => page.locator(`.ch-body [data-el^="${pre}"]`).first();
  await expect.poll(async () => page.locator('.ch-body [data-el]').count()).toBeGreaterThan(0);
  // birinchi varaqdagi xarita/grafik katagini bosish → panel
  const ids = await page.evaluate(() => [...document.querySelectorAll('.ch-body [data-el]')].map(e => e.getAttribute('data-el') ?? ''));
  const id = ids.find(x => /^(sun|day|temp|loc)/.test(x)) ?? ids[0];
  const box = (await cellOf(id).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const bar = page.locator('#chSlotBar');
  await expect(bar).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_slot_panel_1024.png` });
  await page.waitForTimeout(400);
  const box2 = (await page.locator('.ch-body [data-sel]').first().boundingBox())!;
  // panel katakning ustida (oʻng chetiga tekislangan)
  const bb = (await bar.boundingBox())!;
  expect(Math.abs(bb.x - box2.x)).toBeLessThan(8);
  expect(bb.y + bb.height).toBeLessThanOrEqual(box2.y + 6);
  // almashtirish menyusi: mos materiallar
  await page.click('#chSlotSwap');
  const menu = page.locator('#chSlotPick');
  await expect(menu).toBeVisible();
  const pick = menu.locator('[data-pick]').first();
  const pid = await pick.getAttribute('data-pick');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_slot_menu_dark.png` });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await pick.click();
  await expect(menu).toHaveCount(0);
  await expect(page.locator(`.ch-body [data-el="${pid}"]`)).toHaveCount(1);
  // oʻchirish tugmasi: material albomdan olinadi (roʻyxatda oʻchiq)
  await expect(bar).toBeVisible();
  await page.click('#chSlotHide');
  await expect(page.locator(`.ch-body [data-el="${pid}"]`)).toHaveCount(0);
  await expect(page.getByText(/albomdan olindi/).first()).toBeVisible();
  await expect(bar).toHaveCount(0);
  // Ctrl+Z — qaytadi
  await page.locator('.ch-view').focus(); await page.keyboard.press('Control+z');
  await expect(page.locator(`.ch-body [data-el="${pid}"]`)).toHaveCount(1);
  // Delete tugmasi ham oʻchiradi
  const b2 = (await page.locator(`.ch-body [data-el="${pid}"]`).boundingBox())!;
  await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2);
  await expect(bar).toBeVisible();
  await page.keyboard.press('Delete');
  await expect(page.locator(`.ch-body [data-el="${pid}"]`)).toHaveCount(0);
  // boʻsh katak boʻlsa — «+» menyusi
  const add = page.locator('.ch-slotadd').first();
  if (await add.count()) {
    await add.click();
    await expect(page.locator('#chSlotPick')).toBeVisible();
    const p2 = page.locator('#chSlotPick [data-pick]').first();
    if (await p2.count()) { const q = await p2.getAttribute('data-pick'); await p2.click(); await expect(page.locator(`.ch-body [data-el="${q}"]`)).toHaveCount(1); }
  }
});

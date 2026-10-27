import { test, expect } from './fx';

/** Kechki roʻyxat (26.10), 4-band: katakdagi xaritani maketdan ajratib erkin element qilish */
test('Chizmadon: «Erkin» — bosh reja katakdan ajraladi, surish va oʻlcham oʻzgartirish mumkin', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen'); await page.click('#chStGo');
  const plan = page.locator('.ch-body [data-el="p:plan:bosh"]');
  for (let i = 0; i < 6 && !(await plan.count()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); }
  await expect(plan).toHaveCount(1);
  const b = (await plan.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.click('#chSlotFree');
  // material katakdan olindi, oʻrnida erkin xarita (tanlangan, tutqichlar bilan)
  await expect(plan).toHaveCount(0);
  await expect(page.locator('.ch-over .hr').first()).toBeAttached();
  const fid = await page.evaluate(() => [...document.querySelectorAll('.ch-view .ch-page [data-id]')].filter(e => e.querySelector('svg[viewBox]')).map(e => e.getAttribute('data-id')).pop());
  expect(fid).toBeTruthy();
  const free = page.locator(`.ch-view .ch-page [data-id="${fid}"]`).first();
  await expect(free).toBeVisible();
  const f0 = (await free.boundingBox())!;
  // surish
  await page.mouse.move(f0.x + f0.width / 2, f0.y + f0.height / 2); await page.mouse.down();
  await page.mouse.move(f0.x + f0.width / 2 - 40, f0.y + f0.height / 2 - 30, { steps: 5 }); await page.mouse.up();
  // varaq qayta chiziladi (asinxron) — joyini kutib tekshiramiz
  await expect.poll(async () => (await free.boundingBox())?.x ?? 1e9).toBeLessThan(f0.x - 20);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_erkin_1024.png` });
  // Ctrl+Z ikki marta — material katakka qaytadi
  await page.locator('.ch-view').focus();
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
  await expect(plan).toHaveCount(1);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_erkin_dark.png` });
});

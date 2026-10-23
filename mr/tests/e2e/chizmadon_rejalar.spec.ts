import { test, expect } from './fx';

/** 19-band (1): Master rejaning rejalari Chizmadonga — bosh reja, land use, funksional, qavatlilik, kvartirografiya… */
test('Chizmadon «Loyihadan»: Master reja rejalari materiallar sifatida', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen');
  const mats = page.locator('#chStMats');
  for (const n of ['Bosh reja', 'Zonalashtirish (land use)', 'Funksional reja', 'Qavatlar soni', 'Figura-fon', 'Landshaft', 'Vaziyat sxemasi', 'Kvartirografiya · 1-bino'])
    await expect(mats.locator('.li', { hasText: n }).first()).toBeAttached();
  // sukut: bosh reja, land use va 1-bino kvartirografiyasi yoqilgan; qolganlari — tanlov boʻyicha
  await expect(mats.locator('.li', { hasText: 'Bosh reja' }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(mats.locator('.li', { hasText: 'Qavatlar soni' })).toHaveAttribute('aria-pressed', 'false');
  await mats.locator('.li', { hasText: 'Qavatlar soni' }).click();
  await expect(mats.locator('.li', { hasText: 'Qavatlar soni' })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/ch-dark.png' });
  await page.click('#chStGo');
  // albom varaqlarida rejalar chizilgan: vektor xarita (ichki svg) va kvartira ranglari
  const svgs = async () => page.evaluate(() => Array.from(document.querySelectorAll('.ch-body svg')).map(s => s.outerHTML).join(''));
  await expect.poll(async () => (await svgs()).length).toBeGreaterThan(1000);
  let found = false;
  for (let i = 0; i < 6 && !found; i++) { found = /#f6d58f|#f4b08a|#9bd3b8|#8fa5cc/i.test(await svgs()); if (!found) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); } }
  expect(found).toBe(true);
});

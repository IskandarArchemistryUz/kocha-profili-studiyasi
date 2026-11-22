import { test, expect, type Page } from './fx';

/* 22.11 — Chizmadon har ekran oʻlchamida: format tanlovi tor oynada ham bor («A3 ▾»),
   oyna oʻlchami oʻzgarganda varaq qayta sigʻdiriladi (foydalanuvchi oʻzi yaqinlashtirmagan boʻlsa), asboblar sigʻadi. */
async function open(page: Page): Promise<void> {
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  await page.click('#chOpen');
  await expect(page.locator('.gx.ch')).toBeVisible();
  await page.click('#chStGo');
  await expect(page.locator('.ch-tools [data-tool]')).toHaveCount(14);
}
const pageBox = (page: Page) => page.evaluate(() => {
  const v = document.querySelector('.ch-view')!.getBoundingClientRect(), p = document.querySelector('.ch-page')!.getBoundingClientRect();
  return { vx: v.left + v.width / 2, px: p.left + p.width / 2, pw: p.width, vw: v.width };
});

test('Chizmadon: tor oynada format menyusi, asboblar sigʻadi, oyna kattalashsa varaq sigʻdiriladi', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1024, height: 680 });
  await open(page);
  // format: segment yashirin, oʻrnida «A3 ▾»
  await expect(page.locator('#chFmt')).toBeHidden();
  const fb = page.locator('#chFmtBtn'); await expect(fb).toBeVisible();
  await fb.click();
  const items = page.locator('#chFmtMenu [data-fmt]'); expect(await items.count()).toBeGreaterThan(1);
  const second = items.nth(1), k = await second.getAttribute('data-fmt');
  await second.click();
  await page.setViewportSize({ width: 1400, height: 800 });
  await expect(page.locator(`#chFmt [data-fmt="${k}"]`)).toHaveAttribute('aria-pressed', 'true');   // tanlov saqlandi
  // asboblar paneli gorizontal skrollsiz
  await page.setViewportSize({ width: 1280, height: 630 }); await page.waitForTimeout(300);
  expect(await page.locator('.ch-tools').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  // katta oyna: varaq markazda va kattalashgan
  const a = await pageBox(page);
  await page.setViewportSize({ width: 2400, height: 1250 }); await page.waitForTimeout(300);
  const b = await pageBox(page);
  expect(b.pw).toBeGreaterThan(a.pw * 1.4);
  expect(Math.abs(b.px - b.vx)).toBeLessThan(40);
  // foydalanuvchi yaqinlashtirgan — oyna oʻzgarsa masshtab saqlanadi
  await page.click('[aria-label="Kattalashtirish"]');
  const c = await pageBox(page);
  await page.setViewportSize({ width: 1920, height: 1000 }); await page.waitForTimeout(300);
  const e = await pageBox(page);
  expect(Math.abs(e.pw - c.pw)).toBeLessThan(2);
  // «Sigʻdirish» — yana avtomatik rejim
  await page.click('#chFit');
  await page.setViewportSize({ width: 1280, height: 630 }); await page.waitForTimeout(300);
  const f = await pageBox(page);
  expect(Math.abs(f.px - f.vx)).toBeLessThan(40);
});

import { test, expect } from './fx';

/** Chizmadon tahlili (25.10, 4-bosqich): varaqning oʻzida matn va sarlavhani tahrirlash; matn katakni toʻldiradi */
test('Chizmadon: xulosa matni va sarlavhani varaqda tahrirlash', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('#chOpen'); await page.click('#chStGo');
  const note = page.locator('.ch-body [data-el="izoh"]');
  for (let i = 0; i < 6 && !(await note.count()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); }
  await expect(note).toHaveCount(1);
  // matn katakni toʻldiradi: matn balandligi katakning chorak qismidan koʻp
  const fill = () => note.evaluate(e => { const c = e.querySelector('rect')?.getBoundingClientRect(), t = [...e.querySelectorAll('text')].map(x => x.getBoundingClientRect()); if (!c?.height || !t.length) return 0; const y0 = Math.min(...t.map(b => b.top)), y1 = Math.max(...t.map(b => b.bottom)); return (y1 - y0) / c.height; });
  await expect.poll(fill).toBeGreaterThan(0.25);
  // panel → «Matnni tahrirlash»
  let b = (await note.boundingBox())!;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.click('#chSlotText');
  const ed = page.locator('#chInEdit');
  await expect(ed).toBeVisible(); await expect(ed).toBeFocused();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_matn_1024.png` });
  await ed.fill('Hudud markazda, transport bilan yaxshi bogʻlangan. Sinov matni.');
  await page.keyboard.press('Control+Enter');
  await expect(ed).toHaveCount(0);
  await expect.poll(() => note.evaluate(e => e.textContent ?? '')).toContain('Sinov matni.');
  await expect.poll(() => note.evaluate(e => e.textContent ?? '')).toMatch(/qoʻlda tahrirlangan/);
  // sarlavha: ikki marta bosish (katak tepasi)
  b = (await note.boundingBox())!;
  await page.mouse.click(b.x + 20, b.y + 4); await page.waitForTimeout(250);
  b = (await note.boundingBox())!;
  await page.mouse.dblclick(b.x + 20, b.y + 4);
  await expect(ed).toBeVisible();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_matn_dark.png` });
  await ed.fill('Mening xulosam');
  await page.keyboard.press('Enter');
  await expect.poll(() => note.evaluate(e => e.textContent ?? '')).toMatch(/Mening xulosam/i);
  // Esc — bekor
  await page.click('#chSlotText'); await ed.fill('bekor qilinadi'); await page.keyboard.press('Escape');
  await expect(ed).toHaveCount(0);
  expect(await note.evaluate(e => e.textContent ?? '')).not.toContain('bekor qilinadi');
});

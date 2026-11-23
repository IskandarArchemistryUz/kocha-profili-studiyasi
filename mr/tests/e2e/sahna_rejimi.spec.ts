import { test, expect } from './fx';

/** 18.11 (T1, egasi: noutbukdan taqdimotda oynalar sahnani yopdi): sahna rejimi va kichik ekranda panellar toʻqnashmasligi */
const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
for (const [w, hh, dark] of [[1280, 600, false], [1366, 650, true]] as const) test(`sahna rejimi · ${w}×${hh}${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: hh });
  await page.goto('./'); await page.click('#newP').then(() => page.click('#newP-mr'));
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length)).toBeGreaterThan(1);
  // asboblar paneli va koʻrsatkichlar tasmasi ustma-ust tushmaydi
  const over = await page.evaluate((f) => { const H = new Function('return ' + f)(); const a = document.querySelector('.tb')!.getBoundingClientRect(), b = document.querySelector('.kpibar')!.getBoundingClientRect(); return H(a, b); }, hit.toString());
  expect(over).toBe(false);
  // yuqori panel tugmalari ekrandan chiqmaydi
  expect(await page.evaluate(() => [...document.querySelectorAll('.top button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth - 4; }).length)).toBe(0);
  // P — sahna rejimi: panel, qadamlar, koʻrsatkichlar yashirinadi; pastda qadam nomi
  await page.mouse.move(w - 200, 300); await page.keyboard.press('p');
  await expect(page.locator('.sahna-bar')).toBeVisible();
  for (const s of ['.panel.sp', '.rail', '.kpibar']) await expect(page.locator(s)).toBeHidden();
  await expect(page.locator('.sahna-bar .sb-step')).toContainText('Hajmlar');
  await expect(page.locator('.tb')).toBeVisible();
  await page.locator('.sahna-bar button[aria-label="Keyingi"]').click();
  await expect(page.locator('.sahna-bar .sb-step')).toContainText('6.');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/sahna_${w}${dark ? 'd' : 'l'}.png` });
  // Esc — chiqish
  await page.keyboard.press('Escape');
  await expect(page.locator('.sahna-bar')).toHaveCount(0);
  await expect(page.locator('.panel.sp')).toBeVisible();
  await page.click('#presPop'); await page.click('#sahnaBtn');
  await expect(page.locator('.sahna-bar')).toBeVisible();
  await page.click('#sahnaExit');
  await expect(page.locator('.rail')).toBeVisible();
});

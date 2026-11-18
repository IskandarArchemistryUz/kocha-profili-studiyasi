import { test, expect } from './fx';

/** 18.11 (T1): Koʻchasoz va Joyshunosda sahna rejimi (ui/sahna.ts) — P / Esc, tugma; panellar yashirinadi, koʻrinish kengayadi */
for (const [u, hide, dark] of [['kochasoz.html#/b', '.ws aside.panel', false], ['joyshunos.html', '#joyLeft', true]] as const) test(`sahna rejimi · ${u}${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(90_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto('./' + u);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator(hide).first()).toBeVisible();
  await page.mouse.move(640, 300); await page.keyboard.press('p');
  await expect(page.locator('#sahnaExit')).toBeVisible();
  await expect(page.locator(hide).first()).toBeHidden();
  await expect(page.locator('#sahnaBtn')).toHaveAttribute('aria-pressed', 'true');
  if (u.startsWith('kochasoz')) expect(await page.evaluate(() => document.querySelector('.ws main')!.getBoundingClientRect().width)).toBeGreaterThan(1200);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/sahna_${u.split('.')[0]}${dark ? 'd' : 'l'}.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('#sahnaExit')).toHaveCount(0);
  await expect(page.locator(hide).first()).toBeVisible();
  await page.click('#sahnaBtn'); await expect(page.locator('#sahnaExit')).toBeVisible();
  await page.click('#sahnaExit'); await expect(page.locator(hide).first()).toBeVisible();
});

import { test, expect } from './fx';

/** Hudud joyi koordinatadan: mamlakat, vaqt mintaqasi va meʼyorlar profili (Toshkent — ShNQ, Parij/Melburn — xalqaro andozalar) */
async function openAt(page: import('@playwright/test').Page, c: [number, number], lang = 'uz') {
  await page.route(/fonts\.g|openfreemap|arcgis|gibs|nominatim|overpass|kumi\.systems|mail\.ru|private\.coffee|elevation-tiles/, r => r.abort());
  await page.addInitScript(([c, lang]) => { try { localStorage.setItem('joy-state', JSON.stringify({ c, r: 500, on: [] })); localStorage.setItem('mr-lang', lang as string); } catch { /* */ } }, [c, lang] as const);
  await page.goto('./joyshunos.html');
}
test('Joy: Toshkent — ShNQ, Parij — xalqaro andozalar va UTC+2, Melburn — janub', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await openAt(page, [69.2797, 41.3111]);
  await expect(page.locator('#joyPlace')).toContainText('Asia/Tashkent');
  await expect(page.locator('#joyPlace')).toContainText('UTC+5');
  await expect(page.locator('#joyPlace .nb')).toHaveClass(/uz/);
  await openAt(page, [2.3522, 48.8566]);
  await expect(page.locator('#joyPlace')).toContainText('Europe/Paris');
  await expect(page.locator('#joyPlace')).toContainText('UTC+2');
  await expect(page.locator('#joyPlace .nb')).toHaveClass(/intl/);
  await expect(page.locator('#joyPlace .nb')).toContainText('xalqaro andozalar');
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/joy-parij.png' });
  await openAt(page, [144.9631, -37.8136], 'en');
  await expect(page.locator('#joyPlace')).toContainText('Australia');
  await expect(page.locator('#joyPlace .nb')).toContainText('international benchmarks');
  expect(errs).toEqual([]);
});

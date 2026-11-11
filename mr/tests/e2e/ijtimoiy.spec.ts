import { test, expect } from './fx';

test('ijtimoiy binolar: funksiya berilganda maktab avtomatik, modullar, MTM', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '200'); await page.fill('#rh', '150'); await page.click('#rectSite');
  await page.click('[data-step=parsel]');
  await page.locator('[data-block="0"]').click();
  await page.click('[data-use=maktab]');
  await expect(page.locator('.toast')).toContainText('maktab');
  await page.click('[data-step=hajm]');
  await page.selectOption('#genBlock', '0');
  await expect(page.locator('#socBox')).toContainText('41-jadval');
  await expect(page.locator('#genNotes')).toContainText('oʻquvchi');
  if (shots) await page.screenshot({ path: `${shots}/maktab_taroq.png` });
  await page.click('[data-mod=hovli]'); await page.click('#genGo');
  await expect(page.locator('#genNotes')).toContainText('umumiy maydon (GFA)');
  if (shots) await page.screenshot({ path: `${shots}/maktab_hovli.png` });
  await page.fill('#socCap', '600'); await page.press('#socCap', 'Tab'); await page.click('#genGo');
  // 11.11 (c75): izohda haqiqiy sigʻim — bino GFA ÷ 24 m²/oʻrin (5-ilova), soʻralgan 600 dan oshmaydi; modul kichraytirilsa — izohda aytiladi
  await expect(page.locator('#socCap')).toHaveValue('600');
  const gn = (await page.locator('#genNotes').innerText()).replace(/\u00a0/g, ' '), cap = +(/Maktab: ([\d ]+) oʻquvchi/.exec(gn)?.[1] ?? '0').replace(/ /g, '');
  expect(cap).toBeGreaterThan(0); expect(cap).toBeLessThanOrEqual(600);
  if (cap < 600) expect(gn).toMatch(/kichraytirildi|toʻliq sigʻmadi/);
  await page.click('[data-step=parsel]');
  if (await page.locator('[data-block="0"][aria-selected=true]').count() === 0) await page.locator('[data-block="0"]').click();
  await page.click('[data-use=mtm]');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect(page.locator('#socBox')).toContainText('543-band');
  if (shots) await page.screenshot({ path: `${shots}/mtm.png` });
});

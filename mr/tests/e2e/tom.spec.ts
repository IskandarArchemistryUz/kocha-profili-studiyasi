import { test, expect } from './fx';

test('fasad materiali va tom turlari: hammasi / funksiya / tanlangan, quyosh panellari, TEP', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '220'); await page.fill('#rh', '160'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-typ=qatorlar]'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan generatsiya');
  await page.click('[data-step=fasad]');
  await page.click('[data-mat=gisht]');   // «Material» qatori sukut boʻyicha ochiq
  await expect(page.locator('[data-mat=gisht]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-row=roof]'); await page.click('[data-roof=ikki]');
  await expect(page.locator('[data-roof=ikki]')).toHaveAttribute('aria-pressed', 'true');
  if (shots) await page.screenshot({ path: `${shots}/tom_ikki.png` });
  await page.click('[data-row=cover]'); await page.click('[data-cover=quyosh]');
  await expect(page.locator('#roofSt')).toContainText('kWp');
  if (shots) await page.screenshot({ path: `${shots}/tom_quyosh.png` });
  await page.click('[data-look=use]');
  await expect(page.locator('#lookUse')).toBeVisible();
  await page.click('[data-cover=yashil]');
  await expect(page.locator('#roofSt')).toContainText('Yashil tomlar');
  await page.keyboard.press('Control+z');
  await expect(page.locator('#roofSt')).toContainText('Quyosh panellari');
  await page.click('#kMore');
  await page.click('#kMore');
  await page.click('[data-step=eksport]');
  const [rep] = await Promise.all([page.waitForEvent('popup'), page.click('#exPdf')]);
  await expect(rep.locator('body')).toContainText('Quyosh panellari quvvati');
});

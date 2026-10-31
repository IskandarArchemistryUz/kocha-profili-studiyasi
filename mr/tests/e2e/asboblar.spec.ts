import { test, expect } from './fx';

test('asboblar: chizgʻich, kesim, pipetka, qoʻl, oʻng tugma menyusi', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
  await page.click('[data-view=axo]');   // quyidagi nuqtalar aksonometriya uchun (standart koʻrinish — Reja)
  const c = page.locator('#scene canvas'), bb = (await c.boundingBox())!;
  // chizgʻich
  await page.click('[data-tool=measure]');
  await expect(page.locator('[data-tool=measure]')).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.click(bb.x + bb.width * 0.4, bb.y + bb.height * 0.5);
  await page.mouse.click(bb.x + bb.width * 0.6, bb.y + bb.height * 0.5);
  await page.keyboard.press('Enter');
  await expect(page.locator('.hint')).toContainText(/jami [\d,]+ m/);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tool=select]')).toHaveAttribute('aria-pressed', 'true');
  // kesim
  await page.click('[data-tool=section]'); await page.click('#secH');
  await page.locator('#secZ').fill('20');
  await expect(page.locator('.toolpanel')).toContainText('20,0 m');
  if (shots) await page.screenshot({ path: `${shots}/kesim.png` });
  await page.click('#secOff'); await page.keyboard.press('Escape');
  // oʻng tugma — bino menyusi
  await page.mouse.click(bb.x + bb.width * 0.62, bb.y + bb.height * 0.32, { button: 'right' });
  await expect(page.locator('.cmenu')).toContainText('Qavat qoʻshish');
  if (shots) await page.screenshot({ path: `${shots}/cmenu.png` });
  await page.click('.cmenu >> text=Qavat qoʻshish');
  await expect(page.locator('#undo')).toHaveAttribute('title', /Bino oʻzgardi/);
  // pipetka
  await page.keyboard.press('i');
  await expect(page.locator('.toolpanel')).toContainText('Namuna binoni bosing');
  await page.mouse.click(bb.x + bb.width * 0.62, bb.y + bb.height * 0.32);
  await expect(page.locator('#pipSt')).toContainText('Nusxa:');
  // qoʻl
  await page.click('[data-tool=hand]');
  await expect(page.locator('[data-tool=hand]')).toHaveAttribute('aria-pressed', 'true');
});

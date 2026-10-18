import { test, expect } from './fx';

test('bino muharriri: qavatlar, terrasa, parapet, quyosh himoyasi, siljitish', async ({ page }) => {
  test.setTimeout(120_000);
  const shots = process.env.GX_SHOTS;
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan generatsiya');
  await page.click('[data-view=axo]');   // quyidagi nuqtalar aksonometriya uchun (standart koʻrinish — Reja)
  const c = page.locator('#scene canvas'), bb = (await c.boundingBox())!;
  await page.mouse.click(bb.x + bb.width * 0.62, bb.y + bb.height * 0.32);
  await expect(page.locator('.panel[data-mode=bino]')).toBeVisible();
  const gfa0 = Number((await page.locator('#kGfa b').textContent())!.replace(/\D/g, ''));
  const f0 = Number(await page.locator('#iFloors').inputValue());
  await page.click('[aria-label="Qavatlar — oshirish"]');
  await expect(page.locator('#iFloors')).toHaveValue(String(f0 + 1));
  await page.click('[data-itab=qavat]');
  await page.click(`[data-floor="${f0 - 2}"]`);
  await expect(page.locator('#iFloorT')).toContainText(`${f0 - 2}-qavat`);
  await page.keyboard.press('PageUp');
  await expect(page.locator('#iFloorT')).toContainText(`${f0 - 1}-qavat`);
  await page.fill('#tInset', '3'); await page.press('#tInset', 'Tab');
  await page.click('#tAdd');
  await expect(page.locator('#tierList')).toContainText('3,0 m');
  if (shots) await page.screenshot({ path: `${shots}/insp_qavat.png` });
  // fasad va tom — alohida qadam (tanlangan bino bilan)
  await page.click('[data-itab=hajm]');
  await expect(page.locator('.btools')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/insp_hajm.png` });
  await page.click('#iToFasad');
  await expect(page.locator('[data-look=sel]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-row=par]'); await page.click('[data-par="1"]');
  await page.click('[data-row=shade]'); await page.click('[data-shade=avto]');
  await expect(page.locator('[data-shade=avto]')).toHaveAttribute('aria-pressed', 'true');
  if (shots) await page.screenshot({ path: `${shots}/insp_fasad.png` });
  await page.click('[data-step=hajm]');
  const gfa1 = Number((await page.locator('#kGfa b').textContent())!.replace(/\D/g, ''));
  expect(gfa1).not.toBe(gfa0);
  // siljitish: sichqoncha bilan
  await page.click('[data-itab=hajm]'); await page.click('[data-drag=move]');
  await page.mouse.move(bb.x + bb.width * 0.62, bb.y + bb.height * 0.32); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width * 0.62 + 40, bb.y + bb.height * 0.32 + 10, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('#undo')).toHaveAttribute('title', /Bino oʻzgardi/);
  // fasad qadamida bino bosilsa — 6-qadamga oʻtmaydi
  await page.click('[data-step=fasad]');
  await page.mouse.click(bb.x + bb.width * 0.7, bb.y + bb.height * 0.4);
  await expect(page.locator('.panel')).toContainText('Fasad va tom');
});

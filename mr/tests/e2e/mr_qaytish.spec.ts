import { test, expect } from './fx';

/** 18-band: Joyshunos, Koʻchasoz, Chizmadondan Master rejaning aynan shu loyihasi, qadami va kamerasiga qaytish; Joyshunosda model funksiya ranglarida */
test('Master rejaga qaytish: Joyshunos va Koʻchasoz sarlavhasida tugma, qadam va kamera tiklanadi; Chizmadon', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  const id = await page.evaluate(() => (window as any).__mr.store.doc.id);
  // Chizmadon: matnli «Master reja» tugmasi, yopilganda manzil loyihaga qaytadi
  await page.click('#chOpen'); await expect(page.locator('.gx.ch')).toBeVisible(); await expect(page.locator('#chStBack')).toContainText('Master reja');   // kirish oynasidan ham qaytsa boʻladi
  await page.click('#chStBack'); await expect(page.locator('.gx.ch')).toHaveCount(0);
  expect(await page.evaluate(() => location.hash)).toBe(`#/p/${id}`);
  // kamera: aksonometriya, maxsus nuqta
  await page.click('button:has-text("Aksonometriya")');
  await page.evaluate(() => { const sc = (window as any).__mr.scene, c = sc.getCamera(); sc.setCamera({ ...c, pos: [c.pos[0] + 40, c.pos[1] + 15, c.pos[2] - 25] }); });
  const cam0 = await page.evaluate(() => (window as any).__mr.scene.getCamera());
  await page.click('[data-step=eksport]');
  await page.click('#exJoy');
  await page.waitForURL(/joyshunos\.html/);
  await expect(page.locator('#mrBack')).toBeVisible();
  await expect(page.locator('#mrBack')).toContainText('Master reja');
  await page.waitForTimeout(1500);
  const shots = process.env.SHOTS;
  if (shots) await page.screenshot({ path: `${shots}/joy-model.png` });
  // Koʻchasoz ham shu tugmani koʻrsatadi
  await page.goto('./kochasoz.html'); await expect(page.locator('#mrBack')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/ks-back.png` });
  await page.click('#mrBack');
  await page.waitForFunction(() => !!(window as any).__mr?.store);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.id)).toBe(id);
  await expect(page.locator('.panel h2')).toHaveText('Taqdimot va eksport');
  const cam1 = await page.evaluate(() => (window as any).__mr.scene.getCamera());
  expect(cam1.mode).toBe(cam0.mode);
  for (let k = 0; k < 3; k++) expect(Math.abs(cam1.pos[k] - cam0.pos[k])).toBeLessThan(0.5);
});

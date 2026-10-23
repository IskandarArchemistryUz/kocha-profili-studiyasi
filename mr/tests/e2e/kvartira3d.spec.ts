import { test, expect } from './fx';

/** 11-band: kvartiralar koʻrinishi — binolar oʻrnida kvartira hajmlari (xonalar rangda), atrof och fonda */
test('kvartiralar 3D: alohida hajmlar, xonalar, tanlash; «Yoʻq» — binolar qaytadi', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=kvartira]');
  await expect(page.locator('#aptPlan')).toContainText('xonadon');
  const st = () => page.evaluate(() => {
    const sc = (window as any).__mr.scene; let owners = 0, vols = 0, rooms = 0, ghost = 0;
    sc.world.children.forEach((o: any) => { if (o.userData.bOwner) owners++; if (o.userData.isoGhost) ghost++; });
    sc.aptG.children.forEach((o: any) => { if (o.userData.aptVol) { vols++; rooms += o.geometry.attributes.position.count; } });
    return { on: sc.aptViewOn, owners, vols, rooms, ghost, n: (window as any).__mr.store.doc.buildings.length };
  });
  const a = await st();
  expect(a.on).toBe(true); expect(a.owners).toBe(0); expect(a.vols).toBeGreaterThan(0); expect(a.vols).toBeLessThanOrEqual(a.n);
  expect(a.ghost).toBe(1);   // pastki noturar qavatlar — och fon
  // kvartira hajmini bosish — bino tanlanadi (qavat rejasi)
  await page.click('[data-view=axo], button:has-text("Aksonometriya")'); await page.waitForTimeout(600);
  const hitBid = await page.evaluate(() => { const ed = (window as any).__mr, c = ed.scene.renderer.domElement.getBoundingClientRect(); for (let y = c.top + 60; y < c.bottom - 60; y += 20) for (let x = c.left + 400; x < c.right - 40; x += 20) { const id = ed.scene.pickBuilding(x, y); if (id) return id; } return null; });
  expect(hitBid).toBeTruthy();
  const shots = process.env.SHOTS;
  if (shots) {
    await page.screenshot({ path: `${shots}/apt-axo.png` });
    await page.locator('#aptFloor').fill('4'); await page.locator('#aptFloor').dispatchEvent('input'); await page.waitForTimeout(400);
    await page.screenshot({ path: `${shots}/apt-cut.png` });
    await page.evaluate((id) => { const ed = (window as any).__mr; ed.scene.frameBuilding(ed.store.doc, id); }, hitBid); await page.waitForTimeout(500);
    await page.screenshot({ path: `${shots}/apt-zoom.png` });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.screenshot({ path: `${shots}/apt-dark.png` });
  }
  await page.click('[data-a3d=yoq]');
  const b = await st();
  expect(b.on).toBe(false); expect(b.vols).toBe(0); expect(b.ghost).toBe(0); expect(b.owners).toBeGreaterThan(0);
  await page.click('[data-a3d=tur]');
  expect((await st()).on).toBe(true);
  await page.click('[data-step=hajm]');
  const c = await st(); expect(c.on).toBe(false); expect(c.owners).toBeGreaterThan(0);
});

import { test, expect } from './fx';

/** 31.10 (egasi): past qavatli uylarga fasad dizayni — material, derazalar, eshik, ayvon, balkon, tom */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`past qavatli uy fasadi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: w, height: 860 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '140'); await page.fill('#rh', '110'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.click('[data-typ=hovli]'); await page.click('#genGo');
  await expect(page.locator('#bldSt')).toContainText('shundan avtomatik');
  const det = () => page.evaluate(() => { let n = 0; (window as any).__mr.scene.world.traverse((o: any) => { if (o.userData?.houseDetail) n++; }); return n; });
  await expect.poll(det, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.click('[data-step=fasad]');
  const open = async (id: string) => { if (!(await page.locator(`#strip-${id}`).isVisible())) await page.click(`[data-row=${id}]`); };
  await open('mat'); await page.click('[data-mat=gisht]');
  await open('ayvon'); await page.click('[data-ayvon=old]');
  expect(await page.evaluate(() => (window as any).__mr.store.doc.buildings.filter((b: any) => b.gen?.kind === 'uy').every((b: any) => b.ayvon === 'old' && b.mat === 'gisht'))).toBe(true);
  await page.click('[data-view=persp]');
  await page.evaluate(() => { const ed = (window as any).__mr, b = ed.store.doc.buildings.find((x: any) => x.gen?.kind === 'uy'); ed.scene.frameBuilding(ed.store.doc, b.id); });
  await page.waitForTimeout(600);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/past_fasad_${w}${dark ? 'd' : 'l'}.png` });
});

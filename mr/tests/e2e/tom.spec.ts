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

/** 14-band: qiya tomda qavat raqami tom ichida qolmaydi — tizmadan yuqorida */
test('qiya tom: qavat raqami tizma ustida', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180); ed.store.dispatch({ type: 'setSite', rings: [[[0, 0], [140, 0], [140, 110], [0, 110]].map(p => [o[0] + p[0] / mx, o[1] + p[1] / 111132])] }); });
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await page.waitForFunction(() => (window as any).__mr.store.doc.buildings.length > 0, null, { timeout: 30000 });
  const r = await page.evaluate(() => {
    const m = (window as any).__mr, sc = m.scene; m.store.dispatch({ type: 'styleBuildings', ids: m.store.doc.buildings.map((b: any) => b.id), roof: 'ikki' }); sc.setFloorLabels(true);
    const roofTop = new Map<string, number>(), lab: { y: number; bid: string }[] = [];
    sc.world.traverse((o: any) => {
      if (o.isMesh && o.userData.bid && o.material?.side === 2 && o.geometry?.attributes?.position) { const a = o.geometry.attributes.position.array; let t = -Infinity; for (let i = 1; i < a.length; i += 3) t = Math.max(t, a[i]); roofTop.set(o.userData.bid, Math.max(roofTop.get(o.userData.bid) ?? -Infinity, t)); }
      if (o.userData.floorLbl) lab.push({ y: o.position.y, bid: o.userData.lblBid });
    });
    return { labs: lab.length, roofs: roofTop.size, under: lab.filter(l => roofTop.has(l.bid) && l.y <= roofTop.get(l.bid)!).length, paired: lab.filter(l => roofTop.has(l.bid)).length };
  });
  expect(r.labs).toBeGreaterThan(0); expect(r.roofs).toBeGreaterThan(0);
  expect(r.paired).toBeGreaterThan(0);
  expect(r.under).toBe(0);   // har binoning raqami oʻz tomi tizmasidan yuqori
});

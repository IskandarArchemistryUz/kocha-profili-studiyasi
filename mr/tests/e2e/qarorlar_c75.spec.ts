import { test, expect } from './fx';

/**
 * 11.11 (c75, egasining qarorlari):
 *  1) AYoQSh — sukut 414 (100 m), panelda 491 / 492 (50 m) sharti bilan tanlanadi;
 *  2) qabristondan 100 m — mehmonxona va ofis jamoat binosi (ShNQ 2.08.02-23: 170, 8-bob, 882) — NORMA; avtoturargoh — ruxsat;
 *  3) maktab — binosiz parsel sigʻimi 0, bino hajmi sigʻimdan (5-ilova 24 m²/oʻrin, QMQ 2.01.03-19), «a / b oʻrin»;
 *  4) Koʻchasoz shablonlari — parallel avtoturargoh 2,5 m (SHNQ 2.05.07-24, 1-ilova 4-izoh).
 */
const block = /^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile|nominatim))/;
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`c75 qarorlari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(240_000);
  const shots = process.env.GX_SHOTS, tag = `${w}${dark ? 'd' : 'l'}`;
  await page.route(block, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '240'); await page.click('#rectSite');
  // 1) AYoQSh: sukut 414 — izoh va 491 / 492 qatorlari koʻrinadi
  await page.evaluate(() => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    m.store.dispatch({ type: 'addLimit', limit: { id: 'yq', kind: 'obyekt', status: 'saqlanadi', src: 'qolda', obj: 'yoqilgi_414', rings: [[[100, 80], [130, 80], [130, 110], [100, 110]].map(g)] } }); m.pickLimit('yq'); m.renderPanel(); });
  await expect(page.locator('[data-lim=yq] .v')).toContainText('100 m');
  const yoq = page.locator('[data-objyoq]');
  await expect(yoq).toContainText('491'); await expect(yoq).toContainText('492'); await expect(yoq).toContainText('50 m');
  await expect(page.locator('#limObjR [data-obj=yoqilgi_491]')).toContainText('50 m · V');
  await expect(page.locator('#limObjR [data-obj=agtksh_492]')).toContainText('50 m · V');
  if (shots) { await yoq.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${shots}/c75_ayoqsh_${tag}.png` }); }
  await page.click('#limObjR [data-obj=yoqilgi_491]');
  await expect(page.locator('[data-lim=yq] .v')).toContainText('50 m');
  await expect(page.locator('[data-objyoq]')).toHaveCount(0);
  // 2) qabriston: 100 m ichida mehmonxona va ofis — mos emas (NORMA); avtoturargoh — mumkin
  await page.evaluate(() => {
    const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180);
    const r = m.store.doc.site.rings[0], cx = r.reduce((t: number, p: number[]) => t + p[0], 0) / r.length, cy = r.reduce((t: number, p: number[]) => t + p[1], 0) / r.length;
    const G = (x: number, y: number) => [cx + x / mx, cy + y / 111132], sq = (x0: number, y0: number, x1: number, y1: number) => [G(x0, y0), G(x1, y0), G(x1, y1), G(x0, y1)];
    m.store.dispatch({ type: 'addLimit', limit: { id: 'qab', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', sub: { open: true, rural: true }, rings: [sq(-150, -40, -110, 40)] } });
    m.store.dispatch({ type: 'addBuilding', footprint: sq(-40, -15, -20, 15), floors: 4, nonRes: 4, use: 'mehmonxona' });
    m.store.dispatch({ type: 'addBuilding', footprint: sq(-40, 30, -20, 45), floors: 4, nonRes: 4, use: 'ofis' });
    m.store.dispatch({ type: 'addBuilding', footprint: sq(-40, 50, -20, 80), floors: 2, nonRes: 0, use: 'avtoturargoh' });
    m.pickLimit('qab'); m.renderPanel();
  });
  await expect(page.locator('[data-qabnote]')).toContainText('mehmonxona');
  await expect(page.locator('[data-qabnote]')).toContainText('882-band');
  if (shots) { await page.locator('[data-qabnote]').scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await page.screenshot({ path: `${shots}/c75_qab_panel_${tag}.png` }); }
  await page.click('#kMore');
  const q = page.locator('.drawer [data-rule=qab-100]');
  await expect(q.locator('[data-s=fail]').first()).toBeVisible();
  await q.locator('button.li').click(); await q.scrollIntoViewIfNeeded();
  await expect(q).toContainText('Mehmonxona: 1 ta (NORMA)'); await expect(q).toContainText('Ofis: 1 ta (NORMA)'); await expect(q).toContainText('170-band');
  await expect(q).not.toContainText('Avtoturargoh: 1');
  await page.waitForTimeout(300);
  if (shots) await page.screenshot({ path: `${shots}/c75_qab_meyor_${tag}.png` });
  await page.keyboard.press('Escape');
  // 3) maktab: binosiz parsel — 0; joylashtirilgach — bino sigʻimi / uchastka sigʻimi
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '180'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr; ed.store.dispatch({ type: 'setZones', zones: [{ id: 'z0', at: ed.store.doc.origin, use: 'maktab' }] }); });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.last?.d.schoolPlots?.[0]?.plot ?? 0)).toBeGreaterThan(500);
  expect(await page.evaluate(() => (window as any).__mr.last.d.schoolCap)).toBe(0);
  const vol = page.locator('#schVol');
  await expect(vol).toContainText('5-ilova'); await expect(vol.locator('[data-schv=fl]')).not.toBeEmpty(); await expect(vol).toContainText('41-jadval');
  if (shots) { await vol.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${shots}/c75_maktab_bosh_${tag}.png` }); }
  await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 15_000 }).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => (window as any).__mr.last?.d.schoolCap ?? 0), { timeout: 15_000 }).toBeGreaterThan(0);
  const sp = await page.evaluate(() => (window as any).__mr.last.d.schoolPlots[0]);
  expect(sp.bld).toBeGreaterThan(0); expect(sp.cap).toBe(Math.min(sp.plot, sp.built));
  await page.click('[data-view=axo]'); await page.waitForTimeout(800);
  if (shots) await page.screenshot({ path: `${shots}/c75_maktab_akso_${tag}.png` });
  await page.click('#kMore');
  const r = page.locator('.drawer [data-rule="school-plot"]');
  await r.locator('button.li').click(); await r.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  await expect(r).toContainText(`${sp.built} / ${sp.plot} oʻrin`); await expect(r).toContainText('5-ilova');
  if (shots) await page.screenshot({ path: `${shots}/c75_maktab_meyor_${tag}.png` });
  await page.keyboard.press('Escape');
  // 4) koʻcha profillari: parallel avtoturargoh 2,5 m — «Mahalla koʻchasi + avtoturargoh (2 tomon)» 17,4 m (avval 16,8)
  await page.click('[data-step=kocha]'); await page.click('[data-ktab=prof]');
  await page.fill('#profQ', 'avtoturargoh');
  await expect(page.locator('[data-prof=s-res] .num')).toHaveText('17,4 m');
  await expect(page.locator('[data-prof=s-r2pb] .num')).toHaveText('22,5 m');
  if (shots) { await page.locator('[data-prof=s-res]').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await page.screenshot({ path: `${shots}/c75_kocha_${tag}.png` }); }
});

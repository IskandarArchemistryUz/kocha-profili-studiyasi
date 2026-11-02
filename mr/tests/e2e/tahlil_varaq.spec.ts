import { test, expect } from './fx';

/** 02.11 (egasi: tahlil varaqlari — piyoda masofasi va xizmat radiuslari tayyor chizma boʻlib albomga): Varaqlar va Chizmadonda «Xizmat radiusi» */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`xizmat radiusi varagʻi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '420'); await page.fill('#rh', '330'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=portlend]'); await page.click('#gridApply');
  // bitta kvartal — maktab, qolganlari turar joy
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click(); await page.click('[data-use=maktab]');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(10);
  await page.click('[data-step=eksport]'); await page.click('#exGx');
  await expect(page.locator('[data-sheet]').first()).toBeVisible();
  const idx = await page.evaluate(() => [...document.querySelectorAll('[data-sheet]')].findIndex(e => /Xizmat radiusi · Maktab/.test(e.textContent ?? '')));
  expect(idx).toBeGreaterThanOrEqual(0);
  await page.locator('[data-sheet]').nth(idx).click();
  const view = page.locator('#gxView svg');
  await expect(view.locator('#Xizmat_obyektlari')).toBeAttached();
  await expect(view.locator('[id^=Piyoda_]').first()).toBeAttached();
  await expect(view.locator('#Turar_joy_radiusda')).toBeAttached();
  await expect(page.locator('#shSvc')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tahlil_maktab_${w}${dark ? 'd' : 'l'}.png` });
  await page.click('#shSvc [data-svc=bekat]');
  await expect(page.locator('#gxView')).toContainText(/Jamoat transporti bekati/);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/tahlil_${w}${dark ? 'd' : 'l'}.png` });
  await page.keyboard.press('Escape');
});

/** 02.11 (tahlil 2-bosqich): «Cheklovlar rejasi» — qurib boʻlmaydigan joy (shtrix), SMZ, ELU va oʻng ustunda yer balansi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`cheklovlar rejasi va yer balansi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '420'); await page.fill('#rh', '330'); await page.click('#rectSite');
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), my = 111132, r = ed.store.doc.site.rings[0];
    const cx = r.reduce((t: number, p: number[]) => t + p[0], 0) / r.length, cy = r.reduce((t: number, p: number[]) => t + p[1], 0) / r.length, g = (x: number, y: number) => [cx + x / mx, cy + y / my];
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'q1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [[g(-210, -165), g(-150, -165), g(-150, -110), g(-210, -110)]] } });
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'e1', kind: 'elu', status: 'saqlanadi', src: 'qolda', elu: 'mavjud', kv: 110, axis: [g(-260, 120), g(260, 120)] } }); });
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=portlend]'); await page.click('#gridApply');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(5);
  await page.click('[data-step=eksport]'); await page.click('#exGx');
  await expect(page.locator('[data-sheet]').first()).toBeVisible();
  const idx = await page.evaluate(() => [...document.querySelectorAll('[data-sheet]')].findIndex(e => /Cheklovlar rejasi/.test(e.textContent ?? '')));
  expect(idx).toBeGreaterThanOrEqual(0);
  await page.locator('[data-sheet]').nth(idx).click();
  const view = page.locator('#gxView svg');
  for (const id of ['Qurib_bolmaydigan', 'SMZ_cheklovlar', 'ELU', 'Yer_balansi']) await expect(view.locator(`#${id}`)).toBeAttached();
  await expect(view.locator('#Yer_balansi')).toContainText('Turar joy uchun yaroqli');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/cheklov_${w}${dark ? 'd' : 'l'}.png` });
  await page.keyboard.press('Escape');
});

/** 02.11 (tahlil 3-bosqich): «Yashil balans» (86, 87-band jadvali) va «Insolyatsiya» (6-qadam xaritasi varaqda) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`yashil balans va insolyatsiya varaqlari · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '240'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=portlend]'); await page.click('#gridApply');
  await page.click('[data-step=parsel]'); await page.locator('[data-block="1"]').click(); await page.click('[data-use=yashil]');
  await page.click('[data-step=hajm]'); await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 30000 }).toBeGreaterThan(3);
  const open = async (re: RegExp) => {
    const idx = await page.evaluate(s => [...document.querySelectorAll('[data-sheet]')].findIndex(e => new RegExp(s).test(e.textContent ?? '')), re.source);
    expect(idx).toBeGreaterThanOrEqual(0); await page.locator('[data-sheet]').nth(idx).click();
  };
  // insolyatsiya hisoblanmagan — varaqda izoh
  await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
  await open(/Insolyatsiya/);
  await expect(page.locator('#gxView svg')).toContainText('Insolyatsiya hisoblanmagan');
  await open(/Yashil balans/);
  const view = page.locator('#gxView svg');
  await expect(view.locator('#Yashil_balans')).toContainText('Jami yashil');
  await expect(view.locator('#Yashil_balans')).toContainText('Hovli maysasi');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/yashil_${w}${dark ? 'd' : 'l'}.png` });
  await page.keyboard.press('Escape');
  // 6-qadam: insolyatsiya xaritasi → varaqda rangli katakchalar
  await page.click('[data-step=quyosh]'); await page.click('[data-date="03-22"]'); await page.click('#insolGo');
  await expect(page.locator('#insolSt')).toContainText('22 mart', { timeout: 60000 });
  await page.click('[data-step=eksport]'); await page.click('#exGx'); await expect(page.locator('[data-sheet]').first()).toBeVisible();
  await open(/Insolyatsiya/);
  await expect(page.locator('#gxView svg #Insolyatsiya path').first()).toBeAttached();
  await expect(page.locator('#gxView svg')).toContainText('22.03');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/insol_${w}${dark ? 'd' : 'l'}.png` });
  await page.keyboard.press('Escape');
});

import { test, expect, rectSite } from './fx';

/**
 * Cheklovlar, 2-bosqich (02.11): 1-qadam «4 · Mavjud holat va cheklovlar» — turini tanlab sahnada chizish, roʻyxat,
 * tanlangan cheklovni tahrirlash (holat, qabriston turi, bufer), yer balansi va «Yaroqli, ga» KPI, oʻchirish.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`cheklov chizish va tahrirlash · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await rectSite(page, 300, 300);
  await expect(page.locator('#secLimits')).toBeVisible();
  await expect(page.locator('#limList')).toHaveCount(0);
  // uchastka markazi (mahalliy koordinatada)
  const c = await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), my = 111132, r = ed.store.doc.site.rings[0];
    const xs = r.map((p: number[]) => (p[0] - o[0]) * mx), ys = r.map((p: number[]) => (p[1] - o[1]) * my); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; });
  await page.click('[data-limadd=qabriston]');
  await expect(page.locator('#limStop')).toBeVisible();
  const sc = page.locator('#scene canvas'), bb = (await sc.boundingBox())!;
  const at = async (x: number, y: number) => { const s = await page.evaluate(([x, y]) => (window as any).__mr.scene.toScreen(x, y, 0), [x, y]) as { x: number; y: number }; await page.mouse.click(bb.x + s.x, bb.y + s.y); await page.waitForTimeout(120); };
  // 60 × 40 m qabriston uchastkaning janubi-sharqiy choragida (1024 px da chap panel ostiga tushmasin)
  for (const [dx, dy] of [[60, -120], [120, -120], [120, -80], [60, -80]]) await at(c[0] + dx, c[1] + dy);
  await page.keyboard.press('Enter');
  await expect(page.locator('#limStop')).toHaveCount(0);
  await expect(page.locator('[data-lim]')).toHaveCount(1);
  const row = page.locator('[data-lim]').first();
  await expect(row).toContainText('C-1');
  await expect(row).toContainText('300 m');   // 06.11 (c63): < 20 ga — VM 101-son qarori, 1-ilova, 50-band
  await expect(page.locator('[data-limref]')).toContainText('VM 101-son qarori (04.04.2011), 1-ilova, 50-band');
  await expect(page.locator('[data-limref]')).toContainText('norma');
  // yer balansi: yaroqli < uchastka
  const ha = async (id: string) => parseFloat((await page.locator(`#${id}`).innerText()).replace(',', '.'));
  await expect.poll(() => ha('lbSite'), { timeout: 8000 }).toBeCloseTo(9, 1);
  await expect.poll(() => ha('lbHard'), { timeout: 8000 }).toBeGreaterThan(0.2);
  await expect.poll(async () => await ha('lbSite') - await ha('lbUse'), { timeout: 8000 }).toBeGreaterThan(1);
  await expect(page.locator('#kUsable')).toBeVisible();
  await page.locator('[data-limref]').scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/cheklov_${w}${dark ? 'd' : 'l'}.png` });
  // yopilgan → 100 m (VM 101, 50-band); kolumbariy — SMZ ≥ 50 m (06.11, c65: bino devoridan ≥ 100 m — alohida halqa, qab-100)
  await page.click('[data-qab=closed]');
  await expect(page.locator('[data-qabnote]')).toContainText('VM 101');
  await expect(page.locator('[data-lim]').first()).toContainText('100 m');
  await page.click('[data-qab=open]'); await page.click('#limQabT [data-qab=kolumb]');
  await expect(page.locator('[data-lim]').first()).toContainText('50 m');
  await expect(page.locator('[data-limref]')).toContainText('kolumbariy');
  // qoʻlda bufer
  await page.fill('#limBuf', '75'); await page.locator('#limBuf').press('Enter'); await page.locator('#limBuf').blur();
  await expect(page.locator('[data-lim]').first()).toContainText('75 m');
  // buziladi — hisobga olinmaydi, «Yaroqli» = uchastka
  await page.click('[data-lst=buziladi]');
  await expect(page.locator('[data-lim]').first()).toContainText('—');
  await expect.poll(async () => Math.abs(await ha('lbUse') - await ha('lbSite')), { timeout: 8000 }).toBeLessThan(0.05);
  // oʻchirish — oxirgi cheklov: `limits` kaliti yoʻqoladi, panel va sahna yangilanishi kerak
  await page.click('#limDel');
  await expect(page.locator('[data-lim]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__mr.store.doc.limits)).toBeUndefined();
});

/** 3-bosqich (02.11); 06.11 (c61): reyestrda — issiqxona SMZ ichidagi turar joy (SanQvaN 0103-25, 12-band) va ELU zonasidagi bino (VMQ № 1050, 14) */
test('cheklovlar reyestrda: SMZ ichida turar joy, ELU zonasida bino', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await rectSite(page, 400, 400);
  await page.evaluate(() => {
    const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), my = 111132;
    const r = ed.store.doc.site.rings[0], cx = r.reduce((t: number, p: number[]) => t + p[0], 0) / r.length, cy = r.reduce((t: number, p: number[]) => t + p[1], 0) / r.length;
    const g = (x: number, y: number) => [cx + x / mx, cy + y / my];
    const sq = (x0: number, y0: number, x1: number, y1: number) => [g(x0, y0), g(x1, y0), g(x1, y1), g(x0, y1)];
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'q1', kind: 'issiqxona', status: 'saqlanadi', src: 'qolda', rings: [sq(-150, -150, -110, -110)] } });
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'e1', kind: 'elu', status: 'saqlanadi', src: 'qolda', elu: 'mavjud', kv: 110, axis: [g(-200, 120), g(200, 120)] } });
    ed.store.dispatch({ type: 'addBuilding', footprint: sq(-90, -150, -60, -120), floors: 9, nonRes: 0, use: 'turar' });
    ed.store.dispatch({ type: 'addBuilding', footprint: sq(0, 110, 30, 130), floors: 5, nonRes: 0, use: 'ofis' });
  });
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=szz-217]')).toContainText('SanQvaN 0103-25');
  await expect(page.locator('.drawer [data-rule=szz-217]')).toContainText('12-band');
  await expect(page.locator('.drawer [data-rule=szz-217] [data-s=fail]').first()).toBeVisible();
  await expect(page.locator('.drawer [data-rule=elu-1050] [data-s=fail]').first()).toBeVisible();
  await expect(page.locator('.drawer [data-rule=elu-251] [data-s=fail]').first()).toBeVisible();
});

/** 3b (02.11); 06.11 (c61): generator SMZ ichiga turar joy qoʻymaydi (0103-25, 12-band); SMZ koʻkalamzorligi (13-band) — himoya koʻkalamzorligi bilan bajariladi */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`SMZ: generator va koʻkalamzorlik · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]');
  await rectSite(page, 300, 300);
  // issiqxona uchastkaning gʻarbiy chetida (1-ilova, 4-sinf, 100 m SMZ)
  await page.evaluate(() => { const ed = (window as any).__mr, o = ed.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), r = ed.store.doc.site.rings[0];
    const xs = r.map((p: number[]) => p[0]), ys = r.map((p: number[]) => p[1]), x0 = Math.min(...xs), cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const g = (a: number, b: number) => [x0 + a / mx, cy + b / 111132];
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'q1', kind: 'issiqxona', status: 'saqlanadi', src: 'qolda', rings: [[g(-50, -20), g(-10, -20), g(-10, 20), g(-50, 20)]] } }); });
  await page.click('[data-step=parsel]'); await page.locator('[data-block="0"]').click();
  await page.click('[data-use=turar]');
  await page.click('[data-step=hajm]');
  await page.click('#genGo');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 10000 }).toBeGreaterThan(0);
  await expect(page.locator('#genNotes')).toContainText('SMZ');
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=szz-217] [data-s=fail]')).toHaveCount(0);
  await expect(page.locator('.drawer [data-rule=szz-219] [data-s=fail]').first()).toBeVisible();
  await page.click('#kMore');   // reyestr yopiladi
  // SMZ qismi — himoya koʻkalamzorligi (kvartal tanlangan boʻlib qolgan boʻlsa — qayta bosilmaydi, aks holda tanlov olinadi)
  await page.click('[data-step=parsel]');
  if (await page.evaluate(() => (window as any).__mr.selBlock) !== 0) await page.locator('[data-block="0"]').click();
  await page.click('#pSzz');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.plan().blocks.some((b: any) => b.use === 'himoya')), { timeout: 8000 }).toBe(true);
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=szz-219] [data-s=fail]')).toHaveCount(0);
  await page.waitForTimeout(400);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/szz3b_${w}${dark ? 'd' : 'l'}.png` });
});

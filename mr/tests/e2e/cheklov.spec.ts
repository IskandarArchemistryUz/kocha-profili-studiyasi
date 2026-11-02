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
  await expect(row).toContainText('100 m · IV');   // < 10 ga amaldagi — SanQvaN 0350-17, 6.4, IV sinf
  await expect(page.locator('[data-limref]')).toContainText('SanQvaN 0350-17, 6.4');
  // yer balansi: yaroqli < uchastka
  const ha = async (id: string) => parseFloat((await page.locator(`#${id}`).innerText()).replace(',', '.'));
  await expect.poll(() => ha('lbSite'), { timeout: 8000 }).toBeCloseTo(9, 1);
  await expect.poll(() => ha('lbHard'), { timeout: 8000 }).toBeGreaterThan(0.2);
  await expect.poll(async () => await ha('lbSite') - await ha('lbUse'), { timeout: 8000 }).toBeGreaterThan(1);
  await expect(page.locator('#kUsable')).toBeVisible();
  await page.locator('[data-limref]').scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/cheklov_${w}${dark ? 'd' : 'l'}.png` });
  // yopilgan → 100 m (TALQIN), memorial → 50 m, V sinf
  await page.click('[data-qab=closed]');
  await expect(page.locator('[data-limref]')).toContainText(/talqin|tasdiq/);
  await page.getByRole('button', { name: 'Memorial / kolumbariy' }).click();
  await expect(page.locator('[data-lim]').first()).toContainText('50 m · V');
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

/** 3-bosqich (02.11): reyestrda — SMZ ichidagi turar joy (SanPiN 0350-17, 2.17) va ELU zonasidagi bino (VMQ № 1050, 14) */
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
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'q1', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [sq(-150, -150, -110, -110)] } });
    ed.store.dispatch({ type: 'addLimit', limit: { id: 'e1', kind: 'elu', status: 'saqlanadi', src: 'qolda', elu: 'mavjud', kv: 110, axis: [g(-200, 120), g(200, 120)] } });
    ed.store.dispatch({ type: 'addBuilding', footprint: sq(-90, -150, -60, -120), floors: 9, nonRes: 0, use: 'turar' });
    ed.store.dispatch({ type: 'addBuilding', footprint: sq(0, 110, 30, 130), floors: 5, nonRes: 0, use: 'ofis' });
  });
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=szz-217]')).toContainText('SanPiN RUz № 0350-17');
  await expect(page.locator('.drawer [data-rule=szz-217] [data-s=fail]').first()).toBeVisible();
  await expect(page.locator('.drawer [data-rule=elu-1050] [data-s=fail]').first()).toBeVisible();
  await expect(page.locator('.drawer [data-rule=elu-251] [data-s=fail]').first()).toBeVisible();
});

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

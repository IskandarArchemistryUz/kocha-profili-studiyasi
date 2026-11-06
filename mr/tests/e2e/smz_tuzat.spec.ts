import { test, expect } from './fx';

/**
 * 06.11 (c63, egasi): qabriston — VM 101-son qarori, 1-ilova, 50-band (turi tanlanadi, NORMA); bezak suvi (fontan) — suvni muhofaza
 * zonasisiz; tur «Koʻl» ga oʻzgartirilsa zona paydo boʻladi.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qabriston VM 101 va bezak suvi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '300'); await page.fill('#rh', '240'); await page.click('#rectSite');
  const add = (lim: object, id: string) => page.evaluate(([l, i]) => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    const L = l as any; m.store.dispatch({ type: 'addLimit', limit: { ...L, rings: L.rings.map((r: number[][]) => r.map(g)) } }); m.pickLimit(i); m.renderPanel(); }, [lim, id] as const);
  // qabriston 1,4 ga (uchastka sharqida) — 20 ga dan kichik: 300 m
  await add({ id: 'qab', kind: 'qabriston', status: 'saqlanadi', src: 'qolda', rings: [[[190, -60], [310, -60], [310, 60], [190, 60]]] }, 'qab');
  await expect(page.locator('#limQabT')).toBeVisible();
  await expect(page.locator('[data-limref=qab]')).toContainText('VM 101-son qarori (04.04.2011), 1-ilova, 50-band');
  await expect(page.locator('[data-limref=qab]')).toContainText('300 m');
  await expect(page.locator('[data-limref=qab]')).toContainText('norma');
  await page.click('#limQabT [data-qab=rural]');
  await expect(page.locator('#limQabT [data-qab=rural]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-limref=qab]')).toContainText('kattasi olindi');
  await expect(page.locator('[data-lim=qab] .v')).toContainText('100 m');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/qabriston_${w}${dark ? 'd' : 'l'}.png` }); }
  // fontan uchastka ichida — bezak suvi: suvni muhofaza zonasi va qirgʻoq boʻyi mintaqasi yoʻq
  await add({ id: 'fon', kind: 'suv', status: 'saqlanadi', src: 'qolda', suv: { t: 'bezak' }, rings: [[[-30, -20], [0, -20], [0, 10], [-30, 10]]] }, 'fon');
  await expect(page.locator('[data-suvbezak]')).toBeVisible();
  await expect(page.locator('#limQir')).toHaveCount(0);
  await expect(page.locator('[data-lim=fon] .v')).toContainText('0 / 0 m');
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/bezak_${w}${dark ? 'd' : 'l'}.png` }); }
  // turini qoʻlda «Koʻl» ga oʻzgartirish — 981-son nizom zonasi qaytadi
  await page.click('#limSuvT [data-suvt=kol]');
  await expect(page.locator('#limSuvT [data-suvt=kol]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-lim=fon] .v')).toContainText('50 / 35 m');
  await expect(page.locator('#limQir')).toBeVisible();
});

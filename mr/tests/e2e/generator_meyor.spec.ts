import { test, expect } from './fx';

/**
 * 04.11 (Murad Buildings sinovi, 1-band): «Hammasi» dan keyin generator oʻzi chiqargan binolarda meʼyor buzilmaydi —
 * spacing-79, fire-56, redline-79, street-overlap, seismic-blocks, seismic-height: «mos emas» 0. Sozlama — sinovdagidek:
 * Avto (UMN 3,0), 9–16 qavat, chekinish balandlikka qarab, yer osti avtoturargoh, 8 ball, monolit; maktab, MTM va park parsellari.
 */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`generator meʼyorni buzmaydi («Hammasi») · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(420_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '460'); await page.fill('#rh', '440'); await page.click('#rectSite');
  await page.click('[data-step=kocha]'); await page.click('[data-gpre=barselona]'); await page.click('#gridApply');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.plan().blocks.length)).toBeGreaterThan(6);
  await page.evaluate(() => { const m = (window as any).__mr, plan = m.plan(), o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    const uses = ['maktab', 'mtm', 'park'], zs = [...m.store.doc.zones]; plan.blocks.slice(0, 3).forEach((b: any, k: number) => zs.push({ id: 'zz' + k, at: g(b.centroid), use: uses[k] })); m.store.dispatch({ type: 'setZones', zones: zs }); });
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '3');
  await page.evaluate(() => { const m = (window as any).__mr; Object.assign(m.gen, { typology: 'avto', minF: 9, maxF: 16, far: 3, setbackAuto: true, parking: 'yer_osti' }); m.renderPanel(); });
  await page.click('#genAll');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.store.doc.buildings.length), { timeout: 120_000 }).toBeGreaterThan(15);
  await expect(page.locator('#genNotes')).toContainText('Meʼyorga moslash');
  const bad = await page.evaluate(() => (window as any).__mr.allRules().filter((r: any) => ['spacing-79', 'fire-56', 'redline-79', 'street-overlap', 'seismic-blocks', 'seismic-height', 'red-line-39'].includes(r.id) && r.status === 'fail').map((r: any) => `${r.id}: ${r.value}`));
  expect(bad).toEqual([]);
  if (process.env.GX_SHOTS) { await page.locator('#genNotes').scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/gen_meyor_${w}${dark ? 'd' : 'l'}.png` }); }
});

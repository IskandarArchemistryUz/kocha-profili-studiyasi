import { test, expect } from './fx';

/** 04.11 (Murad Buildings sinovi, 7-band): 3-qadamda mavjud binoni bir bosish uni «saqlanadi» qilmaydi — daha tanlanadi, bino belgilanadi;
 *  shu binoni yana bir bosish — saqlash ↔ buzish */
function fixture(): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = []; let id = 1;
  const g = (x: number, y: number) => ({ lon: c[0] + x * mx, lat: c[1] + y * my });
  const sq = (x: number, y: number, w: number, d: number) => [[x, y], [x + w, y], [x + w, y + d], [x, y + d], [x, y]].map(([a, b]) => g(a, b));
  for (const k of [-200, 200]) { el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [g(k, -300), g(k, 300)] }); el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [g(-300, k), g(300, k)] }); }
  el.push({ type: 'way', id: 701, tags: { building: 'industrial', 'building:levels': '2' }, geometry: sq(-20, -20, 40, 30) });
  return { elements: el };
}
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`mavjud bino — ikki bosish bilan saqlash · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/overpass|interpreter/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture()) }));
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:arcgisonline|terrain|amazonaws|elevation|openfreemap|tile))/, r => r.abort());
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP');
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.click('#ctxLoad'); await page.waitForSelector('#ctxSt', { timeout: 60000 });
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=parsel]');
  await expect.poll(() => page.evaluate(() => (window as any).__mr.scene.inSite.length)).toBeGreaterThan(0);
  const keep = () => page.evaluate(() => (window as any).__mr.store.doc.keep.length as number);
  const k0 = await keep();
  const pt = await page.evaluate(() => { const sc = (window as any).__mr.scene; const b = sc.inSite[0], r = b.rings[0], c = [r.reduce((t: number, p: number[]) => t + p[0], 0) / r.length, r.reduce((t: number, p: number[]) => t + p[1], 0) / r.length]; return sc.toScreen(c[0], c[1], sc.H(c[0], c[1]) + b.h + 0.2); });
  const at = { x: pt.x, y: pt.y };
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(300);
  expect(await keep()).toBe(k0);   // birinchi bosish — oʻzgarmaydi
  await expect(page.locator('.toast').last()).toContainText('yana bir marta bosing');
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/saqlash_tasdiq_${w}${dark ? 'd' : 'l'}.png` });
  await page.mouse.click(at.x, at.y);
  await expect.poll(keep).not.toBe(k0);   // ikkinchi — almashadi
});

import { test, expect } from './fx';

/** 04.11 (Murad Buildings sinovi, 2-band — D-14): uchburchak 0,95 ga dahada 16 qavatda joy yetmasa — generator qavatni oshirishni emas,
 *  pasaytirib qayta urinadi (keyin minora); natija boʻlmasa — aniq sabab (eng tor joy va talab) */
for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`uchburchak daha — qavat pasaytirib qayta urinish · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const S = w === 1440 ? 0.45 : 0.2;   // 0,21 ga — 16 qavatda sigʻmaydi, 9 da sigʻadi; 0,04 ga — hech narsa sigʻmaydi (sabab yoziladi)
  await page.evaluate((k) => { const m = (window as any).__mr, o = m.store.doc.origin, mx = 111320 * Math.cos(o[1] * Math.PI / 180), g = (p: number[]) => [o[0] + p[0] / mx, o[1] + p[1] / 111132];
    m.store.dispatch({ type: 'setSite', rings: [[[-75 * k, -63 * k], [75 * k, -63 * k], [-75 * k, 64 * k]].map(g)] }); }, S);
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0');
  await page.evaluate(() => { const m = (window as any).__mr; Object.assign(m.gen, { typology: 'perimetr', minF: 9, maxF: 16, far: 4.5, setbackAuto: true }); m.renderPanel(); });
  await page.click('#genGo');
  await expect(page.locator('#genNotes')).toBeVisible();
  const n = await page.evaluate(() => (window as any).__mr.store.doc.buildings.length);
  const notes = await page.locator('#genNotes').innerText();
  console.log('N', n, notes.replace(/\n/g, ' | ').slice(0, 400));
  expect(notes).not.toContain('ni oshiring');
  if (n === 0) expect(notes).toContain('Bino sigʻmadi');
  else expect(notes).toMatch(/pasaytirildi|minora/);
  if (process.env.GX_SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.GX_SHOTS}/uchburchak_${w}${dark ? 'd' : 'l'}.png` }); }
});

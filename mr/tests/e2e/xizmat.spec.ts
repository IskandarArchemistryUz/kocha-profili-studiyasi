import { test, expect } from '@playwright/test';

/** Toshkent markazi atrofida 100 m li yoʻl toʻri va bitta bogʻcha (OSM javobi oʻrniga) */
function fixture(): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = [];
  let id = 1;
  for (let k = -600; k <= 600; k += 100) {
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: Array.from({ length: 13 }, (_, i) => ({ lon: c[0] + (k) * mx, lat: c[1] + (-600 + i * 100) * my })) });
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: Array.from({ length: 13 }, (_, i) => ({ lon: c[0] + (-600 + i * 100) * mx, lat: c[1] + k * my })) });
  }
  el.push({ type: 'node', id: 9001, lat: c[1] + 150 * my, lon: c[0] + 150 * mx, tags: { amenity: 'kindergarten', name: 'Sinov bogʻchasi' } });
  el.push({ type: 'node', id: 9002, lat: c[1] - 900 * my, lon: c[0] - 900 * mx, tags: { amenity: 'school' } });
  return { elements: el };
}

test('xizmatlar: OSM obyektlari, piyoda masofa, reyestr; DXF va GLB eksport', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|interpreter/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture()) }));
  await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=xizmat]');
  await expect(page.locator('#svcTab')).toBeVisible({ timeout: 30000 });
  // bogʻcha 150 m da — qisman qamrab oladi; maktab ~1270 m da — 500 m radiusdan tashqarida
  const mtm = page.locator('#svcTab tr[data-svc=mtm] .chip'), sch = page.locator('#svcTab tr[data-svc=maktab] .chip');
  const v = Number((await mtm.textContent())!.replace(/\D/g, '')); expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(100);
  await expect(sch).toHaveText('0 %');
  await page.click('#svcTab tr[data-svc=maktab]');
  await expect(page.locator('#svcSt')).toContainText('radiusdan tashqarida');
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=service-radius]')).toContainText('38-jadval');
  await page.click('#kMore');
  await page.click('[data-step=eksport]');
  const [dxf] = await Promise.all([page.waitForEvent('download'), page.click('#exDxf')]);
  expect(dxf.suggestedFilename()).toMatch(/\.dxf$/);
  const [glb] = await Promise.all([page.waitForEvent('download'), page.click('#exGlb')]);
  expect(glb.suggestedFilename()).toMatch(/\.glb$/);
  const buf = await (await import('node:fs/promises')).readFile((await glb.path())!);
  expect(buf.subarray(0, 4).toString()).toBe('glTF');
});

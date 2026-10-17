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
  el.push({ type: 'node', id: 9003, lat: c[1] + 200 * my, lon: c[0] - 100 * mx, tags: { highway: 'bus_stop', name: 'Sinov bekati' } });
  el.push({ type: 'node', id: 9004, lat: c[1] - 500 * my, lon: c[0] + 500 * mx, tags: { railway: 'subway_entrance' } });
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
  // bekat 400 m, metro kirishi 800 m — jadvalda; bekat ~300 m da → qamrov > 0
  await expect(page.locator('#svcTab tr[data-svc=bekat] td').nth(1)).toHaveText('400 m');
  await expect(page.locator('#svcTab tr[data-svc=metro] td').nth(1)).toHaveText('800 m');
  const bk = Number((await page.locator('#svcTab tr[data-svc=bekat] .chip').textContent())!.replace(/\D/g, '')); expect(bk).toBeGreaterThan(0);
  // bekatgacha radius: Toshkent — eng yirik (andoza); umumshahar markazi → 250 m; qoʻlda «Oʻrta» → markaz qoidasi amal qilmaydi
  await expect(page.locator('#trCatV')).toHaveText('Eng yirik');
  await page.click('#trCenter');
  await expect(page.locator('#svcTab tr[data-svc=bekat] td').nth(1)).toHaveText('250 m');
  await page.click('#trCatEdit'); await page.selectOption('#trCat', 'orta');
  await expect(page.locator('#trCatV')).toHaveText('Oʻrta');
  await expect(page.locator('#svcTab tr[data-svc=bekat] td').nth(1)).toHaveText('400 m');
  await page.click('#trCatEdit'); await page.selectOption('#trCat', ''); await page.click('#trCenter');
  await expect(page.locator('#svcTab tr[data-svc=bekat] td').nth(1)).toHaveText('400 m');
  // OSM da yoʻq bogʻchani qoʻlda qoʻshish — uchastka markazida → MTM qamrovi oshadi
  await page.selectOption('#poiKind', 'mtm'); await page.fill('#poiName', 'Sinov MTM');
  await page.click('#poiAdd');
  const box = (await page.locator('#scene canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('Escape');
  await expect(page.locator('#poiList')).toContainText('Sinov MTM');
  await expect(mtm).toHaveText('100 %');
  await page.click('#svcTab tr[data-svc=maktab]');
  await expect(page.locator('#svcSt')).toContainText('radiusdan tashqarida');
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=service-radius]')).toContainText('38-jadval');
  await page.click('#kMore');
  await page.click('[data-step=eksport]');
  const [dxf] = await Promise.all([page.waitForEvent('download'), page.click('#exDxf')]);
  expect(dxf.suggestedFilename()).toMatch(/\.dxf$/);
  const [ifc] = await Promise.all([page.waitForEvent('download'), page.click('#exIfc')]);
  expect(ifc.suggestedFilename()).toMatch(/\.ifc$/);
  expect((await (await import('node:fs/promises')).readFile((await ifc.path())!, 'utf8')).startsWith('ISO-10303-21;')).toBe(true);
  const [obj] = await Promise.all([page.waitForEvent('download'), page.click('#exObj')]);
  expect((await (await import('node:fs/promises')).readFile((await obj.path())!, 'utf8'))).toMatch(/^v /m);
  const [glb] = await Promise.all([page.waitForEvent('download'), page.click('#exGlb')]);
  expect(glb.suggestedFilename()).toMatch(/\.glb$/);
  const buf = await (await import('node:fs/promises')).readFile((await glb.path())!);
  expect(buf.subarray(0, 4).toString()).toBe('glTF');
  const [xl] = await Promise.all([page.waitForEvent('download'), page.click('#exXlsx')]);
  expect(xl.suggestedFilename()).toMatch(/_TEP\.xlsx$/);
  expect((await (await import('node:fs/promises')).readFile((await xl.path())!)).subarray(0, 2).toString()).toBe('PK');
  const [rep] = await Promise.all([page.waitForEvent('popup'), page.click('#exPdf')]);
  await expect(rep.locator('h2').nth(1)).toContainText('Grafik varaqlar · Bosh reja, M 1:');
  await expect(rep.locator('h2').nth(3)).toHaveText('Texnik-iqtisodiy koʻrsatkichlar');
  await expect(rep.locator('body')).toContainText('Xizmat koʻrsatish radiuslari');
  expect(await rep.locator('img').count()).toBe(5);
  await rep.setViewportSize({ width: 900, height: 1200 });
  await rep.screenshot({ path: 'test-results/hisobot.png', fullPage: true });
});

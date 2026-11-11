import { test, expect, joyTab, type Page } from './fx';

/**
 * E2 (11.11, foydalanuvchi fikri: «yaqinda bogʻcha yoʻq» — xususiy bogʻcha OSM da yoʻq edi): xizmatlar xulosasi 3 holatda,
 * «yoʻq» soʻzisiz; OSM da topilmagan turni xaritaga qoʻshish, obyekt kartasi, «Meʼyoriy hisobga kiritish» (sukut — oʻchiq).
 */
test.use({ reducedMotion: 'reduce' });
const C = [69.2797, 41.3111];
let k = 1;
const ring = (n: number, R: number, tags: (i: number) => Record<string, string>) => Array.from({ length: n }, (_, i) => {
  const a = i * 2.39996, r = R * Math.sqrt((i + 0.5) / n);
  return { type: 'node', id: k++, lat: C[1] + r * Math.sin(a) / 111132, lon: C[0] + r * Math.cos(a) / (111320 * Math.cos(C[1] * Math.PI / 180)), tags: tags(i) };
});
function roads(): unknown[] {
  const kx = 111320 * Math.cos(C[1] * Math.PI / 180), ky = 111132, ll = (x: number, y: number) => ({ lat: C[1] + y / ky, lon: C[0] + x / kx }), el: unknown[] = [];
  for (let i = -6; i <= 6; i++) { el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [ll(i * 100, -650), ll(i * 100, 650)] }); el.push({ type: 'way', id: k++, tags: { highway: 'residential' }, geometry: [ll(-650, i * 100), ll(650, i * 100)] }); }
  return el;
}
async function open(page: Page): Promise<void> {
  await page.route(/fonts\.g|openfreemap|arcgis|gibs\.earthdata|elevation-tiles-prod|nominatim/, r => r.abort());
  // OSM da bogʻcha (kindergarten) yoʻq — faqat maktab, dorixona, poliklinika va bekatlar
  await page.route(/overpass|kumi\.systems|mail\.ru|private\.coffee/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: [...ring(9, 1200, i => ({ amenity: ['school', 'pharmacy', 'clinic'][i % 3] })), ...ring(6, 900, () => ({ highway: 'bus_stop' })), ...roads()] }) }));
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('joyInit')) { sessionStorage.setItem('joyInit', '1'); localStorage.removeItem('joy-state'); localStorage.setItem('mr-lang', 'uz'); } } catch { /* */ } });
  await page.goto('./joyshunos.html');
}

for (const [w, dark] of [[1440, false], [1024, true]] as const) test(`qoʻshilgan obyekt va xizmatlar xulosasi · ${w}px${dark ? ' · tungi' : ''}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: w, height: 860 });
  await open(page);
  if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const card = page.locator('[data-card=xizmat]');
  await expect(page.locator('.joy-tabs [data-tab=xizmat]')).toBeVisible({ timeout: 30_000 });
  await joyTab(page, 'xizmat');
  await expect(card.locator('.big')).toHaveText(/\d+ obyekt/, { timeout: 30_000 });
  const mtm = card.locator('li[data-svc=mtm]');
  await expect(mtm).toHaveAttribute('data-st', 'none');
  await expect(mtm).toContainText('OSM maʼlumotida topilmadi — joyida tekshiring.');
  await expect(card).not.toContainText(/\byoʻq\b/);
  await expect(card.locator('li[data-svc=maktab] .r2')).toContainText('· OSM');
  // qoʻshish: tugma → xaritani bosish → karta ochiladi
  await mtm.locator('[data-add=mtm]').click();
  const box = (await page.locator('.maplibregl-canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.45);
  const oc = page.locator('.joy-objcard');
  await expect(oc).toBeVisible();
  await expect(page.locator('.joy-addmk[data-obj]')).toHaveCount(1);
  await page.fill('#objName', 'Quyoshcha'); await page.locator('#objName').press('Enter'); await page.locator('#objName').blur();
  await page.click('#objOwn button:has-text("Xususiy")');
  // sukut: meʼyoriy hisobga kirmagan — xulosada «siz qoʻshgan», holat «hisobga kirmagan»
  await expect(mtm).toHaveAttribute('data-st', 'own');
  await expect(mtm.locator('.r2')).toContainText('siz qoʻshgan');
  if (process.env.GX_SHOTS) { await page.click('#objMore'); await page.waitForTimeout(300); await page.screenshot({ path: `${process.env.GX_SHOTS}/joy_obyekt_${w}${dark ? 'd' : 'l'}.png` }); }
  else await page.click('#objMore');
  await page.click('#objNorm');
  await expect(mtm).toHaveAttribute('data-st', /ok|far/);
  // saqlanadi
  await page.reload();
  await expect(page.locator('.joy-tabs [data-tab=xizmat]')).toBeVisible({ timeout: 30_000 }); await joyTab(page, 'xizmat');
  await expect(page.locator('.joy-addmk[data-obj]')).toHaveCount(1, { timeout: 30_000 });
  await page.locator('.joy-addmk[data-obj]').click();
  await expect(page.locator('#objName')).toHaveValue('Quyoshcha');
  await page.click('#objDel');
  await expect(page.locator('.joy-addmk[data-obj]')).toHaveCount(0);
});

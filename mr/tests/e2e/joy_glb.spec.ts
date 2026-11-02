import { test, expect } from './fx';
import { readdirSync } from 'node:fs';

/** 02.11 (egasi: «hudud master rejasini Joyshunosga yuborsam u ochilmayapti»): sahnada Int32 atributli (fid) obyekt boʻlsa ham GLB Joyshunosda ochiladi */
test('Joyshunosga yuborish — Int32 atributli qatlam bilan ham model ochiladi', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws/, r => r.fulfill({ status: 404, body: '' }));
  page.on('dialog', d => { throw new Error(`dialog: ${d.message()}`); });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('[data-step=eksport]');
  // foydalanuvchi qatlami kabi: Int32 «fid» atributli mesh (glTF da yoʻq tur — 5124). Eksport ilovaning oʻz GLTFLoader i bilan qayta oʻqiladi
  const loader = readdirSync('../app/assets').find(f => /^GLTFLoader-.*\.js$/.test(f))!;
  const res = await page.evaluate(async (L) => { const sc = (window as any).__mr.scene, src = sc.world.children.find((o: any) => o.isMesh && o.geometry?.attributes?.position);
    const g = src.geometry.clone(), A = g.attributes.position.constructor; g.setAttribute('fid', new A(new Int32Array(g.attributes.position.count), 1));
    sc.world.add(new src.constructor(g, src.material));
    const buf = await (await sc.exportGLB(false)).arrayBuffer(), { GLTFLoader } = await import(`./assets/${L}`);
    try { await new GLTFLoader().parseAsync(buf, ''); return 'ok'; } catch (e) { return (e as Error).message; } }, loader);
  expect(res).toBe('ok');
  await page.click('#exJoy');
  await page.waitForURL(/joyshunos\.html/);
  await expect.poll(() => page.evaluate(() => !!(window as any).joyAxo?.hasModel()), { timeout: 20000 }).toBe(true);
  await expect(page.locator('body')).not.toContainText('Model ochilmadi');
  // model keshda qoldi (xato boʻlsa endi oʻchiriladi)
  expect(await page.evaluate(() => new Promise(ok => { const r = indexedDB.open('archemistry-mr'); r.onsuccess = () => { const t = r.result.transaction('cache', 'readonly').objectStore('cache').get('joy-model'); t.onsuccess = () => ok(!!t.result); }; }))).toBe(true);
});

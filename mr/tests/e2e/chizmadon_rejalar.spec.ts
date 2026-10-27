import { test, expect } from './fx';

/** 19-band (1): Master rejaning rejalari Chizmadonga — bosh reja, land use, funksional, qavatlilik, kvartirografiya… */
test('Chizmadon «Loyihadan»: Master reja rejalari materiallar sifatida', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen');
  const mats = page.locator('#chStMats');
  for (const n of ['Bosh reja', 'Zonalashtirish (land use)', 'Funksional reja', 'Qavatlar soni', 'Figura-fon', 'Landshaft', 'Vaziyat sxemasi', 'Kvartirografiya · 1-bino'])
    await expect(mats.locator('.li', { hasText: n }).first()).toBeAttached();
  // sukut: bosh reja, land use va 1-bino kvartirografiyasi yoqilgan; qolganlari — tanlov boʻyicha
  await expect(mats.locator('.li', { hasText: 'Bosh reja' }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(mats.locator('.li', { hasText: 'Qavatlar soni' })).toHaveAttribute('aria-pressed', 'false');
  await mats.locator('.li', { hasText: 'Qavatlar soni' }).click();
  await expect(mats.locator('.li', { hasText: 'Qavatlar soni' })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.screenshot({ path: '/tmp/claude-0/-home-claude/b25a01be-6cb9-5f0d-b8d2-9edfc4c1b0c5/scratchpad/ch-dark.png' });
  await page.click('#chStGo');
  // albom varaqlarida rejalar chizilgan: vektor xarita (ichki svg) va kvartira ranglari
  const svgs = async () => page.evaluate(() => Array.from(document.querySelectorAll('.ch-body svg')).map(s => s.outerHTML).join(''));
  await expect.poll(async () => (await svgs()).length).toBeGreaterThan(1000);
  let found = false;
  for (let i = 0; i < 6 && !found; i++) { found = /#f6d58f|#f4b08a|#9bd3b8|#8fa5cc/i.test(await svgs()); if (!found) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); } }
  expect(found).toBe(true);
  // 29-band: kvartirografiya — Varaqlardagi «Qavatlar» varagʻidek: vaziyat sxemasi va kvartiralar eksplikatsiyasi bilan
  let apt = false;
  for (let i = 0; i < 8 && !apt; i++) { apt = /(Kvartiralar|Xonadonlar) eksplikatsiyasi|Apartment schedule|Экспликация квартир/i.test(await svgs()); if (!apt) { await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(400); } }
  expect(apt).toBe(true);
  expect(await svgs()).toMatch(/Vaziyat sxemasi|Location plan|Ситуационная схема/i);
  // eksplikatsiya — alohida jadval (oʻng panel), reja katagida emas: jadval elementi va reja bitta varaqda
  const els = () => page.evaluate(() => [...document.querySelectorAll('.ch-body [data-el]')].map(e => e.getAttribute('data-el') ?? ''));
  for (let i = 0; i < 8 && !(await els()).some(x => x.startsWith('p:apt:')); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); }
  expect(await page.locator('.ch-body [data-el^="p:aptx:"]').count()).toBeGreaterThan(0);
  // jadvalda kvartira turi rang namunasi bilan (rejadagi rang bilan bir xil)
  expect(await page.locator('.ch-body [data-el^="p:aptx:"]').first().evaluate(e => e.outerHTML)).toMatch(/#f6d58f|#f4b08a|#9bd3b8|#8fa5cc/i);
  expect(await page.locator('.ch-body [data-el^="p:apt:"]').count()).toBeGreaterThan(0);
  // Chizmadon tahlili (25.10, 1-bosqich): vaziyat sxemasi — alohida material (kichik katakda), reja — oʻz katagida
  // standart masshtabda (GOST 2.302), masshtab yozuvi aniq (choʻzilmaydi)
  expect(await page.locator('.ch-body [data-el^="p:aptnav:"]').count()).toBeGreaterThan(0);
  const plan = page.locator('.ch-body [data-el^="p:apt:"]').first();
  expect(await plan.evaluate(e => e.outerHTML)).not.toMatch(/Vaziyat sxemasi|VAZIYAT SXEMASI/);
  const sc = await plan.evaluate(e => e.querySelector('[data-deco="scale"]')?.textContent ?? '');
  expect(sc).toMatch(/M 1:(50|75|100|200|400|500|800|1\s?000)\b/);
  // reja katakning kamida bir tomonini yarmidan koʻp egallaydi
  const fill = await plan.evaluate(e => { const c = e.getBoundingClientRect(), s = e.querySelector('svg svg, svg g svg') ?? e.querySelector('svg'); const pth = [...e.querySelectorAll('path[data-apt]')].map(p => p.getBoundingClientRect()); if (!pth.length) return 0; const x0 = Math.min(...pth.map(b => b.left)), x1 = Math.max(...pth.map(b => b.right)), y0 = Math.min(...pth.map(b => b.top)), y1 = Math.max(...pth.map(b => b.bottom)); void s; return Math.max((x1 - x0) / c.width, (y1 - y0) / c.height); });
  expect(fill).toBeGreaterThan(0.45);
  // qoʻlda masshtab: 1:50 — yozuv aniq, reja kattalashadi (sigʻmasa — chetlari kesiladi)
  const pb = (await plan.boundingBox())!;
  await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.click('#chMatMs [data-ms="50"]');
  await expect.poll(() => page.locator('.ch-body [data-el^="p:apt:"]').first().evaluate(e => e.querySelector('[data-deco="scale"]')?.textContent ?? '')).toMatch(/M 1:50\b/);
  await page.click('#chMatMs button >> nth=0');
  await expect.poll(() => page.locator('.ch-body [data-el^="p:apt:"]').first().evaluate(e => e.querySelector('[data-deco="scale"]')?.textContent ?? '')).toBe(sc);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_kvartirografiya_1024.png` });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/ch_kvartirografiya_dark.png` });
});

/** 19-band (2): xarita oynasida shimol strelkasi va masshtab chizgʻichi; panelda yoqish/oʻchirish va burchak */
test('Chizmadon xarita oynasi: shimol va masshtab chizgʻichi', async ({ page }) => {
  test.setTimeout(150_000);
  await page.route(/^(?!http:\/\/127\.0\.0\.1)(?=.*(?:overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile))/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
  await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await page.click('#chOpen'); await page.click('#chStGo');
  const deco = (k: string) => page.evaluate(k2 => document.querySelectorAll(`.ch-body [data-deco="${k2}"]`).length, k);
  let n = 0;
  for (let i = 0; i < 6 && !n; i++) { n = await deco('scale'); if (!n) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400); } }
  expect(n).toBeGreaterThan(0);
  expect(await deco('north')).toBeGreaterThan(0);
  // kvartirografiya rejasi burilgan — shimol strelkasi ham buriladi (0° emas)
  const rots = await page.evaluate(() => Array.from(document.querySelectorAll('.ch-body [data-deco="north"] g[transform]')).map(g => g.getAttribute('transform')));
  expect(rots.length).toBeGreaterThan(0);
});

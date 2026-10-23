import { test, expect, type Page } from './fx';

/** EN/RU rejimida oʻzbekcha qolgan matnlar yoʻq: Koʻchasoz (A, B — «Rejada joylash»), Chizmadon kirish oynasi */
const UZ = /[ʻ]|\b(va|uchun|bilan|yoki|boʻyicha|bosing|qoʻyiladi|zonadagi|birinchi|joyga|eni|burchak|tanlang|qilish|kerak|yoʻq|emas|soni|tomon|chizing|qoʻshish|oʻchirish|yuklash|saqlash|koʻrinish|maydon|binolar|koʻcha|xona|qavat|hudud|uchastka|joylash|elementni|zona)\b/i;
async function grab(page: Page, tag: string, out: Map<string, string>) {
  await page.waitForTimeout(700);
  const t: string[] = await page.evaluate(() => {
    const res: string[] = [], skip = 'input,textarea,script,style,[contenteditable],[data-notr],.maplibregl-map';
    const w = document.createTreeWalker(document.body, 5);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) { const v = (n.nodeValue || '').trim(); const p = (n as Text).parentElement; if (v && p && !p.closest(skip) && p.offsetParent !== null) res.push(v); }
      else { for (const a of ['title', 'aria-label', 'placeholder']) { const v = (n as Element).getAttribute(a); if (v) res.push(v); } }
    }
    return res;
  });
  for (const v of t) if (UZ.test(v) && !out.has(v)) out.set(v, tag);
}
test('EN/RU: oʻzbekcha matn qolmagan', async ({ page }) => {
  test.setTimeout(240_000);
  await page.route(/overpass|openfreemap|elevation|arcgis|openstreetmap|amazonaws|cartocdn|tile|gibs|nominatim/, r => r.fulfill({ status: 404, body: '' }));
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const lang of ['en', 'ru']) {
    const out = new Map<string, string>();
    await page.addInitScript(l => { try { localStorage.setItem('mr-lang', l); } catch {} }, lang);
    for (const hsh of ['a', 'b', 'varaq']) {
      await page.goto('./kochasoz.html#/' + hsh); await grab(page, 'ks-' + hsh, out);
      if (hsh === 'b') { const b = page.locator('.ws-b main .seg').first().locator('button').nth(1); if (await b.count()) { await b.click(); await grab(page, 'ks-b-reja', out); const z = page.locator('.ws-b .blk'); if (await z.count()) { await z.nth(2).click().catch(() => {}); await grab(page, 'ks-b-reja-z', out); } } }
    }
    await page.goto('./'); await page.click('#newP'); await page.waitForFunction(() => !!(window as any).__mr?.store);
    await page.click('[data-step=uchastka]'); await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
    await page.click('#chOpen'); await grab(page, 'ch-start', out);
    expect([...out.entries()], lang).toEqual([]);
  }
});

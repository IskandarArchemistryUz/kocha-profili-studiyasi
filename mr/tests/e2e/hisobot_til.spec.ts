import { test, expect } from './fx';

/** 01.11 (egasi: «hisobot hujjati oʻzbek tilida turibdi — uni ham tarjima qilish zarur»): PDF hisobot interfeys tilida */
test('hisobot: inglizcha va ruscha — tarjimasiz satr yoʻq', async ({ page, context }) => {
  test.setTimeout(240_000);
  for (const lang of ['en', 'ru']) {
    await page.addInitScript(l => { localStorage.setItem('mr-lang', l); localStorage.setItem('kps_lang', l); localStorage.setItem('i18n-miss', '1'); }, lang);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./'); await page.click('#newP'); await page.click('[data-step=uchastka]');
    await page.fill('#rw', '200'); await page.fill('#rh', '160'); await page.click('#rectSite');
    await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
    await page.waitForTimeout(1200);
    await page.evaluate(() => (window as any).__i18nMiss?.clear());
    const [rep] = await Promise.all([context.waitForEvent('page'), page.evaluate(() => (document.querySelector('#exPdf') as HTMLButtonElement | null)?.click() ?? (window as any).__mr.openReport())]);
    await rep.waitForLoadState();
    expect(await rep.evaluate(() => document.documentElement.lang)).toBe(lang);
    const miss = await page.evaluate(() => [...((window as any).__i18nMiss ?? [])] as string[]);
    if (miss.length) console.log('MISS', lang, JSON.stringify(miss));
    const uz = await rep.evaluate(() => { const out: string[] = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n: Node | null; while ((n = w.nextNode())) { const t = n.textContent!.trim(); if (!/^OʻRQ|— OʻRQ/.test(t) && /[ʻʼ]|\b(va|bilan|uchun|yoʻq|emas|talab|binolar|qavat|kvartira|hovli|koʻcha|maydon|aholi|taxmin|boʻyicha|kishi|oʻrin|joy|soni|qism|ichida|orasi|yetmaydi|bor)\b/i.test(t)) out.push(t); } return out; });
    if (uz.length) console.log('UZ', lang, JSON.stringify(uz));
    expect(uz).toEqual([]);
    if (process.env.GX_SHOTS) { await rep.setViewportSize({ width: 1024, height: 1400 }); await rep.screenshot({ path: `${process.env.GX_SHOTS}/hisobot_${lang}.png`, fullPage: false }); await rep.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55)); await rep.screenshot({ path: `${process.env.GX_SHOTS}/hisobot_${lang}_2.png` }); }
    await rep.close();
  }
});

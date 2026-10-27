/* Umumiy test asosi: sukut tili inglizcha boʻlgani uchun testlar oʻzbekcha matnlar bilan yozilgan —
   har kontekstda til tanlanmagan boʻlsa «uz» qoʻyiladi (test oʻzi boshqa til qoʻysa — oʻsha qoladi). */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';

export const UZ_INIT = () => { try {
  if (!localStorage.getItem('mr-lang') && !localStorage.getItem('kps_lang')) { localStorage.setItem('mr-lang', 'uz'); localStorage.setItem('kps_lang', 'uz'); }
  // eksport testlari fayl tarkibini tekshiradi — sukut boʻyicha «egasi» (belgisiz); belgining oʻzi wm.spec.ts da
  // Esri kaliti testda olinmaydi (kalitsiz zaxira manzil; tarmoqqa chiqilmaydi)
  if (sessionStorage.getItem('kps_esri') == null) sessionStorage.setItem('kps_esri', '');
  if (!sessionStorage.getItem('wm-test') && localStorage.getItem('kps_owner') == null) localStorage.setItem('kps_owner', '1');
} catch { /* */ } };

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(UZ_INIT);
    // Overture binolari (oʻz serverimiz) testda soʻralmaydi — alohida test oʻz javobini beradi (page.route ustun)
    await context.route(/\/data\/overture\//, r => r.fulfill({ status: 404, body: '' }));
    // ERA5 shamol (oʻz serverimiz) — sukut: ulanmagan (503); alohida test oʻz javobini beradi
    await context.route(/\/data\/wind\?/, r => r.fulfill({ status: 503, json: { error: 'disabled' } }));
    await use(context);
  },
  // 27.10: 1-qadam («Joy va uchastka») yangi loyihada allaqachon ochiq — faol qadamni qayta bosish panelni yigʻadi.
  // Testlardagi page.click('[data-step=…]') — «shu qadamga oʻtish» maʼnosida: qadam ochiq boʻlsa bosilmaydi.
  page: async ({ page }, use) => {
    const orig = page.click.bind(page);
    page.click = (async (sel: string, opts?: Parameters<Page['click']>[1]) => {
      if (/^\[data-step=[a-z]+\]$/.test(sel) && (await page.locator(sel).first().getAttribute('aria-expanded', { timeout: 5000 }).catch(() => null)) === 'true') return;
      return orig(sel, opts);
    }) as Page['click'];
    await use(page);
  },
});
export { expect, type Page, type BrowserContext };

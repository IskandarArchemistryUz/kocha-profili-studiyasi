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
    // 31.10: tashqi tarmoq (shriftlar, sunʼiy yoʻldosh plitkalari, OSM, relyef) testda oʻchiq — CI va mahalliy muhit bir xil:
    // CI da kech kelgan javoblar sahnani testning oʻrtasida qayta chizar edi (sahnadagi bosishlar beqaror boʻlardi).
    // Birinchi roʻyxatga olinadi — keyingi aniq (route) va sahifa (page.route) qoidalari undan ustun.
    await context.route(u => !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname) && /^https?:$/.test(u.protocol), r => r.abort());
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
      // 27.10: ikkinchi darajali boshqaruvlar yigʻiq <details> ichida — foydalanuvchi kabi avval ochiladi
      await page.evaluate((q) => { try { const e = document.querySelector(q); if (!e || e.closest('summary')) return; let d = e.closest('details:not([open])'); while (d) { (d as HTMLDetailsElement).open = true; d = d.parentElement?.closest('details:not([open])') ?? null; } } catch { /* Playwright selektori */ } }, sel).catch(() => {});
      return orig(sel, opts);
    }) as Page['click'];
    await use(page);
  },
});
export { expect, type Page, type BrowserContext };

/** Til menyusi (10 til): menyuni ochib, tilni tanlash. Ilovalarda — #langSw, eski sahifalar sarlavhasida — #kpsLang */
export async function pickLang(page: Page, l: string, root = '#langSw'): Promise<void> {
  const r = page.locator(root).first();
  await r.locator('.lm-btn, .eko-lb, .kl-btn').first().click();
  // ilovalarda menyu body ga koʻchadi (.lm-pop), eski sahifalarda — sarlavha ichida
  const inRoot = r.locator(`[data-lang=${l}]`);
  if (await inRoot.count() && await inRoot.first().isVisible()) await inRoot.first().click();
  else await page.locator(`.lm-pop:not([hidden]) [data-lang=${l}]`).click();
}

/** Joyshunos 6B2 (28.10): qatlamlar toifa relsida — boshqa toifadagi qatlamni bosishdan oldin oʻsha toifa ochiladi */
export async function joyGroup(page: Page, id: string): Promise<void> {
  const g = await page.locator(`[data-layer=${id}]`).first().evaluate(e => { const s = e.closest('.joy-g') as HTMLElement | null; return s && s.hidden ? s.dataset.g ?? null : null; });
  if (g) await page.locator(`.joy-rail [data-g=${g}]`).click();
}
/** qatlam qatoridagi boshqaruvni bosish (.switch, .lt, .nm) */
export async function joyClick(page: Page, id: string, sel: string): Promise<void> { await joyGroup(page, id); await page.locator(`[data-layer=${id}] ${sel}`).click(); }
/** «Hisobot» menyusidagi band: PDF, SVG, Chizmadonga, Albom */
export async function joyRep(page: Page, id: 'repPdf' | 'repSvg' | 'repChz' | 'albOpen'): Promise<void> {
  if (!(await page.locator('#repMenu').isVisible())) await page.locator('#repBtn').click();
  await page.locator(`#${id}`).click();
}
/** oʻng paneldagi yorliq — boshqa yoqilgan qatlam kartasini ochish */
export async function joyTab(page: Page, id: string): Promise<void> { await page.locator(`.joy-tabs [data-tab=${id}]`).click(); }

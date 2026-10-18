/* Umumiy test asosi: sukut tili inglizcha boʻlgani uchun testlar oʻzbekcha matnlar bilan yozilgan —
   har kontekstda til tanlanmagan boʻlsa «uz» qoʻyiladi (test oʻzi boshqa til qoʻysa — oʻsha qoladi). */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';

export const UZ_INIT = () => { try { if (!localStorage.getItem('mr-lang') && !localStorage.getItem('kps_lang')) { localStorage.setItem('mr-lang', 'uz'); localStorage.setItem('kps_lang', 'uz'); } } catch { /* */ } };

export const test = base.extend({
  context: async ({ context }, use) => { await context.addInitScript(UZ_INIT); await use(context); },
});
export { expect, type Page, type BrowserContext };

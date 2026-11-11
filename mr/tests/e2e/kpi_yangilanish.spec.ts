import { test, expect } from './fx';
import { fileURLToPath } from 'node:url';

/**
 * 11.11 (L2, L4 — video yozishda): namuna loyihada 4-qadam yashillik 0 % va pastki KPI eski qiymatda qolardi.
 * Sabab: hisob paytida hujjatda faqat varaqlar / vaqt belgisi oʻzgarsa, yangi natija «eskirgan» deb tashlanardi.
 */
const SAMPLE = fileURLToPath(new URL('../../../data/namuna-mahalla.archemistry.json', import.meta.url));
test('namuna: KPI va yashil karkas hisoblanadi, generatsiyadan keyin KPI yangilanadi', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route('**/data/namuna-mahalla.archemistry.json', r => r.fulfill({ path: SAMPLE, contentType: 'application/json' }));
  await page.goto('./#/namuna'); await page.waitForURL(/#\/p\//);
  await expect(page.locator('#kGfa b')).not.toHaveText('—', { timeout: 20_000 });
  await page.click('[data-step=yashil]');
  await expect(page.locator('#greenKpi .kpi b')).not.toHaveText('0 %', { timeout: 20_000 });
  await expect(page.locator('#greenKpi')).toContainText(/Hovli maysasi [1-9]/);
  // yangi loyiha: generatsiya → KPI darhol yangi GFA ni koʻrsatadi
  await page.goto('./'); await page.click('#newP');
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '120'); await page.fill('#rh', '100'); await page.click('#rectSite');
  await page.click('[data-step=hajm]'); await page.selectOption('#genBlock', '0'); await page.click('#genGo');
  await expect(page.locator('#kGfa b')).not.toHaveText('—', { timeout: 20_000 });
  await expect(page.locator('#kPop b')).not.toHaveText('—');
});

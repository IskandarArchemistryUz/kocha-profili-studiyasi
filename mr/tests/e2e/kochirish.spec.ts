import { test, expect } from './fx';

/** Markaz atrofida yoʻllar va uchastka ichida 3 ta mavjud bino (hovli, koʻp kvartirali, doʻkon) */
function fixture(): unknown {
  const c = [69.2797, 41.3111], mx = 1 / 83700, my = 1 / 111100, el: unknown[] = []; let id = 1;
  const sq = (x: number, y: number, w: number, d: number) => [[x, y], [x + w, y], [x + w, y + d], [x, y + d], [x, y]].map(([a, b]) => ({ lon: c[0] + a * mx, lat: c[1] + b * my }));
  for (const k of [-200, 200]) {
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [{ lon: c[0] + k * mx, lat: c[1] - 300 * my }, { lon: c[0] + k * mx, lat: c[1] + 300 * my }] });
    el.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [{ lon: c[0] - 300 * mx, lat: c[1] + k * my }, { lon: c[0] + 300 * mx, lat: c[1] + k * my }] });
  }
  el.push({ type: 'way', id: 501, tags: { building: 'house' }, geometry: sq(-40, -30, 12, 10) });
  el.push({ type: 'way', id: 502, tags: { building: 'apartments', 'building:levels': '5' }, geometry: sq(0, 0, 40, 12) });
  el.push({ type: 'way', id: 503, tags: { building: 'retail' }, geometry: sq(-40, 20, 10, 10) });
  return { elements: el };
}
const CSV = 'sana,manba,hudud,kategoriya,api_jami,oqildi,yaroqli,median_usd_m2,p25_usd_m2,p75_usd_m2,atrof_1500m_soni,atrof_1500m_median_usd_m2\n2026-10-16,uybor.uz,Mirobod,hovli,17,17,10,1295,1176,1700,4,1281\n2026-10-16,uybor.uz,Mirobod,kvartira,238,238,179,2071,1601,2733,35,1739\n';

test('koʻchirish xarajati: monitoring narxi, OʻRQ-781 → OʻRQ-1149, TEP', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(/overpass|interpreter/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture()) }));
  await page.route(/raw\.githubusercontent\.com/, r => r.fulfill({ status: 200, contentType: 'text/plain', body: CSV }));
  await page.route(/arcgisonline|terrain|amazonaws|elevation/, r => r.abort());
  await page.goto('./'); await page.click('#newP');
  await page.click('#ctxLoad'); await page.waitForSelector('#ctxSt', { timeout: 60000 });
  await page.click('[data-step=uchastka]');
  await page.fill('#rw', '160'); await page.fill('#rh', '140'); await page.click('#rectSite');
  await page.click('[data-step=parsel]');
  await expect(page.locator('#demo')).toContainText('buziladi 3');
  await expect(page.locator('#compBox')).toBeVisible();
  await expect(page.locator('#compBox')).toContainText('Narx kiritilmagan');
  await page.click('#compMon');
  await expect(page.locator('#compBox')).toContainText('Fitrat atrofi 1,5 km');
  await expect(page.locator('[data-comp=priceFlat]')).toHaveValue('1739');
  await page.fill('[data-comp=priceNonres]', '1500'); await page.press('[data-comp=priceNonres]', 'Tab');
  await expect(page.locator('#compBox')).not.toContainText('Narx kiritilmagan');
  await expect(page.locator('#compTab')).toContainText('5 %');
  await page.click('[data-regime=orq1149]');
  await expect(page.locator('#compTab')).toContainText('12 %');
  await page.click('#kMore');
  await expect(page.locator('.drawer [data-rule=renov-green-7]')).toContainText('7-modda');
  await page.click('#kMore');
  await page.click('[data-step=eksport]');
  const [rep] = await Promise.all([page.waitForEvent('popup'), page.click('#exPdf')]);
  await expect(rep.locator('body')).toContainText('Koʻchiriladigan xonadonlar');
});

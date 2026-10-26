import { test, expect } from './fx';

/** Koʻchasoz B (26.10): «Kanal / daryo» zonasi (kesim, reja, aksonometriya, varaq) va oʻz kesimi — boʻsh kesim, nom, «Mening kesimlarim» */
const st = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__ks.m.inst.state);
const svgText = (page: import('@playwright/test').Page) => page.locator('.ws-b svg[role=img]');

test('B: kanal zonasi — qoʻshish, belgilar, uch koʻrinish', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ sel: 3, view: 0 }));
  await page.locator('.ws-b aside.panel').last().getByRole('button', { name: '+ Kanal' }).click();
  const s1 = await st(page); expect(s1.els[4][0]).toBe('kanal'); expect(s1.els[4][1]).toBe(6);
  expect(s1.els[4][2].panjara).toBe(true); expect(s1.els[4][2].bufer).toBe(true);
  await expect(page.locator('.ws-b aside.panel').last()).toContainText('Kanal / daryo');
  await expect(svgText(page)).toContainText('KN');               // kesim kodi
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 1 }));
  await expect(svgText(page)).toContainText('Kanal');
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 2 }));
  await expect(svgText(page)).toContainText('Aksonometriya');
  // qiya qirgʻoq
  const rp = page.locator('.ws-b aside.panel').last();
  await rp.getByRole('button', { name: 'Yashil qiya' }).click();
  expect((await st(page)).els[4][2].qirgoq).toBe('yashil');
  for (const n of ['Zinapoya (oʻtiriladigan)', 'Tosh bilan mustahkamlangan', 'Botqoq tokcha (qamish)', 'Beton devor']) await rp.getByRole('button', { name: n }).click();
  expect((await st(page)).els[4][2].qirgoq).toBe('devor');
  // meʼyor: suv sarfi va chuqurlik bosib kiritiladi
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 0 }));
  await page.locator('[data-ed=kq]').click(); await page.locator('.ks-numed').fill('120'); await page.locator('.ks-numed').press('Enter');
  await page.locator('[data-ed=kd]').click(); await page.locator('.ks-numed').fill('6'); await page.locator('.ks-numed').press('Enter');
  await expect(rp.locator('.ks-kres')).toContainText('70–100 m');
  await expect(rp.locator('.ks-kres')).toContainText('9,5–12 m');
  await rp.locator('[data-knl] .seg button', { hasText: 'Daryo' }).click();
  await expect(rp.locator('.ks-kres')).toContainText('300–500 m');
  await expect(rp).toContainText('VM 981-son qarori');
  // kanal eni 40 m dan katta boʻlishi mumkin
  await page.locator('[data-ed=zw]').click(); await page.locator('.ks-numed').fill('60'); await page.locator('.ks-numed').press('Enter');
  expect((await st(page)).els[4][1]).toBe(60);
  // albom varagʻi ham kanal bilan ochiladi
  await page.goto('./kochasoz.html?beta=0#/varaq');
  await expect(page.locator('.ws-varaq svg[role=img]')).toBeVisible();
});

test('B: kanal — qirgʻoq polosasi ichidagi yoʻl tekshiruvda ogohlantiriladi', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ view: 0, sel: 1, els: [['piy', 3, {}], ['kanal', 8, { dep: 3, panjara: true, bufer: true }], ['qat', 3.5, {}], ['qat', 3.5, {}], ['piy', 3, {}]], rl: 21, eL: 'bino', eR: 'bino' }));
  await expect(page.locator('.ws-b aside.panel').last()).toContainText('Qirgʻoq boʻyi polosasi ≥ 6,5 m: Harakat');
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ els: [['piy', 7, {}], ['kanal', 8, { dep: 3, panjara: true }], ['piy', 7, {}], ['qat', 3.5, {}], ['qat', 3.5, {}], ['piy', 3, {}]], rl: 32 }));
  await expect(page.locator('.ws-b aside.panel').last()).toContainText('Qirgʻoq boʻyi polosasi ≥ 6,5 m');
  await expect(page.locator('.ws-b aside.panel').last()).not.toContainText('Qirgʻoq boʻyi polosasi ≥ 6,5 m: Harakat');
});

test('B: oʻz kesimi — boʻsh kesim, nom, saqlash va oʻchirish; tungi rejim', async ({ page }) => {
  await page.route(/fonts\.g/, r => r.abort());
  await page.addInitScript(() => localStorage.setItem('mr-theme', 'dark'));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('./kochasoz.html?beta=0#/b');
  await expect(page.locator('.ws-b')).toBeVisible();
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ tOpen: true, tg: 'my', MY: [] }));
  await expect(page.locator('.ws-b aside.panel').first()).toContainText('Hali saqlangan kesim yoʻq');
  await page.click('[data-blank]');
  const s1 = await st(page); expect(s1.els.length).toBe(4); expect(s1.rl).toBe(13); expect(s1.tplName).toBe('Yangi kesim');
  await page.locator('[data-ed=nm]').click();
  const ed = page.locator('.ks-numed'); await expect(ed).toBeVisible();
  await ed.fill('Bobur koʻchasi'); await ed.press('Enter');
  expect((await st(page)).tplName).toBe('Bobur koʻchasi');
  await page.click('[data-savemine]');
  const s2 = await st(page); expect(s2.MY.length).toBe(1); expect(s2.MY[0][0]).toBe('Bobur koʻchasi');
  await expect(page.locator('.ks-tplw .tpl')).toHaveCount(1);
  // boshqa namunaga oʻtib, qaytib yuklash
  await page.evaluate(() => (window as any).__ks.m.inst.setState({ els: [['piy', 5, {}]], rl: 5 }));
  await page.locator('.ks-tplw .tpl').first().click();
  expect((await st(page)).els.length).toBe(4);
  await page.locator('.ks-tplw .ks-tpldel').first().click();
  expect((await st(page)).MY.length).toBe(0);
});

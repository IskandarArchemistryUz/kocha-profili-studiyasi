import { test, expect, type Page } from '@playwright/test';

async function newProject(page: Page) {
  await page.goto('./');
  await page.click('#newP');
  await expect(page).toHaveURL(/#\/p\/p_/);
  await expect(page.locator('.panel h2')).toHaveText('Hudud');           // yangi loyiha — avval joy tanlanadi
  await page.click('[data-step=uchastka]');
  await expect(page.locator('.panel h2')).toHaveText('Uchastka');
}

/** sahna markazi atrofida ekranda bino chizish */
async function drawBuilding(page: Page, dx = 0) {
  const box = (await page.locator('#scene canvas').boundingBox())!;
  const cx = box.x + box.width / 2 + dx, cy = box.y + box.height / 2;
  await page.click('#drawBld');
  await page.mouse.click(cx - 40, cy - 30); await page.mouse.click(cx + 40, cy + 30);
  await page.click('#drawBld');
}

test('yangi loyiha: nom saqlanadi va sahifa yangilanganda tiklanadi', async ({ page }) => {
  await newProject(page);
  const name = page.locator('.pname');
  await name.fill('Fitrat sinov'); await name.press('Enter');
  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 5000 });
  await page.reload();
  await expect(page.locator('.pname')).toHaveValue('Fitrat sinov');
});

test('uchastka, bino, koʻrsatkichlar, undo/redo va yangilanish', async ({ page }) => {
  await newProject(page);
  await page.click('#rectSite');                                        // 120 × 100 m
  await expect(page.locator('#kSite b')).toHaveText('1,20');
  await page.click('[data-step=hajm]');
  await drawBuilding(page);
  await expect(page.locator('#kGfa b')).not.toHaveText('—');
  const pop = await page.locator('#kPop b').textContent();
  expect(Number(pop!.replace(/\s/g, ''))).toBeGreaterThan(0);
  await page.keyboard.press('Control+z');                               // binoni bekor qilish
  await expect(page.locator('#kGfa b')).toHaveText('—');
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('#kGfa b')).not.toHaveText('—');
  await expect(page.locator('.save')).toHaveAttribute('data-s', 'saved', { timeout: 5000 });
  await page.reload();
  await expect(page.locator('#kSite b')).toHaveText('1,20');
  await expect(page.locator('.list .it')).toHaveCount(1);
});

test('meʼyoriy reyestr: §84 natijasi chiqadi', async ({ page }) => {
  await newProject(page);
  await page.click('#rectSite');
  await page.click('[data-step=hajm]');
  await drawBuilding(page);
  await page.click('#kMore');
  const row = page.locator('.drawer [data-rule=density-84]');
  await expect(row).toContainText('ShNQ 2.07.01-23, 84-band');
  await expect(row.locator('.chip')).toHaveAttribute('data-s', /pass|fail/);
});

test('eksport → import: fayldan nusxa ochiladi', async ({ page }) => {
  await newProject(page);
  await page.locator('.pname').fill('Eksport sinovi'); await page.locator('.pname').press('Enter');
  await page.click('#rectSite');
  await page.click('[data-step=eksport]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exJson')]);
  const path = await dl.path();
  await page.click('#back');
  await expect(page.locator('#newP')).toBeVisible();
  await page.setInputFiles('#file', path!);
  await expect(page.locator('.pname')).toHaveValue('Eksport sinovi');
  await expect(page.locator('#kSite b')).toHaveText('1,20');
  await page.click('#back');
  await expect(page.locator('.card', { hasText: 'Eksport sinovi' })).toHaveCount(2);
});

test('qulflangan qadam: bosqich raqami koʻrsatiladi', async ({ page }) => {
  await newProject(page);
  await page.click('[data-step=kocha]');
  await expect(page.locator('.panel .locked')).toContainText('2-bosqichda');
});

/** Regressiya: Akso → Reja oʻtishda kamera 3000 m uzoqlashib, uchastka nuqtadek kichrayib qolardi */
test('Reja koʻrinishi uchastkani ekranga moslab koʻrsatadi', async ({ page }) => {
  await newProject(page);
  await page.click('#rectSite');                                        // 120 × 100 m
  await page.click('[data-view=plan]');
  const r = await page.evaluate(() => {
    const ed = (window as any).__mr, c: HTMLCanvasElement = ed.scene.renderer.domElement, b = c.getBoundingClientRect();
    const a = ed.scene.pick(b.left + b.width / 2, b.top + b.height / 2), z = ed.scene.pick(b.left + b.width / 2 + 100, b.top + b.height / 2);
    return { mPer100px: Math.hypot(z[0] - a[0], z[1] - a[1]), w: b.width };
  });
  const sitePx = 120 / r.mPer100px * 100;
  expect(sitePx).toBeGreaterThan(r.w * 0.2);
  expect(sitePx).toBeLessThan(r.w * 1.2);
});

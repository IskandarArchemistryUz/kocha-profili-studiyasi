import { test, expect } from './fx';

/** 13.11: Maslahatchi Joyshunosda — tugma server yoqqanda; tez savol → buyruqlar brauzerda (qatlamlar, xizmatlar) → javob */
const API = 'https://api.test';
test('Joyshunos: Maslahatchi — qatlamlar va xizmatlar buyrugʻi', async ({ page }) => {
  const steps: { messages: { role: string; content: unknown }[] }[] = [], runs: unknown[] = [];
  await page.route(/fonts\.g|openfreemap|arcgis|overpass|kumi\.systems|nominatim|gibs|elevation-tiles|githubusercontent/, r => r.abort());
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url());
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: 20, trialsLeft: 1, owner: false });
    if (u.pathname === '/agent/config') return json(200, { enabled: true, services: ['mr', 'joy'], scenarios: { 'joy.ask': { svc: 'joy', tier: 'short', coins: 1 }, 'joy.passport': { svc: 'joy', tier: 'long', coins: 3 } }, freePerWeek: 3, maxSteps: 10, freeLeft: 3 });
    if (u.pathname === '/agent/run') { runs.push(r.request().postDataJSON()); return json(200, { run: '7', free: true, charged: 0, capped: false, balance: 20, freeLeft: 2, maxSteps: 10 }); }
    if (u.pathname === '/agent/step') {
      steps.push(r.request().postDataJSON());
      if (steps.length === 1) return json(200, { content: [{ type: 'tool_use', id: 'a', name: 'joyshunos_layers', input: {} }, { type: 'tool_use', id: 'b', name: 'nearby_services', input: { kind: 'all' } }], stop: 'tool_use', status: 'open', stepsLeft: 9 });
      return json(200, { content: [{ type: 'text', text: 'Xizmatlar qatlami **oʻchiq** — yoqing.' }], stop: 'end_turn', status: 'done', stepsLeft: 8 });
    }
    return json(404, {});
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); localStorage.setItem('mr-agent-intro', '1'); }, API);
  await page.goto('./joyshunos.html');
  await expect(page.locator('#agentBtn')).toBeVisible();
  // xarita plitkalari yuklanayotganda sarlavha qayta chiziladi — bosish DOM orqali
  await page.locator('#agentBtn').evaluate(b => (b as HTMLButtonElement).click());
  await expect(page.locator('#agentPanel')).toBeVisible();
  await page.locator('.ag-chip[data-q=svc]').evaluate(b => (b as HTMLButtonElement).click());
  await expect(page.locator('#agentPanel .ag-ans')).toContainText('oʻchiq');
  expect(runs).toEqual([{ scenario: 'joy.ask', areaHa: expect.any(Number) }]);
  const res = (steps[1].messages.at(-1)!.content as { tool_use_id: string; content: string }[]);
  const layers = JSON.parse(res.find(x => x.tool_use_id === 'a')!.content), svc = JSON.parse(res.find(x => x.tool_use_id === 'b')!.content);
  expect(layers).toHaveProperty('layers');
  expect(layers.area.radius_m).toBeGreaterThan(0);
  expect(typeof svc.available === 'boolean' || Array.isArray(svc.items)).toBe(true);
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/agent-joy.png` });
});

test('Joyshunos: namuna rasm → xarita uslubi → «Bekor qilish»', async ({ page }) => {
  const steps: { messages: { role: string; content: unknown }[] }[] = [];
  await page.route(/fonts\.g|openfreemap|arcgis|overpass|kumi\.systems|nominatim|gibs|elevation-tiles|githubusercontent/, r => r.abort());
  await page.route(`${API}/**`, async r => {
    const u = new URL(r.request().url());
    const cors = { 'access-control-allow-origin': new URL(page.url()).origin, 'access-control-allow-credentials': 'true' };
    const json = (status: number, body: unknown) => r.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (u.pathname === '/me') return json(200, { id: 1, email: 'ali@mail.uz', phone: null, name: null, balance: 20, trialsLeft: 1, owner: false });
    if (u.pathname === '/agent/config') return json(200, { enabled: true, services: ['joy'], scenarios: { 'joy.ask': { svc: 'joy', tier: 'short', coins: 1 }, 'joy.style': { svc: 'joy', tier: 'short', coins: 1 } }, freePerWeek: 3, maxSteps: 10, freeLeft: 3 });
    if (u.pathname === '/agent/run') return json(200, { run: '8', free: true, charged: 0, capped: false, balance: 20, freeLeft: 2, maxSteps: 10 });
    if (u.pathname === '/agent/step') {
      steps.push(r.request().postDataJSON());
      if (steps.length === 1) return json(200, { content: [{ type: 'tool_use', id: 's', name: 'set_map_style', input: { palette: 'kok', bg: '#112233', bld: 'red' } }], stop: 'tool_use', status: 'open', stepsLeft: 9 });
      return json(200, { content: [{ type: 'text', text: 'Koʻk chizma palitrasi, fon #112233.' }], stop: 'end_turn', status: 'done', stepsLeft: 8 });
    }
    return json(404, {});
  });
  await page.addInitScript(a => { localStorage.setItem('kps_auth', '1'); localStorage.setItem('kps_api', a); localStorage.setItem('kps_owner', '0'); localStorage.setItem('mr-agent-intro', '1'); localStorage.setItem('kps_base', JSON.stringify({ mode: 'stil', pal: 'arch' })); }, API);
  await page.goto('./joyshunos.html');
  await expect(page.locator('#agentBtn')).toBeVisible();
  await page.locator('#agentBtn').evaluate(b => (b as HTMLButtonElement).click());
  await page.setInputFiles('#agFile', 'tests/e2e/fixtures/terrarium.png');
  await expect(page.locator('#agImg img')).toBeVisible();
  await page.locator('#agSend').evaluate(b => (b as HTMLButtonElement).click());
  await expect(page.locator('#agentPanel .ag-ans')).toContainText('112233');
  const first = steps[0].messages.at(-1)!.content as { type: string; source?: { media_type: string; data: string }; text?: string }[];
  expect(first[0].type).toBe('image');
  expect(first[0].source!.media_type).toBe('image/jpeg');
  expect(first[1].text).toContain('rasm uslubida');
  const tr0 = JSON.parse((steps[1].messages.at(-1)!.content as { content: string }[])[0].content);
  expect(tr0).toMatchObject({ ok: true, rejected: ['bld'] });
  const base = () => page.evaluate(() => JSON.parse(localStorage.getItem('kps_base') || '{}'));
  expect(await base()).toMatchObject({ pal: 'kok', custom: { bg: '#112233' } });
  await expect(page.locator('#agUndo')).toBeVisible();
  if (process.env.GX_SHOTS) await page.screenshot({ path: `${process.env.GX_SHOTS}/agent-joy-style.png` });
  await page.locator('#agUndoBtn').evaluate(b => (b as HTMLButtonElement).click());
  expect(await base()).toMatchObject({ pal: 'arch', custom: {} });
  // keyingi savolda rasm qayta yuborilmaydi
  await expect(page.locator('#agImg')).toBeHidden();
});

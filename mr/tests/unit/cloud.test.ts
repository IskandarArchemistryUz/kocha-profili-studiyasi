import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { blankProject } from '../../src/core/doc';
import { putProject, getProject, listProjects, putLayerData, getLayerData, _reset } from '../../src/storage/db';
import * as cloud from '../../src/storage/cloud';
import { saveText } from '../../src/ui/cloudui';
import { UL_KINDS } from '../../src/core/userlayers';
const KIND = UL_KINDS[0].id;

/** soxta server + R2 (server/src/projects.js mantigʻi qisqartirilgan) */
function fakeServer() {
  const r2 = new Map<string, Uint8Array>();
  const rows = new Map<string, { id: string; type: string; name: string; meta: any; version: number; key: string; bytes: number; updated: string }>();
  const pending = new Map<string, { id: string; base: number; bytes: number }>();
  let n = 0;
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const item = (r: any) => ({ id: r.id, type: r.type, name: r.name, meta: r.meta, version: r.version, bytes: r.bytes, created: r.updated, updated: r.updated, deleted: null });
  const f = async (url: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const u = new URL(String(url)); const method = init.method ?? 'GET';
    if (u.host === 'r2.test') {
      const key = decodeURIComponent(u.pathname.slice(5));
      if (method === 'PUT') { r2.set(key, new Uint8Array(init.body as Uint8Array)); return new Response(null, { status: 200 }); }
      const b = r2.get(key); return b ? new Response(b as BodyInit, { status: 200 }) : new Response('', { status: 404 });
    }
    const body = init.body ? JSON.parse(String(init.body)) : {};
    let m;
    if (u.pathname === '/projects' && method === 'GET') return json(200, { items: [...rows.values()].filter(r => r.type === (u.searchParams.get('type') ?? r.type)).map(item), usage: { bytes: [...rows.values()].reduce((a, r) => a + r.bytes, 0), count: rows.size, quota: 500 * 2 ** 20, max: 300 } });
    if ((m = u.pathname.match(/^\/projects\/([\w-]+)\/upload$/))) {
      const cur = rows.get(m[1]);
      if ((cur?.version ?? 0) !== body.base_version) return json(409, { error: 'conflict', message: 'loyiha boshqa qurilmada oʻzgargan', version: cur?.version ?? 0 });
      const key = `projects/1/${m[1]}/${++n}.json.gz`; pending.set(key, { id: m[1], base: body.base_version, bytes: body.bytes });
      return json(200, { key, put: { url: `https://r2.test/put/${key}`, headers: { 'content-type': 'application/gzip' } } });
    }
    if ((m = u.pathname.match(/^\/projects\/([\w-]+)\/commit$/))) {
      const pd = pending.get(body.key)!; const cur = rows.get(m[1]);
      if ((cur?.version ?? 0) !== pd.base) return json(409, { error: 'conflict', message: 'x', version: cur?.version ?? 0 });
      const r = { id: m[1], type: body.type, name: body.name, meta: body.meta, version: pd.base + 1, key: body.key, bytes: r2.get(body.key)!.byteLength, updated: new Date().toISOString() };
      rows.set(m[1], r); return json(200, { project: item(r) });
    }
    if ((m = u.pathname.match(/^\/projects\/([\w-]+)$/)) && method === 'GET') {
      const r = rows.get(m[1]); if (!r) return json(404, { error: 'not_found', message: 'loyiha topilmadi' });
      return json(200, { project: item(r), version: r.version, url: `https://r2.test/get/${r.key}` });
    }
    return json(404, { error: 'nf', message: 'nf' });
  };
  return { f: f as typeof fetch, r2, rows };
}
let srv: ReturnType<typeof fakeServer>;
const wipe = async () => { await _reset(); await new Promise(ok => { const r = indexedDB.deleteDatabase('archemistry-mr'); r.onsuccess = r.onerror = r.onblocked = () => ok(null); }); };
beforeEach(async () => { await wipe(); srv = fakeServer(); cloud._setFetch(srv.f); });
const tick = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('bulut — koʻchirish va boshqa qurilmada ochish', () => {
  it('gzip ↔ gunzip', async () => {
    const t = JSON.stringify({ a: 'Yunusobod'.repeat(500) });
    const z = await cloud.gzip(t);
    expect(z.byteLength).toBeLessThan(t.length / 10);
    expect(await cloud.gunzip(z)).toBe(t);
  });
  it('tanlab koʻchirish: R2 ga siqilgan fayl, server versiyasi 1, bogʻlanish yoziladi; brauzerdagi nusxa qoladi', async () => {
    const p = blankProject('Yunusobod 14'); await putProject(p);
    const it1 = await cloud.moveToCloud(p.id);
    expect(it1).toMatchObject({ id: p.id, name: 'Yunusobod 14', version: 1, meta: { buildings: 0, hasSite: false } });
    expect(await cloud.getLink(p.id)).toMatchObject({ version: 1 });
    expect(srv.r2.size).toBe(1);
    expect(await getProject(p.id)).not.toBeNull();
  });
  it('boshqa qurilma: brauzer boʻsh — bulutdan yuklanadi, import qilingan qatlam obyektlari bilan', async () => {
    const p = { ...blankProject('Noutbukda'), userLayers: [{ id: 'L1', name: 'Kadastr', kind: KIND, bbox: [69.2, 41.3, 69.21, 41.31], count: 1 } as any] };
    await putProject(p); await putLayerData(p.id, 'L1', [{ id: 1, h: 9 }]);
    await cloud.moveToCloud(p.id);
    await wipe();   // yangi qurilma
    expect(await listProjects()).toEqual([]);
    const got = await cloud.download(p.id);
    expect(got).toMatchObject({ id: p.id, name: 'Noutbukda' });
    expect(await getLayerData(p.id, 'L1')).toEqual([{ id: 1, h: 9 }]);
    expect(await cloud.getLink(p.id)).toMatchObject({ version: 1 });
  });
});

describe('bulut — avtomatik sinxron va ziddiyat', () => {
  it('bogʻlanmagan loyiha bulutga ketmaydi (faqat tanlab koʻchirilganlar)', async () => {
    const p = blankProject('Faqat brauzer'); await putProject(p);
    const st: string[] = []; const s = cloud.cloudSync(p.id, x => st.push(x), { delay: 5 });
    await tick(10); s.push({ ...p, name: 'B' }); await tick(30);
    expect(s.state).toBe('local'); expect(srv.r2.size).toBe(0); s.dispose();
  });
  it('bogʻlangan: oʻzgarish → bulutda versiya oshadi', async () => {
    const p = blankProject('A'); await putProject(p); await cloud.moveToCloud(p.id);
    const s = cloud.cloudSync(p.id, () => {}, { delay: 5 });
    await tick(10); s.push({ ...p, name: 'A2' }); await tick(40); await s.flush();
    expect(s.state).toBe('cloud');
    expect(srv.rows.get(p.id)).toMatchObject({ name: 'A2', version: 2 });
    s.dispose();
  });
  it('ikki qurilma: eski versiyadan saqlash → «conflict»; «Bulutdagisini ochish» — shu nusxa alohida loyiha boʻlib qoladi', async () => {
    const p = blankProject('Umumiy'); await putProject(p); await cloud.moveToCloud(p.id);
    srv.rows.get(p.id)!.version = 5; srv.rows.get(p.id)!.name = 'Noutbukdagi';   // boshqa qurilma saqladi (fayl oʻsha)
    const s = cloud.cloudSync(p.id, () => {}, { delay: 5, makeCopy: async d => { await putProject({ ...d, id: 'p_copy00001', name: `${d.name} (nusxa)` }); } });
    await tick(10); s.push({ ...p, name: 'Uydagi' }); await tick(40); await s.flush();
    expect(s.state).toBe('conflict');
    await s.resolve('theirs');
    expect((await getProject('p_copy00001'))!.name).toBe('Uydagi (nusxa)');
    expect(await cloud.getLink(p.id)).toMatchObject({ version: 5 });
    expect(s.state).toBe('cloud'); s.dispose();
  });
  it('«Shu nusxani bulutga yozish» — bulutdagi versiya ustiga (eski nusxa serverda qoladi)', async () => {
    const p = blankProject('Umumiy'); await putProject(p); await cloud.moveToCloud(p.id);
    srv.rows.get(p.id)!.version = 3;
    const s = cloud.cloudSync(p.id, () => {}, { delay: 5 });
    await tick(10); s.push({ ...p, name: 'Meniki' }); await tick(40); await s.flush();
    expect(s.state).toBe('conflict');
    await s.resolve('mine');
    expect(srv.rows.get(p.id)).toMatchObject({ name: 'Meniki', version: 4 }); s.dispose();
  });
  it('internet yoʻq — «offline», keyin qayta urinadi', async () => {
    const p = blankProject('A'); await putProject(p); await cloud.moveToCloud(p.id);
    let down = true; cloud._setFetch(((u: any, i: any) => (down ? Promise.reject(new TypeError('net')) : srv.f(u, i))) as typeof fetch);
    const s = cloud.cloudSync(p.id, () => {}, { delay: 5, retryMs: 20 });
    await tick(10); s.push({ ...p, name: 'B' }); await tick(30);
    expect(s.state).toBe('offline');
    down = false; await tick(60); await s.flush();
    expect(s.state).toBe('cloud'); expect(srv.rows.get(p.id)!.name).toBe('B'); s.dispose();
  });
  it('holat matni', () => {
    expect(saveText('saved', 'cloud').s).toBe('saved');
    expect(saveText('saved', 'cloud').t).not.toBe(saveText('saved', 'local').t);
    expect(saveText('pending', 'cloud').s).toBe('pending');
    expect(saveText('saved', 'conflict').s).toBe('error');
  });
});

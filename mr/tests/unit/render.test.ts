import { describe, it, expect, beforeEach } from 'vitest';
import { renderApi, setFetch, waitJob, type Job } from '../../src/render/api';
import { loadState } from '../../src/render/providers';

/** 13.11 (Render 1-bosqich): kalitsiz — hamma soʻrov serverga; provayder va kalit yoʻq */
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 } as Storage;
const json = (status: number, b: unknown) => Promise.resolve(new Response(JSON.stringify(b), { status }));

describe('Render studiyasi · holat', () => {
  beforeEach(() => store.clear());
  it('eski kps_air dan faqat tugmalar olinadi — kalit va provayder yoʻq', () => {
    store.set('kps_air', JSON.stringify({ prov: 'openai', key: { openai: 'sk-xxx' }, model: { openai: 'gpt' }, sty: 'toshkent', extra: 'gʻisht', keep: false, n: 2 }));
    const s = loadState();
    expect(s).toEqual({ sty: 'toshkent', extra: 'gʻisht', fid: 'muvozanat', subj: 'reja', n: 2, engine: 'pro' });
    expect(JSON.stringify(s)).not.toContain('sk-xxx');
  });
  it('notoʻgʻri qiymatlar sukutga qaytadi', () => {
    store.set('ren-state', JSON.stringify({ engine: 'turbo', n: 7, fid: 'x', subj: 'y', sty: 'neon' }));
    expect(loadState()).toMatchObject({ engine: 'pro', n: 1, fid: 'qatiy', subj: 'reja', sty: 'foto' });
  });
});

describe('Render studiyasi · server', () => {
  it('yuklash: imzolangan havola → R2 ga PUT (server orqali emas)', async () => {
    const calls: { url: string; method?: string; body?: unknown }[] = [];
    setFetch(((url: string, o: RequestInit = {}) => {
      calls.push({ url, method: o.method, body: o.body });
      if (url.endsWith('/render/upload-url')) return json(200, { key: 'in/u1/a.webp', url: 'https://r2.test/put', headers: { 'content-type': 'image/webp' } });
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as typeof fetch);
    const blob = new Blob([new Uint8Array(10)], { type: 'image/webp' });
    expect(await renderApi.upload(blob)).toBe('in/u1/a.webp');
    expect(JSON.parse(String(calls[0].body))).toEqual({ type: 'image/webp', bytes: 10 });
    expect(calls[1]).toMatchObject({ url: 'https://r2.test/put', method: 'PUT', body: blob });
  });
  it('xato: 402 — need va balance bilan', async () => {
    setFetch((() => json(402, { error: 'insufficient', message: 'tanga yetarli emas', need: 2, balance: 1 })) as typeof fetch);
    await expect(renderApi.create({ engine: 'pro', input: { key: 'k', w: 1, h: 1 }, subj: 'reja', style: '', fid: 'qatiy', source: 'mr' })).rejects.toMatchObject({ code: 'insufficient', status: 402, details: { need: 2, balance: 1 } });
  });
  it('holat soʻrovi: tugaguncha, aloqa uzilsa ham davom etadi', async () => {
    const seq: (Job | Error)[] = [{ status: 'running' } as Job, new Error('net'), { status: 'done', id: '5' } as Job];
    const api = { ...renderApi, job: async () => { const x = seq.shift()!; if (x instanceof Error) throw x; return x; } };
    const ticks: string[] = [];
    const j = await waitJob('5', t => ticks.push(t.status), undefined, api, 1);
    expect(j.status).toBe('done'); expect(ticks).toEqual(['running', 'done']);
  });
});

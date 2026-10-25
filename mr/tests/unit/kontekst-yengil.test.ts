import { describe, it, expect } from 'vitest';
import { fetchContext } from '../../src/context/load';

/** Kechki roʻyxat (26.10): koʻcha tahlili relyef va sunʼiy yoʻldosh tasvirini kutmaydi (yengil kontekst) */
describe('Yengil kontekst (koʻcha tahlili)', () => {
  const fake = (calls: string[]) => (async (u: RequestInfo | URL) => {
    const url = String(u); calls.push(url);
    if (/overpass|interpreter/.test(url)) return new Response(JSON.stringify({ elements: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('', { status: 404 });
  }) as typeof fetch;
  it('lite: relyef va tasvir plitkalari soʻralmaydi, «yetishmaydi» roʻyxatida ham yoʻq; toʻliq rejimda — soʻraladi', async () => {
    const a: string[] = [], b: string[] = [];
    const L = await fetchContext([69.28, 41.31], 300, () => {}, fake(a), true);
    expect(a.some(u => /elevation-tiles|terrarium/.test(u))).toBe(false);
    expect(a.some(u => /World_Imagery|arcgisonline|tile\/\d+/.test(u))).toBe(false);
    expect(L.missing.join(' ')).not.toMatch(/relyef|sunʼiy yoʻldosh/);
    expect(L.terrain).toBeNull(); expect(L.osm).toBeTruthy();
    // toʻliq rejimda relyef soʻraladi (node da canvas yoʻq — yuklanmaydi va «yetishmaydi» ga tushadi)
    const F = await fetchContext([69.28, 41.31], 300, () => {}, fake(b), false);
    expect(F.missing.join(' ')).toMatch(/relyef/);
  });
});

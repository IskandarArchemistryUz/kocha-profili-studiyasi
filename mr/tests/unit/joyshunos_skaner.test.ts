import { describe, it, expect } from 'vitest';
import { buildNet } from '../../src/core/services';
import { skScan, skScore, skColor, SK_DIMS, SK_SKIP } from '../../src/joyshunos/skaner';
import { fetchPoi, POI_R, POI_WIDE } from '../../src/context/poi';

const sq = (x: number, y: number, s = 10) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]] as [number, number][];

describe('Joyshunos · ijtimoiy skaner', () => {
  it('ball: radius ichida 100, 3 × radiusda 0, oraligʻi chiziqli', () => {
    expect(skScore(200, 300)).toBe(100);
    expect(skScore(300, 300)).toBe(100);
    expect(skScore(600, 300)).toBe(50);
    expect(skScore(900, 300)).toBe(0);
    expect(skScore(Infinity, 300)).toBe(0);
  });
  it('rang sinflari past → yuqori', () => {
    expect(skColor(10)).toBe('#b4552e');
    expect(skColor(100)).toBe('#dedbd4');
  });
  it('masofa tarmoq boʻylab: aylanma yoʻl toʻgʻri chiziqdan uzun', () => {
    // U shaklidagi koʻcha: bino (0,20) yonida, maktab (200,20) yonida, lekin ular orasida yoʻl faqat pastdan (y = -400) aylanadi
    const net = buildNet([[[0, 0], [0, -400], [200, -400], [200, 0]]]);
    const r = skScan(net, [sq(-5, 5)], { maktab: [[205, 10]] });
    const d = r.b[0].d.maktab!;
    expect(d).toBeGreaterThan(900);   // ~ 400 + 200 + 400 + bogʻlanish
    expect(r.b[0].s[SK_DIMS.findIndex(x => x.id === 'maktab')]).toBeLessThan(100);
  });
  it('transport — bekat va metro ballarining kattasi; topilmagan xizmat 0', () => {
    const net = buildNet([[[0, 0], [2000, 0]]]);
    const r = skScan(net, [sq(0, 5)], { metro: [[600, 0]], bekat: [[1900, 0]] });
    const t = SK_DIMS.findIndex(x => x.id === 'transport'), m = SK_DIMS.findIndex(x => x.id === 'maktab');
    expect(r.b[0].s[t]).toBe(100);       // metro 600 m ≤ 800 m
    expect(r.b[0].s[m]).toBe(0);         // maktab yoʻq
    expect(r.b[0].weak).not.toBe(t);
    expect(r.bins.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('Joyshunos · ijtimoiy skaner — uzilgan tarmoq', () => {
  it('manba tarmoqning boshqa boʻlagida — toʻgʻri masofa × 1,3', () => {
    const net = buildNet([[[0, 0], [100, 0]], [[0, 500], [100, 500]]]);   // ikki alohida koʻcha
    const r = skScan(net, [sq(40, 5)], { maktab: [[50, 495]] });
    expect(r.b[0].d.maktab).toBeCloseTo(Math.hypot(50 - 45, 495 - 10) * 1.3, 0);
  });
  it('24.11: hudud oʻrtachasi qavat maydoni boʻyicha — katta uy kichik uydan ogʻirroq', () => {
    const net = buildNet([[[0, 0], [2000, 0]]]), iM = SK_DIMS.findIndex(x => x.id === 'maktab');
    const rings = [sq(0, 5), sq(1500, 5)], pois = { maktab: [[10, 0]] as [number, number][] };   // 1-bino maktab yonida (100), 2-bino 1,5 km narida (0)
    expect(skScan(net, rings, pois).mean[iM]).toBe(50);
    expect(skScan(net, rings, pois, [900, 100]).mean[iM]).toBe(90);
    expect(skScan(net, rings, pois, [900, 100]).bins.reduce((a, v) => a + v, 0)).toBe(2);   // sinflar — bino soni boʻyicha
  });
  it('24.11: garaj, ombor, maktab binosi baholanmaydi; «yes» va turar joy qoladi', () => {
    for (const k of ['garage', 'garages', 'shed', 'warehouse', 'industrial', 'school', 'kindergarten', 'retail', 'roof']) expect(SK_SKIP.test(k)).toBe(true);
    for (const k of ['yes', 'apartments', 'house', 'residential', 'detached', 'dormitory', 'terrace']) expect(SK_SKIP.test(k)).toBe(false);
  });
  it('24.11: xizmat obyektlari yoʻllardan kengroq kvadratda soʻraladi (chekka effekti)', async () => {
    let body = '';
    const f = (async (_u: unknown, o: { body: string }) => { body = decodeURIComponent(o.body); return { ok: true, json: async () => ({ elements: [] }) }; }) as unknown as typeof fetch;
    await fetchPoi([69.28, 41.31], f);
    const span = (line: string) => { const m = /\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)/.exec(line)!; return (+m[3] - +m[1]) * 111_132 / 2; };
    const L = body.split('\n'), school = L.find(x => x.includes('school|kindergarten|clinic'))!, road = L.find(x => x.includes('way["highway"]'))!;
    expect(POI_WIDE).toBeGreaterThanOrEqual(1250 + 1500);   // 1 250 m doira chekkasidan poliklinika radiusigacha
    expect(Math.abs(span(school) - POI_WIDE)).toBeLessThan(20);
    expect(Math.abs(span(road) - POI_R)).toBeLessThan(20);
    expect(body).not.toContain('[bbox:');
  });
});

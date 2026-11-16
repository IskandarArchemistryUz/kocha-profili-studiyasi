import { describe, it, expect } from 'vitest';
import { ringSteps, mapSvg, type MapBase } from '../../src/joyshunos/albomMap';
import { narxPolysFine, narxPolys, type NarxData } from '../../src/joyshunos/narx';

/** 16.11 (egasi): albom xaritasi — masofa halqalari, markaz nuqtasi, doira boʻyicha kesish; uy narxi 500 m kataklari */
describe('albom xaritasi', () => {
  it('masofa halqalari: doiraga qarab 2–4 ta, oxirgisi — doira radiusi', () => {
    expect(ringSteps(500)).toEqual([250, 500]);
    expect(ringSteps(900)).toEqual([250, 500, 750, 900]);
    expect(ringSteps(1250)).toEqual([500, 1000, 1250]);
    expect(ringSteps(3000)).toEqual([1000, 2000, 3000]);
  });
  const B: MapBase = { bld: [[[10, 10], [30, 10], [30, 30], [10, 30]]], roads: [], water: [], green: [], site: null, R: 500, span: 1200 };
  it('uchastka yoʻq — markaz nuqtasi bor; uchastka bor — yoʻq', () => {
    const dot = /<circle[^>]*fill="#c0643a"/;
    expect(mapSvg(B, {}, { dark: false, frame: 'doira' }, 0, 0, 200)).toMatch(dot);
    expect(mapSvg({ ...B, site: [[-50, -50], [50, -50], [0, 60]] }, {}, { dark: false, frame: 'doira' }, 0, 0, 200)).not.toMatch(dot);
  });
  it('tahlil grafikasi doira ichida kesiladi, halqa yozuvlari bor, rasm bir marta', () => {
    const s = mapSvg(B, { rasters: [{ url: 'data:image/png;base64,AAAA', x0: -520, y0: -520, x1: 520, y1: 520 }] }, { dark: false, frame: 'kvadrat' }, 0, 0, 200);
    expect(s).toMatch(/<clipPath id="(rc\d+)"><circle[^>]*r="83\.33"\/><\/clipPath><g clip-path="url\(#\1\)">/);
    expect(s).toContain('>250 m<'); expect(s).toContain('>500 m<');
    expect(s.match(/data:image\/png/g)?.length).toBe(1);
  });
});

describe('uy narxi: 500 m kataklar', () => {
  const d: NarxData = { v: 1, sana: '2026-11-16', min: 5, kat: { kvartira: { '1000': [[5, 27, 8, 2000, 1900, 2100], [6, 27, 9, 1500, 1400, 1600], [5, 28, 0]], '500': [[10, 54, 6, 2300, 2200, 2400], [11, 54, 3]] } } };
  const toL = (p: [number, number]) => [(p[0] - 69.27) * 84000, (p[1] - 41.31) * 111000] as [number, number];
  it('500 m boʻlmasa — asosiy kataklar oʻzi', () => {
    const d2: NarxData = { ...d, kat: { kvartira: { '1000': d.kat.kvartira!['1000'] } } };
    expect(narxPolysFine(d2, 'kvartira', toL, 1e6)).toEqual(narxPolys(d2, 'kvartira', toL, 1e6));
  });
  it('500 m da faqat ≥ 5 eʼlonli kataklar asosiy kataklar ustidan qoʻshiladi', () => {
    const p = narxPolysFine(d, 'kvartira', toL, 1e6), f = p.filter(x => x.fine);
    expect(p.length).toBe(4); expect(f.length).toBe(1); expect(f[0].m).toBe(2300);
  });
});

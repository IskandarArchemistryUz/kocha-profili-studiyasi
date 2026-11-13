import { describe, it, expect } from 'vitest';
import { walkNet, strictNet, hardRoad, reach, flow, type Road } from '../../src/joyshunos/models';
import { roadFlags, parseAttr, attrWeight } from '../../src/context/poi';

/** 13.11: bola trassadan yurmaydi — qattiq tarmoq; oqim — tortuvchi joylar va boshlangʻich vazn */
describe('Joyshunos · qattiq piyoda tarmogʻi', () => {
  it('OSM teglari → bayroqlar', () => {
    expect(roadFlags({ highway: 'trunk', bridge: 'yes' })).toBe('b');
    expect(roadFlags({ highway: 'primary', foot: 'no' })).toBe('n');
    expect(roadFlags({ highway: 'primary', sidewalk: 'separate' })).toBe('s');
    expect(roadFlags({ highway: 'service', access: 'private', foot: 'yes' })).toBe('');
    expect(roadFlags({ highway: 'residential' })).toBe('');
  });
  it('trassa, magistral estakada — qattiq; oddiy koʻcha — yoʻq', () => {
    expect(hardRoad({ cls: 'trunk', pts: [] })).toBe(true);
    expect(hardRoad({ cls: 'primary', f: 'b', pts: [] })).toBe(true);
    expect(hardRoad({ cls: 'primary', pts: [] })).toBe(false);
    expect(hardRoad({ cls: 'residential', f: 'b', pts: [] })).toBe(false);
  });
  it('foot=no yoʻl umuman tarmoqqa kirmaydi', () => {
    expect(walkNet([{ cls: 'primary', f: 'n', pts: [[0, 0], [300, 0]] }, { cls: 'footway', pts: [[0, 0], [0, 200]] }]).segs.length).toBe(1);
  });
  it('bola trassa boʻylab yurmaydi, kattalar yuradi; aylanma yoʻl bilan yetadi', () => {
    // markazdan sharqqa — trassa 600 m; shimoldan aylanma koʻcha (0,0)→(0,300)→(600,300)→(600,0)
    const roads: Road[] = [
      { cls: 'trunk', pts: [[0, 0], [600, 0]] },
      { cls: 'residential', pts: [[0, 0], [0, 300]] }, { cls: 'residential', pts: [[0, 300], [600, 300]] }, { cls: 'residential', pts: [[600, 300], [600, 0]] },
    ];
    const net = walkNet(roads), st = strictNet(net, roads);
    expect(st.off!.reduce((a, b) => a + b, 0)).toBe(1);
    const far = net.xy.findIndex(p => p[0] === 600 && p[1] === 0);
    const A = reach(net, [5, 10, 15]), B = reach(st, [5, 10, 15]);
    expect(A.D[far]).toBeCloseTo(600, 0);
    expect(B.D[far]).toBeCloseTo(1200, 0);
    const trunkSeg = net.segs.findIndex(([a, b]) => net.xy[a][1] === 0 && net.xy[b][1] === 0);
    expect(A.seg[trunkSeg]).toBeGreaterThanOrEqual(0);
    expect(B.seg[trunkSeg]).toBe(-1);
  });
});

describe('Joyshunos · oqim tortuvchilari', () => {
  it('savdo markazi, bozor, ovqatlanish — vazn bilan; yoʻllar — yoʻq', () => {
    expect(attrWeight({ shop: 'mall' })).toBeGreaterThan(attrWeight({ amenity: 'cafe' }));
    expect(attrWeight({ highway: 'primary', amenity: 'cafe' })).toBe(0);
    const a = parseAttr({ elements: [{ type: 'node', id: 1, lat: 41.3, lon: 69.2, tags: { amenity: 'restaurant' } }, { type: 'way', id: 2, center: { lat: 41.31, lon: 69.21 }, tags: { shop: 'mall' } }, { type: 'node', id: 3, lat: 41, lon: 69, tags: { amenity: 'school' } }] });
    expect(a.map(x => x.w)).toEqual([1.5, 12]);
  });
  it('boshlangʻich vazn: zich tomondagi qirralar oqimi kuchliroq', () => {
    const roads: Road[] = [];
    for (let x = -500; x < 500; x += 100) roads.push({ cls: 'residential', pts: [[x, 0], [x + 100, 0]] });
    const net = walkNet(roads), at = (x: number, F: Float32Array) => F[net.segs.findIndex(([a, b]) => Math.min(net.xy[a][0], net.xy[b][0]) === x)];
    const F = flow(net, 600, [], 60, 900, 7, p => (p[0] < 0 ? 10 : 0.01));
    expect(at(-400, F)).toBeGreaterThan(at(300, F));
  });
});

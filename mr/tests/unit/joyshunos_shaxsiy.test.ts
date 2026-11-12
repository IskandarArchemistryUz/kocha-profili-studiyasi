import { describe, it, expect } from 'vitest';
import { pickProps, parseUpload, attachPriv, type PrivData } from '../../src/joyshunos/shaxsiy';

const sq = (x: number, y: number, d: number) => [[x, y], [x + d, y], [x + d, y + d], [x, y + d], [x, y]];

describe('Joyshunos · shaxsiy maʼlumot', () => {
  it('ustunlar: faqat ruxsat etilganlari, shaxsga oid maydonlar tashlanadi', () => {
    expect(pickProps({ QAVATLAR: 9, KV_SONI: 102, QURILGAN_Y: 2018, DEVOR: 'beton', SUBYEKT: 'Aliyev A.', STIR: 1234 })).toEqual({ qavat: 9, xonadon: 102, yil: 2018, devor: 'beton' });
  });
  it('yuklash fayli: proyeksiyalangan koordinata — tushunarli xato; olinmagan ustunlar roʻyxati', () => {
    const fc = (c: number[][]) => JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { qavat: 5, STIR: 1 }, geometry: { type: 'Polygon', coordinates: [c] } }] });
    expect(() => parseUpload(fc(sq(350000, 4570000, 10)))).toThrow(/WGS84/);
    const r = parseUpload(fc(sq(69.28, 41.31, 0.0002)));
    expect(r.features[0].properties).toEqual({ qavat: 5 });
    expect(r.dropped).toEqual(['STIR']);
    expect(() => parseUpload('{"type":"Feature"}')).toThrow(/FeatureCollection/);
  });
  it('OSM binosiga ulash: markaz poligon ichida; bir uy ikki boʻlakda — xonadon ulushi maydon boʻyicha', () => {
    const d: PrivData = { layers: [{ id: 1, name: 'x', source: 's' }], features: [{ l: 1, p: { xonadon: 100 }, g: { type: 'Polygon', coordinates: [sq(69, 41, 0.001)] } }] };
    const a = attachPriv([sq(69.0001, 41.0001, 0.0002) as never, sq(69.0005, 41.0005, 0.0002) as never, sq(69.01, 41.01, 0.0002) as never], [300, 100, 50], d);
    expect(a[0]?.share).toBeCloseTo(0.75); expect(a[1]?.share).toBeCloseTo(0.25); expect(a[2]).toBeNull();
  });
});

/**
 * DXF (R12, ASCII) eksport — AutoCAD, ArchiCAD, QGIS ochadi.
 * Koordinatalar — mahalliy metr (X sharq, Y shimol), loyiha markazidan; markaz WGS84 da «_MARKAZ» qatlamidagi matnda.
 * Binolar — yopiq POLYLINE, balandligi (38) va qalinligi (39) bilan: 3D koʻrinishda hajm boʻlib chiqadi.
 */
import type { Project } from './doc';
import { frame, centroid, type XY } from './geo';
import { computePlan } from './plan';
import { useDef } from './uses';

const LAYERS: [string, number][] = [['_MARKAZ', 7], ['UCHASTKA', 1], ['QIZIL_CHIZIQ', 1], ['KOCHA_OQI', 8], ['KVARTAL', 3], ['BINO', 7], ['BINO_NOTURAR', 30], ['BINO_YOZUV', 7], ['SAQLANADI', 5]];

export function toDxf(doc: Project, kept: { rings: XY[][]; h: number }[] = []): string {
  const fr = frame(doc.origin), fh = doc.settings.floorHeight, out: string[] = [];
  const w = (...kv: (string | number)[]) => { for (let i = 0; i < kv.length; i += 2) out.push(String(kv[i]), typeof kv[i + 1] === 'number' ? fmtN(kv[i + 1] as number) : String(kv[i + 1])); };
  const layer = (n: string) => n.replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
  const poly = (L: string, pts: XY[], closed: boolean, elev = 0, thick = 0) => {
    w(0, 'POLYLINE', 8, layer(L), 66, 1, 10, 0, 20, 0, 30, elev, 70, closed ? 1 : 0); if (thick) w(39, thick);
    for (const p of pts) w(0, 'VERTEX', 8, layer(L), 10, p[0], 20, p[1], 30, elev);
    w(0, 'SEQEND', 8, layer(L));
  };
  const text = (L: string, p: XY, h: number, s: string, z = 0) => w(0, 'TEXT', 8, layer(L), 10, p[0], 20, p[1], 30, z, 40, h, 1, s);
  const uses = [...new Set(computePlan(doc).blocks.map(b => `KVARTAL_${b.use}`))];
  // sarlavha va qatlamlar jadvali
  w(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 6, 0, 'ENDSEC');
  w(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, LAYERS.length + uses.length);
  for (const [n, c] of [...LAYERS, ...uses.map((u, i) => [u, 40 + i * 10] as [string, number])]) w(0, 'LAYER', 2, layer(n), 70, 0, 62, c, 6, 'CONTINUOUS');
  w(0, 'ENDTAB', 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');
  text('_MARKAZ', [0, 0], 2, `Archemistry Lab: ${doc.name}. Markaz (0,0) = WGS84 ${doc.origin[1].toFixed(6)}, ${doc.origin[0].toFixed(6)}. Birlik: metr.`);
  doc.site?.rings.forEach(r => poly('UCHASTKA', r.map(fr.toLocal), true));
  doc.streets.forEach(s => poly('KOCHA_OQI', s.axis.map(fr.toLocal), false));
  const plan = computePlan(doc);
  plan.corridors.forEach(mp => mp.forEach(r => poly('QIZIL_CHIZIQ', r, true)));
  plan.blocks.forEach(b => { b.rings.forEach(r => poly(`KVARTAL_${b.use}`, r, true)); text('BINO_YOZUV', b.centroid, 3, useDef(b.use).name); });
  for (const b of doc.buildings) {
    const r = b.footprint.map(fr.toLocal), z0 = (b.z0 ?? 0) * fh, nr = Math.min(b.nonRes, b.floors);
    if (nr > 0) poly('BINO_NOTURAR', r, true, z0, nr * fh);
    if (b.floors > nr) poly('BINO', r, true, z0 + nr * fh, (b.floors - nr) * fh);
    text('BINO_YOZUV', centroid(r), 1.8, `${b.floors} q.`, z0 + b.floors * fh);
  }
  kept.forEach(k => k.rings.slice(0, 1).forEach(r => poly('SAQLANADI', r, true, 0, k.h)));
  w(0, 'ENDSEC', 0, 'EOF');
  return out.join('\r\n') + '\r\n';
}

const fmtN = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(3);

/**
 * IFC4 eksport (STEP, ISO 10303-21) — ArchiCAD, Revit, BlenderBIM ochadi.
 * Tuzilma: IfcProject → IfcSite (WGS84 koordinatasi bilan) → har seksiya IfcBuilding → har qavat IfcBuildingStorey
 * → qavat hajmi IfcBuildingElementProxy (tashqi kontur × qavat balandligi, SweptSolid).
 * Xususiyatlar: «Archemistry_Bino» (funksiya, qavatlar, noturar qavatlar, GFA, material, tom) va qavat uchun turi.
 * Koordinatalar — mahalliy metr (X sharq, Y shimol, Z yuqoriga), markaz — loyiha markazi.
 */
import type { Project } from './doc';
import { frame, area, signedArea } from './geo';
import { useDef } from './uses';

const B64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
/** Barqaror GlobalId: matndan 128 bit (FNV-1a, toʻrt xil urugʻ) → IFC base64 (22 belgi) */
export function ifcGuid(seed: string): string {
  const bytes: number[] = [];
  for (let k = 0; k < 4; k++) {
    let h = 0x811c9dc5 ^ (k * 0x9e3779b1);
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
    bytes.push((h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255);
  }
  const enc = (n: number, d: number) => { let s = ''; for (let i = 0; i < d; i++) { s = B64[n % 64] + s; n = Math.floor(n / 64); } return s; };
  let out = enc(bytes[0], 2);
  for (let i = 0; i < 5; i++) out += enc((bytes[1 + 3 * i] << 16) | (bytes[2 + 3 * i] << 8) | bytes[3 + 3 * i], 4);
  return out;
}

/** STEP matni: ' → '', ASCII dan tashqari belgilar → \X2\hhhh\X0\ */
export function stepStr(s: string): string {
  let out = '', run = '';
  const flush = () => { if (run) { out += `\\X2\\${run}\\X0\\`; run = ''; } };
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 32 && c <= 126) { flush(); out += ch === "'" ? "''" : ch === '\\' ? '\\\\' : ch; }
    else if (c <= 0xffff) run += c.toString(16).toUpperCase().padStart(4, '0');
  }
  flush();
  return `'${out}'`;
}

const num = (v: number) => { const s = (Math.round(v * 1e4) / 1e4).toString(); return s.includes('.') || s.includes('e') ? s : s + '.'; };
const dms = (deg: number) => { const sg = deg < 0 ? -1 : 1, a = Math.abs(deg), d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.floor(((a - d) * 60 - m) * 60), us = Math.round(((((a - d) * 60 - m) * 60) - s) * 1e6); return `(${[d, m, s, us].map(x => x * sg).join(',')})`; };

export function toIfc(doc: Project, now = new Date()): string {
  const fr = frame(doc.origin), fh = doc.settings.floorHeight, L: string[] = [];
  let id = 0; const e = (s: string) => { L.push(`#${++id}=${s};`); return `#${id}`; };
  const guid = (k: string) => `'${ifcGuid(`${doc.id}|${k}`)}'`;
  // asosiy obyektlar
  const o = e('IFCCARTESIANPOINT((0.,0.,0.))'), zDir = e('IFCDIRECTION((0.,0.,1.))'), xDir = e('IFCDIRECTION((1.,0.,0.))');
  const ax = e(`IFCAXIS2PLACEMENT3D(${o},${zDir},${xDir})`);
  const ctx = e(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${ax},$)`);
  const body = e(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${ctx},$,.MODEL_VIEW.,$)`);
  const units = e(`IFCUNITASSIGNMENT((${[e('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)'), e('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)'), e('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)'), e('IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)')].join(',')}))`);
  const project = e(`IFCPROJECT(${guid('project')},$,${stepStr(doc.name)},${stepStr('Archemistry Lab · Master reja')},$,$,$,(${ctx}),${units})`);
  const sitePl = e(`IFCLOCALPLACEMENT($,${ax})`);
  const site = e(`IFCSITE(${guid('site')},$,${stepStr('Uchastka')},$,$,${sitePl},$,$,.ELEMENT.,${dms(doc.origin[1])},${dms(doc.origin[0])},0.,$,$)`);
  e(`IFCRELAGGREGATES(${guid('agg-site')},$,$,$,${project},(${site}))`);

  const buildings: string[] = [];
  doc.buildings.forEach((b, bi) => {
    let r = b.footprint.map(fr.toLocal); if (r.length < 3) return;
    if (signedArea(r) < 0) r = [...r].reverse();
    const a = area(r), u = useDef(b.use), z0 = (b.z0 ?? 0) * fh, k = `b${bi}-${b.id}`;
    const bPl = e(`IFCLOCALPLACEMENT(${sitePl},${ax})`);
    const name = `${u.name} ${bi + 1}`;
    const bld = e(`IFCBUILDING(${guid(k)},$,${stepStr(name)},${stepStr(b.gen?.kind ? `seksiya: ${b.gen.kind}` : 'bino')},$,${bPl},$,$,.ELEMENT.,${num(z0)},$,$)`);
    buildings.push(bld);
    // umumiy profil (qavatlar uchun bitta)
    const pts = r.map(p => e(`IFCCARTESIANPOINT((${num(p[0])},${num(p[1])}))`));
    const poly = e(`IFCPOLYLINE((${[...pts, pts[0]].join(',')}))`);
    const prof = e(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${poly})`);
    const storeys: string[] = [];
    for (let f = 0; f < b.floors; f++) {
      const z = z0 + f * fh, nonRes = f < b.nonRes;
      const sOrigin = e(`IFCCARTESIANPOINT((0.,0.,${num(z)}))`);
      const sPl = e(`IFCLOCALPLACEMENT(${bPl},${e(`IFCAXIS2PLACEMENT3D(${sOrigin},${zDir},${xDir})`)})`);
      const st = e(`IFCBUILDINGSTOREY(${guid(`${k}-s${f}`)},$,${stepStr(`${(b.z0 ?? 0) + f + 1}-qavat`)},$,$,${sPl},$,$,.ELEMENT.,${num(z)})`);
      storeys.push(st);
      const solid = e(`IFCEXTRUDEDAREASOLID(${prof},${ax},${zDir},${num(fh)})`);
      const rep = e(`IFCSHAPEREPRESENTATION(${body},'Body','SweptSolid',(${solid}))`);
      const shape = e(`IFCPRODUCTDEFINITIONSHAPE($,$,(${rep}))`);
      const elPl = e(`IFCLOCALPLACEMENT(${sPl},${ax})`);
      const el = e(`IFCBUILDINGELEMENTPROXY(${guid(`${k}-e${f}`)},$,${stepStr(`${name} · ${(b.z0 ?? 0) + f + 1}-qavat`)},${stepStr(nonRes ? 'noturar' : u.res > 0 ? 'turar joy' : u.name)},$,${elPl},${shape},$,.ELEMENT.)`);
      e(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${guid(`${k}-c${f}`)},$,$,$,(${el}),${st})`);
      const fp = e(`IFCPROPERTYSINGLEVALUE('Turi',$,IFCLABEL(${stepStr(nonRes ? 'noturar' : 'asosiy')}),$)`), fa = e(`IFCPROPERTYSINGLEVALUE('Maydon',$,IFCAREAMEASURE(${num(a)}),$)`);
      e(`IFCRELDEFINESBYPROPERTIES(${guid(`${k}-dp${f}`)},$,$,$,(${el}),${e(`IFCPROPERTYSET(${guid(`${k}-ps${f}`)},$,'Archemistry_Qavat',$,(${fp},${fa}))`)})`);
    }
    if (storeys.length) e(`IFCRELAGGREGATES(${guid(`${k}-agg`)},$,$,$,${bld},(${storeys.join(',')}))`);
    const P = (n: string, v: string) => e(`IFCPROPERTYSINGLEVALUE(${stepStr(n)},$,${v},$)`);
    const props = [
      P('Funksiya', `IFCLABEL(${stepStr(u.name)})`), P('Qavatlar', `IFCINTEGER(${b.floors})`), P('NoturarQavatlar', `IFCINTEGER(${b.nonRes})`),
      P('StilobatUstida', `IFCINTEGER(${b.z0 ?? 0})`), P('Dog', `IFCAREAMEASURE(${num(a)})`), P('GFA', `IFCAREAMEASURE(${num(a * b.floors)})`),
      P('Balandlik', `IFCLENGTHMEASURE(${num(((b.z0 ?? 0) + b.floors) * fh)})`), P('Material', `IFCLABEL(${stepStr(b.mat ?? 'suvoq')})`), P('Tom', `IFCLABEL(${stepStr(b.roof ?? 'tekis')})`),
    ];
    e(`IFCRELDEFINESBYPROPERTIES(${guid(`${k}-dp`)},$,$,$,(${bld}),${e(`IFCPROPERTYSET(${guid(`${k}-ps`)},$,'Archemistry_Bino',$,(${props.join(',')}))`)})`);
  });
  if (buildings.length) e(`IFCRELAGGREGATES(${guid('agg-bld')},$,$,$,${site},(${buildings.join(',')}))`);

  const ts = now.toISOString().slice(0, 19);
  return ['ISO-10303-21;', 'HEADER;', "FILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');",
    `FILE_NAME(${stepStr(doc.name + '.ifc')},'${ts}',(''),(''),'Archemistry Lab','Archemistry Lab Master reja','');`,
    "FILE_SCHEMA(('IFC4'));", 'ENDSEC;', 'DATA;', ...L, 'ENDSEC;', 'END-ISO-10303-21;', ''].join('\n');
}

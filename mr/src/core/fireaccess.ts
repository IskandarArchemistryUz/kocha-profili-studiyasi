/**
 * 11.11 (L5) / 12.11 (yongʻin marshrutlari varagʻi): balandligi 28 m dan past koʻp kvartirali turar joy binosiga yongʻin-qutqaruv
 * avtomobilining yetib kelishi — ShNQ 2.07.01-23, 666-band (kamida bitta uzun tomondan, butun uzunligi boʻylab), 675-band (kelish
 * joyining ichki chetidan devorgacha 5–8 m), 669-band (asosiy kirish bilan birlashgan piyoda yoʻlagi oʻtish yoʻli eniga qoʻshiladi — TALQIN).
 * Yetib keladigan sirt: loyiha koʻchalari va oʻtish yoʻllarining qatnov qismi va trotuari + hovlidagi yongʻin yoʻlagi.
 * `fire-666-low` qoidasi va «Yongʻin marshrutlari» varagʻi shu natijadan foydalanadi.
 */
import type { Project } from './doc';
import { bLevels } from './levels';
import { landscape, docDrive } from './landscape';
import { frame, type XY } from './geo';
import { pointIn } from './plan';
import { useDef } from './uses';

/** 675-band: H < 28 m — kelish joyining ichki chetidan devorgacha koʻpi bilan, m */
export const FIRE_LOW_D = 8;
export interface FireLow {
  /** tekshiriladigan binolar (F1.3, 3+ qavat, H < 28 m) */
  ids: string[];
  /** uzun tomoni yetib kelmaydiganlar */
  bad: string[];
  /** yetib keladigan uzun tomon (mahalliy metr) — bino → [a, b] */
  side: Map<string, [XY, XY]>;
  /** yetib keladigan sirt (mahalliy metr): koʻchalar va hovli yongʻin yoʻlaklari */
  drive: XY[][][]; lanes: XY[][][];
}
export function fireLowAccess(doc: Project): FireLow {
  const fr = frame(doc.origin), Ht = (b: Project['buildings'][number]) => bLevels(doc.settings, b).top;
  // F1.3 — koʻp kvartirali turar joy (past uylar — yakka/blokli — boshqa qoida; 28 m dan baland — fire-666)
  const bs = doc.buildings.filter(b => useDef(b.use).res > 0 && b.gen?.kind !== 'stilobat' && !b.gen?.plot && b.gen?.kind !== 'uy' && b.gen?.kind !== 'taunhaus' && b.use !== 'yakka' && b.floors >= 3 && Ht(b) < 28 && !((b.z0 ?? 0) > 0));
  const lanes: XY[][][] = doc.settings.yards ? landscape(doc).flatMap(y => y.fire && !y.z ? y.fire.lane : []) : [];
  const street = bs.length ? docDrive(doc) : [];
  const drive: XY[][][] = [...street, ...lanes];
  const segD = (p: XY, a: XY, b: XY) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]); };
  const dist = (p: XY): number => { let m = Infinity; for (const poly of drive) { if (poly[0] && pointIn(p, [poly[0]])) return 0; for (const r of poly) for (let i = 0; i < r.length; i++) m = Math.min(m, segD(p, r[i], r[(i + 1) % r.length])); } return m; };
  const bad: string[] = [], side = new Map<string, [XY, XY]>();
  for (const b of bs) {
    const r = b.footprint.map(fr.toLocal), n = r.length, len = (i: number) => Math.hypot(r[(i + 1) % n][0] - r[i][0], r[(i + 1) % n][1] - r[i][1]);
    const mx = Math.max(...r.map((_, i) => len(i))), sides = r.map((_, i) => i).filter(i => len(i) >= 0.6 * mx);
    // uzun tomon butun uzunligi boʻylab (666-band): tomon boʻyicha 5 nuqta
    const hit = sides.find(i => { const a = r[i], c = r[(i + 1) % n]; return [0.05, 0.27, 0.5, 0.73, 0.95].every(t => dist([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]) <= FIRE_LOW_D + 0.5); });
    if (hit == null) bad.push(b.id); else side.set(b.id, [r[hit], r[(hit + 1) % n]]);
  }
  return { ids: bs.map(b => b.id), bad, side, drive: street, lanes };
}

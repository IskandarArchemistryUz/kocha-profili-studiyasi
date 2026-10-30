/**
 * Sahnadagi chizish asboblari. Bosish (sudramasdan) — nuqta qoʻyadi, sudrash — kamerani aylantiradi/suradi,
 * shuning uchun chizish paytida ham koʻrinishni boshqarish mumkin.
 */
import type { XY } from '../core/geo';
import { isSimple, area, signedArea } from '../core/geo';
import type { Scene3D } from '../scene/scene';

export interface Tool {
  readonly hint: string;
  /** nuqtalar uchlar va qirralarga yopishsin (muharrir snapPt ni qoʻllaydi) */
  readonly snapTo?: boolean;
  click(xy: XY, e: PointerEvent): void;
  move?(xy: XY): void;
  key?(e: KeyboardEvent): boolean;
  cancel(): void;
  /** «Tugatish» tugmasi: boshlangan chizmani saqlash (yetarli nuqta boʻlsa) */
  commit?(): void;
}

/** Ikki marta bosish: Chrome pointerup da e.detail = 0 boʻladi — vaqt (≤ 400 ms) va masofa (≤ 8 px) boʻyicha aniqlanadi */
class Dbl {
  private t = 0; private x = 0; private y = 0;
  is(e: PointerEvent): boolean {
    const now = e.timeStamp || performance.now(), d = now - this.t < 400 && Math.hypot(e.clientX - this.x, e.clientY - this.y) < 8;
    this.t = d ? 0 : now; this.x = e.clientX; this.y = e.clientY;
    return d || e.detail >= 2;
  }
}

/** Klaviaturadan oʻlcham: «32», «32,5», «32<90» (uzunlik < burchak, ° — sharqdan soat strelkasiga qarshi) */
export function parseLen(buf: string): { len: number; ang: number | null } | null {
  const m = /^\s*(\d+(?:[.,]\d*)?)\s*(?:<\s*(-?\d+(?:[.,]\d*)?))?\s*$/.exec(buf); if (!m) return null;
  const len = Number(m[1].replace(',', '.')), ang = m[2] != null ? Number(m[2].replace(',', '.')) : null;
  return len > 0 && len < 10000 ? { len, ang } : null;
}
/** «32x18», «32*18», «32 18» — eni × boʻyi */
export function parseWH(buf: string): [number, number] | null {
  const m = /^\s*(\d+(?:[.,]\d*)?)\s*[x×*хX ]\s*(\d+(?:[.,]\d*)?)\s*$/.exec(buf); if (!m) return null;
  const a = Number(m[1].replace(',', '.')), b = Number(m[2].replace(',', '.'));
  return a > 0 && b > 0 && a < 10000 && b < 10000 ? [a, b] : null;
}

/**
 * Erkin koʻpburchak: bosib nuqta qoʻyish; birinchi nuqtani bosish, Enter yoki ikki marta bosish — yopish.
 * Oʻlcham bilan (egasi, 25.10): birinchi nuqtadan keyin uzunlikni yozing (masalan «32» yoki «32<90») va Enter —
 * keyingi nuqta kursor yoʻnalishida (yoki berilgan burchakda) shu masofada qoʻyiladi. Panelda ham maydon bor (`addSide`).
 */
export class PolygonTool implements Tool {
  readonly snapTo = true;
  private pts: XY[] = [];
  private cur: XY | null = null;
  private dbl = new Dbl();
  /** yozilayotgan oʻlcham */
  buf = '';
  constructor(private scene: Scene3D, private done: (r: XY[]) => void, private err: (m: string) => void, private minArea = 50) {}
  get started(): boolean { return this.pts.length > 0; }
  get hint(): string {
    if (this.buf) return `Uzunlik: ${this.buf} m — Enter · «<» bilan burchak (masalan 32<90) · Esc — oʻchirish`;
    return this.pts.length === 0 ? 'Bosing — birinchi nuqta · keyin tomon uzunligini yozib Enter (masalan 32 yoki 32<90) · Esc — bekor'
      : this.pts.length < 3 ? 'Bosing yoki uzunlikni yozib Enter — keyingi nuqta · Backspace — oxirgisini oʻchirish · Esc — bekor'
        : 'Birinchi nuqtani bosing yoki Enter — yopish · uzunlik yozib Enter — yana tomon · Backspace — oxirgisi · Esc — bekor';
  }
  click(xy: XY, e: PointerEvent): void {
    const dbl = this.dbl.is(e);
    if (this.pts.length >= 3 && (this.scene.screenDist(this.pts[0], e.clientX, e.clientY) < 12 || dbl)) { this.finish(); return; }
    this.buf = ''; this.pts.push(xy); this.draw();
  }
  move(xy: XY): void { this.cur = xy; this.draw(); }
  /** Yoʻnalish birlik vektori: burchak berilsa — u (°, sharqdan CCW), aks holda kursor tomon, boʻlmasa oldingi tomon davomi */
  private dir(ang: number | null): XY {
    if (ang != null) { const a = ang * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
    const p = this.pts[this.pts.length - 1];
    if (this.cur) { const dx = this.cur[0] - p[0], dy = this.cur[1] - p[1], L = Math.hypot(dx, dy); if (L > 0.01) return [dx / L, dy / L]; }
    if (this.pts.length >= 2) { const q = this.pts[this.pts.length - 2], dx = p[0] - q[0], dy = p[1] - q[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; }
    return [1, 0];
  }
  /** Oxirgi nuqtadan uzunlik (va ixtiyoriy burchak) boʻyicha keyingi nuqta. false — hali nuqta yoʻq yoki notoʻgʻri */
  addSide(len: number, ang: number | null = null): boolean {
    if (!this.pts.length || !(len > 0)) { this.err(this.pts.length ? 'Uzunlik musbat son boʻlsin' : 'Avval sahnada birinchi nuqtani bosing'); return false; }
    const p = this.pts[this.pts.length - 1], d = this.dir(ang);
    this.pts.push([p[0] + d[0] * len, p[1] + d[1] * len]); this.buf = ''; this.draw(); return true;
  }
  key(e: KeyboardEvent): boolean {
    const k = e.key;
    if (this.pts.length && !e.ctrlKey && !e.metaKey && !e.altKey && /^[0-9.,<-]$/.test(k)) { if (k !== '-' || this.buf.endsWith('<')) { this.buf += k; this.draw(); } return true; }
    if (k === 'Enter') {
      if (this.buf) { const v = parseLen(this.buf); if (!v) { this.err(`Oʻlcham tushunilmadi: «${this.buf}» — masalan 32 yoki 32<90`); this.buf = ''; this.draw(); return true; } this.addSide(v.len, v.ang); return true; }
      this.finish(); return true;
    }
    if (k === 'Backspace') { if (this.buf) this.buf = this.buf.slice(0, -1); else this.pts.pop(); this.draw(); return true; }
    if (k === 'Escape') { if (this.buf) { this.buf = ''; this.draw(); return true; } this.cancel(); return true; }
    return false;
  }
  private finish(): void {
    if (this.pts.length < 3) { this.err('Kamida 3 nuqta kerak'); return; }
    if (!isSimple(this.pts)) { this.err('Chegara oʻzini kesib oʻtmasin'); return; }
    if (area(this.pts) < this.minArea) { this.err(`Maydon juda kichik (< ${this.minArea} m²)`); return; }
    const r = signedArea(this.pts) < 0 ? this.pts.slice().reverse() : this.pts; this.pts = []; this.buf = ''; this.scene.setPreview([]); this.done(r);
  }
  commit(): void { if (this.pts.length >= 3) this.finish(); }
  /** Oldindan koʻrish: yozilayotgan uzunlik boʻlsa — kursor oʻrniga shu masofadagi nuqta */
  private draw(): void {
    let c = this.cur;
    const v = this.buf ? parseLen(this.buf) : null;
    if (v && this.pts.length) { const p = this.pts[this.pts.length - 1], d = this.dir(v.ang); c = [p[0] + d[0] * v.len, p[1] + d[1] * v.len]; }
    this.scene.setPreview(c && this.pts.length ? [...this.pts, c] : this.pts, false, true);
  }
  cancel(): void { this.pts = []; this.cur = null; this.buf = ''; this.scene.setPreview([]); }
}

/**
 * Toʻgʻri toʻrtburchak: ikki burchak (sharq–shimol oʻqlari boʻyicha).
 * Oʻlcham bilan: birinchi burchakdan keyin «32x18» yozib Enter — kursor tomonga shu oʻlchamda (panelda ham: `placeWH`).
 */
export class RectTool implements Tool {
  readonly snapTo = true;
  private a: XY | null = null;
  private cur: XY | null = null;
  buf = '';
  constructor(private scene: Scene3D, private done: (r: XY[]) => void, private err: (m: string) => void, private minSide = 4) {}
  get started(): boolean { return !!this.a; }
  get hint(): string {
    if (this.buf) return `Oʻlcham: ${this.buf} m — Enter (eni x boʻyi, masalan 32x18) · Esc — oʻchirish`;
    return this.a ? 'Qarama-qarshi burchakni bosing yoki oʻlchamni yozib Enter (masalan 32x18) · Esc — bekor' : 'Birinchi burchakni bosing';
  }
  private rect(a: XY, b: XY): XY[] { return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]; }
  private corner(w: number, h: number): XY {
    const a = this.a!, sx = this.cur && this.cur[0] < a[0] ? -1 : 1, sy = this.cur && this.cur[1] < a[1] ? -1 : 1;
    return [a[0] + sx * w, a[1] + sy * h];
  }
  click(xy: XY): void {
    if (!this.a) { this.a = xy; this.buf = ''; return; }
    this.close(xy);
  }
  private close(xy: XY): void {
    const r = this.rect(this.a!, xy), w = Math.abs(xy[0] - this.a![0]), h = Math.abs(xy[1] - this.a![1]);
    this.a = null; this.buf = ''; this.scene.setPreview([]);
    if (w < this.minSide || h < this.minSide) { this.err(`Tomonlari kamida ${this.minSide} m boʻlsin`); return; }
    this.done(signedArea(r) < 0 ? r.reverse() : r);
  }
  /** Birinchi burchakdan eni × boʻyi (kursor tomonga) */
  placeWH(w: number, h: number): boolean {
    if (!this.a) { this.err('Avval sahnada birinchi burchakni bosing'); return false; }
    this.close(this.corner(w, h)); return true;
  }
  move(xy: XY): void { this.cur = xy; this.draw(); }
  private draw(): void {
    if (!this.a) return;
    const v = this.buf ? parseWH(this.buf) : null;
    this.scene.setPreview(this.rect(this.a, v ? this.corner(v[0], v[1]) : this.cur ?? this.a), true, true);
  }
  key(e: KeyboardEvent): boolean {
    const k = e.key;
    if (this.a && !e.ctrlKey && !e.metaKey && !e.altKey && /^[0-9.,xX*× хХ]$/.test(k)) { this.buf += k; this.draw(); return true; }
    if (k === 'Enter' && this.buf) { const v = parseWH(this.buf); if (!v) { this.err(`Oʻlcham tushunilmadi: «${this.buf}» — masalan 32x18`); this.buf = ''; this.draw(); return true; } this.placeWH(v[0], v[1]); return true; }
    if (k === 'Backspace' && this.buf) { this.buf = this.buf.slice(0, -1); this.draw(); return true; }
    if (k === 'Escape') { if (this.buf) { this.buf = ''; this.draw(); return true; } this.cancel(); return true; }
    return false;
  }
  cancel(): void { this.a = null; this.cur = null; this.buf = ''; this.scene.setPreview([]); }
}

/**
 * Oʻq boʻylab toʻrtburchak bino (egasi, 30.10): burilgan uchastkada ham koʻchaga parallel bino qoʻyish uchun.
 * 1-bosish — fasad chizigʻining boshi; 2-bosish — oxiri (yoʻnalish yaqin qirra — uchastka, koʻcha, bino — ga parallel yoki tik
 * yopishadi, 6° gacha); keyin kursor tomoni va masofasi — chuqurlik; 3-bosish (yoki Enter) — qoʻyish.
 * Yozib ham boʻladi: boshidan keyin «32» yoki «32<45» — uzunlik (va burchak); chiziqdan keyin «15» — chuqurlik; «32x15» — ikkalasi.
 */
export class AxisTool implements Tool {
  readonly snapTo = true;
  private a: XY | null = null;
  private b: XY | null = null;
  private cur: XY | null = null;
  buf = '';
  /** oxirgi yopishgan yoʻnalish (°) — maslahat uchun */
  snapped: number | null = null;
  constructor(private scene: Scene3D, private done: (r: XY[]) => void, private err: (m: string) => void, private o: { depth: () => number; guide: (p: XY) => number | null; minSide?: number }) {}
  get started(): boolean { return !!this.a; }
  get stage(): 0 | 1 | 2 { return !this.a ? 0 : !this.b ? 1 : 2; }
  get hint(): string {
    if (this.buf) return this.b ? `Chuqurlik: ${this.buf} m — Enter · Esc — oʻchirish` : `Uzunlik: ${this.buf} m — Enter · «<» bilan burchak (masalan 32<45) · Esc — oʻchirish`;
    if (!this.a) return 'Fasad chizigʻining boshini bosing (uchlar va qirralarga yopishadi)';
    if (!this.b) return 'Chiziq oxirini bosing yoki uzunlikni yozib Enter (masalan 32 yoki 32<45) · yoʻnalish yaqin qirraga parallel yopishadi · Backspace — bekor' + (this.snapped != null ? ` · ${Math.round(this.snapped)}°` : '');
    return 'Kursor bilan tomon va chuqurlikni koʻrsating, bosing yoki chuqurlikni yozib Enter · Backspace — chiziqqa qaytish · Esc — bekor';
  }
  private dir(from: XY, to: XY): XY { const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; }
  /** Chiziq oxiri: kursor yoʻnalishi yaqin qirra yoʻnalishiga (yoki unga tik) 6° gacha yopishadi */
  private endAt(xy: XY): XY {
    const a = this.a!, L = Math.hypot(xy[0] - a[0], xy[1] - a[1]); if (L < 0.5) { this.snapped = null; return xy; }
    const ang = Math.atan2(xy[1] - a[1], xy[0] - a[0]) * 180 / Math.PI, g = this.o.guide(xy);
    this.snapped = null;
    if (g == null) return xy;
    let best = ang, bd = 6.01;
    for (let k = -2; k <= 2; k++) { const c = g + k * 90, d = Math.abs(((ang - c + 540) % 360) - 180); if (d < bd) { bd = d; best = c; } }
    if (bd > 6) return xy;
    this.snapped = ((best % 360) + 360) % 360; const r = best * Math.PI / 180;
    return [a[0] + L * Math.cos(r), a[1] + L * Math.sin(r)];
  }
  /** Chuqurlik va tomon: kursor chiziqdan qaysi tomonda va qancha uzoqda (chiziqqa yaqin boʻlsa — panel qiymati) */
  private depthSide(xy: XY | null): { d: number; side: 1 | -1 } {
    const a = this.a!, b = this.b!, u = this.dir(a, b), n: XY = [-u[1], u[0]], dflt = this.o.depth();
    if (!xy) return { d: dflt, side: 1 };
    const v = (xy[0] - a[0]) * n[0] + (xy[1] - a[1]) * n[1], side: 1 | -1 = v < 0 ? -1 : 1, dist = Math.abs(v);
    return { d: dist < 3 ? dflt : Math.max(this.o.minSide ?? 4, Math.round(dist * 2) / 2), side };
  }
  private rect(d: number, side: 1 | -1): XY[] {
    const a = this.a!, b = this.b!, u = this.dir(a, b), n: XY = [-u[1] * side * d, u[0] * side * d];
    const r: XY[] = [[a[0], a[1]], [b[0], b[1]], [b[0] + n[0], b[1] + n[1]], [a[0] + n[0], a[1] + n[1]]];
    return signedArea(r) < 0 ? r.reverse() : r;
  }
  click(xy: XY): void {
    if (!this.a) { this.a = xy; this.buf = ''; this.draw(); return; }
    if (!this.b) { this.setEnd(this.endAt(xy)); return; }
    const { d, side } = this.depthSide(xy); this.finish(d, side);
  }
  private setEnd(b: XY): void {
    const L = Math.hypot(b[0] - this.a![0], b[1] - this.a![1]), min = this.o.minSide ?? 4;
    if (L < min) { this.err(`Chiziq kamida ${min} m boʻlsin`); return; }
    this.b = b; this.buf = ''; this.draw();
  }
  private finish(d: number, side: 1 | -1): void {
    const r = this.rect(d, side);
    this.a = this.b = null; this.buf = ''; this.snapped = null; this.scene.setPreview([]);
    this.done(r);
  }
  /** Paneldan: uzunlik (va burchak) — chiziq; chuqurlik — bino */
  placeLen(len: number, ang: number | null): boolean {
    if (!this.a) { this.err('Avval sahnada fasad chizigʻining boshini bosing'); return false; }
    if (this.b) return false;
    const a = this.a, r = ang != null ? ang * Math.PI / 180 : null, u = r != null ? [Math.cos(r), Math.sin(r)] as XY : this.cur ? this.dir(a, this.cur) : [1, 0] as XY;
    const b: XY = [a[0] + u[0] * len, a[1] + u[1] * len];
    this.setEnd(ang != null ? b : this.endAt(b)); return !!this.b;
  }
  placeDepth(d: number): boolean {
    if (!this.a || !this.b) { this.err('Avval fasad chizigʻini chizing'); return false; }
    const min = this.o.minSide ?? 4; if (d < min) { this.err(`Chuqurlik kamida ${min} m boʻlsin`); return false; }
    this.finish(d, this.depthSide(this.cur).side); return true;
  }
  move(xy: XY): void { this.cur = xy; this.draw(); }
  private draw(): void {
    if (!this.a) { this.scene.setPreview([]); return; }
    if (!this.b) {
      const v = this.buf ? parseLen(this.buf) : null;
      let end: XY | null = null;
      if (v) { const r = v.ang != null ? v.ang * Math.PI / 180 : null, u = r != null ? [Math.cos(r), Math.sin(r)] as XY : this.cur ? this.dir(this.a, this.cur) : [1, 0] as XY; end = [this.a[0] + u[0] * v.len, this.a[1] + u[1] * v.len]; }
      else if (this.cur) end = this.endAt(this.cur);
      this.scene.setPreview(end ? [this.a, end] : [this.a], false, true); return;
    }
    const typed = this.buf ? Number(this.buf.replace(',', '.')) : NaN, ds = this.depthSide(this.cur);
    this.scene.setPreview(this.rect(Number.isFinite(typed) && typed > 0 ? typed : ds.d, ds.side), true, true);
  }
  key(e: KeyboardEvent): boolean {
    const k = e.key;
    if (this.a && !e.ctrlKey && !e.metaKey && !e.altKey && (this.b ? /^[0-9.,]$/ : /^[0-9.,<xX*× хХ-]$/).test(k)) { this.buf += k; this.draw(); return true; }
    if (k === 'Enter') {
      if (this.buf) {
        if (!this.b) {
          const wh = parseWH(this.buf); if (wh) { if (this.placeLen(wh[0], null)) this.placeDepth(wh[1]); return true; }
          const v = parseLen(this.buf); if (!v) { this.err(`Oʻlcham tushunilmadi: «${this.buf}» — masalan 32 yoki 32<45`); this.buf = ''; this.draw(); return true; }
          this.placeLen(v.len, v.ang); return true;
        }
        const d = Number(this.buf.replace(',', '.')); if (!(d > 0)) { this.err(`Chuqurlik tushunilmadi: «${this.buf}»`); this.buf = ''; this.draw(); return true; }
        this.placeDepth(d); return true;
      }
      if (this.b) { const ds = this.depthSide(this.cur); this.finish(ds.d, ds.side); return true; }
      return false;
    }
    if (k === 'Backspace') { if (this.buf) this.buf = this.buf.slice(0, -1); else if (this.b) this.b = null; else if (this.a) this.a = null; this.draw(); return true; }
    if (k === 'Escape') { if (this.buf) { this.buf = ''; this.draw(); return true; } this.cancel(); return true; }
    return false;
  }
  commit(): void { if (this.a && this.b) { const ds = this.depthSide(this.cur); this.finish(ds.d, ds.side); } }
  cancel(): void { this.a = this.b = null; this.cur = null; this.buf = ''; this.snapped = null; this.scene.setPreview([]); }
}

/** Bitta bosish — natijani chaqiruvchi hal qiladi (masalan, kvartalni aniqlash) */
export class ClickTool implements Tool {
  constructor(readonly hint: string, private fn: (xy: XY) => void) {}
  click(xy: XY): void { this.fn(xy); }
  key(e: KeyboardEvent): boolean { return e.key === 'Escape'; }
  cancel(): void { /* holat yoʻq */ }
}

/** Ochiq siniq chiziq (koʻcha oʻqi): bosish — nuqta, Enter yoki ikki marta bosish — tugatish; uchlar boshqa koʻchalarga yopishadi */
export class LineTool implements Tool {
  private pts: XY[] = [];
  private cur: XY | null = null;
  private dbl = new Dbl();
  constructor(private scene: Scene3D, private done: (r: XY[]) => void, private err: (m: string) => void, private snap: (p: XY) => XY = p => p) {}
  get hint(): string { return this.pts.length < 2 ? 'Koʻcha oʻqi: nuqtalarni bosing · uchlar boshqa koʻchaga yopishadi · Esc — bekor' : 'Ikki marta bosish, Enter yoki «Chizishni tugatish» — saqlash · Backspace — oxirgisi · Esc — bekor'; }
  click(xy: XY, e: PointerEvent): void {
    if (this.dbl.is(e) && this.pts.length >= 2) { this.finish(); return; }
    this.pts.push(this.snap(xy)); this.draw();
  }
  move(xy: XY): void { this.cur = this.snap(xy); this.draw(); }
  key(e: KeyboardEvent): boolean {
    if (e.key === 'Enter') { this.finish(); return true; }
    if (e.key === 'Backspace') { this.pts.pop(); this.draw(); return true; }
    if (e.key === 'Escape') { this.cancel(); return true; }
    return false;
  }
  private finish(): void {
    const p = this.pts.filter((q, i) => i === 0 || Math.hypot(q[0] - this.pts[i - 1][0], q[1] - this.pts[i - 1][1]) > 0.5);
    if (p.length < 2) { this.err('Kamida 2 nuqta kerak'); return; }
    this.pts = []; this.scene.setPreview([]); this.done(p);
  }
  commit(): void { if (this.pts.length >= 2) this.finish(); }
  private draw(): void { this.scene.setPreview(this.cur && this.pts.length ? [...this.pts, this.cur] : this.pts, false); }
  cancel(): void { this.pts = []; this.cur = null; this.scene.setPreview([]); }
}

/** Chizgʻich: nuqtalar orasidagi masofa (yer sathida), 3 va undan koʻp nuqtada — yuza ham; istalgan koʻrinishda ishlaydi */
export class MeasureTool implements Tool {
  readonly anyView = true;
  readonly snapTo = true;
  private pts: XY[] = [];
  private cur: XY | null = null;
  private fixed = false;
  constructor(private scene: Scene3D, private fmt: (v: number, d?: number) => string) {}
  get hint(): string {
    const all = this.cur && !this.fixed ? [...this.pts, this.cur] : this.pts;
    if (!all.length) return 'Chizgʻich: nuqtalarni bosing · Enter — tugatish · Esc — tozalash';
    let L = 0; for (let i = 1; i < all.length; i++) L += Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]);
    const seg = all.length >= 2 ? Math.hypot(all[all.length - 1][0] - all[all.length - 2][0], all[all.length - 1][1] - all[all.length - 2][1]) : 0;
    const A = all.length >= 3 ? area(all) : 0;
    return `Oxirgi kesma ${this.fmt(seg, 1)} m · jami ${this.fmt(L, 1)} m${A > 1 ? ` · yopilsa ${this.fmt(A)} m²` : ''}${this.fixed ? ' · yangi oʻlchov — bosing' : ' · Enter — tugatish'}`;
  }
  click(xy: XY): void { if (this.fixed) { this.pts = []; this.fixed = false; } this.pts.push(xy); this.draw(); }
  move(xy: XY): void { if (this.fixed) return; this.cur = xy; this.draw(); }
  key(e: KeyboardEvent): boolean {
    if (e.key === 'Enter') { this.fixed = true; this.cur = null; this.draw(); return true; }
    if (e.key === 'Backspace') { this.pts.pop(); this.draw(); return true; }
    return false;
  }
  private draw(): void { this.scene.setPreview(this.cur && this.pts.length && !this.fixed ? [...this.pts, this.cur] : this.pts, false, true); }
  cancel(): void { this.pts = []; this.cur = null; this.scene.setPreview([]); }
}

/** Vertikal kesim chizigʻi: ikki nuqta */
export class SectionLineTool implements Tool {
  private a: XY | null = null;
  constructor(private scene: Scene3D, private done: (a: XY, b: XY) => void) {}
  get hint(): string { return this.a ? 'Kesim chizigʻining ikkinchi nuqtasi · Esc — bekor' : 'Vertikal kesim: chiziqning birinchi nuqtasini bosing (koʻrinadigan tomon — chiziqdan chapda)'; }
  click(xy: XY): void { if (!this.a) { this.a = xy; return; } const a = this.a; this.a = null; this.scene.setPreview([]); this.done(a, xy); }
  move(xy: XY): void { if (this.a) this.scene.setPreview([this.a, xy], false); }
  key(e: KeyboardEvent): boolean { return e.key === 'Escape'; }
  cancel(): void { this.a = null; this.scene.setPreview([]); }
}

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
}

/** Erkin koʻpburchak: bosib nuqta qoʻyish; birinchi nuqtani bosish, Enter yoki ikki marta bosish — yopish */
export class PolygonTool implements Tool {
  readonly snapTo = true;
  private pts: XY[] = [];
  private cur: XY | null = null;
  constructor(private scene: Scene3D, private done: (r: XY[]) => void, private err: (m: string) => void, private minArea = 50) {}
  get hint(): string {
    return this.pts.length < 3 ? 'Bosing — nuqta qoʻying · Backspace — oxirgisini oʻchirish · Esc — bekor'
      : 'Birinchi nuqtani bosing yoki Enter — yopish · Backspace — oxirgisi · Esc — bekor';
  }
  click(xy: XY, e: PointerEvent): void {
    if (this.pts.length >= 3 && (this.scene.screenDist(this.pts[0], e.clientX, e.clientY) < 12 || e.detail >= 2)) { this.finish(); return; }
    this.pts.push(xy); this.draw();
  }
  move(xy: XY): void { this.cur = xy; this.draw(); }
  key(e: KeyboardEvent): boolean {
    if (e.key === 'Enter') { this.finish(); return true; }
    if (e.key === 'Backspace') { this.pts.pop(); this.draw(); return true; }
    if (e.key === 'Escape') { this.cancel(); return true; }
    return false;
  }
  private finish(): void {
    if (this.pts.length < 3) { this.err('Kamida 3 nuqta kerak'); return; }
    if (!isSimple(this.pts)) { this.err('Chegara oʻzini kesib oʻtmasin'); return; }
    if (area(this.pts) < this.minArea) { this.err(`Maydon juda kichik (< ${this.minArea} m²)`); return; }
    const r = signedArea(this.pts) < 0 ? this.pts.slice().reverse() : this.pts; this.pts = []; this.scene.setPreview([]); this.done(r);
  }
  private draw(): void { this.scene.setPreview(this.cur && this.pts.length ? [...this.pts, this.cur] : this.pts, false, true); }
  cancel(): void { this.pts = []; this.cur = null; this.scene.setPreview([]); }
}

/** Toʻgʻri toʻrtburchak: ikki burchak (sharq–shimol oʻqlari boʻyicha) */
export class RectTool implements Tool {
  readonly snapTo = true;
  private a: XY | null = null;
  constructor(private scene: Scene3D, private done: (r: XY[]) => void, private err: (m: string) => void, private minSide = 4) {}
  get hint(): string { return this.a ? 'Qarama-qarshi burchakni bosing · Esc — bekor' : 'Birinchi burchakni bosing'; }
  private rect(a: XY, b: XY): XY[] { return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]; }
  click(xy: XY): void {
    if (!this.a) { this.a = xy; return; }
    const r = this.rect(this.a, xy), w = Math.abs(xy[0] - this.a[0]), h = Math.abs(xy[1] - this.a[1]);
    this.a = null; this.scene.setPreview([]);
    if (w < this.minSide || h < this.minSide) { this.err(`Tomonlari kamida ${this.minSide} m boʻlsin`); return; }
    this.done(signedArea(r) < 0 ? r.reverse() : r);
  }
  move(xy: XY): void { if (this.a) this.scene.setPreview(this.rect(this.a, xy), true, true); }
  key(e: KeyboardEvent): boolean { if (e.key === 'Escape') { this.cancel(); return true; } return false; }
  cancel(): void { this.a = null; this.scene.setPreview([]); }
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
  constructor(private scene: Scene3D, private done: (r: XY[]) => void, private err: (m: string) => void, private snap: (p: XY) => XY = p => p) {}
  get hint(): string { return this.pts.length < 2 ? 'Koʻcha oʻqi: nuqtalarni bosing · uchlar boshqa koʻchaga yopishadi · Esc — bekor' : 'Enter yoki ikki marta bosish — tugatish · Backspace — oxirgisi · Esc — bekor'; }
  click(xy: XY, e: PointerEvent): void {
    if (this.pts.length >= 2 && e.detail >= 2) { this.finish(); return; }
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

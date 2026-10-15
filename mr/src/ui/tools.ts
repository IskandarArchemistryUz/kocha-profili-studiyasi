/**
 * Sahnadagi chizish asboblari. Bosish (sudramasdan) — nuqta qoʻyadi, sudrash — kamerani aylantiradi/suradi,
 * shuning uchun chizish paytida ham koʻrinishni boshqarish mumkin.
 */
import type { XY } from '../core/geo';
import { isSimple, area, signedArea } from '../core/geo';
import type { Scene3D } from '../scene/scene';

export interface Tool {
  readonly hint: string;
  click(xy: XY, e: PointerEvent): void;
  move?(xy: XY): void;
  key?(e: KeyboardEvent): boolean;
  cancel(): void;
}

/** Erkin koʻpburchak: bosib nuqta qoʻyish; birinchi nuqtani bosish, Enter yoki ikki marta bosish — yopish */
export class PolygonTool implements Tool {
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
  private draw(): void { this.scene.setPreview(this.cur && this.pts.length ? [...this.pts, this.cur] : this.pts, false); }
  cancel(): void { this.pts = []; this.cur = null; this.scene.setPreview([]); }
}

/** Toʻgʻri toʻrtburchak: ikki burchak (sharq–shimol oʻqlari boʻyicha) */
export class RectTool implements Tool {
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
  move(xy: XY): void { if (this.a) this.scene.setPreview(this.rect(this.a, xy), true); }
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

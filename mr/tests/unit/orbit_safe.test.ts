import { describe, it, expect } from 'vitest';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SafeOrbitControls } from '../../src/scene/orbit';

/** DOM yoʻq (node) — OrbitControls uchun yetarli soxta element */
function fakeEl() {
  const noop = () => {};
  const doc = { addEventListener: noop, removeEventListener: noop };
  return {
    style: {} as Record<string, string>, ownerDocument: doc,
    addEventListener: noop, removeEventListener: noop, setPointerCapture: noop, releasePointerCapture: noop,
    getRootNode: () => doc, clientWidth: 800, clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  } as unknown as HTMLElement;
}
const ev = (pointerId: number, pointerType: string, pageX: number, pageY: number) =>
  ({ pointerId, pointerType, pageX, pageY, clientX: pageX, clientY: pageY, button: 0, ctrlKey: false, metaKey: false, shiftKey: false, preventDefault() {} });

type Ctor = new (cam: PerspectiveCamera, el: HTMLElement) => unknown;
type H = { _onPointerDown(e: unknown): void; _onPointerUp(e: unknown): void; _onPointerMove(e: unknown): void };

/** Qalam (iPad Pencil / trackpad) + barmoq — ikkinchi nuqta koordinatasi kuzatilmagan */
function penThenTouch(C: Ctor) {
  const c = new C(new PerspectiveCamera(), fakeEl()) as unknown as H;
  c._onPointerDown(ev(1, 'pen', 100, 100));
  c._onPointerDown(ev(2, 'touch', 200, 200));
  c._onPointerMove(ev(2, 'touch', 210, 220));
  c._onPointerUp(ev(2, 'touch', 210, 220));
  c._onPointerUp(ev(1, 'pen', 100, 100));
}

/** Sahnadan tashqaridagi barmoq koʻtariladi (hujjat darajasidagi pointerup), qalam hali bosilgan */
function strayUp(C: Ctor) {
  const c = new C(new PerspectiveCamera(), fakeEl()) as unknown as H;
  c._onPointerDown(ev(1, 'pen', 100, 100));
  c._onPointerUp(ev(9, 'touch', 500, 500));
  c._onPointerUp(ev(1, 'pen', 100, 100));
}

describe('SafeOrbitControls', () => {
  it('asl OrbitControls shu holatlarda yiqiladi (xato qayta hosil qilinadi)', () => {
    expect(() => penThenTouch(OrbitControls)).toThrow(/x/);
    expect(() => strayUp(OrbitControls)).toThrow(/x/);
  });
  it('xavfsiz nusxa yiqilmaydi', () => {
    expect(() => penThenTouch(SafeOrbitControls)).not.toThrow();
    expect(() => strayUp(SafeOrbitControls)).not.toThrow();
  });
  it('oddiy ikki barmoq (pinch) avvalgidek ishlaydi', () => {
    const c = new SafeOrbitControls(new PerspectiveCamera(), fakeEl()) as unknown as H & { state: number };
    c._onPointerDown(ev(1, 'touch', 100, 100));
    c._onPointerDown(ev(2, 'touch', 200, 200));
    expect(c.state).toBeGreaterThan(0);
    c._onPointerMove(ev(2, 'touch', 260, 260));
    c._onPointerUp(ev(2, 'touch', 260, 260));
    c._onPointerUp(ev(1, 'touch', 100, 100));
    expect(c.state).toBe(-1);
  });
});

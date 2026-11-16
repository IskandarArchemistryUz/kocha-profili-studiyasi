/**
 * OrbitControls — sensorli/aralash kiritishda yiqilmaydigan nusxa.
 *
 * three.js (r186) OrbitControls nuqta koordinatasini faqat touch hodisalarida
 * (`_trackPointer`) yozadi. Sichqoncha/qalam (iPad Pencil, trackpad) yoki sahnadan
 * tashqarida qoʻyilgan barmoq bilan aralashganda `_pointerPositions[id]` boʻsh qoladi va
 * `onPointerUp` (case 1) yoki `_getSecondPointerPosition` → `position.x` →
 * «Cannot read properties of undefined (reading 'x')» / Safari: «undefined is not an object (evaluating 't.x')».
 * (Egasi paneli, 14.11.2026: 47 marta, Master reja.)
 *
 * Tuzatish: har qoʻshilgan nuqta darhol kuzatiladi; ikkinchi nuqta topilmasa — joriy hodisa koordinatasi.
 */
import { Vector2 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

type PtrEvt = { pointerId: number; pageX: number; pageY: number };
type Internals = {
  _pointers: number[];
  _pointerPositions: Record<number, Vector2 | undefined>;
  _trackPointer(e: PtrEvt): void;
};

export class SafeOrbitControls extends OrbitControls {
  _addPointer(e: PtrEvt): void {
    const s = this as unknown as Internals;
    s._pointers.push(e.pointerId);
    if (Number.isFinite(e.pageX) && Number.isFinite(e.pageY)) s._trackPointer(e);
  }

  _getSecondPointerPosition(e: PtrEvt): Vector2 {
    const s = this as unknown as Internals;
    const id = e.pointerId === s._pointers[0] ? s._pointers[1] : s._pointers[0];
    let p = s._pointerPositions[id];
    if (!p) { p = new Vector2(e.pageX || 0, e.pageY || 0); s._pointerPositions[id] = p; }
    return p;
  }

  _removePointer(e: PtrEvt): void {
    const s = this as unknown as Internals;
    delete s._pointerPositions[e.pointerId];
    const i = s._pointers.indexOf(e.pointerId);
    if (i >= 0) s._pointers.splice(i, 1);
    // onPointerUp «case 1» qolgan nuqta koordinatasini oʻqiydi — boʻsh boʻlmasin
    if (s._pointers.length === 1 && !s._pointerPositions[s._pointers[0]]) s._pointerPositions[s._pointers[0]] = new Vector2(e.pageX || 0, e.pageY || 0);
  }
}

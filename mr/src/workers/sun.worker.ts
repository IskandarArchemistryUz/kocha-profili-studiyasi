/// <reference lib="webworker" />
/** Insolyatsiya hisobi — oʻn minglab nurlar, asosiy oqimni band qilmasin */
import { insolation, type Prism, type SunStep } from '../core/sun';
import type { XY } from '../core/geo';

self.onmessage = (e: MessageEvent<{ id: number; pts: XY[]; z: number[]; prisms: Prism[]; steps: SunStep[]; run?: boolean }>) => {
  const { id, pts, z, prisms, steps } = e.data;
  const run = e.data.run ? new Float32Array(pts.length) : undefined;
  const hours = insolation(pts, z, prisms, steps, 400, run);
  (self as unknown as Worker).postMessage({ id, hours, run }, run ? [hours.buffer, run.buffer] : [hours.buffer]);
};

/// <reference lib="webworker" />
/** Insolyatsiya hisobi — oʻn minglab nurlar, asosiy oqimni band qilmasin */
import { insolation, type Prism, type SunStep } from '../core/sun';
import type { XY } from '../core/geo';

self.onmessage = (e: MessageEvent<{ id: number; pts: XY[]; z: number[]; prisms: Prism[]; steps: SunStep[] }>) => {
  const { id, pts, z, prisms, steps } = e.data;
  const hours = insolation(pts, z, prisms, steps);
  (self as unknown as Worker).postMessage({ id, hours }, [hours.buffer]);
};

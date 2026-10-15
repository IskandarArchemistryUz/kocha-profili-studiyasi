/// <reference lib="webworker" />
/** Deraza insolyatsiyasi — minglab derazalar × kun qadamlari, asosiy oqimdan tashqarida */
import { windowSun } from '../core/apartments';
import type { Prism, SunStep } from '../core/sun';
import type { XY } from '../core/geo';

self.onmessage = (e: MessageEvent<{ id: number; pts: XY[]; z: number[]; az: number[]; prisms: Prism[]; steps: SunStep[] }>) => {
  const { id, pts, z, az, prisms, steps } = e.data;
  const { run, total } = windowSun(pts, z, az, prisms, steps);
  (self as unknown as Worker).postMessage({ id, run, total }, [run.buffer, total.buffer]);
};

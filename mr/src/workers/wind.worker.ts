/// <reference lib="webworker" />
/** Shamol oqimi (LBM) — bir necha soniya hisob, asosiy oqimdan tashqarida */
import { windField, type WindJob } from '../core/wind';

self.onmessage = (e: MessageEvent<{ id: number; job: WindJob }>) => {
  const out = windField(e.data.job);
  (self as unknown as Worker).postMessage({ id: e.data.id, out }, [out.ratio.buffer]);
};

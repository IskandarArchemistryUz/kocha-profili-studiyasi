/// <reference lib="webworker" />
/** Koʻrinish tekshiruvi (VGA, hozir va loyiha) — asosiy oqimni band qilmasin */
import { korinishVga, type KorJob } from '../core/korinish';

self.onmessage = (e: MessageEvent<{ id: number; job: KorJob }>) => {
  const { id, job } = e.data;
  const out = korinishVga(job, f => (self as unknown as Worker).postMessage({ id, prog: f }));
  (self as unknown as Worker).postMessage({ id, out }, [out.hozir.buffer, out.loyiha.buffer]);
};

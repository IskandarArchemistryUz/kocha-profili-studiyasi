/// <reference lib="webworker" />
/** 13.11: seksiya rejasi tekshiruvlari (sectionChecks) — asosiy oqimdan tashqarida; natija asosiy oqim keshiga yoziladi */
import { sectionChecksRaw } from '../core/floorplan';
import type { SecPlan } from '../core/apartments';

self.onmessage = (e: MessageEvent<{ id: number; items: { k: string; pl: SecPlan; fh: number }[] }>) => {
  const { id, items } = e.data;
  const res = items.map(({ k, pl, fh }) => { try { return { k, v: sectionChecksRaw(pl, fh) }; } catch { return { k, v: null }; } });
  (self as unknown as Worker).postMessage({ id, res });
};

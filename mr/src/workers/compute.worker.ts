/// <reference lib="webworker" />
/** Hisob yadrosi — asosiy oqimdan tashqarida. Keyingi bosqichlarda generator, insolyatsiya va shamol shu yerga qoʻshiladi. */
import { derive } from '../core/derive';
import { evaluateAll } from '../norms/rules';
import type { Project } from '../core/doc';

self.onmessage = (e: MessageEvent<{ id: number; doc: Project }>) => {
  const { id, doc } = e.data;
  try { const d = derive(doc); (self as unknown as Worker).postMessage({ id, d, results: evaluateAll(d, doc) }); }
  catch (err) { (self as unknown as Worker).postMessage({ id, error: String(err) }); }
};

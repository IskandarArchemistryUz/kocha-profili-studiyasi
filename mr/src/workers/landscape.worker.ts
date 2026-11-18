/// <reference lib="webworker" />
/** 18.11 (T2b, egasi: «generatsiyada qotadi»): hovlilar (core/landscape) — asosiy oqimdan tashqarida. Bino qavati yoki joyi oʻzgarsa
 *  (~100–150 ms, noutbukda koʻproq) sahna avvalgi hovlilarni koʻrsatib turadi, natija kelgach hovlilar qatlami yangilanadi */
import { landscape } from '../core/landscape';
import { setUserProfiles } from '../core/profiles';
import type { Project } from '../core/doc';

self.onmessage = (e: MessageEvent<{ id: number; doc: Project }>) => {
  const { id, doc } = e.data;
  try { setUserProfiles(doc.profiles); (self as unknown as Worker).postMessage({ id, v: landscape(doc) }); }
  catch (err) { (self as unknown as Worker).postMessage({ id, error: String(err) }); }
};

/**
 * Tayyor maʼlumot fayllari (24.11.2026): Landsat yuza harorati, uy narxi kataklari, kadastr agregati.
 * Avval oʻz serverimizdagi nusxa (`/data/file/:set/:name` — server/src/data/files.js), javob bermasa — manba (GitHub).
 * Avval ilova toʻgʻridan-toʻgʻri raw.githubusercontent.com dan olardi: CDN emas, soʻrov chegarasi bor, repo yopilsa uchala qatlam oʻchardi.
 */
import { apiBase } from '../account/config';

const GH = 'https://raw.githubusercontent.com/IskandarArchemistryUz/kocha-profili-studiyasi';
export type DataSet = 'lst' | 'narx' | 'kadastr';
/** Manba manzillari (zaxira; server nusxasi ham shulardan olinadi) */
export const DATA_SRC: Record<DataSet, string> = { lst: `${GH}/lst-data/data/lst`, narx: `${GH}/narx-monitoring/data/narx`, kadastr: `${GH}/kadastr-agregat/data/kadastr` };

/** Fayl javobi: serverdan (ok boʻlsa), aks holda manbadan. Manba ham yiqilsa — uning javobi yoki xatosi (chaqiruvchi tekshiradi). */
export async function dataFile(set: DataSet, name: string, f: typeof fetch = fetch.bind(globalThis)): Promise<Response> {
  try { const r = await f(`${apiBase()}/data/file/${set}/${name}`); if (r.ok) return r; } catch { /* server yoʻq / CORS / tarmoq — manbaga */ }
  return f(`${DATA_SRC[set]}/${name}`);
}

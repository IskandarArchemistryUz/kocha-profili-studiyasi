/**
 * Render studiyasi — tugmalar roʻyxati va holat. 13.11.2026 (Render 1-bosqich): «Oʻz kalitim» (BYOK) olib tashlandi —
 * provayder, model va API kaliti yoʻq; render serverda (fal.ai, markaziy kalit), tanga bilan. Soʻrov matni ham serverda
 * yigʻiladi (server/src/render/prompt.js) — bu yerda faqat tugma identifikatorlari va ularning nomi.
 * Eski «kps_air» kaliti (bino.html, muharrir.html) bu sahifada oʻqilmaydi va yozilmaydi.
 */
import type { Engine } from './api';

/** Uslublar: id → nom (id lar server prompt.js STYLE bilan bir xil) */
export const STY: [string, string][] = [
  ['foto', 'Fotorealistik kunduz'], ['oltin', 'Oltin soat'], ['kech', 'Kechki chiroqlar'], ['qish', 'Qish'],
  ['toshkent', 'Toshkent ruhida'], ['akvarel', 'Akvarel eskiz'], ['maket', 'Oq maket (fotosi)'], ['diagramma', 'Diagramma'],
];
/** Nima tasvirlangan */
export type Subject = 'reja' | 'bino' | 'kocha' | 'joy' | 'interyer' | 'eskiz';
export const SUBJECTS: [Subject, string][] = [['reja', 'Master reja'], ['bino', 'Bitta bino'], ['kocha', 'Koʻcha'], ['joy', 'Aksonometriya'], ['interyer', 'Interyer'], ['eskiz', 'Eskiz / qoʻl chizma']];
/** Asosga sodiqlik */
export type Fidelity = 'qatiy' | 'muvozanat' | 'erkin';
export const FIDELITY: [Fidelity, string][] = [['qatiy', 'Qatʼiy'], ['muvozanat', 'Muvozanat'], ['erkin', 'Erkin']];
/** Referens rasm roli */
export type RefRole = 'uslub' | 'material' | 'yorugik' | 'kontekst';
export const ROLES: [RefRole, string][] = [['uslub', 'Uslub'], ['material', 'Material'], ['yorugik', 'Yorugʻlik'], ['kontekst', 'Kontekst']];

export interface RenState { sty: string; extra: string; fid: Fidelity; subj: Subject; n: number; engine: Engine }
const KEY = 'ren-state';
const ENG: Engine[] = ['fast', 'pro', 'pro4k'];
export function loadState(): RenState {
  const s: RenState = { sty: 'foto', extra: '', fid: 'qatiy', subj: 'reja', n: 1, engine: 'pro' };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(s, JSON.parse(raw));
    else {   // birinchi ochilish: eski sozlamalardan faqat tugmalar (kalit va provayder — yoʻq)
      const o = JSON.parse(localStorage.getItem('kps_air') || '{}') as Partial<RenState> & { keep?: boolean };
      for (const k of ['sty', 'extra', 'subj', 'n'] as const) if (o[k] != null) (s as unknown as Record<string, unknown>)[k] = o[k];
      s.fid = o.fid ?? (o.keep === false ? 'muvozanat' : 'qatiy');
    }
  } catch { /* */ }
  if (!ENG.includes(s.engine)) s.engine = 'pro';
  if (![1, 2, 4].includes(s.n)) s.n = 1;
  if (!FIDELITY.some(f => f[0] === s.fid)) s.fid = 'qatiy';
  if (!SUBJECTS.some(f => f[0] === s.subj)) s.subj = 'reja';
  if (s.sty && !STY.some(f => f[0] === s.sty)) s.sty = 'foto';
  return s;
}
export function saveState(s: RenState): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ } }

export interface Img { url: string; w: number; h: number }
/** Rasm: uzun tomoni max px, JPEG, oq fon (Chizmadon varagʻi, referens eskizi) */
export function shrink(src: string, max = 1536, type = 'image/jpeg'): Promise<Img> {
  return new Promise((ok, no) => {
    const im = new Image();
    if (/^https?:/.test(src)) im.crossOrigin = 'anonymous';   // R2 havolasi — kanvas «ifloslanmasin»
    im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); ok({ url: c.toDataURL(type, 0.92), w: c.width, h: c.height }); };
    im.onerror = () => no(new Error('rasm ochilmadi')); im.src = src;
  });
}

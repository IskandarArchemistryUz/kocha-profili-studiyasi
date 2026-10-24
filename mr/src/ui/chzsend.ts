/**
 * Boshqa xizmatdan (Joyshunos, Koʻchasoz, Render) Chizmadonga varaq yuborish — qaysi loyihaga tushishini aniq belgilaydi.
 * Avval «#/chizmadon» oxirgi oʻzgartirilgan Master reja loyihasini ochardi va varaq begona loyiha albomiga qoʻshilib ketardi
 * (egasi, 24.10.2026). Masofa qoidasi (≤ 3 km) yetarli emas edi: yangi boʻsh loyihalar markazi — Toshkent markazi, shuning
 * uchun Toshkentdagi har qanday tahlil «shu loyiha hududida» chiqardi (egasi, 24.10 kechqurun).
 * Endi: Master reja loyihasidan kelingan boʻlsa — foydalanuvchi oʻzi tanlaydi (shu loyihaga / yangi loyiha), tavsiya masofadan;
 * Master rejadan kelinmagan boʻlsa — har doim yangi alohida loyiha.
 */
import { getMrReturn, type MrReturn } from './mrback';
import { tr, tf } from '../i18n';
import type { LngLat } from '../core/doc';

export const CHZ_INBOX = 'ks-chz-inbox';
export interface ChzItem { name: string; kind: 'sheet'; svg: string; vb: [number, number, number, number]; w: number; h: number }
export interface ChzTarget { target: string | 'new'; newName?: string; center?: LngLat }
/** Bir loyihaga tegishli deb tavsiya qilinadigan masofa, m */
export const SAME_SITE_M = 3000;

const distM = (a: LngLat, b: LngLat) => { const k = Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180) * 111_320; return Math.hypot((a[0] - b[0]) * k, (a[1] - b[1]) * 110_540); };

/** Tavsiya: true — kelingan loyihaga qoʻshish maʼqul (joyi nomaʼlum varaq yoki loyiha hududida) */
export function suggestSame(r: MrReturn, center?: LngLat | null): boolean {
  if (!center) return true;
  if (!r.origin || r.hasSite === false) return false;   // loyihada hali uchastka yoʻq — markazi sukut (Toshkent), ishonchsiz
  return distM(center, r.origin) <= SAME_SITE_M;
}
/** Yangi alohida loyiha */
export const newTarget = (name: string, center?: LngLat | null): ChzTarget => ({ target: 'new', newName: name, center: center ?? undefined });

/** Tanlov oynasi: «shu loyihaga» / «yangi loyiha» / bekor. null — bekor qilindi */
export function askTarget(r: MrReturn, name: string, center?: LngLat | null): Promise<ChzTarget | null> {
  injectCss();
  const same = suggestSame(r, center);
  return new Promise(done => {
    const back = document.createElement('div'); back.className = 'chzs-back';
    const box = document.createElement('div'); box.className = 'chzs'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.id = 'chzSend';
    const h = document.createElement('h2'); h.textContent = tr('Varaq qaysi loyiha albomiga qoʻshilsin?');
    const sub = document.createElement('p'); sub.textContent = name;
    const opt = (id: string, title: string, note: string, rec: boolean, val: ChzTarget) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = `chzs-o${rec ? ' rec' : ''}`; b.dataset.chz = id;
      const t = document.createElement('b'); t.textContent = title; const n = document.createElement('span'); n.textContent = note;
      b.append(t, n);
      if (rec) { const c = document.createElement('i'); c.textContent = tr('tavsiya'); b.append(c); }
      b.onclick = () => close(val); return b;
    };
    const far = center && r.origin && r.hasSite !== false ? distM(center, r.origin) : null;
    const a = opt('same', tf('«${n}» loyihasiga', { n: r.name }), far != null ? tf('Tahlil joyi loyiha markazidan ${d} km', { d: (far / 1000).toFixed(1).replace('.', ',') }) : tr('Master reja loyihasi, undan bu xizmatga oʻtgansiz'), same, { target: r.id });
    const b = opt('new', tr('Yangi alohida loyiha'), tf('Nomi: «${n}»', { n: name }), !same, newTarget(name, center));
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'chzs-x'; cancel.textContent = tr('Bekor qilish'); cancel.onclick = () => close(null);
    box.append(h, sub, a, b, cancel); back.append(box); document.body.append(back);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', key);
    back.addEventListener('click', e => { if (e.target === back) close(null); });
    (same ? a : b).focus();
    function close(v: ChzTarget | null) { document.removeEventListener('keydown', key); back.remove(); done(v); }
  });
}

/** Qaysi loyihaga: Master rejadan kelinmagan — yangi; kelingan — tanlov oynasi */
export async function chzTarget(name: string, center?: LngLat | null): Promise<ChzTarget | null> {
  const r = getMrReturn();
  return r ? askTarget(r, name, center) : newTarget(name, center);
}
/** Varaqni navbatga qoʻyib, Chizmadonni ochadi. 'cancel' — foydalanuvchi bekor qildi; false — brauzer xotirasi toʻla */
export async function sendSheet(item: ChzItem, center?: LngLat | null, base = './'): Promise<boolean | 'cancel'> {
  const t = await chzTarget(item.name, center); if (!t) return 'cancel';
  try { localStorage.setItem(CHZ_INBOX, JSON.stringify({ ...item, ...t })); } catch { return false; }
  location.href = `${base}#/chizmadon`;
  return true;
}

let css = false;
function injectCss(): void {
  if (css) return; css = true;
  const s = document.createElement('style');
  s.textContent = `
.chzs-back{position:fixed;inset:0;z-index:1000;background:rgba(20,20,20,.38);display:grid;place-items:center;padding:16px}
.chzs{--bg:#fff;--fg:#141414;--mut:#6b6862;--ln:#e4e1da;--hi:#f4f2ed;background:var(--bg);color:var(--fg);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.22);padding:20px;width:min(440px,100%);display:flex;flex-direction:column;gap:10px;font:14px/1.4 inherit}
[data-theme=dark] .chzs{--bg:#1f2124;--fg:#ecebe7;--mut:#a3a19b;--ln:#34373b;--hi:#2a2d31}
.chzs h2{margin:0;font-size:17px;font-weight:600}
.chzs p{margin:0 0 4px;color:var(--mut);font-size:13px;word-break:break-word}
.chzs-o{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:12px 14px;border:1px solid var(--ln);border-radius:12px;background:var(--bg)}
.chzs-o:hover,.chzs-o:focus-visible{background:var(--hi)}
.chzs-o:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.chzs-o.rec{border-color:var(--fg)}
.chzs-o b{font-weight:600;word-break:break-word}
.chzs-o span{grid-column:1;color:var(--mut);font-size:12.5px}
.chzs-o i{grid-column:2;grid-row:1;font-style:normal;font-size:11px;padding:2px 8px;border-radius:99px;background:var(--fg);color:var(--bg);align-self:start}
.chzs-x{all:unset;cursor:pointer;align-self:flex-end;padding:8px 12px;border-radius:10px;color:var(--mut);font-size:13px}
.chzs-x:hover,.chzs-x:focus-visible{background:var(--hi);color:var(--fg)}`;
  document.head.append(s);
}

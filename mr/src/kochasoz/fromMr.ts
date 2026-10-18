/**
 * Master reja koʻchasi (core/profiles: Profile) → Koʻchasoz B kesimi (els, rl, toifa).
 * Boʻlaklar soni saqlanadi: «qatnov 7 m, 2 boʻlak» → ikki «Harakat 3,5 m» zonasi. Elementlar (daraxt, chiroq) — andoza.
 */
import type { Profile, Cat } from '../core/profiles';

export type KsEl = [string, number, Record<string, boolean>];
export interface KsStreet { els: KsEl[]; rl: number; tplName: string; sk: string; uk: string; U: never[]; PL: never[]; sel: number; selU: number }

/** ShNQ 2.07.01-23 toifasi → Koʻchasoz tugmasi (claude/kochasoz-qoidalar.md, «Toifalar mosligi») va Dizayn-kod turi */
const SK: Record<Cat, string> = { mahalliy: 'mh', 'tuman-magistral': 'tm', 'shahar-magistral-3': 'sh3', otish: 'mh', piyoda: 'pd' };
const UK: Record<Cat, string> = { mahalliy: 'M1', 'tuman-magistral': 'U3', 'shahar-magistral-3': 'U2', otish: 'M1', piyoda: 'U5' };

const r2 = (v: number) => Math.round(v * 100) / 100;

export function profileToKs(p: Profile, name?: string): KsStreet {
  const els: KsEl[] = [];
  const split = (t: string, w: number, n: number, o: Record<string, boolean> = {}) => { const k = Math.max(1, n); for (let i = 0; i < k; i++) els.push([t, r2(w / k), { ...o }]); };
  for (const part of p.parts) {
    switch (part.k) {
      case 'trotuar': els.push(['piy', part.w, {}]); break;
      case 'yashil': els.push(['yash', part.w, { daraxt: part.w >= 1.5 }]); break;
      case 'velo': els.push(['velo', part.w, {}]); break;
      case 'parkovka': els.push(['park', part.w, { mashina: true }]); break;
      case 'qatnov': split('qat', part.w, part.lanes ?? Math.max(1, Math.round(part.w / 3.5))); break;
      case 'ajratuvchi': els.push(['med', part.w, { daraxt: part.w >= 2, fonar: true }]); break;
      case 'avtobus': split('bus', part.w, part.lanes ?? Math.max(1, Math.round(part.w / 3.5))); break;
      case 'tramvay': split('tram', part.w, part.lanes ?? Math.max(1, Math.round(part.w / 3.2)), { tayanch: true }); break;
    }
  }
  const rl = r2(els.reduce((a, e) => a + e[1], 0));
  return { els, rl, tplName: name ?? p.name, sk: SK[p.cat] ?? 'mh', uk: UK[p.cat] ?? 'M1', U: [], PL: [], sel: 0, selU: -1 };
}

/** Koʻchasoz holatiga yozish (app/kochasoz.html B shu kalitdan oʻqiydi) */
export function openInKochasoz(p: Profile, name?: string): void {
  try {
    const cur = JSON.parse(localStorage.getItem('ks-street') || '{}');
    const { sel: _s, selU: _u, ...st } = profileToKs(p, name);
    localStorage.setItem('ks-street', JSON.stringify({ ...cur, ...st }));
  } catch { /* xotira yopiq — Koʻchasoz oʻz namunasi bilan ochiladi */ }
  location.href = './kochasoz.html#/b';
}

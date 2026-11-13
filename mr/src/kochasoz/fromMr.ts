/**
 * Master reja koʻchasi (core/profiles: Profile) → Koʻchasoz B kesimi (els, rl, toifa).
 * Boʻlaklar soni saqlanadi: «qatnov 7 m, 2 boʻlak» → ikki «Harakat 3,5 m» zonasi. Elementlar (daraxt, chiroq) — andoza.
 */
import { scoped, svcHref, ctxProject } from '../core/projctx';
import type { Profile, Cat, Part, PartKind } from '../core/profiles';

export type KsEl = [string, number, Record<string, boolean>];
export interface KsStreet { els: KsEl[]; rl: number; tplName: string; sk: string; uk: string; U: never[]; PL: never[]; sel: number; selU: number }

/** ShNQ 2.07.01-23 toifasi → Koʻchasoz tugmasi (claude/kochasoz-qoidalar.md, «Toifalar mosligi») va Dizayn-kod turi */
const SK: Record<Cat, string> = { mahalliy: 'mh', 'tuman-magistral': 'tm', 'shahar-magistral-3': 'sh3', otish: 'mh', piyoda: 'pd' };
const UK: Record<Cat, string> = { mahalliy: 'M1', 'tuman-magistral': 'U3', 'shahar-magistral-3': 'U2', otish: 'M1', piyoda: 'U5' };

const r2 = (v: number) => Math.round(v * 100) / 100;

export function profileToKs(p: Profile, name?: string): KsStreet {
  if (p.ks?.els.length) {   // Koʻchasozda tahrirlangan — aynan tiklanadi
    const els = p.ks.els.map(e => [e[0], e[1], { ...e[2] }] as KsEl);
    return { els, rl: r2(els.reduce((a, e) => a + e[1], 0)), tplName: name ?? p.name, sk: p.ks.sk ?? SK[p.cat] ?? 'mh', uk: p.ks.uk ?? UK[p.cat] ?? 'M1', U: [], PL: [], sel: 0, selU: -1 };
  }
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
/** Koʻchasoz B uchun koʻcha holatini tayyorlash (ks-street); pid — loyiha ichida (3-PR: holat shu loyihaga ajratiladi) */
export function prepKochasoz(p: Profile, name?: string, pid: string | null = null): void {
  try {
    const k = scoped('ks-street', pid);
    const cur = JSON.parse(localStorage.getItem(k) || '{}');
    const { sel: _s, selU: _u, ...st } = profileToKs(p, name);
    localStorage.setItem(k, JSON.stringify({ ...cur, ...st }));
  } catch { /* xotira yopiq — Koʻchasoz oʻz namunasi bilan ochiladi */ }
}
/** Toʻliq Koʻchasoz: Master reja loyihasidan (#/p/<id>) ochilsa — shu loyiha ichida (?p=) */
export function openInKochasoz(p: Profile, name?: string): void {
  const pid = ctxProject() ?? (/^#\/p\/([\w-]+)/.exec(location.hash)?.[1] ?? null);
  prepKochasoz(p, name, pid); location.href = svcHref('./kochasoz.html#/b', pid);
}

/** Koʻchasoz elementi → MR qismi. Fasad oldi va texnik polosa — trotuarga, ariq/kanal — yashil tasmaga qoʻshiladi (TALQIN: MR profilida alohida tur yoʻq) */
const KIND: Record<string, PartKind> = { front: 'trotuar', piy: 'trotuar', mebel: 'trotuar', yash: 'yashil', ariq: 'yashil', kanal: 'yashil', velo: 'velo', park: 'parkovka', qat: 'qatnov', bus: 'avtobus', tram: 'tramvay', med: 'ajratuvchi' };
const LANED = new Set<PartKind>(['qatnov', 'avtobus', 'tramvay']);
const CAT_OF: Record<string, Cat> = { mh: 'mahalliy', tm: 'tuman-magistral', sh3: 'shahar-magistral-3', pd: 'piyoda' };

/**
 * Koʻchasoz B kesimi → Master reja profili (teskari yoʻnalish).
 * Yonma-yon bir xil turdagi elementlar bitta qismga birlashadi (harakat boʻlaklari — lanes soni bilan).
 * Asl elementlar ks ga saqlanadi: profil Koʻchasozda qayta ochilsa aynan tiklanadi.
 */
export function ksToProfile(st: { els: KsEl[]; sk?: string; uk?: string }, base: Profile, id: string, name: string): Profile {
  const parts: Part[] = [];
  for (const e of st.els) {
    const k = KIND[e[0]]; if (!k || !(e[1] > 0)) continue;
    const last = parts.at(-1);
    if (last && last.k === k) { last.w = r2(last.w + e[1]); if (LANED.has(k)) last.lanes = (last.lanes ?? 1) + 1; }
    else parts.push(LANED.has(k) ? { k, w: r2(e[1]), lanes: 1 } : { k, w: r2(e[1]) });
  }
  const cat: Cat = base.cat === 'otish' && st.sk === 'mh' ? 'otish' : (st.sk && CAT_OF[st.sk]) || base.cat;
  return { id, name, note: base.note, cat, parts, ks: { els: st.els.map(e => [e[0], e[1], { ...e[2] }]), ...(st.sk ? { sk: st.sk } : {}), ...(st.uk ? { uk: st.uk } : {}) } };
}

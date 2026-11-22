/**
 * 22.11 (egasi: «Master rejada koʻcha kesimida grafika Koʻchasozdagidek chiroyli emas»): Master rejadagi koʻcha kesimi
 * Koʻchasoz B chizmasining oʻzi bilan chiziladi — alohida soddalashtirilgan chizma emas (bitta grafika, bitta dvigatel).
 * B (boards/b.ts) koʻrinmas joyda bir marta quriladi, kesim SVG si olinadi va bekor qilinadi; natija xotirada saqlanadi.
 *  - ksSectionSvg — toʻliq kesim (panel va katta oyna);
 *  - ksStreet / ksStreetCached — faqat koʻcha qatlamlari (zonalar, daraxtlar, odamlar, mashinalar, mebel, transport) va
 *    B koordinatalari: «Koʻcha profili A–A» varagʻi ularni oʻz masshtabi, binolari va oʻlchamlari ustiga qoʻyadi.
 */
import type { Profile } from '../core/profiles';
import { profileToKs } from './fromMr';

export interface KsSecOpts {
  /** chap va oʻng binolar qavati (Koʻchasoz sukuti: 7 va 9) */
  bL?: number; bR?: number;
  /** 0 — rangli, 1 — chizma (oq-qora) */
  gfx?: 0 | 1;
  /** viewBox eni (balandlik 680) */
  vw?: number;
}
/** Koʻcha qatlamlari: `g` — <path> lar B koordinatasida; x0 — chap qizil chiziq (px), px — 1 m, G — yer sathi, rl — qizil chiziqlar orasi (m) */
export interface KsStreet { g: string; x0: number; px: number; G: number; rl: number; /** zona qatlami (FOOTWAY, GREEN, LANE…) → asosiy rangi — varaq legendasi uchun */ fill: Record<string, string> }
interface Drawn { svg: string; street: KsStreet | null }

/** varaqqa olinadigan qatlamlar (qolgani — binolar, oʻlchamlar, yozuvlar, legenda, qizil chiziq — varaqning oʻzida) */
const STREET_LY = /^KS_(ZONE_|TREES$|PEOPLE$|CARS$|FURNITURE$|TRANSPORT$)/;

const memo = new Map<string, Drawn>();
const pending = new Map<string, Promise<Drawn>>();
let queue: Promise<unknown> = Promise.resolve();
const ev = typeof EventTarget !== 'undefined' ? new EventTarget() : null;

const keyOf = (p: Profile, o: KsSecOpts) => JSON.stringify([p.cat, p.parts, p.ks ?? null, o]);

function get(p: Profile, o: KsSecOpts): Promise<Drawn> {
  const key = keyOf(p, o), hit = memo.get(key);
  if (hit) return Promise.resolve(hit);
  const pend = pending.get(key); if (pend) return pend;
  // ketma-ket: bir vaqtda bitta yashirin B
  const job = queue.then(() => draw(p, o)).catch((): Drawn => ({ svg: '', street: null })).then(d => {
    pending.delete(key);
    if (d.svg) { memo.set(key, d); ev?.dispatchEvent(new Event('ready')); }
    return d;
  });
  queue = job; pending.set(key, job);
  return job;
}

/** Koʻchasoz kesimi SVG matni (xmlns bilan, eni 100 %); chizib boʻlmasa — '' */
export function ksSectionSvg(p: Profile, o: KsSecOpts = {}): Promise<string> { return get(p, o).then(d => d.svg); }
/** Faqat koʻcha qatlamlari (varaq uchun) */
export function ksStreet(p: Profile, o: KsSecOpts = {}): Promise<KsStreet | null> { return get(p, o).then(d => d.street); }
/**
 * Sinxron: tayyor boʻlsa — koʻcha qatlamlari, aks holda null va chizish boshlanadi (brauzerda).
 * Tayyor boʻlganda `onKsReady` chaqiriladi — varaq qayta chiziladi.
 */
export function ksStreetCached(p: Profile, o: KsSecOpts = {}): KsStreet | null {
  const hit = memo.get(keyOf(p, o));
  if (hit) return hit.street;
  if (typeof document !== 'undefined') void get(p, o);
  return null;
}
export function onKsReady(cb: () => void): () => void {
  if (!ev) return () => {};
  ev.addEventListener('ready', cb); return () => ev.removeEventListener('ready', cb);
}

async function draw(p: Profile, o: KsSecOpts): Promise<Drawn> {
  const [{ mount }, B, tpl] = await Promise.all([import('./dc'), import('./boards/b'), import('./boards/b.html?raw')]);
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-30000px;top:0;width:1400px;height:800px;visibility:hidden;pointer-events:none;contain:strict';
  document.body.append(host);
  let m: { destroy: () => void } | null = null;
  try {
    const inst = new B.default({});
    const k = profileToKs(p, p.name), s0 = inst.state as Record<string, unknown>;
    inst.state = {
      ...s0, els: k.els, rl: k.rl, sk: k.sk, uk: k.uk, tplName: k.tplName, U: [], PL: [],
      sel: 0, selU: -1,   // sel ≥ 0 shart (B tanlangan zona boʻyicha hisoblaydi); tanlov belgisi pastda olib tashlanadi
      view: 0, gfx: o.gfx ?? 0, vw: o.vw ?? 1100, zm: undefined, bL: o.bL ?? s0.bL, bR: o.bR ?? s0.bR,
    };
    m = mount(host, tpl.default, inst);
    const svg = host.querySelector<SVGSVGElement>('svg[data-xa]');
    if (!svg) return { svg: '', street: null };
    const x0 = parseFloat(svg.dataset.x0 ?? ''), px = parseFloat(svg.dataset.px ?? ''), G = parseFloat(svg.dataset.g ?? '');
    // koʻcha qatlamlari (tozalashdan oldin — data-ly kerak)
    let street: KsStreet | null = null;
    if (Number.isFinite(x0) && px > 0 && Number.isFinite(G)) {
      const fill: Record<string, string> = {}, parts: string[] = [];
      for (const e of svg.querySelectorAll('path[data-ly]')) {
        const ly = e.getAttribute('data-ly') ?? ''; if (!STREET_LY.test(ly)) continue;
        // zona rangi: qatlamdagi birinchi rangli yuza (oq, qora va «none» emas)
        const f = (e.getAttribute('fill') ?? '').toLowerCase(), z = ly.replace(/^KS_ZONE_/, '');
        if (ly.startsWith('KS_ZONE_') && !fill[z] && /^#[0-9a-f]{6}$/.test(f) && f !== '#ffffff' && f !== '#141414') fill[z] = f;
        const c = e.cloneNode() as Element; c.removeAttribute('data-ly'); c.removeAttribute('data-bk'); parts.push(c.outerHTML);
      }
      street = { g: parts.join(''), x0, px, G, rl: k.rl, fill };
    }
    const c = svg.cloneNode(true) as SVGSVGElement;
    // tahrir boshqaruvlari (qavat ±, tutqichlar, tanlov) — chizmaga kirmaydi (io.ts cleanSvg bilan bir xil)
    c.querySelectorAll('[data-ly="UI"], .ks-hnd, .ks-uh, .ks-bb, rect[style*="cursor"]').forEach(e => e.remove());
    c.querySelectorAll('[data-ly], [data-bk]').forEach(e => { e.removeAttribute('data-ly'); e.removeAttribute('data-bk'); });
    // tanlangan zona eni koʻk va qalin yoziladi — chizmada hammasi bir xil
    c.querySelectorAll('text[fill="#4c5bd4"]').forEach(e => { e.setAttribute('fill', '#141414'); e.setAttribute('font-weight', '500'); });
    for (const a of ['style', 'data-xa', 'data-xb', 'data-x0', 'data-px', 'data-g', 'data-d1', 'data-d3']) c.removeAttribute(a);
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    c.setAttribute('width', '100%');
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', p.name);
    return { svg: new XMLSerializer().serializeToString(c), street };
  } finally {
    m?.destroy();
    host.remove();
  }
}

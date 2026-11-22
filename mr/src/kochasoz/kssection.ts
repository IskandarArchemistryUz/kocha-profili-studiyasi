/**
 * 22.11 (egasi: «Master rejada koʻcha kesimida grafika Koʻchasozdagidek chiroyli emas»): Master rejadagi koʻcha kesimi
 * Koʻchasoz B chizmasining oʻzi bilan chiziladi — alohida soddalashtirilgan chizma emas (bitta grafika, bitta dvigatel).
 * B (boards/b.ts) koʻrinmas joyda bir marta quriladi, kesim SVG si olinadi va bekor qilinadi; natija xotirada saqlanadi.
 */
import type { Profile } from '../core/profiles';
import { profileToKs } from './fromMr';

export interface KsSecOpts {
  /** chap va oʻng binolar qavati (Koʻchasoz sukuti: 7 va 9) */
  bL?: number; bR?: number;
  /** 0 — rangli, 1 — chizma (oq-qora) */
  gfx?: 0 | 1;
  /** viewBox eni (balandlik 680); kichik koʻrinishda tor */
  vw?: number;
}

const memo = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

/** Koʻchasoz kesimi SVG matni (xmlns bilan, eni 100 %); chizib boʻlmasa — '' */
export function ksSectionSvg(p: Profile, o: KsSecOpts = {}): Promise<string> {
  const key = JSON.stringify([p.cat, p.parts, p.ks ?? null, o]);
  const hit = memo.get(key);
  if (hit !== undefined) return Promise.resolve(hit);
  // ketma-ket: bir vaqtda bitta yashirin B
  const job = queue.then(() => draw(p, o)).then(s => { if (s) memo.set(key, s); return s; }, () => '');
  queue = job;
  return job;
}

async function draw(p: Profile, o: KsSecOpts): Promise<string> {
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
      ...s0, els: k.els, rl: k.rl, sk: k.sk, uk: k.uk, tplName: k.tplName, U: [], PL: [], sel: 0, selU: -1,   // sel ≥ 0 shart (B tanlangan zona boʻyicha hisoblaydi); tanlov belgisi UI qatlamida — olib tashlanadi
      view: 0, gfx: o.gfx ?? 0, vw: o.vw ?? 1100, zm: undefined, bL: o.bL ?? s0.bL, bR: o.bR ?? s0.bR,
    };
    m = mount(host, tpl.default, inst);
    const svg = host.querySelector<SVGSVGElement>('svg[data-xa]');
    if (!svg) return '';
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
    return new XMLSerializer().serializeToString(c);
  } finally {
    m?.destroy();
    host.remove();
  }
}

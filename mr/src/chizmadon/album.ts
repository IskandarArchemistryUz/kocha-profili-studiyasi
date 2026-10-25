/**
 * Avtomatik albom (bitta oyna): materiallar + maket oilasi → varaqlar.
 * paginate (autolayout.ts) → sudrab qoʻyishlar (applyOv) → har varaq uchun maket SVG (sheet.ts, mm) va material kataklari (bind.ts uchun).
 * DOM ga bogʻliq emas: ekranda ham, eksportda ham, testlarda ham bir xil.
 */
import { type LFamily } from './layouts';
import { type Material, type Paginated, type Fill, paginate, applyOv, type Ov } from './autolayout';
import { renderPage, LIB, PAL, T, L0, n2, slotRectOf, str0, type Frame, type PageTxt } from './sheet';
import type { Cell } from './bind';
import type { ChRect } from './model';
import { drawEl } from './materials';
import type { Resolved } from './location';

export interface AlbumIn {
  fam: LFamily; fmt: string; pal: string; mats: Material[];
  force?: Record<number, string>; ov?: Ov[];
  /** kataklarni koʻrsatish (rol yorligʻi, toʻr) */
  slots?: boolean;
  R?: Resolved | null;
  /** tanlangan material — koʻk ramka */
  sel?: string | null;
  /** kz oilasining pastki sarlavhasi (joy nomi) */
  place?: string;
  /** 19-band (3): albom matnlari, yashirilganlar, varaq sarlavhalari va boʻlim matnlari (varaq raqami boʻyicha) */
  txt?: Omit<PageTxt, 'chap' | 'rawTitle'>;
  ttl?: Record<number, string>;
  chap?: Record<number, PageTxt['chap']>;
}
/** ui — ekran qatlami (tanlov ramkasi, kataklar yorligʻi): eksportga kirmaydi */
export interface AlbumPage { fill: Fill; svg: string; fr: Frame; cells: Cell[]; page: ChRect; title: string; ui: string }
export interface Album { PG: Paginated; pages: AlbumPage[]; ov: Ov[] }

/** «Mening uslubim»: asos palitra + oʻzgartirilgan ranglar */
export function setCustomPal(c: { base: string; over: Record<string, string> } | null): void {
  if (!c) { delete PAL.custom; return; }
  PAL.custom = { ...(PAL[c.base] ?? PAL.arch), ...c.over, name: 'Mening uslubim' };
}

const cellsArea = (s: { fx?: number; fw?: number; fh?: number; cs?: number; rs?: number }) => (s.fx != null ? (s.fw ?? 0) * (s.fh ?? 0) * 0.0096 : (s.cs ?? 1) * (s.rs ?? 1));

export function buildAlbum(a: AlbumIn): Album {
  const f = a.fam, PG = paginate(f, a.mats, a.force ?? {});
  const ov = applyOv(PG, a.ov ?? [], a.mats);
  const pages = PG.pages.map((pk, pi): AlbumPage => {
    // varaq sarlavhasi: 1-varaqda — «Sarlavha» materiali, keyin — eng katta material nomi (tahlil modullari boʻlsa — «Hudud tahlili»)
    const own = a.ttl?.[pi]?.trim();
    const ttl = own ? own : pi === 0 && PG.titleEl && f.chrome !== 'poster' ? PG.titleEl.title : (() => {
      let b: Material | null = null, bs = 0;
      pk.assign.forEach((el, k) => { const ar = cellsArea(pk.page.slots[k]); if (ar > bs && el.role !== 'legend') { bs = ar; b = el; } });
      const bb = b as Material | null;
      return bb ? (pk.page.slots.some(q => q.role === 'module') ? 'Hudud tahlili' : bb.title) : pk.page.title;
    })();
    let modN = 0, selUi = '';
    const cells: Cell[] = [];
    const out = renderPage(LIB, f, pk.page, a.fmt, {
      pal: a.pal, slots: a.slots, idx: pi, total: PG.pages.length, empty: pk.empty, titleOverride: ttl,
      txt: a.txt || a.chap?.[pi] || own ? { ...(a.txt ?? {}), chap: a.chap?.[pi], rawTitle: !!own } : null,
      secOverride: f.chrome === 'kz' ? String(pi + 1) : null, subOverride: f.chrome === 'kz' ? (a.place ?? null) : null,
      fill: (s, k, r, ctx) => {
        const el = pk.assign.get(k);
        if (!el && s.role === 'title' && f.chrome !== 'poster') { const ts = Math.min(r.h * 0.55, 9 * ctx.u); return T(r.x, r.y + ts * 1.05, ttl, { s: ts, w: 700, ls: -0.02 * ts, c: ctx.P.ink, ...(own ? { raw: 1 } : {}) }) + L0(r.x, r.y + r.h - 0.4 * ctx.u, r.x + r.w, r.y + r.h - 0.4 * ctx.u, ctx.P.ink, 0.3 * ctx.u); }
        if (!el) return null;
        cells.push({ el: el.id, r: { ...r } });
        const c = { ...ctx } as never;
        const draw = (rr: ChRect, bare: boolean) => (el.render ? el.render(rr, c, bare) : drawEl(el, rr, c, a.R, bare));
        // tahlil moduli: «N. Sarlavha» + material (sarlavhasiz)
        let svg = s.role === 'module'
          ? T(r.x, r.y + 4 * ctx.u, `${++modN}. ${str0(el.title)}`, { s: 3.4 * ctx.u, w: 700, c: el.accent || ctx.P.acc, raw: 1 }) + draw({ x: r.x, y: r.y + 7 * ctx.u, w: r.w, h: r.h - 8 * ctx.u }, true)
          : draw(r, false);
        if (a.sel === el.id) selUi += `<rect x="${n2(r.x - 1.2)}" y="${n2(r.y - 1.2)}" width="${n2(r.w + 2.4)}" height="${n2(r.h + 2.4)}" rx="${n2(1.5 * ctx.u)}" fill="none" stroke="#2a6fb0" stroke-width="${n2(0.6 * ctx.u)}" data-sel="1"/>`;
        return `<g data-el="${el.id}" data-k="${k}"><rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" fill="#fff" fill-opacity="0"/>${svg}</g>`;
      },
    });
    return { fill: pk, svg: out.svg, fr: out.fr, cells, page: { x: 0, y: 0, w: out.fr.W, h: out.fr.H }, title: ttl, ui: out.ui + selUi };
  });
  return { PG, pages, ov };
}
/** Varaq SVG ichki qismi (pageSvg ga bg sifatida) */
export const inner = (svg: string): string => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
/** Varaqdagi katak (mm nuqta ostidagi eng kichik, material qabul qiladigan) */
export function slotAt(ap: AlbumPage, fam: LFamily, fmt: string, p: [number, number]): { k: number; r: ChRect; role: string } | null {
  let best: { k: number; r: ChRect; role: string; a: number } | null = null;
  ap.fill.page.slots.forEach((sl, k) => {
    const r = slotRectOf(fam, ap.fill.page, fmt, sl);
    if (p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h && !['field', 'chapter', 'stamp', 'shifr', 'toc'].includes(sl.role)) { const ar = r.w * r.h; if (!best || ar < best.a) best = { k, r, role: sl.role, a: ar }; }
  });
  const b = best as { k: number; r: ChRect; role: string } | null;
  return b ? { k: b.k, r: b.r, role: b.role } : null;
}

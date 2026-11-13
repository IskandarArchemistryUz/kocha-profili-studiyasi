/**
 * Shaxmatka varagʻi (13.11, kanvas «Shaxmatka va insolyatsiya varaqlari», egasi tasdiqladi):
 * bino — qavat × seksiya toʻri (kvartira raqami, xonalar, umumiy maydon), oʻng ustunda tarkib jadvali;
 * loyiha — har bino kichik toʻr, loyiha tarkibi va miks (maqsad / amalda).
 * Raqamlash (amaliyot): seksiya → qavat (pastdan) → chapdan oʻngga.
 * Insolyatsiya rejimi: katak rangi — 94–95-band holati (SanQvaN 0102-25), hisob «Kvartiralar» qadamidan.
 */
import type { Project } from './doc';
import type { SecPlan } from './apartments';
import { MIX_DEFAULT } from './apartments';
import { floorVariant, type RulePlan } from './sectionplan';
import { floorTypeOf, floorPlanSvg, APT_FILL, type PlanOpts } from './floorplan';
import { floorInsol, EDGE_H, type InsolStatus } from './insolplan';
import type { LegendItem, SheetInner } from './sheet';

export type ShxCell = 'toliq' | 'ixcham' | 'maydon';
export interface ShxApt { n: number; k: number; area: number; sec: number; st?: InsolStatus; best?: number; ok?: number; need?: number; north?: boolean }
export interface ShxFloor { f: number; res: boolean; apts: ShxApt[] }
export interface ShxBld { no: number; bid: string; nF: number; secs: number[]; floors: ShxFloor[] }
/** deraza insolyatsiyasi: bino, qavat (1 dan), modul → uzluksiz soat; null — hisob yoʻq */
export type ShxInsolAt = (bid: string, floor: number, m: number) => number | null;

export const ST_COL: Record<InsolStatus, string> = { ok: '#3fa66b', edge: '#e0a526', bad: '#d9534f', na: '#8e8a82' };
export const ST_FILL: Record<InsolStatus, string> = { ok: '#d3eadb', edge: '#f5e6c4', bad: '#f4d3d0', na: '#e9e6e0' };

const n2 = (v: number) => v.toFixed(2);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fm = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const ng = (v: number) => Math.round(v).toLocaleString('ru-RU').replace(/ /g, ' ');
export const hm = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const isNorth = (az: number) => (az > 290 || az < 67.5) && !(az >= 200 && az <= 290);

/** Bino maʼlumoti: har qavat kvartiralari (floorVariant), raqamlash, ixtiyoriy insolyatsiya */
export function shxBuilding(doc: Project, plans: SecPlan[], bi: number, insol?: ShxInsolAt | null): ShxBld {
  const pl = plans[bi], b = doc.buildings.find(x => x.id === pl.bid), size = doc.settings.aptSize ?? 'M';
  const nF = Math.max(pl.f1, b?.floors ?? pl.f1), P: RulePlan | undefined = pl.layout.plan;
  const floors: ShxFloor[] = [];
  for (let f = 1; f <= nF; f++) {
    const ft = floorTypeOf(pl, f);
    if (!P || (ft !== 'typical' && ft !== 'first') || f > pl.f1) { floors.push({ f, res: false, apts: [] }); continue; }
    const V = floorVariant(P, ft, pl.layout.mods, size);
    const FI = insol ? floorInsol(V, pl.layout.mods, m => insol(pl.bid, f, m)) : null;
    floors.push({ f, res: true, apts: V.apts.map((a, i) => {
      const sec = Math.max(0, V.sections.findIndex(s => s.apts.includes(i)));
      const x: ShxApt = { n: 0, k: a.rooms, area: a.area, sec };
      if (FI) { const q = FI.apts[i]; Object.assign(x, { st: q.status, best: q.best, ok: q.ok, need: q.need, north: a.mods.length > 0 && a.mods.every(m => isNorth(pl.layout.mods[m].az)) }); }
      return x;
    }) });
  }
  const secs = [...new Set(floors.flatMap(f => f.apts.map(a => a.sec)))].sort((a, c) => a - c);
  let n = 0;
  for (const s of secs) for (const f of floors) for (const a of f.apts) if (a.sec === s) a.n = ++n;
  return { no: bi + 1, bid: pl.bid, nF, secs, floors };
}

/** Tarkib: xonalar soni (4+ birga) boʻyicha soni va maydoni */
export function shxMix(bs: ShxBld[]): { k: number; n: number; area: number }[] {
  const r = new Map<number, { n: number; area: number }>();
  for (const b of bs) for (const f of b.floors) for (const a of f.apts) { const k = Math.min(4, a.k), q = r.get(k) ?? { n: 0, area: 0 }; q.n++; q.area += a.area; r.set(k, q); }
  return [1, 2, 3, 4].filter(k => r.has(k)).map(k => ({ k, ...r.get(k)! }));
}

export function shxInsolStats(bs: ShxBld[]): Record<InsolStatus, number> {
  const c: Record<InsolStatus, number> = { ok: 0, edge: 0, bad: 0, na: 0 };
  for (const b of bs) for (const f of b.floors) for (const a of f.apts) c[a.st ?? 'na']++;
  return c;
}

function areaFill(a: number): string {
  const q = Math.max(0, Math.min(1, (a - 35) / 75)), c0 = [247, 241, 226], c1 = [143, 120, 86];
  return '#' + c0.map((v, j) => Math.round(v + (c1[j] - v) * q).toString(16).padStart(2, '0')).join('');
}

/** Qavat × seksiya toʻri. Qaytaradi: svg va egallagan oʻlcham */
export function shxBoard(B: ShxBld, x: number, y: number, w: number, h: number, cell: ShxCell, insol: boolean, tr: (s: string) => string): { svg: string; w: number; h: number } {
  const cols = new Map(B.secs.map(s => [s, Math.max(1, ...B.floors.map(f => f.apts.filter(a => a.sec === s).length))]));
  const ncol = [...cols.values()].reduce((s, v) => s + v, 0) || 1, nf = B.floors.length || 1;
  const lw = Math.min(14, w * 0.06), hh = Math.min(7, h * 0.06), gap = Math.min(3, w * 0.012);
  const cw = Math.min(42, (w - lw - gap * Math.max(0, B.secs.length - 1)) / ncol), ch = Math.min(24, (h - hh - 3) / nf);
  const o: string[] = [];
  const secs = B.secs.length ? B.secs : [0];
  const sx = new Map<number, number>(); let xs = x + lw;
  for (const s of secs) {
    sx.set(s, xs); const cw2 = (cols.get(s) ?? 1) * cw;
    o.push(`<rect x="${n2(xs)}" y="${n2(y)}" width="${n2(cw2)}" height="${n2(hh - 1.2)}" fill="#1d1d1b"/>`,
      `<text x="${n2(xs + cw2 / 2)}" y="${n2(y + (hh - 1.2) / 2 + 0.8)}" font-size="${n2(Math.min(2.2, hh * 0.38))}" font-weight="600" fill="#fff" text-anchor="middle" letter-spacing="0.3">${esc(tr('${n}-seksiya').replace('${n}', String(s + 1)).toUpperCase())}</text>`);
    xs += cw2 + gap;
  }
  const xe = xs - gap, y0 = y + hh;
  [...B.floors].reverse().forEach((f, fi) => {
    const cy = y0 + fi * ch;
    o.push(`<text x="${n2(x + lw - 2)}" y="${n2(cy + ch / 2 + 0.9)}" font-size="${n2(Math.min(2.6, ch * 0.4))}" font-weight="600" text-anchor="end" fill="#1d1d1b">${f.f}</text>`);
    if (!f.res) {
      for (const s of secs) {
        const cw2 = (cols.get(s) ?? 1) * cw, X = sx.get(s)!;
        o.push(`<rect x="${n2(X)}" y="${n2(cy + 0.3)}" width="${n2(cw2)}" height="${n2(ch - 0.6)}" fill="url(#shxHatch)" stroke="#9b968c" stroke-width="0.12"/>`);
        if (ch > 4 && cw2 > 30) o.push(`<rect x="${n2(X + cw2 / 2 - 16)}" y="${n2(cy + ch / 2 - 2)}" width="32" height="4" fill="#fff"/><text x="${n2(X + cw2 / 2)}" y="${n2(cy + ch / 2 + 0.7)}" font-size="1.9" text-anchor="middle" fill="#55524b">${esc(tr('noturar qavat'))}</text>`);
      }
      return;
    }
    const ci = new Map<number, number>();
    for (const a of f.apts) {
      const i = ci.get(a.sec) ?? 0; ci.set(a.sec, i + 1);
      const cx = (sx.get(a.sec) ?? x + lw) + i * cw, st = a.st ?? 'na';
      const fill = insol ? ST_FILL[st] : cell === 'maydon' ? areaFill(a.area) : APT_FILL[Math.min(4, a.k)];
      o.push(`<rect data-shx="kv" x="${n2(cx + 0.25)}" y="${n2(cy + 0.25)}" width="${n2(cw - 0.5)}" height="${n2(ch - 0.5)}" fill="${fill}" stroke="#fff" stroke-width="0.3"/>`);
      if (insol) o.push(`<rect x="${n2(cx + 0.25)}" y="${n2(cy + 0.25)}" width="1" height="${n2(ch - 0.5)}" fill="${ST_COL[st]}"/>`);
      if (cell === 'ixcham' || ch < 4.5 || cw < 9) {
        if (ch >= 2.6 && cw >= 4) o.push(`<text x="${n2(cx + cw / 2)}" y="${n2(cy + ch / 2 + Math.min(2.6, ch * 0.3) * 0.35)}" font-size="${n2(Math.min(2.6, ch * 0.3, cw * 0.28))}" font-weight="600" text-anchor="middle" fill="#1d1d1b">${a.n}</text>`);
        continue;
      }
      const fs = Math.min(3, ch * 0.2, cw * 0.1);
      o.push(`<text x="${n2(cx + 1.8)}" y="${n2(cy + fs + 0.9)}" font-size="${n2(fs)}" font-weight="700" fill="#1d1d1b">${a.n}</text>`);
      if (!insol) {
        o.push(`<text x="${n2(cx + cw - 1.2)}" y="${n2(cy + fs + 0.9)}" font-size="${n2(fs)}" font-weight="600" text-anchor="end" fill="#1d1d1b">${a.k}x</text>`,
          `<text x="${n2(cx + cw / 2)}" y="${n2(cy + ch - 1.4)}" font-size="${n2(fs * 1.05)}" text-anchor="middle" fill="#1d1d1b">${fm(a.area)} m²</text>`);
      } else if (st !== 'na') {
        const lab = (a.best ?? 0) <= 0 ? '0' : hm(a.best!);
        o.push(`<text x="${n2(cx + cw - 1.2)}" y="${n2(cy + fs + 0.9)}" font-size="${n2(fs)}" font-weight="600" text-anchor="end" fill="${ST_COL[st]}">${a.ok}/${a.need}</text>`,
          `<text x="${n2(cx + cw / 2)}" y="${n2(cy + ch - 1.4)}" font-size="${n2(fs * 1.05)}" text-anchor="middle" fill="#1d1d1b">${esc(`${lab} ${tr('soat')}${a.north && st !== 'ok' ? ' · N' : ''}`)}</text>`);
      }
    }
  });
  const yb = y0 + nf * ch;
  o.push(`<line x1="${n2(x + lw)}" y1="${n2(yb + 1.2)}" x2="${n2(xe)}" y2="${n2(yb + 1.2)}" stroke="#1d1d1b" stroke-width="0.2"/>`);
  return { svg: o.join(''), w: xe - x, h: yb - y + 2 };
}

/** Kichik toʻr (loyiha varagʻi) */
function shxMini(B: ShxBld, x: number, y: number, w: number, h: number, insol: boolean): { svg: string; w: number } {
  const cols = B.secs.map(s => Math.max(1, ...B.floors.map(f => f.apts.filter(a => a.sec === s).length)));
  const nc = cols.reduce((s, v) => s + v, 0) + Math.max(0, cols.length - 1) * 0.4 || 1, nf = B.floors.length || 1;
  const cw = Math.min(6, w / nc), ch = Math.min(4, h / nf), o: string[] = [];
  [...B.floors].reverse().forEach((f, fi) => {
    const cy = y + h - nf * ch + fi * ch;
    if (!f.res) { o.push(`<rect x="${n2(x)}" y="${n2(cy + 0.1)}" width="${n2(nc * cw)}" height="${n2(ch - 0.2)}" fill="url(#shxHatch)"/>`); return; }
    let xs = x;
    B.secs.forEach(s => {
      for (const a of f.apts.filter(q => q.sec === s)) {
        const st = a.st ?? 'na', fill = insol ? (st === 'ok' ? ST_FILL.ok : ST_COL[st]) : APT_FILL[Math.min(4, a.k)];
        o.push(`<rect data-shx="mini" x="${n2(xs)}" y="${n2(cy + 0.1)}" width="${n2(cw - 0.25)}" height="${n2(ch - 0.2)}" fill="${fill}"/>`); xs += cw;
      }
      xs += cw * 0.4;
    });
  });
  return { svg: o.join(''), w: nc * cw };
}

const HATCH = '<defs><pattern id="shxHatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="#f2f0eb"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#9b968c" stroke-width="0.18"/></pattern></defs>';

/** Tarkib jadvali (oʻng ustun) */
function mixTable(rows: { k: number; n: number; area: number }[], x: number, y: number, w: number, tr: (s: string) => string, title: string): { svg: string; h: number } {
  const N = rows.reduce((s, r) => s + r.n, 0), A = rows.reduce((s, r) => s + r.area, 0), cx = [0, 0.42, 0.6, 0.8, 1];
  const o = [`<text x="${n2(x)}" y="${n2(y + 3)}" font-size="2.6" font-weight="700" letter-spacing="0.3" fill="#1d1d1b">${esc(title.toUpperCase())}</text>`,
    `<line x1="${n2(x)}" y1="${n2(y + 4.6)}" x2="${n2(x + w)}" y2="${n2(y + 4.6)}" stroke="#1d1d1b" stroke-width="0.3"/>`];
  let yy = y + 8.5;
  [tr('Turi'), tr('Soni'), '%', tr('oʻrt., m²'), tr('jami, m²')].forEach((s, j) => o.push(`<text x="${n2(x + cx[j] * w)}" y="${n2(yy)}" font-size="1.9" fill="#8a857c" text-anchor="${j ? 'end' : 'start'}">${esc(s)}</text>`));
  yy += 1.4; o.push(`<line x1="${n2(x)}" y1="${n2(yy)}" x2="${n2(x + w)}" y2="${n2(yy)}" stroke="#bdb7aa" stroke-width="0.12"/>`);
  for (const r of rows) {
    yy += 4.8;
    o.push(`<rect x="${n2(x)}" y="${n2(yy - 2.6)}" width="3.6" height="3" fill="${APT_FILL[r.k]}"/><text x="${n2(x + 5)}" y="${n2(yy)}" font-size="2.3" fill="#1d1d1b">${esc(`${r.k}${r.k === 4 ? '+' : ''} ${tr('xonali')}`)}</text>`);
    [ng(r.n), String(Math.round(r.n / N * 100)), fm(r.area / r.n), ng(r.area)].forEach((s, j) => o.push(`<text x="${n2(x + cx[j + 1] * w)}" y="${n2(yy)}" font-size="2.3" text-anchor="end" fill="#1d1d1b">${s}</text>`));
  }
  yy += 2; o.push(`<line x1="${n2(x)}" y1="${n2(yy)}" x2="${n2(x + w)}" y2="${n2(yy)}" stroke="#1d1d1b" stroke-width="0.2"/>`); yy += 4.4;
  o.push(`<text x="${n2(x)}" y="${n2(yy)}" font-size="2.4" font-weight="700" fill="#1d1d1b">${esc(tr('Jami'))}</text>`);
  [ng(N), '100', N ? fm(A / N) : '—', ng(A)].forEach((s, j) => o.push(`<text x="${n2(x + cx[j + 1] * w)}" y="${n2(yy)}" font-size="2.4" font-weight="700" text-anchor="end" fill="#1d1d1b">${s}</text>`));
  return { svg: o.join(''), h: yy - y + 3 };
}

function insolBox(bs: ShxBld[], x: number, y: number, w: number, tr: (s: string) => string): { svg: string; h: number } {
  const c = shxInsolStats(bs), N = c.ok + c.edge + c.bad;
  const o = [`<text x="${n2(x)}" y="${n2(y + 3)}" font-size="2.6" font-weight="700" letter-spacing="0.3" fill="#1d1d1b">${esc(tr('Insolyatsiya').toUpperCase())}</text>`,
    `<line x1="${n2(x)}" y1="${n2(y + 4.6)}" x2="${n2(x + w)}" y2="${n2(y + 4.6)}" stroke="#1d1d1b" stroke-width="0.3"/>`];
  let yy = y + 9;
  if (!N) return { svg: o.join('') + `<text x="${n2(x)}" y="${n2(yy)}" font-size="2.2" fill="#8a857c">${esc(tr('Hisob yoʻq: «Kvartiralar» qadamida «Derazalar insolyatsiyasi»'))}</text>`, h: 13 };
  for (const k of ['ok', 'edge', 'bad'] as const) {
    o.push(`<rect x="${n2(x)}" y="${n2(yy - 2.6)}" width="3.6" height="3" fill="${ST_FILL[k]}" stroke="${ST_COL[k]}" stroke-width="0.3"/><text x="${n2(x + 5)}" y="${n2(yy)}" font-size="2.3" fill="#1d1d1b">${esc(tr(k === 'ok' ? 'talabga javob beradi' : k === 'edge' ? 'chegarada (≥ 1,5 soat)' : 'yetarli emas'))}</text>`,
      `<text x="${n2(x + w)}" y="${n2(yy)}" font-size="2.3" font-weight="600" text-anchor="end" fill="#1d1d1b">${c[k]}</text>`);
    yy += 4.8;
  }
  yy += 7;
  o.push(`<text x="${n2(x)}" y="${n2(yy)}" font-size="9" font-weight="700" fill="${c.bad ? ST_COL.bad : ST_COL.ok}">${Math.round(c.ok / N * 100)} %</text>`,
    `<text x="${n2(x + 26)}" y="${n2(yy - 3.4)}" font-size="2.1" fill="#55524b">${esc(`${N} ${tr('kvartiradan')}`)}</text><text x="${n2(x + 26)}" y="${n2(yy)}" font-size="2.1" fill="#55524b">${esc(`${c.ok} ${tr('tasi mos')}`)}</text>`);
  return { svg: o.join(''), h: yy - y + 4 };
}

export interface ShxOpts { scope: 'bino' | 'loyiha'; bi: number; cell: ShxCell; insol: boolean }

export const SHX_LEGEND = (tr: (s: string) => string, insol: boolean): LegendItem[] => insol
  ? [{ type: 'fill', fill: ST_FILL.ok, stroke: ST_COL.ok, label: tr('talabga javob beradi') }, { type: 'fill', fill: ST_FILL.edge, stroke: ST_COL.edge, label: tr('chegarada (≥ 1,5 soat)') },
    { type: 'fill', fill: ST_FILL.bad, stroke: ST_COL.bad, label: tr('yetarli emas') }, { type: 'hatch', label: tr('noturar qavat') }]
  : [...[1, 2, 3, 4].map(k => ({ type: 'fill' as const, fill: APT_FILL[k], label: `${k}${k === 4 ? '+' : ''} ${tr('xonali')}` })), { type: 'hatch', label: tr('noturar qavat') }];

/** Varaq mazmuni (SheetInner): bino yoki loyiha shaxmatkasi */
export function shxSheet(doc: Project, plans: SecPlan[], o: ShxOpts, tr: (s: string) => string, insolAt?: ShxInsolAt | null, opt: (pl: SecPlan) => Partial<PlanOpts> = () => ({})): SheetInner {
  const legend = SHX_LEGEND(tr, o.insol);
  if (!plans.length) return { label: 'M —', name: 'Shaxmatka', legend: [], body: (vx, vy, vw, vh) => `<text x="${vx + vw / 2}" y="${vy + vh / 2}" font-size="5" text-anchor="middle" fill="#6b6965">${esc(tr('Turar joy seksiyalari yoʻq'))}</text>` };
  const ins = o.insol ? insolAt ?? null : null;
  if (o.scope === 'loyiha') {
    const bs = plans.map((_, i) => shxBuilding(doc, plans, i, ins));
    return {
      label: 'M —', name: o.insol ? 'Insolyatsiya shaxmatkasi' : 'Loyiha shaxmatkasi', legend,
      body: (vx, vy, vw, vh) => {
        const cols = Math.max(1, Math.round(Math.sqrt(bs.length * vw / vh * 0.9))), rows = Math.ceil(bs.length / cols);
        const cw = vw / cols, rh = vh / rows, out = [HATCH];
        bs.forEach((b, i) => {
          const c = i % cols, r = Math.floor(i / cols), x = vx + c * cw, y = vy + r * rh;
          out.push(shxMini(b, x + 4, y + 2, cw - 8, rh - 8, o.insol).svg);
          const n = b.floors.reduce((t, f) => t + f.apts.length, 0);
          let sub = `${b.nF} ${tr('q.')} · ${n} ${tr('kv.')}`, col = '#55524b';
          if (o.insol) { const s = shxInsolStats([b]), m = s.ok + s.edge + s.bad; sub = m ? `${Math.round(s.ok / m * 100)} %${s.bad ? ` · ${s.bad} ✗` : ''}${s.edge ? ` · ${s.edge} ~` : ''}` : '—'; if (s.bad) col = ST_COL.bad; }
          out.push(`<text x="${n2(x + 4)}" y="${n2(y + rh - 2.6)}" font-size="2.6" font-weight="700" fill="#1d1d1b">${b.no}</text><text x="${n2(x + 9)}" y="${n2(y + rh - 2.6)}" font-size="1.8" fill="${col}">${esc(sub)}</text>`);
        });
        return out.join('');
      },
      side: (x, y, w, yMax) => {
        const mx = shxMix(bs), t = mixTable(mx, x, y, w, tr, tr('Loyiha tarkibi')); let out = t.svg, yy = y + t.h + 6;
        if (o.insol) { const b = insolBox(bs, x, yy, w, tr); return out + b.svg; }
        const tgt = doc.settings.aptMix ?? MIX_DEFAULT, sum = tgt.reduce((s, v) => s + v, 0) || 1, NN = mx.reduce((s, r) => s + r.n, 0) || 1;
        if (yy + 30 > yMax) return out;
        out += `<text x="${n2(x)}" y="${n2(yy + 3)}" font-size="2.6" font-weight="700" letter-spacing="0.3" fill="#1d1d1b">${esc(tr('Miks: maqsad va amalda').toUpperCase())}</text>`; yy += 6;
        const bw = w - 22;
        [1, 2, 3, 4].forEach((k, j) => {
          const a = (mx.find(r => r.k === k)?.n ?? 0) / NN * 100, g = (tgt[j] ?? 0) / sum * 100; yy += 5.4;
          out += `<text x="${n2(x)}" y="${n2(yy)}" font-size="2.2" font-weight="600" fill="#1d1d1b">${k}x</text><rect x="${n2(x + 5)}" y="${n2(yy - 3.4)}" width="${n2(bw * a / 60)}" height="2.2" fill="${APT_FILL[k]}"/><rect x="${n2(x + 5)}" y="${n2(yy - 1)}" width="${n2(bw * g / 60)}" height="0.9" fill="#1d1d1b"/><text x="${n2(x + w)}" y="${n2(yy - 1)}" font-size="2" text-anchor="end" fill="#1d1d1b">${Math.round(a)} / ${Math.round(g)} %</text>`;
        });
        out += `<text x="${n2(x)}" y="${n2(yy + 4.4)}" font-size="1.8" fill="#8a857c">${esc(tr('rangli — amalda · qora — maqsad'))}</text>`;
        return out;
      },
    };
  }
  const bi = Math.max(0, Math.min(plans.length - 1, o.bi)), B = shxBuilding(doc, plans, bi, ins), pl = plans[bi];
  return {
    label: 'M —', name: `${tr(`${bi + 1}-bino`)} · ${tr(o.insol ? 'insolyatsiya' : 'shaxmatka')}`, legend,
    body: (vx, vy, vw, vh) => {
      // keng varaqda: oʻngda tipik qavat rejasi (qavat ichidagi tartib)
      const wide = vw / vh > 1.25, bw = wide ? vw * 0.66 : vw;
      const r = shxBoard(B, vx, vy, bw, wide ? vh : vh * 0.66, o.cell, o.insol, tr);
      let out = HATCH + r.svg;
      const tf = B.floors.find(f => f.res && f.f > 1) ?? B.floors.find(f => f.res);
      if (tf && pl.layout.plan) {
        // keng varaqda — oʻngda, aks holda — toʻr ostida
        const px = wide ? vx + bw + 6 : vx + 6, pw = wide ? vw - bw - 6 : vw * 0.7, py0 = wide ? vy : vy + r.h + 6;
        let tint: PlanOpts['tint'];
        if (o.insol && ins) {
          const V = floorVariant(pl.layout.plan, floorTypeOf(pl, tf.f), pl.layout.mods, doc.settings.aptSize ?? 'M'), FI = floorInsol(V, pl.layout.mods, m => ins(pl.bid, tf.f, m));
          tint = { fill: FI.apts.map(a => ST_FILL[a.status]), stroke: FI.apts.map(a => ST_COL[a.status]), sub: FI.apts.map(a => (a.status === 'na' ? '—' : `${a.ok}/${a.need} ${a.status === 'ok' ? '✓' : '✗'}`)) };
        }
        const P = floorPlanSvg(pl, { scale: 100, dims: false, title: '', floor: tf.f, bare: true, num: true, ...opt(pl), ...(tint ? { tint } : {}) });
        const inner = P.svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/id="hatch"/g, 'id="shxPH"').replace(/url\(#hatch\)/g, 'url(#shxPH)').replace(/id="tile"/g, 'id="shxPT"').replace(/url\(#tile\)/g, 'url(#shxPT)');
        const ph0 = wide ? vh * 0.6 : vy + vh - py0 - 22;
        let ph = Math.min(ph0, pw * P.heightMm / P.widthMm + 1); const pw2 = Math.min(pw, ph * P.widthMm / P.heightMm);
        if (ph < 20) return out;
        out += `<text x="${n2(px)}" y="${n2(py0 + 4)}" font-size="2.6" font-weight="700" letter-spacing="0.3" fill="#1d1d1b">${esc(`${tf.f}-${tr('qavat')} ${tr('rejasi')}`.toUpperCase())}</text>`
          + `<text x="${n2(px)}" y="${n2(py0 + 7.4)}" font-size="1.9" fill="#8a857c">${esc(tr('raqamlar — qavat ichidagi tartib'))}</text>`
          + `<svg x="${n2(px)}" y="${n2(py0 + 9)}" width="${n2(pw2)}" height="${n2(ph)}" viewBox="0 0 ${P.widthMm.toFixed(1)} ${P.heightMm.toFixed(1)}" preserveAspectRatio="xMinYMin meet">${inner}</svg>`;
        if (o.insol) out += `<text x="${n2(px)}" y="${n2(py0 + 9 + ph + 5)}" font-size="2" fill="#55524b">${esc('SanQvaN 0102-25: 95-band — 2 soat uzluksiz; 94-band — 1–3 xonalida ≥ 1, 4–5 xonalida ≥ 2 xona.')}</text><text x="${n2(px)}" y="${n2(py0 + 9 + ph + 8.4)}" font-size="2" fill="#55524b">${esc(`${tr('chegarada')}: ≥ ${fm(EDGE_H)} ${tr('soat')} · N — ${tr('bir tomonlama shimoliy')}`)}</text>`;
      }
      return out;
    },
    side: (x, y, w) => {
      const t = mixTable(shxMix([B]), x, y, w, tr, tr('Kvartiralar tarkibi'));
      return t.svg + (o.insol ? insolBox([B], x, y + t.h + 6, w, tr).svg : '');
    },
  };
}

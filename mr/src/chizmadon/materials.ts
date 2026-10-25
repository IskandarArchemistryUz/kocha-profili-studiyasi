/**
 * «Loyihadan» materiallar (bitta oyna). Ikki manba:
 *  1) hudud tahlili (Joyshunos usulida, tarmoqsiz): davlat / viloyat / tuman chegarasi, shartli belgilar, hudud pasporti,
 *     quyosh yoʻli, kun uzunligi, harorat (namuna — ERA5 ulanmagan), xulosa matni — location.ts maʼlumotidan;
 *  2) Master reja loyihasi: bosh reja (Varaqlar), TIK jadvali, 3D sahna rasmi va «Chizmadonga» yuborilgan xaritalar.
 * Har material katak toʻrtburchagiga mm da chiziladi (render). Chizuvchilar prototip app_core.js dan koʻchirilgan.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { T, R0, L0, para, n2, stf } from './sheet';
import { type Resolved, geo, world, uzBB, rings, bbHit, rName, dName, sun, hm, f1, autoNote } from './location';
import type { Material, MRole, Rect } from './autolayout';
import type { ChMatSet, ChInbox, ChEl, ChPage } from './model';
import { elSvg } from './render';

const D2R = Math.PI / 180;
const G = (): any => geo();

/* ---------- maʼlumot palitrasi ---------- */
function DP(P?: any) { return { land: P.land, line: "#b7b0a9", border: P.ink, hl: P.acc, ink: P.ink, mut: P.mut, grid: P.line, summer: P.acc, equi: P.acc3, winter: P.acc2, chart: P.acc4 }; }

/* ---------- haqiqiy maʼlumot chizuvchilari ---------- */
function fitProj(bb?: any, x?: any, y?: any, w?: any, h?: any, pad?: any) { const lat0 = (bb[1] + bb[3]) / 2, kx = Math.cos(lat0 * D2R); const bw = (bb[2] - bb[0]) * kx, bh = bb[3] - bb[1]; const s = Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh); const ox = x + (w - bw * s) / 2, oy = y + (h - bh * s) / 2; return (pt: any) => [ox + (pt[0] - bb[0]) * kx * s, oy + (bb[3] - pt[1]) * s]; }
function gpath(g?: any, pr?: any) { let d = ""; for (const poly of rings(g)) for (const r of poly) { r.forEach((pt: any, i: any) => { const q = pr(pt); d += (i ? "L" : "M") + n2(q[0]) + " " + n2(q[1]); }); d += "Z"; } return d; }
const marker = (q?: any, u?: any, c?: any) => `<circle cx="${n2(q[0])}" cy="${n2(q[1])}" r="${n2(2.6 * u)}" fill="none" stroke="${c}" stroke-width="${n2(0.5 * u)}"/><circle cx="${n2(q[0])}" cy="${n2(q[1])}" r="${n2(1 * u)}" fill="${c}"/>`;
function head(el?: any, x?: any, y?: any, u?: any, Q?: any, sub?: any, bare?: any) { if (bare) return ""; let s = T(x, y + 3 * u, (el.title || ""), { s: 2.4 * u, c: Q.mut, ls: 0.35 * u, w: 600, up: 1 }); if (sub) s += T(x, y + 7.6 * u, sub, { s: 3.5 * u, c: Q.ink, w: 600 }); return s; }

export function drawEl(el?: any, r?: any, ctx?: any, R?: any, bare?: any) {
  const P = ctx.P, Q = DP(P), u = ctx.u * el.scale, hl = el.accent || Q.hl;
  const x = r.x, y = r.y, w = r.w, h = r.h, top = bare ? 0 : (el.role === "locator" ? 10 : 8) * u;
  if (el.role === "title") {
    const big = Math.min(h * 0.42, w / 14, 16 * u);
    const sub = R.inside ? [R.reg ? rName(R.reg.n) : "Oʻzbekiston", R.dis ? dName(R.dis.n) : null].filter(Boolean).join(" · ") : R.cn;
    return T(x, y + big * 0.95, el.title, { s: big, w: 700, c: el.accent || Q.ink, ls: -0.02 * big }) + T(x, y + big + 5 * u, sub, { s: 3.4 * u, c: Q.mut });
  }
  if (el.role === "locator" && !R.inside) return worldLoc(el, x, y, w, h, top, u, Q, hl, R, bare);
  if (el.role === "locator") {
    let g = "";
    if (el.level === 0) {
      g += head(el, x, y, u, Q, "Oʻzbekiston", bare);
      const pr = fitProj(uzBB(), x, y + top, w, h - top, 1);
      G().r.forEach((rg: any) => { const on = R.reg && rg.n === R.reg.n; g += `<path d="${gpath(rg.g, pr)}" fill="${on ? hl : Q.land}" fill-opacity="${on ? 0.3 : 1}" stroke="${on ? hl : Q.line}" stroke-width="${n2((on ? 0.5 : 0.22) * u)}" stroke-linejoin="round"/>`; });
      g += `<path d="${gpath(G().c, pr)}" fill="none" stroke="${Q.border}" stroke-width="${n2(0.6 * u)}" stroke-linejoin="round"/>`;
      if (R.inside) g += marker(pr(R.p), u, hl);
      return g;
    }
    if (el.level === 1) {
      if (!R.reg) return head(el, x, y, u, Q, "—", bare);
      g += head(el, x, y, u, Q, rName(R.reg.n), bare);
      const pr = fitProj(R.reg.bb, x, y + top, w, h - top, 1);
      g += `<path d="${gpath(R.reg.g, pr)}" fill="${Q.land}"/>`;
      G().d.filter((d: any) => d.r === R.reg.n).forEach((d: any) => { const on = R.dis && d.n === R.dis.n; g += `<path d="${gpath(d.g, pr)}" fill="${on ? hl : "none"}" fill-opacity="${on ? 0.3 : 0}" stroke="${on ? hl : Q.line}" stroke-width="${n2((on ? 0.5 : 0.2) * u)}" stroke-linejoin="round"/>`; });
      g += `<path d="${gpath(R.reg.g, pr)}" fill="none" stroke="${Q.border}" stroke-width="${n2(0.5 * u)}" stroke-linejoin="round"/>` + marker(pr(R.p), u, hl);
      return g;
    }
    if (!R.dis) return head(el, x, y, u, Q, "—", bare);
    g += head(el, x, y, u, Q, dName(R.dis.n), bare);
    const bot = 6 * u, pr = fitProj(R.dis.bb, x, y + top, w, h - top - bot, 1), q = pr(R.p);
    g += `<path d="${gpath(R.dis.g, pr)}" fill="${hl}" fill-opacity=".14" stroke="${hl}" stroke-width="${n2(0.5 * u)}" stroke-linejoin="round"/>`;
    g += L0(q[0] - 6 * u, q[1], q[0] + 6 * u, q[1], Q.ink, 0.2 * u) + L0(q[0], q[1] - 6 * u, q[0], q[1] + 6 * u, Q.ink, 0.2 * u) + marker(q, u, hl);
    g += T(x, y + h - 1 * u, `${R.lat.toFixed(4)}° N  ${R.lon.toFixed(4)}° E`, { s: 2.3 * u, c: Q.mut, mono: 1 });
    if (R.dArea) g += T(x + w, y + h - 1 * u, `≈ ${f1(R.dArea)} km²`, { s: 2.3 * u, c: Q.mut, mono: 1, a: "end" });
    return g;
  }
  if (el.role === "legend") {
    const it = [[Q.hl, "Hudud nuqtasi va tanlangan chegara", "dot"], [Q.land, "Viloyatlar / tumanlar", "box"], [Q.border, "Davlat chegarasi", "line"], [Q.summer, "Yozgi quyosh yoʻli", "line"], [Q.equi, "Teng kunlik", "line"], [Q.winter, "Qishki quyosh yoʻli", "line"]];
    let g = T(x, y + 3 * u, el.title, { s: 2.4 * u, c: Q.mut, ls: 0.35 * u, w: 600, up: 1 });
    const wide = w > h * 2.2, cols = wide ? 3 : 1, cw = w / cols, lh = Math.min(5.4 * u, (h - 7 * u) / Math.ceil(it.length / cols));
    it.forEach((q: any, k: any) => { const cx = x + (k % cols) * cw, cy = y + 8 * u + Math.floor(k / cols) * lh; if (cy > y + h) return;
      if (q[2] === "dot") g += `<circle cx="${n2(cx + 1.5 * u)}" cy="${n2(cy - 0.9 * u)}" r="${n2(1.2 * u)}" fill="${q[0]}"/>`;
      else if (q[2] === "box") g += R0(cx, cy - 2.2 * u, 3 * u, 2.4 * u, q[0], ` stroke="${Q.line}" stroke-width="${n2(0.2 * u)}"`);
      else g += L0(cx, cy - 0.9 * u, cx + 3.2 * u, cy - 0.9 * u, q[0], 0.6 * u);
      g += T(cx + 5 * u, cy, q[1], { s: 2.6 * u, c: Q.ink }); });
    return g;
  }
  let g = head(el, x, y, u, Q, null, bare);
  const by = y + top, bh = h - top;
  if (el.kind === "passport") {
    const rows = [["Davlat", R.cn], ["Viloyat", R.inside ? (R.reg ? rName(R.reg.n) : "—") : "ulanmagan"], ["Tuman", R.inside ? (R.dis ? dName(R.dis.n) : "—") : "ulanmagan"], ["Kenglik", Math.abs(R.lat).toFixed(4) + (R.lat >= 0 ? "° N" : "° S")], ["Uzunlik", Math.abs(R.lon).toFixed(4) + (R.lon >= 0 ? "° E" : "° W")], ["Tuman maydoni", R.dArea ? "≈ " + f1(R.dArea) + " km²" : "—"], ["Qishki kun", hm(R.winLen, stf)]];
    const rh = Math.min(bh / rows.length, 7.5 * u);
    rows.forEach((q: any, i: any) => { const yy = by + rh * (i + 0.7); g += T(x, yy, q[0], { s: 2.6 * u, c: Q.mut }) + T(x + w, yy, q[1], { s: 2.8 * u, c: Q.ink, a: "end", w: 500 }); if (i < rows.length - 1) g += L0(x, by + rh * (i + 1), x + w, by + rh * (i + 1), Q.grid, 0.2 * u); });
    return g;
  }
  if (el.kind === "sunpath") {
    const statH = 10 * u, Rr = Math.max(4, Math.min(w, bh - statH) / 2 - 3 * u), cx = x + w / 2, cy = by + (bh - statH) / 2, L = R.lat;
    [0, 30, 60].forEach((a: any) => { g += `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(Rr * (90 - a) / 90)}" fill="none" stroke="${Q.grid}" stroke-width="${n2(0.25 * u)}"/>`; });
    g += T(cx, cy - Rr - 1 * u, "Sh", { s: 2.3 * u, a: "middle", c: Q.mut }) + T(cx, cy + Rr + 3 * u, "J", { s: 2.3 * u, a: "middle", c: Q.mut }) + T(cx + Rr + 1 * u, cy + 1 * u, "Shq", { s: 2.3 * u, c: Q.mut }) + T(cx - Rr - 1 * u, cy + 1 * u, "Gʻ", { s: 2.3 * u, a: "end", c: Q.mut });
    [[R.sd, Q.summer], [0, Q.equi], [-R.sd, Q.winter]].forEach(([dec, c]) => { let d = "", st = false; for (let H = -180; H <= 180; H += 3) { const sp = sun(L, dec, H); if (sp.alt < 0) { st = false; continue; } const rr = Rr * (90 - sp.alt) / 90; d += (st ? "L" : "M") + n2(cx + rr * Math.sin(sp.az * D2R)) + " " + n2(cy - rr * Math.cos(sp.az * D2R)); st = true; } g += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${n2(0.6 * u)}"/>`; const s0 = sun(L, dec, 0); if (s0.alt > 0) { const rn = Rr * (90 - s0.alt) / 90; g += `<circle cx="${n2(cx + rn * Math.sin(s0.az * D2R))}" cy="${n2(cy - rn * Math.cos(s0.az * D2R))}" r="${n2(0.9 * u)}" fill="${c}"/>`; } });
    const sy = by + bh - 1 * u, cw = w / 3;
    [[f1(R.sumAlt) + "°", "yoz, tush", Q.summer], [f1(R.eqAlt) + "°", "teng kun", Q.equi], [f1(R.winAlt) + "°", "qish, tush", Q.winter]].forEach((v: any, i: any) => { g += T(x + cw * i, sy - 3.6 * u, v[0], { s: 3.6 * u, w: 600 }) + T(x + cw * i, sy, v[1], { s: 2.3 * u, c: v[2] }); });
    return g;
  }
  if (el.kind === "daylight" || el.kind === "temp") {
    const isT = el.kind === "temp", vals = isT ? [1.0, 3.5, 9.5, 15.5, 20.5, 26, 28, 26, 20.5, 13.5, 7.5, 2.5] : R.months, lo = isT ? -5 : 8, hi = isT ? 30 : 16, step = isT ? 5 : 2;
    const statH = 10 * u, lw = 7 * u, cx0 = x + lw, cw = w - lw, ch = bh - statH - 6 * u, cy0 = by + 2 * u;
    const X = (i: number) => cx0 + cw * (i + 0.5) / 12, Y = (v: number) => cy0 + ch * (1 - (v - lo) / (hi - lo));
    for (let v = lo; v <= hi; v += step) g += L0(cx0, Y(v), cx0 + cw, Y(v), v === 0 && isT ? Q.line : Q.grid, 0.2 * u) + T(cx0 - 1.5 * u, Y(v) + 1 * u, isT ? v + "°" : v + " s", { s: 2.1 * u, a: "end", c: Q.mut, mono: 1 });
    for (let i = 0; i < 12; i++) g += T(X(i), cy0 + ch + 4 * u, String(i + 1), { s: 2.1 * u, a: "middle", c: Q.mut, mono: 1 });
    const c = el.accent || (isT ? Q.hl : Q.chart), d = vals.map((v: any, i: any) => (i ? "L" : "M") + n2(X(i)) + " " + n2(Y(v))).join("");
    g += `<path d="${d}L${n2(X(11))} ${n2(Y(lo))}L${n2(X(0))} ${n2(Y(lo))}Z" fill="${c}" fill-opacity=".1"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${n2(0.6 * u)}" stroke-linejoin="round"/>`;
    vals.forEach((v: any, i: any) => { g += `<circle cx="${n2(X(i))}" cy="${n2(Y(v))}" r="${n2(0.7 * u)}" fill="#fff" stroke="${c}" stroke-width="${n2(0.35 * u)}"/>`; });
    const sy = by + bh - 1 * u;
    if (isT) g += T(x, sy - 3.6 * u, "NAMUNA", { s: 3 * u, w: 700, c: Q.hl, ls: 0.4 * u }) + T(x, sy, "ERA5 ulanmagan — raqamlar koʻrsatish uchun", { s: 2.3 * u, c: Q.mut });
    else g += T(x, sy - 3.6 * u, hm(R.sumLen, stf), { s: 3.4 * u, w: 600 }) + T(x, sy, R.south ? "22-dekabr" : "22-iyun", { s: 2.3 * u, c: Q.summer }) + T(x + w / 2, sy - 3.6 * u, hm(R.winLen, stf), { s: 3.4 * u, w: 600 }) + T(x + w / 2, sy, R.south ? "22-iyun" : "22-dekabr", { s: 2.3 * u, c: Q.winter });
    return g;
  }
  if (el.kind === "note") {
    const txt = el.text != null ? el.text : autoNote(R, stf), fs = Math.min(3.2 * u, Math.max(2.4 * u, Math.sqrt(w * bh / Math.max(1, txt.length)) * 0.55));
    g += para(x, by, w, bh - 4 * u, txt, fs, Q.ink, 1.42, true);
    return g + T(x, by + bh, el.text != null ? "qoʻlda tahrirlangan" : "avtomatik matn · qoida boʻyicha", { s: 2.2 * u, c: el.text != null ? Q.hl : Q.mut });
  }
  return g;
}
/* Oʻzbekistondan tashqari: davlat chegarasi dunyo xaritasidan, viloyat/tuman ulanmagan */
function worldLoc(el?: any, x?: any, y?: any, w?: any, h?: any, top?: any, u?: any, Q?: any, hl?: any, R?: any, bare?: any) {
  const p = R.p, c = R.country; let g = "", bb;
  const sub = el.level === 0 ? (c ? R.cn : "—") : el.level === 1 ? R.cn : `${Math.abs(R.lat).toFixed(2)}° ${R.lat >= 0 ? "N" : "S"}`;
  g += head(el, x, y, u, Q, sub, bare);
  const bot = el.level ? 6 * u : 0, ih = h - top - bot, asp = w / Math.max(1, ih);
  const fitBB = (b?: any, padK?: any, minSpan?: any) => { let cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, sx = Math.max(minSpan, (b[2] - b[0]) * padK), sy = Math.max(minSpan * 0.6, (b[3] - b[1]) * padK); const k = Math.cos(cy * D2R); if (sx * k / sy < asp) sx = sy * asp / k; else sy = sx * k / asp; return [cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2]; };
  if (el.level === 0) bb = fitBB(c ? c.bb : [p[0] - 20, p[1] - 12, p[0] + 20, p[1] + 12], 2.4, 24);
  else if (el.level === 1) bb = fitBB(c ? c.bb : [p[0] - 5, p[1] - 3, p[0] + 5, p[1] + 3], 1.12, 2);
  else bb = fitBB([p[0] - 0.5, p[1] - 0.35, p[0] + 0.5, p[1] + 0.35], 1, 0.9);
  const pr = fitProj(bb, x, y + top, w, ih, 0), cid = "wl" + el.id + Math.round(x * 10);
  g += `<defs><clipPath id="${cid}"><rect x="${n2(x)}" y="${n2(y + top)}" width="${n2(w)}" height="${n2(ih)}"/></clipPath></defs><g clip-path="url(#${cid})"><rect x="${n2(x)}" y="${n2(y + top)}" width="${n2(w)}" height="${n2(ih)}" fill="#fff"/>`;
  (world() ?? []).forEach((o: any) => { if (!bbHit(o.bb, bb)) return; const on = c && o.n === c.n; g += `<path d="${gpath(o.g, pr)}" fill="${on ? (el.level === 2 ? hl : hl) : Q.land}" fill-opacity="${on ? (el.level === 0 ? 0.3 : 0.12) : 1}" stroke="${on ? hl : Q.line}" stroke-width="${n2((on ? 0.5 : 0.22) * u)}" stroke-linejoin="round"/>`; });
  const q = pr(p);
  if (el.level === 2) g += L0(q[0] - 6 * u, q[1], q[0] + 6 * u, q[1], Q.ink, 0.2 * u) + L0(q[0], q[1] - 6 * u, q[0], q[1] + 6 * u, Q.ink, 0.2 * u);
  g += marker(q, u, hl) + `</g>`;
  if (el.level) g += T(x, y + h - 1 * u, el.level === 1 ? "Viloyat chegaralari bu davlat uchun ulanmagan" : `${R.lat.toFixed(4)}°  ${R.lon.toFixed(4)}° · tuman chegarasi ulanmagan`, { s: 2.3 * u, c: Q.mut, mono: el.level === 2 ? 1 : 0 });
  return g;
}
export function moduleWrap(el?: any, r?: any, ctx?: any, R?: any, num?: any) {
  const u = ctx.u, Q = DP(ctx.P);
  return T(r.x, r.y + 4 * u, `${num}. ${el.title}`, { s: 3.4 * u, w: 700, c: el.accent || Q.hl }) + drawEl(el, { x: r.x, y: r.y + 7 * u, w: r.w, h: r.h - 8 * u }, ctx, R, true);
}
/* ---------- material roʻyxatlari ---------- */
type Def = Pick<Material, 'id' | 'role' | 'name' | 'title'> & { level?: number; kind?: string };
/** Hudud tahlili toʻplami (prototipdagi tartib) */
export const SITE_DEFS: Def[] = [
  { id: 'title', role: 'title', name: 'Sarlavha', title: 'Hudud tahlili' },
  { id: 'loc0', role: 'locator', level: 0, name: 'Davlat chegarasi', title: 'Davlat' },
  { id: 'loc1', role: 'locator', level: 1, name: 'Viloyat chegarasi', title: 'Viloyat' },
  { id: 'loc2', role: 'locator', level: 2, name: 'Tuman chegarasi', title: 'Tuman' },
  { id: 'legend', role: 'legend', name: 'Shartli belgilar', title: 'Shartli belgilar' },
  { id: 'pass', role: 'table', kind: 'passport', name: 'Hudud pasporti', title: 'Hudud pasporti' },
  { id: 'sun', role: 'chart', kind: 'sunpath', name: 'Quyosh yoʻli', title: 'Quyosh yoʻli' },
  { id: 'izoh', role: 'text', kind: 'note', name: 'Xulosa matni', title: 'Loyihaga xulosa' },
  { id: 'day', role: 'chart', kind: 'daylight', name: 'Kun uzunligi', title: 'Kun uzunligi' },
  { id: 'temp', role: 'chart', kind: 'temp', name: 'Harorat (namuna)', title: 'Harorat' },
];
/** Sozlamani materialga qoʻllash (koʻrinish, rang, oʻlcham, sarlavha, matn) */
function withSet(d: Def, s: ChMatSet | undefined, render: Material['render'], defVisible = true): Material {
  // 19-band (3): foydalanuvchi oʻz rasmi bilan almashtirgan — katakka rasm (markazdan, kesib) chiziladi
  const own = s?.src, R2: Material['render'] = own ? (r) => fitMap(`u${d.id.replace(/[^\w-]/g, '_')}`, { src: own, w: r.w, h: r.h }, r, d.name) : render;
  return { ...d, visible: s?.visible ?? defVisible, accent: s?.accent ?? null, scale: s?.scale ?? 1, title: s?.title ?? d.title, text: s?.text ?? null, render: R2, ...(own ? { own: true } : {}) } as Material;
}
export function siteMaterials(R: () => Resolved, sets: Record<string, ChMatSet>): Material[] {
  return SITE_DEFS.map(d => { const m: Material = withSet(d, sets[d.id], (r, ctx, bare) => drawEl(m, r, ctx, R(), bare)); return m; });
}

/** Master reja loyihasidan: bosh reja, TIK jadvali, sahna rasmi va «Chizmadonga» yuborilganlar */
/** Master rejaning bitta rejasi (Varaqlar namunasi yoki qavat rejasi): xarita qismi (mm) va shartli belgilari */
export interface PlanMap { svg: string; vb: [number, number, number, number]; w: number; h: number; scale?: number; north?: number; legend?: { type: string; fill?: string; stroke?: string; label: string }[]; /** butunicha sigʻdirish (kesmasdan) — qavat rejalari */ contain?: boolean;
  /** katak tepasida sarlavha (material nomi) va shu kichik sarlavha — qavat rejalari */ sub?: string }
/** 19-band: Master reja rejalari — bosh reja, zonalashtirish (land use), funksional, qavatlilik, kvartirografiya…; get — dangasa (faqat koʻrinsa hisoblanadi) */
export interface PlanSrc { id: string; name: string; on: boolean;
  /** fit — katak oʻlchami (mm): berilsa, reja shu oʻlchamga mos masshtabda chiziladi (qavat rejalari) */
  get: (fit?: { w: number; h: number }) => PlanMap | null | undefined;
  /** reja bilan juft jadval (oʻng panelda) */ table?: { id: string; name: string; title: string; rows: () => string[][] | null };
  /** reja bilan juft vaziyat sxemasi (kichik katakda) */ nav?: { id: string; name: string; title: string; draw: (r: Rect) => string } }
export interface ProjectSrc {
  plan?: { svg: string; vb: [number, number, number, number]; w: number; h: number; scale?: number } | null;
  plans?: PlanSrc[];
  tik?: string[][];
  scene?: string | null;
  inbox?: ChInbox[];
}
const DUMMY: ChPage = { id: 'm', name: '', paper: 'A3', landscape: true, layers: [], els: [] };
/** Xarita yoki rasmni katakka sigʻdirib (markazdan, «cover») chizish — render.ts mapEl / imageEl orqali */
function fitMap(id: string, src: { svg?: string; src?: string; vb?: [number, number, number, number]; w: number; h: number; scale?: number; north?: number; contain?: boolean }, r: Rect, name: string): string {
  const e: ChEl = { id: `mt${id}`, t: src.svg ? 'map' : 'image', layer: 'm', x: r.x, y: r.y, w: r.w, h: r.h, name, style: { width: 0.25 } };
  if (src.svg) {
    const vb = src.vb ?? [0, 0, src.w, src.h], k = (src.contain ? Math.min : Math.max)(r.w / vb[2], r.h / vb[3]), vw = r.w / k, vh = r.h / k;
    e.svg = src.svg; e.vb = [vb[0] + (vb[2] - vw) / 2, vb[1] + (vb[3] - vh) / 2, vw, vh];
    if (src.scale) { e.scale = Math.round(src.scale / k); e.natW = r.w; }
    if (Number.isFinite(src.north)) e.north = src.north;
  } else e.src = src.src;
  return elSvg(e, DUMMY, { idp: `mt${id}`, tr: s => s }).replace(/ data-id="[^"]*"/g, '');
}
/** Reja shartli belgilari — katakning chap-pastki burchagida oq quti (≤ 8 ta) */
/** Shartli belgilar qutisi oʻlchami (mm) */
function legendSize(items: PlanMap['legend'], u: number): { w: number; h: number } | null {
  if (!items?.length) return null;
  const it = items.slice(0, 8), lh = 3.6 * u, pad = 2 * u;
  return { w: pad * 2 + 6 * u + Math.max(...it.map(q => q.label.length)) * 1.25 * u, h: pad * 2 + it.length * lh };
}
/**
 * 28-band: reja va shartli belgilar bitta katakda — quti rejaning USTIGA tushmaydi. Keng katakda reja chapda, quti oʻngda;
 * baland katakda reja tepada, quti pastda; ikkalasiga joy yetmasa (kichik katak) — faqat reja (belgilar alohida «Shartli belgilar» materialida).
 */
export function planWithLegend(items: PlanMap['legend'], r: Rect, u: number): { plan: Rect; legend: Rect | null } {
  const L = legendSize(items, u); if (!L) return { plan: r, legend: null };
  const g = 2 * u;
  if (r.w - L.w - g >= Math.max(0.55 * r.w, 30 * u) && L.h <= r.h) return { plan: { ...r, w: r.w - L.w - g }, legend: { x: r.x + r.w - L.w, y: r.y + r.h - L.h, w: L.w, h: L.h } };
  if (r.h - L.h - g >= Math.max(0.55 * r.h, 30 * u) && L.w <= r.w) return { plan: { ...r, h: r.h - L.h - g }, legend: { x: r.x, y: r.y + r.h - L.h, w: Math.min(r.w, L.w), h: L.h } };
  return { plan: r, legend: null };
}
function legendBox(items: PlanMap['legend'], r: Rect, ctx: { u: number; P: Record<string, string> }): string {
  if (!items?.length) return '';
  const u = ctx.u, Q = DP(ctx.P), it = items.slice(0, 8), lh = 3.6 * u, pad = 2 * u, h = r.h, w = r.w;
  const x = r.x, y = r.y;
  let g = `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="#ffffff" fill-opacity=".93" stroke="${Q.grid}" stroke-width="${n2(0.2 * u)}"/>`;
  it.forEach((q, k) => {
    const cy = y + pad + k * lh + lh * 0.72, sx = x + pad;
    if (q.type === 'line' || q.type === 'dash') g += `<path d="M${n2(sx)} ${n2(cy - 0.9 * u)}h${n2(3.6 * u)}" stroke="${q.stroke ?? q.fill ?? Q.ink}" stroke-width="${n2(0.5 * u)}"${q.type === 'dash' ? ` stroke-dasharray="${n2(1 * u)} ${n2(0.6 * u)}"` : ''}/>`;
    else if (q.type === 'tree' || q.type === 'stop') g += `<circle cx="${n2(sx + 1.8 * u)}" cy="${n2(cy - 0.9 * u)}" r="${n2(1.1 * u)}" fill="${q.fill ?? '#9cc27f'}" stroke="${q.stroke ?? 'none'}" stroke-width="${n2(0.15 * u)}"/>`;
    else g += R0(sx, cy - 2.1 * u, 3.6 * u, 2.4 * u, q.fill ?? '#ffffff', ` stroke="${q.stroke ?? Q.line}" stroke-width="${n2(0.15 * u)}"`);
    g += T(sx + 5 * u, cy, q.label, { s: 2.2 * u, c: Q.ink });
  });
  return g;
}
function tableArt(rows: string[][], r: Rect, ctx: { u: number; P: Record<string, string> }, m: Material, bare?: boolean): string {
  const u = ctx.u * m.scale, Q = DP(ctx.P); let g = bare ? '' : head(m, r.x, r.y, u, Q, null, false);
  const top = bare ? 0 : 8 * u, by = r.y + top, bh = r.h - top, rh = Math.min(bh / Math.max(1, rows.length), 7 * u);
  rows.forEach((q, i) => {
    const yy = by + rh * (i + 0.7), hd = i === 0;
    g += T(r.x, yy, q[0] ?? '', { s: (hd ? 2.3 : 2.6) * u, c: hd ? Q.mut : Q.ink, w: hd ? 600 : 400 });
    // «{#rrggbb}matn» — oʻrta ustunda rang namunasi bilan (kvartira turi va h.k.)
    const sw = q.length > 2 ? /^\{(#[0-9a-fA-F]{6})\}(.*)$/.exec(q[1] ?? '') : null;
    if (sw) g += R0(r.x + r.w * 0.66 - 3.6 * u - 2.3 * u * sw[2].length * 0.52 - 1.2 * u, yy - 2.2 * u, 3.6 * u, 2.4 * u, sw[1], ` stroke="${Q.line}" stroke-width="${n2(0.15 * u)}"`);
    if (q.length > 2) g += T(r.x + r.w * 0.66, yy, sw ? sw[2] : q[1] ?? '', { s: 2.3 * u, c: Q.mut, a: 'end' });
    g += T(r.x + r.w, yy, q[q.length - 1] ?? '', { s: (hd ? 2.3 : 2.7) * u, c: hd ? Q.mut : Q.ink, a: 'end', w: hd ? 600 : 500, mono: hd ? 0 : 1 });
    if (i < rows.length - 1) g += L0(r.x, by + rh * (i + 1), r.x + r.w, by + rh * (i + 1), Q.grid, 0.2 * u);
  });
  return g;
}
export function projectMaterials(src: ProjectSrc, sets: Record<string, ChMatSet>): Material[] {
  const out: Material[] = [];
  const add = (d: Def, render: NonNullable<Material['render']>, vis = true) => { const m: Material = withSet(d, sets[d.id], render, vis); out.push(m); return m; };
  for (const p of src.plans ?? []) {
    let M: PlanMap | null | undefined, got = false;
    const fitted = new Map<string, PlanMap | null>();
    const pm = add({ id: p.id, role: 'plan' as MRole, name: p.name, title: p.name }, (r, ctx, bare) => {
      if (!got) { got = true; try { M = p.get(); } catch { M = null; } }
      if (!M) return '';
      // qavat rejasi (sub): tepada sarlavha, ostida — katakka mos standart masshtabdagi reja (choʻzilmaydi, belgilar — juft jadvalda)
      if (M.sub != null) {
        const u = ctx.u * pm.scale, top = bare ? 0 : 10 * u, rr = { x: r.x, y: r.y + top, w: r.w, h: r.h - top }, key = `${rr.w.toFixed(1)}x${rr.h.toFixed(1)}`;
        if (!fitted.has(key)) { let f: PlanMap | null = null; try { f = p.get({ w: rr.w, h: rr.h }) ?? null; } catch { f = null; } fitted.set(key, f); }
        const F = fitted.get(key) ?? M;
        return head(pm, r.x, r.y, u, DP(ctx.P), F.sub || null, bare) + fitMap(p.id.replace(/[^\w-]/g, '_'), { ...F, contain: true }, rr, p.name);
      }
      const lay = planWithLegend(M.legend, r, ctx.u);
      return fitMap(p.id.replace(/[^\w-]/g, '_'), M, lay.plan, p.name) + (lay.legend ? legendBox(M.legend, lay.legend, ctx) : '');
    }, p.on);
    if (p.nav) {
      const nv = p.nav;
      const m = add({ id: nv.id, role: 'locator', kind: 'aptnav', name: nv.name, title: nv.title } as Def, (r) => { try { return nv.draw(r); } catch { return ''; } }, p.on);
      m.pair = p.id; m.level = 3; m.minor = true;
    }
    if (p.table) {
      const tb = p.table; let rows: string[][] | null | undefined;
      const m = add({ id: tb.id, role: 'table', kind: 'expl', name: tb.name, title: tb.title } as Def, (r, ctx, bare) => { if (rows === undefined) { try { rows = tb.rows(); } catch { rows = null; } } return rows ? tableArt(rows, r, ctx, m, bare) : ''; }, p.on);
      m.pair = p.id;
    }
  }
  if (src.plan && !src.plans) { const p = src.plan; add({ id: 'p:plan', role: 'plan' as MRole, name: 'Bosh reja', title: 'Bosh reja' }, (r) => fitMap('plan', p, r, 'Bosh reja')); }
  if (src.tik?.length) { const rows = [['Koʻrsatkich', 'Birlik', 'Qiymat'], ...src.tik]; const m = add({ id: 'p:tik', role: 'table', kind: 'tik', name: 'TIK jadvali', title: 'Texnik-iqtisodiy koʻrsatkichlar' }, (r, ctx, bare) => tableArt(rows, r, ctx, m, bare)); }
  if (src.scene) { const s = src.scene; add({ id: 'p:scene', role: 'image', name: 'Sahna rasmi', title: 'Sahna rasmi' }, (r) => fitMap('scene', { src: s, w: r.w, h: r.h }, r, 'Sahna rasmi')); }
  for (const it of src.inbox ?? []) add({ id: `i:${it.id}`, role: (it.svg ? 'plan' : 'image') as MRole, name: it.name, title: it.name }, (r) => fitMap(it.id, it, r, it.name));
  return out;
}
/** Hudud bilan bogʻliq boʻlmagan xaritalar yoʻq — sarlavha matni (Hudud tahlili) loyiha nomi boʻlishi mumkin */
export const placeSub = (R: Resolved): string => (R.inside ? [R.reg ? rName(R.reg.n) : 'Oʻzbekiston', R.dis ? dName(R.dis.n) : null].filter(Boolean).join(' · ') : R.cn);

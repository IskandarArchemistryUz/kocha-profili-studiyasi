/**
 * Bino koʻndalang kesimi va insolyatsiya burchaklari (31.10).
 * Kesim tanlangan seksiya markazidan, uning uzun oʻqiga perpendikulyar; chiziqqa tushgan boshqa binolar — kulrang siluet,
 * yopishgan seksiyalar (oraliq < 0,5 m) — shu binoning davomi (och rang); masofa va soya zanjir chetidan oʻlchanadi.
 * Quyosh: tush payti (quyosh vaqti 12:00) balandligi h = 90° − φ + δ (δ: 22.03 / 22.09 — 0°, 22.06 — +23,44°, 22.12 — −23,44°);
 * kesim tekisligidagi koʻrinma burchak tan α = tan h / |cos θ| (θ — kesim yoʻnalishi va janub–shimol orasidagi burchak).
 * Bu — tez koʻrsatkich (tush payti soya chizigʻi); meʼyoriy tekshiruv (SanQvaN 0102-25, 95-band: 2 soat uzluksiz) — «Insolyatsiya» koʻrinishida.
 * Masofa: qarama-qarshi binogacha ≥ 2·H (ShNQ 2.07.01-23, 79-band, 2-jadval, 8-izoh) — koʻrsatiladi.
 */
import type { XY } from './geo';

export interface SecBld { ring: XY[]; h: number; z0?: number; floors?: number; nonRes?: number; fh?: number }
export interface SunLine { date: string; alt: number; app: number; shadeZ: number | null; side: 1 | -1 }
/** 2 soatlik insolyatsiya (22.03 / 22.09, 11:00–13:00 quyosh vaqti) — kesim boʻyicha: deraza (zw) dan quyoshga nur, toʻsiq balandligi chegarasi */
export interface Ins2 { side: 1 | -1; app: number; zw: number; d: number; hObs: number; hMax: number; ok: boolean }
export interface SectionResult { svg: string; widthMm: number; heightMm: number; suns: SunLine[]; gaps: { side: 1 | -1; d: number; need: number; ok: boolean }[]; ins2: Ins2[] }

/**
 * 22.03 / 22.09 (δ = 0) da quyosh vaqti 11:00–13:00 (soat burchagi ±15°) oraligʻidagi eng past koʻrinma balandlik kesim tekisligida.
 * SanQvaN 0102-25, 95-band: 22.03–22.09 davrida ≥ 2 soat uzluksiz — eng qulay (tush atrofidagi) 2 soat; janubdan boshqa yoʻnalishlarda
 * haqiqiy oraliq boshqacha boʻladi — bu kesim boʻyicha taxmin, aniq hisob — «Insolyatsiya» koʻrinishida.
 */
export function ins2Angle(lat: number, d: XY, north: XY): number {
  const east: XY = [north[1], -north[0]], f = lat * Math.PI / 180; let m = 90;
  for (const w of [-15, -7.5, 0, 7.5, 15]) {
    const W = w * Math.PI / 180, sa = Math.cos(f) * Math.cos(W), a = Math.asin(sa);   // δ = 0
    // azimut (shimoldan sharqqa): quyosh janubda tush payti
    const cosA = (0 - sa * Math.sin(f)) / (Math.cos(a) * Math.cos(f) || 1e-9), sinA = -Math.sin(W) / (Math.cos(a) || 1e-9);
    const A = Math.atan2(sinA, cosA), hx = Math.cos(a) * (Math.sin(A) * east[0] + Math.cos(A) * north[0]), hy = Math.cos(a) * (Math.sin(A) * east[1] + Math.cos(A) * north[1]);
    const along = -(hx * d[0] + hy * d[1]);   // quyosh kesimning chap (janub) tomonida
    const app = Math.atan2(Math.sin(a), Math.max(0.02, along)) * 180 / Math.PI; m = Math.min(m, app);
  }
  return m;
}

/** Uzun oʻq (eng uzun qirra yoʻnalishi) */
function axisOf(r: XY[]): XY { let L = 0, U: XY = [1, 0]; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > L) { L = l; U = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; } } return U; }
/** Chiziq (c + t·d) koʻpburchakni kesgan [t0, t1] oraligʻi */
function span(c: XY, d: XY, r: XY[]): [number, number] | null {
  const ts: number[] = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-9) continue;
    const t = ((a[0] - c[0]) * ey - (a[1] - c[1]) * ex) / den, s = ((a[0] - c[0]) * d[1] - (a[1] - c[1]) * d[0]) / den;
    if (s >= -1e-9 && s <= 1 + 1e-9) ts.push(t);
  }
  return ts.length >= 2 ? [Math.min(...ts), Math.max(...ts)] : null;
}

export function buildingSection(sel: SecBld, others: SecBld[], o: { lat: number; north?: XY; title: string; scale?: number; label?: (s: string) => string }): SectionResult {
  const T = o.label ?? ((s: string) => s), scale = o.scale ?? 200;
  const c: XY = sel.ring.reduce((s, p) => [s[0] + p[0] / sel.ring.length, s[1] + p[1] / sel.ring.length], [0, 0] as XY);
  const U = axisOf(sel.ring);
  // yoʻnalish: uzun oʻqqa perpendikulyar yoki boʻylab — qaysi birida yopishgan seksiyalar zanjiri qisqaroq (burchak seksiyasi)
  const chainLen = (dd: XY) => { const m = span(c, dd, sel.ring); if (!m) return Infinity; const e = [m[0], m[1]]; const ss = others.map(b => span(c, dd, b.ring)).filter((x): x is [number, number] => !!x && x[1] > -70 && x[0] < 70); for (let g = true; g;) { g = false; for (const x of ss) if ((Math.abs(x[1] - e[0]) < 0.5 && x[0] < e[0]) || (Math.abs(x[0] - e[1]) < 0.5 && x[1] > e[1])) { e[0] = Math.min(e[0], x[0]); e[1] = Math.max(e[1], x[1]); g = true; } } return e[1] - e[0] - (m[1] - m[0]); };
  const north = o.north ?? [0, 1];
  let d: XY = [-U[1], U[0]]; const cP = chainLen(d), cU = chainLen(U);
  // burchak seksiyasi (ikkala yoʻnalishda ham zanjir) — insolyatsiya uchun janub–shimolga yaqinrogʻi
  if (cP > 0.5 && cU > 0.5) { if (Math.abs(U[0] * north[0] + U[1] * north[1]) > Math.abs(d[0] * north[0] + d[1] * north[1])) d = [U[0], U[1]]; }
  else if (cU + 0.5 < cP) d = [U[0], U[1]];
  // kesim chapdan oʻngga janubdan shimolga qarab boʻlsin (quyosh chapdan tushadi)
  if (d[0] * north[0] + d[1] * north[1] < 0) d = [-d[0], -d[1]];
  const east: XY = [north[1], -north[0]], card = (v: XY) => { const a = v[0] * north[0] + v[1] * north[1], b = v[0] * east[0] + v[1] * east[1]; return Math.abs(a) >= Math.abs(b) ? (a > 0 ? 'shimol' : 'janub') : (b > 0 ? 'sharq' : 'gʻarb'); };
  const cosT = Math.abs(d[0] * north[0] + d[1] * north[1]);
  const me = span(c, d, sel.ring)!; const H0 = (sel.z0 ?? 0) + sel.h;
  const R = 70;
  const near0 = others.map(b => ({ b, s: span(c, d, b.ring) })).filter(x => x.s && x.s[1] > -R && x.s[0] < R && !(x.s[0] < me[1] - 0.1 && x.s[1] > me[0] + 0.1)) as { b: SecBld; s: [number, number] }[];
  // yopishgan seksiyalar (oraliq < 0,5 m) — shu binoning davomi: zanjir boʻylab kengaytiriladi, qarama-qarshi hisoblanmaydi
  const ext: [number, number] = [me[0], me[1]], att: typeof near0 = [];
  for (let grow = true; grow;) { grow = false; for (const x of near0) if (!att.includes(x) && (Math.abs(x.s[1] - ext[0]) < 0.5 || Math.abs(x.s[0] - ext[1]) < 0.5)) { att.push(x); ext[0] = Math.min(ext[0], x.s[0]); ext[1] = Math.max(ext[1], x.s[1]); grow = true; } }
  const near = near0.filter(x => !att.includes(x));
  const hAt = (t: number) => { const a = att.find(x => Math.abs(x.s[0] - t) < 0.01 || Math.abs(x.s[1] - t) < 0.01); return a ? (a.b.z0 ?? 0) + a.b.h : H0; };
  const He0 = hAt(ext[0]), He1 = hAt(ext[1]);
  // qoʻshni: har tomondagi eng yaqini
  const left = near.filter(x => x.s[1] <= ext[0]).sort((a, b) => b.s[1] - a.s[1])[0], right = near.filter(x => x.s[0] >= ext[1]).sort((a, b) => a.s[0] - b.s[0])[0];
  const t0 = Math.max(-R, Math.min(ext[0] - 12, left ? left.s[0] - 4 : ext[0] - 12)), t1 = Math.min(R, Math.max(ext[1] + 12, right ? right.s[1] + 4 : ext[1] + 12));
  const Hmax = Math.max(H0, ...near.map(x => (x.b.z0 ?? 0) + x.b.h), ...att.map(x => (x.b.z0 ?? 0) + x.b.h)) + 6;
  const k = 1000 / scale, M = 14, Wm = (t1 - t0) * k + 2 * M;
  // matn oʻlchami varaq kengligiga nisbatan (kichik varaqda ham oʻqiladi)
  const f = Math.max(2, Wm / 110), Hm = Hmax * k + 2 * M + 12 * f;
  const X = (t: number) => (M + (t - t0) * k).toFixed(2), Y = (z: number) => (M + 3 * f + (Hmax - z) * k).toFixed(2);
  const out: string[] = [`<rect x="0" y="0" width="${Wm.toFixed(1)}" height="${Hm.toFixed(1)}" fill="#fff"/>`, `<text x="${M}" y="${(M * 0.5 + f).toFixed(2)}" font-size="${(f * 1.6).toFixed(2)}" font-weight="600" fill="#141414">${o.title}</text>`];
  // chizma maydoni varaq ichida qirqiladi
  out.push(`<clipPath id="bsClip"><rect x="${M}" y="0" width="${(Wm - 2 * M).toFixed(2)}" height="${Hm.toFixed(1)}"/></clipPath><g clip-path="url(#bsClip)">`);
  // yer
  out.push(`<line x1="${X(t0)}" y1="${Y(0)}" x2="${X(t1)}" y2="${Y(0)}" stroke="#141414" stroke-width="0.6"/>`, `<rect x="${X(t0)}" y="${Y(0)}" width="${((t1 - t0) * k).toFixed(2)}" height="${(f * 1.2).toFixed(2)}" fill="#e9e5dc"/>`);
  // qoʻshni binolar (kulrang) va shu binoning davomi (och, qavat chiziqlari bilan)
  for (const x of near) { const z0 = x.b.z0 ?? 0; out.push(`<rect x="${X(x.s[0])}" y="${Y(z0 + x.b.h)}" width="${((x.s[1] - x.s[0]) * k).toFixed(2)}" height="${(x.b.h * k).toFixed(2)}" fill="#d9d6cf" stroke="#6b6965" stroke-width="0.3"/><text x="${((Number(X(x.s[0])) + Number(X(x.s[1]))) / 2).toFixed(2)}" y="${(Number(Y(z0 + x.b.h)) - f * 0.6).toFixed(2)}" font-size="${f.toFixed(2)}" text-anchor="middle" fill="#6b6965">H ${Math.round(z0 + x.b.h)} m</text>`); }
  for (const x of att) { const z0 = x.b.z0 ?? 0, fh2 = x.b.fh ?? 3, n2 = x.b.floors ?? Math.round(x.b.h / fh2); for (let i = 0; i < n2; i++) out.push(`<rect x="${X(x.s[0])}" y="${Y(z0 + (i + 1) * fh2)}" width="${((x.s[1] - x.s[0]) * k).toFixed(2)}" height="${(fh2 * k).toFixed(2)}" fill="#efe9de" stroke="#8a8780" stroke-width="0.25"/>`); }
  // tanlangan bino: qavatlar
  const fh = sel.fh ?? 3, fl = sel.floors ?? Math.round(sel.h / fh), nr = sel.nonRes ?? 0, z0 = sel.z0 ?? 0;
  for (let i = 0; i < fl; i++) {
    const za = z0 + i * fh, zb = za + fh;
    out.push(`<rect x="${X(me[0])}" y="${Y(zb)}" width="${((me[1] - me[0]) * k).toFixed(2)}" height="${(fh * k).toFixed(2)}" fill="${i < nr ? '#cfe0f3' : '#f6e7c8'}" stroke="#141414" stroke-width="0.35"/>`);
    out.push(`<text x="${(Number(X(me[0])) + f * 0.4).toFixed(2)}" y="${(Number(Y(za + fh / 2)) + f * 0.3).toFixed(2)}" font-size="${(f * 0.9).toFixed(2)}" fill="#3a3936">${i + 1}</text>`);
    // derazalar ikki fasadda
    for (const t of [me[0], me[1]].filter(t => !att.some(x => Math.abs(x.s[0] - t) < 0.5 || Math.abs(x.s[1] - t) < 0.5))) out.push(`<line x1="${X(t)}" y1="${Y(za + 0.9)}" x2="${X(t)}" y2="${Y(za + 2.4)}" stroke="#fff" stroke-width="0.8"/>`);
  }
  out.push(`<text x="${X(me[0])}" y="${(Number(Y(H0)) - f * 0.6).toFixed(2)}" font-size="${(f * 1.1).toFixed(2)}" font-weight="600" fill="#141414">H ${Math.round(H0 * 10) / 10} m</text>`);
  // quyosh chiziqlari (tush payti) — chap tomondan (janub)
  const dates: [string, number, string][] = [['22.12', -23.44, '#3b6fd8'], ['22.03 / 22.09', 0, '#e2a400'], ['22.06', 23.44, '#d9534f']];
  const suns: SunLine[] = [];
  const side: 1 | -1 = 1;   // quyosh chapdan (janubdan); kesim d — janubdan shimolga
  for (const [nm, dec, col] of dates) {
    const alt = 90 - o.lat + dec, app = Math.atan(Math.tan(alt * Math.PI / 180) / Math.max(0.05, cosT)) * 180 / Math.PI;
    if (alt <= 0) { suns.push({ date: nm, alt, app, shadeZ: null, side }); continue; }
    const tg = Math.tan(app * Math.PI / 180);
    // soya: chapdagi qoʻshni bino tepasidan tanlangan bino janubiy fasadiga
    let shadeZ: number | null = null;
    if (left) {
      // janubdagi qoʻshni tepasidan tanlangan bino janubiy fasadiga: soya chizigʻi balandligi
      const Hl = (left.b.z0 ?? 0) + left.b.h, dd = ext[0] - left.s[1]; shadeZ = Math.max(0, Hl - dd * tg);
      out.push(`<line x1="${X(left.s[1])}" y1="${Y(Hl)}" x2="${X(ext[0])}" y2="${Y(shadeZ)}" stroke="${col}" stroke-width="0.35" stroke-dasharray="1.6 0.8"/>`);
      if (shadeZ > 0) out.push(`<line x1="${(Number(X(ext[0])) - f * 1.5).toFixed(2)}" y1="${Y(shadeZ)}" x2="${X(ext[0])}" y2="${Y(shadeZ)}" stroke="${col}" stroke-width="0.6"/>`);
    }
    // tom chetidan shimolga tushadigan soya: qoʻshni fasadigacha yoki yergacha
    { const L = He1 / tg, endT = right ? Math.min(ext[1] + L, right.s[0]) : Math.min(ext[1] + L, t1), z = Math.max(0, He1 - (endT - ext[1]) * tg);
      out.push(`<line x1="${X(ext[1])}" y1="${Y(He1)}" x2="${X(endT)}" y2="${Y(z)}" stroke="${col}" stroke-width="0.25" stroke-dasharray="0.8 0.8"/>`); }
    suns.push({ date: nm, alt, app, shadeZ, side });
  }
  // 2 soatlik insolyatsiya (22.03 / 22.09, 11–13): janubiy fasaddagi eng pastki turar joy derazasi (pol + 0,9 m) dan quyoshga nur
  const ins2: Ins2[] = [], a2 = ins2Angle(o.lat, d, north), tg2 = Math.tan(a2 * Math.PI / 180);
  if (left) {   // janubdagi qoʻshni → tanlangan binoning janubiy fasadi
    const zw = z0 + nr * fh + 0.9, dd = ext[0] - left.s[1], Hl = (left.b.z0 ?? 0) + left.b.h, hMax = zw + dd * tg2;
    ins2.push({ side: -1, app: a2, zw, d: dd, hObs: Hl, hMax, ok: Hl <= hMax + 0.05 });
  }
  if (right) {  // tanlangan bino → shimoldagi qoʻshnining janubiy fasadi
    const nr2 = right.b.nonRes ?? 0, fh2 = right.b.fh ?? fh, zw = (right.b.z0 ?? 0) + nr2 * fh2 + 0.9, dd = right.s[0] - ext[1], hMax = zw + dd * tg2;
    ins2.push({ side: 1, app: a2, zw, d: dd, hObs: He1, hMax, ok: He1 <= hMax + 0.05 });
  }
  for (const q of ins2) {
    const col = q.ok ? '#2e7d4f' : '#c0392b', tw = q.side < 0 ? ext[0] : right!.s[0], tl = Math.max(t0, tw - (Hmax - q.zw) / Math.max(0.05, tg2));
    out.push(`<line x1="${X(tw)}" y1="${Y(q.zw)}" x2="${X(tl)}" y2="${Y(q.zw + (tw - tl) * tg2)}" stroke="${col}" stroke-width="0.5"/>`);
    out.push(`<circle cx="${X(tw)}" cy="${Y(q.zw)}" r="${(f * 0.35).toFixed(2)}" fill="${col}"/>`);
    const xo = q.side < 0 ? left!.s[1] : ext[1], hx = Number(X(xo));
    out.push(`<line x1="${(hx - f).toFixed(2)}" y1="${Y(q.hMax)}" x2="${(hx + f).toFixed(2)}" y2="${Y(q.hMax)}" stroke="${col}" stroke-width="0.6"/><text x="${(hx - f * 1.2).toFixed(2)}" y="${(Number(Y(q.hMax)) - f * 0.4).toFixed(2)}" font-size="${(f * 0.95).toFixed(2)}" text-anchor="end" fill="${col}">≤ ${Math.round(q.hMax * 10) / 10} m</text>`);
  }
  out.push('</g>');
  // masofalar va 2·H
  const gaps: SectionResult['gaps'] = [];
  for (const [x, s] of [[left, -1], [right, 1]] as [typeof left, 1 | -1][]) {
    if (!x) continue;
    const He = s < 0 ? He0 : He1, dd = s < 0 ? ext[0] - x.s[1] : x.s[0] - ext[1], Hn = Math.max(He, (x.b.z0 ?? 0) + x.b.h), need = 2 * Math.min(He, (x.b.z0 ?? 0) + x.b.h);
    gaps.push({ side: s, d: dd, need, ok: dd >= need });
    const a = s < 0 ? x.s[1] : ext[1], b = s < 0 ? ext[0] : x.s[0], zy = Number(Y(0)) + f * 2.6;
    out.push(`<line x1="${X(a)}" y1="${zy}" x2="${X(b)}" y2="${zy}" stroke="${dd >= need ? '#2e7d4f' : '#c0392b'}" stroke-width="0.35"/><text x="${((Number(X(a)) + Number(X(b))) / 2).toFixed(2)}" y="${(zy + f * 1.4).toFixed(2)}" font-size="${f.toFixed(2)}" text-anchor="middle" fill="${dd >= need ? '#2e7d4f' : '#c0392b'}">${Math.round(dd)} m ${dd >= need ? '≥' : '<'} 2·H = ${Math.round(need)} m</text>`);
    void Hn;
  }
  // legenda
  const ly = Hm - f * 3.2; let lx = M;
  for (const [nm, , col] of dates) { const s = suns.find(q => q.date === nm)!; out.push(`<line x1="${lx}" y1="${ly}" x2="${lx + f * 3}" y2="${ly}" stroke="${col}" stroke-width="0.6" stroke-dasharray="1.6 0.8"/><text x="${lx + f * 3.6}" y="${ly + f * 0.35}" font-size="${f.toFixed(2)}" fill="#3a3936">${nm} · ${Math.round(s.alt)}° (${T('kesimda')} ${Math.round(s.app)}°)${s.shadeZ != null ? ` · ${T('soya')} ${Math.round(s.shadeZ * 10) / 10} m` : ''}</text>`); lx += (Wm - 2 * M) / 3; }
  out.push(`<text x="${M}" y="${(Hm - f * 1.1).toFixed(2)}" font-size="${(f * 0.85).toFixed(2)}" fill="#6b6965">${T('Tush payti (quyosh vaqti 12:00) — tez koʻrsatkich; 2 soat uzluksiz tekshiruvi — «Insolyatsiya» koʻrinishida (SanQvaN 0102-25, 95-band)')}</text>`);
  if (ins2.length) { const ok = ins2.every(q => q.ok); out.push(`<text x="${M}" y="${(Hm - f * 2.15).toFixed(2)}" font-size="${(f * 0.9).toFixed(2)}" fill="${ok ? '#2e7d4f' : '#c0392b'}">${T('2 soat (22.03 / 22.09, 11:00–13:00)')} · ${T('kesimda')} ${Math.round(a2)}° · ${ins2.map(q => `${T(q.side < 0 ? 'janubdagi bino' : 'shu bino')} ${Math.round(q.hObs)} m ${q.ok ? '≤' : '>'} ${Math.round(q.hMax * 10) / 10} m`).join(' · ')} — ${T('kesim boʻyicha taxmin')}</text>`); }
  out.push(`<text x="${X(t0)}" y="${(Number(Y(0)) + f * 5.6).toFixed(2)}" font-size="${f.toFixed(2)}" fill="#6b6965">${T(card([-d[0], -d[1]]))}</text><text x="${X(t1)}" y="${(Number(Y(0)) + f * 5.6).toFixed(2)}" font-size="${f.toFixed(2)}" text-anchor="end" fill="#6b6965">${T(card(d))}</text>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wm.toFixed(1)}mm" height="${Hm.toFixed(1)}mm" viewBox="0 0 ${Wm.toFixed(1)} ${Hm.toFixed(1)}" font-family="Archivo, system-ui, sans-serif">${out.join('')}</svg>`;
  return { svg, widthMm: Wm, heightMm: Hm, suns, gaps, ins2 };
}

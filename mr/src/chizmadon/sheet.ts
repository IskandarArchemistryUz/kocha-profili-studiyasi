/**
 * Chizmadon varaq dvigateli (bitta oyna): maket varagʻi → SVG (mm). Prototip engine.js dan koʻchirilgan (2026-10-19).
 * Toʻr → katak → rol chizuvchisi. Material berilmagan katak namuna bilan chiziladi (kirish oynasidagi kichik rasm — belgi rejimi:
 * kulrang ramka + piktogramma + rol nomi). Ramka va sarlavha/pastki satr (chrome): kz, album, slide, book, poster, iu.
 * Matnlar oʻzbekcha; boshqa tilda koʻrsatishda trSvg() dan oʻtkaziladi. PDF (svg2pdf) bilan mos: filtr va pattern yoʻq.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LAYOUTS, type LFamily, type LPage } from './layouts';

/** Eski interfeysdagi nomlar bilan kutubxona (engine.js LIB) */
export const LIB = { FORMATS: LAYOUTS.formats, CHROME: LAYOUTS.chrome, ROLES: LAYOUTS.roles as Record<string, [string, number]>, FAM: LAYOUTS.families };
/** Oʻzbekiston chegaralari (geoBoundaries ADM0/1/2) — location.ts yuklagach beriladi; yoʻq boʻlsa joylashuv namunasi chizilmaydi */
let GEO: any = null;
export const setSheetGeo = (g: unknown): void => { GEO = g; };
/** Belgi rejimida ham asl koʻrinishda chiziladigan bezak kataklari */
const ICON_KEEP: Record<string, number> = { title: 1, chapter: 1, field: 1, stamp: 1, shifr: 1 };

const D2R = Math.PI / 180;
const n2 = (v?: any) => Math.round(v * 100) / 100;
const esc = (s?: any) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function rng(seed?: any) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (s?: any) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---------- palitralar (varaq doim oq) ---------- */
export const PAL: Record<string, Record<string, string>> = {
  arch: { name: "Archemistry", ink: "#151413", mut: "#77716c", line: "#d9d4ce", soft: "#f3f1ee", land: "#efede9", block: "#e3dfd9", block2: "#d9d4cd", green: "#c9dcc0", green2: "#7fa874", water: "#cbdde3", acc: "#c0643a", acc2: "#3f6fa8", acc3: "#c9a227", acc4: "#8b4a9c", ok: "#3c8a5a", warn: "#c27a1c" },
  navy: { name: "Rasmiy ko'k", ink: "#121722", mut: "#6b7383", line: "#d6dbe4", soft: "#f1f3f7", land: "#eef0f3", block: "#e0e4ea", block2: "#d3d9e1", green: "#cfe0cc", green2: "#79a37a", water: "#c9dbe8", acc: "#24467a", acc2: "#d1704a", acc3: "#c9a227", acc4: "#4f8f8a", ok: "#3c8a5a", warn: "#c27a1c" },
  moviy: { name: "Moviy", ink: "#1a1a1a", mut: "#6f6a6b", line: "#d9d6d6", soft: "#f2f2f2", land: "#eeeeee", block: "#e1e1e1", block2: "#d4d4d4", green: "#cfe6c8", green2: "#7db66d", water: "#bfe6e4", acc: "#0bb0ab", acc2: "#3a6db0", acc3: "#ff7d0b", acc4: "#8685bb", ok: "#7db66d", warn: "#ff7d0b", box: "#897879" },
  teal: { name: "Yashil", ink: "#14211f", mut: "#62736f", line: "#d3dfdc", soft: "#eff4f3", land: "#edf2f0", block: "#dde6e3", block2: "#d0dbd8", green: "#cfe3d2", green2: "#5f9e74", water: "#c8e0e4", acc: "#0f8a7e", acc2: "#d0773a", acc3: "#c9a227", acc4: "#4c5bd4", ok: "#3c8a5a", warn: "#c27a1c" }
};

/* ---------- namuna mazmun ---------- */
export const TXT = {
  lead: "Hudud shahar markaziy qismidagi eskirgan uy-joy massivini qamraydi. Loyiha piyoda masofada kundalik xizmatlar, yashil hovlilar va faol birinchi qavatlar bilan yangi mahalla tuzilmasini taklif qiladi.",
  para: "Mavjud ko'cha to'ri saqlanadi va tor hovli o'tishlari bilan to'ldiriladi. Daha ichida avtomobil harakati cheklanadi, avtoturargoh yer osti qavatlariga o'tkaziladi. Yashil karkas kanal bo'yidagi bog'ni markaziy maydon bilan bog'laydi. Ijtimoiy obyektlar 300–500 m piyoda radiusida joylashadi. Birinchi qavatlar ko'chaga ochiq: do'kon, kafe, xizmat ko'rsatish. Qavatlilik markazdan chetga qarab pasayadi va tarixiy qatlam bilan uyg'unlashadi.",
  caps: ["Yashil karkas", "Issiqlik oroli", "Harakatlanish", "Funksional zonalar", "Suv tizimi", "Bosqichlar", "Jamoat joylari", "Ijtimoiy obyektlar", "Ko'cha profili", "Qavatlilik", "Insolyatsiya", "Shamol"],
  capLine: "Asosiy xulosa bitta jumlada: nima topildi va loyihaga nima beradi.",
  toc: ["Loyiha identifikatsiyasi", "Mavjud holat va kontekst", "Muhandislik infratuzilmasi", "Loyiha TIK", "Iqlim va ekologiya", "Seysmika va xavflar", "Transport va harakatlanish", "Ijtimoiy infratuzilma", "Arxitektura va xonadonlar", "Qurilish navbati", "Barqaror rivojlanish (ESG)", "Moliyaviy model", "Vizualizatsiya", "Ilovalar", "Manbalar", "Mualliflar"],
  kpi: [["12,9", "ga", "Hudud maydoni"], ["4 230", "", "Yangi xonadon"], ["16 900", "kishi", "Aholi, prognoz"], ["2,1", "", "UMN (FAR)"], ["32", "%", "Yashillik"], ["5", "daq", "Bog'chagacha piyoda"], ["400", "ming m²", "Umumiy maydon (GFA)"], ["5 200", "joy", "Avtoturargoh"]],
  check: [["UMN (FAR)", "≤ 2,5", "2,1", 1], ["Aholi zichligi, kishi/ga", "≤ 450", "412", 1], ["Yashillik, %", "≥ 25", "32", 1], ["Avtoturargoh, joy/xonadon", "≥ 0,7", "0,62", 0], ["Maktab, o'rin/1000", "≥ 120", "134", 1], ["Bog'cha, o'rin/1000", "≥ 70", "58", 0], ["Insolyatsiya, soat", "≥ 2,0", "2,5", 1], ["Qavatlilik, eng ko'p", "≤ 16", "16", 1]],
  docs: [["ShNQ 2.07.01", "Shaharsozlik. Shahar va qishloqlarni rejalash"], ["ShNQ 2.08.01", "Turar joy binolari"], ["ShNQ 2.04.02", "Suv ta'minoti. Tashqi tarmoqlar"], ["ShNQ 2.04.03", "Kanalizatsiya. Tashqi tarmoqlar"], ["ShNQ 2.04.07", "Issiqlik tarmoqlari"], ["ShNQ 2.01.03", "Seysmik hududlarda qurilish"], ["QMQ 2.07.01", "Ko'kalamzorlashtirish"], ["Qaror № —", "Hududni kompleks rivojlantirish to'g'risida"]],
  kv: [["Hudud", "Hudud nomi"], ["Maydon", "12,9 ga"], ["Mavjud aholi", "2 071 kishi"], ["Uylar", "57 KQU + 19 YKU"], ["Ko'chiriladi", "834 oila"], ["Seysmiklik", "8 ball"], ["Huquqiy rejim", "KZ, tasdiqlangan"]],
  swot: [["Kuchli tomonlar", ["Markaziy joylashuv", "Metro 750 m", "Tarixiy qatlam", "Tayyor ko'cha to'ri"]], ["Zaif tomonlar", ["Eskirgan uy-joy", "Yashillik tanqisligi", "Avtoturargoh yo'q", "Tarmoqlar eskirgan"]], ["Imkoniyatlar", ["Kanal bo'yi bog'i", "Faol birinchi qavat", "Piyoda markaz", "Ijtimoiy klaster"]], ["Xavflar", ["Ko'chirish muddati", "Tarmoq quvvati", "Narx o'sishi", "Shovqin"]]],
  esg: [["Ekologiya", ["Yashillik 32 %", "Yomg'ir suvini yig'ish", "Issiqlik orolini kamaytirish"]], ["Ijtimoiy", ["5 daqiqada bog'cha", "Hovli — piyodalar uchun", "MGN uchun to'siqsiz muhit"]], ["Boshqaruv", ["Ochiq TIK hisoboti", "Aholi bilan kelishuv", "Bosqichli monitoring"]]],
  phases: [["I bosqich", "2026–2028", "Ko'chirish fondi, tarmoqlar, 1-daha"], ["II bosqich", "2028–2031", "2–3-dahalar, maktab, bog'"], ["III bosqich", "2031–2034", "Markaziy maydon, tijorat fronti"]],
  rules: ["Uslub", "Hajm", "Qavatlilik", "Tom", "Material", "Rang", "Fasad ritmi", "To'siq"],
  contacts: ["Archemistry Lab", "archemistry.uzbekistan@gmail.com", "archemistry.uz", "2026"]
};

/* ---------- geometriya ---------- */
export function frame(fmt?: any, chromeKey?: any, page?: any, LIB?: any, orient?: any, fam?: any) {
  const F = LIB.FORMATS[fmt], W = F.w, H = F.h, C = LIB.CHROME[chromeKey];
  if (fam && fam.frame) { const Q = fam.frame, m = Q.l * W, g = Q.g * W, top = Q.t * H, bot = Q.b * H, R = orient === "L" ? 8 : 16;
    return { W, H, m, g, top, bot, cw: (W - m - Q.r * W - 11 * g) / 12, rh: (bot - top - (R - 1) * g * 0.4) / R, R, u: Math.min(W, H) / 297 * (F.kind === "slide" ? 1.5 : 1), useChrome: page.chrome !== false, kind: F.kind, custom: true }; }
  const m = Math.min(W, H) * (F.kind === "poster" ? 0.035 : 0.048), g = m * 0.42;
  const useChrome = page.chrome !== false && chromeKey !== "poster";
  const top = m + (useChrome ? H * C.head : 0), bot = H - m - (useChrome ? H * C.foot : 0);
  const R = orient === "L" ? 8 : 16;
  const cw = (W - 2 * m - 11 * g) / 12, rh = (bot - top - (R - 1) * g) / R;
  const u = Math.min(W, H) / 297 * (F.kind === "slide" ? 1.5 : 1);
  return { W, H, m, g, top, bot, cw, rh, R, u, useChrome, kind: F.kind };
}
export function rect(fr?: any, s?: any) {
  if (s.fx != null) return { x: s.fx / 100 * fr.W, y: s.fy / 100 * fr.H, w: s.fw / 100 * fr.W, h: s.fh / 100 * fr.H };
  let x = fr.m + s.c * (fr.cw + fr.g), y = fr.top + s.r * (fr.rh + fr.g);
  let w = s.cs * fr.cw + (s.cs - 1) * fr.g, h = s.rs * fr.rh + (s.rs - 1) * fr.g;
  const b = s.bleed === "all" ? "tlbr" : (s.bleed || "");
  if (b.includes("t")) { h += y; y = 0; }
  if (b.includes("l")) { w += x; x = 0; }
  if (b.includes("r")) w = fr.W - x;
  if (b.includes("b")) h = fr.H - y;
  return { x, y, w, h };
}

/* ---------- SVG yordamchilari ---------- */
let FF = "Archivo, Arial, sans-serif"; const FM = "IBM Plex Mono, monospace";
function T(x?: any, y?: any, s?: any, o?: any) {
  o = o || {};
  return `<text x="${n2(x)}" y="${n2(y)}" font-family="${o.mono ? FM : FF}" font-size="${n2(o.s || 3)}" fill="${o.c || "#151413"}"${o.w ? ` font-weight="${o.w}"` : ""}${o.a ? ` text-anchor="${o.a}"` : ""}${o.ls ? ` letter-spacing="${n2(o.ls)}"` : ""}${o.i ? ` font-style="italic"` : ""}${o.op ? ` opacity="${o.op}"` : ""}>${esc(s)}</text>`;
}
function wrap(str?: any, w?: any, s?: any) { const max = Math.max(6, Math.floor(w / (s * 0.52))); const out = []; let line = ""; str.split(" ").forEach((wd: any) => { if ((line + " " + wd).trim().length > max) { out.push(line.trim()); line = wd; } else line += " " + wd; }); if (line.trim()) out.push(line.trim()); return out; }
function para(x?: any, y?: any, w?: any, h?: any, str?: any, s?: any, c?: any, lh?: any, nofill?: any) { lh = lh || 1.42; const L = wrap(str, w, s); let o = ""; const maxL = Math.max(0, Math.floor((h - s * 0.3) / (s * lh))); let txt = str; while (!nofill && L.length < maxL && txt.length < 2400) { txt += " " + TXT.para; L.splice(0, L.length, ...wrap(txt, w, s)); } L.slice(0, maxL).forEach((l: any, i: any) => { o += T(x, y + s * (0.95 + i * lh), l, { s, c }); }); return o; }
const R0 = (x?: any, y?: any, w?: any, h?: any, f?: any, o?: any) => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(Math.max(0, w))}" height="${n2(Math.max(0, h))}" fill="${f}"${o || ""}/>`;
const L0 = (x1?: any, y1?: any, x2?: any, y2?: any, c?: any, sw?: any, o?: any) => `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${c}" stroke-width="${n2(sw)}"${o || ""}/>`;
let CLIP = 0;
function clip(r?: any, inner?: any) { const id = "k" + (++CLIP); return `<clipPath id="${id}"><rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`; }
const badge = (x?: any, y?: any, n?: any, P?: any, u?: any) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(2.3 * u)}" fill="${P.ink}"/>` + T(x, y + 1.05 * u, String(n), { s: 2.8 * u, c: "#fff", a: "middle", w: 600 });

/* ---------- xarita ---------- */
function mapArt(r?: any, seed?: any, P?: any, u?: any, o?: any) {
  o = o || {}; const Rn = rng(seed), mn = Math.min(r.w, r.h), small = !!o.small;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  let g = R0(r.x, r.y, r.w, r.h, P.land);
  // ko'cha to'ri (burilgan kvartallar)
  const s = mn / (small ? 6.5 : 10), ang = -10 + Rn() * 20, gap = s * 0.13, ext = Math.hypot(r.w, r.h) / 2 + s;
  let bl = "";
  for (let i = -ext; i < ext; i += s) for (let j = -ext; j < ext; j += s) {
    const v = Rn(); const f = v < 0.1 ? P.green : v < 0.55 ? P.block : P.block2;
    if (v > 0.97) continue;
    bl += R0(cx + i + gap, cy + j + gap, s - 2 * gap, s - 2 * gap, f);
  }
  g += `<g transform="rotate(${n2(ang)} ${n2(cx)} ${n2(cy)})">${bl}</g>`;
  // daryo / kanal
  const ry = r.y + r.h * (0.25 + Rn() * 0.5), rw = mn * (o.theme === "water" ? 0.09 : 0.045);
  g += `<path d="M${n2(r.x - 5)} ${n2(ry)} C ${n2(r.x + r.w * 0.3)} ${n2(ry - r.h * 0.25)}, ${n2(r.x + r.w * 0.6)} ${n2(ry + r.h * 0.3)}, ${n2(r.x + r.w + 5)} ${n2(ry - r.h * 0.05)}" fill="none" stroke="${P.water}" stroke-width="${n2(rw)}" stroke-linecap="round"/>`;
  // magistrallar
  const rd = (x1?: any, y1?: any, x2?: any, y2?: any) => L0(x1, y1, x2, y2, "#ffffff", mn * 0.022) + L0(x1, y1, x2, y2, P.line, mn * 0.004, ' stroke-dasharray="0"');
  g += rd(r.x, r.y + r.h * (0.15 + Rn() * 0.2), r.x + r.w, r.y + r.h * (0.6 + Rn() * 0.3));
  g += rd(r.x + r.w * (0.3 + Rn() * 0.3), r.y, r.x + r.w * (0.2 + Rn() * 0.5), r.y + r.h);
  // hudud chegarasi
  const bp = []; const k = 7; const rr = mn * (small ? 0.3 : 0.33);
  for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2 + Rn() * 0.4; const q = rr * (0.75 + Rn() * 0.35); bp.push([cx + Math.cos(a) * q * (r.w / mn > 1.3 ? 1.35 : 1), cy + Math.sin(a) * q]); }
  const bpath = "M" + bp.map((p: any) => n2(p[0]) + " " + n2(p[1])).join("L") + "Z";
  const th = o.theme || "base";
  const cat = [P.acc, P.acc2, P.acc3, P.acc4, P.green2];
  if (th === "zones" || th === "lots") {
    let z = ""; const nz = th === "lots" ? 14 : 6;
    for (let i = 0; i < nz; i++) { const a0 = i / nz * Math.PI * 2, a1 = (i + 1) / nz * Math.PI * 2, q = rr * 0.95; z += `<path d="M${n2(cx)} ${n2(cy)}L${n2(cx + Math.cos(a0) * q * 1.3)} ${n2(cy + Math.sin(a0) * q)}L${n2(cx + Math.cos(a1) * q * 1.3)} ${n2(cy + Math.sin(a1) * q)}Z" fill="${th === "lots" ? (i % 3 ? P.block2 : P.acc2) : cat[i % 5]}" fill-opacity="${th === "lots" ? 0.55 : 0.45}" stroke="#fff" stroke-width="${n2(mn * 0.006)}"/>`; if (th === "lots" && !small) { const am = (a0 + a1) / 2; z += T(cx + Math.cos(am) * q * 0.85, cy + Math.sin(am) * q * 0.65 + 0.8 * u, String(i + 1), { s: 2.2 * u, a: "middle", c: P.ink, mono: 1 }); } }
    g += `<clipPath id="bz${seed}"><path d="${bpath}"/></clipPath><g clip-path="url(#bz${seed})">${z}</g>`;
  }
  if (th === "heat" || th === "iso") {
    const lv = th === "iso" ? [1, 0.68, 0.38] : [0.5, 0.32, 0.18];
    lv.forEach((f: any, i: any) => { g += `<ellipse cx="${n2(cx + (th === "heat" ? (Rn() - 0.5) * mn * 0.3 : 0))}" cy="${n2(cy + (th === "heat" ? (Rn() - 0.5) * mn * 0.3 : 0))}" rx="${n2(mn * 0.45 * f * (r.w / mn > 1.3 ? 1.4 : 1))}" ry="${n2(mn * 0.42 * f)}" fill="${[P.acc3, P.acc, P.acc][i]}" fill-opacity="${th === "iso" ? 0.28 : 0.35}"/>`; });
    if (th === "heat") for (let i = 0; i < 4; i++) g += `<circle cx="${n2(r.x + Rn() * r.w)}" cy="${n2(r.y + Rn() * r.h)}" r="${n2(mn * (0.05 + Rn() * 0.08))}" fill="${P.acc}" fill-opacity=".3"/>`;
  }
  if (th === "green") {
    for (let i = 0; i < 4; i++) g += `<circle cx="${n2(r.x + Rn() * r.w)}" cy="${n2(r.y + Rn() * r.h)}" r="${n2(mn * (0.06 + Rn() * 0.1))}" fill="${P.green2}" fill-opacity=".55"/>`;
    g += `<path d="M${n2(r.x)} ${n2(r.y + r.h * 0.8)} Q ${n2(cx)} ${n2(cy - r.h * 0.2)} ${n2(r.x + r.w)} ${n2(r.y + r.h * 0.3)}" fill="none" stroke="${P.green2}" stroke-width="${n2(mn * 0.035)}" stroke-dasharray="${n2(mn * 0.02)} ${n2(mn * 0.015)}"/>`;
  }
  if (th === "net") {
    [P.acc, P.acc2, P.acc4].forEach((c: any, i: any) => { g += `<path d="M${n2(r.x)} ${n2(r.y + r.h * (0.2 + i * 0.28))} L ${n2(cx + (Rn() - 0.5) * mn * 0.3)} ${n2(cy + (Rn() - 0.5) * mn * 0.3)} L ${n2(r.x + r.w)} ${n2(r.y + r.h * (0.75 - i * 0.25))}" fill="none" stroke="${c}" stroke-width="${n2(mn * 0.012)}" stroke-linejoin="round"/>`; });
    for (let i = 0; i < 6; i++) g += `<circle cx="${n2(r.x + Rn() * r.w)}" cy="${n2(r.y + Rn() * r.h)}" r="${n2(mn * 0.014)}" fill="#fff" stroke="${P.ink}" stroke-width="${n2(mn * 0.004)}"/>`;
  }
  if (th === "phase") {
    const cols = [P.acc, P.acc3, P.acc2];
    g += `<clipPath id="bp${seed}"><path d="${bpath}"/></clipPath><g clip-path="url(#bp${seed})">` + cols.map((c: any, i: any) => R0(cx - rr * 1.6 + i * rr * 1.07, cy - rr * 1.3, rr * 1.07, rr * 2.6, c, ' fill-opacity=".38"')).join("") + `</g>`;
    ["I", "II", "III"].forEach((t: any, i: any) => { g += T(cx - rr * 1.07 + i * rr * 1.07, cy + 1.2 * u, t, { s: (small ? 2.6 : 3.6) * u, a: "middle", w: 700, c: P.ink }); });
  }
  if (th === "markers") {
    [[0.35, 0.4, 30], [0.62, 0.62, 200]].forEach((m: any, i: any) => { const px = r.x + r.w * m[0], py = r.y + r.h * m[1], L = mn * 0.16; g += `<path d="M${n2(px)} ${n2(py)}L${n2(px + Math.cos((m[2] - 22) * D2R) * L)} ${n2(py + Math.sin((m[2] - 22) * D2R) * L)}M${n2(px)} ${n2(py)}L${n2(px + Math.cos((m[2] + 22) * D2R) * L)} ${n2(py + Math.sin((m[2] + 22) * D2R) * L)}" stroke="${P.ink}" stroke-width="${n2(0.35 * u)}" fill="none"/>` + badge(px, py, i + 1, P, u * 0.8); });
    for (let i = 0; i < 6; i++) { const px = r.x + r.w * (0.2 + Rn() * 0.6), py = r.y + r.h * (0.2 + Rn() * 0.6); g += `<circle cx="${n2(px)}" cy="${n2(py)}" r="${n2(1.5 * u)}" fill="${P.acc}" stroke="#fff" stroke-width="${n2(0.3 * u)}"/>`; }
  }
  g += `<path d="${bpath}" fill="none" stroke="${P.ink}" stroke-width="${n2(Math.max(0.3, mn * 0.006))}" stroke-dasharray="${n2(mn * 0.02)} ${n2(mn * 0.012)}"/>`;
  if (!small) { // shimol + masshtab
    const nx = r.x + r.w - 6 * u, ny = r.y + 7 * u;
    g += `<path d="M${n2(nx)} ${n2(ny - 4 * u)}L${n2(nx + 2 * u)} ${n2(ny + 2 * u)}L${n2(nx)} ${n2(ny + 0.8 * u)}L${n2(nx - 2 * u)} ${n2(ny + 2 * u)}Z" fill="${P.ink}"/>` + T(nx, ny - 5 * u, "Sh", { s: 2 * u, a: "middle", c: P.ink });
    const sx = r.x + r.w - 30 * u, sy = r.y + r.h - 5 * u;
    g += R0(sx - 1 * u, sy - 4 * u, 27 * u, 6.5 * u, "#ffffff", ' fill-opacity=".85"') + R0(sx, sy, 10 * u, 0.9 * u, P.ink) + R0(sx + 10 * u, sy, 10 * u, 0.9 * u, "#fff", ` stroke="${P.ink}" stroke-width="${n2(0.2 * u)}"`) + T(sx, sy - 0.9 * u, "0", { s: 1.8 * u, mono: 1 }) + T(sx + 20 * u, sy - 0.9 * u, "200 m", { s: 1.8 * u, mono: 1, a: "middle" });
  }
  return clip(r, g);
}

/* ---------- rasm (foto / render) ---------- */
function picArt(r?: any, seed?: any, _P?: any, _u?: any, kind?: any) {
  const Rn = rng(seed), id = "pg" + (++CLIP);
  const sky = kind === "render" ? ["#dfe7ee", "#f5ece2"] : ["#e4e6e8", "#eeeeec"];
  let g = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>` + R0(r.x, r.y, r.w, r.h, `url(#${id})`);
  const gy = r.y + r.h * (0.66 + Rn() * 0.08);
  // binolar
  let x = r.x - Rn() * r.w * 0.1;
  while (x < r.x + r.w) { const bw = r.w * (0.08 + Rn() * 0.14), bh = r.h * (0.18 + Rn() * (kind === "render" ? 0.5 : 0.3)); const c = kind === "render" ? ["#c9a891", "#b9b2aa", "#d8cbbd", "#a98f7d"][Math.floor(Rn() * 4)] : ["#c8c6c2", "#b8b6b2", "#d2d0cc"][Math.floor(Rn() * 3)]; g += R0(x, gy - bh, bw, bh, c); for (let wy = gy - bh + bh * 0.08; wy < gy - bh * 0.12; wy += bh * 0.12) g += R0(x + bw * 0.12, wy, bw * 0.76, bh * 0.035, "#ffffff", ' fill-opacity=".35"'); x += bw + r.w * 0.01; }
  g += R0(r.x, gy, r.w, r.y + r.h - gy, kind === "render" ? "#b9b4a8" : "#c4c2bd");
  // daraxtlar
  for (let i = 0; i < 6; i++) { const tx = r.x + Rn() * r.w, tr = r.h * (0.06 + Rn() * 0.08); g += `<circle cx="${n2(tx)}" cy="${n2(gy - tr * 0.6)}" r="${n2(tr)}" fill="${kind === "render" ? "#8fa874" : "#9fa79a"}" fill-opacity=".9"/>` + R0(tx - tr * 0.06, gy - tr * 0.2, tr * 0.12, tr * 0.6, "#7d7468"); }
  if (kind === "render") for (let i = 0; i < 7; i++) { const px = r.x + Rn() * r.w, ph = r.h * 0.07; g += R0(px, gy + r.h * 0.02 + Rn() * r.h * 0.12, ph * 0.3, ph, "#5d5550"); }
  return clip(r, g);
}

/* ---------- aksonometriya ---------- */
function axonArt(r?: any, seed?: any, P?: any, u?: any, big?: any) {
  const Rn = rng(seed), cx = r.x + r.w / 2, cy = r.y + r.h * 0.6, s = Math.min(r.w / 3.7, r.h / 2.9);
  const iso = (x?: any, y?: any, z?: any) => [cx + (x - y) * s * 0.866, cy + (x + y) * s * 0.5 - z * s];
  const poly = (pts?: any, f?: any, op?: any) => `<path d="M${pts.map((p: any) => n2(p[0]) + " " + n2(p[1])).join("L")}Z" fill="${f}"${op ? ` fill-opacity="${op}"` : ""} stroke="${P.ink}" stroke-width="${n2(0.18 * u)}" stroke-linejoin="round"/>`;
  let g = poly([iso(-1, -1, 0), iso(1, -1, 0), iso(1, 1, 0), iso(-1, 1, 0)], P.land);
  // ko'chalar
  g += poly([iso(-1, -0.08, 0), iso(1, -0.08, 0), iso(1, 0.08, 0), iso(-1, 0.08, 0)], "#ffffff");
  const boxes = [];
  for (let i = 0; i < (big ? 7 : 5); i++) { const x = -0.9 + Rn() * 1.4, y = (Rn() < 0.5 ? -0.9 : 0.15) + Rn() * 0.4, w = 0.25 + Rn() * 0.25, d = 0.2 + Rn() * 0.25, z = 0.1 + Rn() * (big ? 0.7 : 0.45); boxes.push([x, y, Math.min(w, 0.95 - x), Math.min(d, 0.95 - y), z, i]); }
  boxes.sort((a: any, b: any) => (a[0] + a[1]) - (b[0] + b[1]));
  const fun = [P.acc, P.acc2, P.acc3, P.acc4];
  boxes.forEach(([x, y, w, d, z, i]) => {
    const top = big && i % 3 === 0 ? fun[i % 4] : "#ffffff";
    g += poly([iso(x, y + d, 0), iso(x + w, y + d, 0), iso(x + w, y + d, z), iso(x, y + d, z)], "#e9e6e1");
    g += poly([iso(x + w, y, 0), iso(x + w, y + d, 0), iso(x + w, y + d, z), iso(x + w, y, z)], "#d6d1ca");
    g += poly([iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)], top, big && i % 3 === 0 ? 0.75 : null);
  });
  for (let i = 0; i < (big ? 9 : 5); i++) { const p = iso(-0.95 + Rn() * 1.9, -0.95 + Rn() * 1.9, 0); g += `<circle cx="${n2(p[0])}" cy="${n2(p[1] - 1 * u)}" r="${n2((0.9 + Rn() * 0.8) * u * (r.w / 120 + 0.6))}" fill="${P.green2}" fill-opacity=".8"/>`; }
  return g;
}

/* ---------- kesim ---------- */
function sectionArt(r?: any, seed?: any, P?: any, u?: any) {
  const Rn = rng(seed), gy = r.y + r.h * 0.8; let g = "";
  let x = r.x + r.w * 0.02;
  while (x < r.x + r.w * 0.96) {
    const t = Rn();
    if (t < 0.45) { const bw = r.w * (0.08 + Rn() * 0.1), bh = r.h * (0.25 + Rn() * 0.5); g += R0(x, gy - bh, bw, bh, "#ffffff", ` stroke="${P.ink}" stroke-width="${n2(0.25 * u)}"`); for (let f = gy - bh * 0.1; f > gy - bh; f -= r.h * 0.07) g += L0(x, f, x + bw, f, P.line, 0.15 * u); x += bw + r.w * 0.02; }
    else if (t < 0.75) { const tr = r.h * (0.08 + Rn() * 0.06); g += `<circle cx="${n2(x + tr)}" cy="${n2(gy - tr * 1.8)}" r="${n2(tr)}" fill="${P.green}" stroke="${P.green2}" stroke-width="${n2(0.2 * u)}"/>` + L0(x + tr, gy, x + tr, gy - tr, P.green2, 0.3 * u); x += tr * 2.4; }
    else { const ww = r.w * 0.07; g += R0(x, gy - 0.4 * u, ww, 0.4 * u, P.acc, ' fill-opacity=".5"'); for (let k = 0; k < 2; k++) g += R0(x + ww * (0.2 + k * 0.4), gy - r.h * 0.07, r.h * 0.018, r.h * 0.07, P.ink); x += ww + r.w * 0.01; }
  }
  g += L0(r.x, gy, r.x + r.w, gy, P.ink, 0.45 * u) + R0(r.x, gy, r.w, r.h * 0.06, P.soft);
  g += L0(r.x + r.w * 0.05, r.y + r.h * 0.93, r.x + r.w * 0.95, r.y + r.h * 0.93, P.mut, 0.15 * u) + T(r.x + r.w / 2, r.y + r.h * 0.92, "kesim A–A", { s: 2 * u, c: P.mut, a: "middle" });
  return g;
}

/* ---------- diagramma ---------- */
function chartArt(r?: any, seed?: any, P?: any, u?: any, kind?: any) {
  const Rn = rng(seed); let g = "";
  const pad = 4 * u, x0 = r.x + pad, y0 = r.y + pad * 1.6, w = r.w - 2 * pad, h = r.h - pad * 2.6;
  if (kind === "pyramid") {
    const n = 14, bh = h / n * 0.72; g += T(r.x + r.w / 2, r.y + pad, "Yosh-jins piramidasi · namuna", { s: 2.6 * u, a: "middle", c: P.mut });
    for (let i = 0; i < n; i++) { const yy = y0 + i * h / n; const a = 0.25 + Math.sin(i / n * 3) * 0.5 + Rn() * 0.2, b = a + (Rn() - 0.5) * 0.15; g += R0(r.x + r.w / 2 - 4 * u - w * 0.42 * a, yy, w * 0.42 * a, bh, P.acc2) + R0(r.x + r.w / 2 + 4 * u, yy, w * 0.42 * b, bh, P.acc) + T(r.x + r.w / 2, yy + bh * 0.85, `${(n - 1 - i) * 5}`, { s: 1.9 * u, a: "middle", mono: 1, c: P.mut }); }
    return g;
  }
  if (kind === "hbars") {
    const n = 5; for (let i = 0; i < n; i++) { const yy = y0 + i * h / n, v = 0.3 + Rn() * 0.65; g += T(x0, yy + 2.2 * u, ["Uy-joy", "Tijorat", "Avtoturargoh", "Ijtimoiy", "Infratuzilma"][i], { s: 2.3 * u, c: P.ink }) + R0(x0, yy + 3.2 * u, w * v, h / n * 0.32, i ? P.block2 : P.acc) + T(x0 + w * v + 1.2 * u, yy + 3.2 * u + h / n * 0.28, Math.round(v * 100) + " %", { s: 2 * u, mono: 1, c: P.mut }); }
    return g;
  }
  if (kind === "donut") {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = Math.min(w, h) / 2.4, vals = [0.38, 0.24, 0.18, 0.12, 0.08], cs = [P.acc, P.acc2, P.acc3, P.acc4, P.green2]; let a = -Math.PI / 2;
    vals.forEach((v: any, i: any) => { const a1 = a + v * Math.PI * 2; g += `<path d="M${n2(cx + Math.cos(a) * R)} ${n2(cy + Math.sin(a) * R)}A${n2(R)} ${n2(R)} 0 ${v > 0.5 ? 1 : 0} 1 ${n2(cx + Math.cos(a1) * R)} ${n2(cy + Math.sin(a1) * R)}" fill="none" stroke="${cs[i]}" stroke-width="${n2(R * 0.38)}"/>`; a = a1; });
    return g + T(cx, cy + 1.4 * u, "38 %", { s: 4.2 * u, a: "middle", w: 700 });
  }
  // ustunli
  const n = 12; for (let i = 0; i < 5; i++) g += L0(x0, y0 + h * i / 4, x0 + w, y0 + h * i / 4, P.line, 0.15 * u);
  for (let i = 0; i < n; i++) { const v = 0.25 + 0.6 * Math.sin((i + 1) / n * Math.PI) + Rn() * 0.1; g += R0(x0 + i * w / n + w / n * 0.2, y0 + h * (1 - v), w / n * 0.6, h * v, i === 6 ? P.acc : P.acc2, i === 6 ? "" : ' fill-opacity=".55"'); }
  return g;
}

/* ---------- joylashuv xaritasi ---------- */
function locatorArt(r?: any, P?: any, u?: any) {
  if (!GEO) return "";
  const rings = (gg?: any) => gg.type === "Polygon" ? [gg.coordinates] : gg.coordinates;
  const bb = [55.9, 37.1, 73.2, 45.6], kx = Math.cos(41 * D2R);
  const fit = (x?: any, y?: any, w?: any, h?: any) => { const s = Math.min(w / ((bb[2] - bb[0]) * kx), h / (bb[3] - bb[1])); const ox = x + (w - (bb[2] - bb[0]) * kx * s) / 2, oy = y + (h - (bb[3] - bb[1]) * s) / 2; return (p: any) => [ox + (p[0] - bb[0]) * kx * s, oy + (bb[3] - p[1]) * s]; };
  const path = (gg?: any, pr?: any) => { let d = ""; for (const poly of rings(gg)) for (const ring of poly) { ring.forEach((p: any, i: any) => { const q = pr(p); d += (i ? "L" : "M") + n2(q[0]) + " " + n2(q[1]); }); d += "Z"; } return d; };
  const pr = fit(r.x + 3 * u, r.y + 10 * u, r.w - 6 * u, r.h * 0.66 - 10 * u);
  let g = T(r.x, r.y + 3 * u, "JOYLASHUV", { s: 2.3 * u, c: P.mut, ls: 0.3 * u, w: 600 }) + T(r.x, r.y + 7.5 * u, "Davlat · viloyat", { s: 3.4 * u, w: 600 });
  GEO.r.forEach((rg: any) => { const on = rg.n === "Tashkent" || rg.n === "Tashkent Region"; g += `<path d="${path(rg.g, pr)}" fill="${rg.n === "Tashkent" ? P.acc : on ? P.block2 : P.land}" fill-opacity="${rg.n === "Tashkent" ? 0.9 : 1}" stroke="#ffffff" stroke-width="${n2(0.35 * u)}"/>`; });
  g += `<path d="${path(GEO.c, pr)}" fill="none" stroke="${P.ink}" stroke-width="${n2(0.45 * u)}" stroke-linejoin="round"/>`;
  const q = pr([69.25, 41.3]); g += `<circle cx="${n2(q[0])}" cy="${n2(q[1])}" r="${n2(2.4 * u)}" fill="none" stroke="${P.acc}" stroke-width="${n2(0.5 * u)}"/>`;
  // ichki kichik xarita (tuman)
  const iw = r.w * 0.34, ih = iw * 0.75, ix = r.x + r.w - iw, iy = r.y + r.h - ih;
  g += R0(ix, iy, iw, ih, "#ffffff", ` stroke="${P.line}" stroke-width="${n2(0.25 * u)}"`) + mapArt({ x: ix + 1 * u, y: iy + 1 * u, w: iw - 2 * u, h: ih - 2 * u }, 77, P, u, { small: true, theme: "base" }) + T(ix + 1.5 * u, iy - 1.2 * u, "Tuman", { s: 2.2 * u, c: P.mut });
  return g;
}

/* ---------- rol chizuvchilari ---------- */
function draw(s?: any, r?: any, ctx?: any) {
  const P = ctx.P, u = ctx.u, seed = ctx.seed, i = ctx.i;
  const hdr = (t?: any, y?: any) => T(r.x, (y == null ? r.y : y) + 3 * u, t.toUpperCase(), { s: 2.3 * u, c: P.mut, ls: 0.3 * u, w: 600 });
  switch (s.role) {
    case "title": {
      if (s.label) { const ts = Math.min(r.h * 0.6, 9 * u); return T(r.x, r.y + r.h * 0.5 + ts * 0.35, s.label, { s: ts, w: 700, c: P.ink }); }
      if (ctx.pageTitle && !s.over && !s.inv && ctx.chromeOn !== false && ctx.kind !== "poster") { const ts = Math.min(r.h * 0.55, 9 * u); return T(r.x, r.y + ts * 1.05, ctx.pageTitle, { s: ts, w: 700, ls: -0.02 * ts }) + L0(r.x, r.y + r.h - 0.4 * u, r.x + r.w, r.y + r.h - 0.4 * u, P.ink, 0.3 * u); }
      const t0 = ctx.titleText || "Loyiha nomi"; const big = Math.max(5 * u, Math.min(r.h * 0.28, r.w / (Math.min(t0.length, 26) * 0.56), (ctx.kind === "poster" ? 30 : 22) * u));
      const c = s.over && !s.inv ? "#ffffff" : s.inv ? "#ffffff" : P.ink;
      let g = "";
      if (s.over && !s.inv) g += `<linearGradient id="tg${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>` + R0(r.x - ctx.m, r.y - r.h * 0.3, r.w + ctx.m * 2, r.h * 1.4, `url(#tg${seed})`);
      const t1 = ctx.titleText || "Loyiha nomi";
      const lines = wrap(t1, r.w, big * 1.05).slice(0, 2);
      g += T(r.x, r.y + big * 0.4, ctx.eyebrow || "MASTER REJA", { s: 2.4 * u, c: s.over || s.inv ? "#ffffff" : P.acc, ls: 0.4 * u, w: 600, op: s.over ? 0.9 : 1 });
      lines.forEach((l: any, k: any) => { g += T(r.x, r.y + big * (1.55 + k * 1.05), l, { s: big, w: 700, c, ls: -0.02 * big }); });
      g += T(r.x, r.y + big * (1.55 + lines.length * 1.05) + 2.2 * u, "Hudud nomi · loyiha turi", { s: 3.2 * u, c, op: s.over || s.inv ? 0.85 : 0.7 });
      return g;
    }
    case "lead": return para(r.x, r.y, r.w, r.h, TXT.lead, 3.6 * u, P.ink, 1.38, true);
    case "text": {
      let g = "", y = r.y;
      if (s.kind === "contacts") { TXT.contacts.forEach((t: any, k: any) => { g += T(r.x, r.y + (k + 1) * 6 * u, t, { s: (k ? 3.2 : 4) * u, w: k ? 400 : 700, c: k ? P.mut : P.ink }); }); return g; }
      if (s.head) { g += T(r.x, r.y + 4 * u, ["Yo'nalish 1", "Yo'nalish 2", "Yo'nalish 3", "Strategiyalar"][i % 4], { s: 4 * u, w: 700, c: P.acc }); g += L0(r.x, r.y + 6.5 * u, r.x + r.w, r.y + 6.5 * u, P.line, 0.2 * u); y += 9 * u; }
      return g + para(r.x, y, r.w, r.y + r.h - y, TXT.para, 2.75 * u, P.ink);
    }
    case "caption": {
      const t = TXT.caps[(s.num || i + 1) - 1] || TXT.caps[i % 12];
      let g = T(r.x, r.y + 3.4 * u, (s.num ? String(s.num).padStart(2, "0") + "  " : "") + t, { s: 3.2 * u, w: 700 });
      if (!s.short) g += para(r.x, r.y + 5 * u, r.w, r.h - 5 * u, TXT.capLine, 2.5 * u, P.mut, 1.42, true);
      return g;
    }
    case "note": return R0(r.x, r.y, r.w, r.h, P.soft) + T(r.x + 3 * u, r.y + 5 * u, "Eslatma", { s: 2.8 * u, w: 700, c: P.acc }) + para(r.x + 3 * u, r.y + 7 * u, r.w - 6 * u, r.h - 9 * u, "Har varaq tamoyili: chapda nazorat ro'yxati (norma va loyiha), markazda chizma, pastda TIK. Qiymatlar loyiha ma'lumotidan avtomatik to'ladi.", 2.5 * u, P.ink);
    case "map": return (s.frame ? R0(r.x, r.y, r.w, r.h, "none", ` stroke="${P.ink}" stroke-width="${n2(0.3 * u)}" stroke-dasharray="${n2(1.4 * u)} ${n2(0.9 * u)}"`) : "") + mapArt(s.frame ? { x: r.x + 1.5 * u, y: r.y + 1.5 * u, w: r.w - 3 * u, h: r.h - 3 * u } : r, seed, P, u, { theme: s.theme });
    case "map_small": return mapArt(r, seed, P, u, { small: true, theme: s.theme || "base" });
    case "locator": return locatorArt(r, P, u);
    case "legend": {
      let g = s.over ? R0(r.x, r.y, r.w, r.h, "#ffffff", ' fill-opacity=".92"') : ""; const px = s.over ? 3 * u : 0;
      g += hdr("Shartli belgilar", r.y + (s.over ? 2 * u : 0)).replace(`x="${n2(r.x)}"`, `x="${n2(r.x + px)}"`);
      const it = [[P.acc, "Loyiha hududi"], [P.green, "Yashil hudud"], [P.water, "Suv"], [P.block2, "Mavjud qurilish"], [P.acc2, "Jamoat transporti"], [P.acc3, "Ijtimoiy obyekt"], [P.acc4, "Tijorat"]];
      const lh = Math.min(5.2 * u, (r.h - 8 * u) / it.length);
      it.forEach((q: any, k: any) => { const yy = r.y + (s.over ? 2 * u : 0) + 7 * u + k * lh; if (yy + lh > r.y + r.h + 1) return; g += R0(r.x + px, yy, 4 * u, 2.6 * u, q[0]) + T(r.x + px + 5.5 * u, yy + 2.3 * u, q[1], { s: 2.5 * u }); });
      return g;
    }
    case "kpi": {
      if (s.box) { let g = R0(r.x, r.y, r.w, r.h, P.box || P.soft); TXT.kpi.slice(0, 3).forEach((k: any, j: any) => { g += T(r.x + 3 * u, r.y + 6 * u + j * Math.min(7 * u, (r.h - 6 * u) / 3), `${k[0]} ${k[1]} — ${k[2]}`, { s: 3.2 * u, w: 700, c: "#ffffff" }); }); return g; }
      const n = s.n || 4, off = ctx.kpiOff || 0, items = TXT.kpi.concat(TXT.kpi).slice(off, off + n); let g = "";
      const row = s.cards || s.icons || r.w > r.h * 2.6, stack = s.stack;
      const cols = stack ? 1 : row ? n : 2, rows = Math.ceil(n / cols);
      const cw = r.w / cols, ch = r.h / rows;
      items.forEach((k: any, j: any) => {
        const cx = r.x + (j % cols) * cw, cy = r.y + Math.floor(j / cols) * ch, pad = s.cards ? 3 * u : 0;
        if (s.cards) g += R0(cx + 0.8 * u, cy, cw - 1.6 * u, ch, P.soft);
        const big = Math.min(ch * 0.38, cw * 0.2, 9 * u);
        let yy = cy + pad + big * 1.05;
        if (s.icons) { g += `<circle cx="${n2(cx + pad + 3 * u)}" cy="${n2(cy + 3.5 * u)}" r="${n2(3 * u)}" fill="none" stroke="${P.acc}" stroke-width="${n2(0.4 * u)}"/>`; yy += 7 * u; }
        if (!s.cards && !stack) g += L0(cx, cy + 0.2, cx + cw - 3 * u, cy + 0.2, P.ink, 0.25 * u);
        if (stack) g += L0(cx, cy + 0.2, cx + cw, cy + 0.2, P.line, 0.2 * u);
        g += T(cx + pad, yy + (stack ? 2 * u : 1.5 * u), k[0], { s: big, w: 700, c: j === 0 && !s.cards ? P.acc : P.ink, ls: -0.02 * big }).replace("</text>", k[1] ? `<tspan font-size="${n2(big * 0.42)}" font-weight="600" dx="${n2(big * 0.15)}">${esc(k[1])}</tspan></text>` : "</text>");
        g += T(cx + pad, yy + (stack ? 2 * u : 1.5 * u) + 4 * u, k[2], { s: 2.5 * u, c: P.mut });
      });
      return g;
    }
    case "checklist": {
      const ba = s.kind === "ba"; let g = R0(r.x, r.y, r.w, r.h, P.soft);
      g += R0(r.x, r.y, r.w, 9 * u, P.ink) + T(r.x + 3 * u, r.y + 4.4 * u, "NAZORAT RO'YXATI", { s: 3.1 * u, w: 700, c: "#fff", ls: 0.2 * u }) + T(r.x + 3 * u, r.y + 7.6 * u, "Muvofiqlik · namuna qiymatlar", { s: 2.1 * u, c: "#ffffff", op: 0.7, i: 1 });
      const c1 = r.x + r.w * 0.52, c2 = r.x + r.w * 0.72, c3 = r.x + r.w - 4 * u;
      let y = r.y + 14 * u;
      g += T(r.x + 3 * u, y, "Ko'rsatkich", { s: 2.2 * u, c: P.mut, w: 600 }) + T(c1, y, ba ? "Oldin" : "Norma", { s: 2.2 * u, c: P.mut, w: 600, a: "middle" }) + T(c2, y, ba ? "Keyin" : "Loyiha", { s: 2.2 * u, c: P.mut, w: 600, a: "middle" });
      y += 2 * u; g += L0(r.x + 3 * u, y, r.x + r.w - 3 * u, y, P.line, 0.2 * u);
      const rows = TXT.check, rh = Math.min(9.5 * u, (r.y + r.h - y - 3 * u) / rows.length);
      rows.forEach((q: any, k: any) => { const yy = y + k * rh; if (yy + rh > r.y + r.h) return;
        g += T(r.x + 3 * u, yy + rh * 0.58, q[0], { s: 2.45 * u, w: 500 });
        g += T(c1, yy + rh * 0.58, ba ? ["1,1", "160", "8", "0,1", "—", "—", "1,2", "4"][k] : q[1], { s: 2.4 * u, a: "middle", c: P.mut, mono: 1 });
        g += R0(c2 - 6.5 * u, yy + rh * 0.2, 13 * u, rh * 0.6, "#ffffff", ` stroke="${P.line}" stroke-width="${n2(0.2 * u)}"`) + T(c2, yy + rh * 0.58, q[2], { s: 2.5 * u, a: "middle", mono: 1, w: 500 });
        g += `<circle cx="${n2(c3)}" cy="${n2(yy + rh * 0.48)}" r="${n2(1.5 * u)}" fill="${q[3] ? P.ok : P.warn}"/>`;
        g += L0(r.x + 3 * u, yy + rh, r.x + r.w - 3 * u, yy + rh, P.line, 0.15 * u); });
      return g;
    }
    case "table": {
      const k = s.kind || "basic"; let g = "";
      if (s.over) g += R0(r.x, r.y, r.w, r.h, s.dark ? "#141414" : "#ffffff", ' fill-opacity=".86"');
      const pad = s.over ? 3 * u : 0, x = r.x + pad, w = r.w - 2 * pad; let y = r.y + pad;
      const ink = s.dark ? "#ffffff" : P.ink, mut = s.dark ? "#c8c4c0" : P.mut, ln = s.dark ? "#4a4744" : P.line;
      if (k === "matrix") {
        const cols = 4, rows = 6, hw = w * 0.17, cw = (w - hw) / cols, rh = (r.h - 9 * u) / rows;
        ["Yo'nalish 1", "Yo'nalish 2", "Yo'nalish 3", "Yo'nalish 4"].forEach((t: any, c: any) => { g += R0(x + hw + c * cw + 0.5 * u, y, cw - u, 7 * u, P.acc) + T(x + hw + c * cw + cw / 2, y + 4.6 * u, t, { s: 2.6 * u, a: "middle", c: "#fff", w: 700 }); });
        ["Hududiy rejalash", "Transport", "Ochiq joylar", "Jamoat markazlari", "Ijtimoiy obyektlar", "Muhandislik"].forEach((t: any, rr: any) => { const yy = y + 9 * u + rr * rh; g += R0(x, yy, hw - u, rh - u, P.soft) + T(x + 2 * u, yy + 4 * u, t, { s: 2.5 * u, w: 600 }); for (let c = 0; c < cols; c++) { const lines = 2 + ((rr + c) % 3); for (let l = 0; l < lines; l++) g += R0(x + hw + c * cw + 2 * u, yy + 2.5 * u + l * 3.2 * u, (cw - 4 * u) * (0.55 + ((rr * 7 + c * 3 + l) % 5) / 11), 1.1 * u, P.block2); } g += L0(x, yy + rh - 0.5 * u, x + w, yy + rh - 0.5 * u, P.line, 0.15 * u); });
        return g;
      }
      let rows, colsX;
      if (k === "docs") { rows = TXT.docs; colsX = [0, 0.3]; g += hdr("Normativ asoslar", y); y += 6 * u; }
      else if (k === "kv") { rows = TXT.kv; colsX = [0, 0.45]; g += hdr("Huquqiy va texnik holat", y); y += 6 * u; }
      else if (k === "compare") { rows = [["Ko'rsatkich", "Hozir", "Loyiha"], ["Aholi, kishi", "2 071", "16 900"], ["Xonadonlar", "531", "4 230"], ["Avtoturargoh", "100", "5 200"], ["Yashillik, m²", "8 400", "41 300"], ["Tijorat, m²", "—", "22 600"], ["Ijtimoiy obyekt", "1", "6"]]; colsX = [0, 0.5, 0.76]; }
      else if (k === "long") { rows = [["№", "Maydon, ga", "Funksiya"]].concat(Array.from({ length: 22 }, (_, j) => [String(j + 1), (0.4 + ((j * 37) % 23) / 10).toFixed(2).replace(".", ","), ["Turar joy", "Tijorat", "Ijtimoiy", "Bog'", "Aralash"][j % 5]])); colsX = [0, 0.18, 0.55]; }
      else { rows = [["Ko'rsatkich", "Birlik", "Qiymat"]].concat(TXT.kpi.map((q: any) => [q[2], q[1] || "—", q[0]])); colsX = [0, 0.6, 0.8]; }
      const rh = Math.min(6.5 * u, (r.y + r.h - pad - y) / rows.length);
      rows.forEach((row: any, j: any) => { const yy = y + j * rh; if (yy + rh > r.y + r.h - pad + 0.5) return; const head = (k === "compare" || k === "long" || k === "basic") && j === 0;
        row.forEach((cell: any, c: any) => { g += T(x + w * colsX[c] + (c && k === "compare" ? 0 : 0), yy + rh * 0.66, cell, { s: (head ? 2.2 : 2.45) * u, w: head ? 600 : (c === 0 && k !== "long" ? 500 : 400), c: head ? mut : c === 0 && k === "docs" ? P.acc : ink, mono: k === "docs" && c === 0 || (k !== "kv" && k !== "docs" && c > 0 && /\d/.test(cell)) }); });
        g += L0(x, yy + rh, x + w, yy + rh, ln, 0.15 * u); });
      return g;
    }
    case "chart": return (s.frame ? R0(r.x, r.y, r.w, r.h, "none", ` stroke="${P.ink}" stroke-width="${n2(0.3 * u)}" stroke-dasharray="${n2(1.4 * u)} ${n2(0.9 * u)}"`) : "") + chartArt(r, seed, P, u, s.kind || "bars");
    case "figure": { let g = picArt(r, seed, P, u, "render"); if (s.num) g += badge(r.x + 4 * u, r.y + 4 * u, s.num, P, u); return g; }
    case "photo": case "render": {
      let g = picArt(r, seed, P, u, s.role);
      if (s.num) g += badge(r.x + 4 * u, r.y + 4 * u, s.num, P, u);
      return g;
    }
    case "axon": return (s.frame ? R0(r.x, r.y, r.w, r.h, "none", ` stroke="${P.ink}" stroke-width="${n2(0.3 * u)}" stroke-dasharray="${n2(1.4 * u)} ${n2(0.9 * u)}"`) : "") + axonArt(r, seed, P, u, s.big);
    case "section": return sectionArt(r, seed, P, u);
    case "phase": {
      let g = "";
      if (s.gantt) {
        const yrs = ["2026", "2027", "2028", "2029", "2030", "2031"], lw = r.w * 0.28, cw = (r.w - lw) / yrs.length, rows = 9, rh = (r.h - 8 * u) / rows;
        yrs.forEach((y: any, k: any) => { g += T(r.x + lw + k * cw + cw / 2, r.y + 4 * u, y, { s: 2.5 * u, a: "middle", mono: 1, c: P.mut }); g += L0(r.x + lw + k * cw, r.y + 6 * u, r.x + lw + k * cw, r.y + r.h, P.line, 0.15 * u); });
        const grp = [P.green2, P.acc, P.acc3, P.acc2];
        for (let k = 0; k < rows; k++) { const yy = r.y + 8 * u + k * rh, c = grp[Math.floor(k / 2.3) % 4], st = (k * 7) % 4, ln = 1 + (k * 5) % 3; g += T(r.x, yy + rh * 0.62, ["Ekologik reabilitatsiya", "Yashil karkas", "Piyoda yo'laklar", "Kirish zonalari", "Jamoat markazlari", "Tadbirlar dasturi", "Monitoring tizimi", "Boshqaruv modeli", "Hamkorlik"][k], { s: 2.5 * u }); g += R0(r.x + lw + st * cw + u, yy + rh * 0.22, ln * cw - 2 * u, rh * 0.56, c, ' fill-opacity=".8"'); }
        return g;
      }
      const cols = [P.acc, P.acc3, P.acc2], bh = r.h / 3;
      TXT.phases.forEach((p: any, k: any) => { const yy = r.y + k * bh; g += R0(r.x, yy + 1 * u, 2 * u, bh - 3 * u, cols[k]) + T(r.x + 5 * u, yy + 5 * u, p[0], { s: 3.6 * u, w: 700 }) + T(r.x + 5 * u, yy + 9.5 * u, p[1], { s: 2.6 * u, mono: 1, c: P.mut }) + para(r.x + 5 * u, yy + 11 * u, r.w - 6 * u, bh - 14 * u, p[2], 2.5 * u, P.ink);
        });
      return g;
    }
    case "rule": {
      const lab = TXT.rules[s.num % 8]; let g = L0(r.x, r.y + 0.2, r.x + r.w, r.y + 0.2, P.line, 0.2 * u) + T(r.x, r.y + 4.5 * u, lab, { s: 3.2 * u, w: 700 }) + T(r.x, r.y + 8.5 * u, s.num % 2 ? "Tavsiya etiladi" : "Tavsiya etilmaydi", { s: 2.4 * u, c: s.num % 2 ? P.ok : P.acc });
      const iw = Math.min((r.w * 0.66) / 3, r.h * 0.9); for (let k = 0; k < 3; k++) { const ir = { x: r.x + r.w * 0.34 + k * iw, y: r.y + 1 * u, w: iw * 0.9, h: r.h - 2 * u }; g += axonArt(ir, s.num * 10 + k, P, u * 0.5, false); const ok = s.num % 2; g += T(ir.x + ir.w - 2 * u, ir.y + ir.h - 1 * u, ok ? "✓" : "✕", { s: 4 * u, w: 700, c: ok ? P.ok : P.acc, a: "end" }); }
      return g;
    }
    case "swot": {
      const cs = [P.ok, P.acc, P.acc2, P.warn]; let g = ""; const w2 = (r.w - 3 * u) / 2, h2 = (r.h - 3 * u) / 2;
      TXT.swot.forEach((q: any, k: any) => { const x = r.x + (k % 2) * (w2 + 3 * u), y = r.y + Math.floor(k / 2) * (h2 + 3 * u); g += R0(x, y, w2, h2, P.soft) + R0(x, y, w2, 7 * u, cs[k]) + T(x + 3 * u, y + 4.8 * u, q[0].toUpperCase(), { s: 2.8 * u, w: 700, c: "#fff", ls: 0.2 * u }); q[1].forEach((b: any, j: any) => { g += R0(x + 3 * u, y + 11.5 * u + j * 6 * u, 1.4 * u, 1.4 * u, cs[k]) + T(x + 6 * u, y + 13 * u + j * 6 * u, b, { s: 2.7 * u }); }); });
      return g;
    }
    case "card": {
      const q: any = TXT.esg[i % 3]; let g = R0(r.x + 0.5 * u, r.y, r.w - 1 * u, r.h, P.soft);
      g += `<circle cx="${n2(r.x + 8 * u)}" cy="${n2(r.y + 9 * u)}" r="${n2(5 * u)}" fill="${[P.ok, P.acc2, P.acc3][i % 3]}"/>` + T(r.x + 8 * u, r.y + 10.8 * u, s.tag || "E", { s: 5 * u, w: 700, c: "#fff", a: "middle" }) + T(r.x + 16 * u, r.y + 10.5 * u, q[0], { s: 3.8 * u, w: 700 });
      q[1].forEach((b: any, j: any) => { const yy = r.y + 22 * u + j * 13 * u; g += L0(r.x + 4 * u, yy - 4 * u, r.x + r.w - 4 * u, yy - 4 * u, P.line, 0.2 * u) + T(r.x + 4 * u, yy + 1 * u, b, { s: 3 * u, w: 500 }) + T(r.x + 4 * u, yy + 5 * u, "namuna ko'rsatkich", { s: 2.3 * u, c: P.mut }); });
      return g;
    }
    case "formula": return R0(r.x, r.y, r.w, r.h, P.ink) + T(r.x + 4 * u, r.y + r.h / 2 - 1 * u, "INFRATUZILMA YIG'IMI", { s: 2.3 * u, c: "#ffffff", op: 0.7, ls: 0.3 * u, w: 600 }) + T(r.x + 4 * u, r.y + r.h / 2 + 4.5 * u, "412 000 so'm/m² × 913 103 m² × K = yig'im summasi", { s: 4 * u, c: "#ffffff", w: 600 }) + T(r.x + r.w - 4 * u, r.y + r.h / 2 + 3 * u, "352,3 mlrd so'm", { s: 5 * u, w: 700, c: P.acc3, a: "end" });
    case "toc": {
      const n = s.n || 12, cols = s.cols || 1, per = Math.ceil(n / cols), cw = r.w / cols, rh = Math.min(10 * u, r.h / per); let g = "";
      for (let k = 0; k < n; k++) { const c = Math.floor(k / per), j = k % per, x = r.x + c * cw, y = r.y + j * rh; g += T(x, y + rh * 0.6, String(k).padStart(2, "0"), { s: 3.4 * u, w: 700, c: P.acc, mono: 1 }) + T(x + 10 * u, y + rh * 0.6, TXT.toc[k % TXT.toc.length], { s: 3.4 * u }) + T(x + cw - 6 * u, y + rh * 0.6, String(3 + k * 4), { s: 2.8 * u, c: P.mut, a: "end", mono: 1 }) + L0(x, y + rh * 0.85, x + cw - 6 * u, y + rh * 0.85, P.line, 0.15 * u); }
      return g;
    }
    case "chapter": {
      if (s.plain) { const nb = Math.min(r.h * 0.5, r.w * 0.3); return T(r.x, r.y + nb * 0.85, "01.", { s: nb, w: 700, c: P.acc }) + T(r.x + r.w * 0.1, r.y + nb * 1.25 + 7 * u, "Bo'lim nomi", { s: 8 * u, w: 700, c: P.ink }) + T(r.x + r.w * 0.1, r.y + nb * 1.25 + 13 * u, "Qisqa izoh: bo'limda nima ko'rsatiladi", { s: 3.2 * u, c: P.mut }); }
      const nb = Math.min(r.h * 0.38, r.w * 0.4);
      return R0(r.x, r.y, r.w, r.h, P.acc) + T(r.x + ctx.m, r.y + r.h * 0.18 + nb * 0.8, "02", { s: nb, w: 700, c: "#ffffff", ls: -0.03 * nb }) + T(r.x + ctx.m, r.y + r.h * 0.18 + nb + 9 * u, "Tahlil", { s: 9 * u, w: 700, c: "#ffffff" }) + para(r.x + ctx.m, r.y + r.h * 0.18 + nb + 13 * u, Math.min(r.w - ctx.m * 2, 120 * u), 22 * u, "Hududning tabiiy, ijtimoiy va shaharsozlik konteksti: kuchli tomonlar, cheklovlar va loyiha uchun xulosalar.", 3 * u, "#ffffff");
    }
    case "field": return R0(r.x, r.y, r.w, r.h, P.acc);
    case "stamp": return T(r.x, r.y + r.h * 0.6, "Archemistry Lab  ·  Bosh arxitektor: —  ·  2026", { s: 2.6 * u, c: s.over || s.inv ? "#ffffff" : P.mut, op: s.over ? 0.9 : 1 });
    case "shifr": return R0(r.x, r.y, r.w, r.h, P.ink) + T(r.x + r.w / 2, r.y + r.h * 0.42, "SHIFR", { s: Math.min(r.h * 0.18, 4 * u), c: "#ffffff", a: "middle", ls: 0.4 * u, op: 0.7 }) + T(r.x + r.w / 2, r.y + r.h * 0.78, "000000", { s: Math.min(r.h * 0.3, 7 * u), c: "#ffffff", a: "middle", mono: 1, w: 500 });
    case "module": {
      const t = TXT.caps[(s.num - 1) % 12]; let g = T(r.x, r.y + 4 * u, `${s.num}. ${t}`, { s: 3.4 * u, w: 700, c: P.acc });
      const dr = { x: r.x, y: r.y + 6.5 * u, w: r.w, h: r.h - 14 * u };
      g += s.num % 3 === 2 ? chartArt(dr, seed, P, u, ["donut", "bars"][s.num % 2]) : mapArt(dr, seed, P, u, { small: true, theme: ["green", "heat", "net", "zones", "iso", "water"][s.num % 6] });
      g += para(r.x, r.y + r.h - 6.5 * u, r.w, 6.5 * u, TXT.capLine, 2.4 * u, P.mut, 1.42, true);
      return g;
    }
  }
  return "";
}


/* ---------- belgi rejimi: katak = ramka + kichik piktogramma + nomi ---------- */
const ICON: Record<string, string> = {
  figure: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M16 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  map_small: "M4 4h16v16H4zM4 12h16M12 4v16",
  locator: "M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  render: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M16 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  photo: "M3 7h4l2-2h6l2 2h4v12H3zM12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  axon: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12L4 7.5M12 12v9",
  section: "M2 19h20M5 19V9h4v10M11 19V5h4v14M17 19v-6h3v6",
  chart: "M4 20V4M4 20h16M8 17v-5M12 17V8M16 17v-8M20 17v-3",
  kpi: "M4 8h6M7 5v14M13 9h7M13 15h7M4 19h6",
  table: "M3 5h18v14H3zM3 10h18M3 14.5h18M9 5v14",
  checklist: "M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9",
  text: "M4 6h16M4 10h16M4 14h16M4 18h10",
  lead: "M4 6h16M4 11h16M4 16h12",
  caption: "M4 8h10M4 13h16M4 17h12",
  note: "M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h6",
  legend: "M4 5h4v4H4zM4 14h4v4H4zM11 7h9M11 16h9",
  phase: "M4 6h8M7 12h9M10 18h10M4 3v18",
  rule: "M4 7l3 3 5-6M14 14l6 6M20 14l-6 6",
  swot: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  card: "M4 4h16v16H4zM4 9h16M8 13h8M8 16h5",
  formula: "M17 5H7l6 7-6 7h10",
  module: "M4 4h16v16H4zM4 9h16M8 6.5h0M7 13l3 3 7-6",
  toc: "M4 6h2M9 6h11M4 12h2M9 12h11M4 18h2M9 18h11",
  title: "M5 6h14M12 6v13"
};
function placeholder(s?: any, r?: any, P?: any, u?: any, LIB?: any) {
  const lab = (LIB.ROLES[s.role] || [s.role])[0], key = ICON[s.role] ? s.role : "card";
  const sz = Math.max(4 * u, Math.min(9 * u, r.w * 0.28, r.h * 0.34)), inline = r.h < sz * 2.4 || r.w > r.h * 3.2 && r.h < 22 * u;
  let g = R0(r.x, r.y, r.w, r.h, P.soft, ` stroke="${P.line}" stroke-width="${n2(0.25 * u)}"`);
  const draw = (x?: any, y?: any, z?: any) => `<g transform="translate(${n2(x)} ${n2(y)}) scale(${n2(z / 24)})"><path d="${ICON[key]}" fill="none" stroke="${P.mut}" stroke-width="${n2(1.6)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const extra = s.num ? ` ${s.num}` : s.n ? ` × ${s.n}` : "";
  if (inline) { const z = Math.min(sz, r.h * 0.6); g += draw(r.x + 2.5 * u, r.y + (r.h - z) / 2, z) + T(r.x + 4 * u + z, r.y + r.h / 2 + 0.9 * u, lab + extra, { s: 2.5 * u, c: P.mut, w: 500 }); }
  else { const cx = r.x + r.w / 2, cy = r.y + r.h / 2; g += draw(cx - sz / 2, cy - sz * 0.75, sz) + T(cx, cy + sz * 0.55 + 1.2 * u, lab + extra, { s: 2.6 * u, c: P.mut, a: "middle", w: 500 }); }
  return g;
}

/* ---------- sarlavha / pastki satr ---------- */
function chrome(key?: any, fr?: any, page?: any, fam?: any, P?: any, idx?: any, total?: any) {
  if (!fr.useChrome) return "";
  const { W, H, m, u } = fr; let g = "";
  const proj = "Loyiha nomi · hudud";
  if (key === "kz") {
    g += T(m, m + 2.6 * u, "KZ · " + proj, { s: 2.4 * u, c: P.mut }) + T(W - m, m + 2.6 * u, `${page.sec && /\d/.test(page.sec) ? page.sec.split(".")[0] + "-bo'lim  ·  " : ""}${idx + 1} / ${total}`, { s: 2.4 * u, c: P.mut, a: "end", mono: 1 });
    g += L0(m, m + 4.4 * u, W - m, m + 4.4 * u, P.ink, 0.35 * u);
    const by = m + H * 0.045, bs = H * 0.085;
    if (page.sec) { g += R0(m, by, bs * 1.25, bs, P.acc) + T(m + bs * 0.625, by + bs * 0.64, page.sec, { s: bs * 0.38, w: 700, c: "#fff", a: "middle" }); }
    const tx = page.sec ? m + bs * 1.25 + 4 * u : m;
    g += T(tx, by + bs * 0.48, page.title, { s: Math.min(bs * 0.42, 7.4 * u), w: 700, ls: -0.1 * u });
    if (page.sub) g += T(tx, by + bs * 0.9, page.sub, { s: 3 * u, c: P.mut, i: 1 });
    const fy = H - m - H * 0.075 + 2.5 * u;
    g += L0(m, fy, W - m, fy, P.line, 0.25 * u) + T(m, fy + 5 * u, "TIK", { s: 2.6 * u, w: 700, c: P.acc }) + T(m + 9 * u, fy + 5 * u, "Maydon 12,9 ga  ·  Aholi 16 900  ·  UMN 2,1  ·  Yashillik 32 %  ·  Avtoturargoh 5 200", { s: 2.6 * u, mono: 1 }) + T(W - m, fy + 5 * u, "Manba: loyiha ma'lumoti, 2026", { s: 2.3 * u, c: P.mut, a: "end", i: 1 });
  } else if (key === "album" || key === "slide") {
    const eyebrow = key === "album" ? `${String(idx + 1).padStart(2, "0")} · ${fam.name.toUpperCase()}` : "";
    if (eyebrow) g += T(m, m + 2.6 * u, eyebrow, { s: 2.3 * u, c: P.acc, ls: 0.3 * u, w: 600 });
    const ts = key === "slide" ? 6.4 * u : 6.6 * u;
    g += T(m, m + (key === "album" ? 4.5 * u : 0) + ts, page.title.toUpperCase(), { s: ts, w: 700, ls: 0.05 * u });
    const fy = H - m - 0.6 * u;
    if (key === "album") g += L0(m, fy - 4.5 * u, W - m, fy - 4.5 * u, P.line, 0.2 * u) + T(m, fy, proj, { s: 2.3 * u, c: P.mut });
    g += T(W - m, fy, String(idx + 1), { s: 2.6 * u, c: P.mut, a: "end", mono: 1 });
  } else if (key === "iu") {
    g += T(W * 0.053, H * 0.053 + H * 0.042, page.title, { s: H * 0.034, w: 700, c: P.ink });
    g += R0(W * 0.053, H * 0.139, W * 0.037, H * 0.01, P.acc);
    g += T(W * 0.024, H * 0.947 + H * 0.02, String(idx + 1), { s: H * 0.016, c: P.acc, w: 700 }) + L0(W * 0.167, H * 0.947, W * 0.167, H * 0.97, P.acc, 0.25 * u) + T(W * 0.175, H * 0.947 + H * 0.02, proj, { s: H * 0.014, c: P.mut });
  } else if (key === "book") {
    g += T(m, m + 2.5 * u, "Strategiya · " + page.title, { s: 2.3 * u, c: P.mut }) + L0(m, m + 4 * u, W - m, m + 4 * u, P.line, 0.2 * u);
    g += T(idx % 2 ? W - m : m, H - m, String(idx + 1), { s: 2.6 * u, c: P.mut, a: idx % 2 ? "end" : "start", mono: 1 });
  }
  return g;
}

/* ---------- varaqni chizish ---------- */
export interface SheetOpts {
  pal?: string; mode?: 'icon'; idx?: number; total?: number; slots?: boolean; empty?: Set<number>;
  titleOverride?: string | null; secOverride?: string | null; subOverride?: string | null;
  /** katakni material bilan chizish: null — katak chizilmaydi (boʻsh), satr — SVG boʻlagi */
  fill?: (s: any, k: number, r: { x: number; y: number; w: number; h: number }, ctx: { P: Record<string, string>; u: number; m: number; kind: string }) => string | null;
}
export type Frame = ReturnType<typeof frame>;
/** Maket varagʻini chizish: { svg (mm), fr (ramka: W, H, u, …) } */
export function renderPage(LIB: any, fam: LFamily, page: LPage, fmt: string, opts: SheetOpts): { svg: string; fr: Frame } {
  FF = fam.font || "Archivo, Arial, sans-serif";
  const P = PAL[opts.pal ?? "arch"] || PAL.arch, fr = frame(fmt, fam.chrome, page, LIB, fam.orient, fam);
  let g = R0(0, 0, fr.W, fr.H, "#ffffff");
  const order = page.slots.map((s: any, k: any) => [s, k]).sort((a: any, b: any) => (a[0].role === "field" || a[0].role === "render" && a[0].bleed ? -1 : 0) - (b[0].role === "field" || b[0].role === "render" && b[0].bleed ? -1 : 0) || (a[0].over ? 1 : 0) - (b[0].over ? 1 : 0));
  const DECOR: Record<string, number> = { field: 1, chapter: 1, stamp: 1, shifr: 1, toc: 1 };
  for (let [s, k] of order) {
    const r = rect(fr, s);
    if (opts.fill && !DECOR[s.role]) { const out = opts.fill(s, k, r, { P, u: fr.u, m: fr.m, kind: fr.kind }); if (out) g += `<g data-slot="${k}">${out}</g>`; continue; }
    const kpiOff = page.slots.slice(0, k).filter((q: any) => q.role === "kpi").reduce((a: any, q: any) => a + (q.n || 4), 0) % 8;
    if (opts.mode === "icon" && !(ICON_KEEP as Record<string, number>)[s.role]) { g += `<g data-slot="${k}">${placeholder(s, r, P, fr.u, LIB)}</g>`; continue; }
    if (opts.mode === "icon" && s.over && !s.inv) s = Object.assign({}, s, { over: false });
    g += `<g data-slot="${k}">` + draw(s, r, { P, u: fr.u, m: fr.m, kind: fr.kind, seed: hash(page.id + ":" + k), i: k, kpiOff, pageTitle: page.title, chromeOn: fr.useChrome, titleText: page.chrome === false && page.id.endsWith("end") ? "Rahmat!" : null, eyebrow: fam.id === "kp" || fam.id === "kl" ? "KONKURS LOYIHASI" : null }) + `</g>`;
  }
  g += chrome(fam.chrome, fr, opts.titleOverride ? Object.assign({}, page, { title: opts.titleOverride, sec: opts.secOverride != null ? opts.secOverride : page.sec, sub: opts.subOverride != null ? opts.subOverride : page.sub }) : page, fam, P, opts.idx || 0, opts.total || 1);
  if (opts.slots) {
    page.slots.forEach((s: any, k: any) => { const r = rect(fr, s); const lab = (LIB.ROLES[s.role] || [s.role])[0] + (opts.empty && opts.empty.has(k) ? " · bo'sh" : ""); g += `<g pointer-events="none"><rect x="${n2(r.x)}" y="${n2(r.y)}" width="${n2(r.w)}" height="${n2(r.h)}" fill="#8b4a9c" fill-opacity=".07" stroke="#8b4a9c" stroke-width="${n2(0.35 * fr.u)}" stroke-dasharray="${n2(1.6 * fr.u)} ${n2(1 * fr.u)}"/>` + R0(r.x, r.y, Math.min(r.w, lab.length * 1.45 * fr.u + 4 * fr.u), 4.6 * fr.u, "#8b4a9c") + T(r.x + 1.6 * fr.u, r.y + 3.3 * fr.u, lab, { s: 2.5 * fr.u, c: "#fff", w: 600 }) + `</g>`; });
    // to'r ustunlari
    for (let c = 0; c < 12; c++) g += R0(fr.m + c * (fr.cw + fr.g), fr.top, fr.cw, fr.bot - fr.top, "#8b4a9c", ' fill-opacity=".035" pointer-events="none"');
  }
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n2(fr.W)} ${n2(fr.H)}" width="${n2(fr.W)}mm" height="${n2(fr.H)}mm">${g}</svg>`, fr };
}

export { D2R, n2, esc, rng, hash, T, R0, L0, para, wrap, mapArt, chartArt, picArt, axonArt, clip };

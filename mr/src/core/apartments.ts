/**
 * Kvartiralar (massing bosqichi uchun sxema) va deraza insolyatsiyasi — SanQvaN 0102-25.
 *
 * Seksiya fasadi perimetr boʻylab ~3,3 m li modullarga boʻlinadi (bir modul — bitta xona derazasi).
 * Qoʻshni seksiyaga tegib turgan devor — berk (derazasiz). Ketma-ket modullar kvartiralarga guruhlanadi:
 * k xonali kvartira = k yashash xonasi + 1 oshxona moduli. Burchakda guruh ikki fasadga chiqadi (ikki tomonlama kvartira).
 * Xonalar joylashuvi «optimistik»: yashash xonalari kvartiraning eng yaxshi yoʻnalishdagi derazalarini oladi,
 * oshxona — gʻarbiy yoki eng shimoliy derazani (loyihachi shunday qiladi; aniq reja 5-bosqichda).
 *
 * Meʼyor — SanQvaN 0102-25 (SEOJSQ qarori 04.08.2025, 22-son; Adliya 15.09.2025, №370; kuchga kirgan 16.12.2025; 2-band: 0331-16 kuchini yoʻqotgan), asl matndan:
 *  94 — «1 — 3 xonali kvartiralarning kamida bitta xonasiga va 4-5 xonali kvartiralarda kamida ikkita xonasiga quyosh nurining davomiy tushishi»;
 *  95 — «xona 22-martdan 22-sentabrgacha boʻlgan davrda 2 h (soat) davomida ... uzluksiz quyosh nuri taʼsiri ostida»; uy atrofidagi hududda 0,5 — 1 h;
 *       (eski 0331-16 8.5 dagi «uzlukli +0,5 soat» va «rekonstruksiyada −0,5 soat» yangi normada YOʻQ — uzlukli rejim mos deb hisoblanmaydi);
 *  15 — «derazalarni ufqning gʻarbiy tomoniga 200 — 290° oraligʻida yoʻnaltirishga yoʻl qoʻyilmaydi» (istisnosiz);
 *       «Ikki xonali kvartirani bitta xonasi, uch xonali kvartirani ikkita xonasi ... janubiy, janubiy-sharqiy, sharqiy tomoniga» (1 va 4–5 xonali — aytilmagan).
 */
import type { XY } from './geo';
import { signedArea, obb2 } from './geo';
import type { Prism, SunStep } from './sun';
import { rulePlan, applyEdit, type RulePlan } from './sectionplan';

export interface Module { a: XY; b: XY; /** deraza nuqtasi (fasaddan 0,3 m tashqarida) */ p: XY; /** tashqi normal azimuti, ° */ az: number; blind: boolean }
export interface Apt { rooms: number; /** modullar indekslari */ mods: number[]; /** yashash xonalari modullari */ living: number[]; /** qator oxirida joy yetmay kichraytirilgan — miksdan tashqari */ forced?: boolean; /** rejadagi umumiy maydon, m² (yalpi × 0,85) */ area?: number }
/** plan — qavat rejasi (kommunikatsiya → kvartiralar), kvartiralar shundan olinadi */
export interface Layout { mods: Module[]; apts: Apt[]; plan?: RulePlan }

export const MIX_DEFAULT: [number, number, number, number] = [20, 40, 30, 10];
export const MOD_W = 3.3;
/** Kvartira oʻlchami: k xonali kvartiraga qoʻshimcha modullar (S — ixcham, M — oʻrtacha, L — keng) */
export type AptSize = 'S' | 'M' | 'L';
export const APT_SIZES: { id: AptSize; name: string; note: string }[] = [{ id: 'S', name: 'S', note: 'ixcham: 1x ≈ 36, 2x ≈ 52, 3x ≈ 70 m²' }, { id: 'M', name: 'M', note: 'oʻrtacha: 1x ≈ 42, 2x ≈ 60, 3x ≈ 80 m²' }, { id: 'L', name: 'L', note: 'keng: 1x ≈ 50, 2x ≈ 72, 3x ≈ 95 m²' }];
export const extraMods = (size: AptSize, rooms: number) => size === 'L' ? 1 : size === 'M' && rooms >= 3 ? 1 : 0;
/** Kvartira netto maydoni, m² — TAXMIN: modullar × 3,3 m × seksiya yarim chuqurligi × 0,8 (devorlar, umumiy joylar) */
export const aptArea = (mods: number, halfDepth: number) => mods * MOD_W * halfDepth * 0.8;

const az = (n: XY) => ((Math.atan2(n[0], n[1]) * 180 / Math.PI) + 360) % 360;
export const isWest = (a: number) => a >= 200 && a <= 290;
/** oshxonaga eng mos (yashash uchun eng yomon) deraza: gʻarb, keyin shimol */
const badness = (a: number) => (isWest(a) ? 2 : 0) + Math.cos(a * Math.PI / 180);

/**
 * Seksiya rejasi. ring — mahalliy XY; blindAt(p) — nuqta qoʻshni binoning ichidami (berk devor).
 * Fasad ~3,3 m li modullarga (derazalar) boʻlinadi; kvartiralar QAVAT REJASIDAN olinadi (sectionplan.ts):
 * avval zina-lift yadrosi va koridor, keyin har kvartira koridorga eshik va fasadga deraza bilan.
 */
export function layoutSection(ring0: XY[], blindAt: (p: XY) => boolean, mix: number[] = MIX_DEFAULT, modW = MOD_W, size: AptSize = 'M', court: XY | null = null): Layout {
  const ring = signedArea(ring0) < 0 ? [...ring0].reverse() : ring0, mods: Module[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    const cnt = Math.floor(l / modW + 0.2); if (cnt < 1) continue;
    const n: XY = [dy / l, -dx / l], w = l / cnt;
    for (let k = 0; k < cnt; k++) {
      const ma: XY = [a[0] + dx * k / cnt, a[1] + dy * k / cnt], mb: XY = [a[0] + dx * (k + 1) / cnt, a[1] + dy * (k + 1) / cnt];
      const mid: XY = [(ma[0] + mb[0]) / 2, (ma[1] + mb[1]) / 2];
      mods.push({ a: ma, b: mb, p: [mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3], az: az(n), blind: blindAt([mid[0] + n[0] * 0.8, mid[1] + n[1] * 0.8]) || w < 2.4 });
    }
  }
  // reja generatori bir necha variant yasaydi (sekin) — natija kesh: kontur, berk modullar, aralashma, oʻlcham, hovli nuqtasi
  const key = JSON.stringify([ring.map(p => [Math.round(p[0] * 1e3), Math.round(p[1] * 1e3)]), mods.map(m => m.blind ? 1 : 0).join(''), mix, modW, size, court && [Math.round(court[0] * 1e3), Math.round(court[1] * 1e3)]]);
  let base = PLAN_CACHE.get(key);
  if (!base) { base = rulePlan(ring, mods, mix, size, court); PLAN_CACHE.set(key, base); if (PLAN_CACHE.size > 400) PLAN_CACHE.delete(PLAN_CACHE.keys().next().value!); }
  const plan = structuredClone(base);
  return { mods, apts: aptsOf(plan, mods), plan };
}
const PLAN_CACHE = new Map<string, RulePlan>();
/** Rejadagi kvartiralar → insolyatsiya va hisob uchun roʻyxat (yashash xonalari — eng yaxshi yoʻnalishdagi derazalar) */
export function aptsOf(plan: RulePlan, mods: Module[]): Apt[] {
  return plan.apts.map(a => ({ rooms: a.rooms, mods: a.mods, living: [...a.mods].sort((x, y) => badness(mods[x].az) - badness(mods[y].az)).slice(0, a.rooms), area: a.area * 0.85 }));
}


/* ---------------- deraza insolyatsiyasi ---------------- */
const RAD = Math.PI / 180;

function rayEnter(p: XY, d: XY, r: XY[]): number {
  let best = Infinity, inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    if (t >= 0 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return inside ? 0 : best;
}

/**
 * Har deraza uchun: eng uzun uzluksiz quyoshli davr va jami (soat). Quyosh fasad oldida boʻlishi shart
 * (normal bilan burchak < 90°). steps — teng qadamli, vaqt tartibida.
 */
export function windowSun(pts: XY[], z: number[], nAz: number[], prisms: Prism[], steps: SunStep[], maxDist = 500): { run: Float32Array; total: Float32Array } {
  const C = 20, grid = new Map<string, number[]>();
  let maxTop = 0;
  prisms.forEach((pr, k) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; maxTop = Math.max(maxTop, pr.top);
    for (const p of pr.ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(y0 / C); j <= Math.floor(y1 / C); j++) { const key = `${i},${j}`; (grid.get(key) || grid.set(key, []).get(key)!).push(k); }
  });
  const N = pts.length, run = new Float32Array(N), total = new Float32Array(N), cur = new Float32Array(N), stamp = new Int32Array(prisms.length).fill(-1);
  let tick = 0;
  for (const st of steps) {
    const tanA = Math.tan(st.alt * RAD), d: XY = [Math.sin(st.az * RAD), Math.cos(st.az * RAD)];
    for (let n = 0; n < N; n++) {
      let lit = Math.cos((st.az - nAz[n]) * RAD) > 0;
      const p = pts[n], zp = z[n]; tick++;
      for (let s = 0; s <= maxDist && lit; s += C * 0.7) {
        if (s * tanA > maxTop - zp) break;
        const qx = p[0] + d[0] * s, qy = p[1] + d[1] * s;
        for (let di = -1; di <= 1 && lit; di++) for (let dj = -1; dj <= 1 && lit; dj++) {
          const ids = grid.get(`${Math.floor(qx / C) + di},${Math.floor(qy / C) + dj}`); if (!ids) continue;
          for (const k of ids) {
            if (stamp[k] === tick) continue; stamp[k] = tick;
            const pr = prisms[k], dh = pr.top - zp; if (dh <= 0) continue;
            const t = rayEnter(p, d, pr.ring);
            if (t < Infinity && t > 0.01 && t * tanA < dh) { lit = false; break; }
          }
        }
      }
      if (lit) { total[n] += st.dt; cur[n] += st.dt; if (cur[n] > run[n]) run[n] = cur[n]; } else cur[n] = 0;
    }
  }
  return { run, total };
}

/* ---------------- baholash ---------------- */
export interface InsolNorm { /** uzluksiz talab, soat (95-band: 2,0); eski 0331-16 8.5 rejimi (uzlukli +0,5 soat ham mos) — ixtiyoriy, kuchini yoʻqotgan */ need: number; old85?: boolean }
export const roomOk = (run: number, total: number, n: InsolNorm) => run >= n.need - 1e-6 || (!!n.old85 && total >= n.need + 0.5 - 1e-6);
/** 94-band: kamida nechta xona (1–3 xonali — 1, 4–5 xonali — 2) */
export const roomsNeeded = (k: number) => (k >= 4 ? 2 : 1);
/** 15-band: gʻarbga (200–290°) qaragan yashash xonasi — yoʻl qoʻyilmaydi (istisnosiz; eski 9.2 istisnolari bekor) */
export const westAllowed = (_k: number) => 0;
/** 15-band, 2-xatboshi: janub / janubi-sharq / sharq — sektorlar ±22,5°: 67,5° ≤ az < 200° (200° dan — gʻarb taqiqi) */
export const isSE = (a: number) => a >= 67.5 && a < 200;
/** 15-band: janub/janubi-sharq/sharqqa qarashi shart boʻlgan xonalar soni (2 xonali — 1, 3 xonali — 2; 1 va 4–5 xonali — meʼyorda aytilmagan → 0) */
export const seNeeded = (k: number) => (k === 2 ? 1 : k === 3 ? 2 : 0);

/* ---------------- loyiha boʻyicha ---------------- */
import type { Project } from './doc';

/** Kvartiralar jamlanmasi: turlari boʻyicha soni, oʻrtacha maydoni, miksdan tashqari */
export function aptSummary(plans: SecPlan[]): { total: number; forced: number; byK: { k: number; n: number; share: number; area: number }[] } {
  const byK = new Map<number, { n: number; area: number }>(); let total = 0, forced = 0;
  for (const pl of plans) { const nf = pl.f1 - pl.f0; for (const a of pl.layout.apts) { total += nf; if (a.forced) forced += nf; const e = byK.get(a.rooms) ?? { n: 0, area: 0 }; e.n += nf; e.area += (a.area ?? aptArea(a.mods.length, pl.halfDepth)) * nf; byK.set(a.rooms, e); } }
  return { total, forced, byK: [1, 2, 3, 4].map(k => { const e = byK.get(k); return { k, n: e?.n ?? 0, share: total && e ? e.n / total : 0, area: e && e.n ? e.area / e.n : 0 }; }) };
}
import { frame } from './geo';
import { useDef } from './uses';

export interface SecPlan { bid: string; ring: XY[]; layout: Layout; /** qoʻlda tahrir: qoʻllandi yoki bino oʻzgargani uchun eskirdi */ edited?: 'ok' | 'eskirgan'; /** tahrirdan oldingi (generatsiya qilingan) reja */ genPlan?: RulePlan; /** turar joy qavatlari [f0, f1) — bino pastidan */ f0: number; f1: number; z0: number; /** seksiya yarim chuqurligi, m (kvartira maydoni taxmini uchun) */ halfDepth: number }

const SKIP = new Set(['stilobat', 'uy', 'taunhaus']);

/** Tahrir kaliti: oyoq izi, kvartira miksi va oʻlchami — shulardan biri oʻzgarsa saqlangan tahrir eskiradi */
export function planKey(doc: Project, b: { footprint: [number, number][] }): string {
  const s = JSON.stringify([b.footprint.map(p => [Math.round(p[0] * 1e6), Math.round(p[1] * 1e6)]), doc.settings.aptMix, doc.settings.aptSize ?? 'M']);
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
/** Turar joy seksiyalari rejasi (uylar, taunhauslar va stilobat — kvartirali emas) */
export function planApartments(doc: Project): SecPlan[] {
  const fr = frame(doc.origin), mix = doc.settings.aptMix;
  const all = doc.buildings.filter(b => !SKIP.has(b.gen?.kind ?? '')).map(b => {
    const r = b.footprint.map(fr.toLocal); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return { b, r, bb: [x0, y0, x1, y1] };
  });
  const inside = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const out: SecPlan[] = [];
  // hovli tomoni: uchastka (yoki barcha binolar) markazi — yadro va kirish shu tomonda
  const site = doc.site?.rings[0]?.map(fr.toLocal);
  const pts = site && site.length >= 3 ? site : all.flatMap(x => x.r);
  const court: XY | null = pts.length ? [pts.reduce((t, p) => t + p[0], 0) / pts.length, pts.reduce((t, p) => t + p[1], 0) / pts.length] : null;
  for (const s of all) {
    const b = s.b; if (useDef(b.use).res <= 0 || b.floors - b.nonRes < 1) continue;
    const z0 = b.z0 ?? 0, top = z0 + b.floors;
    // berk devor: qoʻshni seksiya shu sathda tegib tursa
    const blindAt = (p: XY) => all.some(o => o !== s && p[0] >= o.bb[0] && p[0] <= o.bb[2] && p[1] >= o.bb[1] && p[1] <= o.bb[3] && (o.b.z0 ?? 0) < top && (o.b.z0 ?? 0) + o.b.floors > z0 + b.nonRes && inside(p, o.r));
    const size = doc.settings.aptSize ?? 'M', layout = layoutSection(s.r, blindAt, mix, MOD_W, size, court);
    // qoʻlda tahrir: kalit mos boʻlsa — tahrirlangan reja
    let edited: 'ok' | 'eskirgan' | undefined, genPlan: RulePlan | undefined;
    if (b.planEdit) {
      if (b.planEdit.key === planKey(doc, b) && layout.plan) {
        genPlan = layout.plan;
        layout.plan = applyEdit(layout.plan, { apts: b.planEdit.apts.map(a => ({ ring: a.ring.map(fr.toLocal), rooms: a.rooms })), rooms: b.planEdit.rooms.map(q => ({ ring: q.ring.map(fr.toLocal), kind: q.kind })) }, layout.mods, size);
        layout.apts = aptsOf(layout.plan, layout.mods); edited = 'ok';
      } else edited = 'eskirgan';
    }
    const halfDepth = Math.max(4, Math.min(9, sectionDepth(s.r, layout.mods) / 2));
    if (layout.apts.length) out.push({ bid: b.id, ring: s.r, layout, f0: b.nonRes, f1: b.floors, z0, halfDepth, ...(edited ? { edited } : {}), ...(genPlan ? { genPlan } : {}) });
  }
  return out;
}

/** Seksiya chuqurligi: modul oʻrtasidan ichki normal boʻylab qarshi devorgacha masofa — 30-protsentil (L shaklda tor qanot eni) */
export function sectionDepth(ring: XY[], mods: Module[]): number {
  const r = signedArea(ring) < 0 ? [...ring].reverse() : ring, ds: number[] = [];
  for (const m of mods) {
    if (m.blind) continue;
    const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], l = Math.hypot(dx, dy) || 1, n: XY = [-dy / l, dx / l], p: XY = [(m.a[0] + m.b[0]) / 2 + n[0] * 0.05, (m.a[1] + m.b[1]) / 2 + n[1] * 0.05];
    let best = Infinity;
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], ex = b[0] - a[0], ey = b[1] - a[1], den = n[0] * ey - n[1] * ex; if (Math.abs(den) < 1e-9) continue;
      const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, u = ((a[0] - p[0]) * n[1] - (a[1] - p[1]) * n[0]) / den;
      if (t > 0.1 && u >= 0 && u <= 1 && t < best) best = t;
    }
    if (isFinite(best)) ds.push(best);
  }
  if (!ds.length) return obb2(r).S;
  ds.sort((a, b) => a - b); return ds[Math.floor(ds.length * 0.3)];   // pastki kvartil — L shaklda tor qanot eni olinsin
}

/** Hisob nuqtalari: har seksiya × turar qavat × kvartiraga tegishli modul */
export function windowPoints(plans: SecPlan[]): { sec: number; f: number; m: number }[] {
  const out: { sec: number; f: number; m: number }[] = [];
  plans.forEach((pl, sec) => {
    const used = new Set(pl.layout.apts.flatMap(a => a.mods));
    for (let f = pl.f0; f < pl.f1; f++) for (let m = 0; m < pl.layout.mods.length; m++) if (used.has(m)) out.push({ sec, f, m });
  });
  return out;
}

export interface AptStats {
  apts: number; insolOk: number; westOk: number; /** 15-band 2-xatboshi: janub/janubi-sharq/sharq talabi bajarilgan kvartiralar */ seOk: number; bothOk: number; rooms: number; roomsOk: number;
  byRooms: { k: number; n: number; ok: number }[];
  /** seksiyalar boʻyicha: kvartiralar va mos emaslari */
  bySec: { bid: string; apts: number; bad: number; west: number }[];
  /** har nuqta holati: 0 — yashash xonasi mos (uzluksiz), 1 — faqat uzlukli (eski 8.5; mos emas, old85 boʻlsa mos), 2 — mos emas, 3 — yordamchi xona; west — 15-band buzilgan kvartira xonasi (1 — gʻarbga, 2 — janub/sharq yetarli emas) */
  cls: Uint8Array; west: Uint8Array;
}

export function evaluateApts(plans: SecPlan[], pts: { sec: number; f: number; m: number }[], run: Float32Array, total: Float32Array, norm: InsolNorm): AptStats {
  const idx = new Map<string, number>(); pts.forEach((p, i) => idx.set(`${p.sec}|${p.f}|${p.m}`, i));
  const cls = new Uint8Array(pts.length).fill(3), west = new Uint8Array(pts.length);
  const byK = new Map<number, { n: number; ok: number }>(), bySec: AptStats['bySec'] = [];
  let apts = 0, insolOk = 0, westOk = 0, seOk = 0, bothOk = 0, rooms = 0, roomsOk = 0;
  plans.forEach((pl, sec) => {
    const S = { bid: pl.bid, apts: 0, bad: 0, west: 0 };
    for (const a of pl.layout.apts) {
      const wBad = a.living.filter(m => isWest(pl.layout.mods[m].az)).length > westAllowed(a.rooms);
      const sBad = a.living.filter(m => isSE(pl.layout.mods[m].az)).length < seNeeded(a.rooms);
      for (let f = pl.f0; f < pl.f1; f++) {
        let ok = 0;
        for (const m of a.living) {
          const i = idx.get(`${sec}|${f}|${m}`)!; rooms++;
          const good = roomOk(run[i], total[i], norm); if (good) { ok++; roomsOk++; }
          cls[i] = run[i] >= norm.need - 1e-6 ? 0 : total[i] >= norm.need + 0.5 - 1e-6 ? 1 : 2; if (wBad && isWest(pl.layout.mods[m].az)) west[i] = 1; else if (sBad) west[i] = 2;
        }
        const iOk = ok >= roomsNeeded(a.rooms);
        apts++; S.apts++; if (iOk) insolOk++; if (!wBad) westOk++; if (!sBad) seOk++; if (iOk && !wBad && !sBad) bothOk++; else S.bad++; if (wBad || sBad) S.west++;
        const e = byK.get(a.rooms) ?? { n: 0, ok: 0 }; e.n++; if (iOk && !wBad && !sBad) e.ok++; byK.set(a.rooms, e);
      }
    }
    bySec.push(S);
  });
  return { apts, insolOk, westOk, seOk, bothOk, rooms, roomsOk, byRooms: [...byK.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k, ...v })), bySec, cls, west };
}

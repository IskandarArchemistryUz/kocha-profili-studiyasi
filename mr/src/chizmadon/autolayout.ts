/**
 * Chizmadon avto-joylashtirish (bitta oyna, 2026-10-19). «Loyihadan» kelgan materiallar → maket oilasining varaq turlari.
 * Har varaq turi materiallar bilan sinab toʻldiriladi (tryFill), keyin nur qidiruvi (beam) eng arzon ketma-ketlikni tanlaydi:
 *   narx = varaqlar × 60 − ball + joysiz materiallar (asosiy 500, kichik 45).
 * Strukturaviy varaqlar (mundarija, boʻlim ajratgich, chetgacha render) sahifalashda ishtirok etmaydi.
 * Foydalanuvchi i-varaq turini majburlashi (force) va materialni katakka sudrashi (applyOv) mumkin.
 * Bu modul DOM ga bogʻliq emas — faqat maʼlumot va hisob.
 */
import { LAYOUTS, type LFamily, type LPage, type LRole, type LSlot } from './layouts';

/** Material roli — qaysi katak turlariga tushishi shundan aniqlanadi */
/** plan — loyiha xaritasi (bosh reja, Varaqlardan); image — render, foto, sahna rasmi */
export type MRole = 'title' | 'locator' | 'legend' | 'table' | 'chart' | 'text' | 'image' | 'plan';

/** Chizish konteksti: varaq birligi (u, mm), palitra va h.k. — render.ts beradi */
export interface MatCtx { u: number; P: Record<string, string>; [k: string]: unknown }
export interface Rect { x: number; y: number; w: number; h: number }

/** «Loyihadan» material: Master reja qadamlari, Joyshunos, xarita oynalari, TIK jadvali, kesim va h.k. */
export interface Material {
  id: string; role: MRole; name: string; title: string;
  visible: boolean; accent: string | null; scale: number;
  /** joylashuv xaritasi darajasi: 0 — davlat, 1 — viloyat, 2 — tuman */
  level?: number;
  /** juft material: shu id dagi reja bilan bitta varaqda (masalan, kvartirografiya — reja chapda, eksplikatsiya oʻng panelda) */
  pair?: string;
  kind?: string;
  /** qoʻlda tahrirlangan matn (null — avtomatik) */
  text?: string | null;
  /** katakni chizish (mm, SVG boʻlagi); yoʻq boʻlsa — render.ts namunasi */
  render?: (r: Rect, ctx: MatCtx, bare?: boolean) => string;
  /** foydalanuvchi rasmi bilan almashtirilgan */
  own?: boolean;
}

/** Katak roli → qabul qiladigan material rollari (birinchisi — afzal) */
export const ACCEPT: Partial<Record<LRole, MRole[]>> = {
  title: ['title'], figure: ['image', 'plan', 'locator', 'chart', 'table'], render: ['image'], photo: ['image'],
  locator: ['locator'], map: ['plan', 'locator'], map_small: ['locator', 'chart', 'plan'], module: ['chart', 'locator', 'plan', 'table', 'text'],
  chart: ['chart'], table: ['table'], kpi: ['table'], checklist: ['table', 'text'], lead: ['text'], text: ['text', 'legend'],
  note: ['text', 'legend'], caption: ['text'], legend: ['legend'], section: ['image'], axon: ['image'],
};
/** Bezak kataklari — toʻldirilmaydi va boʻsh hisoblanmaydi */
export const NEUTRAL: Partial<Record<LRole, 1>> = { field: 1, chapter: 1, stamp: 1, shifr: 1, toc: 1 };
/** Joysiz qolsa kam jarima oladigan kichik materiallar */
export const MINOR: Partial<Record<MRole, 1>> = { legend: 1, text: 1 };

export const accepts = (slotRole: LRole, matRole: MRole): boolean => (ACCEPT[slotRole] ?? []).includes(matRole);

/** Katak maydoni toʻr birligida (foizli kataklar 12×8 toʻrga keltiriladi) */
export const cells = (s: LSlot): number => (s.fx != null ? (s.fw ?? 0) * (s.fh ?? 0) * 96 / 10000 : (s.cs ?? 1) * (s.rs ?? 1));
const isTitleSlot = (s: LSlot, fam: LFamily) => s.role === 'title' && fam.chrome !== 'poster';

export interface Fill {
  page: LPage;
  /** katak raqami → material */
  assign: Map<number, Material>;
  /** toʻldirilmagan (lekin toʻldirilishi mumkin boʻlgan) kataklar */
  empty: Set<number>;
  used: Set<string>;
  score: number;
  /** shu oʻringa muqobil varaq turlari (ball boʻyicha, ≤ 6) */
  alts?: Fill[];
}

/** Bitta varaq turini materiallar bilan sinab toʻldirish. Katta kataklar birinchi. */
export function tryFill(page: LPage, pool: Material[], fam: LFamily, paired: Set<string> = new Set(pool.filter(e => e.visible).map(e => e.id))): Fill {
  const used = new Set<string>(), assign = new Map<number, Material>(), empty = new Set<number>();
  const order = page.slots.map((s, k) => [s, k] as const).sort((a, b) => cells(b[0]) - cells(a[0]));
  for (const [s, k] of order) {
    if (NEUTRAL[s.role] || isTitleSlot(s, fam)) continue;
    const acc = ACCEPT[s.role];
    if (!acc) { empty.add(k); continue; }
    let best: Material | undefined;
    // juftli material faqat oʻz rejasi bilan bitta varaqda (reja koʻrinmasa — erkin); juft shu varaqda boʻlsa — birinchi navbatda
    // paired — albomdagi koʻrinadigan materiallar: juftining rejasi albomda boʻlsa, jadval faqat shu reja bilan bitta varaqda
    const pairOk = (e: Material) => !e.pair || used.has(e.pair) || !paired.has(e.pair);
    best = pool.find(e => !used.has(e.id) && !!e.pair && used.has(e.pair) && acc.includes(e.role));
    if (!best) for (const role of acc) {
      best = pool.find(e => !used.has(e.id) && e.role === role && pairOk(e) && (s.role !== 'map_small' || role !== 'locator' || (e.level ?? 0) > 0));
      if (best) break;
    }
    // joylashuv darajasi: katta katakka — davlat (0), kichigiga — tuman (eng katta daraja)
    if (best?.role === 'locator') {
      const locs = pool.filter(e => !used.has(e.id) && e.role === 'locator' && (s.role !== 'map_small' || (e.level ?? 0) > 0)).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
      if (locs.length) best = cells(s) >= 20 ? locs[0] : locs[locs.length - 1];
    }
    if (best) { used.add(best.id); assign.set(k, best); } else empty.add(k);
  }
  // ball: toʻlgan maydon ulushi − boʻsh maydon jarimasi + toʻlgan kataklar soni
  const W: Partial<Record<LRole, number>> = { caption: 0, note: 0, legend: 0.2, lead: 0.35 };
  let tot = 0, fc = 0, ec = 0;
  page.slots.forEach((s, k) => {
    if (NEUTRAL[s.role] || isTitleSlot(s, fam)) return;
    const wt = W[s.role] ?? 1, c = cells(s);
    tot += c * (assign.has(k) ? 1 : wt);
    if (assign.has(k)) fc += c; else if (empty.has(k)) ec += c * wt;
  });
  const score = tot ? fc / tot * 100 - ec / tot * 120 + assign.size * 6 : -999;
  return { page, assign, empty, used, score };
}

/** Sahifalashda ishtirok etmaydigan varaqlar: mundarija, boʻlim, chetgacha render (muqova) */
export const structural = (p: LPage): boolean => p.slots.some(q => q.role === 'toc' || q.role === 'chapter' || (q.role === 'render' && !!q.bleed));

export interface PState { seq: Fill[]; pool: Material[]; score: number }
export const cost = (st: PState): number => st.seq.length * 60 - st.score + st.pool.reduce((a, e) => a + (MINOR[e.role] ? 45 : 500), 0);

export interface Paginated { pages: Fill[]; left: Material[]; titleEl: Material | null }

/**
 * Sahifalash: nur qidiruvi. force[i] = varaq turi id si — i-oʻringa majburan shu tur.
 * Plakat oilasi (poster) — bitta varaq; boshqalar ≤ 6 varaq chuqurlikda qidiriladi.
 */
export function paginate(fam: LFamily, mats: Material[], force: Record<number, string> = {}): Paginated {
  let pool0 = mats.filter(e => e.visible);
  const titleEl = pool0.find(e => e.role === 'title') ?? null;
  if (fam.chrome !== 'poster') pool0 = pool0.filter(e => e.role !== 'title'); // sarlavha varaq tepasida (chrome)
  const pages = fam.pages.filter(p => !structural(p)), vis = new Set(pool0.map(e => e.id));
  const maxDepth = fam.chrome === 'poster' ? 1 : 6, BEAM = 10, EXP = 7;
  let beam: PState[] = [{ seq: [], pool: pool0, score: 0 }];
  let done: PState[] = [];
  if (!pool0.length) return { pages: [], left: [], titleEl };
  for (let d = 0; d < maxDepth && beam.length; d++) {
    const next: PState[] = [];
    for (const st of beam) {
      const forced = force[st.seq.length];
      let cands = pages.map(p => tryFill(p, st.pool, fam, vis)).filter(c => c.assign.size > 0).sort((a, b) => b.score - a.score);
      if (forced) { const f = cands.find(c => c.page.id === forced); if (f) cands = [f]; }
      if (!cands.length) { done.push(st); continue; }
      const alts = cands.slice(0, 6);
      for (const c of cands.slice(0, EXP)) {
        const ns: PState = { seq: st.seq.concat([{ ...c, alts }]), pool: st.pool.filter(e => !c.used.has(e.id)), score: st.score + c.score };
        (ns.pool.length ? next : done).push(ns);
        if (ns.pool.length && ns.pool.every(e => MINOR[e.role])) done.push(ns);
      }
    }
    next.sort((a, b) => cost(a) - cost(b)); beam = next.slice(0, BEAM);
  }
  done = done.concat(beam).sort((a, b) => cost(a) - cost(b));
  const best = done[0] ?? { seq: [], pool: pool0, score: 0 };
  // majburlangan muqobil har doim roʻyxatda koʻrinsin
  return { pages: best.seq, left: best.pool, titleEl };
}

/** Materialni katakka sudrash natijasi (pagination ustidan qoʻyiladi) */
export interface Ov { a: string; pi: number; k: number }

/**
 * Sudrab qoʻyishlarni qoʻllash (joyida). Mos rol boʻlsa material katakka oʻtadi; katakdagi eski material
 * — mos boʻlsa — boʻshagan joyga, aks holda joysizlar roʻyxatiga. Mos kelmaydigan yoki eskirgan amallar tashlanadi.
 * Qaytadi: saqlanib qolgan amallar.
 */
export function applyOv(PG: Paginated, ov: Ov[], mats: Material[]): Ov[] {
  const keep: Ov[] = [];
  for (const op of ov) {
    const pk = PG.pages[op.pi]; if (!pk) continue;
    const s = pk.page.slots[op.k], a = mats.find(e => e.id === op.a);
    if (!s || !a || !a.visible || !accepts(s.role, a.role)) continue;
    let from: [number, number] | null = null;
    PG.pages.forEach((q, qi) => q.assign.forEach((el, kk) => { if (el.id === a.id) from = [qi, kk]; }));
    const b = pk.assign.get(op.k);
    const f = from as [number, number] | null;
    if (f && f[0] === op.pi && f[1] === op.k) { keep.push(op); continue; }
    if (f) {
      const fq = PG.pages[f[0]], fs = fq.page.slots[f[1]];
      fq.assign.delete(f[1]);
      if (b && accepts(fs.role, b.role)) fq.assign.set(f[1], b);
      else { fq.empty.add(f[1]); if (b) PG.left.push(b); }
    } else {
      PG.left = PG.left.filter(e => e.id !== a.id);
      if (b) PG.left.push(b);
    }
    pk.assign.set(op.k, a); pk.empty.delete(op.k); keep.push(op);
  }
  return keep;
}

/** Sudrab qoʻyish oldidan tekshiruv: mos boʻlsa null, aks holda katak roli nomi (xabar uchun) */
export function dropReject(slot: LSlot, m: Material): string | null {
  return accepts(slot.role, m.role) ? null : LAYOUTS.roles[slot.role][0];
}

/** Material qaysi varaq va katakda: id → {pi, k} */
export function placements(PG: Paginated): Record<string, { pi: number; k: number }> {
  const out: Record<string, { pi: number; k: number }> = {};
  PG.pages.forEach((pk, pi) => pk.assign.forEach((el, k) => { out[el.id] = { pi, k }; }));
  return out;
}

export const familyById = (id: string): LFamily => LAYOUTS.families.find(f => f.id === id) ?? LAYOUTS.families[0];

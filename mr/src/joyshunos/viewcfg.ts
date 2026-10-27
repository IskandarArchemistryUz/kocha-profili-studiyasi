/**
 * Qatlam koʻrinishi (27.10): har qatlam uchun uslub, intensivlik va rang shkalasi.
 * UI — faqat faol qatlam kartasida, bitta «Koʻrinish» tugmasi ortida (yigʻiq): tugmalar koʻpaymasin.
 */
import { h } from '../ui/dom';
import { tr } from '../i18n';

export interface LayerView { st?: string; k?: number; p?: number }
export interface ViewDef { /** uslublar guruhi sarlavhasi (yoʻq — «Uslub») */ stLabel?: string; styles?: [string, string][]; pals?: [string, string[]][]; k?: boolean }

/** Rang shkalalari: past → yuqori */
export const VIEW: Record<string, ViewDef> = {
  relyef: { styles: [['topo', 'Topo chiziqlar'], ['soya', 'Faqat soya'], ['gips', 'Gipsometriya']], pals: [['Qum', ['#f4ecd8', '#e2cfa3', '#c9a46e', '#9c7448', '#6e4f33']], ['Yashil-jigar', ['#e6efd6', '#c8d9a7', '#d8c48c', '#b38b5a', '#7d5a3a']], ['Kulrang', ['#f2f2f0', '#d6d5d1', '#b0aea8', '#86847e', '#5c5a55']]], k: true },
  nishab: { styles: [['toifa', 'Toifalar'], ['strelka', 'Strelkalar bilan']], k: true },
  issiqlik: { styles: [['sirt', 'Sirt'], ['izoterma', 'Izotermalar']], pals: [['Klassik', ['#2c6fb0', '#79b0d6', '#cfe3ee', '#f4f1e6', '#f7c9a0', '#ee8a5a', '#c43b2e']], ['Magma', ['#fcfdbf', '#fec488', '#fc8961', '#e85362', '#b73779', '#721f81', '#2c115f']], ['Faqat issiq', ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#e6550d', '#a63603']]], k: true },
  shovqin: { styles: [['zona', 'Zonalar'], ['kontur', 'Konturlar'], ['65', '≥ 65 dB']], pals: [['ISO 1996', ['#e9f0e4', '#d6e7b8', '#f3dd8a', '#f0a85c', '#d9603f', '#8e2c4f']], ['Pushti', ['#fde0ef', '#f9bcd8', '#f4a6c9', '#e0609c', '#c2416b', '#7a0f3c']]], k: true },
  shamol: { styles: [['oqim', 'Oqim chiziqlari'], ['roza', 'Faqat shamol guli']], pals: [['Yashil', ['#bfe3cf', '#5fb38a', '#2f8a66', '#145c40']], ['Moviy', ['#cfe3f5', '#7fb3e0', '#3a7fc2', '#16467e']], ['Toʻq sariq', ['#fde2bf', '#f6ad5f', '#e0782a', '#9c4512']]], k: true },
  xizmat: { styles: [['ikonka', 'Ikonkalar'], ['nuqta', 'Nuqtalar'], ['qamrov', 'Qamrov radiusi']] },
  raqobat: { styles: [['nuqta', 'Nuqtalar'], ['zichlik', 'Zichlik']], k: true },
  quyosh: { k: true },
  piyoda: { stLabel: 'Kim uchun', styles: [['yosh', 'Kattalar'], ['bola', 'Bola'], ['qariya', 'Qariya'], ['homilador', 'Homilador'], ['arava', 'Aravacha'], ['sayyoh', 'Sayyoh']], k: true },
  oqim: { styles: [['qalinlik', 'Qalinlik'], ['nur', 'Yorqin nur']], k: true },
};
export const view = (V: Record<string, LayerView> | undefined, id: string): Required<LayerView> => {
  const d = VIEW[id], v = V?.[id] ?? {};
  return { st: v.st && d?.styles?.some(s => s[0] === v.st) ? v.st : d?.styles?.[0][0] ?? '', k: v.k ?? 0.6, p: v.p != null && d?.pals?.[v.p] ? v.p : 0 };
};

/** Intensivlik slayderi: div asosida (native input emas), klaviatura — ← → */
export function slider(val: number, label: string, on: (v: number) => void, done: () => void): HTMLElement {
  const s = h('div', { class: 'jv-sl', role: 'slider', tabindex: '0', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('i', { class: 'tr' }), h('i', { class: 'fi' }), h('i', { class: 'th' }));
  const set = (v: number) => { v = Math.max(0, Math.min(1, v)); (s.querySelector('.fi') as HTMLElement).style.width = `${v * 100}%`; (s.querySelector('.th') as HTMLElement).style.left = `${v * 100}%`; s.setAttribute('aria-valuenow', String(Math.round(v * 100))); val = v; return v; };
  set(val);
  const mv = (e: PointerEvent) => { const r = s.getBoundingClientRect(); on(set((e.clientX - r.left) / r.width)); };
  s.addEventListener('pointerdown', e => { s.setPointerCapture(e.pointerId); mv(e); s.onpointermove = mv; });
  s.addEventListener('pointerup', () => { s.onpointermove = null; done(); });
  s.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); on(set(val + (e.key === 'ArrowRight' ? 0.05 : -0.05))); done(); } });
  return s;
}

/** «Koʻrinish» bloki faol qatlam kartasida */
export function viewPanel(id: string, v: Required<LayerView>, open: boolean, cb: { toggle: () => void; set: (p: LayerView, live?: boolean) => void }): HTMLElement | null {
  const d = VIEW[id]; if (!d) return null;
  const btn = h('button', { type: 'button', class: 'jv-btn', 'aria-expanded': open, onclick: cb.toggle },
    svgSliders(), tr('Koʻrinish'));
  if (!open) return h('div', { class: 'jv' }, btn);
  const body = h('div', { class: 'jv-body' });
  if (d.stLabel) body.append(h('span', { class: 't-small' }, tr(d.stLabel)));
  if (d.styles) body.append(h('div', { class: `seg sm jv-st${d.styles.length > 3 ? ' wrap' : ''}`, role: 'group', 'aria-label': tr(d.stLabel ?? 'Uslub') }, ...d.styles.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': v.st === k, onclick: () => cb.set({ st: k }) }, tr(n)))));
  if (d.k) body.append(h('div', { class: 'jv-row' }, h('span', { class: 't-small' }, tr('Intensivlik')), slider(v.k, tr('Intensivlik'), k => cb.set({ k }, true), () => cb.set({}))));
  if (d.pals) body.append(h('div', { class: 'jv-pals', role: 'group', 'aria-label': tr('Rang shkalasi') }, ...d.pals.map(([n, cs], i) => h('button', { type: 'button', class: 'jv-pal', title: tr(n), 'aria-label': tr(n), 'aria-pressed': v.p === i, onclick: () => cb.set({ p: i }) }, ...cs.map(c => h('i', { style: `background:${c}` }))))));
  return h('div', { class: 'jv open' }, btn, body);
}
function svgSliders(): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'; return s;
}

/** Rang shkalasi boʻyicha rang: t ∈ [0, 1] */
export function rampColor(cs: string[], t: number): string {
  t = Math.max(0, Math.min(1, t)); const n = cs.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i;
  const a = cs[i], b = cs[i + 1], p = (c: string, k: number) => parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16);
  return '#' + [0, 1, 2].map(k => Math.round(p(a, k) + (p(b, k) - p(a, k)) * f).toString(16).padStart(2, '0')).join('');
}

/** Toʻrdan izochiziqlar (marching squares): n×n, qator — janubdan shimolga, markaz (0,0), qadam step → mahalliy metr segmentlari */
export function isolines(v: Float32Array, n: number, step: number, levels: number[], clipR?: number): { lv: number; segs: [[number, number], [number, number]][] }[] {
  const R = (n - 1) / 2 * step, P = (i: number, j: number): [number, number] => [-R + i * step, -R + j * step];
  return levels.map(lv => {
    const segs: [[number, number], [number, number]][] = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = [v[j * n + i], v[j * n + i + 1], v[(j + 1) * n + i + 1], v[(j + 1) * n + i]]; if (a.some(Number.isNaN)) continue;
      const c = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], e: [number, number][] = [];
      for (let m = 0; m < 4; m++) { const k = (m + 1) % 4; if ((a[m] - lv) * (a[k] - lv) < 0) { const t = (lv - a[m]) / (a[k] - a[m]); e.push([c[m][0] + (c[k][0] - c[m][0]) * t, c[m][1] + (c[k][1] - c[m][1]) * t]); } }
      if (e.length >= 2 && (!clipR || Math.hypot(e[0][0], e[0][1]) <= clipR)) segs.push([e[0], e[1]]);
      if (e.length === 4 && (!clipR || Math.hypot(e[2][0], e[2][1]) <= clipR)) segs.push([e[2], e[3]]);
    }
    return { lv, segs };
  });
}
/** Segmentlarni uzun chiziqlarga ulash (yorliq qoʻyish uchun) */
export function joinSegs(segs: [[number, number], [number, number]][]): [number, number][][] {
  const key = (p: [number, number]) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`, ends = new Map<string, number[]>(), used = new Uint8Array(segs.length), out: [number, number][][] = [];
  segs.forEach((s, i) => { for (const p of s) { const k = key(p); (ends.get(k) ?? ends.set(k, []).get(k)!).push(i); } });
  const next = (p: [number, number]) => (ends.get(key(p)) ?? []).find(i => !used[i]);
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue; used[i] = 1; const line = [segs[i][0], segs[i][1]];
    for (let dir = 0; dir < 2; dir++) { for (;;) { const end = dir ? line[0] : line[line.length - 1], j = next(end); if (j == null) break; used[j] = 1; const s = segs[j], o = key(s[0]) === key(end) ? s[1] : s[0]; if (dir) line.unshift(o); else line.push(o); } }
    out.push(line);
  }
  return out;
}

/** Piyoda personalari: oʻrtacha yurish tezligi (km/soat) — taxminiy, adabiyotdagi tipik qiymatlar; qiyalik hisobga olinmagan */
export const PERSONA: Record<string, { v: number; note: string }> = {
  yosh: { v: 5.0, note: 'kattalar, ≈ 5 km/soat' }, bola: { v: 3.6, note: 'bola, ≈ 3,6 km/soat' }, qariya: { v: 3.2, note: 'qariya, ≈ 3,2 km/soat' },
  homilador: { v: 3.8, note: 'homilador, ≈ 3,8 km/soat' }, arava: { v: 3.2, note: 'nogironlik aravachasi, ≈ 3,2 km/soat; zinapoya va baland bordyur hisobga olinmagan' }, sayyoh: { v: 4.0, note: 'sayyoh, ≈ 4 km/soat' },
};

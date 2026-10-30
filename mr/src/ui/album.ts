/**
 * Qavat albomi — toʻliq ekran (dizayn: «Kvartiralar C · Kesim navigatori»): chapda genplan va binoning qavat kesimi
 * (har qavat — kvartira turlari tasmasi), markazda katta reja (← → qavatlar), oʻngda qavat maʼlumoti va tahrir.
 * Tahrir tipik qavatda: tanlash (A, B) → birlashtirish, boʻlish, devorni surish, xonalar soni, texnik; «Devor chizish» —
 * magnitli devor (modul chegarasiga tortiladi) va ikki tomondagi masofalar. Tahrir barcha turar qavatlarga qoʻllanadi.
 */
import { h, toast, fmt, svgIcon, IC } from './dom';
import { tr } from '../i18n';
import { range } from './controls';
const CH_L = '<path d="M15 6l-6 6 6 6"/>', CH_R = '<path d="M9 6l6 6-6 6"/>';
import { MOD_W, type SecPlan } from '../core/apartments';
import { floorPlanSvg, floorGroups, floorTypeOf, buildingFloorsSvg, allPlansSvg, FLOOR_NAME, ROOM_LABEL, APT_FILL, type PlanOpts } from '../core/floorplan';
import { editMerge, editSplit, editSplitAt, editShift, editRooms, editKind, editRoomToApt, floorVariant, wallPreview, planChecks, type RulePlan, type EditResult, type RoomKind } from '../core/sectionplan';
import type { XY } from '../core/geo';
import { floorInsol, EDGE_H, type AptInsol, type InsolStatus } from '../core/insolplan';
import polygonClipping, { type Polygon } from 'polygon-clipping';

/** V5: «Kvartiralar» qadamidagi derazalar hisobi — bino, qavat (1 dan), modul → uzluksiz quyosh, soat */
export interface InsolView {
  date: string; at: (bid: string, floor: number, m: number) => number | null;
  /** tanlangan mahalliy soatda quyosh (balandlik > 3° boʻlsa) */ sun?: (hour: number) => { alt: number; az: number } | null;
  /** shu soatda derazalarga quyosh tushadimi (atrof soyasi bilan) */ lit?: (bid: string, floor: number, mods: number[], st: { alt: number; az: number }) => boolean[];
}
/** deraza ochilmasi (real dogʻ uchun): eni 1,5 m, podokonnik 0,9 m, tepasi 2,3 m */
const WIN = { w: 1.5, sill: 0.9, head: 2.3 };
type AlbView = 'reja' | 'olcham' | 'insol';
const ST_COL: Record<InsolStatus, string> = { ok: '#3fa66b', edge: '#e0a526', bad: '#d9534f', na: '#8e8a82' };
const ST_FILL: Record<InsolStatus, string> = { ok: '#d3eadb', edge: '#f5e6c4', bad: '#f4d3d0', na: '#e9e6e0' };
const hCol = (x: number) => (x >= 2 - 1e-6 ? ST_COL.ok : x >= EDGE_H - 1e-6 ? ST_COL.edge : ST_COL.bad);
const h1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');

export interface AlbumOpts {
  plans: SecPlan[]; bid: string; floor: number | null; fh: number; size: 'S' | 'M' | 'L'; docName: string;
  name: (pl: SecPlan, i: number) => string; opt: (pl: SecPlan) => Partial<PlanOpts>;
  onSave: (bid: string, plan: RulePlan | null) => void; onClose: (bid: string, floor: number) => void;
  download: (name: string, text: string, mime: string) => void;
  /** ochilganda koʻrinish (V5: «Insolyatsiya» — derazalar hisobidan) */ view?: AlbView;
  insol?: InsolView | null; runInsol?: () => Promise<InsolView | null>;
}
const ROOM_COL: Record<RoomKind, string> = { texnik: '#cfcbc3', ombor: '#d9cdb5', savdo: '#9fc0e3', velo: '#c5d9b0', zal: '#e2bcd6', tozalash: '#cfcbc3' };
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

export function openAlbum(o: AlbumOpts): void {
  document.getElementById('album')?.remove();
  let bid = o.bid, sel: number[] = [], selRoom = -1, mode: 'tanlash' | 'devor' = 'tanlash', msg = '', msgBad = false, closeArmed = false;
  let view: AlbView = o.view ?? 'reja', insol: InsolView | null = o.insol ?? null, insolBusy = false, hiApt = -1, insolHour = 12;
  const work = new Map<string, RulePlan>(), hist = new Map<string, RulePlan[]>(), dirty = new Set<string>();
  const secOf = () => o.plans.find(p => p.bid === bid) ?? o.plans[0];
  const typFloor = (pl: SecPlan) => (floorGroups(pl).find(g => g.type === 'typical') ?? floorGroups(pl).slice(-1)[0]).from;
  let floor = Math.max(1, Math.min(secOf().f1, o.floor ?? typFloor(secOf())));
  if (view === 'insol' && !['typical', 'first'].includes(floorTypeOf(secOf(), floor))) floor = typFloor(secOf());   // insolyatsiya — turar qavatdan
  const planOf = (pl: SecPlan) => work.get(pl.bid) ?? pl.layout.plan!;
  const genOf = (pl: SecPlan) => pl.genPlan ?? pl.layout.plan!;

  const ov = h('div', { class: 'alb', id: 'album', role: 'dialog', 'aria-label': 'Qavat albomi' });
  const side = h('aside', { class: 'alb-side' }), bar = h('div', { class: 'alb-bar' }), host = h('div', { class: 'alb-plan', id: 'albPlan' }), info = h('section', { class: 'alb-info' });
  const prevB = h('button', { class: 'btn icon-btn', 'aria-label': tr('Pastki qavat'), id: 'albPrev', onclick: () => go(-1) }, svgIcon(CH_L)), nextB = h('button', { class: 'btn icon-btn', 'aria-label': tr('Yuqori qavat'), id: 'albNext', onclick: () => go(1) }, svgIcon(CH_R));
  ov.append(side, h('main', { class: 'alb-main' }, bar, h('div', { class: 'alb-book' }, prevB, h('div', { class: 'alb-sheet' }, host, info), nextB)));
  document.body.append(ov);

  function go(d: number): void { const pl = secOf(); floor = Math.max(1, Math.min(pl.f1, floor + d)); sel = []; selRoom = -1; msg = ''; render(); }
  function apply(r: EditResult): void {
    if (!r.ok) { msg = `Bajarilmadi: ${r.why}`; msgBad = true; render(); return; }
    const pl = secOf(); (hist.get(bid) ?? hist.set(bid, []).get(bid)!).push(planOf(pl)); work.set(bid, r.plan); dirty.add(bid); sel = []; selRoom = -1; msg = ''; render();
  }
  const close = () => { if (dirty.size && !closeArmed) { closeArmed = true; msg = 'Saqlanmagan tahrir bor: «Saqlash» yoki yana × — bekor qilish'; msgBad = true; render(); return; } ov.remove(); document.removeEventListener('keydown', onKey); o.onClose(bid, floor); };
  const onKey = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT') return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') go(-1); else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') go(1); };
  document.addEventListener('keydown', onKey);

  /** qavat tasmasi: kvartiralar (turi rangida, maydonga mutanosib) va xonalar */
  const variant = (pl: SecPlan, f: number) => floorVariant(planOf(pl), floorTypeOf(pl, f), pl.layout.mods, o.size);
  const segs = (p: RulePlan) => [...p.apts.map(a => ({ m: a.area, c: APT_FILL[Math.min(4, a.rooms)] })), ...p.rooms.filter(q => q.kind === 'savdo' || q.kind === 'zal' || q.kind === 'velo').map(q => ({ m: Math.abs(q.ring.reduce((s, a, i) => { const b = q.ring[(i + 1) % q.ring.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2), c: ROOM_COL[q.kind] }))];

  const genplan = () => genplanSvg(o.plans, bid, o.name, b2 => { bid = b2; floor = Math.max(1, Math.min(secOf().f1, floor)); sel = []; selRoom = -1; msg = ''; render(); });

  function render(): void {
    const pl = secOf(), si = o.plans.indexOf(pl), ft = floorTypeOf(pl, floor), editable = ft === 'typical' && view === 'reja', P = planOf(pl), V = variant(pl, floor);
    const FI = view === 'insol' && insol ? floorInsol(V, pl.layout.mods, m => insol!.at(pl.bid, floor, m)) : null;
    // chap: genplan + kesim
    const stack = h('div', { class: 'alb-stack', id: 'albStack' });
    for (let f = pl.f1; f >= 1; f--) {
      const sg = segs(variant(pl, f)), tot = sg.reduce((t, x) => t + x.m, 0) || 1;
      stack.append(h('button', { class: 'alb-floor', 'aria-pressed': f === floor, 'aria-label': `${f}-qavat`, 'data-floor': f, onclick: () => { floor = f; sel = []; selRoom = -1; msg = ''; render(); } },
        h('span', { class: 'num' }, f), h('span', { class: 'alb-fbar' }, ...sg.map(x => h('i', { style: `flex:${(x.m / tot).toFixed(3)};background:${x.c}` }))),
        h('span', { class: 'alb-fmark', style: `background:${dirty.has(pl.bid) && floorTypeOf(pl, f) === 'typical' ? '#f0b323' : pl.edited === 'ok' && floorTypeOf(pl, f) === 'typical' ? '#0a84ff' : 'transparent'}` })));
    }
    side.replaceChildren(
      h('div', { class: 'alb-head' }, h('button', { class: 'btn icon-btn btn-sm', 'aria-label': tr('Sahnaga qaytish'), onclick: close }, svgIcon(CH_L)), h('div', {}, h('span', { class: 't-small' }, tr('9-qadam')), h('br'), h('b', {}, tr('Kvartiralar')))),
      h('div', { class: 'group flat alb-gpbox' }, genplan()),
      h('div', { class: 'glabel' }, h('span', {}, `${o.name(pl, si)} — ${tr('kesim')}`), h('span', {}, `${pl.f1} ${tr('qavat')}`)),
      stack,
      h('div', { class: 'leg alb-legend' }, ...[1, 2, 3, 4].map(k => h('div', {}, h('i', { style: `background:${APT_FILL[k]}` }), h('span', {}, `${k}x`))), h('div', {}, h('i', { style: `background:${ROOM_COL.savdo}` }), h('span', {}, tr('savdo'))), h('div', {}, h('i', { style: `background:${ROOM_COL.velo}` }), h('span', {}, tr('yashovchilar')))));
    // yuqori panel
    const groups = floorGroups(pl), tf = typFloor(pl);
    bar.replaceChildren(
      h('b', { class: 'alb-title' }, tr('Qavat albomi')), h('span', { class: 'chip' }, o.name(pl, si)), h('span', { class: 't-small' }, `${tr('Varaq')} ${floor} / ${pl.f1} · ${tr(FLOOR_NAME[ft])}`),
      h('span', { class: 'spacer' }),
      h('div', { class: 'seg sm', role: 'group', id: 'albView', 'aria-label': tr('Koʻrinish') }, ...([['reja', 'Reja'], ['olcham', 'Oʻlchamlar'], ['insol', 'Insolyatsiya']] as const).map(([k, t]) => h('button', { 'aria-pressed': view === k, 'data-view': k, onclick: () => { view = k; sel = []; selRoom = -1; hiApt = -1; msg = ''; render(); } }, tr(t)))),
      editable ? h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Asbob') }, ...([['tanlash', 'Tanlash'], ['devor', 'Devor chizish']] as const).map(([k, t]) => h('button', { 'aria-pressed': mode === k, id: `albMode-${k}`, onclick: () => { mode = k; sel = []; selRoom = -1; msg = ''; render(); } }, tr(t)))) : '',
      h('button', { class: 'btn btn-sm', id: 'albSvg', onclick: () => o.download(`${o.docName}_bino${si + 1}_q${floor}.svg`, res.svg, 'image/svg+xml') }, tr('Reja — SVG')),
      h('button', { class: 'btn btn-sm', id: 'albFloors', onclick: () => o.download(`${o.docName}_bino${si + 1}_qavatlar.svg`, buildingFloorsSvg(pl, 200, o.name(pl, si), { ...o.opt(pl), plan: planOf(pl) }), 'image/svg+xml') }, tr('Barcha qavatlar')),
      h('button', { class: 'btn btn-sm', id: 'albAll', onclick: () => { const s = allPlansSvg(o.plans, floor, 200, o.name, pl2 => ({ ...o.opt(pl2), plan: planOf(pl2) })); if (s) o.download(`${o.docName}_rejalar_q${floor}.svg`, s, 'image/svg+xml'); } }, tr('Hamma binolar')),
      h('button', { class: 'btn icon-btn btn-sm btn-ghost', id: 'albClose', 'aria-label': tr('Yopish'), onclick: close }, svgIcon(IC.x)));
    prevB.toggleAttribute('disabled', floor <= 1); nextB.toggleAttribute('disabled', floor >= pl.f1);
    // reja
    const tint = FI ? { fill: FI.apts.map(a => ST_FILL[a.status]), stroke: FI.apts.map((a, i) => (i === hiApt ? '#0a84ff' : ST_COL[a.status])), sub: FI.apts.map(a => (a.status === 'na' ? '—' : `${a.ok}/${a.need} ${a.status === 'ok' ? '✓' : '✗'}`)) } : undefined;
    const res = floorPlanSvg(pl, { scale: 100, dims: view === 'olcham', title: `${o.name(pl, si)} · ${floor}-qavat`, floor, ...o.opt(pl), plan: P, sel: editable ? sel : [], selRoom: editable ? selRoom : -1, ...(FI ? { tint, num: true } : {}) });
    host.innerHTML = res.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%" height="100%"');
    host.dataset.mode = editable ? mode : 'view';
    const svg = host.querySelector('svg') as SVGSVGElement;
    if (FI) insolOverlay(svg, res.toSvg, pl, V, FI.apts);
    if (FI) svg.addEventListener('click', e => { const t = (e.target as Element).closest('[data-apt]'); hiApt = t ? Number(t.getAttribute('data-apt')) : -1; render(); });
    const toPlan = (e: MouseEvent): XY => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(svg.getScreenCTM()!.inverse()); return res.toPlan(q.x, q.y); };
    if (editable && mode === 'tanlash') svg.addEventListener('click', e => {
      const t = (e.target as Element).closest('[data-apt],[data-room]'); if (!t) { sel = []; selRoom = -1; msg = ''; render(); return; }
      const a = t.getAttribute('data-apt');
      if (a != null) { const i = Number(a), k = sel.indexOf(i); selRoom = -1; if (k >= 0) sel.splice(k, 1); else { sel.push(i); if (sel.length > 2) sel.shift(); } }
      else { selRoom = Number(t.getAttribute('data-room')); sel = []; }
      msg = ''; render();
    });
    if (editable && mode === 'devor') {
      const ns = 'http://www.w3.org/2000/svg', g = document.createElementNS(ns, 'g'); g.setAttribute('pointer-events', 'none'); svg.append(g);
      let last: { i: number; U: XY; t: number } | null = null;
      svg.addEventListener('mousemove', e => {
        const p = toPlan(e), i = P.apts.findIndex(a => pin(p, a.ring)); g.replaceChildren(); last = null; if (i < 0) return;
        const w = wallPreview(P, i, p, pl.layout.mods); if (!w) return; last = { i, U: w.U, t: w.t };
        const [a, b] = w.line.map(res.toSvg), ln = document.createElementNS(ns, 'path');
        ln.setAttribute('d', `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`); ln.setAttribute('stroke', w.snapped ? '#0a84ff' : '#ff9f0a'); ln.setAttribute('stroke-width', '0.8'); ln.setAttribute('stroke-dasharray', '1.2 0.8'); g.append(ln);
        const mid: XY = [(w.line[0][0] + w.line[1][0]) / 2, (w.line[0][1] + w.line[1][1]) / 2];
        for (const [s, val] of [[-1, w.w1], [1, w.w2]] as const) {
          const q = res.toSvg([mid[0] + w.U[0] * s * Math.min(val / 2, 2.2), mid[1] + w.U[1] * s * Math.min(val / 2, 2.2)]), bg = document.createElementNS(ns, 'rect'), tx = document.createElementNS(ns, 'text');
          bg.setAttribute('x', String(q[0] - 5)); bg.setAttribute('y', String(q[1] - 2.6)); bg.setAttribute('width', '10'); bg.setAttribute('height', '3.6'); bg.setAttribute('rx', '1'); bg.setAttribute('fill', '#141414');
          tx.setAttribute('x', String(q[0])); tx.setAttribute('y', String(q[1])); tx.setAttribute('font-size', '2.4'); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('fill', '#fff'); tx.textContent = `${fmt(val, 2)} m`;
          g.append(bg, tx);
        }
      });
      svg.addEventListener('mouseleave', () => g.replaceChildren());
      svg.addEventListener('click', () => { if (last) apply(editSplitAt(P, last.i, last.U, last.t, pl.layout.mods, o.size)); });
    }
    // oʻng: maʼlumot va tahrir
    const k = [1, 2, 3, 4].map(n => V.apts.filter(a => Math.min(4, a.rooms) === n).length);
    const allApts = groups.reduce((t, g) => t + (g.to - g.from + 1) * variant(pl, g.from).apts.length, 0);
    const small = groups.reduce((t, g) => t + (g.to - g.from + 1) * variant(pl, g.from).apts.filter(a => a.rooms <= 2).length, 0);
    const ch = planChecks(P, (pl.z0 + pl.f1 - 1) * o.fh, pl.layout.mods), bad = ch.filter(c => c.ok === false);
    const one = sel.length === 1, two = sel.length === 2, sa = one ? P.apts[sel[0]] : null;
    const btn = (id: string, t: string, on: () => void, dis = false, title = '') => h('button', { class: 'btn btn-sm', id, disabled: dis, title: tr(title), onclick: on }, tr(t));
    if (view === 'insol') { info.replaceChildren(...insolInfo(ft, FI)); msgBad = false; return; }
    info.replaceChildren(
      h('div', { class: 'glabel' }, h('span', {}, tr('Shu qavatda'))),
      h('div', { class: 'row2 alb-counts' }, ...[1, 2, 3, 4].map(n => h('div', { class: 'group flat', style: 'padding:9px 12px' }, h('div', { class: 'kpi' }, h('b', {}, h('i', { style: `background:${APT_FILL[n]}` }), String(k[n - 1])), h('span', {}, `${n} ${tr('xonali')}`))))),
      V.rooms.length ? h('div', { class: 'opts' }, h('b', {}, `${tr('Xonalar')}:`), ' ' + V.rooms.map(q => tr(ROOM_LABEL[q.kind])).filter((x, i, a) => a.indexOf(x) === i).join(' · ')) : '',
      h('div', { class: 'glabel' }, h('span', {}, tr('Tahrir'))),
      !editable ? h('div', { class: 'note' }, `${floor}-qavat rejasi tipik qavatdan kelib chiqadi (${FLOOR_NAME[ft]}). Tahrir uchun ${tf}-qavatni oching.`, h('button', { class: 'btn btn-sm', style: 'margin-top:6px;display:flex', onclick: () => { floor = tf; render(); } }, `${tf}-${tr('qavatga')}`))
        : mode === 'devor' ? h('div', { class: 'note' }, 'Kvartira ustida yuring: devor koʻk — modul chegarasiga tortildi, toʻq sariq — erkin (0,1 m qadam). Bosing — kvartira ikkiga boʻlinadi. Ikki tomondagi masofa koʻrsatiladi.')
        : h('div', { class: 'alb-edit' },
          sa ? h('div', { class: 'alb-selc' }, h('i', { style: `background:${APT_FILL[Math.min(4, sa.rooms)]}` }), h('b', {}, `${sa.rooms} xonali`), h('span', { class: 'num' }, `${fmt(sa.area * 0.85, 1)} m² · ${sa.mods.length} deraza`)) : two ? h('div', { class: 'alb-selc' }, h('b', {}, tr('A va B tanlandi'))) : h('div', { class: 'note' }, tr('Kvartirani bosing; ikkinchisini ham — A va B.')),
          h('div', { class: 'row2' }, btn('albMerge', 'Birlashtirish', () => apply(editMerge(P, sel[0], sel[1], pl.layout.mods, o.size)), !two), btn('albSplit', 'Ikkiga boʻlish', () => apply(editSplit(P, sel[0], pl.layout.mods, o.size)), !one)),
          h('div', { class: 'row2' }, btn('albToB', 'Devor → B', () => apply(editShift(P, sel[0], sel[1], MOD_W, pl.layout.mods, o.size)), !two, 'A bir modulga kattalashadi'), btn('albToA', 'Devor → A', () => apply(editShift(P, sel[1], sel[0], MOD_W, pl.layout.mods, o.size)), !two, 'B bir modulga kattalashadi')),
          h('div', { class: 'row4' }, ...[1, 2, 3, 4].map(n => btn(`albR${n}`, `${n}x`, () => apply(editRooms(P, sel[0], n, pl.layout.mods)), !one))), h('div', { class: 'row2' }, btn('albTex', 'Texnik', () => apply(editKind(P, sel[0], 'texnik', pl.layout.mods, o.size)), !one), btn('albApt', 'Kvartiraga', () => apply(editRoomToApt(P, selRoom, pl.layout.mods, o.size)), selRoom < 0))),
      msg ? h('div', { class: msgBad ? 'note warn' : 'note', id: 'albMsg' }, msg) : h('div', { class: bad.length ? 'note bad' : 'note ok', id: 'albMsg' }, bad.length ? `${tr('Qoida buzilgan')}: ${bad.map(c => c.title.toLowerCase()).join('; ')}` : tr('Qoidalar bajarilgan: har kvartiraga koridordan eshik, deraza, yorugʻlik.')),
      h('div', { class: 'glabel' }, h('span', {}, tr('Bino jami'))),
      h('div', { class: 'group' }, h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Kvartiralar')), h('span', { class: 'v' }, fmt(allApts))), h('div', { class: 'li' }, h('span', { class: 'k' }, tr('1–2 xonali ulushi')), h('span', { class: 'v' }, `${allApts ? Math.round(small / allApts * 100) : 0} %`)), h('div', { class: 'li' }, h('span', { class: 'k' }, tr('Seksiyalar')), h('span', { class: 'v' }, String(P.sections.length)))),
      h('span', { class: 'spacer' }),
      h('div', { class: 'row' },
        btn('albUndo', 'Orqaga', () => { const hs = hist.get(bid); const p = hs?.pop(); if (p) { work.set(bid, p); dirty.add(bid); sel = []; render(); } }, !(hist.get(bid)?.length)),
        btn('albReset', 'Asl reja', () => { (hist.get(bid) ?? hist.set(bid, []).get(bid)!).push(planOf(pl)); work.set(bid, genOf(pl)); dirty.add(bid); sel = []; render(); }),
        h('button', { class: 'btn btn-primary btn-sm grow', id: 'albSave', disabled: !dirty.size, onclick: () => { for (const b of dirty) { const s2 = o.plans.find(p => p.bid === b)!; const w = work.get(b)!; o.onSave(b, w === genOf(s2) ? null : w); } dirty.clear(); closeArmed = false; toast('Reja saqlandi — barcha turar qavatlarga qoʻllandi'); render(); } }, dirty.size ? `Saqlash (${dirty.size})` : 'Saqlangan')));
    msgBad = false;
  }
  /** V5: derazalar ustida soat belgisi va ramziy «quyosh dogʻi» (xona ichiga, uzunligi soatga mutanosib — sxema, nur yoʻnalishi emas) */
  function insolOverlay(svg: SVGSVGElement, toSvg: (p: XY) => [number, number], pl: SecPlan, V: RulePlan, apts: AptInsol[]): void {
    const ns = 'http://www.w3.org/2000/svg', gP = document.createElementNS(ns, 'g'), gB = document.createElementNS(ns, 'g');
    gP.setAttribute('pointer-events', 'none'); gB.setAttribute('pointer-events', 'none'); gP.setAttribute('data-sunpatch', '');
    const living = new Set(apts.flatMap(a => a.living));
    const el = (tag: string, at: Record<string, string | number>) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, String(v)); return e; };
    // real quyosh dogʻi (egasi 30.10): tanlangan soatda deraza ochilmasi quyosh yoʻnalishi boʻylab polga proyeksiya qilinadi;
    // devordan sill/tg α dan head/tg α gacha, yon tomonga azimut boʻyicha; kvartira konturiga kesiladi; atrof soyasi — lit()
    const st = insol!.sun?.(insolHour) ?? null, modsAll = pl.layout.mods.map((_, i) => i).filter(i => !pl.layout.mods[i].blind);
    const litArr = st && insol!.lit ? insol!.lit(pl.bid, floor, modsAll, st) : modsAll.map(() => false), litSet = new Set(modsAll.filter((_, i) => litArr[i]));
    const sv: XY | null = st ? [Math.sin(st.az * Math.PI / 180), Math.cos(st.az * Math.PI / 180)] : null, tanA = st ? Math.tan(st.alt * Math.PI / 180) : 1;
    const inApt = (p: XY) => V.apts.find(a => pin(p, a.ring));
    for (const m of modsAll) {
      const md = pl.layout.mods[m], hh = insol!.at(pl.bid, floor, m);
      const n: XY = [Math.sin(md.az * Math.PI / 180), Math.cos(md.az * Math.PI / 180)], t: XY = [n[1], -n[0]];
      const mid: XY = [(md.a[0] + md.b[0]) / 2, (md.a[1] + md.b[1]) / 2];
      const host = inApt([mid[0] - n[0] * 0.6, mid[1] - n[1] * 0.6]);
      if (sv && host && litSet.has(m) && sv[0] * n[0] + sv[1] * n[1] > 0.03 && tanA > 0.03) {
        const d0 = Math.min(40, WIN.sill / tanA), d1 = Math.min(40, WIN.head / tanA), w = WIN.w / 2;
        const A0: XY = [mid[0] - t[0] * w, mid[1] - t[1] * w], B0: XY = [mid[0] + t[0] * w, mid[1] + t[1] * w];
        const q: XY[] = [[A0[0] - sv[0] * d0, A0[1] - sv[1] * d0], [B0[0] - sv[0] * d0, B0[1] - sv[1] * d0], [B0[0] - sv[0] * d1, B0[1] - sv[1] * d1], [A0[0] - sv[0] * d1, A0[1] - sv[1] * d1]];
        try {
          const cut = polygonClipping.intersection([q] as Polygon, [host.ring] as Polygon);
          for (const poly of cut) for (const ring of poly) gP.append(el('path', { d: ring.map((p, i) => { const s2 = toSvg(p as XY); return `${i ? 'L' : 'M'}${s2[0]} ${s2[1]}`; }).join('') + 'Z', fill: '#f6c445', 'fill-opacity': 0.5, stroke: '#e0a526', 'stroke-width': 0.15 }));
        } catch { /* kesishmadi */ }
      }
      const c = toSvg([mid[0] + n[0] * 1.1, mid[1] + n[1] * 1.1]), txt = hh == null ? '—' : h1(hh);
      const g = el('g', { 'data-win': m });
      g.append(el('rect', { x: c[0] - 3.4, y: c[1] - 1.8, width: 6.8, height: 3.6, rx: 1.8, fill: hh == null ? '#8e8a82' : hCol(hh), 'fill-opacity': living.has(m) ? 1 : 0.6 }));
      const tx = el('text', { x: c[0], y: c[1] + 0.85, 'font-size': 2.3, 'font-weight': 600, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'IBM Plex Mono, monospace' }); tx.textContent = txt; g.append(tx);
      gB.append(g);
    }
    svg.append(gP, gB);
    // deraza belgilari fasaddan tashqarida — chizma maydoni kengaytiriladi (kesilmasin)
    const vb = svg.getAttribute('viewBox')?.split(/[ ,]+/).map(Number);
    if (vb && vb.length === 4 && vb.every(Number.isFinite)) svg.setAttribute('viewBox', `${vb[0] - 10} ${vb[1] - 10} ${vb[2] + 20} ${vb[3] + 20}`);
  }
  /** V5: oʻng panel — qavat natijasi, talab matni, «Mos emas» roʻyxati va yechim izohi */
  function insolInfo(ft: string, FI: ReturnType<typeof floorInsol> | null): (HTMLElement | string)[] {
    const dateT = insol?.date === '09-22' ? tr('22 sentabr') : tr('22 mart');
    const req = h('div', { class: 'note', id: 'albInsolReq' }, tr('Talab: 22.03–22.09, xonada kamida 2 soat uzluksiz; 1–3 xonalida ≥ 1 xona, 4–5 xonalida ≥ 2 xona.'), h('br'), h('span', { class: 't-small mono' }, 'SanQvaN 0102-25 · 94–95-bandlar'));
    const head = h('div', { class: 'glabel' }, h('span', {}, `${tr('Insolyatsiya')} · ${floor}-${tr('qavat')}`), h('span', {}, dateT));
    if (!insol) return [head, req, h('div', { class: 'note warn', id: 'albInsolNone' }, tr('Derazalar insolyatsiyasi hali hisoblanmagan yoki loyiha oʻzgargan — hisoblang (atrofdagi binolar bilan).')),
      h('button', { class: 'btn btn-primary btn-sm', id: 'albInsolGo', disabled: insolBusy || !o.runInsol, onclick: async () => { insolBusy = true; render(); try { insol = (await o.runInsol?.()) ?? null; } finally { insolBusy = false; render(); } } }, tr(insolBusy ? 'Hisoblanmoqda…' : 'Derazalar insolyatsiyasi'))];
    if (!FI || !FI.total) return [head, req, h('div', { class: 'note' }, ft === 'typical' || ft === 'first' ? tr('Bu qavatda hisoblangan deraza yoʻq.') : tr('Noturar qavat — kvartiralar yoʻq.'))];
    const badA = FI.apts.filter(a => a.status === 'bad' || a.status === 'edge').sort((a, b) => a.best - b.best);
    const north = badA.filter(a => a.north).length;
    return [head,
      h('div', { class: 'alb-insol-kpi', id: 'albInsolKpi' }, h('b', { class: 'num' }, `${FI.ok} / ${FI.total}`), h('span', {}, tr('kvartira talabga mos'))),
      req,
      badA.length ? h('div', { class: 'glabel' }, h('span', {}, tr('Mos emas')), h('span', {}, String(badA.length))) : h('div', { class: 'note ok' }, tr('Bu qavatdagi barcha kvartiralar talabga mos.')),
      badA.length ? h('div', { class: 'group', id: 'albInsolBad' }, ...badA.map(a => h('button', { class: 'li', 'aria-pressed': hiApt === a.i, 'data-apt-row': a.i, onclick: () => { hiApt = hiApt === a.i ? -1 : a.i; render(); } },
        h('span', { class: 'k' }, h('i', { class: 'dot', style: `background:${ST_COL[a.status]}` }), h('b', {}, `№ ${a.i + 1} · ${a.rooms}x`), h('span', { class: 'sub' }, `${tr('eng koʻpi')} ${h1(a.best)} ${tr('soat')}`)), h('span', { class: 'v num' }, `${a.ok}/${a.need}`)))) : '',
      north ? h('div', { class: 'note warn', id: 'albInsolHint' }, tr('Shimoliy qatordagi kvartiralarning derazasi faqat shimolga qaraydi. Yechim: shimolga bir tomonlama kvartira qoʻymaslik — seksiyani ikki tomonga chiquvchi kvartiralar bilan rejalash yoki binoni burish.')) : '',
      h('span', { class: 'spacer' }),
      hourRow(),
      h('div', { class: 'leg' }, ...([['ok', 'mos'], ['edge', 'chegarada (1,5–2 soat)'], ['bad', 'mos emas']] as const).map(([k, t]) => h('div', {}, h('i', { style: `background:${ST_COL[k]}` }), h('span', {}, tr(t)))),
        h('div', {}, h('i', { style: 'background:#f6c445;opacity:.7' }), h('span', {}, tr('quyosh dogʻi (tanlangan soatda)')))),
      h('span', { class: 't-small' }, tr('Deraza belgisidagi raqam — kun boʻyi uzluksiz quyosh, soat (yashash xonalari — toʻliq rangda). Dogʻ — tanlangan soatda deraza (1,5 × 1,4 m, podokonnik 0,9 m) orqali polga tushgan quyosh, atrof binolari soyasi bilan. Sana va atrof — «Kvartiralar» qadamidagi hisobdan.'))];
  }
  /** V5: soat slayderi — real dogʻ uchun (7:00–18:00, 30 daqiqa qadam) */
  function hourRow(): HTMLElement {
    const st = insol?.sun?.(insolHour) ?? null, lbl = h('b', { class: 'num', id: 'albHourLbl', style: 'min-width:3.4em;text-align:right' }, `${Math.floor(insolHour)}:${insolHour % 1 ? '30' : '00'}`);
    const inp = range({ min: 7, max: 18, step: 0.5, value: insolHour, id: 'albHour', 'aria-label': tr('Soat'),
      oninput: v => { insolHour = v; lbl.textContent = `${Math.floor(insolHour)}:${insolHour % 1 ? '30' : '00'}`; },
      onchange: () => render() });
    return h('div', { class: 'col', style: 'gap:4px' }, h('div', { class: 'row', style: 'align-items:center;gap:8px' }, h('span', { class: 't-small', style: 'width:54px' }, tr('Soat')), h('div', { style: 'flex:1;min-width:0' }, inp), lbl),
      h('span', { class: 't-small mono', id: 'albSunPos' }, st ? `${tr('quyosh')}: ${tr('balandlik')} ${Math.round(st.alt)}°, ${tr('azimut')} ${Math.round(st.az)}°` : tr('quyosh ufq ostida')));
  }
  render();
}

/** Turar joy binolari genplani (kichik): bosilganda bino tanlanadi */
export function genplanSvg(plans: SecPlan[], bid: string, name: (pl: SecPlan, i: number) => string, pick: (bid: string) => void): SVGSVGElement {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pl of plans) for (const p of pl.ring) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const W = 272, H = 150, k = Math.min((W - 16) / (x1 - x0 || 1), (H - 16) / (y1 - y0 || 1)), ox = (W - (x1 - x0) * k) / 2, oy = (H - (y1 - y0) * k) / 2;
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Genplan: binoni tanlang'); svg.classList.add('alb-gp');
  plans.forEach((pl, i) => {
    const g = document.createElementNS(ns, 'path'), on = pl.bid === bid;
    g.setAttribute('d', pl.ring.map((p, j) => `${j ? 'L' : 'M'}${(ox + (p[0] - x0) * k).toFixed(1)} ${(oy + (y1 - p[1]) * k).toFixed(1)}`).join('') + 'Z');
    g.setAttribute('fill', on ? '#0a84ff' : '#fff'); g.setAttribute('stroke', on ? '#0a84ff' : '#8e8a82'); g.setAttribute('stroke-width', '1');
    g.setAttribute('data-bld', pl.bid); g.style.cursor = 'pointer';
    const t = document.createElementNS(ns, 'title'); t.textContent = name(pl, i); g.append(t);
    g.addEventListener('click', () => pick(pl.bid));
    svg.append(g);
  });
  return svg;
}

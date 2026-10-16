/**
 * Qavat albomi — toʻliq ekran (dizayn: «Kvartiralar C · Kesim navigatori»): chapda genplan va binoning qavat kesimi
 * (har qavat — kvartira turlari tasmasi), markazda katta reja (← → qavatlar), oʻngda qavat maʼlumoti va tahrir.
 * Tahrir tipik qavatda: tanlash (A, B) → birlashtirish, boʻlish, devorni surish, xonalar soni, texnik; «Devor chizish» —
 * magnitli devor (modul chegarasiga tortiladi) va ikki tomondagi masofalar. Tahrir barcha turar qavatlarga qoʻllanadi.
 */
import { h, toast, fmt } from './dom';
import { MOD_W, type SecPlan } from '../core/apartments';
import { floorPlanSvg, floorGroups, floorTypeOf, buildingFloorsSvg, allPlansSvg, FLOOR_NAME, ROOM_LABEL, APT_FILL, type PlanOpts } from '../core/floorplan';
import { editMerge, editSplit, editSplitAt, editShift, editRooms, editKind, editRoomToApt, floorVariant, wallPreview, planChecks, type RulePlan, type EditResult, type RoomKind } from '../core/sectionplan';
import type { XY } from '../core/geo';

export interface AlbumOpts {
  plans: SecPlan[]; bid: string; floor: number | null; fh: number; size: 'S' | 'M' | 'L'; docName: string;
  name: (pl: SecPlan, i: number) => string; opt: (pl: SecPlan) => Partial<PlanOpts>;
  onSave: (bid: string, plan: RulePlan | null) => void; onClose: (bid: string, floor: number) => void;
  download: (name: string, text: string, mime: string) => void;
}
const ROOM_COL: Record<RoomKind, string> = { texnik: '#cfcbc3', ombor: '#d9cdb5', savdo: '#9fc0e3', velo: '#c5d9b0', zal: '#e2bcd6', tozalash: '#cfcbc3' };
const pin = (p: XY, r: XY[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

export function openAlbum(o: AlbumOpts): void {
  document.getElementById('album')?.remove();
  let bid = o.bid, sel: number[] = [], selRoom = -1, mode: 'tanlash' | 'devor' = 'tanlash', msg = '', msgBad = false, closeArmed = false;
  const work = new Map<string, RulePlan>(), hist = new Map<string, RulePlan[]>(), dirty = new Set<string>();
  const secOf = () => o.plans.find(p => p.bid === bid) ?? o.plans[0];
  const typFloor = (pl: SecPlan) => (floorGroups(pl).find(g => g.type === 'typical') ?? floorGroups(pl).slice(-1)[0]).from;
  let floor = Math.max(1, Math.min(secOf().f1, o.floor ?? typFloor(secOf())));
  const planOf = (pl: SecPlan) => work.get(pl.bid) ?? pl.layout.plan!;
  const genOf = (pl: SecPlan) => pl.genPlan ?? pl.layout.plan!;

  const ov = h('div', { class: 'alb', id: 'album', role: 'dialog', 'aria-label': 'Qavat albomi' });
  const side = h('aside', { class: 'alb-side' }), bar = h('div', { class: 'alb-bar' }), host = h('div', { class: 'alb-plan', id: 'albPlan' }), info = h('section', { class: 'alb-info' });
  const prevB = h('button', { class: 'btn ib', 'aria-label': 'Pastki qavat', id: 'albPrev', onclick: () => go(-1) }, '‹'), nextB = h('button', { class: 'btn ib', 'aria-label': 'Yuqori qavat', id: 'albNext', onclick: () => go(1) }, '›');
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
    const pl = secOf(), si = o.plans.indexOf(pl), ft = floorTypeOf(pl, floor), editable = ft === 'typical', P = planOf(pl), V = variant(pl, floor);
    // chap: genplan + kesim
    const stack = h('div', { class: 'alb-stack', id: 'albStack' });
    for (let f = pl.f1; f >= 1; f--) {
      const sg = segs(variant(pl, f)), tot = sg.reduce((t, x) => t + x.m, 0) || 1;
      stack.append(h('button', { class: 'alb-floor', 'aria-pressed': f === floor, 'aria-label': `${f}-qavat`, 'data-floor': f, onclick: () => { floor = f; sel = []; selRoom = -1; msg = ''; render(); } },
        h('span', { class: 'num' }, f), h('span', { class: 'alb-fbar' }, ...sg.map(x => h('i', { style: `flex:${(x.m / tot).toFixed(3)};background:${x.c}` }))),
        h('span', { class: 'alb-fmark', style: `background:${dirty.has(pl.bid) && floorTypeOf(pl, f) === 'typical' ? '#f0b323' : pl.edited === 'ok' && floorTypeOf(pl, f) === 'typical' ? '#0a84ff' : 'transparent'}` })));
    }
    side.replaceChildren(
      h('div', { class: 'alb-head' }, h('button', { class: 'btn ib', 'aria-label': 'Sahnaga qaytish', onclick: close }, '‹'), h('div', {}, h('small', { class: 'muted' }, '9-qadam'), h('b', {}, 'Kvartiralar'))),
      h('div', { class: 'alb-gpbox' }, genplan()),
      h('div', { class: 'alb-row' }, h('span', { class: 'lb' }, `${o.name(pl, si)} — kesim`), h('small', { class: 'muted' }, `${pl.f1} qavat`)),
      stack,
      h('div', { class: 'alb-legend' }, ...[1, 2, 3, 4].map(k => h('span', {}, h('i', { style: `background:${APT_FILL[k]}` }), `${k}x`)), h('span', {}, h('i', { style: `background:${ROOM_COL.savdo}` }), 'savdo'), h('span', {}, h('i', { style: `background:${ROOM_COL.velo}` }), 'yashovchilar')));
    // yuqori panel
    const groups = floorGroups(pl), tf = typFloor(pl);
    bar.replaceChildren(
      h('b', { class: 'alb-title' }, 'Qavat albomi'), h('span', { class: 'chip', style: 'background:var(--accent-soft)' }, o.name(pl, si)), h('small', { class: 'muted' }, `Varaq ${floor} / ${pl.f1} · ${FLOOR_NAME[ft]}`),
      h('span', { class: 'sp' }),
      editable ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Asbob' }, ...([['tanlash', 'Tanlash'], ['devor', 'Devor chizish']] as const).map(([k, t]) => h('button', { 'aria-pressed': mode === k, id: `albMode-${k}`, onclick: () => { mode = k; sel = []; selRoom = -1; msg = ''; render(); } }, t))) : '',
      h('button', { class: 'btn', id: 'albSvg', onclick: () => o.download(`${o.docName}_bino${si + 1}_q${floor}.svg`, res.svg, 'image/svg+xml') }, 'Reja — SVG'),
      h('button', { class: 'btn', id: 'albFloors', onclick: () => o.download(`${o.docName}_bino${si + 1}_qavatlar.svg`, buildingFloorsSvg(pl, 200, o.name(pl, si), { ...o.opt(pl), plan: planOf(pl) }), 'image/svg+xml') }, 'Barcha qavatlar'),
      h('button', { class: 'btn', id: 'albAll', onclick: () => { const s = allPlansSvg(o.plans, floor, 200, o.name, pl2 => ({ ...o.opt(pl2), plan: planOf(pl2) })); if (s) o.download(`${o.docName}_rejalar_q${floor}.svg`, s, 'image/svg+xml'); } }, 'Hamma binolar'),
      h('button', { class: 'btn ib', id: 'albClose', 'aria-label': 'Yopish', onclick: close }, '×'));
    prevB.toggleAttribute('disabled', floor <= 1); nextB.toggleAttribute('disabled', floor >= pl.f1);
    // reja
    const res = floorPlanSvg(pl, { scale: 100, dims: false, title: `${o.name(pl, si)} · ${floor}-qavat`, floor, ...o.opt(pl), plan: P, sel: editable ? sel : [], selRoom: editable ? selRoom : -1 });
    host.innerHTML = res.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%" height="100%"');
    host.dataset.mode = editable ? mode : 'view';
    const svg = host.querySelector('svg') as SVGSVGElement;
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
    const btn = (id: string, t: string, on: () => void, dis = false, title = '') => h('button', { class: 'btn', id, disabled: dis, title, onclick: on }, t);
    info.replaceChildren(
      h('span', { class: 'lb' }, 'Shu qavatda'),
      h('div', { class: 'alb-counts' }, ...[1, 2, 3, 4].map(n => h('div', {}, h('i', { style: `background:${APT_FILL[n]}` }), h('b', { class: 'num' }, k[n - 1]), h('small', {}, `${n} xonali`)))),
      V.rooms.length ? h('small', { class: 'muted' }, V.rooms.map(q => ROOM_LABEL[q.kind]).filter((x, i, a) => a.indexOf(x) === i).join(' · ')) : '',
      h('span', { class: 'lb' }, 'Tahrir'),
      !editable ? h('p', { class: 'note' }, `${floor}-qavat rejasi tipik qavatdan kelib chiqadi (${FLOOR_NAME[ft]}). Tahrir uchun ${tf}-qavatni oching.`, h('button', { class: 'btn', style: 'margin-top:6px', onclick: () => { floor = tf; render(); } }, `${tf}-qavatga`))
        : mode === 'devor' ? h('p', { class: 'note' }, 'Kvartira ustida yuring: devor koʻk — modul chegarasiga tortildi, toʻq sariq — erkin (0,1 m qadam). Bosing — kvartira ikkiga boʻlinadi. Ikki tomondagi masofa koʻrsatiladi.')
        : h('div', { class: 'alb-edit' },
          sa ? h('div', { class: 'alb-selc' }, h('i', { style: `background:${APT_FILL[Math.min(4, sa.rooms)]}` }), h('b', {}, `${sa.rooms} xonali`), h('span', { class: 'num' }, `${fmt(sa.area * 0.85, 1)} m² · ${sa.mods.length} deraza`)) : two ? h('div', { class: 'alb-selc' }, h('b', {}, 'A va B tanlandi')) : h('p', { class: 'note' }, 'Kvartirani bosing; ikkinchisini ham — A va B.'),
          h('div', { class: 'row wrap' }, btn('albMerge', 'Birlashtirish', () => apply(editMerge(P, sel[0], sel[1], pl.layout.mods, o.size)), !two), btn('albSplit', 'Ikkiga boʻlish', () => apply(editSplit(P, sel[0], pl.layout.mods, o.size)), !one)),
          h('div', { class: 'row wrap' }, btn('albToB', 'Devor → B', () => apply(editShift(P, sel[0], sel[1], MOD_W, pl.layout.mods, o.size)), !two, 'A bir modulga kattalashadi'), btn('albToA', 'Devor → A', () => apply(editShift(P, sel[1], sel[0], MOD_W, pl.layout.mods, o.size)), !two, 'B bir modulga kattalashadi')),
          h('div', { class: 'row wrap' }, ...[1, 2, 3, 4].map(n => btn(`albR${n}`, `${n}x`, () => apply(editRooms(P, sel[0], n, pl.layout.mods)), !one)), btn('albTex', 'Texnik', () => apply(editKind(P, sel[0], 'texnik', pl.layout.mods, o.size)), !one), btn('albApt', 'Kvartiraga', () => apply(editRoomToApt(P, selRoom, pl.layout.mods, o.size)), selRoom < 0))),
      msg ? h('p', { class: msgBad ? 'warn' : 'note', id: 'albMsg' }, msg) : h('p', { class: 'note', id: 'albMsg' }, bad.length ? `Qoida buzilgan: ${bad.map(c => c.title.toLowerCase()).join('; ')}` : 'Qoidalar bajarilgan: har kvartiraga koridordan eshik, deraza, yorugʻlik.'),
      h('span', { class: 'lb' }, 'Bino jami'),
      h('div', { class: 'alb-tot' }, h('div', {}, h('span', {}, 'Kvartiralar'), h('b', { class: 'num' }, fmt(allApts))), h('div', {}, h('span', {}, '1–2 xonali ulushi'), h('b', { class: 'num' }, `${allApts ? Math.round(small / allApts * 100) : 0} %`)), h('div', {}, h('span', {}, 'Seksiyalar'), h('b', { class: 'num' }, P.sections.length))),
      h('span', { class: 'sp' }),
      h('div', { class: 'row' },
        btn('albUndo', 'Orqaga', () => { const hs = hist.get(bid); const p = hs?.pop(); if (p) { work.set(bid, p); dirty.add(bid); sel = []; render(); } }, !(hist.get(bid)?.length)),
        btn('albReset', 'Asl reja', () => { (hist.get(bid) ?? hist.set(bid, []).get(bid)!).push(planOf(pl)); work.set(bid, genOf(pl)); dirty.add(bid); sel = []; render(); }),
        h('button', { class: 'btn primary grow', id: 'albSave', disabled: !dirty.size, onclick: () => { for (const b of dirty) { const s2 = o.plans.find(p => p.bid === b)!; const w = work.get(b)!; o.onSave(b, w === genOf(s2) ? null : w); } dirty.clear(); closeArmed = false; toast('Reja saqlandi — barcha turar qavatlarga qoʻllandi'); render(); } }, dirty.size ? `Saqlash (${dirty.size})` : 'Saqlangan')));
    msgBad = false;
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

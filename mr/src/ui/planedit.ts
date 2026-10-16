/**
 * Qavat rejasi muharriri: generatsiya qilingan tipik qavat rejasini qoʻlda tuzatish — kvartiralarni birlashtirish, ikkiga
 * boʻlish, oradagi devorni bir modulga surish, xonalar sonini belgilash, texnik / omborga aylantirish va qaytarish.
 * Har amaldan keyin qoidalar tekshiriladi (eshik koridordan, deraza, chuqurlik); buzadigan amal bajarilmaydi.
 * Natija binoga saqlanadi (Building.planEdit) va barcha turar qavatlarga, insolyatsiya va kvartiralar soniga qoʻllanadi.
 */
import { h, toast } from './dom';
import type { SecPlan } from '../core/apartments';
import { MOD_W } from '../core/apartments';
import { floorPlanSvg } from '../core/floorplan';
import { editMerge, editSplit, editShift, editRooms, editKind, editRoomToApt, planChecks, type RulePlan, type EditResult } from '../core/sectionplan';
import type { Bal } from '../core/facade';

export interface PlanEditOpts {
  sec: SecPlan; generated: RulePlan; plan: RulePlan; title: string; floor: number; fh: number; bal: Bal | null; size: 'S' | 'M' | 'L';
  onSave: (plan: RulePlan | null) => void;
}

export function openPlanEditor(o: PlanEditOpts): HTMLElement {
  document.getElementById('planEdit')?.remove();
  let plan = o.plan, sel: number[] = [], selRoom = -1;
  const hist: RulePlan[] = [], mods = o.sec.layout.mods;
  const svgHost = h('div', { class: 'pesvg', id: 'peSvg' }), msg = h('div', { class: 'pemsg', id: 'peMsg' }), tools = h('div', { class: 'petools' });
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const apply = (r: EditResult) => {
    if (!r.ok) { msg.textContent = `Bajarilmadi: ${r.why}`; msg.dataset.s = 'fail'; return; }
    hist.push(plan); plan = r.plan; sel = []; selRoom = -1; render();
  };
  const stat = () => {
    const ch = planChecks(plan, (o.sec.z0 + o.sec.f1 - 1) * o.fh, mods), bad = ch.filter(c => c.ok === false);
    const k = [1, 2, 3, 4].map(n => plan.apts.filter(a => Math.min(4, a.rooms) === n).length);
    return `${plan.apts.length} kvartira (${k.map((n, i) => n ? `${i + 1}x — ${n}` : '').filter(Boolean).join(', ')}) · ${bad.length ? 'buzilgan: ' + bad.map(c => c.title.toLowerCase()).join('; ') : 'qoidalar bajarilgan'}`;
  };
  const btn = (id: string, t: string, on: () => void, dis = false, title = '') => h('button', { class: 'btn', id, disabled: dis, title, onclick: on }, t);
  function render(): void {
    const res = floorPlanSvg(o.sec, { scale: 100, dims: false, title: o.title, floor: o.floor, plan, sel, selRoom, bal: o.bal });
    svgHost.innerHTML = res.svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="100%"');
    if (!msg.dataset.keep) { msg.textContent = sel.length ? `Tanlandi: ${sel.map((i, k) => `${'AB'[k]} — ${plan.apts[i].rooms}x, ${Math.round(plan.apts[i].area * 0.85)} m²`).join('; ')}` : selRoom >= 0 ? `Tanlandi: xona (${plan.rooms[selRoom].kind})` : stat(); msg.dataset.s = ''; }
    delete msg.dataset.keep;
    const one = sel.length === 1, two = sel.length === 2;
    tools.replaceChildren(
      h('div', { class: 'row' },
        btn('peMerge', 'Birlashtirish', () => apply(editMerge(plan, sel[0], sel[1], mods, o.size)), !two, 'A va B ni bitta kvartiraga'),
        btn('peSplit', 'Ikkiga boʻlish', () => apply(editSplit(plan, sel[0], mods, o.size)), !one),
        btn('peToB', 'Devor → B', () => apply(editShift(plan, sel[0], sel[1], MOD_W, mods, o.size)), !two, 'A bir modulga kattalashadi'),
        btn('peToA', 'Devor → A', () => apply(editShift(plan, sel[1], sel[0], MOD_W, mods, o.size)), !two, 'B bir modulga kattalashadi')),
      h('div', { class: 'row' },
        ...[1, 2, 3, 4].map(k => btn(`peR${k}`, `${k}x`, () => apply(editRooms(plan, sel[0], k, mods)), !one, `${k} xonali`)),
        btn('peTex', 'Texnik / ombor', () => apply(editKind(plan, sel[0], 'texnik', mods, o.size)), !one),
        btn('peApt', 'Kvartiraga', () => apply(editRoomToApt(plan, selRoom, mods, o.size)), selRoom < 0)),
      h('div', { class: 'row' },
        btn('peUndo', 'Orqaga', () => { const p = hist.pop(); if (p) { plan = p; sel = []; selRoom = -1; render(); } }, !hist.length),
        btn('peReset', 'Asl reja', () => { hist.push(plan); plan = o.generated; sel = []; selRoom = -1; render(); }),
        h('span', { class: 'grow' }),
        btn('peCancel', 'Bekor qilish', close),
        h('button', { class: 'btn primary', id: 'peSave', onclick: () => { o.onSave(plan === o.generated ? null : plan); close(); toast('Reja saqlandi — barcha turar qavatlarga qoʻllandi'); } }, 'Saqlash')));
  }
  svgHost.addEventListener('click', e => {
    const t = (e.target as Element).closest('[data-apt],[data-room]'); if (!t) { sel = []; selRoom = -1; render(); return; }
    const a = t.getAttribute('data-apt');
    if (a != null) { const i = Number(a), k = sel.indexOf(i); selRoom = -1; if (k >= 0) sel.splice(k, 1); else { sel.push(i); if (sel.length > 2) sel.shift(); } }
    else { selRoom = Number(t.getAttribute('data-room')); sel = []; }
    render();
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  const ov = h('div', { class: 'pedit', id: 'planEdit', role: 'dialog', 'aria-label': 'Reja muharriri' },
    h('div', { class: 'pebox' },
      h('div', { class: 'dhead' }, h('h3', {}, `Rejani tahrirlash · ${o.title}`), h('button', { class: 'ib sm', 'aria-label': 'Yopish', onclick: close }, '×')),
      h('p', { class: 'muted' }, 'Kvartirani bosing (ikkinchisini ham — A va B). Tahrir tipik qavatga — barcha turar qavatlarga qoʻllanadi. Koridor, zina va liftlar oʻzgarmaydi. Eshigi koridorga chiqmaydigan yoki derazasiz kvartira hosil qiladigan amal bajarilmaydi; boshqa qoidalar holati pastda.'),
      svgHost, msg, tools));
  document.body.append(ov);
  render();
  return ov;
}

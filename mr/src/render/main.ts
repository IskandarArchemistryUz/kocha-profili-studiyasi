/**
 * Render studiyasi (beta) — app/render.html. Kanvasdagi «Render studiyasi — maket» (R-1, R-2, R-3).
 *   Kirish: asos rasm (geometriya va kadr) + 4 tagacha referens (uslub · material · yorugʻlik · kontekst).
 *   Render: uslub, asosga sodiqlik, soʻrov, variantlar, sifat (Tez · Pro 2K · Pro 4K) → server navbati (fal.ai, markaziy kalit), tanga bilan.
 *   13.11 (Render 1-bosqich): kalit maydonlari va provayder tanlovi yoʻq; kadr 2048 px WebP qilib R2 ga yuklanadi, holat har 3 s soʻraladi,
 *   tarix serverdan (IndexedDB — faqat eskiz keshi).
 *   Natija: asl bilan solishtirish, PNG, Chizmadonga, asos yoki referens qilish.
 * Eski «Bino studiyasi» (bino.html: fasad, hajm, kvartiralar) va AI render oynasi — «Toʻliq asboblar»da qoladi (0-qoida).
 */
import { scoped, svcHref, ctxProject, svcLinks } from '../core/projctx';
import { isLegacySvc } from '../storage/svcprojects';
import { setSvcThumb, shrink as shrinkThumb } from '../storage/svcthumb';
import { svcWatch } from '../storage/cloud';
// 3b-1: loyiha ichida — holat oʻzgarsa, loyiha bulutda boʻlsa bulutga yuboriladi
{ const p = ctxProject(); if (p) svcWatch(p); }
import { langMenu } from '../ui/langmenu';
import { isOwner } from '../core/wm';
import '../ui/ds2.css';
import './render.css';
import { h, svgIcon, toast } from '../ui/dom';
import { kolba, sirkul } from '../ui/kolba';
import { svcBackdrop, svcGlow } from '../ui/backdrop';
import { otishEnter, otishLinks } from '../ui/otish';
import { mrBackBtn } from '../ui/mrback';
import { logoSvg } from '../ui/logo';
import { toggleTheme, isDark, onTheme } from '../ui/theme';
import { tr, tf, getLang, setLang, onLang } from '../i18n';
import { cacheGet, cachePut } from '../storage/db';
import { STY, STY_GROUPS, SUBJECTS, PLUS_ENGINES, plusFor, FIDELITY, ROLES, PERSONAS, PERSONA_GROUPS, FASLLAR, personaSrc, faslFor, loadState, saveState, shrink, type RefRole, type Subject, type Fidelity, type Fasl } from './providers';
import { ENGINES, LAB, UP_MODES, UPS_BY, upOf, renderApi, toUpload, waitJob, type Engine, type UpMode, type Job, type JobBody, type RenderCfg } from './api';
import { ApiError, check } from '../account/session';
import { apiBase } from '../account/config';
import { ensureLogin } from '../account/gate';
import { listSrc, listOut, addSrc, delSrc, addOut, delOut, takeInbox, type RenderSrc, type RenderOut, type From } from './inbox';
import { initStats, track } from '../core/stats';
initStats('ren');

const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  up: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
};
const ic = (d: string) => svgIcon(d);
const SL = svcLinks();   // 22.11: havolalar shu loyihaga (core/projctx)
export const SERVICES = [
  { id: 'mr', name: 'Master reja', href: SL.mr, color: 'var(--svc-mr)' },
  { id: 'ks', name: 'Koʻchasoz', href: svcHref('./kochasoz.html'), color: 'var(--svc-ks)' },
  { id: 'joy', name: 'Joyshunos', href: svcHref('./joyshunos.html'), color: 'var(--svc-joy)' },
  { id: 'ren', name: 'Render', href: svcHref('./render.html'), color: 'var(--svc-ren)', cur: true, beta: true },
  { id: 'dk', name: 'Dizayn-kod', href: SL.dk, color: 'var(--svc-dk)' },
  { id: 'chz', name: 'Chizmadon', href: SL.chz, color: 'var(--svc-chz)' },
];
const FROM: Record<From, [string, string]> = { mr: ['Master reja', 'var(--svc-mr)'], ks: ['Koʻchasoz', 'var(--svc-ks)'], joy: ['Joyshunos', 'var(--svc-joy)'], chz: ['Chizmadon', 'var(--svc-chz)'], bg: ['Bogʻshunos', 'var(--svc-bg, #4f8a3a)'], fayl: ['Fayldan', 'var(--faint)'], natija: ['Natijadan', 'var(--svc-ren)'] };
const MAX_REFS = 4;

/* ---------------- holat ---------------- */
const A = loadState();
interface Ref { id: string; img: string; name: string; role: RefRole }
let SRC: RenderSrc[] = [], OUT: RenderOut[] = [], REFS: Ref[] = [];
let baseId = (() => { try { return localStorage.getItem(scoped('render-base')) || ''; } catch { return ''; } })();
let view: 'asos' | 'natija' | 'cmp' = 'asos', busy = false, prog = '', err = '', needBuy = false, pickOpen = false, roleOpen = -1, allOuts = false, pplOpen = false, pplFasl: Fasl | '' = '';
/** Server sozlamasi (null — hali olinmagan yoki server javob bermadi) */
let CFG: RenderCfg | null = null;
const FULL = new Map<string, string>();   // ish → toʻliq rasm havolasi (1 soat amal qiladi)
const UP = new Map<string, { key: string; w: number; h: number }>();   // mahalliy rasm → R2 kaliti (sessiya davomida qayta yuklanmaydi)
const FOLLOW = new Set<string>();         // kuzatilayotgan ishlar
const HIDDEN_K = 'ren-hidden';
const hidden = (): string[] => { try { return JSON.parse(localStorage.getItem(HIDDEN_K) || '[]') as string[]; } catch { return []; } };
const DEF_COINS: Record<Engine, number> = { fast: 1, pro: 2, pro4k: 4, nbpro: 2, qwen: 1, kontext: 1, seedream5: 1, gptimg: 2, up2: 1, up3: 1, up4: 1, um2: 2, um3: 3, um4: 3, ui2: 2, ui3: 3, ui4: 3, enhance: 2 };
const coinsOf = (e: Engine) => CFG?.engines?.[e]?.coins ?? DEF_COINS[e];
let upBusy = '';
const UPM_K = 'ren-up-mode';
let upMode: UpMode = (() => { try { const v = localStorage.getItem(UPM_K); return v === 'm' || v === 'i' ? v : 'a'; } catch { return 'a'; } })();
/** Natija nomidagi yorliq: «×2» (Aniq — avvalgidek) yoki «×2 · Muvozanat» */
const upLabel = (e: string): string => { const u = upOf(e); if (!u) return ''; return u[0] === 'a' ? u[1] : `${u[1]} · ${tr((UP_MODES.find(x => x[0] === u[0]) ?? UP_MODES[0])[1])}`; };
const engName = (e: string) => {
  if (upOf(e)) return `${tr('Kattalashtirish')} ${upLabel(e)}`;
  if (e === 'enhance') return tr('Tiniqlashtirish'); const l = LAB.find(x => x[0] === e); return l ? l[1] : `Archemistry ${tr((ENGINES.find(x => x[0] === e) ?? ENGINES[1])[1])}`; };
let viewer: { id: string; mode: 'natija' | 'cmp' | 'yon' } | null = null;
const base = () => SRC.find(s => s.id === baseId) ?? null;
const setBase = (id: string) => { baseId = id; allOuts = false; try { localStorage.setItem(scoped('render-base'), id); } catch { /* */ } const s = base(); if (s && s.subj) A.subj = s.subj; view = 'asos';
  // 23.11: Loyihalarim kartasi — natija boʻlmasa asos rasm
  if (s?.img && !OUT.length) void shrinkThumb(s.img).then(u => setSvcThumb(ctxProject(), u)); };
const saveRefs = () => { void cachePut('render-refs', REFS).catch(() => {}); };
const save = () => saveState(A);

/* ---------------- qobiq ---------------- */
const root = document.getElementById('ren')!;
const header = h('header', { class: 'eko glass' });
otishEnter('ren'); otishLinks();   // boʻlimga oʻtish: kirishda xizmat foni va naqsh bir lahza, menyu havolalari — kengayish bilan
// 4-bosqich: xizmatning jonli fon naqshi va sarlavha ostidagi yonuvchi chiziq
svcGlow(header);
const left = h('aside', { class: 'ren-lp panel', id: 'renLeft', 'aria-label': tr('Kiritish') });
const stage = h('main', { class: 'ren-stage', id: 'renStage' });
svcBackdrop('ren', root);   // 4-bosqich: quyosh nurlari butun sahifa fonida, sahna orqali xira koʻrinadi (egasi, 14.11: «fon toʻliq orqaga, sal toʻqroq»)
const right = h('aside', { class: 'ren-rp panel', id: 'renRight', 'aria-label': tr('Render') });
const over = h('div', { class: 'ren-over', id: 'renView', hidden: true });
const fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, id: 'renFile' }) as HTMLInputElement;
let fileFor: 'base' | 'ref' = 'base';
root.append(header, h('div', { class: 'ren-body' }, left, stage, right), over, fileIn);

function renderHeader(): void {
  header.replaceChildren(
    mrBackBtn('render'),
    h('a', { class: 'brand', href: '../index.html', title: tr('Bosh sahifa'), 'aria-label': 'Archemistry Lab' }, logoSvg(20)),
    h('span', { class: 'vr' }),
    h('nav', { class: 'svc', 'aria-label': tr('Xizmatlar') }, ...SERVICES.map(s => h('a', { href: s.href, class: s.cur ? 'on' : '', 'aria-current': s.cur ? 'page' : null, 'data-svc': s.id }, h('i', { style: `background:${s.color}` }), tr(s.name), s.beta ? h('em', { class: 'beta' }, 'beta') : null))),
    h('span', { class: 'sp' }),
    langMenu(l => { void setLang(l); }),
    (() => { const b = h('button', { class: 'btn btn-sm btn-ghost icon-btn', id: 'themeBtn', type: 'button', title: tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), 'aria-label': tr(isDark() ? 'Yorugʻ rejim' : 'Tungi rejim'), onclick: () => toggleTheme() }); b.append(ic(isDark() ? ICON.sun : ICON.moon)); return b; })(),
  );
}

/* ---------------- chap panel: asos rasm va referenslar ---------------- */
function srcRow(s: RenderSrc, onPick: () => void, onDel?: () => void): HTMLElement {
  const [fn, fc] = FROM[s.from] ?? FROM.fayl;
  return h('div', { class: 'ren-src', 'data-src': s.id },
    h('button', { type: 'button', class: 'pick', 'aria-pressed': s.id === baseId, onclick: onPick },
      h('img', { src: s.img, alt: '' }),
      h('span', { class: 'tx' }, h('b', {}, s.name), h('span', {}, h('i', { style: `background:${fc}` }), tr(fn), s.w ? h('code', {}, `${s.w}×${s.h}`) : null))),
    onDel ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost icon-btn', 'aria-label': tr('Oʻchirish'), title: tr('Oʻchirish'), onclick: onDel }, ic(ICON.x)) : null);
}
/* 20.11 (PR-P): personajlar tanlovi — tizim personajlari referens sifatida («Odamlar» roli), fasl bilan */
const curFasl = (): Fasl => pplFasl || faslFor(A.sty);
async function addPersonas(ids: string[]): Promise<void> {
  const f = curFasl();
  for (const id of ids) {
    if (REFS.length >= MAX_REFS) { toast(tf('Referens ${n} tadan koʻp emas', { n: MAX_REFS })); break; }
    const rid = `p-${id}-${f}`; if (REFS.some(r => r.id === rid)) continue;
    const im = await shrink(personaSrc(id, f), 1536).catch(() => null);
    if (!im) { toast(tr('rasm ochilmadi')); continue; }
    REFS.push({ id: rid, img: im.url, name: tr((PERSONAS.find(p => p[0] === id) ?? [id, id])[1]), role: 'odamlar' });
  }
  if (REFS.length >= MAX_REFS) pplOpen = false;   // joy qolmadi — tanlov yopiladi
  saveRefs(); renderAll();
}
function pplPicker(): HTMLElement {
  const f = curFasl(), free = MAX_REFS - REFS.length;
  return h('div', { class: 'ren-ppl', id: 'ppl', role: 'dialog', 'aria-label': tr('Odamlar') },
    h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Fasl'), id: 'pplFasl' }, ...FASLLAR.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': f === k, 'data-fasl': k, onclick: () => { pplFasl = k; renderLeft(); } }, tr(n)))),
    h('div', { class: 'ren-pplg' }, ...PERSONAS.map(([id, n]) => h('button', { type: 'button', class: 'pp', 'data-persona': id, title: tr(n), disabled: free < 1, onclick: () => void addPersonas([id]) },
      h('img', { src: personaSrc(id, f), alt: '', loading: 'lazy' }), h('span', {}, tr(n))))),
    h('div', { class: 'row' }, ...PERSONA_GROUPS.map(([g, ids]) => h('button', { type: 'button', class: 'btn btn-sm', 'data-pgroup': g, disabled: free < ids.length, onclick: () => void addPersonas(ids) }, tr(g), ' · ', String(ids.length)))),
    h('p', { class: 't-small' }, tr('AI bilan yasalgan personajlar, real shaxslar emas. Bir loyihada shu odamlarni tanlasangiz, barcha renderlarda ular takrorlanadi.')));
}
function renderLeft(): void {
  const b = base();
  const pick = pickOpen ? h('div', { class: 'ren-pickl', role: 'listbox', 'aria-label': tr('Yuborilganlar') },
    ...(SRC.length ? SRC.map(s => srcRow(s, () => { setBase(s.id); pickOpen = false; renderAll(); }, () => void (async () => { await delSrc(s.id); SRC = await listSrc(); if (baseId === s.id) setBase(SRC[0]?.id ?? ''); renderAll(); })())) : [h('p', { class: 't-small' }, tr('Hali hech narsa yuborilmagan. Master reja, Joyshunos yoki Koʻchasozdan «Render studiyasiga» bosing yoki fayl yuklang.'))])) : null;
  left.replaceChildren(
    h('h1', { class: 'ttl' }, tr('Kiritish')),
    h('section', { class: 'ren-sec' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Asos rasm — geometriya va kadr'))),
      b ? h('div', { class: 'ren-base' }, h('img', { src: b.img, alt: b.name }), h('div', { class: 'cap' }, h('i', { style: `background:${(FROM[b.from] ?? FROM.fayl)[1]}` }), h('b', {}, b.name), b.w ? h('code', {}, `${b.w}×${b.h}`) : null), h('div', { class: 'fr t-small' }, tr((FROM[b.from] ?? FROM.fayl)[0])))
        : h('button', { type: 'button', class: 'ren-empty', onclick: () => { fileFor = 'base'; fileIn.click(); } }, ic(ICON.up), tr('Asos rasmni yuklang (PNG, JPG)')),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn btn-sm', id: 'srcPick', 'aria-expanded': pickOpen, onclick: () => { pickOpen = !pickOpen; renderLeft(); } }, tf('Yuborilganlardan · ${n}', { n: SRC.length })),
        h('button', { type: 'button', class: 'btn btn-sm', id: 'srcFile', onclick: () => { fileFor = 'base'; fileIn.click(); } }, tr('Fayldan'))),
      pick),
    h('section', { class: 'ren-sec' },
      h('div', { class: 'glabel' }, h('span', {}, tr('Referenslar — uslub, material, yorugʻlik')), h('code', {}, `${REFS.length} / ${MAX_REFS}`)),
      h('div', { class: 'ren-refs' },
        ...REFS.map((r, i) => h('div', { class: 'ref', 'data-ref': i },
          h('div', { class: 'im' }, h('img', { src: r.img, alt: r.name }), h('button', { type: 'button', class: 'del', 'aria-label': tr('Referensni olib tashlash'), onclick: () => { REFS.splice(i, 1); saveRefs(); renderAll(); } }, ic(ICON.x))),
          h('button', { type: 'button', class: 'role', 'aria-haspopup': 'listbox', 'aria-expanded': roleOpen === i, onclick: () => { roleOpen = roleOpen === i ? -1 : i; renderLeft(); } }, tr((ROLES.find(x => x[0] === r.role) ?? ROLES[0])[1]), ic(ICON.chev)),
          roleOpen === i ? h('div', { class: 'ren-menu', role: 'listbox' }, ...ROLES.map(([k, n]) => h('button', { type: 'button', role: 'option', 'aria-selected': r.role === k, onclick: () => { r.role = k; roleOpen = -1; saveRefs(); renderLeft(); } }, tr(n)))) : null)),
        ...(REFS.length < MAX_REFS ? [h('button', { type: 'button', class: 'add', id: 'refAdd', onclick: () => { fileFor = 'ref'; fileIn.click(); } }, '+ ', tr('Referens')),
          h('button', { type: 'button', class: 'add', id: 'pplAdd', 'aria-expanded': pplOpen, onclick: () => { pplOpen = !pplOpen; renderLeft(); } }, '+ ', tr('Odamlar'))] : [])),
      pplOpen ? pplPicker() : null,
      h('p', { class: 't-small' }, tr('Har referensga rol bering: Uslub · Material · Yorugʻlik · Kontekst · Odamlar. Referens — fayldan yoki natija oynasidan («Referens qilish»).'))),
    h('span', { class: 'sp' }),
    /* avvalgi «Bino studiyasi» hozircha faqat egasiga (js/sinov.js) */
    isOwner() ? h('details', { class: 'ren-old' }, h('summary', {}, tr('Toʻliq asboblar (avvalgi koʻrinish)')),
      h('a', { href: '../bino.html' }, tr('Bino studiyasi'), ' — ', tr('fasad, hajm, kvartiralar, AI render'))) : '',
  );
}
fileIn.onchange = async () => {
  const f = fileIn.files?.[0]; fileIn.value = ''; if (!f) return;
  const url = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(f); });
  const sz = await imgSize(url);
  if (fileFor === 'ref') { if (REFS.length >= MAX_REFS) return; REFS.push({ id: `f${Date.now()}`, img: (await shrink(url, 1024)).url, name: f.name, role: REFS.length ? 'material' : 'uslub' }); saveRefs(); renderAll(); return; }
  const s = await addSrc({ name: f.name.replace(/\.[a-z]+$/i, ''), from: 'fayl', subj: A.subj!, img: url, w: sz.w, h: sz.h }); SRC = await listSrc(); setBase(s.id); renderAll();
};
function imgSize(src: string): Promise<{ w: number; h: number }> { return new Promise(ok => { const im = new Image(); im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => ok({ w: 0, h: 0 }); im.src = src; }); }

/* ---------------- markaz: asos / oxirgi natija / solishtirish ---------------- */
function lastOut(): RenderOut | null { return OUT.find(o => o.srcId === baseId) ?? null; }
/** Toʻliq rasm: server natijasi — havola (keshda yoʻq boʻlsa eskiz), eski mahalliy natija — oʻzi */
const fullOf = (o: RenderOut): string => (o.job ? FULL.get(o.job) ?? o.src : o.src);
function cmpBox(before: string, after: string): HTMLElement {
  const box = h('div', { class: 'ren-cmp' }, h('img', { src: after, alt: tr('Natija') }), h('div', { class: 'b' }, h('img', { src: before, alt: tr('Asos') })), h('i', { class: 'bar' }, h('span', {}, '‹ ›')));
  const b = box.querySelector<HTMLElement>('.b')!, bar = box.querySelector<HTMLElement>('i')!, im = box.querySelector<HTMLImageElement>(':scope > img')!;
  const fit = () => { const bi = b.querySelector<HTMLImageElement>('img')!; bi.style.width = `${im.clientWidth}px`; bi.style.height = `${im.clientHeight}px`; };
  im.onload = fit; requestAnimationFrame(fit);
  const set = (x: number) => { b.style.width = `${x * 100}%`; bar.style.left = `${x * 100}%`; };
  /* 20.11 (egasi): sichqoncha bilan — ajratgich kursorga ergashadi (bosish shart emas); sensorli ekranda — barmoq bilan surish.
     Avval ushlab surish ishlamasdi: brauzer <img> ni «sudrab olib ketish»ni boshlab, pointer hodisalarini toʻxtatardi */
  box.querySelectorAll('img').forEach(i => { i.draggable = false; });
  box.ondragstart = e => e.preventDefault();
  let drag = false;
  const at = (e: PointerEvent) => { const r = box.getBoundingClientRect(); set(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };
  box.onpointerdown = e => { drag = true; if (e.pointerType !== 'mouse') box.setPointerCapture(e.pointerId); at(e); };
  box.onpointerup = box.onpointercancel = () => { drag = false; };
  box.onpointermove = e => { if (e.pointerType === 'mouse' || drag) at(e); };
  box.tabIndex = 0; box.setAttribute('role', 'slider'); box.setAttribute('aria-label', tr('Asl va natija ajratgichi'));
  box.onkeydown = e => { const cur = parseFloat(b.style.width || '50') / 100; if (e.key === 'ArrowLeft') set(Math.max(0, cur - 0.05)); if (e.key === 'ArrowRight') set(Math.min(1, cur + 0.05)); };
  set(0.5); return box;
}
function renderStage(): void {
  const b = base(), o = lastOut();
  if (!b) { stage.replaceChildren(h('div', { class: 'ren-hello' }, h('h2', {}, tr('Render studiyasi')), h('p', {}, tr('Asos rasm — Master reja, Joyshunos yoki Koʻchasozdagi kadr yoki oʻzingizning rasmingiz. Model fayli kerak emas: AI rasm bilan ishlaydi.')), h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { fileFor = 'base'; fileIn.click(); } }, ic(ICON.up), tr('Rasm yuklash')))); return; }
  const v = o ? view : 'asos';
  const body = v === 'cmp' && o ? cmpBox(b.img, fullOf(o)) : h('img', { class: 'ren-img', src: v === 'natija' && o ? fullOf(o) : b.img, alt: b.name });
  stage.replaceChildren(
    h('div', { class: 'ren-frame' }, body),
    h('div', { class: 'ren-top' },
      h('span', { class: 'chip big' }, tr(v === 'natija' ? 'Oxirgi natija' : 'Asos rasm'), b.w ? h('code', {}, `${b.w}×${b.h}`) : null),
      h('span', { class: 'sp' }),
      h('div', { class: 'seg sm glass', role: 'group', 'aria-label': tr('Koʻrinish'), id: 'stView' },
        ...([['asos', 'Asos'], ['natija', 'Oxirgi natija'], ['cmp', 'Solishtirish']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': v === k, disabled: k !== 'asos' && !o, onclick: () => { view = k; renderStage(); } }, tr(n))))),
    h('div', { class: 'ren-tools glass' },
      h('button', { type: 'button', class: 'btn btn-sm', disabled: true, title: tr('Tez orada') }, tr('Hudud belgilash'), h('em', { class: 'soon' }, tr('tez orada'))),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'stUp', disabled: !o?.job || !!upBusy, title: tr('Oxirgi natijani 2 marta kattalashtirish'), onclick: () => { if (o) void upscale(o, 'up2'); } }, tr('Kattalashtirish ×2'))),
    ...(busy ? [h('div', { class: 'ren-busy', role: 'status' }, kolba('255,197,61', 44), prog)] : []),   // 14.11: Archemistry kolbasi oltin rangda toʻladi
  );
}

/* ---------------- oʻng panel: render sozlamalari ---------------- */
function renderRight(): void {
  const outs = allOuts ? OUT : OUT.filter(o => o.srcId === baseId), b = base(), own = !!CFG?.owner, off = !!CFG && !CFG.enabled;
  const price = (coinsOf(A.engine) + (plusFor(A) ? coinsOf('ui2') : 0)) * (A.n ?? 1);
  right.replaceChildren(
    h('div', { class: 'hd' }, h('h2', { class: 'ttl' }, tr('Render')), h('span', { class: 'chip warn' }, 'beta')),
    h('div', { class: 'glabel' }, h('span', {}, tr('Nima tasvirlangan'))),
    h('div', { class: 'ren-chips', role: 'group', 'aria-label': tr('Nima tasvirlangan'), id: 'subj' }, ...SUBJECTS.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.subj === k, onclick: () => { A.subj = k as Subject; save(); renderRight(); } }, tr(n)))),
    h('div', { class: 'glabel' }, h('span', {}, tr('Uslub'))),
    h('div', { class: 'ren-sty', id: 'sty' }, ...STY_GROUPS.map(([g, ids]) => h('div', { class: 'ren-styg', 'data-styg': g },
      h('span', { class: 't-small' }, tr(g)),
      h('div', { class: 'tiles c2' }, ...ids.map(k => [k, (STY.find(x => x[0] === k) ?? [k, k])[1]] as const).map(([k, n]) => h('button', { type: 'button', class: 'tile', 'aria-pressed': A.sty === k, 'data-sty': k, onclick: () => { A.sty = A.sty === k && REFS.length ? '' : k; save(); renderRight(); } }, tr(n))))))),
    h('div', { class: 'glabel' }, h('span', {}, tr('Asosga sodiqlik'))),
    h('div', { class: 'seg', role: 'group', 'aria-label': tr('Asosga sodiqlik'), id: 'fid' }, ...FIDELITY.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.fid === k, onclick: () => { A.fid = k as Fidelity; save(); renderRight(); } }, tr(n)))),
    h('p', { class: 't-small' }, tr(A.fid === 'qatiy' ? 'Binolar soni, qavatlar, joylashuv va kamera oʻzgarmaydi.' : A.fid === 'muvozanat' ? 'Hajm va kamera saqlanadi; fasad detallari, materiallar va obodonlashtirish qoʻshiladi.' : 'Asos — umumiy kompozitsiya; detallar va muhitni model erkin toʻldiradi.')),
    h('label', { class: 'glabel', for: 'renExtra' }, h('span', {}, tr('Qoʻshimcha tavsif (ixtiyoriy)'))),
    (() => { const t = h('textarea', { class: 'input ren-ta', id: 'renExtra', rows: 2, maxlength: 400, placeholder: tr('masalan: fasadlar terrakota gʻisht, hovlida bolalar maydonchasi') }) as HTMLTextAreaElement; t.value = A.extra; t.oninput = () => { A.extra = t.value; save(); }; return t; })(),
    h('div', { class: 'glabel' }, h('span', {}, tr('Sifat'))),
    h('div', { class: 'seg ren-eng', role: 'group', 'aria-label': tr('Sifat'), id: 'eng' }, ...ENGINES.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.engine === k, 'data-eng': k, onclick: () => { A.engine = k; save(); renderRight(); } },
      tr(n), own ? null : h('code', {}, String(coinsOf(k)))))),
    ...(own && LAB.some(([k]) => CFG?.engines?.[k]) ? [
      h('div', { class: 'glabel' }, h('span', {}, tr('Sinov modellari (faqat egasi)'))),
      h('div', { class: 'ren-chips', role: 'group', 'aria-label': tr('Sinov modellari (faqat egasi)'), id: 'engLab' }, ...LAB.filter(([k]) => CFG?.engines?.[k]).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.engine === k, 'data-eng': k, onclick: () => { A.engine = k; save(); renderRight(); } }, n)))] : []),
    h('p', { class: 't-small' }, LAB.some(([k]) => k === A.engine) ? engName(A.engine) : tr(A.engine === 'fast' ? 'Tez — eskiz va variantlar uchun, taxminan 20 soniya.' : A.engine === 'pro' ? 'Pro 2K — geometriya va materiallar aniqroq, taxminan 40 soniya.' : 'Pro 4K — taqdimot va chop etish uchun, taxminan 1 daqiqa.')),
    ...(PLUS_ENGINES.includes(A.engine) && (!A.sty || STY_GROUPS[0][1].includes(A.sty)) ? [h('button', { type: 'button', class: 'ren-plus', id: 'renPlus', 'aria-pressed': !!A.plus, title: tr('Render tayyor boʻlgach «Ijodiy» ×2 kattalashtirish avtomatik bajariladi: teksturalar, soyalar va mayda detallar qoʻshiladi, geometriya saqlanadi.'), onclick: () => { A.plus = !A.plus; save(); renderRight(); } },
      h('b', {}, 'Foto+'), ' ', h('span', {}, tr('realizm · Ijodiy ×2')), own ? null : h('em', {}, `+${tf('${c} tanga', { c: coinsOf('ui2') })}`))] : []),
    h('div', { class: 'ren-row' }, h('span', { class: 'glabel' }, h('span', {}, tr('Variantlar'))),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Variantlar soni'), id: 'nVar' }, ...[1, 2, 4].map(n => h('button', { type: 'button', 'aria-pressed': A.n === n, onclick: () => { A.n = n; save(); renderRight(); } }, String(n))))),
    ...(off ? [h('p', { class: 'note warn', id: 'renOff', role: 'status' }, tr('Render vaqtincha ishlamayapti'))] : []),
    h('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', id: 'renGo', disabled: busy || !b || off, onclick: () => void go() }, busy ? sirkul(16) : ic(ICON.spark),
      busy ? prog : A.n! > 1 ? tf('Render qilish · ${n} variant', { n: A.n! }) : tr('Render qilish'),
      busy || own ? null : h('em', { class: 'ren-price' }, tf('${c} tanga', { c: price }))),
    ...(err ? [h('p', { class: 'note bad', id: 'renErr', role: 'alert' }, err)] : []),
    ...(needBuy ? [h('button', { type: 'button', class: 'btn btn-sm btn-block', id: 'renBuy', onclick: () => void import('../account/buy').then(m => m.buyDialog()) }, tr('Tanga sotib olish'))] : []),
    h('div', { class: 'glabel' }, h('span', {}, tr(allOuts ? 'Hamma natijalar' : 'Natijalar')),
      h('button', { type: 'button', class: 'btn btn-sm btn-ghost', id: 'outAll', 'aria-pressed': allOuts, title: tr('Hamma natijalar'), onclick: () => { allOuts = !allOuts; renderRight(); } }, h('code', {}, `${OUT.filter(o => o.srcId === baseId).length} / ${OUT.length}`))),
    outs.length ? h('div', { class: 'ren-gal', id: 'renGal' }, ...outs.map(o => h('button', { type: 'button', 'aria-label': o.name, title: o.name, onclick: () => openViewer(o.id) }, h('img', { src: o.src, alt: '' }))))
      : h('p', { class: 't-small' }, tr('Natijalar shu yerda chiqadi. Bosing — kattalashtirish, asl bilan solishtirish, Chizmadonga.')),
  );
}

/* ---------------- render (server navbati) ---------------- */
const sleep = (ms: number) => new Promise(ok => setTimeout(ok, ms));
/** 18.11: R2 da CORS yoʻq — fayl baytlari server orqali (/render/jobs/:id/file); oʻxshamasa toʻgʻridan-toʻgʻri */
const fileUrl = (job: string, role: 'out' | 'thumb' = 'out', dl = false) => `${apiBase()}/render/jobs/${encodeURIComponent(job)}/file?role=${role}${dl ? '&dl=1' : ''}`;
async function jobBlob(job: string, role: 'out' | 'thumb', direct?: string): Promise<Blob> {
  try { const r = await fetch(fileUrl(job, role), { credentials: 'include' }); if (r.ok) return await r.blob(); } catch { /* pastda */ }
  if (!direct) throw new Error('fayl olinmadi');
  return (await fetch(direct, { mode: 'cors' })).blob();
}
/** Natijaning toʻliq rasmi Blob sifatida (saqlash, asos, referens, Chizmadon) */
const fullBlob = (o: RenderOut): Promise<Blob> => (o.job ? jobBlob(o.job, 'out', FULL.get(o.job)) : fetch(o.src).then(r => r.blob()));
const dataUrl = (b: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(b); });
async function loadCfg(): Promise<RenderCfg | null> { try { CFG = await renderApi.config(); } catch { CFG = null; } return CFG; }

/** Mahalliy rasmni R2 ga (bir marta) */
async function upKey(id: string, img: string, max: number): Promise<{ key: string; w: number; h: number }> {
  const c = UP.get(id); if (c) return c;
  const u = await toUpload(img, max, CFG?.maxBytes);
  const r = { key: await renderApi.upload(u.blob), w: u.w, h: u.h };
  UP.set(id, r); return r;
}
/** Parallel chegarada — oldingi ish tugashini kutib qayta urinish (10 daqiqagacha) */
async function createWithRoom(b: JobBody): Promise<{ id: string; downgraded: boolean }> {
  for (let i = 0; ; i++) {
    try { return await renderApi.create(b); }
    catch (e) { if (!(e instanceof ApiError && e.code === 'parallel') || i > 200) throw e; await sleep(3000); }
  }
}
/** Tayyor ish → kesh: 512 px eskiz va asosning kichik nusxasi; toʻliq rasm havolasi — xotirada */
async function keep(j: Job, srcId: string, name: string, orig: string): Promise<RenderOut | null> {
  if (j.status !== 'done' || !j.thumb) return null;
  if (j.out) FULL.set(j.id, j.out);
  let th = j.thumb;
  try { th = await dataUrl(await jobBlob(j.id, 'thumb', j.thumb)); } catch { /* havola qoladi (1 soat) */ }
  if (th.startsWith('data:')) void shrinkThumb(th).then(u => setSvcThumb(ctxProject(), u));   // 23.11: kartada oxirgi natija
  const sty = j.params.style ?? '';
  return addOut({ job: j.id, status: j.status, srcId, src: th, orig, name, prompt: j.prompt ?? '', model: engName(j.engine), sty, fid: j.params.fid ?? 'qatiy', refs: j.params.refs ?? 0, t: j.created });
}
function errText(e: unknown): string {
  needBuy = false;
  if (!(e instanceof ApiError)) return tr('Xato yuz berdi — qayta urinib koʻring');
  if (e.status === 402 || e.code === 'insufficient') { needBuy = true; return tf('Tanga yetmaydi: kerak ${need}, hisobingizda ${balance}', { need: e.details?.need ?? '?', balance: e.details?.balance ?? 0 }); }
  if (e.status === 401) { void ensureLogin(undefined, 'Render qilish uchun kiring. Hisob bepul.'); return tr('Hisobga kiring.'); }
  const M: Record<string, string> = {
    render_off: 'Render vaqtincha ishlamayapti', render_budget: 'Bugungi render chegarasi tugadi — ertaga urinib koʻring',
    render_busy: 'Render xizmati javob bermadi — tanga qaytarildi, birozdan keyin urinib koʻring', busy: 'Render navbati band — bir daqiqadan keyin urinib koʻring',
    bad_from: 'Natija topilmadi — sahifani yangilang', upload: 'Rasm yuklanmadi — internetni tekshiring', upload_missing: 'Rasm yuklanmadi — internetni tekshiring', up_too_big: 'Natija juda katta boʻladi — kichikroq koeffitsiyent tanlang', too_big: 'Rasm juda katta', bad_type: 'Rasm juda katta',
    offline: 'Server bilan aloqa yoʻq. Internetni tekshiring yoki birozdan keyin urinib koʻring.', rate: 'Juda koʻp soʻrov — birozdan keyin urinib koʻring',
  };
  return tr(M[e.code] ?? 'Xato yuz berdi — qayta urinib koʻring');
}

async function go(): Promise<void> {
  const b = base(); if (!b || busy) return;
  track('ren/run');
  if (!CFG && !await loadCfg()) { err = errText(new ApiError('offline', '')); renderRight(); return; }
  if (!CFG!.enabled) { err = tr('Render vaqtincha ishlamayapti'); renderRight(); return; }
  if (!await ensureLogin(undefined, 'Render qilish uchun kiring. Hisob bepul.')) return;
  err = ''; needBuy = false; busy = true;
  const n = A.n ?? 1; let ok = 0, bad = 0, first = '', why = '';
  const tick = () => { prog = n > 1 ? tf('Yaratilmoqda… ${i} / ${n}', { i: Math.min(n, ok + bad + 1), n }) : tr('Yaratilmoqda… (20–60 soniya)'); renderStage(); renderRight(); };
  prog = tr('Rasm yuklanmoqda…'); renderStage(); renderRight();
  try {
    const inp = await upKey(`b:${b.id}`, b.img, CFG!.maxSide || 2048);
    const refs: { key: string; role: string }[] = [];
    for (const r of REFS) refs.push({ key: (await upKey(`r:${r.id}`, r.img, r.role === 'odamlar' ? 1536 : 1024)).key, role: r.role });   // personaj varagʻi: 4 holat — kattaroq
    const orig = (await shrink(b.img, 512)).url;
    const styN = tr((STY.find(x => x[0] === A.sty) ?? ['', 'Referens boʻyicha'])[1]);
    const body: JobBody = { engine: LAB.some(([k]) => k === A.engine) && !CFG?.owner ? 'pro' : A.engine, input: inp, refs, subj: A.subj ?? 'reja', style: A.sty, fid: A.fid ?? 'qatiy', extra: A.extra.trim() || undefined, source: b.from, tag: b.id, ...(b.facts && A.subj === b.subj ? { facts: b.facts } : {}) };
    const plus = plusFor(A);
    const waits: Promise<void>[] = [];
    for (let i = 0; i < n; i++) {
      tick();
      const j = await createWithRoom(body);
      if (j.downgraded) toast(tr('Bugungi chegara: Pro oʻrniga Tez ishlatildi'));
      FOLLOW.add(j.id);
      waits.push(waitJob(j.id).then(async r => {
        if (r.status === 'done' && await keep(r, b.id, `${b.name} · ${styN}`, orig)) {
          ok++; first ||= `j${r.id}`; OUT = await listOut(); view = 'natija';
          if (plus) {   // Foto+: shu natijadan «Ijodiy» ×2 — alohida natija sifatida qoʻshiladi
            prog = tr('Foto+ — realizm qoʻshilmoqda… (1–2 daqiqa)'); renderStage(); renderRight();
            try {
              const u = await createWithRoom({ engine: 'ui2', from: r.id }); FOLLOW.add(u.id);
              const r2 = await waitJob(u.id).finally(() => FOLLOW.delete(u.id));
              if (r2.status === 'done' && await keep(r2, b.id, `${b.name} · ${styN} · Foto+`, orig)) { first = `j${r2.id}`; OUT = await listOut(); }
              else toast(tr('Foto+ bajarilmadi — tanga qaytarildi') + (r2.errDetail ? ` · ${r2.errDetail}` : ''));
            } catch (e) { toast(errText(e)); }
          }
        }
        else { bad++; if (r.errDetail) why = r.errDetail; }
      }, () => { bad++; }).finally(() => { FOLLOW.delete(j.id); tick(); }));
    }
    await Promise.all(waits);
    if (bad) err = ok ? tf('${n} ta render bajarilmadi — tanga qaytarildi', { n: bad }) : tr('Render bajarilmadi — tanga qaytarildi. Boshqa uslub yoki rasm bilan urinib koʻring.');
    if (bad && why) err += ` · ${why}`;   // faqat egasiga keladi (server errDetail)
  } catch (e) { err = errText(e); }
  busy = false; prog = ''; renderStage(); renderRight();
  if (first && OUT.some(o => o.id === first)) openViewer(first);
}

/** Tayyor natijani kattalashtirish / tiniqlashtirish — yangi natija sifatida shu asosga qoʻshiladi */
async function upscale(o: RenderOut, engine: Engine): Promise<void> {
  if (!o.job || upBusy) return;
  if (!await ensureLogin(undefined, 'Render qilish uchun kiring. Hisob bepul.')) return;
  upBusy = engine; renderViewer(); renderStage();
  toast(tr(engine === 'enhance' || engine.startsWith('um') || engine.startsWith('ui') ? 'Tiniqlashtirilmoqda… (1–2 daqiqa)' : 'Kattalashtirilmoqda…'));
  try {
    const j = await createWithRoom({ engine, from: o.job });
    FOLLOW.add(j.id);
    const r = await waitJob(j.id).finally(() => FOLLOW.delete(j.id));
    const lbl = engine === 'enhance' ? tr('Tiniqlashtirilgan') : upLabel(engine);
    const it = r.status === 'done' ? await keep(r, o.srcId, `${o.name} · ${lbl}`, o.orig) : null;
    upBusy = '';
    if (it) { OUT = await listOut(); renderAll(); openViewer(it.id); }
    else { toast(tr('Render bajarilmadi — tanga qaytarildi. Boshqa uslub yoki rasm bilan urinib koʻring.') + (r.errDetail ? ` · ${r.errDetail}` : '')); renderViewer(); }
  } catch (e) { upBusy = ''; toast(errText(e)); renderViewer(); renderStage(); }
}

/** Server tarixi: kesh yoʻq natijalar (boshqa brauzer, tozalangan kesh) qoʻshiladi; tugamagan ishlar kuzatiladi */
async function syncHistory(): Promise<void> {
  if (!CFG?.enabled || !await check()) return;
  let items: Job[] = [];
  try { items = await renderApi.history(30); } catch { return; }
  const have = new Set(OUT.map(o => o.job).filter(Boolean)), hid = new Set(hidden());
  let added = 0;
  for (const j of items) {
    if (hid.has(j.id)) continue;
    const srcId = j.tag && SRC.some(s => s.id === j.tag) ? j.tag : '';
    // 22.11: boshqa loyihaning ishi bu loyihaga tortilmaydi (eski «loyihasiz» ishdan koʻchirilgan loyiha — hammasi)
    if (!srcId && !LEGACY) continue;
    const name = `${tr((FROM[j.source as From] ?? FROM.fayl)[0])} · ${tr((STY.find(x => x[0] === j.params.style) ?? ['', 'Referens boʻyicha'])[1])}`;
    if (j.status === 'done' && !have.has(j.id)) { if (await keep(j, srcId, name, '')) added++; }
    else if ((j.status === 'queued' || j.status === 'running') && !FOLLOW.has(j.id)) {
      FOLLOW.add(j.id);
      void waitJob(j.id).then(async r => { if (await keep(r, srcId, name, '')) { OUT = await listOut(); renderAll(); toast(tr('Render tayyor')); } }).catch(() => {}).finally(() => FOLLOW.delete(j.id));
    }
  }
  if (added) { OUT = await listOut(); renderAll(); }
}

/* ---------------- natija oynasi (R-2) ---------------- */
function openViewer(id: string): void {
  viewer = { id, mode: viewer?.mode ?? 'cmp' }; renderViewer();
  // toʻliq rasm havolasi (1 soat) — kerak boʻlsa serverdan yangisi
  const o = OUT.find(x => x.id === id);
  if (o?.job && !FULL.has(o.job)) void renderApi.job(o.job).then(j => { if (j.out) { FULL.set(o.job!, j.out); if (j.prompt && !o.prompt) o.prompt = j.prompt; if (viewer?.id === id) renderViewer(); renderStage(); } }).catch(() => {});
}
function closeViewer(): void { viewer = null; renderViewer(); }
function renderViewer(): void {
  const o = viewer ? OUT.find(x => x.id === viewer!.id) : null;
  over.hidden = !o; if (!o || !viewer) { over.replaceChildren(); return; }
  const src = SRC.find(s => s.id === o.srcId), sib = o.srcId ? OUT.filter(x => x.srcId === o.srcId) : [o], V = viewer;
  const full = fullOf(o), before = src?.img ?? (o.orig || full);
  const body = V.mode === 'cmp' ? cmpBox(before, full) : V.mode === 'yon' ? h('div', { class: 'ren-yon' }, h('figure', {}, h('img', { src: before, alt: tr('Asos') }), h('figcaption', {}, tr('Asos'))), h('figure', {}, h('img', { src: full, alt: tr('Natija') }), h('figcaption', {}, tr('Natija')))) : h('img', { class: 'ren-img', src: full, alt: o.name });
  const dt = new Date(o.t), when = `${dt.toLocaleDateString('ru-RU')} ${dt.toTimeString().slice(0, 5)}`;
  over.replaceChildren(
    h('header', { class: 'eko glass ren-vh' },
      h('button', { type: 'button', class: 'btn btn-ghost', id: 'vBack', onclick: closeViewer }, ic(ICON.back), tr('Render studiyasi')),
      h('span', { class: 'vr' }),
      h('div', { class: 'nm' }, h('b', {}, o.name), h('code', {}, `${o.model} · ${when}`)),
      h('span', { class: 'sp' }),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Koʻrinish'), id: 'vMode' }, ...([['natija', 'Natija'], ['cmp', 'Asl bilan solishtirish'], ['yon', 'Yonma-yon']] as const).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': V.mode === k, onclick: () => { V.mode = k; renderViewer(); } }, tr(n)))),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'vPng', onclick: () => void savePng(o).catch(() => toast(tr('Rasm yuklanmadi — internetni tekshiring'))) }, tr('PNG yuklab olish')),
      h('button', { type: 'button', class: 'btn btn-sm', id: 'vAgain', onclick: () => { closeViewer(); if (src) setBase(src.id); renderAll(); void go(); } }, tr('Yana render')),
      h('button', { type: 'button', class: 'btn btn-sm btn-primary', id: 'vChz', onclick: () => void toChizmadon(o) }, tr('Chizmadonga'), ic(ICON.arrow))),
    h('div', { class: 'ren-vb' },
      h('div', { class: 'ren-vstage' }, body),
      h('aside', { class: 'panel ren-va' },
        h('h3', {}, tr('Natija haqida')),
        h('dl', {},
          h('dt', {}, tr('Manba')), h('dd', {}, src ? `${src.name} (${tr((FROM[src.from] ?? FROM.fayl)[0])})` : '—'),
          h('dt', {}, tr('Uslub')), h('dd', {}, tr((STY.find(x => x[0] === o.sty) ?? ['', 'Referens boʻyicha'])[1])),
          h('dt', {}, tr('Sodiqlik')), h('dd', {}, tr((FIDELITY.find(x => x[0] === o.fid) ?? FIDELITY[0])[1])),
          h('dt', {}, tr('Referenslar')), h('dd', {}, String(o.refs)),
          h('dt', {}, tr('Model')), h('dd', {}, h('code', {}, o.model))),
        h('details', { class: 'ren-key' }, h('summary', {}, tr('Soʻrov matni (prompt)')), h('p', { class: 'mono t-small' }, o.prompt)),
        sib.length > 1 ? h('div', { class: 'glabel' }, h('span', {}, tr('Shu manbadan boshqa natijalar'))) : null,
        sib.length > 1 ? h('div', { class: 'ren-gal' }, ...sib.map(x => h('button', { type: 'button', 'aria-pressed': x.id === o.id, 'aria-label': x.name, onclick: () => openViewer(x.id) }, h('img', { src: x.src, alt: '' })))) : null,
        ...(o.job ? [
          h('div', { class: 'glabel' }, h('span', {}, tr('Kattalashtirish'))),
          h('div', { class: 'seg sm ren-upm', role: 'group', 'aria-label': tr('Kattalashtirish usuli'), id: 'vUpM' }, ...UP_MODES.map(([k, n, t]) => h('button', { type: 'button', 'data-upm': k, 'aria-pressed': upMode === k, disabled: !!upBusy, title: tr(t), onclick: () => { upMode = k; try { localStorage.setItem(UPM_K, k); } catch { /* */ } renderViewer(); } }, tr(n)))),
          h('div', { class: 'ren-up' },
            h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Kattalashtirish'), id: 'vUp' }, ...UPS_BY[upMode].map(([k, n]) => h('button', { type: 'button', 'data-up': k, disabled: !!upBusy, title: CFG?.owner ? `${tr('Kattalashtirish')} ${n}` : `${tr('Kattalashtirish')} ${n} · ${tf('${c} tanga', { c: coinsOf(k) })}`, onclick: () => void upscale(o, k) }, upBusy === k ? '…' : n))),
            h('button', { type: 'button', class: 'btn btn-sm', id: 'vEnh', disabled: !!upBusy, title: tr('Tiniqlashtirish — mayda detal qoʻshadi va 2 marta kattalashtiradi'), onclick: () => void upscale(o, 'enhance') }, upBusy === 'enhance' ? '…' : tr('Tiniqlashtirish'))),
        ] : []),
        h('span', { class: 'sp' }),
        h('button', { type: 'button', class: 'btn btn-block', id: 'vBase', onclick: () => void asBase(o) }, tr('Natijani asos rasm qilish')),
        h('button', { type: 'button', class: 'btn btn-block', id: 'vRef', disabled: REFS.length >= MAX_REFS, onclick: () => void (async () => { const im = await shrink(await readable(o), 1024).catch(() => ({ url: o.src })); REFS.push({ id: o.id, img: im.url, name: o.name, role: 'uslub' }); saveRefs(); toast(tr('Referensga qoʻshildi')); renderAll(); })() }, tr('Referens qilish')),
        h('button', { type: 'button', class: 'btn btn-block btn-danger', id: 'vDel', onclick: () => void (async () => { if (o.job) { try { localStorage.setItem(HIDDEN_K, JSON.stringify([...hidden(), o.job].slice(-300))); } catch { /* */ } } await delOut(o.id); OUT = await listOut(); closeViewer(); renderAll(); })() }, tr('Oʻchirish')))),
  );
}
async function asBase(o: RenderOut): Promise<void> {
  const img = o.job ? await fullBlob(o).then(dataUrl).catch(() => o.src) : o.src;
  const sz = await imgSize(img);
  const s = await addSrc({ name: o.name, from: 'natija', subj: A.subj!, img, w: sz.w, h: sz.h });
  SRC = await listSrc(); setBase(s.id); closeViewer(); renderAll();
}
async function savePng(o: RenderOut): Promise<void> {
  let b: Blob;
  try { b = await fullBlob(o); }
  catch {   // baytlarni oʻqib boʻlmadi — server «attachment» havolasi orqali brauzer oʻzi yuklaydi
    if (!o.job) { toast(tr('Rasmni saqlab boʻlmadi')); return; }
    const a = document.createElement('a'); a.href = fileUrl(o.job, 'out', true); a.rel = 'noopener'; document.body.append(a); a.click(); a.remove(); return;
  }
  const u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = `render-${o.job ?? o.id}.${b.type.includes('jpeg') ? 'jpg' : b.type.includes('webp') ? 'webp' : 'png'}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
/** shrink uchun oʻqiladigan manba: R2 havolasi oʻrniga data URL */
const readable = async (o: RenderOut): Promise<string> => (o.job ? dataUrl(await fullBlob(o)).catch(() => fullOf(o)) : o.src);
/** Chizmadon kiruvchi varagʻi (Koʻchasoz bilan bir xil kalit): A3 albom, rasm sigʻdirilgan, ostida nom */
async function toChizmadon(o: RenderOut): Promise<void> {
  const im = await shrink(await readable(o), 2400), W = 420, H = 297, M = 12, cap = 10, aw = W - 2 * M, ah = H - 2 * M - cap, k = Math.min(aw / im.w, ah / im.h), w = im.w * k, hh = im.h * k, x = (W - w) / 2, y = M + (ah - hh) / 2;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<g id="01_Render" data-name="Render"><image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${hh.toFixed(2)}" href="${im.url}" preserveAspectRatio="xMidYMid meet"/></g><g id="02_Yozuv" data-name="Yozuv"><text x="${M}" y="${H - M}" font-size="4" font-family="Archivo, sans-serif" fill="#1d1d1b">${esc(o.name)}</text><text x="${W - M}" y="${H - M}" font-size="2.6" text-anchor="end" font-family="IBM Plex Mono, monospace" fill="#6b6965">${esc(tr('AI render'))} · ${esc(o.model)}</text></g>`;
  const { sendSheet } = await import('../ui/chzsend');
  if (await sendSheet({ name: `${tr('Render')} · ${o.name}`, kind: 'sheet', svg, vb: [0, 0, W, H], w: W, h: H }) === false) toast(tr('Brauzer xotirasi toʻla — varaq uzatilmadi'));
}

/* ---------------- ishga tushirish ---------------- */
function renderAll(): void { renderHeader(); renderLeft(); renderStage(); renderRight(); renderViewer(); document.title = `${tr('Render studiyasi')} · Archemistry Lab`; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (viewer) closeViewer(); else if (pickOpen || roleOpen >= 0 || pplOpen) { pickOpen = false; roleOpen = -1; pplOpen = false; renderAll(); } } });
onLang(() => { renderAll(); document.documentElement.lang = getLang(); });
onTheme(() => renderHeader());
/** «Eski ish» loyihasi (svcprojects legacy) — teg yoʻq eski server ishlari shu yerda koʻrinadi */
const LEGACY = isLegacySvc('ren', ctxProject());
async function boot(): Promise<void> {
  try { [SRC, OUT, REFS] = await Promise.all([listSrc(), listOut(), cacheGet<Ref[]>('render-refs').then(r => r ?? [])]); } catch (e) { toast(`${tr('Saqlash ishlamayapti')}: ${(e as Error).message}`); }
  const m = /^#\/s\/([\w-]+)/.exec(location.hash);
  if (m && await takeInbox(m[1]).catch(() => false)) SRC = await listSrc();
  // 22.11: manzildagi ?p= (loyiha) saqlanadi — avval tushib qolardi va yangilashda boshqa loyiha ochilardi
  if (m && SRC.some(s => s.id === m[1])) { setBase(m[1]); history.replaceState(null, '', location.pathname + location.search); }
  else if (!base() && SRC[0]) setBase(SRC[0].id);
  renderAll();
  if (await loadCfg()) { renderRight(); void syncHistory(); }
}
renderAll();
void boot();
addEventListener('hashchange', () => { if (location.hash.startsWith('#/s/')) void boot(); });
(window as unknown as { renderStudio: unknown }).renderStudio = { get state() { return { baseId, refs: REFS.length, out: OUT.length, src: SRC.length, A, cfg: CFG }; } };

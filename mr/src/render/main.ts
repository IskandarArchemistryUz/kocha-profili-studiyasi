/**
 * Render studiyasi (beta) — app/render.html. Kanvasdagi «Render studiyasi — maket» (R-1, R-2, R-3).
 *   Kirish: asos rasm (geometriya va kadr) + 4 tagacha referens (uslub · material · yorugʻlik · kontekst).
 *   Render: uslub, asosga sodiqlik, soʻrov, variantlar, sifat (Tez · Pro 2K · Pro 4K) → server navbati (fal.ai, markaziy kalit), tanga bilan.
 *   13.11 (Render 1-bosqich): kalit maydonlari va provayder tanlovi yoʻq; kadr 2048 px WebP qilib R2 ga yuklanadi, holat har 3 s soʻraladi,
 *   tarix serverdan (IndexedDB — faqat eskiz keshi).
 *   Natija: asl bilan solishtirish, PNG, Chizmadonga, asos yoki referens qilish.
 * Eski «Bino studiyasi» (bino.html: fasad, hajm, kvartiralar) va AI render oynasi — «Toʻliq asboblar»da qoladi (0-qoida).
 */
import { scoped, svcHref } from '../core/projctx';
import { langMenu } from '../ui/langmenu';
import { isOwner } from '../core/wm';
import '../ui/ds2.css';
import './render.css';
import { h, svgIcon, toast } from '../ui/dom';
import { mrBackBtn } from '../ui/mrback';
import { logoSvg } from '../ui/logo';
import { toggleTheme, isDark, onTheme } from '../ui/theme';
import { tr, tf, getLang, setLang, onLang } from '../i18n';
import { cacheGet, cachePut } from '../storage/db';
import { STY, SUBJECTS, FIDELITY, ROLES, loadState, saveState, shrink, type RefRole, type Subject, type Fidelity } from './providers';
import { ENGINES, LAB, UPS, renderApi, toUpload, waitJob, type Engine, type Job, type JobBody, type RenderCfg } from './api';
import { ApiError, check } from '../account/session';
import { ensureLogin } from '../account/gate';
import { listSrc, listOut, addSrc, delSrc, addOut, delOut, type RenderSrc, type RenderOut, type From } from './inbox';
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
export const SERVICES = [
  { id: 'mr', name: 'Master reja', href: './', color: 'var(--svc-mr)' },
  { id: 'ks', name: 'Koʻchasoz', href: svcHref('./kochasoz.html'), color: 'var(--svc-ks)' },
  { id: 'joy', name: 'Joyshunos', href: svcHref('./joyshunos.html'), color: 'var(--svc-joy)' },
  { id: 'ren', name: 'Render', href: svcHref('./render.html'), color: 'var(--svc-ren)', cur: true, beta: true },
  { id: 'dk', name: 'Dizayn-kod', href: '../dizaynkod.html', color: 'var(--svc-dk)' },
  { id: 'chz', name: 'Chizmadon', href: './#/chizmadon', color: 'var(--svc-chz)' },
];
const FROM: Record<From, [string, string]> = { mr: ['Master reja', 'var(--svc-mr)'], ks: ['Koʻchasoz', 'var(--svc-ks)'], joy: ['Joyshunos', 'var(--svc-joy)'], chz: ['Chizmadon', 'var(--svc-chz)'], fayl: ['Fayldan', 'var(--faint)'], natija: ['Natijadan', 'var(--svc-ren)'] };
const MAX_REFS = 4;

/* ---------------- holat ---------------- */
const A = loadState();
interface Ref { id: string; img: string; name: string; role: RefRole }
let SRC: RenderSrc[] = [], OUT: RenderOut[] = [], REFS: Ref[] = [];
let baseId = (() => { try { return localStorage.getItem(scoped('render-base')) || ''; } catch { return ''; } })();
let view: 'asos' | 'natija' | 'cmp' = 'asos', busy = false, prog = '', err = '', needBuy = false, pickOpen = false, roleOpen = -1, allOuts = false;
/** Server sozlamasi (null — hali olinmagan yoki server javob bermadi) */
let CFG: RenderCfg | null = null;
const FULL = new Map<string, string>();   // ish → toʻliq rasm havolasi (1 soat amal qiladi)
const UP = new Map<string, { key: string; w: number; h: number }>();   // mahalliy rasm → R2 kaliti (sessiya davomida qayta yuklanmaydi)
const FOLLOW = new Set<string>();         // kuzatilayotgan ishlar
const HIDDEN_K = 'ren-hidden';
const hidden = (): string[] => { try { return JSON.parse(localStorage.getItem(HIDDEN_K) || '[]') as string[]; } catch { return []; } };
const DEF_COINS: Record<Engine, number> = { fast: 1, pro: 2, pro4k: 4, nbpro: 2, qwen: 1, kontext: 1, seedream5: 1, gptimg: 2, up2: 1, up3: 1, up4: 2, enhance: 2 };
const coinsOf = (e: Engine) => CFG?.engines?.[e]?.coins ?? DEF_COINS[e];
let upBusy = '';
const engName = (e: string) => {
  const u = UPS.find(x => x[0] === e); if (u) return `${tr('Kattalashtirish')} ${u[1]}`;
  if (e === 'enhance') return tr('Tiniqlashtirish'); const l = LAB.find(x => x[0] === e); return l ? l[1] : `Archemistry ${tr((ENGINES.find(x => x[0] === e) ?? ENGINES[1])[1])}`; };
let viewer: { id: string; mode: 'natija' | 'cmp' | 'yon' } | null = null;
const base = () => SRC.find(s => s.id === baseId) ?? null;
const setBase = (id: string) => { baseId = id; allOuts = false; try { localStorage.setItem(scoped('render-base'), id); } catch { /* */ } const s = base(); if (s && s.subj) A.subj = s.subj; view = 'asos'; };
const saveRefs = () => { void cachePut('render-refs', REFS).catch(() => {}); };
const save = () => saveState(A);

/* ---------------- qobiq ---------------- */
const root = document.getElementById('ren')!;
const header = h('header', { class: 'eko glass' });
const left = h('aside', { class: 'ren-lp panel', id: 'renLeft', 'aria-label': tr('Kiritish') });
const stage = h('main', { class: 'ren-stage', id: 'renStage' });
const right = h('aside', { class: 'ren-rp panel', id: 'renRight', 'aria-label': tr('Render') });
const over = h('div', { class: 'ren-over', id: 'renView', hidden: true });
const fileIn = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, id: 'renFile' }) as HTMLInputElement;
let fileFor: 'base' | 'ref' = 'base';
root.append(header, h('div', { class: 'ren-body' }, left, stage, right), over, fileIn);

function renderHeader(): void {
  header.replaceChildren(
    mrBackBtn(),
    h('a', { class: 'brand', href: '../index.html', title: tr('Bosh sahifa') }, logoSvg(20), h('span', {}, 'Archemistry Lab')),
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
        ...(REFS.length < MAX_REFS ? [h('button', { type: 'button', class: 'add', id: 'refAdd', onclick: () => { fileFor = 'ref'; fileIn.click(); } }, '+ ', tr('Referens'))] : [])),
      h('p', { class: 't-small' }, tr('Har referensga rol bering: Uslub · Material · Yorugʻlik · Kontekst. Referens — fayldan yoki natija oynasidan («Referens qilish»).'))),
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
  let drag = false;
  box.onpointerdown = e => { drag = true; box.setPointerCapture(e.pointerId); move(e); };
  box.onpointerup = () => { drag = false; };
  const move = (e: PointerEvent) => { if (!drag) return; const r = box.getBoundingClientRect(); set(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };
  box.onpointermove = move;
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
    ...(busy ? [h('div', { class: 'ren-busy', role: 'status' }, h('span', { class: 'spin' }), prog)] : []),
  );
}

/* ---------------- oʻng panel: render sozlamalari ---------------- */
function renderRight(): void {
  const outs = allOuts ? OUT : OUT.filter(o => o.srcId === baseId), b = base(), own = !!CFG?.owner, off = !!CFG && !CFG.enabled;
  const price = coinsOf(A.engine) * (A.n ?? 1);
  right.replaceChildren(
    h('div', { class: 'hd' }, h('h2', { class: 'ttl' }, tr('Render')), h('span', { class: 'chip warn' }, 'beta')),
    h('div', { class: 'glabel' }, h('span', {}, tr('Nima tasvirlangan'))),
    h('div', { class: 'ren-chips', role: 'group', 'aria-label': tr('Nima tasvirlangan'), id: 'subj' }, ...SUBJECTS.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.subj === k, onclick: () => { A.subj = k as Subject; save(); renderRight(); } }, tr(n)))),
    h('div', { class: 'glabel' }, h('span', {}, tr('Uslub'))),
    h('div', { class: 'tiles c2 ren-sty', id: 'sty' }, ...STY.map(([k, n]) => h('button', { type: 'button', class: 'tile', 'aria-pressed': A.sty === k, 'data-sty': k, onclick: () => { A.sty = A.sty === k && REFS.length ? '' : k; save(); renderRight(); } }, tr(n)))),
    h('div', { class: 'glabel' }, h('span', {}, tr('Asosga sodiqlik'))),
    h('div', { class: 'seg', role: 'group', 'aria-label': tr('Asosga sodiqlik'), id: 'fid' }, ...FIDELITY.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.fid === k, onclick: () => { A.fid = k as Fidelity; save(); renderRight(); } }, tr(n)))),
    h('p', { class: 't-small' }, tr(A.fid === 'qatiy' ? 'Binolar soni, qavatlar, joylashuv va kamera oʻzgarmaydi.' : A.fid === 'muvozanat' ? 'Hajm va kamera saqlanadi; fasad detallari, materiallar va obodonlashtirish qoʻshiladi.' : 'Asos — umumiy kompozitsiya; detallar va muhitni model erkin toʻldiradi.')),
    h('label', { class: 'glabel', for: 'renExtra' }, h('span', {}, tr('Soʻrov (ixtiyoriy)'))),
    (() => { const t = h('textarea', { class: 'input ren-ta', id: 'renExtra', rows: 2, maxlength: 400, placeholder: tr('masalan: fasadlar terrakota gʻisht, hovlida bolalar maydonchasi') }) as HTMLTextAreaElement; t.value = A.extra; t.oninput = () => { A.extra = t.value; save(); }; return t; })(),
    h('div', { class: 'glabel' }, h('span', {}, tr('Sifat'))),
    h('div', { class: 'seg ren-eng', role: 'group', 'aria-label': tr('Sifat'), id: 'eng' }, ...ENGINES.map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.engine === k, 'data-eng': k, onclick: () => { A.engine = k; save(); renderRight(); } },
      tr(n), own ? null : h('code', {}, String(coinsOf(k)))))),
    ...(own && LAB.some(([k]) => CFG?.engines?.[k]) ? [
      h('div', { class: 'glabel' }, h('span', {}, tr('Sinov modellari (faqat egasi)'))),
      h('div', { class: 'ren-chips', role: 'group', 'aria-label': tr('Sinov modellari (faqat egasi)'), id: 'engLab' }, ...LAB.filter(([k]) => CFG?.engines?.[k]).map(([k, n]) => h('button', { type: 'button', 'aria-pressed': A.engine === k, 'data-eng': k, onclick: () => { A.engine = k; save(); renderRight(); } }, n)))] : []),
    h('p', { class: 't-small' }, LAB.some(([k]) => k === A.engine) ? engName(A.engine) : tr(A.engine === 'fast' ? 'Tez — eskiz va variantlar uchun, taxminan 20 soniya.' : A.engine === 'pro' ? 'Pro 2K — geometriya va materiallar aniqroq, taxminan 40 soniya.' : 'Pro 4K — taqdimot va chop etish uchun, taxminan 1 daqiqa.')),
    h('div', { class: 'ren-row' }, h('span', { class: 'glabel' }, h('span', {}, tr('Variantlar'))),
      h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Variantlar soni'), id: 'nVar' }, ...[1, 2, 4].map(n => h('button', { type: 'button', 'aria-pressed': A.n === n, onclick: () => { A.n = n; save(); renderRight(); } }, String(n))))),
    ...(off ? [h('p', { class: 'note warn', id: 'renOff', role: 'status' }, tr('Render vaqtincha ishlamayapti'))] : []),
    h('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', id: 'renGo', disabled: busy || !b || off, onclick: () => void go() }, ic(ICON.spark),
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
  try { th = await dataUrl(await (await fetch(j.thumb, { mode: 'cors' })).blob()); } catch { /* havola qoladi (1 soat) */ }
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
  const n = A.n ?? 1; let ok = 0, bad = 0, first = '';
  const tick = () => { prog = n > 1 ? tf('Yaratilmoqda… ${i} / ${n}', { i: Math.min(n, ok + bad + 1), n }) : tr('Yaratilmoqda… (20–60 soniya)'); renderStage(); renderRight(); };
  prog = tr('Rasm yuklanmoqda…'); renderStage(); renderRight();
  try {
    const inp = await upKey(`b:${b.id}`, b.img, CFG!.maxSide || 2048);
    const refs: { key: string; role: string }[] = [];
    for (const r of REFS) refs.push({ key: (await upKey(`r:${r.id}`, r.img, 1024)).key, role: r.role });
    const orig = (await shrink(b.img, 512)).url;
    const styN = tr((STY.find(x => x[0] === A.sty) ?? ['', 'Referens boʻyicha'])[1]);
    const body: JobBody = { engine: LAB.some(([k]) => k === A.engine) && !CFG?.owner ? 'pro' : A.engine, input: inp, refs, subj: A.subj ?? 'reja', style: A.sty, fid: A.fid ?? 'qatiy', extra: A.extra.trim() || undefined, source: b.from, tag: b.id };
    const waits: Promise<void>[] = [];
    for (let i = 0; i < n; i++) {
      tick();
      const j = await createWithRoom(body);
      if (j.downgraded) toast(tr('Bugungi chegara: Pro oʻrniga Tez ishlatildi'));
      FOLLOW.add(j.id);
      waits.push(waitJob(j.id).then(async r => {
        if (r.status === 'done' && await keep(r, b.id, `${b.name} · ${styN}`, orig)) { ok++; first ||= `j${r.id}`; OUT = await listOut(); view = 'natija'; }
        else bad++;
      }, () => { bad++; }).finally(() => { FOLLOW.delete(j.id); tick(); }));
    }
    await Promise.all(waits);
    if (bad) err = ok ? tf('${n} ta render bajarilmadi — tanga qaytarildi', { n: bad }) : tr('Render bajarilmadi — tanga qaytarildi. Boshqa uslub yoki rasm bilan urinib koʻring.');
  } catch (e) { err = errText(e); }
  busy = false; prog = ''; renderStage(); renderRight();
  if (first && OUT.some(o => o.id === first)) openViewer(first);
}

/** Tayyor natijani kattalashtirish / tiniqlashtirish — yangi natija sifatida shu asosga qoʻshiladi */
async function upscale(o: RenderOut, engine: Engine): Promise<void> {
  if (!o.job || upBusy) return;
  if (!await ensureLogin(undefined, 'Render qilish uchun kiring. Hisob bepul.')) return;
  upBusy = engine; renderViewer(); renderStage();
  toast(tr(engine === 'enhance' ? 'Tiniqlashtirilmoqda… (1–2 daqiqa)' : 'Kattalashtirilmoqda…'));
  try {
    const j = await createWithRoom({ engine, from: o.job });
    FOLLOW.add(j.id);
    const r = await waitJob(j.id).finally(() => FOLLOW.delete(j.id));
    const lbl = engine === 'enhance' ? tr('Tiniqlashtirilgan') : (UPS.find(x => x[0] === engine) ?? UPS[0])[1];
    const it = r.status === 'done' ? await keep(r, o.srcId, `${o.name} · ${lbl}`, o.orig) : null;
    upBusy = '';
    if (it) { OUT = await listOut(); renderAll(); openViewer(it.id); }
    else { toast(tr('Render bajarilmadi — tanga qaytarildi. Boshqa uslub yoki rasm bilan urinib koʻring.')); renderViewer(); }
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
          h('div', { class: 'ren-up' },
            h('div', { class: 'seg sm', role: 'group', 'aria-label': tr('Kattalashtirish'), id: 'vUp' }, ...UPS.map(([k, n]) => h('button', { type: 'button', 'data-up': k, disabled: !!upBusy, title: CFG?.owner ? `${tr('Kattalashtirish')} ${n}` : `${tr('Kattalashtirish')} ${n} · ${tf('${c} tanga', { c: coinsOf(k) })}`, onclick: () => void upscale(o, k) }, upBusy === k ? '…' : n))),
            h('button', { type: 'button', class: 'btn btn-sm', id: 'vEnh', disabled: !!upBusy, title: tr('Tiniqlashtirish — mayda detal qoʻshadi va 2 marta kattalashtiradi'), onclick: () => void upscale(o, 'enhance') }, upBusy === 'enhance' ? '…' : tr('Tiniqlashtirish'))),
        ] : []),
        h('span', { class: 'sp' }),
        h('button', { type: 'button', class: 'btn btn-block', id: 'vBase', onclick: () => void asBase(o) }, tr('Natijani asos rasm qilish')),
        h('button', { type: 'button', class: 'btn btn-block', id: 'vRef', disabled: REFS.length >= MAX_REFS, onclick: () => void (async () => { const im = await shrink(fullOf(o), 1024).catch(() => ({ url: o.src })); REFS.push({ id: o.id, img: im.url, name: o.name, role: 'uslub' }); saveRefs(); toast(tr('Referensga qoʻshildi')); renderAll(); })() }, tr('Referens qilish')),
        h('button', { type: 'button', class: 'btn btn-block btn-danger', id: 'vDel', onclick: () => void (async () => { if (o.job) { try { localStorage.setItem(HIDDEN_K, JSON.stringify([...hidden(), o.job].slice(-300))); } catch { /* */ } } await delOut(o.id); OUT = await listOut(); closeViewer(); renderAll(); })() }, tr('Oʻchirish')))),
  );
}
async function asBase(o: RenderOut): Promise<void> {
  const img = o.job ? await fetch(fullOf(o), { mode: 'cors' }).then(r => r.blob()).then(dataUrl).catch(() => o.src) : o.src;
  const sz = await imgSize(img);
  const s = await addSrc({ name: o.name, from: 'natija', subj: A.subj!, img, w: sz.w, h: sz.h });
  SRC = await listSrc(); setBase(s.id); closeViewer(); renderAll();
}
async function savePng(o: RenderOut): Promise<void> {
  const b = await (await fetch(fullOf(o), { mode: 'cors' })).blob(), u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = `render-${o.id}.${b.type.includes('jpeg') ? 'jpg' : b.type.includes('webp') ? 'webp' : 'png'}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
/** Chizmadon kiruvchi varagʻi (Koʻchasoz bilan bir xil kalit): A3 albom, rasm sigʻdirilgan, ostida nom */
async function toChizmadon(o: RenderOut): Promise<void> {
  const im = await shrink(fullOf(o), 2400), W = 420, H = 297, M = 12, cap = 10, aw = W - 2 * M, ah = H - 2 * M - cap, k = Math.min(aw / im.w, ah / im.h), w = im.w * k, hh = im.h * k, x = (W - w) / 2, y = M + (ah - hh) / 2;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<g id="01_Render" data-name="Render"><image x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${hh.toFixed(2)}" href="${im.url}" preserveAspectRatio="xMidYMid meet"/></g><g id="02_Yozuv" data-name="Yozuv"><text x="${M}" y="${H - M}" font-size="4" font-family="Archivo, sans-serif" fill="#1d1d1b">${esc(o.name)}</text><text x="${W - M}" y="${H - M}" font-size="2.6" text-anchor="end" font-family="IBM Plex Mono, monospace" fill="#6b6965">${esc(tr('AI render'))} · ${esc(o.model)}</text></g>`;
  const { sendSheet } = await import('../ui/chzsend');
  if (await sendSheet({ name: `${tr('Render')} · ${o.name}`, kind: 'sheet', svg, vb: [0, 0, W, H], w: W, h: H }) === false) toast(tr('Brauzer xotirasi toʻla — varaq uzatilmadi'));
}

/* ---------------- ishga tushirish ---------------- */
function renderAll(): void { renderHeader(); renderLeft(); renderStage(); renderRight(); renderViewer(); document.title = `${tr('Render studiyasi')} · Archemistry Lab`; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (viewer) closeViewer(); else if (pickOpen || roleOpen >= 0) { pickOpen = false; roleOpen = -1; renderAll(); } } });
onLang(() => { renderAll(); document.documentElement.lang = getLang(); });
onTheme(() => renderHeader());
async function boot(): Promise<void> {
  try { [SRC, OUT, REFS] = await Promise.all([listSrc(), listOut(), cacheGet<Ref[]>('render-refs').then(r => r ?? [])]); } catch (e) { toast(`${tr('Saqlash ishlamayapti')}: ${(e as Error).message}`); }
  const m = /^#\/s\/([\w-]+)/.exec(location.hash);
  if (m && SRC.some(s => s.id === m[1])) { setBase(m[1]); history.replaceState(null, '', location.pathname); }
  else if (!base() && SRC[0]) setBase(SRC[0].id);
  renderAll();
  if (await loadCfg()) { renderRight(); void syncHistory(); }
}
renderAll();
void boot();
addEventListener('hashchange', () => { if (location.hash.startsWith('#/s/')) void boot(); });
(window as unknown as { renderStudio: unknown }).renderStudio = { get state() { return { baseId, refs: REFS.length, out: OUT.length, src: SRC.length, A, cfg: CFG }; } };
